# Deployment & Operations Leitfaden

Dieses Dokument beschreibt den Deployment-Prozess auf Render, die CI/CD-Pipeline in GitHub Actions sowie die Konfiguration von Neon Serverless PostgreSQL.

---

## 1. Systemübersicht Deployment

```mermaid
flowchart LR
    subgraph GitHub["GitHub Repository"]
        Commit["Git Push / PR (main)"]
        CI["GitHub Actions CI Pipeline<br>(.github/workflows/ci.yml)"]
    end

    subgraph Neon["Neon Serverless PostgreSQL"]
        Branch["Ephemerer CI Branch<br>(neondatabase/create-branch-action)"]
        ProdDB[("Produktions-Datenbank")]
    end

    subgraph Render["Render Web Service"]
        DeployHook["Render Deploy Hook (curl)"]
        BuildHook["backend/build.sh<br>(collectstatic & migrate)"]
        Gunicorn["Gunicorn WSGI Server"]
    end

    Commit --> CI
    CI -->|Erstellt temporären Branch| Branch
    CI -->|Führt Pytest/Vitest/Linter aus| CI
    CI -->|Löscht ephemeren Branch| Branch
    CI -->|Push auf main| DeployHook
    DeployHook --> BuildHook
    BuildHook --> Gunicorn
    Gunicorn --> ProdDB
```

---

## 2. Render Web Service Konfiguration

### 2.1 Konfiguration (`render.yaml`)
Der Backend-Service ist als Web-Service mit Python-Environment deklariert:
```yaml
services:
  - type: web
    name: portfolio-backend
    env: python
    rootDir: backend
    buildCommand: bash build.sh
    startCommand: uv run gunicorn core.wsgi:application
    healthCheckPath: /health_check
```

