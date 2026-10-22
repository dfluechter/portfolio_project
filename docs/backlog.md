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
| **Epic 10** | Supabase S3 Presigned Uploads & Security | Abgeschlossen | US 10.1, US 10.2 |
| **Epic 11** | RAG Portfolio-Copilot, pgvector Hybrid Retrieval, Guardrails & UI-Skills Polish | Abgeschlossen | US 11.1, US 11.2, US 11.3, US 11.4, US 11.5 |
| **Epic 12** | Track-Pflicht für Zertifikate & FontAwesome Icon Integration | Abgeschlossen | US 12.1, US 12.2, US 12.3, US 12.4 |
| **Epic 13** | Robuste OCR-Extraktion, Dokumentenvorschau & Commitlint-Governance | Abgeschlossen | US 13.1, US 13.2, US 13.3, US 13.4 |
| **Epic 14** | Inbox-Automatisierung, Duplikatsprüfung & Batch-Processing | Bereit zur Umsetzung (Ready) | US 14.1, US 14.2, US 14.3 |
| **Epic 15** | Public Performance, HTTP-Caching & Core Web Vitals | Bereit zur Umsetzung (Ready) | US 15.1, US 15.2, US 15.3 |

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
- [x] **Szenario 1 (S3-Objekt-Existenzprüfung & Größenvalidierung):**
  - **Given** ein authentifizierter Administrator sendet `POST /api/certificates/` mit einem `storage_key`
  - **When** das Backend die Metadaten via `head_object` aus Supabase S3 abfragt
  - **Then** wird geprüft, ob das Objekt tatsächlich existiert (`400 Bad Request`, falls Objekt nicht auffindbar)
  - **And** die Dateigröße (`ContentLength`) darf maximal 10 MB betragen (`400 Bad Request` bei Überschreitung).
