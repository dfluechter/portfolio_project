# ADR-005: Zertifikats-Lifecycle, Einzel-Review und Server-Side Pagination

**Status:** Accepted (OCR-Extraktion verfeinert durch [ADR-006](006-resolving-technical-debt-and-security.md))
**Datum:** 2026-10-14
**Autor:** Dominik Flüchter

> [!NOTE]
> Die in Punkt 2 skizzierte OCR-Strategie wurde in [ADR-006](006-resolving-technical-debt-and-security.md) zu einer dreistufigen Kaskade (`pypdf` Textlayer $\rightarrow$ `pytesseract` Lokal-OCR $\rightarrow$ `Gemini Flash` Cloud-Vision) weiterentwickelt. Das Review-Modal, der Freigabeprozess und die Server-Pagination gelten unverändert.

---

## Kontext und Problem
Nach dem initialen Batch-Import befinden sich über 730 Zertifikate in der Datenbank und im S3-Storage, die standardmäßig mit `is_published=False` markiert sind. Viele importierte Dokumente besitzen generierte oder vorläufige Titel und noch unvollständige Metadaten (z. B. fehlendes Ausstellungsdatum).

Folgende Herausforderungen mussten gelöst werden:
1. **Qualitätssicherung vs. Automatisierung:** Ein automatischer Massen-Publish birgt das Risiko, unfertige, fehlerhafte oder irrelevante Zertifikate öffentlich zu präsentieren.
2. **Ressourcenbeschränkungen:** Automatische Hintergrund-OCR-Läufe (z. B. für alle 734 Dokumente gleichzeitig) führen auf Shared-/Serverless-Infrastrukturen (wie Render Web Services) zu Timeouts, CPU-Überlastungen und potenziellen API-Kosten.
3. **Frontend-Performance:** Das Laden und Rendern von mehr als 700 Zertifikaten in einer einzelnen unpaginierten React-Komponente (`CertificateManager`) belastet den DOM, erzeugt unnötigen Netzwerk-Payload und führt zu schlechten Antwortzeiten im Dashboard.

---

## Alternativen

### Zu Frage 1 (Freigabe-Strategie):
* **Option A (Bulk Publish nach Track):** Schnelle Freigabe ganzer Kategorien, aber keine Überprüfung kryptischer Titel oder fehlerhafter Zuordnungen.
* **Option B (Manueller Einzel-Review - GEWÄHLT):** Gezielte, qualitative Einzelprüfung jedes Zertifikats vor der Freigabe.
* **Option C (Standardmäßig alles öffentlich):** Höchster Pflegeaufwand im Nachgang, Risiko von Dateninkonsistenzen in der öffentlichen Wahrnehmung.

### Zu Frage 2 (OCR & Extraktion):
* **Option 1 (Automatischer Background-Worker via Celery/Cron):** Erfordert zusätzliche Infrastruktur (Redis/RabbitMQ, separater Worker-Prozess auf Render) und erzeugt unkontrollierte Spitzenlasten.
* **Option 2 (Manuell on-demand im Dashboard - GEWÄHLT):** Der Administrator fordert bei unklaren Dokumenten per Klick eine Analyse an. Das Ergebnis dient als UI-Vorschlag und überschreibt niemals unbemerkt Eingaben.

### Zu Frage 3 (Listen-Performance & Skalierung):
* **Option 1 (Client-Side Rendering mit unpaginiertem Fetch):** Hoher Speicherbedarf im Browser, blockierender Initial-Load.
* **Option 2 (Virtual Scrolling ohne Server-Pagination):** Rendert nur sichtbare DOM-Knoten, muss aber weiterhin das gesamte JSON-Array über das Netzwerk laden.
* **Option 3 (Server-Side Pagination & Filterung - GEWÄHLT):** DRF liefert paginierte Chunks (z. B. 20–25 Elemente) inklusive Filter- und Suchparametern serverseitig aus.

---

## Entscheidung

1. **Selektiver Einzel-Review via Detail-Modal / Drawer:**
   * Zertifikate verbleiben standardmäßig auf `is_published=False`.
   * Die Freigabe erfolgt nicht über ein flüchtiges Inline-Toggle, sondern über ein strukturiertes **Review-Modal / Detail-Drawer**.
   * Im Modal können Titel, Provider, Ausstellungsdatum (`issued_date`), Credential-ID und Track-Zuordnungen final validiert werden, bevor mit „Speichern & Veröffentlichen“ bestätigt wird.
2. **Zweistufige On-Demand Text- & Metadatenanalyse (Hybrid OCR):**
   * Analyse wird ausschließlich **manuell per Aktions-Button im Review-Modal** angestoßen.
   * **Stufe 1 (Lokal & Schnell):** Direkte Textschicht-Extraktion aus PDFs via PyMuPDF/pdfplumber.
   * **Stufe 2 (Vision-Fallback):** Falls keine Textschicht vorhanden ist (z. B. Scans, JPGs, PNGs), erfolgt der Aufruf an ein multimodales Modell (z. B. Gemini Vision API).
   * Die ermittelten Werte (Titel, Datum, Aussteller) werden als Formular-Vorschläge geladen und erfordern die explizite Bestätigung des Administrators.
3. **Server-Side Pagination & Gezielte Review-Filter:**
   * Die Backend-API (`/api/certificates/`) unterstützt Pagination (`page`, `page_size=20`).
   * **Primäre Filter für den Reviewer:**
     * `is_published`: Filterung nach Veröffentlichungsstatus (`false` für ausstehende Reviews).
     * `incomplete`: Filterung nach unvollständigen Datensätzen (z. B. fehlendes `issued_date` oder Verdacht auf Dateinamen als Titel).
     * Standardsortierung nach `-uploaded_at`.

---

## Begründung
* **Qualitätssicherung durch Modals:** Ein Detail-Drawer zwingt zur kurzen visuellen Kontrolle des Dokuments (eingebettete PDF/Bild-Vorschau) und verhindert das versehentliche Veröffentlichen von Roh-Dateinamen.
* **Kosten- und Performance-Effizienz (Stufe-1-First):** Über 80% moderner Zertifikate (Coursera, Udemy, etc.) haben native Textschichten. Diese kostenfrei und latenzarm lokal auszulesen schont API-Budgets und liefert sofortige Ergebnisse.
* **Fokussierter Review-Workload:** Durch den `incomplete`-Filter kann der Administrator gezielt die Problemfälle abarbeiten, während saubere Datensätze zügig freigegeben werden können.

---

## Konsequenzen
* **Positiv:**
  * Maximale Datenqualität und professioneller Auftritt im Portfolio.
  * Schnelle UI durch paginierte 20er-Blöcke statt 700+ DOM-Elementen.
  * Kostengünstige und robuste OCR-Strategie ohne synchrone System-Blockaden.
* **Negativ / Aufwand:**
  * Bau des Review-Drawers/Modals im Frontend mit Dokumenten-Vorschau.
  * Backend-Endpoint für `/api/certificates/{id}/extract_metadata/` erforderlich.
* **Risiken / Maßnahmen:**
  * *Risiko:* Gemini Vision API-Key fehlt in lokaler Umgebung.
  * *Maßnahme:* Sauberes Fallback mit Hinweismeldung im UI, falls Stufe 2 nicht erreichbar ist.
