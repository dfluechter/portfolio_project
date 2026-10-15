# Product Backlog & Optimierungs-Roadmap

Dieses Dokument enthält das agile Product Backlog, User Stories und Akzeptanzkriterien für das Portfolio-Projekt. Es dient als Arbeitsgrundlage für Entwickler (Django-Experte, Frontend-Developer, DevOps, QA-Tester).

---

## Definition of Ready (DoR) & Definition of Done (DoD)

### Definition of Ready (DoR)
Eine Story ist bereit zur Umsetzung ("Ready"), wenn:
1. Die User Story einem klaren Persona-Nutzen folgt (*"Als [Rolle] möchte ich [Ziel], um [Nutzen]"*).
2. Eindeutige, messbare und automatisierbare Akzeptanzkriterien (Checkliste oder GIVEN / WHEN / THEN) definiert sind.
3. Notwendige Architektur- und Sicherheitsimplikationen geklärt sind.
4. Abhängigkeiten zu anderen Komponenten oder Services (z. B. Neon, Supabase, Render) identifiziert wurden.

### Definition of Done (DoD)
Eine Story gilt als abgeschlossen ("Done"), wenn:
1. Alle Akzeptanzkriterien der Story vollständig erfüllt sind.
2. **Backend:** Test-Coverage liegt bei $\ge 95\%$ (`pytest --cov=portfolio --cov-fail-under=95`).
3. **Backend:** Linter (`ruff check .`), Type-Checker (`mypy .`) und Formatter (`ruff format --check .`) laufen fehlerfrei durch.
4. **Frontend:** Linter (`npm run lint`) und Tests (`npm run test:run`) laufen fehlerfrei durch.
5. **Frontend:** Production-Build (`npm run build`) kompiliert ohne Fehler oder Warnungen.
6. **Dokumentation:** Relevante Architekturanpassungen sind in `/docs` oder `README.md` nachgeführt.
7. **CI/CD:** Sämtliche GitHub-Actions-Workflows sind grün.

---

## Status-Übersicht der Epics

| Epic | Thema | Status | Abgeschlossene Stories |
|---|---|---|---|
| **Epic 1** | CI/CD- & Build-Pipeline-Stabilität | Abgeschlossen | US 1.1 |
| **Epic 2** | Frontend-Architektur-Dokumentation | Abgeschlossen | US 2.1 |
| **Epic 3** | Repository-Hygiene & Dateistruktur | Abgeschlossen | US 3.1 |
| **Epic 4** | Deployment & Operations Leitfaden | Abgeschlossen | US 4.1 |
| **Epic 5** | Zertifikats-Review & Dashboard-Skalierung | Abgeschlossen | US 5.1, US 5.2 |
| **Epic 6** | Public Track-Filterung & Cold-Start UX | Abgeschlossen | US 6.1, US 6.2 |
| **Epic 7** | Headless Cleanup & Frontend Bundle Splitting | Abgeschlossen | US 7.1, US 7.2 |
| **Epic 8** | Neon Connection Separation & DDL-Stabilität | Abgeschlossen | US 8.1 |
| **Epic 9** | Gemini Vision Fallback & Magic-Byte Validation | Abgeschlossen | US 9.1, US 9.2 |
| **Epic 10** | Supabase S3 Presigned Uploads & Security | In Bearbeitung | US 10.1 (Done), US 10.2 (Open) |

---

## Epics & User Stories

### Epic 1: CI/CD- & Build-Pipeline-Stabilität (P0 - Kritisch)

#### User Story 1.1: Konsistenz von Render-Build und GitHub Actions Backend-Build
> **Als** DevOps-/Backend-Entwickler  
> **möchte ich**, dass `build.sh` und der CI-Job `backend-build` den Ausführungskontext des `backend/`-Unterverzeichnisses korrekt berücksichtigen,  
> **damit** automatische Deployments auf Render und GitHub Actions System-Checks fehlerfrei durchlaufen.

