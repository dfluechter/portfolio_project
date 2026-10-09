import os
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from portfolio.models import (
    TRACK_RULES,
    Certificate,
    CertificateImportRun,
    ImportRunStatus,
    PendingCertificate,
    Track,
)
from portfolio.services.extractor import (
    compute_file_hash,
    extract_metadata,
    guess_tracks,
    validate_source_path,
)

VALID_EXTENSIONS = frozenset({".pdf", ".png", ".jpg", ".jpeg"})


class Command(BaseCommand):
    help = (
        "Scannt das Inbox-Verzeichnis (CERTIFICATES_INBOX_PATH) nach neuen "
        "Zertifikats-Kandidaten und legt PendingCertificate-Einträge an."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--inbox",
            type=str,
            default=None,
            help="Pfad zum Inbox-Verzeichnis (überschreibt CERTIFICATES_INBOX_PATH).",
        )
        parser.add_argument(
            "--recursive",
            action="store_true",
            default=False,
            help="Durchsucht Unterverzeichnisse der Inbox rekursiv.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Testlauf: Erkennt Dateien und plant Importe, ohne DB-Einträge für Pending anzulegen.",
        )

    def handle(self, *args, **options):
        inbox_arg = options.get("inbox")
        recursive = options.get("recursive", False)
        dry_run = options.get("dry_run", False)

        inbox_env = os.getenv("CERTIFICATES_INBOX_PATH")
        inbox_default = str(settings.BASE_DIR / "inbox")
        inbox_path_str: str = str(inbox_arg or inbox_env or inbox_default)
        inbox_path = Path(inbox_path_str).resolve()

        if not inbox_path.exists():
            if dry_run:
                raise CommandError(f"Inbox-Verzeichnis '{inbox_path}' existiert nicht.")
            inbox_path.mkdir(parents=True, exist_ok=True)

        if not inbox_path.is_dir():
            raise CommandError(f"Inbox-Pfad ist kein Verzeichnis: {inbox_path}")

        if inbox_path.is_symlink():
            raise CommandError(f"Inbox-Pfad ist ein Symlink - abgelehnt: {inbox_path}")

        mode_label = "DRY-RUN" if dry_run else "LIVE"
        self.stdout.write(
            self.style.WARNING(
                f"Modus: {mode_label} | Rekursiv: {recursive} | Pfad: {inbox_path}"
            )
        )

        # ── Run-Objekt anlegen ──
        run = CertificateImportRun.objects.create(
            started_at=timezone.now(),
            inbox_path=str(inbox_path),
        )
        run.append_log(
            f"START Scan in {inbox_path.name} mode={mode_label} recursive={recursive}"
        )

        # Dateien sammeln (strikt read-only, keine Symlinks)
        file_iterator = inbox_path.rglob("*") if recursive else inbox_path.iterdir()
        files_to_process: list[Path] = []
        for item in sorted(file_iterator):
            if not item.is_file() or item.is_symlink():
                continue
            # Versteckte Dateien und Systemdateien überspringen
            if item.name.startswith("."):
                continue
            if item.suffix.lower() not in VALID_EXTENSIONS:
                # Andere Dateitypen lautlos ignorieren (kein Fehler)
                continue
            files_to_process.append(item)

        self.stdout.write(f"Zertifikats-Kandidaten gefunden: {len(files_to_process)}")

        for file_path in files_to_process:
            run.files_found += 1

            # Pfadsicherheits-Check
            if not validate_source_path(file_path, inbox_path):
                run.files_errored += 1
                run.append_log(f"REJECT {file_path.name} (Sicherheitsprüfung Pfad)")
                continue

            # SHA-256 Hash berechnen (strikter Read-Only-Zugriff)
            try:
                file_hash = compute_file_hash(file_path)
            except Exception as exc:  # noqa: BLE001
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Hash-Berechnung - {exc}")
                continue

            # Idempotenz-Check: Bereits als Pending oder fertiges Certificate vorhanden?
            if (
                PendingCertificate.objects.filter(sha256_hash=file_hash).exists()
                or Certificate.objects.filter(sha256_hash=file_hash).exists()
            ):
                run.files_skipped += 1
                run.append_log(
                    f"SKIP  {file_path.name} (Hash {file_hash[:12]} bereits bekannt)"
                )
                continue

            # Metadaten-Extraktion
            try:
                result = extract_metadata(file_path, inbox_path, TRACK_RULES)
            except Exception as exc:  # noqa: BLE001
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Extraktion - {exc}")
                self.stderr.write(
                    self.style.ERROR(f"  Extraktion fehlgeschlagen: {exc}")
                )
                continue

            if not result:
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Keine Daten extrahiert")
                continue

            guessed_slugs = list(result.guessed_track_slugs)
            if not guessed_slugs:
                title_for_track = result.guessed_title or file_path.stem.replace(
                    "_", " "
                )
                guessed_slugs = guess_tracks(
                    title_for_track, TRACK_RULES, result.extracted_text
                )

            tracks_info = ", ".join(guessed_slugs) if guessed_slugs else "-"

            if dry_run:
                run.files_imported += 1
                run.append_log(
                    f"PLAN  {file_path.name} hash={file_hash[:12]} "
                    f"title='{result.guessed_title or '-'}' tracks='{tracks_info}'"
                )
                self.stdout.write(
                    f"  [WOULD IMPORT] {file_path.name} -> Titel: {result.guessed_title or '-'} "
                    f"[Tracks: {tracks_info}]"
                )
                continue

            # DB-Eintrag in PendingCertificate anlegen
            pending = PendingCertificate.objects.create(
                original_file_name=file_path.name[:255].replace("\x00", ""),
                file_path=str(file_path)[:1024].replace("\x00", ""),
                extracted_text=(result.extracted_text or "").replace("\x00", ""),
                guessed_title=(result.guessed_title or "")[:255].replace("\x00", ""),
                guessed_provider=(result.guessed_provider or "")[:255].replace(
                    "\x00", ""
                ),
                sha256_hash=file_hash,
                import_run=run,
            )

            # Zugeordnete Tracks verknüpfen
            for slug in guessed_slugs:
                track_obj, _ = Track.objects.get_or_create(
                    slug=slug,
                    defaults={"name": slug.replace("-", " ").title()},
                )
                pending.suggested_tracks.add(track_obj)

            run.files_imported += 1
            run.append_log(
                f"OK    {file_path.name} hash={file_hash[:12]} -> Titel: {result.guessed_title or '-'} "
                f"tracks={tracks_info}"
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  -> Gespeichert als Pending: {file_path.name} "
                    f"(Titel: {result.guessed_title or '-'}, Tracks: {tracks_info})"
                )
            )

        # ── Run abschließen ──
        run.finished_at = timezone.now()
        if run.files_errored and run.files_imported:
            run.status = ImportRunStatus.PARTIAL
        elif run.files_errored and not run.files_imported:
            run.status = ImportRunStatus.FAILED
        else:
            run.status = ImportRunStatus.SUCCESS

        summary = (
            f"DONE  Gefunden: {run.files_found}, "
            f"{'Geplant' if dry_run else 'Importiert'}: {run.files_imported}, "
            f"Uebersprungen: {run.files_skipped}, "
            f"Fehler: {run.files_errored}"
        )
        run.append_log(summary)
        run.save()

        self.stdout.write(self.style.SUCCESS(f"\n{summary}"))
