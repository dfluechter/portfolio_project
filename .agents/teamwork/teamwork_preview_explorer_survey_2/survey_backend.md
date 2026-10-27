# Backend & Database Architecture Reality Report

**Erstellt von:** Explorer 2 (Backend & Database Architecture Reality)  
**Datum:** 2026-10-23  
**Status:** Abgeschlossen  
**Zielpfad:** `d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_2\survey_backend.md`

---

## 1. Executive Summary

Dieser Bericht liefert eine vollständige, faktenbasierte Bestandsaufnahme der tatsächlichen Backend- und Datenbank-Architektur des Portfolio-Projekts im Vergleich zu den bestehenden Dokumentationen (`docs/architecture.md`, `README.md`, `docs/backlog.md`, `docs/ai-assistant-rag.md`, `render.yaml`, etc.).

### Kern-Erkenntnisse im Überblick:
1. **Django- und Python-Stack:**
   - **Python-Version:** Strikt **3.13** (belegt in `.python-version`, `render.yaml` Zeile 34, `backend/pyproject.toml` Zeile 9).
   - **Django-Version:** `backend/pyproject.toml` spezifiziert `django>=5.2`. Die tatsächliche in `backend/uv.lock` aufgelöste Version ist **Django 6.0.8** (Zeile 442). In fast allen Dokumenten (`docs/architecture.md`, `README.md`, `docs/AGENTS.md`) wird das Backend historisch noch als „Django 5.2“ bzw. „Django 5.2+“ bezeichnet.
   - **Headless-Architektur:** Django fungiert als reine Headless-JSON-REST-API mit Django REST Framework (DRF 3.17.1+), Djoser (2.3.3) und SimpleJWT (5.5.1). Die serverseitigen Templates wurden vollständig abgelöst.
2. **Dual-Database & Connection-Routing:**
   - **Produktion / Remote:** Neon Serverless PostgreSQL mit strikter Trennung von **Pooled Connection** (`DATABASE_URL` via PgBouncer für Web-Requests) und **Direct Connection** (`DIRECT_DATABASE_URL` für DDL-Migrationen via `IS_MIGRATION_COMMAND` in `core/settings.py`).
   - **Lokal / Fallback:** SQLite unter `backend/db.sqlite3` (`dj_database_url.config(default="sqlite:///...")`).
   - **Vector-Kompatibilität:** Migration `0014_knowledgechunk_pgvector.py` aktiviert `CREATE EXTENSION IF NOT EXISTS vector;` und erstellt den HNSW-Index (`using hnsw (embedding vector_cosine_ops)`) bedingt nur auf PostgreSQL (`connection.vendor == "postgresql"`). Auf SQLite greift das `VectorField`-Fallback in `portfolio/models.py` (Text-Typ).
3. **RAG / Vector Copilot Reality:**
   - **LLM-Modell:** Tatsächlich implementiert ist **Google Gemini 3.8 Flash** (`model="gemini-3.8-flash"` in `portfolio/services/ai_assistant.py` Zeile 586 sowie `render.yaml` Zeile 98).
   - **Embeddings:** `text-embedding-004` (768 Dimensionen) via `google-genai` SDK (`portfolio/services/embeddings.py`).
   - **Hybrid Retrieval:** `portfolio/services/retrieval.py` führt auf PostgreSQL CosineDistance-Suche aus; bei SQLite oder fehlenden Vektoren greift ein nahtloser Keyword-Fallback (`Q(title__icontains=...) | Q(content__icontains=...)`).
   - **Signals & $O(1)$ Caching:** `portfolio/signals.py` fängt `post_save` und `post_delete` aller Portfolio-Modelle ab, invalidiert den Rohkontext und inkrementiert atomar die Cache-Version `portfolio_rag_context_version_v1`.