**Kontext:**  
`render.yaml` definiert `rootDir: backend` und `buildCommand: ./build.sh`. Das Skript `build.sh` liegt jedoch im Wurzelverzeichnis. Ebenso fehlte im GitHub Actions Workflow `.github/workflows/ci.yml` beim Job `backend-build` die Direktive `defaults: run: working-directory: backend`.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Render Build-Hook):**
  - **Given** ein Deployment auf Render mit `rootDir: backend` wird getriggert
  - **When** der Build-Befehl ausgeführt wird
  - **Then** ist `build.sh` entweder im Ordner `backend/` verfügbar oder `render.yaml` referenziert das Skript zuverlässig, sodass kein `file not found`-Fehler auftritt.
- [x] **Szenario 2 (GitHub Actions `backend-build`):**
  - **Given** ein Commit wird auf `main` gepusht oder ein PR geöffnet
  - **When** der Job `backend-build` in `.github/workflows/ci.yml` startet
  - **Then** ist das Working Directory auf `backend` gesetzt und die Befehle `uv sync --frozen --no-dev`, `python manage.py check` sowie `python manage.py collectstatic --noinput` laufen erfolgreich im Python-3.13-Kontext durch.

---

### Epic 2: Frontend-Architektur-Dokumentation (P1 - Hoch)

#### User Story 2.1: Erstellung von `docs/frontend.md`
> **Als** Frontend-Entwickler  
> **möchte ich** eine dedizierte Architekturdokumentation für das React-19-Frontend,  
> **damit** Komponentenstruktur, State Management (TanStack Query + AuthContext), Axios-Interceptors und Tailwind v4 sauber nachvollziehbar sind.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] Die Datei [`docs/frontend.md`](frontend.md) ist angelegt und in [`docs/architecture.md`](architecture.md) verlinkt.
- [x] Folgende Kernbereiche sind dokumentiert:
  - **Komponenten-Architektur:** Modale, Public Views, Dashboard-Views, `ErrorBoundary`.
  - **State-Handling:** Server-State via TanStack Query vs. Client-State via React Context (`AuthContext`).
  - **Auth-Lifecycle & Interceptor:** Request-Bearer-Injektion und 401-Refresh-Loop (`auth:unauthorized`).
  - **Styling:** Tailwind CSS v4 Konfiguration mit `@tailwindcss/vite`.
  - **Testing-Strategie:** Vitest + React Testing Library.

---

### Epic 3: Repository-Hygiene & Dateistruktur (P2 - Mittel)

#### User Story 3.1: Konsolidierung verwaister Root-Artefakte
> **Als** Entwickler und Maintainer  
> **möchte ich**, dass verwaiste Entwicklungs- und Asset-Dateien aus dem Root-Verzeichnis aufgeräumt werden,  
> **damit** das Projekt übersichtlich und frei von versehentlich committeten Verzeichnissen bleibt.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] Der versehentlich angelegte Ordner `#` im Root-Verzeichnis ist entfernt.
- [x] Das Bild `Architektur_und_Datenstruktur_Portfolio_Backend.png` und `portfolio_architecture.html` sind in `docs/assets/` überführt und dort in der Dokumentation eingebunden.
- [x] Die `.gitignore` schließt temporäre Ordner wie `scratch/` und Test-Skripte wie `test_s3.py` aus oder diese werden bereinigt.

---

### Epic 4: Deployment & Operations Leitfaden (P2 - Mittel)

#### User Story 4.1: Erstellung von `docs/deployment.md`
> **Als** Maintainer  
> **möchte ich** eine Schritt-für-Schritt-Anleitung für das Deployment auf Render und die Konfiguration von Neon Serverless Branching in GitHub Actions,  
> **damit** Releases und Incident-Management reproduzierbar und dokumentiert sind.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] Die Datei [`docs/deployment.md`](deployment.md) beschreibt:
  - Das automatische Neon Database Branching (`neondatabase/create-branch-action@v5`) in der CI.
  - Die Render Web Service Konfiguration (`render.yaml`).
  - Benötigte Secrets (`NEON_PROJECT_ID`, `NEON_API_KEY`, `RENDER_DEPLOY_HOOK_URL`, `DATABASE_URL`, `SECRET_KEY`).
  - Rollback- und Troubleshooting-Maßnahmen.

