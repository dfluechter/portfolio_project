from pathlib import Path

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Scannt das lokale OneDrive-Verzeichnis und listet alle Zertifikatsanbieter (Ordner) auf.'  # noqa: E501

    def handle(self, *args, **kwargs):
        base_path = Path(r"C:\Users\domin\OneDrive\Documents\Zertifikate (Beruf)")
        
        if not base_path.exists():
            self.stderr.write(self.style.ERROR(f"FEHLER: Der Pfad {base_path} wurde nicht gefunden!"))  # noqa: E501
            return
            
        if not base_path.is_dir():
            self.stderr.write(self.style.ERROR(f"FEHLER: {base_path} ist kein Verzeichnis!"))
            return

        self.stdout.write(self.style.SUCCESS(f"Starte Scan im Verzeichnis: {base_path}\n"))
        self.stdout.write(self.style.WARNING("Gefundene Zertifikatsanbieter (Ordner):"))
        self.stdout.write("-" * 50)

        provider_count = 0
        for item in base_path.iterdir():
            if item.is_dir():
                provider_count += 1
                self.stdout.write(f"- {item.name}")
        
        self.stdout.write("-" * 50)
        self.stdout.write(self.style.SUCCESS(f"Erfolgreich {provider_count} Anbieter gefunden."))