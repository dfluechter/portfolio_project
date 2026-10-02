import os
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from portfolio.models import (
    TRACK_RULES,
    Certificate,
    CertificateImportRun,
    ImportRunStatus,
    PendingCertificate,
)
from portfolio.services.extractor import (
    compute_file_hash,
    extract_metadata,
)


class Command(BaseCommand):
    help = (
        "Scannt das Inbox-Verzeichnis nach neuen Zertifikaten und liest Metadaten ein."
    )

    def handle(self, *args, **options):
        inbox_path_str = os.getenv(
            "CERTIFICATES_INBOX_PATH",
            str(settings.BASE_DIR / "inbox"),
        )
        inbox_path = Path(inbox_path_str)

        # ── Run-Objekt anlegen ──
        run = CertificateImportRun.objects.create(
            started_at=timezone.now(),
            inbox_path=str(inbox_path),
        )

        if not inbox_path.exists():
            msg = f"Inbox-Verzeichnis '{inbox_path}' existiert nicht. Erstelle es..."
            self.stdout.write(self.style.WARNING(msg))
            run.append_log(f"WARN  {msg}")
            inbox_path.mkdir(parents=True, exist_ok=True)

        self.stdout.write(
            self.style.SUCCESS(f"Starte Scan im Inbox-Verzeichnis: {inbox_path}")
        )
        run.append_log(f"START Scan in {inbox_path}")

        valid_extensions = {".pdf", ".png", ".jpg", ".jpeg"}

        for file_path in inbox_path.iterdir():
            if not file_path.is_file():
                continue
            if file_path.suffix.lower() not in valid_extensions:
                continue

            run.files_found += 1

            # SHA-256 berechnen für Idempotenz
            try:
                file_hash = compute_file_hash(file_path)
            except Exception as exc:  # noqa: BLE001
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Hash-Berechnung – {exc}")
                continue

            # Bereits eingelesen oder als Zertifikat vorhanden?
            if (
                PendingCertificate.objects.filter(sha256_hash=file_hash).exists()
                or Certificate.objects.filter(sha256_hash=file_hash).exists()
            ):
                run.files_skipped += 1
                run.append_log(f"SKIP  {file_path.name} (bereits vorhanden)")
                continue

            self.stdout.write(f"Lese Datei ein: {file_path.name}")

            # Extraktion
            try:
                result = extract_metadata(file_path, inbox_path, TRACK_RULES)
            except Exception as exc:  # noqa: BLE001
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Extraktion – {exc}")
                self.stderr.write(
                    self.style.ERROR(f"  Extraktion fehlgeschlagen: {exc}")
                )
                continue

            if not result:
                run.files_errored += 1
                run.append_log(f"ERROR {file_path.name}: Keine Daten extrahiert")
                continue

            PendingCertificate.objects.create(
                original_file_name=file_path.name[:255].replace("\x00", ""),
                file_path=str(file_path)[:1024].replace("\x00", ""),
                extracted_text=(result.extracted_text or "").replace("\x00", ""),
                guessed_title=(result.guessed_title or "")[:255].replace("\x00", ""),
                guessed_provider=(result.guessed_provider or "")[:255].replace("\x00", ""),
                sha256_hash=file_hash,
            )
            run.files_imported += 1
            run.append_log(
                f"OK    {file_path.name} → Titel: {result.guessed_title or '–'}"
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  -> Gespeichert als Pending (Titel: {result.guessed_title})"
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
            f"Importiert: {run.files_imported}, "
            f"Übersprungen: {run.files_skipped}, "
            f"Fehler: {run.files_errored}"
        )
        run.append_log(summary)
        run.save()

        self.stdout.write(self.style.SUCCESS(f"\n{summary}"))