- [x] **Szenario 2 (Magic-Byte-Validierung via S3 Range Request):**
  - **Given** das S3-Objekt existiert im Storage-Bucket
  - **When** das Backend die ersten 2048 Bytes des Objekts per Range-Request (`Range='bytes=0-2047'`) liest
  - **Then** werden die Magic Bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`) gegen die deklarierte Dateiendung validiert; bei Mismatch wird der Request mit `400 Bad Request` abgewiesen.
- [x] **Szenario 3 (Serverseitige SHA-256 Integritätsprüfung):**
  - **Given** ein Client übermittelt einen `sha256_hash` zusammen mit dem `storage_key`
  - **When** das Zertifikat registriert wird
  - **Then** berechnet das Backend den tatsächlichen SHA-256-Hash des S3-Objekts (oder verifiziert ihn bei Übermittlung strikt); bei Diskrepanzen wird der vom Server berechnete Hash gespeichert bzw. der Request abgewiesen.
- [x] **Szenario 4 (Fallback bei deaktiviertem S3-Storage):**
  - **Given** die Umgebungsvariable `USE_SUPABASE_S3` ist auf `False` gesetzt
  - **When** ein Request mit `storage_key` eingeht
  - **Then** antwortet die API mit Statuscode `501 Not Implemented` mit der Meldung, dass Direct-to-Storage-Uploads eine aktive S3-Konfiguration erfordern.
- [x] **Szenario 5 (Automatisierte Pytest-Testabdeckung):**
  - **Given** die neuen Validierungsregeln im Backend
  - **When** die Testsuite ausgeführt wird
  - **Then** sind alle Szenarien (Existenzfehler, Magic-Byte-Mismatch, Größenüberschreitung, Hash-Mismatch) mit Mocks für `boto3` abgedeckt und die Gesamtabdeckung bleibt $\ge 95\%$.

---

### Epic 11: RAG Portfolio-Copilot, Guardrails & UI-Skills Polish (P1 - Hoch)

#### User Story 11.1: RAG Grounding Context & Query-Pruning mit Gemini 3.8 Flash
> **Als** Portfolio-Besucher  
> **möchte ich** per KI-Chat Fragen zu Projekten, Fähigkeiten und Werdegang stellen,  
> **damit** ich schnell fundierte Informationen erhalte, die strikt auf echten Portfolio-Daten basieren.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Faktisches Grounding):**
  - **Given** der Endpunkt `POST /api/ai/chat/` empfängt eine Frage
  - **When** der Grounding Context aus der Datenbank (`is_published=True`) geladen wird
  - **Then** beantwortet Google Gemini 3.8 Flash die Frage wahrheitsgemäß ohne Halluzinationen.
- [x] **Szenario 2 (Heuristisches Query-Pruning):**
  - **Given** eine domänenspezifische Frage (z. B. "Welche Python-Projekte hast du?")
  - **When** `build_grounding_context(query)` ausgeführt wird
  - **Then** werden irrelevante Sektionen (z. B. Zertifikate bei reinen Projektfragen) herausgefiltert und mindestens 40-50 % der Kontext-Tokens eingespart.

#### User Story 11.2: Automatische Cache-Invalidierung via Django Signals ($O(1)$)
> **Als** Administrator und Systemarchitekt  
> **möchte ich**, dass Änderungen an Projekten, Skills, Zertifikaten oder dem Werdegang den KI-Kontext sofort invalidieren,  
> **damit** Besucher niemals veraltete Antworten erhalten, während Lesezugriffe maximal performant aus dem Cache bedient werden.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Signals-Anbindung):**
  - **Given** ein Model `Project`, `Certificate`, `Skill` oder `TimelineEntry` wird gespeichert oder gelöscht (`post_save`, `post_delete`)
  - **When** der Signal-Handler in `portfolio/signals.py` feuert
  - **Then** wird der Cache-Key `portfolio_rag_grounding_context` gelöscht und der Versionsschlüssel `portfolio_rag_context_version_v1` atomar inkrementiert.
- [x] **Szenario 2 (Versioniertes Response-Caching):**
  - **Given** eine Benutzeranfrage wird beantwortet
  - **When** die Antwort für 1 Stunde im Cache gespeichert wird
  - **Then** ist der Cache-Key an die aktuelle Kontext-Version gekoppelt (`portfolio_ai_resp_v{version}_{hash}`), sodass alte Cache-Einträge bei Datenänderungen automatisch in $O(1)$ verfallen.

#### User Story 11.3: Sicherheits-Guardrails (Pre-Flight Filterung & 0-Token Drop)
> **Als** Security-Verantwortlicher  
> **möchte ich**, dass der Chat-Endpunkt vor Prompt Injections, Jailbreaks und DoS-Angriffen geschützt ist,  
> **damit** keine sensiblen Systemprompts geleakt werden und keine unnötigen LLM-Tokenkosten anfallen.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Längenbeschränkung):**
  - **Given** ein Request mit einer Nachricht von mehr als 500 Zeichen
  - **When** die Validierung in `AIChatView` greift
  - **Then** wird der Request sofort mit `400 Bad Request` abgewiesen.
- [x] **Szenario 2 (0-Token Injection Drop):**
  - **Given** ein Prompt-Injection- oder System-Prompt-Extraction-Versuch (z. B. "Ignore all previous instructions")
  - **When** der Regex-Pre-Flight-Filter anschlägt
  - **Then** wird der Request nicht an Gemini weitergeleitet, sondern direkt mit einer defensiven Antwort beantwortet (0 LLM-Tokens verbraucht).

#### User Story 11.4: Interaktive Deep-Linking Quell-Badges & UI-Skills Polish
> **Als** Portfolio-Besucher  
> **möchte ich**, dass Quellen in KI-Antworten als klickbare Badges angezeigt werden und mich direkt zur relevanten Sektion scrollen,  
> **damit** ich Aussagen der KI mit einem Klick visuell verifizieren kann.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Deep-Linking Badges):**
  - **Given** eine KI-Antwort enthält Quell-Tags wie `[Projekt: ...]` oder `[Zertifikat: ...]`
  - **When** `PortfolioChatWidget` die Nachricht rendert
  - **Then** werden interaktive Badges dargestellt; ein Klick scrollt sanft zum Element `#project-<id>` bzw. `#cert-<id>`.
- [x] **Szenario 2 (Optisches Glow-Highlight):**
  - **Given** ein Benutzer klickt auf ein Source-Badge
  - **When** das Ziel-Element erreicht wird
  - **Then** erhält die Zielkarte einen 2-Sekunden-Glow-Ring (`ring-2 ring-blue-500 shadow-lg`).
- [x] **Szenario 3 (UI-Skills Design Standards):**
  - **Given** das Chat-Widget ist auf der Startseite eingebunden
  - **When** der Benutzer interagiert
  - **Then** bietet die Oberfläche Glassmorphism (`backdrop-blur-2xl`), Radar-Ping am Trigger-Button, Bouncing Wave Thinking State und Copy-to-Clipboard mit Morphing Checkmark.

