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

## Projektstruktur

```
portfolio_project/
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
```