---

### Epic 5: Zertifikats-Review & Dashboard-Skalierung (P1 - Hoch)

#### User Story 5.1: Server-Side Pagination & Review-Filter für Certificates API
> **Als** Administrator  
> **möchte ich**, dass der Endpunkt `/api/certificates/` paginiert ist und Filter nach `is_published` sowie unvollständigen Daten unterstützt,  
> **damit** das Dashboard auch bei hunderten Zertifikaten reaktionsschnell bleibt und ich unfertige Einträge gezielt prüfen kann.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] `/api/certificates/` unterstützt `page` und `page_size=20` (DRF `PageNumberPagination`).
- [x] Filter-Parameter:
  - `is_published=true|false`
  - `incomplete=true` (filtert auf fehlendes `issued_date` oder generierte/unvollständige Titel)
  - `track` und `provider` (optional kombinierbar)
  - `search` über Titel, Provider und Credential-ID.
- [x] Unauthentifizierte Anfragen erhalten weiterhin nur veröffentlichte Zertifikate (`is_published=True`).
- [x] Abwärtskompatibilität für Full-List-Abrufe via `?no_page=true` oder `?all=true`.

#### User Story 5.2: Review-Drawer & On-Demand Metadata Extraction im Frontend
> **Als** Administrator  
> **möchte ich** im Dashboard ein Review-Modal bzw. einen Detail-Drawer mit Dokumentenvorschau und manueller OCR-Analyse,  
> **damit** ich Zertifikate visuell kontrollieren, Metadaten nachschärfen und gezielt veröffentlichen kann.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] `CertificateManager` bindet Server-Pagination mit Seitennavigation und Filterleiste ein.
- [x] Klick auf ein Zertifikat öffnet ein Review-Modal mit:
  - Dokumenten-Vorschau (PDF/Bild direkt aus S3).
  - Editierbare Felder für Titel, Provider, Ausstellungsdatum (`issued_date`) und Tracks.
  - Button „Metadaten per OCR analysieren“ (zweistufig: PDF-Text-Extraktion -> Gemini Vision Fallback).
  - Aktion „Speichern & Veröffentlichen“ (`is_published=true`).

---

### Epic 6: Public Track-Filterung & Cold-Start UX (P1 - Hoch)

#### User Story 6.1: Interaktive Many-to-Many Track-Filterchips auf der Startseite
> **Als** Besucher des Portfolios  
> **möchte ich** auf der Landingpage Zertifikate interaktiv über klickbare Track-Chips filtern können,  
> **damit** ich gezielt Qualifikationen in meinen Wunschbereichen (z. B. "Cloud & DevOps", "Backend") einsehen kann.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] `CertificatesSection.tsx` rendert Track-Chips oberhalb der Zertifikatskarten mit dynamischer Anzahl verknüpfter Zertifikate.
- [x] Besucher können mehrere Tracks gleichzeitig auswählen (OR-Filterung).
- [x] Die Textsuche und die Track-Auswahl sind reaktiv kombiniert.
- [x] Reset-Button leert die Track-Auswahl bei Bedarf.

#### User Story 6.2: Status-Ping & Cold-Start Banner für Render Free-Tier
> **Als** Besucher oder Administrator  
> **möchte ich** eine transparente Lade-Rückmeldung sehen, wenn der Render-Backend-Dienst nach Inaktivität aufgeweckt wird,  
> **damit** ich verstehe, dass der Server hochfährt und kein technischer Defekt vorliegt.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] Bei initialem API-Request mit einer Antwortzeit > 2000ms blendet das Frontend einen dezenten Banner ein: *"Server wacht auf (Render Free-Tier)..."* mit animiertem Ladebalken.
- [x] Sobald die API erfolgreich antwortet, blendet sich der Banner sanft aus.
- [x] Bei dauerhaftem Timeout (> 30s) erscheint ein klarer Retry-Button.

