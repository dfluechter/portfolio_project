from pathlib import Path
import time
from django.core.management.base import BaseCommand
from django.core.files import File
from portfolio.models import Certificate
from django.utils.text import slugify
from django.core.files.base import ContentFile

class Command(BaseCommand):
    help = 'Importiert Zertifikate aus lokalen Ordnern und lädt sie zu Supabase hoch.'

    def handle(self, *args, **kwargs):
        base_path = Path(r"C:\Users\domin\OneDrive\Documents\Zertifikate (Beruf)")
        
        if not base_path.exists() or not base_path.is_dir():
            self.stderr.write(self.style.ERROR(f"FEHLER: Pfad ungültig - {base_path}"))
            return

        self.stdout.write(self.style.WARNING(f"Starte Import aus {base_path}..."))
        self.stdout.write(self.style.WARNING("ACHTUNG: Skript läuft mit künstlicher Verzögerung (DDoS-Schutz).\n"))
        
        imported_count = 0
        skipped_count = 0

        for provider_dir in base_path.iterdir():
            if provider_dir.is_dir():
                issuer_name = provider_dir.name
                
                for file_path in provider_dir.iterdir():
                    if file_path.is_file() and file_path.suffix.lower() in ['.pdf', '.png']:
                        title = file_path.stem 
                        
                        # Prüfen, ob das Zertifikat schon existiert
                        if Certificate.objects.filter(title=title, issuer=issuer_name).exists():
                            self.stdout.write(f"Übersprungen (existiert bereits): {title}")
                            skipped_count += 1
                            continue
                        cert = None    
                        try:
                            with open(file_path, 'rb') as f:
                                file_content = ContentFile(f.read())
                                file_content.content_type = 'application/pdf' # Wichtig für Supabase
                                cert = Certificate(
                                    title=title,
                                    issuer=issuer_name
                                )
                                safe_name = f"{slugify(file_path.stem)}{file_path.suffix.lower()}"
                                cert.pdf_file.save(safe_name, file_content, save=True)                               
                            self.stdout.write(self.style.SUCCESS(f"Erfolgreich importiert: {title} ({issuer_name})"))
                            imported_count += 1
                            
                            # DIE MAGISCHE PAUSE: Cloudflare beruhigen
                            time.sleep(1.5)
                            
                        except Exception as e:
                            self.stderr.write(self.style.ERROR(f"Fehler bei {file_path.name}: {str(e)}"))
                            # Bei einem Fehler kurz durchatmen (5 Sekunden), bevor es weitergeht
                            time.sleep(5)

        self.stdout.write("-" * 50)
        self.stdout.write(self.style.SUCCESS(f"IMPORT ABGESCHLOSSEN!"))
        self.stdout.write(self.style.SUCCESS(f"{imported_count} Zertifikate hochgeladen."))
        self.stdout.write(self.style.SUCCESS(f"{skipped_count} Zertifikate übersprungen."))