4. **Gefundene Dokumentations- & Konfigurations-Inkonsistenzen:**
   - In `.env.example` (Zeile 64) steht noch das veraltete Modell `GEMINI_MODEL=gemini-2.5-flash`.
   - In `docs/adrs/007-rag-copilot-caching-guardrails.md` (Zeile 33) steht noch `gemini-2.5-flash`.
   - In `backend/portfolio/services/extractor.py` (Docstring Zeile 580) steht noch `Gemini 2.5 Flash Vision`.
   - In `render.yaml` (Zeilen 46–58) befindet sich ein ungelöster Git-Merge-Konflikt-Marker (`<<<<<<< HEAD` / `=======` / `>>>>>>> 92e9546`) sowie Syntaxfehler (`key: false`).
   - In `docs/architecture.md` (Tabelle 3.1) fehlen die implementierten Aktionen `bulk_approve` und `bulk_reject` auf `/api/pending-certificates/` sowie die Spezialroute `/api/auth/password-reset/`.

---

## 2. Detaillierte Analyse des Backend-Stacks

### 2.1 Python- & Django-Version
- **Python:**
  - Datei `.python-version`: `3.13`
  - Datei `backend/pyproject.toml` (Zeile 9): `requires-python = ">=3.13"`
  - Datei `render.yaml` (Zeile 34): `PYTHON_VERSION: 3.13.0`
- **Django:**
  - Spezifikation in `backend/pyproject.toml` (Zeile 11): `"django>=5.2"`
  - Fixierte Version in `backend/uv.lock` (Zeilen 441–442):
    ```toml
    [[package]]
    name = "django"
    version = "6.0.8"
    ```
  - Dokumentations-Realität: In der Dokumentation (`docs/architecture.md`, `docs/AGENTS.md`, `README.md`, `docs/wiki/System-Architecture.md`) wird durchgängig von `Django 5.2` oder `Django 5.2+` gesprochen. Technisch läuft das Projekt auf Django 6.0.8 (vollständig abwärtskompatibel zu Django 5.2).

### 2.2 Installierte Apps & Konfiguration (`backend/core/settings.py`)
In `backend/core/settings.py` (Zeilen 63–76):
```python
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "storages",
    "rest_framework",
    "djoser",
    "drf_spectacular",
    "portfolio",
]
```

**Besondere Architektur-Einstellungen:**
- **Custom User Model:** `AUTH_USER_MODEL = "portfolio.User"` (Zeile 285). E-Mail-basierte Authentifizierung (`LOGIN_FIELD = "email"`, kein `username`).
- **Headless & JWT Auth:**
  - `rest_framework_simplejwt.authentication.JWTAuthentication` als primäre Authentifizierungsklasse, gefolgt von `SessionAuthentication` für den Django-Admin (Zeilen 294–300).
  - Standardberechtigung: `IsAuthenticated` (Zeile 301).
  - Öffentliche Registrierung, Account-Löschung und Benutzername-Update sind in Djoser strikt auf `IsAdminUser` gesperrt (Zeilen 331–338).
- **Throttling Rates:**
  - `anon`: `60/minute`
  - `ai_chat`: `20/minute` (Zeilen 303–306).
- **Media-Storage (Supabase S3 via `django-storages` + `boto3`):**
  - Gesteuert über `USE_SUPABASE_S3` (Zeilen 210–262).
  - Bei `True`: `storages.backends.s3.S3Storage` mit `addressing_style = "path"`, `signature_version = "s3v4"`, `file_overwrite = False`.
  - Bei `False`: `FileSystemStorage` unter `backend/media/`.

### 2.3 Tatsächliche URLs & Views (`backend/core/urls.py` & `portfolio/views.py`)

