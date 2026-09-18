# Portfolio Projekt

Django REST API (Backend) und React SPA (Frontend) für mein persönliches Portfolio. Verwaltet Zertifikate, Projekte, Skills, Timeline und Zertifikatsanbieter über ein geschütztes Dashboard.

## Tech Stack

| Komponente | Technologie |
|---|---|
| Frontend Framework | React 19 + TypeScript + Vite |
| Frontend Styling | Tailwind CSS v4 |
| Frontend Data Fetching | TanStack Query v5 |
| Backend Framework | Django 5.2 |
| REST API | Django REST Framework (DRF) |
| Backend Sprache | Python 3.13 |
| Package Manager | uv (Python) & npm (Node.js) |
| Datenbank (lokal) | SQLite |
| Datenbank (Produktion) | Neon PostgreSQL |
| Media Storage | Supabase (S3-kompatibel) |
| Static Files | WhiteNoise (`CompressedManifestStaticFilesStorage`) |
| Auth | Djoser + JWT (`api/auth/`) |
| Deployment | Render |

## Voraussetzungen

- Node.js 24.x+ & npm
- Python 3.13+
- [uv](https://docs.astral.sh/uv/) installiert

## Lokales Setup

```bash
# 1. Repository klonen
git clone <repo-url>
cd portfolio_project

# ========================
# BACKEND SETUP
# ========================

# 2. Abhängigkeiten installieren
uv sync

# 3. .env anlegen
cp .env.example .env
# .env anpassen (SECRET_KEY, DATABASE_URL, etc.)

# 4. Datenbank migrieren
uv run python manage.py migrate

# 5. Admin-Benutzer anlegen (E-Mail-basiert)
uv run python manage.py createsuperuser

# 6. Backend-Dev-Server starten
uv run python manage.py runserver

# ========================
# FRONTEND SETUP
# ========================

# 7. Frontend initialisieren
cd frontend
npm install

# 8. Frontend-Dev-Server starten
npm run dev
```

* **React Frontend**: http://localhost:5173/
* **Django Backend / API**: http://localhost:8000/
* *Hinweis: Das standardmäßige Django-Admin-Interface `/admin/` wurde aus Sicherheitsgründen vollständig deaktiviert.*

## Auth- & Sicherheitskonfiguration

* **Custom User Model**: Die Anmeldung erfolgt ausschließlich über eine eindeutige E-Mail-Adresse (`email`). Es gibt kein `username`-Feld.
* **Registrierung gesperrt**: Djoser's Registrierungs-Endpunkt wurde über die Permission-Klasse `IsAdminUser` gesperrt. Neue Benutzer können nur via `createsuperuser` angelegt werden.
* **CORS**: `CORS_ALLOWED_ORIGINS` erlaubt lokale Entwicklungs-Server (`http://localhost:5173`) sowie Preview-Deployments (`*.pages.dev`, `*.vercel.app`).

## Befehle

### Backend (im Root-Verzeichnis)
```bash
uv run pytest                        # Tests ausführen
uv run ruff check .                  # Linter
uv run ruff format .                 # Formatter
uv run mypy .                        # Statische Typüberprüfung
uv run python manage.py collectstatic --noinput
```

### Frontend (im `frontend/`-Verzeichnis)
```bash
npm run dev                          # Vite Dev-Server
npm run build                        # TypeScript + Vite Build
npm run lint                         # Oxlint
npm run test                         # Vitest
```

## 🧪 Test Coverage & Qualitätssicherung

Sowohl Backend als auch Frontend werden kontinuierlich via GitHub Actions getestet (Linting, Type Checks, Pytest/Vitest).

* **Backend Coverage:** > 95% (Djoser Auth, JWT, DRF ViewSets, Models)
* **Frontend Tests:** Vitest & React Testing Library (Komponenten, Routing, Modal-A11y)

## 📁 Projektstruktur

```
portfolio_project/
├── .github/workflows/       # CI-Pipelines für Frontend & Backend
├── frontend/                # React SPA (Vite)
│   ├── src/
│   │   ├── components/      # React Komponenten (UI & Dashboard)
│   │   ├── hooks/           # Custom Hooks (usePortfolio mit TanStack Query)
│   │   ├── pages/           # Pages (Home, Login, Dashboard)
│   │   └── App.tsx          # React Router Setup
│   ├── package.json         # Node Abhängigkeiten
│   └── vite.config.ts       # Vite & Vitest Konfiguration
├── core/
│   ├── settings.py          # Django Haupt-Settings
│   ├── settings_test.py     # Django Test-Settings
│   └── urls.py              # API Routing
├── portfolio/
│   ├── models.py            # Custom User, Certificate, Provider, Project, Skill, Timeline
│   ├── serializers.py       # DRF-Serialisierer (Hybrid Pattern)
│   ├── views.py             # ViewSets
│   └── tests/               # Pytest Suite
├── build.sh                 # Render Build-Hook (uv sync, collectstatic, migrate)
├── render.yaml              # Render Deployment-Konfiguration
└── pyproject.toml           # Python Abhängigkeiten & Tools
```
