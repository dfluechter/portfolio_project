# 🧪 Teststrategie & Qualitätssicherung

Diese Seite beschreibt die Testpyramide, die zu prüfenden Authentifizierungs- und API-Endpunkte sowie die CI/CD- und Render-Deployment-Checks des Projekts.

---

## 1. Technologie-Stack & Testziele

* **Stack:** Django 5.x, Django REST Framework, Djoser, SimpleJWT, PostgreSQL (Neon / Supabase), Render Deployment, `pytest` + `pytest-django`, `Vitest`, GitHub Actions CI/CD.
* **Ziele:**
  - Korrekte JWT-Authentifizierung & Token-Rotation
  - Stabile Djoser-Endpunkte (`/api/auth/`)
  - Datenintegrität & reproduzierbare Migrationen in PostgreSQL
  - Sichere Benutzerverwaltung & granulare Berechtigungen
  - Erfolgreiches Zero-Downtime-Deployment auf Render (`/health/` & `/health_check`)
  - Frühzeitige Regressionserkennung bei Code-Änderungen

---

## 2. Testpyramide

| Ebene | Anteil | Fokus |
|---|---|---|
| **Unit-Tests** | ~70 % | Models (`__str__`, Methoden), Services (Promotion, RAG, Vision, S3), Utility-Funktionen, Permissions, Serializer |
| **Integrationstests** | ~20 % | Zusammenspiel API ↔ Serializer ↔ DB, Djoser ↔ SimpleJWT, DRF ↔ Permissions |
| **End-to-End / Workflows** | ~10 % | Vollständige Abläufe: Login → JWT → Geschützte Ressource, Passwort-Reset-Flow, Zertifikats-Freigabe |

---

## 3. Djoser- & SimpleJWT-Endpunkte

* **Registrierung (`POST /api/auth/users/`):** Gültige Anlage durch Admin, Sperre für anonyme Nutzer (`401`/`403`), doppelte E-Mail (`400`), schwaches Passwort (`400`), fehlende Pflichtfelder (`400`).
* **JWT Login (`POST /api/auth/jwt/create/`):** Gültige Credentials (`200`), falsches Passwort (`401`), unbekannte E-Mail (`401`), inaktiver Nutzer (`401`).
* **JWT Refresh (`POST /api/auth/jwt/refresh/`):** Gültiger Refresh-Token (`200`), abgelaufener Token (`401`), manipulierter Token (`401`).
* **Benutzerprofil (`GET /api/auth/users/me/`):** Authentifizierter Zugriff (`200`), anonymer Zugriff (`401`), abgelaufenes JWT (`401`).

---

## 4. Datenbank-, Security- & Deployment-Tests

* **PostgreSQL Constraints & Migrationen:**
  - Eindeutigkeit der Benutzer-E-Mail (`IntegrityError` bei Duplikaten).
  - Synchronität der Migrationen via `python manage.py makemigrations --check --dry-run`.
* **Render Health-Check (`GET /health/` & `GET /health_check`):**
  - Liefert `200 OK` mit `{"status": "ok"}` bei aktiver Datenbankverbindung bzw. `503 Service Unavailable` bei DB-Ausfall.
* **CI/CD Pipeline:**
  1. `ruff check .` & `ruff format --check .`
  2. `mypy .`
  3. `pytest --cov=portfolio --cov-fail-under=95`
  4. Frontend: `npm ci`, `npm run lint`, `npm run test:run`, `npm run build`

---

## 5. Coverage-Ziele

| Bereich | Zielvorgabe |
|---|---|
| **Models** | ≥ 95 % |
| **Serializer** | ≥ 90 % |
| **Services** | ≥ 90 % |
| **API Views** | ≥ 85 % |
| **Gesamt** | **≥ 85 %** (CI-Gate: **≥ 95 %**) |