#### DefaultRouter Endpunkte unter `/api/`:
Registriert in `backend/core/urls.py` (Zeilen 23–32):
| Präfix | ViewSet | Basename | Berechtigung & Besonderheiten |
|---|---|---|---|
| `/api/projects/` | `ProjectViewSet` | `project` | Read: öffentlich (`is_published=True`), Write: Auth (`IsAuthenticated`). Conditional Cache (`ETag`). |
| `/api/providers/` | `ProviderViewSet` | `provider` | Read: öffentlich, Write: Auth. `DELETE` liefert `409 Conflict`, wenn verknüpfte Zertifikate existieren. |
| `/api/certificates/` | `CertificateViewSet` | `certificate` | Read: öffentlich (`is_published=True`), Write: Auth. Paginierung (`StandardResultsSetPagination`), Filter nach Track, Provider, incomplete. |
| `/api/skills/` | `SkillViewSet` | `skill` | Read: öffentlich, Write: Auth. Conditional Cache (`ETag`). |
| `/api/timeline/` | `TimelineEntryViewSet` | `timeline` | Read: öffentlich, Write: Auth. Conditional Cache (`ETag`). |
| `/api/tracks/` | `TrackViewSet` | `track` | Read: öffentlich, Write: Auth. FontAwesome SVG-Icon Sync (`_sync_track_icon`). |
| `/api/pending-certificates/` | `PendingCertificateViewSet` | `pendingcertificate` | Nur Staff (`IsAdminUser`). Verwaltet die Inbox für importierte/gescannte Zertifikate. |

#### Custom Actions auf ViewSets:
- **`CertificateViewSet`:**
  - `POST /api/certificates/presigned_upload/` (`detail=False`): Signierte S3-URL für Direct-to-Storage Upload.
  - `POST /api/certificates/<id>/publish/` (`detail=True`): Validiert Track-Pflicht ($\ge 1$ Track), sichert Datei im S3 und setzt `is_published=True`.
  - `POST /api/certificates/<id>/unpublish/` (`detail=True`): Setzt `is_published=False`.
  - `POST /api/certificates/<id>/extract_metadata/` (`detail=True`): On-Demand Extraktion (3-Stufen-Kaskade) als Vorschlag.
- **`PendingCertificateViewSet`:**
  - `POST /api/pending-certificates/<id>/approve/` (`detail=True`): Einzelabnahme und Beförderung zu `Certificate`.
  - `POST /api/pending-certificates/<id>/reject/` (`detail=True`): Ablehnung eines Inbox-Kandidaten.
  - `POST /api/pending-certificates/bulk_approve/` (`detail=False`): Gleichzeitige Freigabe mehrerer IDs mit optionalen `track_ids` (aus US 14.2).
  - `POST /api/pending-certificates/bulk_reject/` (`detail=False`): Gleichzeitige Ablehnung mehrerer IDs (aus US 14.2).
  - `GET /api/pending-certificates/<id>/file/` (`detail=True`): Inline `FileResponse` für die Dokumentenvorschau im Admin/Dashboard.

#### Direkte URL-Routen (`core/urls.py`):
| Pfad | View / Handler | Name | Beschreibung |
|---|---|---|---|
| `/` | `api_root_view` | `backend-root` | HTML: Redirect auf `/api/docs/`; JSON: Statusübersicht mit Links. |
| `/admin/` | `admin.site.urls` | – | Django Admin Backoffice für Superuser. |
| `/health_check` | `health_check_view` | `health_check` | `{"status": "ok"}` für Render Health-Checks. |
| `/api/ai/chat/` | `AIChatView.as_view()` | `ai-chat` | Öffentlicher RAG Portfolio-Copilot (Gemini 3.8 Flash, Scoped Throttle `ai_chat`: 20/min). |
| `/api/auth/password-reset/` | `PasswordResetRequestView.as_view()` | `password-reset-request` | Versendet Reset-Mail an `PORTFOLIO_OWNER_EMAIL`. |
| `/api/auth/` | `include("djoser.urls")` | – | Djoser User Management (`users/me/`, `users/reset_password/`, etc.). |
| `/api/auth/` | `include("djoser.urls.jwt")` | – | JWT Token Auth (`jwt/create/`, `jwt/refresh/`, `jwt/verify/`). |
| `/api/schema/` | `SpectacularAPIView.as_view()` | `schema` | OpenAPI 3.0 YAML/JSON Schema. |
| `/api/docs/` | `SpectacularSwaggerView.as_view()` | `swagger-ui` | Swagger-UI Dokumentation. |

