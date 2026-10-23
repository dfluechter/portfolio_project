# Dokumentations- und ADR-Status für das Portfolio-Projekt

## 1. Zusammenfassung der bestehenden Architektur
Das Portfolio-Projekt ist als Monorepo strukturiert:
- **Backend**: Django 6.0 (Spezifikation django>=5.2) mit Django REST Framework (DRF) im Ordner `backend/` als reine Headless-API, bereitgestellt über Render.
- **Frontend**: React 19 (TypeScript, Vite 8, Tailwind CSS v4) als SPA im Ordner `frontend/`.
- **Datenbank**: Neon Serverless PostgreSQL für Produktion (`DATABASE_URL` gepoolt, `DIRECT_DATABASE_URL` für Migrationen), SQLite für lokale Entwicklung.
- **Speicher**: Supabase S3-kompatibler Storage für Zertifikate und Medien (inkl. Direct-to-Storage Presigned Uploads).
- **Sicherheit & Auth**: Konsequente JWT-Authentifizierung via Djoser + SimpleJWT für die React-SPA (keine serverseitigen HTML-Templates). Geschlossene Registrierung und E-Mail-basiertes Custom User Model.

---

## 2. Status der Dokumentationen

| Dokument | Status | Beschreibung |
|---|---|---|
| [`docs/architecture.md`](architecture.md) | ✅ **Abgeschlossen** | Gesamtsystem, Datenflüsse, API-Endpunkte, Direct-to-Storage Uploads & Sicherheitskonzept. |
| [`docs/ai-assistant-rag.md`](ai-assistant-rag.md) | ✅ **Abgeschlossen** | RAG Portfolio-Copilot (Gemini 3.8 Flash), Signals-Cache-Invalidierung, Guardrails & Deep-Linking. |
| [`docs/frontend.md`](frontend.md) | ✅ **Abgeschlossen** | React 19 Architektur, TanStack Query, Auth-Lifecycle, Code-Splitting, Tailwind v4 & Testing. |
| [`docs/deployment.md`](deployment.md) | ✅ **Abgeschlossen** | Detaillierte Deployment-Pipeline, Neon Direct/Pooled Connections, Bucket-CORS & Render Build-Hook. |
| [`docs/glossary.md`](glossary.md) | ✅ **Abgeschlossen** | Fachbegriffe, Domänen-Glossar und Definitionen für einheitliche Terminologie. |
| [`docs/backlog.md`](backlog.md) | ✅ **Abgeschlossen** | Agiles Backlog mit Epics, User Stories, DoR und DoD für Entwickler. |
| [`docs/SECURITY.md`](SECURITY.md) | ✅ **Abgeschlossen** | Sicherheitsarchitektur, Defense-in-Depth, Zero-Cost Circuit Breaker & Read-Only Policy. |
| [`docs/adrs/`](adrs/) | ✅ **Abgeschlossen** | ADR-001 bis ADR-007 vollständig dokumentiert. |

---

## 3. Übersicht der Architectural Decision Records (ADRs)

| ADR-Nummer | Dokument | Status | Thema |
| :--- | :--- | :--- | :--- |
| **ADR-001** | [ADR-001: Monorepo vs. Polyrepo](adrs/001-monorepo.md) | `Accepted` | Konsolidiertes Monorepo für Frontend und Backend. |
| **ADR-002** | [ADR-002: Neon PostgreSQL](adrs/002-neon-db.md) | `Accepted` | Serverless PostgreSQL mit Branching für CI-Testläufe. |
| **ADR-003** | [ADR-003: Dual-Auth Strategie](adrs/003-dual-auth-strategie.md) | `Superseded by ADR-006` | Frühere Dual-Auth; abgelöst durch reine Headless-JWT-Architektur. |
| **ADR-004** | [ADR-004: Frontend State Management](adrs/004-state-management-frontend.md) | `Accepted` | Hybrider Ansatz mit TanStack Query & React Context. |
| **ADR-005** | [ADR-005: Zertifikats-Lifecycle, Einzel-Review und Pagination](adrs/005-certificate-lifecycle-and-review.md) | `Accepted` | Selektiver Review-Drawer, Server-Pagination und Entwurfs-Lifecycle. |
| **ADR-006** | [ADR-006: Technische Schulden, Cloud-Architektur und Sicherheit](adrs/006-resolving-technical-debt-and-security.md) | `Accepted` | Headless Cleanup, Neon Connection Separation, 3-Stufen OCR & Magic Bytes. |
| **ADR-007** | [ADR-007: RAG Copilot, Native pgvector Hybrid Retrieval, Signals Cache Invalidation & Deep Linking](adrs/007-rag-copilot-caching-guardrails.md) | `Accepted` | Gemini RAG, `pgvector` (`KnowledgeChunk` & HNSW-Index), $O(1)$ Signal-Cache-Invalidierung und UI Deep-Linking. |