#### User Story 11.5: Native pgvector Vektordatenbank & Hybrid Retrieval (Option A)
> **Als** Systemarchitekt und Portfolio-Besucher  
> **möchte ich**, dass Portfolio-Inhalte und OCR-Zertifikatstexte als granulare Wissens-Chunks (`KnowledgeChunk`) mit 768-dimensionalen Embeddings (`text-embedding-004`) in Neon PostgreSQL (`pgvector`) indiziert und per Hybrid Retrieval durchsucht werden,  
> **damit** auch spezifische Detailfragen über große Textmengen hinweg mit höchster semantischer Präzision beantwortet werden.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Modell & HNSW-Migration):**
  - **Given** die Migration `0014_knowledgechunk_pgvector`
  - **When** `python manage.py migrate` auf PostgreSQL ausgeführt wird
  - **Then** wird die Extension `vector` aktiviert und die Tabelle `portfolio_knowledgechunk` mit einem HNSW-Index (`vector_cosine_ops`) angelegt (auf SQLite erfolgt ein transparenter Fallback).
- [x] **Szenario 2 (Chunking, Signal-Sync & CLI):**
  - **Given** veröffentlichte `Project`-, `Certificate`-, `Skill`- und `TimelineEntry`-Instanzen
  - **When** Daten gespeichert/gelöscht werden oder `python manage.py index_rag_chunks` ausgeführt wird
  - **Then** werden die Chunks automatisch synchronisiert und im Render-Build (`build.sh`) initial indiziert.
- [x] **Szenario 3 (Hybrid Retrieval & Test-Coverage $\ge 95\%$):**
  - **Given** eine Suchanfrage im KI-Assistenten
  - **When** `retrieve_relevant_chunks()` aufgerufen wird
  - **Then** nutzt das System auf PostgreSQL `CosineDistance` und fällt bei fehlendem Embedding oder auf SQLite nahtlos auf Keyword-Retrieval zurück, abgesichert durch $\ge 95\%$ Backend-Testabdeckung.

---

### Epic 12: Track-Pflicht für Zertifikate & FontAwesome Icon Integration (P1 - Hoch)

#### User Story 12.1: Pflichtzuweisung von mindestens einem Track für veröffentlichte Zertifikate
> **Als** Administrator und Kurator  
> **möchte ich**, dass ein Zertifikat nur dann veröffentlicht werden kann (`is_published=True`), wenn ihm mindestens ein Track zugewiesen ist,  
> **damit** alle öffentlich sichtbaren Zertifikate inhaltlich kategorisiert sind und die Track-Filterung auf der Startseite lückenlos funktioniert.

**Kontext:**  
Bisher war das Feld `tracks` in `Certificate` rein optional (`blank=True`). Unveröffentlichte Entwürfe (z. B. nach initialem Datei-Import oder Inbox-Kandidaten) dürfen weiterhin ohne Tracks existieren. Vor oder bei der Veröffentlichung (`POST /api/certificates/<id>/publish/` oder `PATCH` mit `is_published=true`) muss jedoch zwingend mindestens ein Track zugeordnet sein.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Dedizierte Publish-Aktion ohne Tracks schlägt fehl):**
  - **Given** ein bestehendes Zertifikat hat 0 Tracks (`cert.tracks.count() == 0`)
  - **When** ein Administrator `POST /api/certificates/<id>/publish/` aufruft
  - **Then** antwortet die API mit Statuscode `400 Bad Request` und der Fehlermeldung: `{"detail": "Ein Zertifikat kann nur veröffentlicht werden, wenn mindestens ein Track zugewiesen ist."}`
  - **And** `cert.is_published` bleibt unverändert auf `False`.
- [x] **Szenario 2 (Dedizierte Publish-Aktion mit Tracks ist erfolgreich):**
  - **Given** ein bestehendes Zertifikat hat mindestens 1 Track (`cert.tracks.count() >= 1`)
  - **When** ein Administrator `POST /api/certificates/<id>/publish/` aufruft
  - **Then** antwortet die API mit Statuscode `200 OK`
  - **And** `cert.is_published` wird auf `True` gesetzt.
- [x] **Szenario 3 (Update mit `is_published=true` ohne Tracks schlägt fehl):**
  - **Given** ein Zertifikat hat keine Tracks zugewiesen
  - **When** ein Administrator `PATCH /api/certificates/<id>/` mit `{"is_published": true}` oder `{"tracks": [], "is_published": true}` sendet
  - **Then** antwortet die API mit `400 Bad Request` und verweigert die Veröffentlichung.
- [x] **Szenario 4 (Unveröffentlichtes Zertifikat ohne Tracks bleibt zulässig):**
  - **Given** ein Administrator speichert oder bearbeitet ein Zertifikat mit `is_published=false`
  - **When** keine Tracks angegeben werden (`tracks: []`)
  - **Then** wird der Datensatz erfolgreich gespeichert (Status `200 OK` / `201 Created`).
