# Portfolio Projekt

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/dfluechter/portfolio_project/CI%2FCD%20Pipeline?branch=main&style=for-the-badge&logo=github)
![Coverage](https://img.shields.io/badge/Coverage-99%25-brightgreen?style=for-the-badge&logo=pytest)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-5.2-092E20?style=for-the-badge&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?style=for-the-badge&logo=render&logoColor=white)

Django REST API (Backend) und React SPA (Frontend) für mein persönliches Portfolio. Verwaltet Zertifikate, Projekte, Skills, Timeline und Zertifikatsanbieter über ein geschütztes Dashboard.

> 📚 **Architektur-Details**: Eine tiefere Analyse der Entscheidungen und Infrastruktur findest du unter [`/docs/architekture.md`](docs/architekture.md).

---

## 📑 Inhaltsverzeichnis
- [🛠 Tech Stack](#-tech-stack)
- [📦 Voraussetzungen](#-voraussetzungen)
- [🚀 Lokales Setup](#-lokales-setup)
- [🔒 Auth- & Sicherheitskonfiguration](#-auth---sicherheitskonfiguration)
- [💻 Befehle](#-befehle)
- [🧪 Test Coverage & Qualitätssicherung](#-test-coverage--qualitätssicherung)
- [📁 Projektstruktur](#-projektstruktur)

---

## 🛠 Tech Stack

| Komponente | Technologie |
|---|---|
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **Frontend Styling** | Tailwind CSS v4 |
| **Frontend Data Fetching** | TanStack Query v5 |
| **Backend Framework** | Django 5.2 |
| **REST API** | Django REST Framework (DRF) |
| **Backend Sprache** | Python 3.13 |
| **Package Manager** | uv (Python) & npm (Node.js) |
| **Datenbank (lokal)** | SQLite |
| **Datenbank (Produktion)**| Neon PostgreSQL |
| **Media Storage** | Supabase (S3-kompatibel) |
| **Static Files** | WhiteNoise (`CompressedManifestStaticFilesStorage`) |
| **Auth** | Djoser + JWT (`api/auth/`) |
| **Deployment** | Render |

## 📦 Voraussetzungen

- Node.js 24.x+ & npm
- Python 3.13+
- [uv](https://docs.astral.sh/uv/) installiert

## 🚀 Lokales Setup

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

* **React Frontend**: http://localhost:3000/
* **Django Backend / API**: http://localhost:8000/
* **Django Admin**: http://localhost:8000/admin/
* **API Swagger Docs**: http://localhost:8000/api/docs/

## 🔒 Auth- & Sicherheitskonfiguration

* **Custom User Model**: Die Anmeldung erfolgt ausschließlich über eine eindeutige E-Mail-Adresse (`email`). Es gibt kein `username`-Feld.
* **Registrierung gesperrt**: Djoser's Registrierungs-Endpunkt wurde über die Permission-Klasse `IsAdminUser` gesperrt. Neue Benutzer können nur via `createsuperuser` (oder Django Admin) angelegt werden. E-Mail-Passwort-Resets sind vollständig konfiguriert.
* **Session-Sync**: Das Frontend loggt den User über einen stabilen React `AuthContext` via `auth:unauthorized` Event-Hooks bei Ablauf des Refresh-Tokens synchronisiert aus.
* **CORS**: `CORS_ALLOWED_ORIGINS` erlaubt lokale Entwicklungs-Server (`http://localhost:3000`, `http://localhost:5173`) sowie Preview-Deployments.
* **Security & Stabilität**: Das Frontend ist mit einer übergreifenden `ErrorBoundary` abgesichert, die API erzwingt restriktives `IsAuthenticatedOrReadOnly` für alle modifizierenden DRF-Routen (`PUT`, `PATCH`, `DELETE`).

## 💻 Befehle

### Backend (im Root-Verzeichnis)
```bash
uv run pytest --cov=portfolio        # Tests & Coverage Report
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

* **Backend Coverage:** **> 99%** (Djoser Auth, JWT, DRF ViewSets, Models, Permissions & Datenbank-Protections)
* **Frontend Tests:** Vitest & React Testing Library (Komponenten, Routing, Modal-A11y, API-Client Interceptors)

## 📁 Projektstruktur

```
portfolio_project/
├── .github/workflows/       # CI-Pipelines für Frontend & Backend (Neon Branch Testing)
├── frontend/                # React SPA (Vite)
│   ├── src/
│   │   ├── components/      # React Komponenten (UI, ErrorBoundary & Dashboard)
│   │   ├── context/         # React Context (AuthContext mit JWT Sync)
│   │   ├── hooks/           # Custom Hooks (usePortfolio mit TanStack Query)
│   │   ├── pages/           # Pages (Home, Login, Dashboard)
│   │   └── App.tsx          # React Router Setup
│   ├── package.json         # Node Abhängigkeiten
│   └── vite.config.ts       # Vite & Vitest Konfiguration
├── core/
│   ├── settings.py          # Django Haupt-Settings (inkl. E-Mail & Security)
│   ├── settings_test.py     # Django Test-Settings
│   └── urls.py              # API Routing & Swagger UI
├── portfolio/
│   ├── models.py            # Custom User, Certificate, Provider, Project, Skill, Timeline
│   ├── serializers.py       # DRF-Serialisierer (Hybrid Pattern)
│   ├── views.py             # ViewSets
│   └── tests/               # Pytest Suite (CRUD, Models, Auth, Protections)
├── build.sh                 # Render Build-Hook (uv sync, collectstatic, migrate)
├── render.yaml              # Render Deployment-Konfiguration
└── pyproject.toml           # Python Abhängigkeiten & Tools
```