---

## 3. Datenbank-Setup & Dual-Database Reality

### 3.1 Dual-Database Logik (`backend/core/settings.py`)
In `backend/core/settings.py` (Zeilen 124–160):
- **Zwei Verbindungsstrings für Neon:**
  - `DATABASE_URL`: Gepoolte PgBouncer-Verbindung (`-pooler` Host). Genutzt für den Gunicorn Web-Betrieb zur ressourcenschonenden Skalierung (`conn_max_age=600`, `conn_health_checks=True`).
  - `DIRECT_DATABASE_URL`: Direkte Neon-Compute-Verbindung (ohne `-pooler`). Zwingend erforderlich für DDL-Migrationen, da PgBouncer vorbereitete Statements und exklusive Transaktionssperren blockiert.
- **Dynamisches Connection-Routing:**
  ```python
  IS_MIGRATION_COMMAND = (
      any(cmd in sys.argv for cmd in ["migrate", "makemigrations", "showmigrations", "sqlmigrate"])
      or os.getenv("RUNNING_MIGRATION") == "1"
  )
  EFFECTIVE_DB_URL = (
      DIRECT_DATABASE_URL
      if (IS_MIGRATION_COMMAND and DIRECT_DATABASE_URL)
      else (DATABASE_URL or DIRECT_DATABASE_URL)
  )
  ```
- **Lokaler SQLite-Fallback:**
  Wird weder `DATABASE_URL` noch `DIRECT_DATABASE_URL` konfiguriert, schaltet Django automatisch auf SQLite um:
  `sqlite:///{BASE_DIR / 'db.sqlite3'}`.

### 3.2 Migrationen & pgvector vs. SQLite Kompatibilität
Die Migrationen liegen in `backend/portfolio/migrations/` (14 durchnummerierte Migrationen):
- **Migration `0014_knowledgechunk_pgvector.py`:**
  - Führt `CREATE EXTENSION IF NOT EXISTS vector;` und `CREATE INDEX IF NOT EXISTS chunk_vector_hnsw_idx ON portfolio_knowledgechunk USING hnsw (embedding vector_cosine_ops);` über `RunPython` aus.
  - Prüft strikt: `if schema_editor.connection.vendor == "postgresql":`.
  - Bei SQLite wird der DDL-Befehl sauber übersprungen.
- **Modell-Fallback in `backend/portfolio/models.py` (Zeilen 15–36):**
  Falls `from pgvector.django import VectorField` fehlschlägt oder SQLite aktiv ist, liefert die Klasse `VectorField` bei `db_type(connection)`:
  - Bei PostgreSQL: `vector(768)`
  - Bei SQLite: `text`
  Dadurch läuft die gesamte Codebase und Test-Suite ohne Vorbedingungen auf SQLite lokal durch.

---

## 4. RAG / Vector Copilot Reality

### 4.1 Modell-Verifikation: Gemini 3.8 Flash
- In `backend/portfolio/services/ai_assistant.py` (Zeile 586):
  ```python
  response = client.models.generate_content(
      model="gemini-3.8-flash",
      contents=contents,
      config=types.GenerateContentConfig(
          system_instruction=system_instruction,
          temperature=0.3,
          max_output_tokens=600,
      ),
  )
  ```
- In `backend/portfolio/services/extractor.py` (Zeile 661):
  ```python
  gemini_model: str = str(model or os.getenv("GEMINI_MODEL") or "gemini-3.8-flash")
  ```
- In `render.yaml` (Zeile 98):
  ```yaml
  - key: GEMINI_MODEL
    value: "gemini-3.8-flash"
  ```
- In `backend/portfolio/services/embeddings.py` (Zeile 17):
  ```python
  DEFAULT_EMBEDDING_MODEL = "text-embedding-004"
  EMBEDDING_DIMENSIONS = 768
  ```

