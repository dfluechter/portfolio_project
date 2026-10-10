# Product Backlog & Optimierungs-Roadmap

Dieses Dokument enthält das agile Product Backlog, User Stories und Akzeptanzkriterien für das Portfolio-Projekt. Es dient als Arbeitsgrundlage für Entwickler (Django-Experte, Frontend-Developer, DevOps, QA-Tester).

---

## Definition of Ready (DoR) & Definition of Done (DoD)

### Definition of Ready (DoR)
Eine Story ist bereit zur Umsetzung ("Ready"), wenn:
- [ ] Die User Story einem klaren Persona-Nutzen folgt ("Als [Rolle] möchte ich [Ziel], um [Nutzen]").
- [ ] Eindeutige, messbare und automatisierbare Akzeptanzkriterien (Checkliste oder GIVEN/WHEN/THEN) definiert sind.
- [ ] Notwendige Architektur- und Sicherheitsimplikationen geklärt sind.
- [ ] Abhängigkeiten zu anderen Komponenten oder Services (z. B. Neon, Supabase, Render) identifiziert wurden.

### Definition of Done (DoD)
Eine Story gilt als abgeschlossen ("Done"), wenn:
- [ ] Alle Akzeptanzkriterien vollständig erfüllt sind.
- [ ] Backend: Test-Coverage liegt bei $\ge 95\%$ (`pytest --cov`).
- [ ] Backend: Linter (`ruff`), Type-Checker (`mypy`) und Formatter laufen fehlerfrei durch.
- [ ] Frontend: `npm run lint` (Oxlint) und `npm run test` (Vitest) laufen fehlerfrei durch.
- [ ] Frontend: `npm run build` (TypeScript + Vite) kompiliert ohne Warnungen/Fehler.
- [ ] Dokumentation: Relevante Änderungen sind in `/docs` oder `README.md` nachgeführt.
- [ ] CI/CD: Sämtliche GitHub-Actions-Workflows sind grün.

---

## Epics & User Stories

### Epic 1: CI/CD- & Build-Pipeline-Stabilität (P0 - Kritisch)

#### User Story 1.1: Konsistenz von Render-Build und GitHub Actions Backend-Build
> **Als** DevOps-/Backend-Entwickler  
> **möchte ich**, dass `build.sh` und der CI-Job `backend-build` den Ausführungskontext des `backend/`-Unterverzeichnisses korrekt berücksichtigen,  
> **damit** automatische Deployments auf Render und GitHub Actions System-Checks fehlerfrei durchlaufen.

**Kontext:**
`render.yaml` definiert `rootDir: backend` und `buildCommand: ./build.sh`. Das Skript `build.sh` liegt jedoch im Wurzelverzeichnis. Ebenso fehlt im GitHub Actions Workflow `.github/workflows/ci.yml` beim Job `backend-build` die Direktive `defaults: run: working-directory: backend`.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] **Szenario 1 (Render Build-Hook):**
  - **Given** ein Deployment auf Render mit `rootDir: backend` wird getriggert
  - **When** der Build-Befehl ausgeführt wird
  - **Then** ist `build.sh` entweder im Ordner `backend/` verfügbar oder `render.yaml` referenziert das Skript zuverlässig, sodass kein `file not found`-Fehler auftritt.
- [ ] **Szenario 2 (GitHub Actions `backend-build`):**
  - **Given** ein Commit wird auf `main` gepusht oder ein PR geöffnet
  - **When** der Job `backend-build` in `.github/workflows/ci.yml` startet
  - **Then** ist das Working Directory auf `backend` gesetzt und die Befehle `uv sync --frozen --no-dev`, `python manage.py check` sowie `python manage.py collectstatic --noinput` laufen erfolgreich im Python-3.13-Kontext durch.

---

### Epic 2: Frontend-Architektur-Dokumentation (P1 - Hoch)

#### User Story 2.1: Erstellung von `docs/frontend.md`
> **Als** Frontend-Entwickler  
> **möchte ich** eine dedizierte Architekturdokumentation für das React-19-Frontend,  
> **damit** Komponentenstruktur, State Management (TanStack Query + AuthContext), Axios-Interceptors und Tailwind v4 sauber nachvollziehbar sind.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] Die Datei [`docs/frontend.md`](frontend.md) ist angelegt und in [`docs/architecture.md`](architecture.md) verlinkt.
- [x] Folgende Kernbereiche sind dokumentiert:
  - **Komponenten-Architektur:** Modale, Public Views, Dashboard-Views, `ErrorBoundary`.
  - **State-Handling:** Server-State via TanStack Query vs. Client-State via React Context (`AuthContext`).
  - **Auth-Lifecycle & Interceptor:** Request-Bearer-Injektion und 401-Refresh-Loop (`auth:unauthorized`).
  - **Styling:** Tailwind CSS v4 Konfiguration mit `@tailwindcss/vite`.
  - **Testing-Strategie:** Vitest + React Testing Library.

---

### Epic 3: Repository-Hygiene & Dateistruktur (P2 - Mittel)

#### User Story 3.1: Konsolidierung verwaister Root-Artefakte
> **Als** Entwickler und Maintainer  
> **möchte ich**, dass verwaiste Entwicklungs- und Asset-Dateien aus dem Root-Verzeichnis aufgeräumt werden,  
> **damit** das Projekt übersichtlich und frei von versehentlich committeten Verzeichnissen bleibt.

**Akzeptanzkriterien (Acceptance Criteria):**
- [ ] Der versehentlich angelegte Ordner `#` im Root-Verzeichnis ist entfernt.
- [x] Das Bild `Architektur_und_Datenstruktur_Portfolio_Backend.png` und `portfolio_architecture.html` sind in `docs/assets/` überführt und dort in der Dokumentation eingebunden.
- [ ] Die `.gitignore` schließt temporäre Ordner wie `scratch/` und Test-Skripte wie `test_s3.py` aus oder diese werden bereinigt.

---

### Epic 4: Deployment & Operations Leitfaden (P2 - Mittel)

#### User Story 4.1: Erstellung von `docs/deployment.md`
> **Als** Maintainer  
> **möchte ich** eine Schritt-für-Schritt-Anleitung für das Deployment auf Render und die Konfiguration von Neon Serverless Branching in GitHub Actions,  
> **damit** Releases und Incident-Management reproduzierbar und dokumentiert sind.

**Akzeptanzkriterien (Acceptance Criteria):**
- [x] Die Datei [`docs/deployment.md`](deployment.md) beschreibt:
  - Das automatische Neon Database Branching (`neondatabase/create-branch-action@v5`) in der CI.
  - Die Render Web Service Konfiguration (`render.yaml`).
  - Benötigte Secrets (`NEON_PROJECT_ID`, `NEON_API_KEY`, `RENDER_DEPLOY_HOOK_URL`, `DATABASE_URL`, `SECRET_KEY`).
  - Rollback- und Troubleshooting-Maßnahmen.
