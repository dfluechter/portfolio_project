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
* **Beziehung:** n:m zu `Certificate` und `Project`.
* **Zweck:** Ermöglicht gefilterte Ansichten und themenspezifische Portfoliodarstellung im Frontend.

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
