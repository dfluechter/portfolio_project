# Portfolio Backend

Django REST API und interaktives Verwaltungs-Dashboard für mein persönliches Portfolio. Verwaltet Zertifikate, Projekte und Zertifikatsanbieter über ein geschütztes Custom-Dashboard.

## Tech Stack

| Komponente | Technologie |
|---|---|
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

## Voraussetzungen

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) installiert

## Lokales Setup

```bash
# 1. Repository klonen
git clone <repo-url>
cd portfolio_project

# 2. Abhängigkeiten installieren
uv sync

# 3. .env anlegen
cp .env.example .env
# .env anpassen (SECRET_KEY, ggf. DATABASE_URL und Supabase-S3-Werte)

# 4. Datenbank migrieren
uv run python manage.py migrate

# 5. Admin-Benutzer anlegen (E-Mail-basiert)
uv run python manage.py createsuperuser

# 6. Dev-Server starten
uv run python manage.py runserver
```

* **Dashboard & Login-Seite**: http://localhost:8000/
* **Verwaltung (nach Login)**: http://localhost:8000/dashboard/
* *Hinweis: Das standardmäßige Django-Admin-Interface `/admin/` wurde aus Sicherheitsgründen vollständig deaktiviert.*

## Auth- & Sicherheitskonfiguration

* **Custom User Model**: Die Anmeldung erfolgt ausschließlich über eine eindeutige E-Mail-Adresse (`email`). Es gibt kein `username`-Feld mehr.
* **Registrierung gesperrt**: Djoser's Registrierungs-Endpunkt (`api/auth/users/` POST) wurde über die Permission-Klasse `DenyAny` vollständig deaktiviert. Neue Benutzer können nur direkt über das Terminal via `createsuperuser` angelegt werden.
* **API-Sperren**: Die Änderung von E-Mail-Adressen sowie das Löschen von Konten über Djoser-API-Endpunkte sind vollständig gesperrt.

## API Endpunkte

### Web & Dashboard

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/` | GET / POST | Login-Seite (Session-basiertes Login) |
| `/dashboard/` | GET | Geschütztes Portfolio-Verwaltungsdashboard |
| `/logout/` | GET | Abmelden aus der Session |
| `/health_check` | GET | Health-Check-Endpunkt (Monitoring & Render) |

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

```bash
# Tests ausführen
uv run pytest

# Einzelnen Test ausführen
uv run pytest portfolio/tests/test_models.py::TestCertificateUploadPath::test_standard_issuer_name

# Linter ausführen
uv run ruff check .

# Code automatisch formatieren
uv run ruff format .

# Statische Typüberprüfung (Mypy)
uv run mypy .

