import os
import time
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from portfolio.models import Certificate, Provider


class Command(BaseCommand):
    help = "Importiert Zertifikate aus lokalen Ordnern und lädt sie zu Supabase hoch."

    def handle(self, *args, **kwargs):
        cert_path_env = os.getenv("CERTIFICATES_PATH")

        if not cert_path_env:
            self.stderr.write(
                self.style.ERROR(
                    "FEHLER: 'CERTIFICATES_PATH' ist nicht in der .env-Datei oder den Umgebungsvariablen gesetzt!"
                )
            )
            return

        base_path = Path(cert_path_env)

        if not base_path.exists() or not base_path.is_dir():
            self.stderr.write(self.style.ERROR(f"FEHLER: Pfad ungültig - {base_path}"))
            return

        self.stdout.write(self.style.WARNING(f"Starte Import aus {base_path}..."))
        self.stdout.write(
            self.style.WARNING(
                "ACHTUNG: Skript läuft mit künstlicher Verzögerung (DDoS-Schutz).\n"
            )
        )

        imported_count = 0
        skipped_count = 0

        for provider_dir in base_path.iterdir():
            if provider_dir.is_dir():
                issuer_name = provider_dir.name
                provider_obj, _ = Provider.objects.get_or_create(
                    provider=issuer_name, defaults={"aktiv": True}
                )

                for file_path in provider_dir.iterdir():
                    if file_path.is_file() and file_path.suffix.lower() in [
                        ".pdf",
                        ".png",
                        ".jpg",
                    ]:
                        title = file_path.stem

                        # Prüfen, ob das Zertifikat schon existiert
                        if Certificate.objects.filter(
                            title=title, provider=provider_obj
                        ).exists():
                            self.stdout.write(
                                f"Übersprungen (existiert bereits): {title}"
                            )
                            skipped_count += 1
                            continue
                        cert = None
                        try:
                            with open(file_path, "rb") as f:
                                file_content = ContentFile(f.read())
                                content_types = {
                                    ".pdf": "application/pdf",
                                    ".png": "image/png",
                                    ".jpg": "image/jpeg",
                                }
                                file_content.content_type = content_types.get(
                                    file_path.suffix.lower(), "application/octet-stream"
                                )
                                cert = Certificate(title=title, provider=provider_obj)
                                safe_name = f"{slugify(file_path.stem)}{file_path.suffix.lower()}"
                                cert.pdf_file.save(safe_name, file_content, save=True)
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"Erfolgreich importiert: {title} ({issuer_name})"
                                )
                            )
                            imported_count += 1

                            # DIE MAGISCHE PAUSE: Cloudflare beruhigen
                            time.sleep(1.5)

                        except Exception as e:  # noqa: BLE001
                            self.stderr.write(
                                self.style.ERROR(f"Fehler bei {file_path.name}: {e!s}")
                            )
                            # Bei einem Fehler kurz durchatmen (5 Sekunden), bevor es weitergeht
                            time.sleep(5)

        self.stdout.write("-" * 50)
        self.stdout.write(self.style.SUCCESS("IMPORT ABGESCHLOSSEN!"))
        self.stdout.write(
            self.style.SUCCESS(f"{imported_count} Zertifikate hochgeladen.")
        )
        self.stdout.write(
            self.style.SUCCESS(f"{skipped_count} Zertifikate übersprungen.")
        )