- [x] **Szenario 5 (Bestandsschutz für bereits veröffentlichte Zertifikate):**
  - **Given** ein in der Vergangenheit bereits veröffentlichtes Zertifikat (`is_published=true`) hat keine Tracks
  - **When** dieses Zertifikat aktualisiert wird (z. B. Titelkorrektur) oder der Publish-Endpunkt idempotent aufgerufen wird
  - **Then** wird der Request nicht blockiert, sondern erfolgreich ausgeführt (`200 OK`).

---

#### User Story 12.2: Pytest Unit-Test-Suite für die Track-Zertifikats-Validierung
> **Als** QA-Tester  
> **möchte ich** eine dedizierte Pytest-Test-Suite für alle Veröffentlichungs- und Track-Validierungsfälle,  
> **damit** die Integritätsregel regressionssicher abgedeckt ist und die Testabdeckung im Backend $\ge 95\%$ bleibt.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] Eine neue Testdatei [`backend/portfolio/tests/test_certificate_track_validation.py`](file:///D:/dev/portfolio_project/backend/portfolio/tests/test_certificate_track_validation.py) ist angelegt.
- [x] Folgende Testszenarien sind implementiert und grün:
  - `test_publish_without_tracks_returns_400`: `POST /api/certificates/{id}/publish/` ohne Tracks liefert `400 Bad Request`.
  - `test_publish_with_tracks_returns_200`: `POST /api/certificates/{id}/publish/` mit Track liefert `200 OK` und setzt `is_published=True`.
  - `test_patch_is_published_true_without_tracks_returns_400`: `PATCH` mit `is_published=True` ohne Tracks liefert `400`.
  - `test_patch_tracks_empty_on_published_certificate_returns_400`: Entfernen aller Tracks eines bereits veröffentlichten Zertifikats wird abgewiesen.
  - `test_draft_certificate_without_tracks_allowed`: Erstellen und Bearbeiten unveröffentlichter Zertifikate ohne Tracks ist erlaubt.
  - `test_model_clean_validation`: `Certificate.clean()` validiert `is_published` gegen `tracks`.
- [x] Alle Tests laufen im isolierten Pytest-Kontext fehlerfrei durch (`uv run pytest portfolio/tests/test_certificate_track_validation.py`).

---

#### User Story 12.3: FontAwesome Solid Icon Download-Service & Track-Model-Erweiterung
> **Als** Entwickler und Maintainer  
> **möchte ich**, dass Tracks ein Icon-Attribut besitzen und FontAwesome Solid Icons bei erstmaliger Verwendung automatisch von `fontawesome.com` heruntergeladen und lokal unter `/static/img/icons/` gecacht werden,  
> **damit** keine externen CDN-Laufzeitabhängigkeiten bestehen und Icons schnell und zuverlässig ausgeliefert werden.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Model & Migration):**
  - **Given** das `Track`-Model
  - **When** das Feld `icon = models.CharField(max_length=64, blank=True, default="", verbose_name="FontAwesome Solid Icon Name")` hinzugefügt wird
  - **Then** wird eine saubere Django-Migration erzeugt und angewendet.
- [x] **Szenario 2 (On-Demand Icon-Download Service):**
  - **Given** ein Track mit einem Icon-Namen (z. B. `code`, `database`, `cloud`, `shield-halved`, `brain`, `server`)
  - **When** der Service `portfolio.services.icon_service.ensure_track_icon(icon_name)` aufgerufen wird
  - **Then** prüft er, ob die Datei `/static/img/icons/{icon_name}.svg` bereits existiert
  - **And** falls nicht, lädt er das SVG von der offiziellen FontAwesome Solid Quelle herunter, speichert es atomar im Zielordner `/static/img/icons/` und gibt die relative URL `/static/img/icons/{icon_name}.svg` zurück.