---

### Epic 7: Headless Cleanup & Frontend Bundle Splitting (P1 - Hoch)

#### User Story 7.1: Entfernung veralteter Django HTML-Templates
> **Als** Backend-Entwickler  
> **möchte ich**, dass verwaiste Django-Templates (`login.html`, `dashboard.html`) entfernt und die Routen auf reine API-Endpunkte bereinigt werden,  
> **damit** die Architektur sauber als Headless-Backend definiert ist.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] `login_view` und `dashboard_view` sind aus `backend/portfolio/views.py` und `backend/core/urls.py` entfernt.
- [x] Die Dateien `login.html` und `dashboard.html` sind gelöscht.
- [x] Root-Route (`/`) verweist auf Swagger-UI oder liefert JSON-Status.

#### User Story 7.2: Code-Splitting & Lazy Loading für Admin-Dashboard
> **Als** Frontend-Entwickler  
> **möchte ich**, dass das Admin-Dashboard dynamisch nachgeladen wird (`React.lazy`),  
> **damit** Besucher der öffentlichen Startseite nicht das schwere Dashboard-Bundle laden müssen und der Vite-Chunk-Size-Warning behoben ist.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] `DashboardPage.tsx` und `LoginPage.tsx` werden via `React.lazy` und `Suspense` dynamisch importiert.
- [x] Der Haupt-Bundle `dist/assets/index-*.js` unterschreitet die 500-kB-Schwelle beim Vite-Build.
- [x] `npm run build` kompiliert ohne Chunk-Größen-Warnung.

---

### Epic 8: Neon PostgreSQL Connection Separation & DDL-Stabilität (P1 - Hoch)

#### User Story 8.1: Trennung von Pooled- und Direct-Connection für Neon
> **Als** DevOps-Ingenieur  
> **möchte ich**, dass `DIRECT_DATABASE_URL` für Migrationen und `DATABASE_URL` für den Gunicorn-Webbetrieb genutzt wird,  
> **damit** PgBouncer-Verbindungsfehler und Transaktions-Locks bei Schema-Updates ausgeschlossen sind.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] `core/settings.py` prüft bei `migrate`-Aufrufen, ob `DIRECT_DATABASE_URL` vorhanden ist, und verwendet diese priorisiert.
- [x] `backend/build.sh` nutzt `DIRECT_DATABASE_URL` für `python manage.py migrate`.
- [x] Dokumentation in `docs/deployment.md` ist aktualisiert.

---

### Epic 9: Gemini Vision Fallback & Magic-Byte Validation (P2 - Mittel)

#### User Story 9.1: Multimodale Gemini Vision OCR-Anbindung
> **Als** Administrator  
> **möchte ich**, dass gescannte oder bildbasierte Zertifikate ohne Textlayer on-demand via Gemini Vision analysiert werden können,  
> **damit** auch schwierige Handschriften und komplexe Layouts präzise erkannt werden.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] `portfolio/services/extractor.py` bindet Gemini Flash Vision als Stufe 3 ein.
- [x] Graceful Degradation: Ohne `GEMINI_API_KEY` fällt das System transparent auf Tesseract/Pypdf zurück.
- [x] Integrationstest mit gemocktem Gemini-API-Response.

