# Glossar der Fachbegriffe

Dieses Dokument definiert die einheitliche Begriffswelt des Portfolio-Projekts für Entwickler, Tester und Maintainer.

---

## 1. Domain-Entitäten & Datenmodell

| Begriff | Definition & Kontext |
|---|---|
| **`Project`** | Ein öffentlich sichtbares Referenzprojekt mit Titel, Beschreibung, Technologien, Vorschaubild, Aufgabenliste und GitHub-/Live-URLs. |
| **`Certificate`** | Ein verifiziertes Zertifikat mit Titel, Aussteller (`Provider`), Ausstellungsdatum, Datei im Supabase S3-Storage, SHA-256 Hash und verknüpften `Tracks`. |
| **`PendingCertificate`** | Ein noch nicht freigegebener Zertifikatskandidat im Staging-Bereich (Inbox), erzeugt durch Dateiscans (`scan_inbox`). |
| **`Track`** | Ein thematischer Fachbereich (z. B. *Cloud & DevOps*, *Backend-Engineering*, *Data & AI*) zur Filterung und Strukturierung von Qualifikationen. Veröffentlichte Zertifikate erfordern mindestens einen Track. |
| **`Provider`** | Aussteller von Zertifikaten (z. B. AWS, Microsoft, Coursera). Geschützt gegen Löschen bei verknüpften Zertifikaten (`PROTECT`). |
| **`Skill`** | Fachliche Fähigkeit mit Erfahrungslevel und Kategorie. |
| **`TimelineEntry`** | Beruflicher Werdegang und Meilensteine. |
| **`KnowledgeChunk`** | Ein semantischer Wissensabschnitt aus veröffentlichten Portfolio-Daten mit 768-dimensionalem Vektor-Embedding für den RAG-Copiloten. |

---

## 2. Ingestion & Zertifikats-Lifecycle

| Begriff | Definition & Kontext |
|---|---|
| **Staging / Inbox** | Lokaler oder temporärer Ordner, in den neue Zertifikatsdokumente abgelegt werden, bevor sie in die Datenbank aufgenommen werden. |
| **`CERTIFICATES_PATH`** | Streng schreibgeschützter Quellordner (`READ-ONLY`), aus dem Quelldateien ausschließlich lesend verarbeitet werden. |
| **Magic Bytes** | Die ersten Bytes einer Datei (Dateisignatur wie `%PDF`, `\x89PNG`), anhand derer das echte Dateiformat unabhängig von der Dateiendung ermittelt wird. |
| **Direct-to-Storage** | Upload-Verfahren, bei dem der Browser Dateien direkt via signierter PUT-URL nach Supabase S3 lädt, ohne den Backend-Server zu belasten. |
| **3-Stufen OCR** | Kaskadierender Extraktionsmechanismus: 1. `pypdf` (lokaler Textlayer), 2. `pytesseract` (lokales OCR), 3. `Google Gemini Flash Vision` (multimodale KI-Analyse). |

---

## 3. RAG & Vektorsuche

| Begriff | Definition & Kontext |
|---|---|
| **RAG** | *Retrieval-Augmented Generation*: LLM-Antwortgenerierung, die strikt durch vorher aus einer Datenbank abgerufene Dokumentenkontexte gestützt wird. |
| **`pgvector`** | PostgreSQL-Erweiterung für Vektorähnlichkeits-Suchen. |
| **HNSW** | *Hierarchical Navigable Small World*: Hocheffizienter Graph-basierter Vektor-Index für $O(\log N)$ Nächste-Nachbarn-Suchen. |
| **CosineDistance** | Mathematisches Maß zur Berechnung der Winkelabweichung zweier Vektoren im 768-dimensionalen Raum. |
| **0-Token Drop** | Sicherheitsmechanismus: Verdächtige Prompts (Jailbreaks) werden per Regex erkannt und defensiv beantwortet, ohne LLM-Tokens zu verbrauchen. |
| **Signals Invalidation** | Automatische Cache-Entwertung und Re-Indizierung in $O(1)$ über Django ORM Signals (`post_save`, `post_delete`). |
