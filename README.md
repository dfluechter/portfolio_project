# Portfolio Projekt — Dominik Flüchter

<<<<<<< Updated upstream
[![CI/CD Pipeline](https://github.com/dfluechter/portfolio_project/actions/workflows/ci.yml/badge.svg)](https://github.com/dfluechter/portfolio_project/actions/workflows/ci.yml)
=======
Django REST API und interaktives Verwaltungs-Dashboard für mein persönliches Portfolio. Verwaltet Zertifikate, Projekte und Zertifikatsanbieter über ein geschütztes Custom-Dashboard.
>>>>>>> Stashed changes

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
- **Presigned Direct-to-Storage (Supabase S3)**: Browser-Uploads erfolgen direkt per signierter `PUT`-URL nach Supabase S3, ohne den Render-Webservice zu belasten.
- **Serverseitige S3-Integritätsprüfung**: Vor Registrierung eines `storage_key` verifiziert das Backend Existenz und Dateigröße ($\le 10\text{ MB}$) via `head_object`, prüft per Range-Request (`bytes=0-2047`) die echten Header-Magic-Bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`) gegen Dateiendungs-Spoofing und validiert die SHA-256-Prüfsumme.
- **Kaskadierende 3-Stufen-OCR**: Extrahiert Metadaten im Review-Drawer on-demand über 1. lokalen PDF-Textlayer (`pypdf`), 2. lokale Tesseract-OCR (`pytesseract`) und 3. multimodale **Google Gemini Flash Vision API**.
- **Track-Pflicht & Lokale FontAwesome SVG-Icons**: Zertifikate erfordern vor der Veröffentlichung (`is_published=True`) mindestens einen zugewiesenen Track. Track-Icons werden beim ersten Abruf validiert und lokal unter `/static/img/icons/` gecacht.

### ⚡ 3. Cloud-Native Infrastruktur, Performance & CI/CD
- **Neon Connection Separation**: Reguläre Web-Requests nutzen den PgBouncer-Pooler (`DATABASE_URL`), während Schema-Migrationen (`migrate` in `build.sh`) automatisch die direkte Compute-Verbindung (`DIRECT_DATABASE_URL`) priorisieren.
- **Isoliertes Neon Branching in GitHub Actions**: Jeder CI-Lauf provisioniert einen eindeutigen ephemeren Datenbank-Branch (`ci-${{ github.run_id }}-${{ github.run_attempt }}`), führt alle 314 Backend-Tests gegen echtes PostgreSQL + `pgvector` aus und räumt den Branch anschließend zuverlässig auf.
- **Frontend Bundle-Splitting & Cold-Start-UX**: Admin-Routen (`DashboardPage`, `LoginPage`, `PasswordResetConfirmPage`) werden via `React.lazy` geladen; ein `ColdStartBanner` informiert Besucher transparent beim Aufwachen des Render Free-Tier-Containers.

---

## 🛠 Tech Stack

| Komponente | Technologie |
|---|---|
<<<<<<< Updated upstream
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
=======
| Framework | Django 5.2 |
| REST API | Django REST Framework (DRF) |
| Sprache | Python 3.13 |
| Package Manager | uv |
| Datenbank (lokal) | SQLite |
| Datenbank (Produktion) | Neon PostgreSQL |
| Media Storage | Supabase (S3-kompatibel) |
| Static Files | WhiteNoise |
| Auth | Session (Dashboard) & Djoser + JWT (APIs) |
| Deployment | Render |
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
# 3. Umgebungsvariablen konfigurieren
cp ../.env.example ../.env
# .env anpassen (SECRET_KEY, optional DATABASE_URL, GEMINI_API_KEY, etc.)
=======
# 3. .env anlegen
cp .env.example .env
# .env anpassen (SECRET_KEY, ggf. DATABASE_URL und Supabase-S3-Werte)
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
* **React Portfolio (Public)**: http://localhost:3000/
* **React Admin Dashboard**: http://localhost:3000/dashboard
* **Django Swagger-UI (OpenAPI)**: http://localhost:8000/api/docs/
* **Backend Health-Check**: http://localhost:8000/health_check

---

## 🔒 Auth- & Sicherheitskonfiguration
=======
* **Dashboard & Login-Seite**: http://localhost:8000/
* **Verwaltung (nach Login)**: http://localhost:8000/dashboard/
* *Hinweis: Das standardmäßige Django-Admin-Interface `/admin/` wurde aus Sicherheitsgründen vollständig deaktiviert.*

## Auth- & Sicherheitskonfiguration

* **Custom User Model**: Die Anmeldung erfolgt ausschließlich über eine eindeutige E-Mail-Adresse (`email`). Es gibt kein `username`-Feld mehr.
* **Registrierung gesperrt**: Djoser's Registrierungs-Endpunkt (`api/auth/users/` POST) wurde über die Permission-Klasse `DenyAny` vollständig deaktiviert. Neue Benutzer können nur direkt über das Terminal via `createsuperuser` angelegt werden.
* **API-Sperren**: Die Änderung von E-Mail-Adressen sowie das Löschen von Konten über Djoser-API-Endpunkte sind vollständig gesperrt.
>>>>>>> Stashed changes

* **Custom User Model (`portfolio.User`)**: Die Anmeldung erfolgt ausschließlich über eine eindeutige E-Mail-Adresse (`email`, kein `username`-Feld).
* **Geschlossene Registrierung**: Öffentliche Selbstregistrierung (`POST /api/auth/users/`) ist über `IsAdminUser` deaktiviert. Administratoren werden kontrolliert via `createsuperuser` angelegt.
* **Single-User Passwort-Reset**: Passwort-Resets sind über das Login-Modal und die dedizierte Bestätigungsseite (`/password/reset/confirm/:uid/:token`) abgesichert.
* **Session-Sync & Refresh-Queue**: Das Frontend erneuert abgelaufene Access-Tokens transparent im Hintergrund und loggt den Benutzer bei ungültigem Refresh-Token über das Event `auth:unauthorized` sauber aus.
* **Strikter Quellordner-Schutz**: Der lokale Zertifikate-Quellordner (`CERTIFICATES_PATH`) ist gemäß [`AGENTS.md`](AGENTS.md) **strikt Read-Only** und wird niemals durch Import- oder Sync-Skripte verändert oder gelöscht.

<<<<<<< Updated upstream
---

## 💻 Wichtige Befehle
=======
### Web & Dashboard

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/` | GET / POST | Login-Seite (Session-basiertes Login) |
| `/dashboard/` | GET | Geschütztes Portfolio-Verwaltungsdashboard |
| `/logout/` | GET | Abmelden aus der Session |

### REST-API (`/api/`)

Alle API-Routen erfordern eine Authentifizierung (Session-Cookie oder JWT-Bearer).

| Endpunkt | Methoden | Beschreibung |
|---|---|---|
| `api/projects/` | GET / POST | Projekte auflisten oder erstellen |
| `api/projects/<id>/` | GET / PUT / PATCH / DELETE | Einzelnes Projekt verwalten |
| `api/certificates/` | GET / POST | Zertifikate auflisten oder erstellen |
| `api/certificates/<id>/` | GET / PUT / PATCH / DELETE | Einzelnes Zertifikat verwalten |
| `api/providers/` | GET / POST | Zertifikatsanbieter auflisten oder erstellen |
| `api/providers/<id>/` | GET / PUT / PATCH / DELETE | Einzelnen Anbieter verwalten |

### Auth-API (`/api/auth/` via Djoser & JWT)

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `api/auth/jwt/create/` | POST | Login $\rightarrow$ `access` + `refresh` Token |
| `api/auth/jwt/refresh/` | POST | Access Token erneuern |
| `api/auth/jwt/verify/` | POST | Token validieren |
| `api/auth/users/reset_password/` | POST | Passwort-Reset-Mail anfordern |
| `api/auth/users/reset_password_confirm/` | POST | Neues Passwort setzen |

* **Header für JWT-Endpunkte**: `Authorization: Bearer <access_token>`
* **Laufzeiten**: Access 60 min · Refresh 7 Tage

## Datenmodelle

### `User`
Custom User Model mit den Feldern `email`, `is_active`, `is_staff` und `date_joined`.

### `Certificate`
Zertifikate mit Datei-Upload. Upload-Pfad: `certificates/<slugified-issuer>/<filename>`.
Erlaubte Formate: `.pdf`, `.png`, `.jpg` · Maximale Dateigröße: 5 MB

### `Provider`
Zertifikatsanbieter mit Name, Status (`aktiv`) und optionalem Logo sowie URL.

### `Project`
Portfolio-Projekte mit Name, Beschreibung, Vorschaubild sowie GitHub- und Live-URL.

## Befehle
>>>>>>> Stashed changes

### Backend (im Verzeichnis `backend/`)
```bash
# Gesamte Test-Suite mit Coverage-Gate (>= 95%)
uv run pytest --cov=core --cov=portfolio --cov-report=term-missing --cov-fail-under=95

# Code-Qualität & Typprüfung
uv run ruff check .                        # Ruff Linter
uv run ruff format --diff .                # Ruff Formatter Check
uv run mypy .                              # Statische Typüberprüfung (Mypy)

<<<<<<< Updated upstream
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
=======
# Linter ausführen
uv run ruff check .

# Code automatisch formatieren
uv run ruff format .

# Statische Typüberprüfung (Mypy)
uv run mypy .

# Statische Dateien einsammeln (WhiteNoise)
uv run python manage.py collectstatic --noinput
```

## Test Coverage

Ergebnis vom letzten Testlauf (10 Tests, alle bestanden):

```
Name                                                   Stmts   Miss  Cover   Missing
------------------------------------------------------------------------------------
core\__init__.py                                           0      0   100%
core\asgi.py                                               4      4     0%   1-16
core\settings.py                                          60      0   100%
core\settings_test.py                                      8      0   100%
core\urls.py                                              10      0   100%
core\wsgi.py                                               4      4     0%   1-16
portfolio\__init__.py                                      0      0   100%
portfolio\admin.py                                        35      0   100%
portfolio\apps.py                                          4      0   100%
portfolio\management\__init__.py                           0      0   100%
portfolio\management\commands\__init__.py                  0      0   100%
portfolio\management\commands\import_certificates.py      47     47     0%   1-66
portfolio\management\commands\scan_certificates.py        29     29     0%   1-63
portfolio\models.py                                       81      7    91%   18, 23-26, 40-42
portfolio\serializers.py                                  15      0   100%
portfolio\tests\__init__.py                                0      0   100%
portfolio\tests\test_models.py                            27      0   100%
portfolio\tests\test_views.py                             16      0   100%
portfolio\views.py                                        55     24    56%   17-22, 24-25, 28-36, 40-42, 69-70
------------------------------------------------------------------------------------
TOTAL                                                    399    115    71%
```

> Die 0%-Abdeckung bei `asgi.py`, `wsgi.py` und den Management Commands ist erwartetes Verhalten — diese Dateien werden in Unit-Tests nicht ausgeführt.
>>>>>>> Stashed changes

## 🧪 Test Coverage & Qualitätssicherung

Sowohl Backend als auch Frontend werden bei jedem Push und Pull Request automatisiert in GitHub Actions geprüft:

* **Backend Coverage:** **$\ge$ 95%** (**314 Pytest-Tests**: Djoser Auth, JWT, DRF ViewSets, Models, Permissions, RAG Hybrid Retrieval & `pgvector`, Embeddings, Chunking, Signals, Track-Validierung, Icon-Service, OCR-Extractor & Presigned S3-Uploads)
* **Frontend Tests:** **82 Vitest-Tests** via React Testing Library (Komponenten, Routing, Passwort-Reset-Flow, Review-Drawer & Track-Pflicht, Modal-A11y, Axios Refresh-Queue, Track-Icons & RAG Chat-Widget)

---

## 📁 Projektstruktur

```text
portfolio_project/
<<<<<<< Updated upstream
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
=======
├── core/
│   ├── settings.py          # Haupt-Settings (Prod + Dev + DRF + Djoser)
│   ├── settings_test.py     # Test-Settings
│   └── urls.py              # URL-Konfiguration (Router + Login/Dashboard)
├── portfolio/
│   ├── admin.py             # Admin-Konfiguration (Custom UserAdmin)
│   ├── models.py            # Custom User, Certificate, Provider, Project
│   ├── serializers.py       # DRF-Serialisierer für CRUD-Routen
│   ├── views.py             # Login/Dashboard-Views & API-ViewSets
│   ├── management/
│   │   └── commands/        # import_certificates, scan_certificates
│   ├── migrations/          # Datenbank-Migrationen ab 0001_initial
│   └── tests/
│       ├── test_models.py
│       └── test_views.py
├── templates/
│   ├── login.html           # Login-Template mit integriertem Reset-Flow
│   └── dashboard.html       # Interaktives Vanilla CSS/JS Dashboard (CRUD)
├── build.sh                 # Render Build-Hook
├── render.yaml              # Render Deployment-Konfiguration
├── pyproject.toml           # Abhängigkeiten + Tool-Konfiguration (Ruff, Mypy)
└── pytest.ini               # Pytest-Konfiguration
>>>>>>> Stashed changes
```
