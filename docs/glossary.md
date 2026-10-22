# Fachglossar (Domain Glossary)

Dieses Dokument definiert die einheitliche Terminologie für die Domäne des Portfolio-Projekts. Es verhindert Mehrdeutigkeiten zwischen Backend, Frontend, Datenbank und Dokumentation.

---

## 1. Kernentitäten & Entwurfsbegriffe

### Certificate (Zertifikat)
Ein verifiziertes, persistiertes Bildungszertifikat oder Abzeichen.
* **Storage-Ort:** Liegt physisch im Supabase S3-Speicher (`portfolio-media/certificates/<provider-slug>/<hash>/...`).
* **Datenbank:** Entität `Certificate` in PostgreSQL (Neon).
* **Eigenschaften:** Verfügt über einen eindeutigen `sha256_hash`, einen Verknüpfungsstatus (`is_published`), optionale Metadaten (`credential_id`, `issued_date`) und M2M-Zuordnungen zu `Track`.

### PendingCertificate (Inbox-Kandidat)
Ein temporärer Eintrag im Vorverarbeitungsstatus (Staging / Inbox), der noch nicht als endgültiges Zertifikat bestätigt oder übertragen wurde.
* **Status:** `pending` (ausstehend), `approved` (übertragen), `rejected` (verworfen).
* **Lebenszyklus:** Entsteht durch automatisierte Datei-Scans (`scan_inbox`). Bei Freigabe wird daraus ein `Certificate` generiert.

### Provider (Zertifikatsanbieter)
Die Ausstellerorganisation des Zertifikats (z. B. AWS, Coursera, IBM, Microsoft, Sololearn, Udemy).
* **Beziehung:** 1:n zu `Certificate`. Ein Provider ist durch `on_delete=models.PROTECT` vor versehentlichem Löschen geschützt, solange Zertifikate damit verknüpft sind.

### Track (Themenschwerpunkt / Fachdomäne)
Eine thematische Gruppierung von Kompetenzen und Zertifikaten (z. B. *Python & Django Backend*, *Data & KI*, *Cloud & DevOps*, *Frontend & React*, *Security & Compliance*).
* **Beziehung:** n:m zu `Certificate`. Ein Zertifikat muss vor der Veröffentlichung (`is_published=True`) zwingend mindestens einem Track zugeordnet sein (Epic 12).
* **Icons:** Jeder Track kann ein FontAwesome Solid Icon (`icon`) referenzieren, das über den `icon_service` beim ersten Abruf validiert und lokal unter `/static/img/icons/<icon>.svg` gecacht wird (`icon_url`).
* **Zweck:** Ermöglicht interaktive Mehrfach-Filterung (OR-Logik) und themenspezifische Qualifikationsdarstellung auf der Startseite und im Admin-Dashboard.

---

## 2. Lebenszyklus & Statusbegriffe

### Review-Prozess (Manuelle Prüfung)
Der schrittweise Kontroll- und Validierungsablauf durch den Administrator im Dashboard:
1. **Inbox-Review:** Prüfung von `PendingCertificate` (Titelkorrektur, Anbieterauswahl, Track-Vorschläge anpassen).
2. **Kuratierungs-Review (Publishing):** Prüfung vorhandener `Certificate`-Einträge mit `is_published=False` vor der Veröffentlichung für die Öffentlichkeit.

### is_published (Öffentlichkeitsstatus)
Boolesches Attribut eines Zertifikats:
* `False` (Privat / Entwurf): Nur für authentifizierte Administratoren im Dashboard sichtbar. Die öffentliche REST-API liefert diesen Datensatz für unauthentifizierte Anfragen nicht aus (HTTP 404 bei Detailaufruf, ausgefiltert in Listen).
* `True` (Veröffentlicht): Für alle Besucher des Portfolios auf der Startseite und über die öffentliche API einsehbar.

### On-Demand OCR (Manuelle Texterkennung)
Bedarfsgesteuerte Extraktion von Text- und Metadaten (Titel, Datum, Aussteller, Credential-ID) aus dem hinterlegten Dokument:
* Wird **ausschließlich manuell per Benutzeraktion** im Dashboard angestoßen (kein unkontrollierter Massen-Hintergrundjob).
* Dient als Ausfüllhilfe: Ermittelte Daten werden dem Administrator als Vorschlag präsentiert und überschreiben niemals unbemerkt bestehende Werte.

### Clean Compensation (Transaktionale Kompensation)
Sicherheitsmechanismus beim Upload: Schlägt das Schreiben in die relationale Datenbank nach dem erfolgreichen Hochladen einer Datei in den S3-Storage fehl, wird die Datei im Storage per Kompensationstransaktion gelöscht. Dies verhindert verwaiste Speicherleichen.

---

## 3. Architektur- & Infrastrukturbegriffe

### Pooled Connection (Neon PgBouncer)
Verbindung zur Neon PostgreSQL-Datenbank über den integrierten PgBouncer Connection Pooler (Port 5432 bzw. `-pooler` im Hostnamen).
* **Zweck:** Wiederverwendung bestehender Datenbank-Verbindungen für zustandslose HTTP-Requests im Web-Betrieb (Gunicorn/DRF).
* **Einschränkung:** Ungeeignet für Schema-Migrationen und Session-Locks.

### Direct Connection (Neon Dedicated Endpoint)
Direkte TCP-Verbindung zur PostgreSQL-Instanz unter Umgehung des PgBouncers.
* **Zweck:** Ausführung von DDL-Migrationen (`python manage.py migrate`), Transaktions-Locks und Bulk-Operationen während des CI/CD-Builds (`build.sh`).

