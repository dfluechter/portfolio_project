# Schutzregel: Zertifikate-Ordner (Read-Only)

## Pfadvorgabe & Geltungsbereich
- **Pfad:** `C:\Users\domin\OneDrive\Documents\Zertifikate (Beruf)` (bzw. die Umgebungsvariable `CERTIFICATES_PATH`)
- **Status:** **STRIKT SCHREIBGESCHÜTZT (READ-ONLY)**

## Zwingende Sicherheitsregeln für alle Agenten, Sub-Agenten und Skripte:

1. **Keine Modifikation:**
   - Dateien in diesem Ordner dürfen unter keinen Umständen verändert, überschrieben, umbenannt oder verschoben werden.
   - Kein In-Place-Schreiben, kein Truncate, keine Formatkonvertierung im Quellordner.

2. **Kein Löschen:**
   - Das Löschen von Dateien oder Verzeichnissen in diesem Pfad ist strikt untersagt (`os.remove`, `Path.unlink`, `shutil.rmtree`, `rm`, `del`, `Remove-Item` etc.).
   - Alle Import- und Scan-Pipelines dürfen Quelldateien nach der Verarbeitung niemals löschen.

3. **Ausschließlich lesender Zugriff:**
   - Der Zugriff auf diesen Ordner ist ausschließlich lesend gestattet (z. B. Hashing via SHA-256, OCR / Text-Extraktion, Auslesen von PDF-/Bildmetadaten oder binäres Kopieren in Upload-Puffer / S3-Storage).
   - Dateien verbleiben immer im Originalzustand am Ursprungsort.
