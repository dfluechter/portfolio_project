# ADR-006: Behebung technischer Schulden, Cloud-Architektur und Sicherheits-Härtung

**Status:** Accepted  
**Datum:** 2026-10-14  
**Autor:** Dominik Flüchter  

---

## Kontext und Problem
Die read-only Systemanalyse des Gesamt-Repositories hat mehrere architektonische Herausforderungen und technische Schulden aufgedeckt:

1. **OCR-Architektur:** In `extractor.py` fehlte die angekündigte Anbindung an die Gemini Vision API für gescannte Zertifikate ohne Textschicht.
2. **Architektur-Inkonsistenz (Templates vs. SPA):** Das Backend enthielt noch serverseitige HTML-Templates (`login.html`, `dashboard.html`), obwohl die Benutzeroberfläche vollständig von der React-19-SPA abgebildet wird.
3. **Neon Serverless Pooling vs. Migrationen:** Für Web-Requests und Migrationen wurde derselbe `DATABASE_URL`-Parameter verwendet. Dies birgt bei PgBouncer-Transaktions-Pools Risiken für blockierte DDL-Migrationen.
4. **Public Portfolio UX:** Auf der öffentlichen Startseite fehlte eine interaktive Mehrfach-Filterung nach Fachpfaden (Tracks), und der Render Free-Tier Cold-Start (15 Min. Inaktivität) führte zu unklaren Wartezeiten für Besucher.
5. **Upload-Sicherheit:** Dateivalidierungen prüften bisher primär Dateiendungen und Pillow-Header, jedoch keine echten Magic Bytes gegen File-Spoofing.

---

## Entscheidungen (aus dem Grill-Me-Interview)

### 1. Hybrid 3-Stufen OCR & Metadaten-Extraktion
* **Stufe 1:** Lokales Auslesen des PDF-Textlayers via `pypdf` (blitzschnell, 0 API-Kosten).
* **Stufe 2:** Lokales OCR via `pytesseract` für reine Standard-Scans.
* **Stufe 3 (Vision-Fallback):** On-Demand Aufruf der **Gemini Flash Vision API** (via `google-genai`), wenn kein Textlayer gefunden wurde oder explizit im Review-Modal angefordert wird.
* **Graceful Degradation:** Falls kein `GEMINI_API_KEY` konfiguriert ist, fällt das System transparent auf Stufe 1 & 2 zurück, ohne Fehler zu werfen (`ocr_pending=True`).

### 2. Konsequente Headless-Architektur & Token-Management
* Die veralteten Django-HTML-Templates `login.html` und `dashboard.html` sowie Session-Views werden restlos entfernt (löst die Session-Komponente aus [ADR-003](003-dual-auth-strategie.md) vollständig ab). Django fungiert ausschließlich als reines JSON-API-Backend.
* Die JWT-Token-Ablage im Frontend-`localStorage` bleibt bestehen, da sie für das decouplede Render-Deployment (Frontend Static Site, Backend Web Service auf separaten Subdomains) die robusteste Lösung darstellt. XSS-Schutz wird durch striktes React JSX Escaping sichergestellt.

### 3. Trennung von Neon Pooled- und Direct-Connection
* Für den regulären Web-Betrieb (Gunicorn / DRF) nutzt die Anwendung `DATABASE_URL` mit aktiviertem PgBouncer-Pooling.
* Für Datenbank-Migrationen (`python manage.py migrate` in `build.sh` und CI) wird `DIRECT_DATABASE_URL` (ohne Pooler-Port / Non-Pooled Endpoint) priorisiert, um PgBouncer-Locks und Transaktions-Fehler zuverlässig auszuschließen.

### 4. Public Track-Filterung & Cold-Start UX
* **Track-Chips:** Auf der öffentlichen Startseite (`CertificatesSection`) können Besucher mehrere Tracks interaktiv an- und abwählen (OR-Logik mit Badge-Zählern).
* **Cold-Start Banner:** Erkennt das Frontend beim initialen Laden eine Server-Antwortzeit > 2s (oder Timeout), erscheint ein dezenter Status-Hinweis: *„Server wacht auf (Render Free-Tier)...“* mit animiertem Ladebalken.

### 5. Magic-Byte Dateivalidierung
* Ergänzung einer serverseitigen Magic-Byte-Prüfung (`MAGIC_BYTE_SIGNATURES`: `%PDF`, `\x89PNG`, `\xFF\xD8\xFF`) direkt im Django-Upload-Validator (`validate_file_extension`), um Dateiendungs-Spoofing ohne externe C-Bibliotheken (`libmagic`) plattformunabhängig und schnell abzuweisen.

---

## Konsequenzen

### Positiv
* **Zero Overhead:** Stufe-1-First schont das Gemini API-Kontingent und minimiert Latenzen.
* **Saubere Codebasis:** Kein toter Code durch entfernte Legacy-Templates.
* **Hohe Stabilität bei Deployments:** Keine blockierenden PgBouncer-Locks bei Schema-Migrationen auf Neon.
* **Hervorragende Besucher-UX:** Schnelle Filterung und transparente Rückmeldung bei Render-Kaltstarts.
* **Hohe Sicherheit:** Zuverlässige Abwehr von Dateiendungs-Spoofing vor dem Speichern.

### Negativ / Trade-offs
* `DIRECT_DATABASE_URL` muss im Render-Dashboard als separates Secret hinterlegt werden.