#### User Story 9.2: Serverseitige Magic-Byte Dateiprüfung
> **Als** Security-Verantwortlicher  
> **möchte ich**, dass Datei-Uploads auf echte Header-Magic-Bytes geprüft werden,  
> **damit** manipulierte Dateien mit gefälschten Dateiendungen abgewiesen werden.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] `validate_file_extension` in `portfolio/models.py` prüft Header-Bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`).
- [x] Spoofing-Versuche werfen `ValidationError`.
- [x] Pytest-Tests verifizieren die Abweisung manipulierter Dateien.

---

### Epic 10: Supabase S3 Presigned Uploads & Security (P1 - Hoch)

#### User Story 10.1: Presigned S3-Uploads für Direct-to-Storage
> **Als** Cloud-Architekt  
> **möchte ich**, dass Uploads direkt vom Browser zu Supabase S3 über presigned URLs erfolgen,  
> **damit** der Render-Container entlastet wird.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] Endpunkt `POST /api/certificates/presigned_upload/` liefert signierte S3-Upload-URL.
- [x] Frontend lädt Datei direkt nach Supabase hoch und meldet den Speicher-Schlüssel an Django zurück.

#### User Story 10.2: Serverseitige Härtung und Integritätsprüfung für Direct-to-Storage Uploads
> **Als** Administrator und Security-Verantwortlicher  
> **möchte ich**, dass beim Registrieren eines per Direct-Upload gespeicherten Zertifikats via `storage_key` die Datei im S3-Storage auf Existenz, Magic Bytes und Maximalgröße geprüft sowie ihr Hash serverseitig verifiziert wird,  
> **damit** Clients weder fehlerhafte/leere Storage-Keys noch manipulierte Hashes oder unzulässige Dateiformate in der Datenbank anlegen können.

**Kontext:**  
In US 10.1 wurde der Presigned Upload umgesetzt. Aktuell vertraut das Backend bei `POST /api/certificates/` mit `storage_key` darauf, dass die Datei existiert und der vom Client übermittelte `sha256_hash` korrekt ist. Es erfolgt noch keine serverseitige Header-Bytes-Prüfung auf dem S3-Objekt.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] **Szenario 1 (S3-Objekt-Existenzprüfung & Größenvalidierung):**
  - **Given** ein authentifizierter Administrator sendet `POST /api/certificates/` mit einem `storage_key`
  - **When** das Backend die Metadaten via `head_object` aus Supabase S3 abfragt
  - **Then** wird geprüft, ob das Objekt tatsächlich existiert (`400 Bad Request`, falls Objekt nicht auffindbar)
  - **And** die Dateigröße (`ContentLength`) darf maximal 10 MB betragen (`400 Bad Request` bei Überschreitung).
- [ ] **Szenario 2 (Magic-Byte-Validierung via S3 Range Request):**
  - **Given** das S3-Objekt existiert im Storage-Bucket
  - **When** das Backend die ersten 2048 Bytes des Objekts per Range-Request (`Range='bytes=0-2047'`) liest
  - **Then** werden die Magic Bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`) gegen die deklarierte Dateiendung validiert; bei Mismatch wird der Request mit `400 Bad Request` abgewiesen.
- [ ] **Szenario 3 (Serverseitige SHA-256 Integritätsprüfung):**
  - **Given** ein Client übermittelt einen `sha256_hash` zusammen mit dem `storage_key`
  - **When** das Zertifikat registriert wird
  - **Then** berechnet das Backend den tatsächlichen SHA-256-Hash des S3-Objekts (oder verifiziert ihn bei Übermittlung strikt); bei Diskrepanzen wird der vom Server berechnete Hash gespeichert bzw. der Request abgewiesen.
- [ ] **Szenario 4 (Fallback bei deaktiviertem S3-Storage):**
  - **Given** die Umgebungsvariable `USE_SUPABASE_S3` ist auf `False` gesetzt
  - **When** ein Request mit `storage_key` eingeht
  - **Then** antwortet die API mit Statuscode `501 Not Implemented` mit der Meldung, dass Direct-to-Storage-Uploads eine aktive S3-Konfiguration erfordern.
- [ ] **Szenario 5 (Automatisierte Pytest-Testabdeckung):**
  - **Given** die neuen Validierungsregeln im Backend
  - **When** die Testsuite ausgeführt wird
  - **Then** sind alle Szenarien (Existenzfehler, Magic-Byte-Mismatch, Größenüberschreitung, Hash-Mismatch) mit Mocks für `boto3` abgedeckt und die Gesamtabdeckung bleibt $\ge 95\%$.