### Cold-Start Banner
Benutzer-Feedback im Frontend zur Überbrückung des Render Free-Tier Kaltstarts. Schläft der Web-Dienst nach 15 Minuten Inaktivität ein, blendet die React-SPA bei Verzögerungen > 2s einen dezenten Status-Hinweis ein, bis die API antwortet.

### Hybrid 3-Stufen OCR
Kaskadierendes Extraktionsverfahren für Zertifikate:
1. **Stufe 1 (Lokal):** Native PDF-Textschicht (`pypdf`, 0 ms / 0 €).
2. **Stufe 2 (Lokal):** Lokale Tesseract-OCR (`pytesseract`).
3. **Stufe 3 (Cloud-Multimodal):** Gemini Flash Vision API (`google-genai`) für hochauflösende Scans, Handschriften oder unvollständige Textextraktionen.

### Magic Bytes (MIME-Type Inspection)
Überprüfung der ersten Bytes einer Datei im Header zur Feststellung des wahren Dateityps (z. B. `%PDF` für PDF, `\x89PNG` für PNG), um Dateiendungs-Spoofing vor der Verarbeitung serverseitig abzuwehren.

### Presigned URL (S3 Direct-to-Storage Upload)
Eine temporär signierte URL (z. B. mit 1 Stunde Gültigkeit), die vom Backend über `boto3` für autorisierte Administratoren generiert wird.
* **Zweck:** Erlaubt dem Browser das direkte Hochladen von Zertifikatsdateien zu Supabase S3 via `HTTP PUT`, ohne dass große Binärdateien den Django-/Gunicorn-Webservice auf Render passieren müssen.

### Storage-Key (Objektschlüssel)
Der relative Speicherpfad eines Objekts im S3-Storage Bucket (z. B. `certificates/uploads/a1b2c3d4e5f6_meinzertifikat.pdf`).
* **Verwendung:** Wird dem Frontend bei der Presigned-URL-Generierung übermittelt und anschließend bei der Erstellung des `Certificate`-Datensatzes als Dateireferenz an Django übergeben.

---

## 4. RAG- & KI-Begriffe (Portfolio-Copilot)

### Grounding Context (RAG-Datenbasis)
Der strukturierte Text-Kontext aller veröffentlichten Portfolio-Daten (`Project`, `Skill`, `Certificate`, `TimelineEntry`), der dem LLM (Google Gemini 3.8 Flash) als verifizierte Faktenbasis übergeben wird. Verhindert Halluzinationen und bindet Antworten strikt an reale Daten.

### Query-Pruning (Heuristischer Kontext-Schnitt)
Die gezielte Vorfilterung des Grounding-Kontexts anhand semantischer Signalwörter in der Benutzerfrage (z. B. "Projekt", "Zertifikat", "Werdegang"). Spart 40–50 % der Tokens und senkt API-Latenzen signifikant.

### Signal-basierte Cache-Invalidierung ($O(1)$)
Ein reaktives Cache-Verfahren: Bei `post_save` und `post_delete` Signalen auf Portfolio-Modellen wird der Cache-Key des Grounding-Kontexts gelöscht und der Versionsschlüssel `portfolio_rag_context_version_v1` atomar inkrementiert. Sämtliche zuvor gecachten KI-Antworten verfallen instantan ohne teures Traversieren des Cache-Speichers.

### Deep-Linking Source-Badges (Interaktive Zitate)
Strukturierte Quellverweise in KI-Antworten (z. B. `[Projekt: ...]` oder `[Zertifikat: ...]`), die im Frontend als klickbare Badges gerendert werden. Ein Klick führt einen weichen Bildlauf zum Zielelement aus und hebt dieses für 2 Sekunden mit einem pulsierenden Leuchtring optisch hervor.

### 0-Token Injection Drop (Pre-Flight Filter)
Sicherheitsmechanismus in `AIChatView`: Eingehende Fragen werden vor dem LLM-Aufruf via Regex auf typische Prompt-Injection-Muster und Jailbreak-Versuche untersucht. Bei Treffern antwortet das Backend sofort mit einer statischen Schutzmeldung, ohne ein einziges Token bei externen KI-Providern zu verbrauchen.

### KnowledgeChunk (Semantischer Wissens-Chunk)
Persistente Datenbank-Entität (`portfolio_knowledgechunk`), die veröffentlichte Projekte, Zertifikate (inkl. mehrseitiger OCR-Volltexte aus `source_pending`), Skills und Werdegangs-Stationen in semantisch abgegrenzte Textblöcke zerlegt. Jeder Chunk speichert neben Titel, Text und Ziel-Metadaten (`target_id`) ein 768-dimensionales Vektor-Embedding (`text-embedding-004`).

### pgvector & HNSW-Index
PostgreSQL-Erweiterung (`vector`) auf Neon Serverless PostgreSQL zur nativen Speicherung und Distanzberechnung hochdimensionaler Vektoren. Über einen HNSW-Index (`Hierarchical Navigable Small World`, `vector_cosine_ops`) werden Kosinus-Ähnlichkeitssuchen (`CosineDistance`) in $O(\log N)$ ausgeführt.

### Hybrid Retrieval
Zweistufiges Suchverfahren in `portfolio/services/retrieval.py`: Auf PostgreSQL/Neon wird primär per Vektor-Ähnlichkeit (`CosineDistance`) nach den semantisch passendsten `KnowledgeChunk`-Einträgen gesucht; auf SQLite (lokale Entwicklung) oder bei fehlendem API-Kontingent greift automatisch ein deterministischer Keyword-Fallback.