### 4.2 Hybrid Retrieval Pipeline (`portfolio/services/retrieval.py`)
1. **PostgreSQL/Neon mit pgvector:**
   Wenn `is_pgvector_active()` (`connection.vendor == "postgresql"`) und Embeddings in `KnowledgeChunk` existieren:
   - Erzeugt Query-Embedding via `generate_embedding(clean_query)` (`text-embedding-004`).
   - Berechnet semantische Ähnlichkeit via `CosineDistance("embedding", query_vec)` und sortiert nach `distance` (Top-$K$, Standard limit=5).
2. **SQLite / Zero-Embedding Fallback:**
   - Heuristisches Keyword-Retrieval über Wörter der Anfrage (> 2 Zeichen):
     `Q(title__icontains=word) | Q(content__icontains=word)`.
   - Fallback auf die neuesten Chunks (`order_by("-updated_at")[:limit]`).

### 4.3 Signals, Cache-Invalidierung & Response-Caching
- **Signals (`backend/portfolio/signals.py`):**
  - Lauscht auf `post_save` und `post_delete` für `Project`, `Skill`, `Certificate`, `TimelineEntry`, `Provider`, `Track`.
  - `invalidate_portfolio_cache()`:
    - Löscht den Rohkontext-Cache: `cache.delete(GROUNDING_CACHE_KEY)`.
    - Inkrementiert atomar die Cache-Version: `cache.incr(RAG_VERSION_KEY)`.
  - Synchronisiert die Chunks: `sync_chunks_for_instance(instance, generate_embeddings=False)`. (Embeddings werden im Web-Request zur Schonung von Latenz und Token-Budget nicht synchron berechnet; dafür dient `python manage.py index_rag_chunks --with-embeddings`).
- **Response Caching (`portfolio_ai_resp_v{version}_{query_hash}`):**
  - Wiederkehrende Single-Turn-Fragen werden für 1 Stunde gecacht.
  - Durch das Inkrementieren von `version` in $O(1)$ verfallen alle veralteten Antwort-Caches sofort ohne teure Wildcard-Operationen.
- **HTTP Conditional Caching (ETags):**
  - Alle ViewSets nutzen `ConditionalCacheMixin` (`views.py` Zeilen 135–216).
  - Schwache ETags (`W/"<ressource>_<version>"`) basieren auf derselben atomaren Version `RAG_VERSION_KEY`.
  - Wenn der Client `If-None-Match` sendet und die Version übereinstimmt, liefert Django sofort `304 Not Modified` zurück, ohne die Datenbank abzufragen.

### 4.4 Zero-Cost Circuit Breaker & Guardrails
- **Pre-Flight Injection Defense:** `INJECTION_REGEX` (`ai_assistant.py` Zeilen 35–47) fängt Jailbreak- und Prompt-Injection-Muster ab und liefert sofort eine neutrale Antwort (0 LLM-Tokens verbraucht).
- **Längenbegrenzung:** Max. 500 Zeichen pro Eingabe (`AIChatView`).
- **Budget-Schutz:** `GEMINI_DAILY_TOKEN_LIMIT` (Standard 50.000) und `GEMINI_DAILY_REQUEST_LIMIT` (Standard 100) im Cache. Bei Erreichen schlägt der Circuit-Breaker an und deaktiviert KI-Aufrufe für 24 Stunden, um jegliche unerwarteten Cloud-Kosten sicher auszuschließen.

---

## 5. Dokumentations- & Konfigurations-Inkonsistenzen

Die Untersuchung hat folgende konkrete Abweichungen zwischen Codebase und Dokumentation identifiziert:

