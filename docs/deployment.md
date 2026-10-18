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

Die Pipeline ist in [`.github/workflows/ci.yml`](file:///d:/dev/portfolio_project/.github/workflows/ci.yml) definiert, nutzt eine `concurrency`-Gruppe (`cancel-in-progress: true`) zur Vermeidung überlappender Läufe und umfasst 4 Jobs:

1. **`backend-lint-test`**:
   - Startet einen pro Run eindeutigen ephemeren Neon DB-Branch (`ci-${{ github.run_id }}-${{ github.run_attempt }}`) via `neondatabase/create-branch-action@v5`, damit parallele Läufe sich niemals gegenseitig den Test-Branch löschen.
   - Nutzt die direkte Neon-Compute-Verbindung (`steps.create-branch.outputs.db_url`) für `pytest`, um PgBouncer-Locks bei `CREATE DATABASE` und Schema-Migrationen (inkl. `pgvector` HNSW-Index) auszuschließen.
   - Führt Ruff Linter (`check`), Ruff Formatter Check (`format --diff`), Mypy und Pytest mit Coverage ($\ge 95\%$, 314 Tests) aus.
   - Bereinigt den eindeutigen Neon-Branch nach Testende (`always()`).
2. **`frontend-lint-test`**:
   - Führt `npm ci`, Oxlint, Vitest (82 Tests) und `npm run build` aus.
3. **`backend-build`**:
   - Validiert, dass Python 3.13 und Abhängigkeiten mit `uv` fehlerfrei auflösen.
   - Führt `python manage.py check`, `python manage.py makemigrations --check --dry-run` und `python manage.py collectstatic` im Produktionsmodus (`DEBUG=False`) durch.
   - **Wichtig**: Benötigt `defaults: run: working-directory: backend`.
4. **`deploy`**:
   - Triggert bei erfolgreichem Push auf `main` den Render Deploy Hook via `curl`.

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

