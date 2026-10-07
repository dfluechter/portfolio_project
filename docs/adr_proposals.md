# Dokumentations- und ADR-Vorschläge für das Portfolio-Projekt

## 1. Zusammenfassung der bestehenden Architektur
Das Portfolio-Projekt ist als Monorepo strukturiert. Es besteht aus:
- **Backend**: Django 5.2 mit Django REST Framework (DRF), bereitgestellt über Render.
- **Frontend**: React 18 (TypeScript, Vite, Tailwind CSS) als SPA.
- **Datenbank**: Neon Serverless PostgreSQL für Produktion, SQLite für lokale Entwicklung.
- **Speicher**: Supabase S3-kompatibler Storage für Zertifikate und Medien.
- **Sicherheit**: Dual-Auth-Strategie mit Session-Cookies für das native Django-Dashboard und JWT für das React Frontend. Geschlossene Registrierung und Custom User Model.

Die grundlegende Architektur ist in `architecture.md` sehr gut erfasst, bietet jedoch Raum für detailliertere Entscheidungsdokumentationen und tiefergehende Frontend-Spezifikationen.

---

## 2. Vorschläge für fehlende Dokumentationen

Um Entwicklern einen besseren Einstieg zu ermöglichen, sollten folgende Dokumente im `/docs`-Ordner ergänzt werden:

### A. Frontend-Architektur (`docs/frontend.md`)
Aktuell fokussiert sich die Dokumentation stark auf das Backend.
- **Inhalt**: Komponenten-Hierarchie, State-Management (z. B. Zustand, Redux oder React Context), Routing-Strategie (React Router) und Styling-Richtlinien.
- **Nutzen**: Klares Onboarding für Frontend-Entwickler.

### B. CI/CD & Deployment-Pipeline (`docs/deployment.md`)
- **Inhalt**: Detaillierte Schritte des Render-Build-Skripts (`build.sh`), Umgang mit Umgebungsvariablen in der Pipeline, Rollback-Strategien.
- **Nutzen**: Bessere Nachvollziehbarkeit bei Release-Fehlern.

### C. Product Backlog & User Stories (`docs/backlog.md`)
- **Inhalt**: Epics und Definition of Ready (DoR) / Definition of Done (DoD).
- **Nutzen**: Transparente Agile-Planung für kommende Features.

---

## 3. Vorschläge für Architectural Decision Records (ADRs)

ADRs dokumentieren *warum* eine bestimmte technologische Entscheidung getroffen wurde. Sie sollten im Ordner `/docs/adrs/` angelegt werden.

| ADR-Nummer | Titel / Thema | Beschreibung & Begründung |
| :--- | :--- | :--- |
| **ADR-001** | **Monorepo vs. Polyrepo** | Festhalten der Entscheidung für ein Monorepo. Warum wurden Frontend und Backend nicht getrennt versioniert? (z.B. einfachere CI/CD, konsistente Versionierung). |
| **ADR-002** | **Wahl der Datenbank (Neon Serverless)** | Warum Neon statt herkömmlichem AWS RDS oder Supabase PostgreSQL? (z.B. Branching-Features, Scale-to-Zero, Kosten). |
| **ADR-003** | **Dual-Auth Strategie** | Auslagerung der bestehenden Rationale aus `architecture.md` in ein dediziertes ADR, um die Historie der Entscheidung (JWT vs. Session) fassbar zu machen. |
| **ADR-004** | **State Management im Frontend** | Dokumentation der Wahl des State-Managers für die React-SPA (z.B. warum React Query für API-Calls und Context für globalen State gewählt wurde). |

---

## 4. Beispiel User Story für die Implementierung

**Titel:** Anlage der initialen ADR-Struktur und Frontend-Dokumentation

**User Story:**
Als technischer Onboarder möchte ich eine klare Historie der Architektur-Entscheidungen (ADRs) sowie eine Frontend-Dokumentation haben, damit neue Entwickler die System-Entscheidungen schnell nachvollziehen können.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] Der Ordner `/docs/adrs/` ist angelegt.
- [ ] Ein Template für ADRs (`/docs/adrs/template.md`) ist erstellt.
- [ ] Die ADRs 001 bis 004 sind als Entwürfe (Drafts) im System vorhanden.
- [ ] Die Datei `/docs/frontend.md` wurde mit den Basis-Säulen (Routing, State Management, Styling) angelegt.
- [ ] Die Datei `/docs/architecture.md` referenziert den neuen ADR-Ordner.