| ID | Datei / Ort | Dokumentierter Stand / Befund | Tatsächlicher Codebase-Stand | Handlungsbedarf / Korrektur |
|---|---|---|---|---|
| **D1** | `.env.example` (Z. 64) | `GEMINI_MODEL=gemini-2.5-flash` | Codebase nutzt `gemini-3.8-flash` | Ändern auf `GEMINI_MODEL=gemini-3.8-flash` |
| **D2** | `docs/adrs/007-rag-copilot-caching-guardrails.md` (Z. 33) | `Google Gemini (gemini-2.5-flash)` | LLM-Aufruf nutzt `gemini-3.8-flash` | Aktualisieren auf `gemini-3.8-flash` |
| **D3** | `backend/portfolio/services/extractor.py` (Z. 580) | Docstring: `Gemini 2.5 Flash Vision` | Implementierung nutzt `gemini-3.8-flash` | Docstring anpassen auf `Gemini 3.8 Flash Vision` |
| **D4** | `render.yaml` (Z. 46–58) | Ungelöster Git-Merge-Konflikt (`<<<<<<< HEAD` ... `>>>>>>> 92e9546`) | Ungültiges YAML! Syntaxfehler `key: false` bei `PORTFOLIO_OWNER_NAME` / `PORTFOLIO_OWNER_EMAIL` | Merge-Konflikt bereinigen und `sync: false` setzen |
| **D5** | `docs/architecture.md` (Tabelle 3.1) | Aktionen `bulk_approve` und `bulk_reject` fehlen | In `portfolio/views.py` implementiert (`PendingCertificateViewSet`) | Tabelle 3.1 um `POST /api/pending-certificates/bulk_approve/` und `bulk_reject/` ergänzen |
| **D6** | `docs/architecture.md` (Tabelle 3.4) | `/api/auth/password-reset/` fehlt (nur Djoser-Endpunkt erwähnt) | `PasswordResetRequestView` in `core/urls.py` und `portfolio/views.py` aktiv | Endpunkt `/api/auth/password-reset/` in Tabelle 3.4 aufnehmen |
| **D7** | `docs/architecture.md`, `README.md`, `docs/AGENTS.md` | Durchgängig „Django 5.2“ bzw. „Django 5.2+“ | In `backend/uv.lock` ist exakt `django = 6.0.8` fixiert | Klarstellung: „Django 6.0 (kompatibel mit Django 5.2+)“ |
| **D8** | `backend/apps/` | Verzeichnis `backend/apps/portfolio/` existiert mit leeren/pycache Ordnern | App ist `backend/portfolio/` (in `INSTALLED_APPS = ['portfolio']`) | Dokumentieren, dass `backend/apps/` historisches Relikt ist |

---

## 6. Einhaltung der Schutzregeln (`CERTIFICATES_PATH`)

- **Schutzregel-Status:** **STRIKT EINGEHALTEN.**
- **Prüfung:**
  - Der Pfad `CERTIFICATES_PATH` wird ausschließlich lesend verwendet (Hash-Berechnung mit SHA-256 in 8KB-Blöcken, Metadaten-Extraktion via `pypdf`/`pytesseract`/`gemini_vision`, Stream-Kopieren in S3-Storage).
  - Weder Quellzertifikate noch Quellordner werden verändert, umbenannt oder gelöscht.
  - Bei Beförderung (`promote_pending_certificate`) verbleibt die Quelldatei unverändert; die Datei wird als Binärstrom in den S3-Storage übertragen.

---

## 7. Fazit & Empfehlungen für nachfolgende Teams

1. **Harmonisierung der Markdown-Dokumente:**
   - In `.env.example`, `ADR-007` und `extractor.py` alle verbleibenden Referenzen auf `gemini-2.5-flash` durch `gemini-3.8-flash` ersetzen.
   - In `docs/architecture.md` die Tabellen für Custom Actions und Auth-Endpunkte mit der Realität abgleichen (`bulk_approve`, `bulk_reject`, `password-reset`).
   - Die Erwähnung der Django-Version auf „Django 6.0 (Abhängigkeit `django>=5.2`)“ präzisieren.
2. **Kritischer Fix in `render.yaml`:**
   - Der Git-Merge-Konflikt-Marker in `render.yaml` muss dringend aufgelöst werden, da dies bei einem Render-Blueprint-Sync zu Fehlern führt.