### 2.2 Ausführungskontext von `build.sh`
Das primäre Build-Skript liegt unter [`backend/build.sh`](file:///d:/dev/portfolio_project/backend/build.sh). Zusätzlich existiert im Projekt-Root ein resilientes Fallback-Skript [`build.sh`](file:///d:/dev/portfolio_project/build.sh), falls der Service im Render Dashboard ohne konfiguriertes `rootDir` (d. h. im Repository-Root) gestartet wird. Es wechselt automatisch in `backend/` und führt das Backend-Build-Skript aus:

```bash
#!/usr/bin/env bash
set -o errexit

uv sync --frozen --no-dev
uv run python manage.py collectstatic --noinput

# Für Schema-Migrationen DIRECT_DATABASE_URL priorisieren (PgBouncer-Bypass)
if [ -n "${DIRECT_DATABASE_URL:-}" ]; then
    echo "==> Führe Migrationen mit direkter Neon-Verbindung (DIRECT_DATABASE_URL) aus..."
    RUNNING_MIGRATION=1 uv run python manage.py migrate --noinput
else
    echo "==> Führe Migrationen mit Standard-Verbindung aus..."
    uv run python manage.py migrate --noinput
fi

echo "==> Synchronisiere RAG Knowledge Chunks (Initial- & Delta-Indizierung)..."
uv run python manage.py index_rag_chunks
```

### 2.3 Neon PostgreSQL: Trennung von Pooled- und Direct-Connection
Neon Serverless PostgreSQL bietet zwei Verbindungstypen mit spezifischen Anwendungsfällen:

- **Gepoolte Verbindung (`DATABASE_URL`):**
  - Host enthält `-pooler` (z. B. `ep-xyz-pooler.eu-central-1.aws.neon.tech`).
  - Nutzt PgBouncer im Transaction-Pooling-Modus.
  - **Einsatz:** Regulärer Web-Betrieb (Gunicorn-Worker), um Tausende gleichzeitiger Requests effizient abzufedern und Verbindungsressourcen zu schonen.
- **Direkte Verbindung (`DIRECT_DATABASE_URL`):**
  - Host ohne `-pooler` (z. B. `ep-xyz.eu-central-1.aws.neon.tech`).
  - Direkte Verbindung zur Neon-Compute-Instanz.
  - **Einsatz:** Schema-Migrationen (`python manage.py migrate`), `pg_dump`, `pg_restore` und DDL-Operationen, da PgBouncer Session-Status, Prepared Statements und DDL-Sperren blockieren kann.

In `core/settings.py` prüft Django automatisch, ob ein Migrationsbefehl aktiv ist (`migrate`, `makemigrations`, `RUNNING_MIGRATION=1`), und priorisiert in diesem Fall `DIRECT_DATABASE_URL` mit `conn_max_age=0`.

---

## 3. GitHub Actions CI/CD Pipeline

Die Pipeline ist in [`.github/workflows/ci.yml`](file:///d:/dev/portfolio_project/.github/workflows/ci.yml) definiert, nutzt eine `concurrency`-Gruppe (`cancel-in-progress: true`) zur Vermeidung überlappender Läufe und umfasst folgende Jobs:

0. **`evaluate-commit` (Erkennung & Skip unnötiger Builds)**:
   - Prüft die HEAD-Commit-Message bzw. den PR-Titel auf Conventional-Commit-Typen (`docs:` oder `style:`, optional mit Scope z. B. `docs(readme):` oder `style(css):`).
   - Wenn der Commit ausschließlich Dokumentation oder Code-Formatting/Styles betrifft, setzt der Job `skip_build_and_deploy=true`.
   - Dadurch werden nachfolgend der Produktions-Artefakt-Build (`backend-build`) und das automatische Server-Deployment (`deploy`) übersprungen.
   - Tests und Linter (`backend-lint-test`, `frontend-lint-test`) laufen dennoch, um Format- und Qualitätskriterien sicherzustellen.
1. **`backend-lint-test`**:
   - Startet einen pro Run eindeutigen ephemeren Neon DB-Branch (`ci-${{ github.run_id }}-${{ github.run_attempt }}`) via `neondatabase/create-branch-action@v5`, damit parallele Läufe sich niemals gegenseitig den Test-Branch löschen.
   - Nutzt die direkte Neon-Compute-Verbindung (`steps.create-branch.outputs.db_url`) für `pytest`, um PgBouncer-Locks bei `CREATE DATABASE` und Schema-Migrationen (inkl. `pgvector` HNSW-Index) auszuschließen.
   - Führt Ruff Linter (`check`), Ruff Formatter Check (`format --diff`), Mypy und Pytest mit Coverage ($\ge 95\%$, 314 Tests) aus.
   - Bereinigt den eindeutigen Neon-Branch nach Testende (`always()`).
2. **`frontend-lint-test`**:
   - Führt `npm ci`, Oxlint, Vitest (82 Tests) und `npm run build` aus.
3. **`backend-build` (Produktions-Artefakt-Verifikation)**:
   - Läuft nur, wenn `evaluate-commit.outputs.skip_build_and_deploy != 'true'`.
   - Validiert, dass Python 3.13 und Abhängigkeiten mit `uv` fehlerfrei auflösen.
   - Führt `python manage.py check`, `python manage.py makemigrations --check --dry-run` und `python manage.py collectstatic` im Produktionsmodus (`DEBUG=False`) durch.
   - **Wichtig**: Benötigt `defaults: run: working-directory: backend`.
4. **`deploy` (Zero-Downtime Server-Deployment)**:
   - Läuft nur bei erfolgreichem Push auf `main` und wenn `evaluate-commit.outputs.skip_build_and_deploy != 'true'`.
   - Triggert den Render Deploy Hook via `curl` mit Retry-Logik.
   - In [render.yaml](file:///d:/dev/portfolio_project/render.yaml) sind `autoDeployTrigger: off` und `buildFilter` (ignoriert `*.md`, `docs/**`) hinterlegt, sodass Render nicht bei jedem Git-Push unkoordiniert neu baut, sondern strikt dem GitHub Actions Freigabe-Signal folgt.

### 3.1 Code Ownership & PR-Governance (`.github/CODEOWNERS`)
Über [`.github/CODEOWNERS`](file:///d:/dev/portfolio_project/.github/CODEOWNERS) sind kritische Pfade im Repository explizit geschützt (`@dfluechter` bzw. erweiterbar auf GitHub-Teams wie `@org/devops` oder `@org/security`):
- **CI/CD & Deployment:** `/.github/workflows/`, `/render.yaml`, `/build.sh`, `/backend/build.sh`
- **Backend Security & Schema:** `/backend/core/settings.py`, `/backend/portfolio/migrations/`, `/backend/portfolio/services/`, `/backend/pyproject.toml`
- **Frontend Auth & Build:** `/frontend/src/api/`, `/frontend/src/context/`, `/frontend/vite.config.ts`
- **Governance & Schutzregeln:** `/AGENTS.md`, `/.agents/`, `/docs/adrs/`

In Kombination mit der GitHub Branch-Protection-Regel *"Require review from Code Owners"* auf `main` erzwingt dies automatische Review-Zuweisungen bei Pull Requests auf kritischen Infrastruktur- und Sicherheitspfaden.

### 3.2 Automatisierte Qualitätssicherung durch Git-Hooks und Commitlint

Lokale Git-Hooks fungieren als erste Verteidigungslinie. Mithilfe von Werkzeugen wie *Husky* wird der `commit-msg`-Hook genutzt, um Formatierungs- und Syntaxfehler im Vorfeld zu verhindern.

Die Validierung der Commit-Nachrichten folgt der *Conventional Commits*-Spezifikation:
```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Zulässige Commit-Typen ([`.commitlintrc.json`](file:///d:/dev/portfolio_project/.commitlintrc.json)):

* `build`: Änderungen an Build-Systemen, CI-Pipelines oder Abhängigkeiten.
* `chore`: Administrative Aufgaben, die keinen Anwendungscode betreffen.
* `enh`: Verbesserungen bestehender Funktionalitäten.
* `docs`: Reine Dokumentationsänderungen.
* `feat`: Einführung neuer Funktionen.
* `fix`: Behebung von Softwarefehlern.
* `perf`: Performance-Optimierungen.
* `refactor`: Code-Umstrukturierungen ohne Funktionsänderung oder Bugfix.
* `revert`: Rücknahme vorheriger Commits.
* `style`: Formatierungen, fehlende Semikolons, Reformatierung von Whitespaces.
* `test`: Ergänzung oder Korrektur von automatisierten Tests.

#### Formale Regeln für Commit-Nachrichten:

* **Verwendung des Imperativs im Präsens:** z. B. `change` statt `changed` oder `changes`.
* **Kleinschreibung des Subjects:** `subject-case` ist strikt `lower-case`.
* **Kein Punkt (`.`) am Ende des Headers:** Verhindert Satzzeichen im Einzeiler.
* **Maximale Header-Länge:** 72 Zeichen (`header-max-length`).
* **Konfigurierte Casing-Regeln:** Der Scope unterstützt `camelCase`, `kebab-case` (z. B. für Dependabot `deps-backend`, `deps-frontend`) und `lower-case` (`scope-case`), das Subject ist strikt in Kleinschreibung (`lower-case`).
* **Optionaler Footer:** Kennzeichnung von Breaking Changes mit `BREAKING CHANGE:`, Angabe von Ticket-Referenzen (z. B. `refers to JIRA-1337`) oder Co-Autoren (`Co-authored-by:`).

#### Lokale Ausführung via Husky ([`.husky/commit-msg`](file:///d:/dev/portfolio_project/.husky/commit-msg))
Bei jedem Aufruf von `git commit` wird der Hook vor dem eigentlichen Commit ausgeführt:
```bash
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1"
```
Verstößt eine Commit-Nachricht gegen die Konvention (z. B. Großschreibung im Subject, falscher Scope-Casing oder ungültiger Typ), wird der Commit lokal mit einer präzisen Fehlermeldung abgelehnt, bevor er in den Git-Verlauf gelangt.

#### Synergie mit der CI/CD-Pipeline (`evaluate-commit`)
Die strikte Einhaltung der Conventional Commits ermöglicht in [`.github/workflows/ci.yml`](file:///d:/dev/portfolio_project/.github/workflows/ci.yml) intelligente Skip-Entscheidungen:
- **`docs(...)` & `style(...)`**: Der teure Server-Build (`backend-build`) und das Deployment (`deploy`) werden automatisch übersprungen.
- **`feat(...)`, `fix(...)` & `enh(...)`**: Führen den vollständigen Test- und Deployment-Zyklus aus.

---

## 4. Benötigte Secrets & Umgebungsvariablen

| Variable | Scope | Zweck |
|---|---|---|
| `NEON_PROJECT_ID` | GitHub Actions Secret | ID des Neon-Projekts für ephemere Test-Branches |
| `NEON_API_KEY` | GitHub Actions Secret | API-Key für Neon Management CLI (`neonctl`) |
| `RENDER_DEPLOY_HOOK_URL` | GitHub Actions Secret | Webhook-URL zum Starten des Render-Deployments |
| `DATABASE_URL` | Render Environment | Gepoolter Connection-String (`-pooler`) für Gunicorn |
| `DIRECT_DATABASE_URL` | Render Environment | Direkter Connection-String (ohne `-pooler`) für Schema-Migrationen |
| `SECRET_KEY` | Render Environment | Django Secret Key |
| `USE_SUPABASE_S3` | Render Environment | `True` aktiviert den S3-Storage via `django-storages` |
| `AWS_ACCESS_KEY_ID` | Render Environment | Supabase S3 Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | Render Environment | Supabase S3 Secret Access Key |
| `AWS_STORAGE_BUCKET_NAME` | Render Environment | Name des Supabase Storage Buckets (z. B. `portfolio-media`) |
| `AWS_S3_ENDPOINT_URL` | Render Environment | S3-Endpunkt (`https://<project-ref>.supabase.co/storage/v1/s3`) |
| `AWS_S3_REGION_NAME` | Render Environment | Region (z. B. `eu-central-1`) |
| `AWS_S3_PUBLIC_BUCKET` | Render Environment | `True` für dauerhafte Direkt-URLs, `False` für signierte URLs |
| `SUPABASE_PUBLIC_MEDIA_URL` | Render Environment | Öffentliche CDN-Basis-URL des Buckets |
| `GEMINI_API_KEY` | Render Environment | API-Key für Google Gemini 3.8 Flash (RAG Portfolio-Copilot & multimodale OCR) |
| `VITE_API_URL` | Render Frontend | Basis-URL des Backend-Webservices (z. B. `https://portfolio-backend.onrender.com`) |

---

## 5. Supabase Storage: CORS-Konfiguration für Direct-to-Storage Uploads

Da der Browser beim Direct-to-Storage Upload (User Story 10.1) Binärdateien direkt per `HTTP PUT` an den Supabase-S3-Endpunkt sendet, muss im Supabase-Projekt eine CORS-Regel für den Bucket hinterlegt sein:

```json
[
  {
    "AllowedOrigins": [
      "https://portfolio.onrender.com",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Diese Konfiguration kann über das Supabase Dashboard (Storage $\rightarrow$ Bucket Configuration $\rightarrow$ CORS Policies) oder über die AWS/S3-kompatible API hinterlegt werden.
