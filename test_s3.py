import os

import django
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

# 1. Django mitteilen, wo die Settings sind
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# 2. Jetzt erst importieren wir den Storage

print(f"Storage Backend: {default_storage.__class__.__name__}")

try:
    # Versucht eine Testdatei zu schreiben
    file_content = ContentFile(b'hallo')
    # Wir löschen den manuellen Type-Zuweisung komplett
    
    # Save führt einen "Head"-Request aus, um den MimeType zu erraten
    default_storage.save('test_connection.txt', file_content)
    print("Verbindung erfolgreich!")
    # Aufräumen: Datei wieder löschen
    default_storage.delete('test_connection.txt')
    print("Testdatei wurde erfolgreich wieder gelöscht.")
except Exception as e:  # noqa: BLE001
    print(f"Fehler bei der Verbindung: {e}")