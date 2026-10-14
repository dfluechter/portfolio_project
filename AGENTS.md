# AGENTS.md - Projektrichtlinien für Antigravity

## Wichtige Schutzregeln

### 1. Strikt geschützter Quellordner für Zertifikate
- **Pfad:** `C:\Users\domin\OneDrive\Documents\Zertifikate (Beruf)` (sowie `CERTIFICATES_PATH` in `.env`)
- **Regel:** Dieser Ordner ist **STRIKT READ-ONLY**.
- **Verbotene Aktionen:**
  - Niemals Dateien ändern, überschreiben, umbenennen oder verschieben.
  - Niemals Dateien oder Unterordner löschen (weder manuell, per Terminal, noch programmatisch via Python/Shell).
- **Erlaubte Aktionen:**
  - Ausschließlich lesender Zugriff (z. B. Hash-Berechnung, Text- und Metadaten-Extraktion, Read-Streams zum Übertragen in den S3-Storage).
  - Quelldateien verbleiben unverändert und unberührt am Ursprungsort.

### 2. Sprache
- Siehe [.agents/rules/language.md](file:///d:/dev/portfolio_project/.agents/rules/language.md): Alle Antworten, Erklärungen und Gedankengänge sind auf Deutsch zu verfassen.
