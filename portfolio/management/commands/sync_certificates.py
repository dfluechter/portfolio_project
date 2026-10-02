from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.text import slugify

from portfolio.models import (
    TRACK_RULES,
    Certificate,
    CertificateImportRun,
    ImportRunStatus,
    Provider,
    Track,
)
from portfolio.services.extractor import (
    compute_file_hash,
    extract_metadata,
    guess_track,
    safe_storage_key,
    validate_source_path,
)

VALID_EXTENSIONS = frozenset({".pdf", ".png", ".jpg", ".jpeg"})

CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


class Command(BaseCommand):
    help = (
        "Synchronisiert Zertifikate aus einem lokalen Quellverzeichnis. "
        "Standardmäßig Dry-Run – erst --apply schreibt in DB und Storage."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=str,
            required=True,
            help="Pfad zum Quellverzeichnis mit Zertifikaten.",
        )
        parser.add_argument(
            "--source-type",
            type=str,
            choices=["structured", "inbox"],
            default="structured",
            help=(
                "'structured': Unterordner = Anbieter. "
                "'inbox': flaches Verzeichnis ohne Provider-Ordner."
            ),
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Tatsächlich importieren (DB-Einträge + Storage-Upload).",
        )

    def handle(self, *args, **options):
        source_str = options["source"]
        source_type = options["source_type"]
        apply_mode = options["apply"]
        dry_run = not apply_mode

        source_path = Path(source_str).resolve()

        if not source_path.exists() or not source_path.is_dir():
            raise CommandError(f"Quellverzeichnis existiert nicht: {source_path}")

        if source_path.is_symlink():
            raise CommandError("Quellverzeichnis ist ein Symlink – abgelehnt.")

        mode_label = "APPLY" if apply_mode else "DRY-RUN"
        self.stdout.write(
            self.style.WARNING(f"Modus: {mode_label} | Typ: {source_type}")
        )
        self.stdout.write(f"Quelle: {source_path}")

        # ── Import-Run anlegen ──
        run = CertificateImportRun.objects.create(
            started_at=timezone.now(),
            inbox_path=str(source_path),
        )
        run.append_log(f"START {mode_label} source_type={source_type}")

        # ── Dateien sammeln ──
        files = self._collect_files(source_path, source_type)
        self.stdout.write(f"Dateien gefunden: {len(files)}")

        for file_path, provider_hint in files:
            run.files_found += 1

            # Sicherheitsprüfung
            if not validate_source_path(file_path, source_path):
                run.files_errored += 1
                run.append_log(f"REJECT {file_path.name} (Sicherheitsprüfung)")
                self.stderr.write(
                    self.style.ERROR(f"  REJECT: {file_path.name} – Pfadprüfung")
                )
                continue

            # SHA-256 berechnen
            try:
                file_hash = compute_file_hash(file_path)
            except Exception as exc:  # noqa: BLE001
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Hash – {exc}")
                continue

            # Duplikat-Check per Hash
            if Certificate.objects.filter(sha256_hash=file_hash).exists():
                run.files_skipped += 1
                run.append_log(f"SKIP  {file_path.name} (Hash bekannt)")
                continue

            # Metadaten extrahieren
            try:
                result = extract_metadata(
                    file_path=file_path,
                    source_root=source_path,
                    track_rules=TRACK_RULES,
                    enable_ocr=False,
                )
            except Exception as exc:  # noqa: BLE001
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Extraktion – {exc}")
                self.stderr.write(
                    self.style.ERROR(f"  ERROR: {file_path.name} – {exc}")
                )
                continue

            if not result:
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Keine Metadaten extrahiert")
                continue

            # Track-Vorschlag
            title_for_track = result.guessed_title or file_path.stem
            track_slug = guess_track(title_for_track, TRACK_RULES)

            # Provider bestimmen
            provider_name = result.guessed_provider or provider_hint or "Unbekannt"
            provider_slug = slugify(provider_name) or "unsorted"

            # Storage-Key berechnen
            storage_key = safe_storage_key(
                provider_slug,
                file_hash,
                file_path.name,
            )

            # Log-Ausgabe (ohne absolute Pfade!)
            self.stdout.write(
                f"  {'WOULD' if dry_run else 'IMPORT'}: "
                f"{file_path.name} → {provider_name}"
                f"{f' [Track: {track_slug}]' if track_slug else ''}"
            )
            run.append_log(
                f"{'PLAN' if dry_run else 'OK'}  "
                f"{file_path.name} hash={file_hash[:12]} "
                f"provider={provider_name} track={track_slug or '–'}"
            )

            if dry_run:
                run.files_imported += 1
                continue

            # ── APPLY: DB-Eintrag + Storage ──
            try:
                provider_obj, _ = Provider.objects.get_or_create(
                    provider=provider_name, defaults={"aktiv": True}
                )

                track_obj = None
                if track_slug:
                    track_obj, _ = Track.objects.get_or_create(
                        slug=track_slug,
                        defaults={"name": track_slug.replace("-", " ").title()},
                    )

                cert = Certificate(
                    title=result.guessed_title or file_path.stem,
                    provider=provider_obj,
                    sha256_hash=file_hash,
                    is_published=False,
                    credential_id=result.credential_id,
                    issued_date=result.issued_date or None,
                    storage_key=storage_key,
                    ocr_pending=result.ocr_pending,
                )

                # Datei binär lesen und über Django Storage speichern
                with open(file_path, "rb") as f:
                    file_content = ContentFile(f.read())
                    ext = file_path.suffix.lower()
                    file_content.content_type = CONTENT_TYPES.get(  # type: ignore[attr-defined]
                        ext, "application/octet-stream"
                    )
                    safe_name = storage_key.split("/")[-1]
                    cert.pdf_file.save(safe_name, file_content, save=True)

                if track_obj:
                    cert.tracks.add(track_obj)

                run.files_imported += 1

            except Exception as exc:  # noqa: BLE001
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Import – {exc}")
                self.stderr.write(self.style.ERROR(f"  FEHLER beim Import: {exc}"))

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
            f"Übersprungen: {run.files_skipped}, "
            f"Fehler: {run.files_errored}"
        )
        run.append_log(summary)
        run.save()

        self.stdout.write(self.style.SUCCESS(f"\n{summary}"))

    def _collect_files(self, source: Path, source_type: str) -> list[tuple[Path, str]]:
        """
        Sammelt Dateien mit Provider-Hint.
        structured: Unterordner = Anbietername
        inbox: flach, kein Hint
        """
        results: list[tuple[Path, str]] = []

        if source_type == "structured":
            for provider_dir in sorted(source.iterdir()):
                if not provider_dir.is_dir():
                    continue
                if provider_dir.is_symlink():
                    continue
                provider_name = provider_dir.name
                for file_path in sorted(provider_dir.iterdir()):
                    if (
                        file_path.is_file()
                        and not file_path.is_symlink()
                        and file_path.suffix.lower() in VALID_EXTENSIONS
                    ):
                        results.append((file_path, provider_name))
        else:
            # inbox: flaches Verzeichnis
            for file_path in sorted(source.iterdir()):
                if (
                    file_path.is_file()
                    and not file_path.is_symlink()
                    and file_path.suffix.lower() in VALID_EXTENSIONS
                ):
                    results.append((file_path, ""))

        return results