# Statische Dateien einsammeln (WhiteNoise)
uv run python manage.py collectstatic --noinput
```

## 🧪 Test Coverage & Qualitätssicherung

[![Tests](https://img.shields.io/badge/Tests-32%20Passed-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](file:///D:/dev/portfolio_project/portfolio/tests)
[![Coverage](https://img.shields.io/badge/Coverage-95%25-brightgreen?style=for-the-badge&logo=codecov&logoColor=white)](file:///D:/dev/portfolio_project/README.md)
[![Python](https://img.shields.io/badge/Python-3.13-blue?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![Code Style](https://img.shields.io/badge/Code%20Style-Ruff-black?style=for-the-badge&logo=ruff&logoColor=white)](https://docs.astral.sh/ruff/)
[![Type Check](https://img.shields.io/badge/Type%20Check-Mypy-2a6db0?style=for-the-badge&logo=python&logoColor=white)](https://mypy-lang.org/)

Die Test-Suite wird vollautomatisiert mit **Pytest** ausgeführt und deckt alle Kernfunktionalitäten (Custom User Model, Djoser Auth, SimpleJWT Bearer-Auth, DRF CRUD ViewSets, Health-Check und Model-Validierungen) ab.

### 📊 Detaillierte Coverage-Tabelle

```text
Name                                                   Stmts   Miss  Cover   Missing
------------------------------------------------------------------------------------
core\__init__.py                                           0      0   100%
core\settings.py                                          50      8    84%   104, 199-208
core\settings_test.py                                     15      0   100%
core\urls.py                                               8      0   100%
portfolio\__init__.py                                      0      0   100%
portfolio\admin.py                                        30      0   100%
portfolio\apps.py                                          4      0   100%
portfolio\management\__init__.py                           0      0   100%
portfolio\migrations\0001_initial.py                       7      0   100%
portfolio\migrations\__init__.py                           0      0   100%
portfolio\models.py                                       85      2    98%   23, 32
portfolio\serializers.py                                  14      0   100%
portfolio\tests\__init__.py                                0      0   100%
portfolio\tests\conftest.py                               22      0   100%
portfolio\tests\test_auth_api.py                          56      0   100%
portfolio\tests\test_drf_api.py                           52      0   100%
portfolio\tests\test_models.py                            75      0   100%
portfolio\tests\test_views.py                             25      0   100%
portfolio\views.py                                        53     13    75%   22, 29-30, 37-47, 59, 66-67
test_s3.py                                                15      2    87%   26-27
------------------------------------------------------------------------------------
TOTAL                                                    511     25    95%
```

### 🛡️ Test-Suiten & Module im Detail

| Modul / Suite | Abgedeckte Bereiche & Szenarien | Status |
|---|---|---|
| 🔐 **Auth & JWT (`test_auth_api.py`)** | • `POST /api/auth/jwt/create/` (Login & Token-Ausstellung)<br>• Ungültige Passwörter & inaktive Konten (401)<br>• `POST /api/auth/jwt/refresh/` & `verify/`<br>• Gesperrte Selbstregistrierung (`IsAdminUser`)<br>• User-Profil-Abfrage (`/api/auth/users/me/`) | <img src="https://img.shields.io/badge/9%2F9%20Passed-brightgreen" alt="9/9 passed"> |
| 🌐 **REST ViewSets (`test_drf_api.py`)** | • Authentifizierungsschutz aller CRUD-Endpunkte<br>• `ProjectViewSet` (Listen, Erstellen via JSON)<br>• `ProviderViewSet` (Listen, Erstellen)<br>• `CertificateViewSet` (Multipart-Uploads mit Dateien) | <img src="https://img.shields.io/badge/7%2F7%20Passed-brightgreen" alt="7/7 passed"> |
| 🗄️ **Modelle & Manager (`test_models.py`)** | • `User` & `UserManager` (create_user, create_superuser)<br>• Validierung von Superuser-Flags & E-Mail-Zwang<br>• Dynamische Pfad-Generierung (`certificate_upload_path`)<br>• Model-String-Repräsentationen (`__str__`) | <img src="https://img.shields.io/badge/11%2F11%20Passed-brightgreen" alt="11/11 passed"> |
| 🖥️ **Web Views (`test_views.py`)** | • Login-View Routing & HTTP-Methoden (GET, POST, PUT, DELETE)<br>• Health-Check-Endpunkt (`/health_check`)<br>• Status-Codes & Template-Rendering | <img src="https://img.shields.io/badge/5%2F5%20Passed-brightgreen" alt="5/5 passed"> |

> ℹ️ **Hinweis zur Testabdeckung**: `core/asgi.py` und `core/wsgi.py` sind über die Coverage-Konfiguration (`omit`) von der Abdeckungsmessung ausgeschlossen, da sie reine Server-Einstiegspunkte für ASGI/WSGI-Webserver sind. Die relevante Business-, Auth- und API-Logik erzielt eine Abdeckung von **95%**.

## 📁 Projektstruktur

```
portfolio_project/
├── core/
│   ├── settings.py          # Haupt-Settings (Prod + Dev + DRF + Djoser)
│   ├── settings_test.py     # Test-Settings (SQLite + Test Media)
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
│       ├── conftest.py      # Pytest-Fixtures (APIClient, Auth-Tokens, Testuser)
│       ├── test_auth_api.py # Djoser & SimpleJWT Endpoint-Tests
│       ├── test_drf_api.py  # DRF ViewSets & Permission-Tests
│       ├── test_models.py   # Models, UserManager & Upload-Path-Tests
│       └── test_views.py    # Session & HTML-View Tests
├── templates/
│   ├── login.html           # Login-Template mit integriertem Reset-Flow
│   └── dashboard.html       # Interaktives Vanilla CSS/JS Dashboard (CRUD)
├── build.sh                 # Render Build-Hook
├── render.yaml              # Render Deployment-Konfiguration
├── pyproject.toml           # Abhängigkeiten + Tool-Konfiguration (Ruff, Mypy)
└── pytest.ini               # Pytest-Konfiguration
```