- [x] **Szenario 3 (Sicherheit & Sanitization):**
  - **Given** ein eingehender Icon-Name
  - **When** er Sonderzeichen oder Pfad-Traversierungen enthält (z. B. `../`, `/`, `\`)
  - **Then** wird der Name strikt mit `re.match(r'^[a-z0-9\-]+$', icon_name)` validiert und ungültige Eingaben abgewiesen.
- [x] **Szenario 4 (API-Exposition):**
  - **Given** `GET /api/tracks/`
  - **When** Tracks serialisiert werden
  - **Then** liefert der `TrackSerializer` die Felder `icon` und `icon_url`.

---

#### User Story 12.4: Visualisierung der Track-Icons auf Portfolio- und Dashboard-Page
> **Als** Besucher und Administrator  
> **möchte ich** Tracks sowohl auf der öffentlichen Startseite als auch im Admin-Dashboard mit ihren Icons visualisiert sehen,  
> **damit** die thematische Zuordnung visuell ansprechend, sofort erfassbar und konsistent ist.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Portfolio-Startseite `CertificatesSection.tsx`):**
  - **Given** die Track-Filter-Chips auf der Landingpage
  - **When** die Komponente rendert
  - **Then** zeigt jeder Chip das entsprechende SVG-Icon links neben dem Track-Namen an (z. B. `<img src={track.icon_url} className="w-4 h-4 mr-1.5" />` oder Fallback-Icon).
- [x] **Szenario 2 (Dashboard `CertificateManager.tsx` & `CertificateEditModal.tsx`):**
  - **Given** die Zertifikats-Übersicht und der Review-Drawer im Dashboard
  - **When** die Tracks eines Zertifikats angezeigt oder ausgewählt werden
  - **Then** sind die Track-Badges und Dropdown-Einträge mit ihren Icons gerendert.
- [x] **Szenario 3 (Frontend Validierungs-Feedback):**
  - **Given** der Administrator klickt im Review-Drawer auf „Veröffentlichen“
  - **When** das Zertifikat keine Tracks ausgewählt hat
  - **Then** wird der Button deaktiviert bzw. ein klarer Validierungshinweis angezeigt: *„Mindestens ein Track erforderlich für Veröffentlichung“*.

---

### Epic 13: Robuste OCR-Extraktion, Dokumentenvorschau & Commitlint-Governance (P1 - Hoch)

#### User Story 13.1: SDK-Migration auf Gemini 3.8 Flash & Mehrzeiliges Plattform-Parsing
> **Als** Administrator und Backend-Entwickler  
> **möchte ich**, dass der Extraktions-Service das moderne `google-genai` SDK mit dem Modell `gemini-3.8-flash` nutzt und mehrzeilige Plattform-Zertifikate (wie Udemy und Coursera) semantisch korrekt extrahiert,  
> **damit** Metadaten-Extraktionen auch für Neunutzer fehlerfrei funktionieren und Kurstitel nicht mehr durch Floskeln oder temporäre Dateinamen verfälscht werden.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Gemini 3.8 Flash & google-genai SDK Migration):**
  - **Given** ein PDF oder Bildzertifikat ohne ausreichenden Textlayer
  - **When** der Fallback auf LLM-Vision ausgelöst wird
  - **Then** verwendet der Extraktor das offizielle `google-genai` SDK (`from google import genai`) mit dem Modell `gemini-3.8-flash`.
  - **And** Anfragen an veraltete Modelle (z. B. `gemini-2.5-flash`), die für Neunutzer HTTP-404-Fehler erzeugen, sind vollständig abgelöst.
- [x] **Szenario 2 (Mehrzeiliges Plattform-Parsing für Udemy & Coursera):**
  - **Given** ein Zertifikatstext mit mehrzeiligem Header wie `Zertifikat über die erfolgreiche Teilnahme\n<Kursname>\nLehrkraft...`
  - **When** die Regex- und Heuristik-Pipeline durchlaufen wird
  - **Then** wird der tatsächliche Kursname isoliert und Floskeln sowie Dozentennamen werden strikt abgeschnitten.
- [x] **Szenario 3 (Namens- & Floskelfilter):**
  - **Given** ein Zertifikat mit dem Namen des Inhabers (z. B. *„Dominik Flüchter“*) oder Standardphrasen (*„Certificate of Completion“*)
  - **When** der Titel bestimmt wird
  - **Then** wird der Inhabername niemals als Kurstitel übernommen.
- [x] **Szenario 4 (Sperre für temporäre Dateinamen & Originalnamen-Durchreichung):**
  - **Given** ein On-Demand-Extraktionsaufruf über ein temporäres Django-File (z. B. `tmplz6lmxh3.pdf`)
  - **When** der Dateiname als Fallback herangezogen werden müsste
  - **Then** werden Muster wie `^tmp[a-z0-9_]+$` geblockt und stattdessen der echte `original_filename` aus dem Model übergeben.
- [x] **Szenario 5 (Robuste Schwellenwerte & Limits):**
  - **Given** ein eingehendes Dokument
  - **When** der Textlayer analysiert wird
  - **Then** gilt dieser erst ab $\ge 60$ Zeichen und $\ge 8$ Wörtern als valide (vorher $\ge 20$ / $\ge 3$), um unvollständige OCR-Treffer zu vermeiden.
  - **And** Payloads sind auf 10 MB begrenzt und `max_output_tokens` auf 2048 konfiguriert.

---

#### User Story 13.2: „Show File“-Button & Live-Dokumentenvorschau in Django-Admin & Dashboard
> **Als** Administrator  
> **möchte ich** im Django-Admin und im Admin-Dashboard für ausstehende Zertifikate einen direkten „Show File“-Button sowie eine interaktive Inline-Dokumentenvorschau (PDF/Bild),  
> **damit** ich Zertifikatsdateien vor der Freigabe visuell kontrollieren kann, ohne den Tab zu verlassen oder die Datei separat herunterladen zu müssen.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (Django-Admin File View):**
  - **Given** ein `PendingCertificate`-Datensatz im Django-Admin
  - **When** ein Administrator die Detailansicht aufruft
  - **Then** existiert eine URL-Action `show_file_view`, die die Originaldatei als inline `FileResponse` mit korrektem MIME-Type (`application/pdf`, `image/png`, `image/jpeg`) streamt.
- [x] **Szenario 2 (Aktions-Button im Admin `change_form.html`):**
  - **Given** die Bearbeitungsseite eines ausstehenden Zertifikats im Admin
  - **When** die Seite geladen wird
  - **Then** wird in den `object-tools` oben rechts ein klickbarer Button `📄 Show File` angezeigt, der die Datei in einem neuen Browser-Tab öffnet (`target="_blank"`).
- [x] **Szenario 3 (Inline-Vorschau im Admin):**
  - **Given** ein ausstehendes Zertifikat im Django-Admin
  - **When** die Change-Form gerendert wird
  - **Then** zeigt das Readonly-Feld `show_file_button` eine interaktive Live-Vorschau an (PDF als `<iframe>` mit 550px Höhe, Bilder als skaliertes `<img>`).
- [x] **Szenario 4 (REST-API Dateiendpunkt):**
  - **Given** ein autorisierter Staff-User
  - **When** `GET /api/pending-certificates/{id}/file/` aufgerufen wird
  - **Then** liefert die API den Dateistrom mit passendem Content-Type und `Content-Disposition: inline`.
- [x] **Szenario 5 (Dashboard React UI):**
  - **Given** die Inbox-Verwaltung in `PendingCertificateManager.tsx`
  - **When** die Kartenliste oder das Review-Modal gerendert wird
  - **Then** steht ein `Show File`-Button zur Verfügung, der die Datei via API-Endpunkt öffnet.

---

#### User Story 13.3: Konventionelle Git-Commit-Governance & Commitlint-Härtung
> **Als** Maintainer und DevOps-Ingenieur  
> **möchte ich** einheitliche, automatisierte Commitlint-Regeln mit Unterstützung für den Typ `enh`, `camelCase`-Scopes und maximal 72 Zeichen Header-Länge,  
> **damit** alle Git-Commits im Monorepo einer einheitlichen, sauberen Konvention folgen und keine fehlerhaften Commit-Messages in den Verlauf gelangen.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (.commitlintrc.json Konfiguration):**
  - **Given** ein lokaler Git-Commit
  - **When** der Husky `commit-msg` Hook ausgeführt wird
  - **Then** werden folgende Commit-Typen akzeptiert: `build`, `chore`, `enh`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
  - **And** die Header-Länge ist auf maximal 72 Zeichen begrenzt (`header-max-length: [2, "always", 72]`).
  - **And** Schlusspunkte im Header sind verboten (`header-full-stop: [2, "never"]`).
  - **And** das Subject muss in Kleinschreibung vorliegen (`subject-case: [2, "always", "lower-case"]`).
  - **And** der Scope muss in `camelCase` formatiert sein (`scope-case: [2, "always", "camel-case"]`).
- [x] **Szenario 2 (Dokumentation in deployment.md):**
  - **Given** ein Entwickler möchte einen Commit erstellen
  - **When** er [`docs/deployment.md`](deployment.md#32-konventionelle-commit-nachrichten--git-hooks) konsultiert
  - **Then** sind alle Regeln, Scopes, Typen und Beispiele transparent aufgeführt.

---

#### User Story 13.4: Systemweite Sicherheitsdokumentation (`docs/SECURITY.md`)
> **Als** Security Auditor und Open-Source Maintainer  
> **möchte ich** eine umfassende Sicherheitsarchitektur-Dokumentation im Repository,  
> **damit** Sicherheitsmechanismen, Read-Only-Governance, Zero-Cost Circuit Breaker und Responsible-Disclosure-Richtlinien klar nachvollziehbar sind.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] **Szenario 1 (SECURITY.md Erstellung & README-Verlinkung):**
  - **Given** das Repository-Wurzelverzeichnis
  - **When** die Dokumentationsmatrix in [`README.md`](../README.md) geprüft wird
  - **Then** ist [`docs/SECURITY.md`](SECURITY.md) prominent verlinkt.
- [x] **Szenario 2 (Strikter Read-Only-Schutz für Zertifikate):**
  - **Given** die Umgebungsvariable `CERTIFICATES_PATH`
  - **When** Import-Pipelines, Scanner oder Agenten ausgeführt werden
  - **Then** ist dokumentiert und technisch sichergestellt, dass keine Dateien geändert, verschoben oder gelöscht werden (Read-Only Policy).
- [x] **Szenario 3 (Zero-Cost Circuit Breaker & KI-Sicherheit):**
  - **Given** Anfragen an `/api/ai/chat/`
  - **When** bösartige Prompts oder Budget-Überschreitungen auftreten
  - **Then** greifen Pre-Flight-Regex-Filter (0-Token Drop) und tägliche Quotas ohne LLM-Kosten.
- [x] **Szenario 4 (Defense-in-Depth Architektur):**
  - **Given** die Sicherheitsmatrix
  - **When** das Dokument auditiert wird
  - **Then** sind RBAC, Magic-Byte-Prüfung, Hashing, HSTS/CSP, JWT-Refresh-Loops und Neon Connection Isolation lückenlos dokumentiert.

---

### Epic 14: Inbox-Automatisierung, Duplikatsprüfung & Batch-Processing (P2 - Mittel)

#### User Story 14.1: Automatisierter Inbox-Scan mit Duplikats- & Re-Import-Erkennung
> **Als** Administrator  
> **möchte ich**, dass der Inbox-Scanner (`scan_inbox`) bereits vorhandene Zertifikate (anhand von SHA-256 Hash und Quellpfad) automatisch erkennt und überspringt,  
> **damit** keine redundanten Einträge in `PendingCertificate` erzeugt werden und der Import-Lauf idempotent und sicher ist.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] **Szenario 1 (Hash-basierte Duplikatserkennung gegen `Certificate`):**
  - **Given** eine Datei im Posteingang besitzt einen SHA-256 Hash, der bereits in der Tabelle `portfolio_certificate` existiert
  - **When** der Befehl `python manage.py scan_inbox` ausgeführt wird
  - **Then** wird die Datei ignoriert und im Log als `SKIPPED (Already published: <title>)` vermerkt.
- [ ] **Szenario 2 (Duplikatserkennung gegen bestehende `PendingCertificate`):**
  - **Given** ein Dokument liegt bereits als `PendingCertificate` mit demselben Hash oder Dateinamen vor
  - **When** `scan_inbox` erneut läuft
  - **Then** wird kein zweiter Eintrag erzeugt, sondern der bestehende Eintrag beibehalten (`SKIPPED (Pending: <id>)`).
- [ ] **Szenario 3 (Dry-Run Genauigkeit & Statistik):**
  - **Given** der Aufruf `python manage.py scan_inbox --dry-run`
  - **When** der Scan abgeschlossen ist
  - **Then** gibt der Command eine strukturierte Zusammenfassung aus (Gefunden, Neu, Duplikate/Übersprungen, Fehlerhaft).

---

#### User Story 14.2: Bulk-Approve und Bulk-Reject im Django-Admin und React-Dashboard
> **Als** Administrator  
> **möchte ich** mehrere ausstehende Zertifikate gleichzeitig freigeben oder ablehnen können,  
> **damit** ich bei großen Zertifikatsstapeln nicht jeden Eintrag einzeln öffnen und bestätigen muss.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] **Szenario 1 (Django-Admin Bulk-Action):**
  - **Given** eine Auswahl mehrerer Checkboxen in der Changelist von `PendingCertificateAdmin`
  - **When** der Administrator die Aktion *„Ausgewählte Zertifikate genehmigen und übertragen“* wählt
  - **Then** werden die ausgewählten Einträge in einer atomaren Datenbanktransaktion (`transaction.atomic`) in `Certificate`-Datensätze überführt.
- [ ] **Szenario 2 (Track-Default bei Bulk-Approve):**
  - **Given** Zertifikate werden per Bulk freigegeben
  - **When** vor der Freigabe Tracks zugewiesen werden müssen (gemäß Track-Pflicht aus Epic 12)
  - **Then** öffnet sich ein Zwischenformular oder ein Standard-Track wird vergeben, sodass die Integritätsregel nicht verletzt wird.
- [ ] **Szenario 3 (REST-API Batch-Endpunkte):**
  - **Given** `POST /api/pending-certificates/bulk_approve/` mit Payload `{"ids": [1, 2, 3], "track_ids": [4]}`
  - **When** ein Staff-Benutzer den Request sendet
  - **Then** antwortet die API mit `200 OK` und den erzeugten Zertifikat-IDs.

---

#### User Story 14.3: Automatisierte Integritäts- und Bereinigungs-Checks
> **Als** Systembetreuer  
> **möchte ich** einen Management-Befehl `verify_certificate_integrity`, der alle Zertifikate gegen den S3-Storage abgleicht,  
> **damit** tote Links, fehlende Storage-Objekte oder Hash-Inkonsistenzen sofort aufgedeckt werden.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] **Szenario 1 (Storage-Sync-Audit):**
  - **Given** die in der Datenbank hinterlegten `Certificate.storage_key` und `pdf_file`-Pfade
  - **When** `python manage.py verify_certificate_integrity` ausgeführt wird
  - **Then** prüft der Befehl via S3 `head_object`, ob alle Dateien physisch existieren.
- [ ] **Szenario 2 (Orphan-File-Erkennung):**
  - **Given** Dateien im S3-Storage-Bucket unter `certificates/`
  - **When** der Audit-Lauf durchgeführt wird
  - **Then** identifiziert das Skript verwaiste Dateien (Orphans), die keinem Datenbankobjekt mehr zugeordnet sind, und listet sie auf.

---

### Epic 15: Public Performance, HTTP-Caching & Core Web Vitals (P2 - Mittel)

#### User Story 15.1: HTTP Conditional Caching (ETag & Cache-Control) für Read-Only APIs
> **Als** Portfolio-Besucher und Betreiber  
> **möchte ich**, dass öffentliche Lese-Endpunkte (`/api/projects/`, `/api/tracks/`, `/api/skills/`, `/api/certificates/`) HTTP-Caching-Header (`ETag`, `Cache-Control`, `304 Not Modified`) unterstützen,  
> **damit** wiederkehrende Besuche blitzschnell laden und unnötige Datenbankabfragen auf Neon vermieden werden.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] **Szenario 1 (ETag-Generierung auf Basis der Signal-Cache-Version):**
  - **Given** eine Lese-Anfrage an `/api/projects/`
  - **When** die Antwort generiert wird
  - **Then** enthält die Response einen `ETag`-Header, der an die aktuelle Version `portfolio_rag_context_version_v1` gekoppelt ist.
- [ ] **Szenario 2 (304 Not Modified Support):**
  - **Given** der Client sendet den Request mit `If-None-Match: "<etag>"`
  - **When** sich seit der letzten Anfrage keine Daten geändert haben
  - **Then** antwortet Django sofort mit `304 Not Modified` ohne Serializer- und Query-Overhead.
- [ ] **Szenario 3 (Cache-Control Header):**
  - **Given** unauthentifizierte Anfragen
  - **When** Responses ausgeliefert werden
  - **Then** ist `Cache-Control: public, max-age=300, stale-while-revalidate=60` gesetzt.

---

#### User Story 15.2: Image & Media Optimization (Responsive WebP & Blur-Up)
> **Als** Mobil-Nutzer mit schwacher Internetverbindung  
> **möchte ich**, dass Projekt-Vorschaubilder und Zertifikats-Thumbnails als moderne WebP-Bilder in optimierter Auflösung ausgeliefert werden,  
> **damit** das Datenvolumen minimiert wird und die Seite flüssig aufbaut.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] **Szenario 1 (WebP-Bildoptimierung):**
  - **Given** hochgeladene Projekt- und Zertifikats-Bilder (PNG/JPEG)
  - **When** sie im Frontend gerendert werden
  - **Then** werden optimierte WebP-Versionen bevorzugt geladen (`<picture>`-Tag mit WebP-Source).
- [ ] **Szenario 2 (Blur-Up Placeholder & Cumulative Layout Shift = 0):**
  - **Given** Zertifikats- und Projektkarten auf der Startseite
  - **When** die Seite initial gerendert wird
  - **Then** verhindern feste Aspect-Ratio-Container (`aspect-video` / `aspect-[4/3]`) jeglichen Layout Shift (CLS < 0.05).

---

#### User Story 15.3: Core Web Vitals Auditing & CI-Performance-Gate
> **Als** Frontend-Developer und Maintainer  
> **möchte ich**, dass die Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms) automatisiert per Lighthouse-CI überwacht werden,  
> **damit** Performance-Regressionen bei zukünftigen Releases sofort erkannt und verhindert werden.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] **Szenario 1 (Lighthouse CI Integration):**
  - **Given** ein Pull-Request gegen `main`
  - **When** die GitHub Actions CI läuft
  - **Then** führt ein Audit-Job Lighthouse auf dem gebauten Frontend aus.
- [ ] **Szenario 2 (Schwellenwerte):**
  - **Given** der Lighthouse-Report
  - **When** Performance, Accessibility, Best Practices oder SEO unter einen Score von 90 fallen
  - **Then** wird im PR eine Warnung ausgegeben.




