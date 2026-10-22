# System- und Architektur-Dokumentation

Diese Dokumentation beschreibt Architektur, Datenfluss, API-Endpunkte sowie das Authentifizierungs- und Sicherheitskonzept des Portfolios.

Weiterführend: [Frontend-Architektur](frontend.md) · [RAG Portfolio-Copilot](ai-assistant-rag.md) · [Deployment & Operations](deployment.md) · [Sicherheitskonzept](SECURITY.md) · [Glossar](glossary.md) · [Backlog](backlog.md) · [ADRs](adrs/) · [GitHub Wiki](https://github.com/dfluechter/portfolio_project/wiki)

---

## 1. Systemübersicht & Komponenten

Das Projekt ist als **Monorepo** organisiert ([ADR-001](adrs/001-monorepo.md)). Django dient seit [ADR-006](adrs/006-resolving-technical-debt-and-security.md) ausschließlich als **Headless-JSON-API**; die gesamte Benutzeroberfläche (öffentliches Portfolio und Admin-Dashboard) ist die React-SPA.

```mermaid
graph TB
    subgraph Clients["Clients"]
        Visitor["Portfolio-Besucher"]
        Admin["Administrator"]
    end

    subgraph RenderHosting["Render"]
        StaticSite["Static Site: React SPA (frontend/)"]
        WebService["Web Service: Gunicorn + Django (backend/)"]
    end

    subgraph Backend["Django 5.2 (Headless API)"]
        CoreUrls["URL Routing (core/urls.py)"]
        AuthModule["Djoser + SimpleJWT"]
        ViewSets["DRF ViewSets & Actions (inkl. AIChatView)"]
        Services["Services: storage, extractor, promotion, ai_assistant"]
        Models["ORM Models"]
    end

    subgraph Storage["Persistenz & KI"]
        NeonDB[("Neon PostgreSQL / SQLite lokal")]
        SupabaseS3[("Supabase Storage (S3)")]
        Gemini["Google Gemini 3.8 Flash (RAG Copilot & OCR)"]
    end

    Visitor --> StaticSite
    Admin --> StaticSite
    StaticSite -->|"REST + JWT"| WebService
    StaticSite -->|"Presigned PUT (Direct Upload)"| SupabaseS3
    WebService --> CoreUrls
    CoreUrls --> AuthModule
    CoreUrls --> ViewSets
    ViewSets --> Services
    ViewSets --> Models
    Models --> NeonDB
    Services --> SupabaseS3
    Services --> Gemini
```

### Kerntechnologien

| Schicht | Technologie | Zweck |
|---|---|---|
| Backend | Python 3.13 / Django 5.2 / DRF | REST-API und Geschäftslogik |
| Paketmanagement | `uv` | Reproduzierbare Abhängigkeiten |
| Frontend | React 19 / TypeScript / Vite / Tailwind CSS v4 | Öffentliche Seite, Chatbot & Admin-Dashboard |
| Datenbank | Neon Serverless PostgreSQL + `pgvector` (Prod) / SQLite (Dev) | Relationale Daten & 768-dim. Vektorspeicher (HNSW) |
| KI / LLM | Google Gemini & `text-embedding-004` via `google-genai` | RAG Portfolio-Copilot (`/api/ai/chat/`), Hybrid Retrieval & OCR |
| Media | Supabase Storage (S3-kompatibel, `django-storages` + `boto3`) | Zertifikatsdokumente |
| Statische Dateien | WhiteNoise | Auslieferung der Django-Static-Files (Swagger-UI, Admin) |
| OCR | `pypdf`, `pytesseract`, Gemini 3.8 Flash (`google-genai` SDK) | Zweistufige Metadaten-Extraktion & OCR-Fallback |
| Hosting | Render (Web Service + Static Site) | Deployment, siehe [deployment.md](deployment.md) |

---

## 2. Datenfluss

### 2.1 Öffentliche Leseanfragen

Zustandslos, ohne Login. Unauthentifizierte Anfragen sehen nur veröffentlichte Datensätze (`is_published=True` bei Zertifikaten und Projekten).

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Besucher (React SPA)
    participant API as Django API (/api/*)
    participant DB as Neon PostgreSQL
    participant S3 as Supabase S3

    Visitor->>API: GET /api/certificates/?page=1
    Note over API: IsAuthenticatedOrReadOnly: GET erlaubt, Queryset auf is_published=True gefiltert
    API->>DB: Query mit select_related / prefetch_related
    DB-->>API: Datensätze
    API-->>Visitor: Paginierte JSON-Response inkl. Media-URLs
    Visitor->>S3: GET Dokument-URL (PDF/Bild)
    S3-->>Visitor: Datei
```

### 2.2 Administrativer Schreibzugriff

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant Client as React SPA (Axios)
    participant API as DRF ViewSet
    participant DB as Neon PostgreSQL

    Admin->>Client: Formular absenden
    Client->>API: POST/PATCH mit Authorization: Bearer <access>
    alt Access Token abgelaufen (401)
        Client->>API: POST /api/auth/jwt/refresh/
        API-->>Client: Neuer Access Token
        Client->>API: Request wiederholen
    end
    API->>API: Serializer-Validierung
    API->>DB: Speichern
    API-->>Client: 200/201 JSON
```

### 2.3 Datei-Upload & Media-Handling

Es gibt drei Wege, wie eine Datei in den Storage gelangt:

| Weg | Auslöser | Ablauf |
|---|---|---|
| **A: Multipart-Upload** | `POST /api/certificates/` mit `pdf_file` | Datei läuft durch Django, Validierung im Serializer, Speicherung via `default_storage`. |
| **B: Direct-to-Storage** | Dashboard „Zertifikat hochladen“ | Browser lädt per Presigned URL direkt nach S3, Django erhält nur den `storage_key` (siehe Diagramm). |
| **C: Inbox/Import** | Management-Commands, `approve`, `publish` | Datei wird strikt lesend aus `CERTIFICATES_PATH` bzw. Inbox gelesen und in den Storage kopiert. |

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant SPA as React SPA
    participant API as Django API
    participant S3 as Supabase S3

    Admin->>SPA: Datei + Metadaten wählen
    SPA->>API: POST /api/certificates/presigned_upload/ {filename, content_type}
    API-->>SPA: {url, storage_key, method: PUT, headers}
    SPA->>S3: PUT url (Datei, ohne JWT-Header)
    S3-->>SPA: 200 OK
    SPA->>API: POST /api/certificates/ {title, provider, storage_key, ...}
    API-->>SPA: 201 Created (is_published=false)
```

> [!NOTE]
> **Serverseitige Härtung für Weg B (User Story 10.2):** Bei Registrierung eines per Direct-to-Storage hochgeladenen Zertifikats (`storage_key`) verifiziert das Backend das Objekt in Supabase S3 via `head_object` (Existenz & Max. 10 MB), prüft per Range-Request (`bytes=0-2047`) die echten Magic Bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`) und berechnet bzw. validiert den SHA-256-Hash serverseitig.

**Validierung (Wege A und C):**
- `validate_file_extension`: Endungen `.pdf`, `.png`, `.jpg`, `.jpeg` **und** Prüfung der Magic Bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`) gegen Endungs-Spoofing.
- `validate_file_size`: maximal 5 MB.

**Speicherpfade:**
- Wege A/C: `certificates/<provider-slug>/<sha256[:12]>/<dateiname>`; leerer Slug → `unsorted`.
- Weg B: `certificates/uploads/<uuid12>_<dateiname-slug><ext>`.

**S3-Konfiguration** (aktiv bei `USE_SUPABASE_S3=True`):
- Pfad-Adressierung (`addressing_style=path`) und Signatur `s3v4` sind für Supabase Pflicht.
- `AWS_S3_PUBLIC_BUCKET` steuert die URL-Art: `True` → öffentliche, dauerhafte URLs; `False` → signierte, ablaufende URLs (`querystring_auth`).
- `file_overwrite=False` verhindert stilles Überschreiben.
- Für Weg B muss im Bucket eine **CORS-Regel** für die Frontend-Domain hinterlegt sein, siehe [deployment.md](deployment.md#5-supabase-storage-cors-für-direct-uploads).

### 2.4 Datenbank-Routing

- `DATABASE_URL` gesetzt → Neon PostgreSQL; nicht gesetzt → lokale `db.sqlite3`.
- Migrationen nutzen bevorzugt `DIRECT_DATABASE_URL` (PgBouncer-Bypass), Details siehe [deployment.md §2.3](deployment.md#23-neon-postgresql-trennung-von-pooled--und-direct-connection).
- Tests laufen mit `core.settings_test` (gesetzt in `backend/pytest.ini`).

### 2.5 RAG Portfolio-Copilot, Native `pgvector` Hybrid Retrieval, Signals Caching & Deep-Linking

Für interaktive Besucherfragen steht der Portfolio-Copilot bereit (`POST /api/ai/chat/`).
- **LLM & Embeddings**: Google Gemini & `text-embedding-004` (768 Dimensionen) via `google-genai` SDK.
- **Vektorspeicher & Hybrid Retrieval (`KnowledgeChunk`)**: Alle veröffentlichten Entitäten (`Project`, `Certificate` inkl. OCR-Volltexten, `Skill`, `TimelineEntry`) werden als semantische Chunks in `KnowledgeChunk` gespeichert und auf Neon PostgreSQL über einen `pgvector` HNSW-Index (`vector_cosine_ops`) via `CosineDistance` durchsucht (mit automatischem Keyword-Fallback auf SQLite).
- **Query-Pruning**: Zusätzlich werden irrelevante Sektionen im Basis-Kontext anhand der Frage-Intention herausgefiltert, wodurch bis zu 50 % der Kontext-Tokens eingespart werden.
- **$O(1)$ Signal-basierte Cache-Invalidierung & Live-Sync**: Django Signals (`post_save`, `post_delete` in `portfolio/signals.py`) synchronisieren die `KnowledgeChunk`-Einträge in Echtzeit, invalidieren den Rohkontext und inkrementieren atomar die Version `portfolio_rag_context_version_v1`.
- **Guardrails & Zero-Cost Circuit-Breaker**: Pre-Flight Input-Limitierung auf 500 Zeichen, Regex-Filter zur Erkennung von Prompt Injections/Jailbreaks (0-Token Drop ohne LLM-Aufruf) und tägliche Token-/Request-Budgetierung.
- **Deep-Linking**: Generierte Antworten enthalten Quellhinweise, die vom Frontend in klickbare Badges umgewandelt werden (`#project-<id>`, `#cert-<id>`) und das Ziel für 2 Sekunden optisch hervorheben.
- Ausführliche Dokumentation: siehe [docs/ai-assistant-rag.md](ai-assistant-rag.md) und [ADR-007](adrs/007-rag-copilot-caching-guardrails.md).

### 2.6 HTTP Conditional Caching & ETag-Strategie (Epic 15)

Um Datenbank-Queries auf Neon und Rechenzeit auf Render minimal zu halten, unterstützen alle öffentlichen Lese-Endpunkte (`/api/projects/`, `/api/tracks/`, `/api/skills/`, `/api/certificates/`) standardmäßiges HTTP Conditional Caching:
- **ETag-Berechnung**: Schwache ETags (`W/"<ressource>_<version>"`) basieren auf der atomaren Signal-Cache-Version `portfolio_rag_context_version_v1`. Ändern sich Daten (Create, Update, Delete), inkrementieren die Django-Signals die Version in $O(1)$.
- **`304 Not Modified`**: Sendet der Client den Header `If-None-Match`, prüft das Backend die Version bereits vor der Ausführung teurer Datenbankabfragen und Serialisierungen. Stimmen die Versionen überein, wird unmittelbar ein leerer Response mit Status `304 Not Modified` zurückgegeben.
- **Cache-Control**: Für unauthentifizierte Anfragen gilt `Cache-Control: public, max-age=300, stale-while-revalidate=60`. Authentifizierte Requests (Admin-Dashboard) umgehen das Caching (`Cache-Control: no-cache, private`).

---

## 3. API-Endpunkte

Die verbindliche, vollständige Spezifikation liefert das OpenAPI-Schema (`drf-spectacular`) unter `/api/docs/` (Swagger-UI) bzw. `/api/schema/`. Die folgenden Tabellen geben einen Überblick.

### 3.1 REST-API (`/api/`)

Standard-CRUD (`GET` Liste/Detail, `POST`, `PUT`, `PATCH`, `DELETE`) über den `DefaultRouter`.

| Ressource | Lesen | Schreiben | Besonderheiten |
|---|---|---|---|
| `/api/projects/` | Öffentlich (nur `is_published`) | Auth | – |
| `/api/providers/` | Öffentlich | Auth | `DELETE` liefert `409`, solange Zertifikate verknüpft sind |
| `/api/certificates/` | Öffentlich (nur `is_published`) | Auth | Paginierung & Filter, siehe 3.2 |
| `/api/skills/` | Öffentlich | Auth | – |
| `/api/timeline/` | Öffentlich | Auth | – |
| `/api/tracks/` | Öffentlich | Auth | Liefert verknüpfte Zertifikate sowie `icon` & lokale `icon_url` (FontAwesome Solid SVG) |
| `/api/pending-certificates/` | Nur Staff (`IsAdminUser`) | Nur Staff | Detail enthält `extracted_text`, Liste nicht |

**Custom Actions:**

| Endpunkt | Methode | Berechtigung | Zweck |
|---|---|---|---|
| `/api/ai/chat/` | `POST` | Öffentlich | RAG Portfolio-Copilot (Gemini 3.8 Flash mit Guardrails & Deep-Link Zitaten) |
| `/api/certificates/presigned_upload/` | `POST` | Auth | Signierte S3-Upload-URL für Direct-to-Storage (Weg B) |
| `/api/certificates/<id>/publish/` | `POST` | Auth | Prüft Track-Pflicht ($\ge 1$ Track), stellt Datei im Storage sicher und setzt `is_published=true` |
| `/api/certificates/<id>/unpublish/` | `POST` | Auth | Setzt `is_published=false` |
| `/api/certificates/<id>/extract_metadata/` | `POST` | Auth | On-Demand-OCR, liefert Vorschläge (überschreibt nichts) |
| `/api/pending-certificates/<id>/approve/` | `POST` | Staff | Überführt Inbox-Eintrag in ein `Certificate` |
| `/api/pending-certificates/<id>/reject/` | `POST` | Staff | Verwirft Inbox-Eintrag |
| `/api/pending-certificates/<id>/file/` | `GET` | Staff | Liefert Originaldatei inline (`FileResponse`) für Vorschau & Show-File |

### 3.2 Paginierung & Filter für `/api/certificates/`

| Parameter | Werte | Wirkung |
|---|---|---|
| `page`, `page_size` | Zahl (Standard 20) | Serverseitige Paginierung |
| `no_page` / `all` | `true` | Unpaginierte Gesamtliste (Abwärtskompatibilität) |
| `is_published` | `true` / `false` | Nur für authentifizierte Nutzer wirksam |
| `incomplete` | `true` | Fehlendes `issued_date` oder generierter/unvollständiger Titel |
| `track` | ID oder Slug | Filter nach Track |
| `provider` | ID oder Name | Filter nach Anbieter |
| `search` | Text | Suche in Titel, Anbieter, Credential-ID |

### 3.3 Hybrid-Serializer-Pattern

- **Lesen:** verschachtelte Detailobjekte (`provider_details`, `skill_details`).
- **Schreiben:** flache Primärschlüssel (`provider: 3`, `skills: [1, 2]`).
- `Meta.fields` immer als Tupel (Ruff `RUF012`).

### 3.4 Auth-API (`/api/auth/`, Djoser + SimpleJWT)

| Endpunkt | Methode | Berechtigung | Beschreibung |
|---|---|---|---|
| `/api/auth/jwt/create/` | `POST` | Öffentlich | Login mit `email` + `password` → `access` (60 Min.) + `refresh` (7 Tage) |
| `/api/auth/jwt/refresh/` | `POST` | Öffentlich | Neuer Access Token |
| `/api/auth/jwt/verify/` | `POST` | Öffentlich | Token prüfen |
| `/api/auth/users/me/` | `GET` | Auth | Eigenes Profil |
| `/api/auth/users/reset_password/` | `POST` | Öffentlich | Passwort-Reset-Mail |
| `/api/auth/users/reset_password_confirm/` | `POST` | Öffentlich | Neues Passwort bestätigen |

> [!IMPORTANT]
> Registrierung (`POST /api/auth/users/`), Username-Änderung und Kontolöschung sind auf `IsAdminUser` beschränkt. Eine Selbstregistrierung ist nicht möglich.

### 3.5 Weitere Routen

| Endpunkt | Beschreibung |
|---|---|
| `/` | Browser (`Accept: text/html`) → Redirect auf `/api/docs/`; sonst JSON-Status mit Links zu Docs, Schema und Health-Check |
| `/health_check` | `{"status": "ok"}` für Render-Health-Checks |
| `/api/docs/`, `/api/schema/` | Swagger-UI bzw. OpenAPI-3-Schema |
| `/admin/` | Django-Admin (siehe Hinweis in 4.2) |

---

## 4. Authentifizierung & Sicherheit

### 4.1 Auth-Konzept

Seit [ADR-006](adrs/006-resolving-technical-debt-and-security.md) gibt es **einen** Auth-Weg für die Anwendung: **JWT** via Djoser + SimpleJWT. Die SPA hält die Tokens im `localStorage` und erneuert den Access Token bei `401` automatisch (Details in [frontend.md §4](frontend.md#4-api-client--jwt-refresh-zyklus-clientts)). Die frühere Session-basierte Dashboard-Variante ([ADR-003](adrs/003-dual-auth-strategie.md)) ist abgelöst.

### 4.2 Sicherheitsentscheidungen

1. **Django-Admin (`/admin/`)**
   > [!CAUTION]
   > Frühere Dokumentation gab an, `/admin/` sei entfernt. Tatsächlich ist die Route in `backend/core/urls.py` **aktiv** (Session-Login). **Offene Entscheidung:** entfernen (kleinere Angriffsfläche) oder bewusst behalten und z. B. auf einen nicht erratbaren Pfad legen. Bis zur Entscheidung gilt der Ist-Zustand.
2. **Custom User Model mit E-Mail-Login** (`portfolio.User`, `LOGIN_FIELD = "email"`, kein `username`).
3. **Geschlossene Registrierung:** Nutzer nur via `createsuperuser`.
4. **Datenverlust-Schutz:** `Certificate.provider` mit `on_delete=PROTECT`; API antwortet mit `409`.
5. **Upload-Härtung:** Endungs- und Magic-Byte-Prüfung, 5-MB-Limit (Lücke bei Direct-Upload siehe 2.3).
6. **Read-Only-Quellordner:** `CERTIFICATES_PATH` wird ausschließlich lesend verwendet (siehe [AGENTS.md](../AGENTS.md)).
7. **Produktionshärtung bei `DEBUG=False`:** `SECURE_SSL_REDIRECT`, HSTS (1 Jahr, inkl. Subdomains, ohne Preload), sichere Cookies.

---

## 5. Architectural Decision Records

| ADR | Titel | Status |
|---|---|---|
| [ADR-001](adrs/001-monorepo.md) | Monorepo vs. Polyrepo | Accepted |
| [ADR-002](adrs/002-neon-db.md) | Neon Serverless PostgreSQL | Accepted |
| [ADR-003](adrs/003-dual-auth-strategie.md) | Dual-Auth-Strategie | Superseded durch ADR-006 |
| [ADR-004](adrs/004-state-management-frontend.md) | State Management im Frontend | Accepted |
| [ADR-005](adrs/005-certificate-lifecycle-and-review.md) | Zertifikats-Lifecycle, Einzel-Review, Pagination | Accepted (OCR-Teil durch ADR-006 abgelöst) |
| [ADR-006](adrs/006-resolving-technical-debt-and-security.md) | Technische Schulden, Headless, Sicherheit | Accepted |
| [ADR-007](adrs/007-rag-copilot-caching-guardrails.md) | RAG Copilot, Native `pgvector` Hybrid Retrieval, Signals Caching & Deep Linking | Accepted |

---

## 6. Entwicklungsrichtlinien

Verbindliche Regeln für Agenten und Entwickler stehen in [AGENTS.md](../AGENTS.md) (Root) und den Backend-Konventionen in [docs/AGENTS.md](AGENTS.md). Qualitätskriterien (Coverage ≥ 95 %, Ruff, Mypy, Oxlint, Vitest, Build) sind in der [Definition of Done](backlog.md#definition-of-done-dod) festgelegt.
