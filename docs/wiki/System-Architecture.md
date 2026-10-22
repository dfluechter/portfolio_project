# System- und Komponenten-Architektur

Diese Seite beschreibt die Gesamtsystemarchitektur, Schnittstellen und Datenflüsse des Portfolio-Projekts.

---

## 1. Architektur-Prinzipien

Das Portfolio folgt modernen Cloud-Native- und Headless-Mustern:
- **Headless JSON REST-API**: Das Backend ([Django 5.2](https://www.djangoproject.com/)) liefert ausschließlich JSON-APIs. Django-HTML-Templates wurden vollständig abgelöst.
- **Single Page Application (SPA)**: Die Benutzeroberfläche (öffentliches Portfolio & Admin-Dashboard) ist eine clientseitige [React 19](https://react.dev/)-Anwendung.
- **Connection Separation**: Bei der Verbindung zu [Neon PostgreSQL](https://neon.tech/) werden gepoolte Verbindungen (`DATABASE_URL`, PgBouncer) für den regulären Webbetrieb und direkte Verbindungen (`DIRECT_DATABASE_URL`) für Schema-Migrationen und DDL-Operationen getrennt.
- **Zero-Storage Load auf Backend**: Datei-Uploads fließen via Presigned S3 URLs direkt zwischen Browser und [Supabase Storage](https://supabase.com/), wodurch der Render-Container schlank und zustandslos bleibt.

---

## 2. Komponenten-Übersicht

```mermaid
graph TD
    subgraph Frontend["React 19 SPA (frontend/)"]
        PublicView["Public Portfolio (Home, Projects, Tracks, Timeline)"]
        DashboardView["Admin Dashboard (Certificates, Projects, Inbox)"]
        AIChatWidget["RAG Chat Widget (Deep-Linking Badges)"]
        ApiClient["Axios Client (JWT Refresh Queue)"]
    end

    subgraph Backend["Django 5.2 REST API (backend/)"]
        Router["DRF DefaultRouter (/api/*)"]
        AuthViews["Djoser + SimpleJWT (/api/auth/*)"]
        ViewSets["ModelViewSets (Project, Certificate, Skill, Track)"]
        Services["Domain Services (extractor, storage, ai_assistant, retrieval)"]
        Signals["Django Signals (KnowledgeChunk Sync & Cache Invalidation)"]
    end

    subgraph Persistence["Daten & Storage"]
        NeonDB[("Neon PostgreSQL + pgvector (HNSW)")]
        SupabaseS3[("Supabase S3 Bucket (Zertifikats-PDFs & Bilder)")]
        GeminiAPI["Google Gemini 3.8 Flash & text-embedding-004"]
    end

    PublicView --> ApiClient
    DashboardView --> ApiClient
    AIChatWidget --> ApiClient
    ApiClient --> Router
    Router --> AuthViews
    Router --> ViewSets
    ViewSets --> Services
    Services --> NeonDB
    Services --> SupabaseS3
    Services --> GeminiAPI
    ViewSets --> Signals
    Signals --> NeonDB
```

---

## 3. Datenflüsse

### 3.1 Öffentliche Leseanfragen

Unauthentifizierte Anfragen sind strikt zustandslos und erhalten ausschließlich Datensätze mit `is_published=True`.

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Besucher (React SPA)
    participant API as Django API (/api/*)
    participant DB as Neon PostgreSQL
    participant S3 as Supabase S3

    Visitor->>API: GET /api/certificates/?page=1
    Note over API: Filtert Queryset strikt auf is_published=True
    API->>DB: SQL Query mit select_related & prefetch_related
    DB-->>API: Datensätze
    API-->>Visitor: Paginierte JSON-Response inkl. S3 Media-URLs
    Visitor->>S3: GET Dokument (PDF / Bild)
    S3-->>Visitor: Inline Datei
```

### 3.2 Direct-to-Storage Uploads (Supabase S3)

Uploads laufen zweistufig ab, um den Server vor Bandbreiten-Peaks zu schützen:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant SPA as React Dashboard
    participant API as Django API
    participant S3 as Supabase S3

    Admin->>SPA: Wählt PDF / Bilddatei aus
    SPA->>API: POST /api/certificates/presigned_upload/
    API-->>SPA: Signierte PUT-URL + storage_key
    SPA->>S3: PUT Datei direkt zu Supabase S3
    S3-->>SPA: 200 OK
    SPA->>API: POST /api/certificates/ {storage_key, title, ...}
    Note over API: Prüft S3 Object Head, Magic Bytes & SHA-256
    API-->>SPA: 201 Created
```

---

## 4. REST-API-Endpunkte (Übersicht)

| Endpunkt | Methode | Berechtigung | Beschreibung |
|---|---|---|---|
| `/api/projects/` | `GET`, `POST` | Read: Public / Write: Auth | Projekte mit GitHub/Live-Links |
| `/api/certificates/` | `GET`, `POST` | Read: Public / Write: Auth | Zertifikate mit Server-Paginierung & Filtern |
| `/api/certificates/<id>/publish/` | `POST` | Auth | Validiert Track-Pflicht & publiziert Zertifikat |
| `/api/certificates/<id>/extract_metadata/` | `POST` | Auth | On-Demand 3-Stufen OCR Analyse |
| `/api/pending-certificates/` | `GET`, `POST` | Nur Staff | Inbox-Kandidaten aus Dateiscans |
| `/api/pending-certificates/<id>/file/` | `GET` | Nur Staff | Streamt Originaldatei für Live-Vorschau |
| `/api/tracks/` | `GET`, `POST` | Read: Public / Write: Auth | Fachbereiche inkl. lokaler FontAwesome SVG-Icons |
| `/api/skills/` | `GET`, `POST` | Read: Public / Write: Auth | Qualifikationen & Level |
| `/api/timeline/` | `GET`, `POST` | Read: Public / Write: Auth | Werdegang & Karriere-Stationen |
| `/api/ai/chat/` | `POST` | Öffentlich | RAG Portfolio-Copilot mit Guardrails |
| `/api/auth/jwt/create/` | `POST` | Öffentlich | JWT Login (Access: 60 min, Refresh: 7 Tage) |
| `/api/auth/jwt/refresh/` | `POST` | Öffentlich | Token-Erneuerung |

Die vollständige interaktive Spezifikation ist über Swagger-UI unter `/api/docs/` einsehbar.
