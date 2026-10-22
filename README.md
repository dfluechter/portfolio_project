# Portfolio Projekt — Dominik Flüchter

[![CI/CD Pipeline](https://github.com/dfluechter/portfolio_project/actions/workflows/ci.yml/badge.svg)](https://github.com/dfluechter/portfolio_project/actions/workflows/ci.yml)

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/dfluechter/portfolio_project/CI%2FCD%20Pipeline?branch=main&style=for-the-badge&logo=github)
![Coverage](https://img.shields.io/badge/Coverage-%3E95%25-brightgreen?style=for-the-badge&logo=pytest)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-5.2%2B-092E20?style=for-the-badge&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Postgres](https://img.shields.io/badge/Neon_Postgres-pgvector-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?style=for-the-badge&logo=render&logoColor=white)

Cloud-native **Headless Django REST API** (Backend) und **React 19 Single Page Application** (Frontend) für mein persönliches Portfolio. Die Plattform verwaltet Zertifikate, Projekte, Skills, beruflichen Werdegang (Timeline), Fachdomänen (Tracks) und Zertifikatsanbieter über ein geschütztes Admin-Dashboard und bietet Besuchern einen integrierten **RAG Portfolio-Copiloten** auf Basis von **Google Gemini**, **`text-embedding-004`** und **Neon PostgreSQL (`pgvector` HNSW)**.

---

## 📑 Inhaltsverzeichnis
- [✨ Kernfunktionen & Architektur-Highlights](#-kernfunktionen--architektur-highlights)
- [🛠 Tech Stack](#-tech-stack)
- [📚 Technische Dokumentation & ADRs](#-technische-dokumentation--adrs)
- [📦 Voraussetzungen](#-voraussetzungen)
- [🚀 Lokales Setup](#-lokales-setup)
- [🔒 Auth- & Sicherheitskonfiguration](#-auth---sicherheitskonfiguration)
- [💻 Wichtige Befehle](#-wichtige-befehle)
- [🧪 Test Coverage & Qualitätssicherung](#-test-coverage--qualitätssicherung)
- [📁 Projektstruktur](#-projektstruktur)

---

## ✨ Kernfunktionen & Architektur-Highlights

### 🤖 1. RAG Portfolio-Copilot & Native `pgvector` Vektorsuche
- **Semantisches Chunking (`KnowledgeChunk`)**: Veröffentlichte Projekte, Zertifikate (inkl. mehrseitiger OCR-Volltexte aus `source_pending`), Skills und Werdegangs-Stationen werden automatisch in semantische Wissens-Chunks zerlegt.
- **HNSW-Vektorindex & Hybrid Retrieval**: Auf Neon PostgreSQL speichert `VectorField(dimensions=768)` Embeddings aus `text-embedding-004` mit einem HNSW-Index (`vector_cosine_ops`) für schnelle $O(\log N)$ Kosinus-Ähnlichkeitssuchen (`CosineDistance`). Lokal (SQLite) oder ohne API-Kontingent greift nahtlos ein deterministischer Keyword-Fallback.
- **$O(1)$ Echtzeit-Synchronisation & Cache-Invalidierung**: Django Signals (`post_save`, `post_delete`) synchronisieren geänderte `KnowledgeChunk`-Einträge sofort und inkrementieren atomar den globalen Versionsschlüssel `portfolio_rag_context_version_v1`.
- **Guardrails & Zero-Cost Circuit-Breaker**: 0-Token Pre-Flight Regex-Filter gegen Prompt Injections/Jailbreaks, strikte Fakten-Bindung und tägliche Token-/Request-Budgetierung.
- **Interaktives UI Deep-Linking**: Klickbare Quell-Badges (`#project-<id>`, `#cert-<id>`) im `PortfolioChatWidget` scrollen sanft zur jeweiligen Karte und heben diese für 2 Sekunden mit einem optischen Glow-Ring hervor.

### 📜 2. Zertifikats-Lifecycle, 3-Stufen Hybrid OCR & Direct-to-Storage Uploads
- **Presigned Direct-to-Storage (Supabase S3)**: Uploads aus dem Browser erfolgen über eine signierte PUT-URL direkt an den S3-Storage. Der Web-Server wird dadurch entlastet.
- **Serverseitige S3-Integritätsprüfung**: Vor Registrierung eines `storage_key` prüft das Backend via `head_object` Existenz und Dateigröße ($\le 10\text{ MB}$). Ein Range-Request (`bytes=0-2047`) verifiziert die Magic Bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`) gegen Dateiendungs-Spoofing. Zudem wird die SHA-256-Prüfsumme validiert.
- **Kaskadierende 3-Stufen-OCR**: Die Metadatenextraktion erfolgt im Review-Drawer bei Bedarf stufenweise:
  - **Stufe 1**: Lokaler PDF-Textlayer (`pypdf`).
  - **Stufe 2**: Lokale Tesseract-OCR (`pytesseract`).
  - **Stufe 3**: Multimodale Google Gemini Flash Vision API.
- **Track-Pflicht & Icon-Caching**: Bevor ein Zertifikat veröffentlicht werden kann (`is_published=True`), muss ihm mindestens ein Fachbereich (Track) zugewiesen sein. Die zugehörigen FontAwesome SVG-Icons werden beim Erstabruf validiert und lokal unter `/static/img/icons/` geordnet gespeichert.

### ⚡ 3. Infrastruktur, Performance & CI/CD-Pipelines
- **Neon Connection Separation**: Web-Requests nutzen zur Skalierung den PgBouncer-Pooler (`DATABASE_URL`). Datenbank-Migrationen (`migrate` in `build.sh`) verwenden automatisch die direkte Compute-Verbindung (`DIRECT_DATABASE_URL`).
- **Ephemeres Neon Branching in GitHub Actions**: CI-Pipeline-Läufe erstellen einen isolierten Datenbank-Branch (`ci-${{ github.run_id }}-${{ github.run_attempt }}`). Nach Ausführung der Testsuite gegen echtes PostgreSQL inkl. `pgvector` wird dieser Branch automatisch verworfen.
- **Performance & Frontend Cold-Start-UX**: Die Admin-Komponenten (`DashboardPage`, `LoginPage`, `PasswordResetConfirmPage`) werden träge nachgeladen (`React.lazy`). Bei Nutzung der kostenlosen Server-Instanz auf Render weist ein `ColdStartBanner` den Nutzer auf das Aufwachen des Containers hin.

### 📥 4. Inbox-Automatisierung & Batch-Processing
- **Strikter Read-Only Quellschutz**: Der Import-Scanner (`scan_inbox`) greift gemäß Schutzregeln ausschließlich lesend auf `CERTIFICATES_PATH` zu (keine Modifikationen, kein Löschen am Ursprungsort).
- **Idempotente Duplikatserkennung**: Anhand des SHA-256-Dateihashes überspringt der Scanner bereits vorhandene Zertifikate (`Certificate`) sowie bereits erfasste Inbox-Kandidaten (`PendingCertificate`), wodurch wiederholte Importläufe vollkommen zustandssicher sind.
- **Bulk-Approve & Bulk-Reject**: Über die REST-Batch-Endpunkte (`/api/pending-certificates/bulk_approve/` und `/bulk_reject/`) sowie im Django-Admin können mehrere Kandidaten gleichzeitig freigegeben oder abgelehnt werden.
- **Track-Konsistenz & Teilerfolg**: Bei der Massenfreigabe werden optional gemeinsame Tracks zugewiesen oder auf die heuristischen `suggested_tracks` zurückgegriffen; Einzelfehler (z. B. fehlende Quelldatei) blockieren nicht den gesamten Batch, sondern werden transparent mit detaillierten Fehlerberichten quittiert.

### ⚡ 5. HTTP Conditional Caching & ETag-Strategie (US 15.1)
- **Versionsbasierte ETags**: Schwache ETags (`W/"<ressource>_v<version>"`) werden direkt aus der atomaren Signal-Cache-Version (`portfolio_rag_context_version_v1`) abgeleitet und an öffentliche Lese-Endpunkte angehängt.
- **`304 Not Modified` Early Exit**: Sendet der Client den Header `If-None-Match`, prüft das Backend via `ConditionalCacheMixin` die Version bereits vor der Ausführung teurer Datenbankabfragen oder Serialisierungen und antwortet unmittelbar mit einem leeren `304 Not Modified`.
- **Cache-Control & Dashboard-Bypass**: Öffentliche Lese-Endpunkte (`/api/projects/`, `/api/tracks/`, `/api/skills/`, `/api/certificates/`) liefern `Cache-Control: public, max-age=300, stale-while-revalidate=60`. Für authentifizierte Administratoren im Dashboard wird das Caching automatisch umgangen (`Cache-Control: no-cache, private`), sodass Änderungen sofort sichtbar sind.

---

## 🛠 Tech Stack

| Komponente | Technologie |
|---|---|
| **Frontend Framework** | React 19 + TypeScript 5.8 + Vite 8 (Rolldown) |
| **Frontend Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) + Framer Motion + Lucide React |
| **Frontend Server-State** | TanStack Query v5 + Axios (Concurrency-Safe 401 Token-Refresh-Queue) |
| **Backend Framework** | Django 5.2+ (Headless JSON API) |
| **REST API & Docs** | Django REST Framework (DRF) + `drf-spectacular` (OpenAPI 3 / Swagger-UI) |
| **Backend Sprache & Tooling** | Python 3.13 · `uv` · `ruff` · `mypy` · `pytest` |
| **Datenbank (lokal)** | SQLite (mit automatischem Keyword-Retrieval-Fallback) |
| **Datenbank (Produktion)** | Neon Serverless PostgreSQL + `pgvector` (768-dim. HNSW-Index) |
| **KI / LLM & Embeddings** | Google Gemini & `text-embedding-004` (`google-genai` SDK) |
| **Media Storage** | Supabase Storage (S3-kompatibel via `django-storages` & `boto3`) |
| **Static Files** | WhiteNoise (`CompressedManifestStaticFilesStorage`) |
| **Auth** | Djoser + SimpleJWT (`api/auth/`, E-Mail-Login, Passwort-Reset-Flow) |
| **Deployment & Governance** | Render (`render.yaml` Blueprint) + GitHub Actions CI/CD + `.github/CODEOWNERS` |

---

## 📚 Technische Dokumentation & ADRs

Alle Architekturentscheidungen, Datenflüsse und Spezifikationen sind im Ordner [`/docs`](docs/) dokumentiert:

| Dokument | Inhalt |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Gesamtsystem-Architektur, Sequenzdiagramme, REST-API-Endpunkte, S3-Upload-Flüsse & Security |
| [`docs/ai-assistant-rag.md`](docs/ai-assistant-rag.md) | RAG Portfolio-Copilot, `pgvector` Hybrid Retrieval, Signals Caching, Guardrails & UI Deep-Linking |
| [`docs/frontend.md`](docs/frontend.md) | React 19 Komponenten-Architektur, TanStack Query State, JWT-Interceptor, Code-Splitting & Testing |
| [`docs/deployment.md`](docs/deployment.md) | Render Deployment, `build.sh`, Neon Pooled/Direct Connections, CI-Branching, S3-CORS & `CODEOWNERS` |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Sicherheitsarchitektur, Defense-in-Depth, Zero-Cost AI Circuit Breaker, Read-Only-Governance & Disclosure |
| [`docs/glossary.md`](docs/glossary.md) | Verbindliches Fachglossar (Entitäten, Zertifikats-Lifecycle, Infrastruktur- & RAG-Begriffe) |
| [`docs/backlog.md`](docs/backlog.md) | Agiles Product Backlog (Epics 1–12), User Stories, Definition of Ready (DoR) & Definition of Done (DoD) |
| [GitHub Wiki](https://github.com/dfluechter/portfolio_project/wiki) (`docs/wiki/`) | Vollständiges Projekt-Wiki (System-Architektur, RAG, Frontend, Deployment, Security & Glossary) |
| [`docs/adrs/`](docs/adrs/) | Architectural Decision Records ([ADR-001](docs/adrs/001-monorepo.md) bis [ADR-007](docs/adrs/007-rag-copilot-caching-guardrails.md)) |

---

## 📦 Voraussetzungen

- **Node.js** 22.x+ & `npm`
- **Python** 3.13+
- **[uv](https://docs.astral.sh/uv/)** (Python Package & Environment Manager)

---

## 🚀 Lokales Setup

```bash
# 1. Repository klonen
git clone https://github.com/dfluechter/portfolio_project.git
cd portfolio_project

# ========================
# BACKEND SETUP
# ========================
cd backend

# 2. Abhängigkeiten installieren (erstellt automatisch .venv)
uv sync

# 3. Umgebungsvariablen konfigurieren
cp ../.env.example ../.env
# .env anpassen (SECRET_KEY, optional DATABASE_URL, GEMINI_API_KEY, etc.)

# 4. Datenbank migrieren & RAG-Chunks initial indizieren
uv run python manage.py migrate
uv run python manage.py index_rag_chunks

# 5. Admin-Benutzer anlegen (E-Mail-basiert)
uv run python manage.py createsuperuser

# 6. Backend-Dev-Server starten (http://localhost:8000)
uv run python manage.py runserver

# ========================
# FRONTEND SETUP (in 2. Terminal)
# ========================
cd ../frontend

# 7. Frontend-Abhängigkeiten installieren
npm install

# 8. Frontend-Dev-Server starten (http://localhost:3000)
npm run dev
```

* **React Portfolio (Public)**: http://localhost:3000/
* **React Admin Dashboard**: http://localhost:3000/dashboard
* **Django Swagger-UI (OpenAPI)**: http://localhost:8000/api/docs/
* **Backend Health-Check**: http://localhost:8000/health_check

---

## 🔒 Auth- & Sicherheitskonfiguration

* **Custom User Model (`portfolio.User`)**: Die Anmeldung erfolgt ausschließlich über eine eindeutige E-Mail-Adresse (`email`, kein `username`-Feld).
* **Geschlossene Registrierung**: Öffentliche Selbstregistrierung (`POST /api/auth/users/`) ist über `IsAdminUser` deaktiviert. Administratoren werden kontrolliert via `createsuperuser` angelegt.
* **Single-User Passwort-Reset**: Passwort-Resets sind über das Login-Modal und die dedizierte Bestätigungsseite (`/password/reset/confirm/:uid/:token`) abgesichert.
* **Session-Sync & Refresh-Queue**: Das Frontend erneuert abgelaufene Access-Tokens transparent im Hintergrund und loggt den Benutzer bei ungültigem Refresh-Token über das Event `auth:unauthorized` sauber aus.
* **Strikter Quellordner-Schutz**: Der lokale Zertifikate-Quellordner (`CERTIFICATES_PATH`) ist gemäß [`AGENTS.md`](AGENTS.md) **strikt Read-Only** und wird niemals durch Import- oder Sync-Skripte verändert oder gelöscht.

---

## 💻 Wichtige Befehle

### Backend (im Verzeichnis `backend/`)
```bash
# Gesamte Test-Suite mit Coverage-Gate (>= 95%)
uv run pytest --cov=core --cov=portfolio --cov-report=term-missing --cov-fail-under=95

# Code-Qualität & Typprüfung
uv run ruff check .                        # Ruff Linter
uv run ruff format --diff .                # Ruff Formatter Check
uv run mypy .                              # Statische Typüberprüfung (Mypy)

# RAG & Zertifikats-Management-Commands
uv run python manage.py index_rag_chunks               # RAG Chunks synchronisieren (ohne API-Call)
uv run python manage.py index_rag_chunks --with-embeddings # RAG Chunks inkl. Gemini Embeddings erzeugen
uv run python manage.py scan_inbox                     # Neue Zertifikate aus Inbox in Staging laden
uv run python manage.py sync_certificates              # Lokale Zertifikate mit S3-Storage abgleichen
uv run python manage.py collectstatic --noinput        # Statische Dateien sammeln
```

### Frontend (im Verzeichnis `frontend/`)
```bash
npm run dev                                # Vite Dev-Server starten
npm run build                              # TypeScript Check + Production-Build
npm run lint                               # Oxlint Code-Analyse
npx vitest run                             # Vitest Unit- & Komponententests (CI-Modus)
```

---

## 🧪 Test Coverage & Qualitätssicherung

Sowohl Backend als auch Frontend werden bei jedem Push und Pull Request automatisiert in GitHub Actions geprüft:

* **Backend Coverage:** **$\ge$ 95%** (**314 Pytest-Tests**: Djoser Auth, JWT, DRF ViewSets, Models, Permissions, RAG Hybrid Retrieval & `pgvector`, Embeddings, Chunking, Signals, Track-Validierung, Icon-Service, OCR-Extractor & Presigned S3-Uploads)
* **Frontend Tests:** **82 Vitest-Tests** via React Testing Library (Komponenten, Routing, Passwort-Reset-Flow, Review-Drawer & Track-Pflicht, Modal-A11y, Axios Refresh-Queue, Track-Icons & RAG Chat-Widget)

---

## 📁 Projektstruktur

```text
portfolio_project/
├── .github/
│   ├── CODEOWNERS               # Verbindliche PR-Review-Regeln für kritische Systempfade
│   ├── dependabot.yml           # Automatische Dependency-Updates
│   └── workflows/
│       └── ci.yml               # CI/CD Pipeline (Ephemeres Neon DB Branching, Tests, Render Deploy)
├── backend/                     # Django Headless REST API
│   ├── core/                    # Projekt-Konfiguration (settings.py, settings_test.py, urls.py, wsgi.py)
│   ├── portfolio/               # Portfolio-App (Models, Serializers, Views, Signals, Admin, Migrations)
│   │   ├── management/commands/ # CLI-Commands (index_rag_chunks, scan_inbox, import/sync_certificates)
│   │   ├── services/            # Geschäftslogik (ai_assistant, chunking, embeddings, retrieval, extractor, storage, icon_service)
│   │   └── tests/               # 314 Pytest-Tests (>= 95% Coverage)
│   ├── build.sh                 # Render Build-Hook (uv sync, collectstatic, migrate, index_rag_chunks)
│   ├── manage.py                # Django Management CLI
│   ├── pyproject.toml           # Python Dependencies & Tool-Konfiguration (uv, ruff, mypy, pgvector)
│   └── pytest.ini               # Pytest Konfiguration
├── frontend/                    # React 19 SPA (Vite 8 + TypeScript + Tailwind CSS v4)
│   ├── src/
│   │   ├── api/                 # Axios Client mit JWT-Injektion & 401-Refresh-Queue
│   │   ├── components/          # Public Views, RAG Chat-Widget, TrackIcon, ColdStartBanner & Admin-Dashboard
│   │   ├── context/             # React Context (AuthContext, ThemeContext)
│   │   ├── hooks/               # Custom Hooks (usePortfolio, usePortfolioSearch, useColdStartTracker)
│   │   ├── pages/               # PortfolioPage, LoginPage, DashboardPage, PasswordResetConfirmPage
│   │   ├── services/            # API- & Direct-to-Storage S3-Services (portfolioService)
│   │   └── App.tsx              # Router-Setup mit React.lazy & Suspense
│   ├── package.json             # Frontend Dependencies & Scripts
│   └── vite.config.ts           # Vite, Vitest & Manual-Chunking Konfiguration
├── docs/                        # Technische Dokumentation, Spezifikationen & ADRs
│   ├── adrs/                    # Architectural Decision Records (ADR-001 bis ADR-007)
│   ├── architecture.md          # Systemarchitektur, Datenflüsse, API & Security
│   ├── ai-assistant-rag.md      # RAG Portfolio-Copilot, pgvector Hybrid Retrieval & Guardrails
│   ├── deployment.md            # Render Deployment, Neon Connections, CI/CD & CODEOWNERS
│   ├── frontend.md              # Frontend-Architektur, State Management & Bundle-Splitting
│   ├── glossary.md              # Verbindliches Fachglossar
│   └── backlog.md               # Agiles Product Backlog (Epics 1–12)
├── AGENTS.md                    # Projektrichtlinien & Read-Only Schutzregeln für Agenten
├── build.sh                     # Resilientes Root-Build-Skript (delegiert an backend/build.sh)
└── render.yaml                  # Deklaratives Render Blueprint (Backend Web Service + Frontend Static Site)
```
