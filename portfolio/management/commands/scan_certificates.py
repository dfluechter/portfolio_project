import os
from pathlib import Path

from django.core.management.base import BaseCommand

from portfolio.models import Provider


class Command(BaseCommand):
    help = "Scannt das lokale OneDrive-Verzeichnis und legt Zertifikatsanbieter in der Datenbank an."

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

        if not base_path.exists():
            self.stderr.write(
                self.style.ERROR(f"FEHLER: Der Pfad {base_path} wurde nicht gefunden!")
            )
            return

        if not base_path.is_dir():
            self.stderr.write(
                self.style.ERROR(f"FEHLER: {base_path} ist kein Verzeichnis!")
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f"Starte Scan im Verzeichnis: {base_path}\n")
        )
        self.stdout.write(
            self.style.WARNING("Verarbeite Zertifikatsanbieter (Ordner):")
        )
        self.stdout.write("-" * 50)

        provider_count = 0
        created_count = 0

        for item in base_path.iterdir():
            if item.is_dir():
                provider_count += 1
                provider_name = item.name

                # Prüft, ob der Anbieter existiert, und legt ihn andernfalls neu an
                _, created = Provider.objects.get_or_create(
                    provider=provider_name, defaults={"aktiv": True}
                )

                # Farbige Log-Ausgaben zur besseren Übersicht
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"- NEU ANGELEGT: {provider_name}")
                    )
                else:
                    self.stdout.write(
                        self.style.NOTICE(f"- BEREITS VORHANDEN: {provider_name}")
                    )

        self.stdout.write("-" * 50)
        self.stdout.write(
            self.style.SUCCESS(
                f"Scan beendet. {provider_count} Ordner gefunden. {created_count} neue Anbieter in der Datenbank angelegt."
            )
        )
