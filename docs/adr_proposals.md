# Dokumentations- und ADR-Status für das Portfolio-Projekt

## 1. Zusammenfassung der bestehenden Architektur
Das Portfolio-Projekt ist als Monorepo strukturiert:
- **Backend**: Django 5.2 mit Django REST Framework (DRF) im Ordner `backend/`, bereitgestellt über Render.
- **Frontend**: React 19 (TypeScript, Vite, Tailwind CSS v4) als SPA im Ordner `frontend/`.
- **Datenbank**: Neon Serverless PostgreSQL für Produktion, SQLite für lokale Entwicklung.
- **Speicher**: Supabase S3-kompatibler Storage für Zertifikate und Medien.
- **Sicherheit**: Dual-Auth-Strategie mit Session-Cookies für das native Django-Dashboard und JWT für das React Frontend. Geschlossene Registrierung und Custom User Model.

---

## 2. Status der Dokumentationen

| Dokument | Status | Beschreibung |
|---|---|---|
| [`docs/architecture.md`](architecture.md) | ✅ **Abgeschlossen** | Gesamtsystem, Datenflüsse, API-Endpunkte, Dual-Auth & ADR-Verzeichnis. |
| [`docs/frontend.md`](frontend.md) | ✅ **Abgeschlossen** | React 19 Architektur, TanStack Query, Auth-Lifecycle, Tailwind v4 & Testing. |
| [`docs/backlog.md`](backlog.md) | ✅ **Abgeschlossen** | Agiles Backlog mit Epics, User Stories, DoR und DoD für Entwickler. |
| [`docs/adrs/`](adrs/) | ✅ **Abgeschlossen** | ADR-001 bis ADR-004 vollständig als Accepted dokumentiert. |
| [`docs/deployment.md`](deployment.md) | ✅ **Abgeschlossen** | Detaillierte Deployment-Pipeline, Neon Branching & Render Build-Hook. |

---

## 3. Übersicht der Architectural Decision Records (ADRs)

| ADR-Nummer | Dokument | Status | Thema |
| :--- | :--- | :--- | :--- |
| **ADR-001** | [ADR-001: Monorepo vs. Polyrepo](adrs/001-monorepo.md) | `Accepted` | Konsolidiertes Monorepo für Frontend und Backend. |
| **ADR-002** | [ADR-002: Neon PostgreSQL](adrs/002-neon-db.md) | `Accepted` | Serverless PostgreSQL mit Branching für CI-Testläufe. |
| **ADR-003** | [ADR-003: Dual-Auth Strategie](adrs/003-dual-auth-strategie.md) | `Accepted` | Entkoppelte Session- & JWT-Authentifizierung. |
| **ADR-004** | [ADR-004: Frontend State Management](adrs/004-state-management-frontend.md) | `Accepted` | Hybrider Ansatz mit TanStack Query & React Context. |
