# Detaillierter Untersuchungsbericht: Frontend, Build-Tools & Deployment Reality

**Autor:** Explorer 3 (Frontend & Tooling/Deployment Reality)  
**Datum:** 2026-10-23  
**Arbeitsverzeichnis:** `d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_3`  
**Referenzdokument:** `ORIGINAL_REQUEST.md`

---

## 1. Executive Summary & Kernaussagen

Die Untersuchung der realen Frontend-Codebase, der Build-Tools und der Deployment-Konfigurationen im Vergleich zur bestehenden Dokumentation (`README.md`, `docs/frontend.md`, `docs/deployment.md`, `docs/architecture.md`, `docs/wiki/*`, etc.) ergab ein hochmodernes, stabiles React-19-Frontend mit Vite 8, Tailwind CSS v4 und TanStack Query v5.

Gleichzeitig wurden jedoch **mehrere signifikante Dokumentations-Inkonsistenzen** sowie **kritische Syntax- und Konfigurationsfehler in der Produktionskonfiguration (`render.yaml`)** identifiziert:

1. **Kritischer Deployment-Blocker in `render.yaml`**: Unaufgelöste Git-Merge-Konflikt-Marker (`<<<<<<< HEAD`, `=======`, `>>>>>>> 92e9546`) in den Umgebungsvariablen von `portfolio-backend`, Syntaxfehler (`key: false` statt `sync: false`) sowie Fehlkonfigurationen (`DJANGO_SETTINGS_MODULE: core.DJANGO_SETTINGS_MODULE` statt `core.settings`, `ALLOWED_HOSTS: 3.13.0` als Duplikat von `PYTHON_VERSION`).
2. **Veraltete Testanzahl in allen Dokumenten**: Sämtliche Dokumente deklarieren „82 Vitest-Tests“. Tatsächlich umfasst die Frontend-Testsuite **117 Tests in 22 Testdateien** (unter anderem durch die neu hinzugekommenen Suiten für `motion-footer.test.tsx` (24 Tests), `ArchitectureTerminal.test.tsx` (3 Tests), `LanguageSwitcher.test.tsx` (3 Tests), etc.).
3. **Diskrepanzen im Komponentenbaum (`docs/frontend.md`)**: Die Dokumentation führt nicht existierende Komponenten auf (`SkillManager.tsx`, `TimelineManager.tsx` im Dashboard), während tatsächlich existierende Kernkomponenten (`ContactSection.tsx`, `Hero.tsx`, `HeroBanner.tsx`, `ArchitectureTerminal.tsx`, `LanguageSwitcher.tsx`, `shims/next-link.tsx`, `i18n.ts`, `locales/`) und der gesamte Ordner `frontend/src/components/ui/` (12 Dateien inkl. `button.tsx`, `hero-section-5.tsx`, `motion-footer.tsx`, `stacked-cards-interaction.tsx`, etc.) komplett fehlen.
4. **Fehlende Dashboard-Tabs**: `docs/wiki/Frontend-Architecture.md` behauptet eine CRUD-Verwaltung für `TrackManager` und `SkillManager`. In der Realität besitzt `DashboardPage.tsx` ausschließlich drei Tabs: Zertifikate (`CertificateManager`), Projekte (`ProjectManager`) und Inbox (`PendingCertificateManager`).
5. **Abweichung der Password-Reset-Route**: `README.md` (Zeile 165) dokumentiert `/password/reset/confirm/:uid/:token`, während die tatsächliche Route in `App.tsx` (Zeile 65) und allen Tests `/password-reset/confirm/:uid/:token` lautet.
6. **Veraltetes Gemini-Modell in `.env.example`**: `.env.example` referenziert das veraltete `gemini-2.5-flash`, während `render.yaml` und die Architektur auf `gemini-3.8-flash` standardisiert sind.
7. **Status von Internationalisierung (i18n / Epic 16)**: In `docs/backlog.md` wird Epic 16 als „Geplant (Backlog)“ gelistet, obwohl `i18next`, `react-i18next`, Sprachdateien (`de.json`, `en.json`) und `LanguageSwitcher.tsx` bereits voll in die Codebase integriert sind.
8. **Strikte Schutzregel verifiziert**: `CERTIFICATES_PATH` und Originalzertifikate bleiben unverändert und unberührt (strikt read-only).

---

## 2. Detaillierter Frontend-Stack (Realitätsabgleich)

| Komponente | Konfiguration in Codebase (`package.json`, Quellcode) | Dokumentierte Angabe | Status / Diskrepanz |
|---|---|---|---|
| **React Framework** | `react: ^19.0.0`, `react-dom: ^19.0.0`, `@types/react: ^19.0.10` | React 19 | ✅ Konsistent |
| **Bundler & Build-Tool** | `vite: ^8.3.2` (Runtime-Output: `vite v8.3.4`), `@vitejs/plugin-react: ^6.1.2`, Rolldown/Rollup-Runtime | Vite 8 + Rolldown | ✅ Konsistent |
| **Styling Framework** | `tailwindcss: ^4.0.9`, `@tailwindcss/vite: ^4.0.9`. Pure CSS-first `@import "tailwindcss";` & `@theme` in `src/index.css`. Keine `tailwind.config.js`. | Tailwind CSS v4 (`@tailwindcss/vite`) | ✅ Konsistent |
| **Server-State** | `@tanstack/react-query: ^5.104.4` (`QueryClientProvider`, hierarchische Query-Keys in `usePortfolio.ts`) | TanStack Query v5 | ✅ Konsistent |
| **Virtualisierung** | `@tanstack/react-virtual: ^3.14.21` (`useWindowVirtualizer` in `CertificatesSection.tsx`) | Nicht explizit in Übersichtstabelle erwähnt | ℹ️ Ergänzen |
| **Client-State** | React Context: `AuthContext` (JWT & 401 Refresh Queue) und `ThemeContext` (Dark/Light). Kein Redux/Zustand. | React Context (`AuthContext`, `ThemeContext`) | ✅ Konsistent |
| **Routing** | `react-router-dom: ^7.18.4` (React Router v7) in `App.tsx` mit `BrowserRouter`, `Routes`, `Route`. | React Router v7 (`react-router-dom`) | ✅ Konsistent |
| **TypeScript** | `typescript: ^7.0.2`, `tsconfig.app.json` kommentiert `Path aliases (TypeScript 7+)` | `README.md` & Wiki deklarieren „TypeScript 5.8“ | ⚠️ Mismatch: TypeScript 7.0 vs. dok. 5.8 |
| **HTTP-Client** | `axios: ^1.8.1` (`src/api/client.ts` mit Concurrency-Safe 401 Refresh-Queue) | Axios | ✅ Konsistent |
| **Motion & Animation** | `framer-motion: ^14.0.0`, `motion: ^14.5.0`, `gsap: ^3.15.0` | Framer Motion | ℹ️ `gsap` & `motion` nicht erwähnt |
| **Icons** | `lucide-react: ^1.59.0`, `react-icons: ^5.7.0` | Lucide React | ℹ️ `react-icons` nicht erwähnt |
| **Linter** | `oxlint: ^1.83.0` (`npm run lint` führt `oxlint` aus) | Oxlint | ✅ Konsistent |
| **Test-Runner** | `vitest: ^5.0.5`, `@testing-library/react: ^16.3.3`, `jsdom: ^30.1.3` | Vitest + React Testing Library | ✅ Konsistent |
| **Internationalisierung** | `i18next: ^26.5.5`, `react-i18next: ^17.1.1`, `i18next-browser-languagedetector: ^8.2.1` | In `docs/backlog.md` nur als Epic 16 „Geplant“ gelistet | ⚠️ Mismatch: Bereits implementiert |

### 2.1 Routen-Definition (`frontend/src/App.tsx`)
Die tatsächlichen Anwendungsrouten sind:
1. `/` $\rightarrow$ `PortfolioPage` (öffentliche Hauptseite)
2. `/login` $\rightarrow `LoginPage` (dynamisch via `lazyRetry`)
3. `/password-reset/confirm/:uid/:token` $\rightarrow `PasswordResetConfirmPage` (dynamisch via `lazyRetry`)
4. `/dashboard` $\rightarrow `DashboardPage` (dynamisch via `lazyRetry`, geschützt via `useAuth`)

*Dokumentationsfehler in `README.md` (Z. 165):* Dort steht `/password/reset/confirm/:uid/:token` (mit Slash). Richtig ist `/password-reset/confirm/:uid/:token`.

### 2.2 shadcn UI & Komponenten-Inventar unter `frontend/src/components/ui`
Unter `frontend/src/components/ui` befinden sich aktuell 12 Dateien:
- `button.tsx`: Basiskomponente basierend auf `@radix-ui/react-slot` und `class-variance-authority` (`cva`).
- `hero-section-5.tsx`: Zusammengesetzte Hero-Sektion.
- `infinite-slider.tsx`: Endlos animierter Slider für Technologie-Logos.
- `progressive-blur.tsx`: Blur-Masken-Overlay.
- `motion-footer.tsx`: `CinematicFooter`-Komponente mit Federmechanik und dynamischem Cursor-Effekt.
- `motion-footer.test.tsx`: 24 dedizierte Vitest-Tests für die Footer-Komponente.
- `stack-feature-section.tsx`: Feature-Präsentationssektion.
- `stacked-cards-interaction.tsx`: Interaktive 3D-Kartenstapel-Komponente (wird produktiv in `src/components/Footer.tsx` eingebunden!).
- Demo-Dateien: `demo.tsx`, `motion-footer-demo.tsx`, `stack-feature-section-demo.tsx`, `stacked-cards-demo.tsx`.

*Zusätzlich:* `frontend/src/shims/next-link.tsx` stellt einen Shim bereit, damit Komponenten, die `next/link` importieren, transparent mit `react-router-dom` gerendert werden.

---

## 3. Build- und Package-Management (Backend & Frontend)

### 3.1 Backend Tooling & Befehle
Das Backend nutzt Python 3.13 und Astral `uv`:
- **Paketinstallation & Sync**:
  - `uv sync` (Entwicklung inklusive dev-Abhängigkeiten wie `pytest`, `mypy`, `ruff`, `djlint`)
  - `uv sync --frozen --no-dev` (Produktions-Build in `backend/build.sh`)
- **Django Management Befehle**:
  - `uv run python manage.py check` (Verifiziert: 0 Fehler, 0 Warnungen)
  - `uv run python manage.py collectstatic --noinput` (Sammelt Static Files via WhiteNoise)
  - `uv run python manage.py migrate --noinput` (Mit `RUNNING_MIGRATION=1` für `DIRECT_DATABASE_URL`)
  - `uv run python manage.py index_rag_chunks` (Synchronisiert `KnowledgeChunk`-Tabelle)
  - `uv run python manage.py scan_inbox` (Idempotenter Inbox-Import, strikt read-only auf `CERTIFICATES_PATH`)
  - `uv run python manage.py sync_certificates` (S3-Storage-Abgleich)
- **Code-Qualität & Tests**:
  - `uv run ruff check .` / `uv run ruff format --diff .`
  - `uv run mypy .`
  - `uv run pytest --cov=core --cov=portfolio --cov-report=term-missing --cov-fail-under=95` (314 Tests)

### 3.2 Frontend Tooling & NPM Scripts
In `frontend/package.json`:
- `"dev": "vite"`: Startet den lokalen Dev-Server auf **Port 3000** (`server.port: 3000` in `vite.config.ts`).
- `"build": "tsc -b && vite build"`: Führt TypeScript Project Reference Typecheck durch und kompiliert den Produktions-Build nach `dist/`.
  - **Reales Build-Ergebnis (getestet):**
    - `dist/index.html` (1.15 kB)
    - `dist/assets/index-BAX3HNCG.css` (121.11 kB / gzip: 17.51 kB)
    - `dist/assets/rolldown-runtime-XKyaHtl9.js` (0.72 kB)
    - `dist/assets/PasswordResetConfirmPage-CcaqqX08.js` (7.50 kB)
    - `dist/assets/LoginPage-nQb0oD2z.js` (10.93 kB)
    - `dist/assets/vendor-icons-CaAWXKtm.js` (26.43 kB)
    - `dist/assets/DashboardPage-Boc8lsYa.js` (67.93 kB)
    - `dist/assets/vendor-query-Dy1mgNeR.js` (78.49 kB)
    - `dist/assets/vendor-motion-C2r6RzFF.js` (137.18 kB)
    - `dist/assets/index-CCxHIjQx.js` (162.84 kB / gzip: 41.75 kB)
    - `dist/assets/vendor-react-Dr9dIrzs.js` (332.96 kB / gzip: 104.73 kB)
- `"lint": "oxlint"`: Führt Oxlint aus (0 Fehler, 3 React-Compiler-Warnings in 2.3s auf 82 Dateien).
- `"test": "vitest run"` bzw. `"test:run": "vitest run"`: Führt Vitest aus.
  - **Reale Testsuite-Statistik:**
    - Testdateien: **22 Testdateien**
    - Tests gesamt: **117 Tests** (107 bestanden, 6 fehlgeschlagen, 4 übersprungen)
    - *Analyse der 6 Testfehlschläge:* 5 Tests in `PortfolioChatWidget.test.tsx` suchen nach dem alten deutschen Placeholder `/Frage zu Dominiks Portfolio stellen.../i`, der durch die i18n-Einführung (`de.json`) nun `"Stelle eine Frage zu Dominiks Werdegang, Skills oder Projekten..."` lautet. 1 Test in `PendingCertificateManager.test.tsx` scheitert an einem geänderten Checkbox-Aria-Label.

### 3.3 Root-Befehle & Fallback
- `build.sh` im Root: Erkennt Monorepo-Root, stellt `uv` im PATH sicher, wechselt nach `backend/` und führt `backend/build.sh` aus.
- Root `package.json`: Beinhaltet ausschließlich Husky und Commitlint (`prepare: "husky"`).

---

## 4. Deployment & Environment Reality

### 4.1 Render Blueprint (`render.yaml`) Analyse & Mängel
In `render.yaml` sind zwei Services definiert:
1. `portfolio-backend` (Web Service, Python):
   - `rootDir: backend`
   - `buildCommand: "./build.sh"`
   - `startCommand: "uv run gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4"`
   - `healthCheckPath: /health_check`
2. `portfolio-frontend` (Static Site):
   - `rootDir: frontend`
   - `buildCommand: npm ci --legacy-peer-deps && npm run build`
   - `staticPublishPath: dist`
   - `routes: rewrite /* -> /index.html`
   - `envVars: VITE_API_URL: https://portfolio-backend.onrender.com`

#### 🔴 Kritische Fehler in `render.yaml` (Dringender Handlungsbedarf):
1. **Unaufgelöste Merge-Konflikte (Zeilen 46–58):**
   ```yaml
   <<<<<<< HEAD
           value: "dfluechter.ipv64.de,dfluechter.onrender.com,localhost,127.0.0.1"
         - key: CSRF_TRUSTED_ORIGINS
           value: "https://dfluechter.ipv64.de"
         - key: CORS_ALLOWED_ORIGINS
           value: "https://dfluechter.ipv64.de"
   =======
           key: "dfluechter.ipv64.de,dfluechter.onrender.com,localhost,127.0.0.1"
         - key: CSRF_TRUSTED_ORIGINS
           key: "https://dfluechter.ipv64.de"
         - key: CORS_ALLOWED_ORIGINS
           key: "https://dfluechter.ipv64.de"
   >>>>>>> 92e9546 (fix(caching): remove unused imports in test caching)
   ```
2. **Ungültige YAML-Attribute (Zeilen 59–62):**
   ```yaml
         - key: PORTFOLIO_OWNER_NAME
           key: false
         - key: PORTFOLIO_OWNER_EMAIL
           key: false
   ```
   Hier steht fälschlicherweise `key: false` statt `sync: false`.
3. **Fehlkonfigurierte Umgebungsvariablen (Zeilen 29–32):**
   ```yaml
         - key: DJANGO_SETTINGS_MODULE
           value: core.DJANGO_SETTINGS_MODULE
         - key: ALLOWED_HOSTS
           value: 3.13.0
   ```
   - `DJANGO_SETTINGS_MODULE` muss `core.settings` lauten.
   - `ALLOWED_HOSTS: 3.13.0` ist ein fehlerhaftes Duplikat von `PYTHON_VERSION: 3.13.0`.

### 4.2 Ports & Adressierung im Projekt
- **Frontend Dev-Server**: Port `3000` (konfiguriert in `frontend/vite.config.ts:32`).
- **Backend Dev-Server**: Port `8000` (`http://127.0.0.1:8000`).
- **CORS Allowed Origins**: `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`.
- **CSRF Trusted Origins**: `http://localhost:8000`, `http://localhost:3000`, `http://127.0.0.1:3000`.
- **Frontend Domain**: `localhost:3000` in `.env.example`.
- **Proxy in `vite.config.ts`**:
  - `/static` $\rightarrow$ `http://127.0.0.1:8000`
  - `/media` $\rightarrow$ `http://127.0.0.1:8000`

### 4.3 KI-Modell & API-Konfiguration
- In `render.yaml` (Z. 98): `GEMINI_MODEL: "gemini-3.8-flash"`, `GEMINI_VISION_ENABLED: "true"`.
- In `.env.example` (Z. 64): `GEMINI_MODEL=gemini-2.5-flash` $\rightarrow$ **Veraltet!** Muss auf `gemini-3.8-flash` aktualisiert werden.

### 4.4 Zertifikate & Quellschutz (`CERTIFICATES_PATH`)
- `CERTIFICATES_PATH` und `CERTIFICATES_INBOX_PATH` existieren in `.env.example` und `.env` für lokale Import- und Scan-Commands.
- In `render.yaml` ist `CERTIFICATES_PATH` nicht vorhanden, da die Produktion vollständig auf Supabase S3 Storage aufsetzt.
- **Schutzregel-Status:** Der Pfad ist strikt Read-Only. Kein Skript und kein Tool darf Schreib- oder Löschaktionen im Zertifikate-Quellordner vornehmen.

---

## 5. Systematische Dokumentations-Inkonsistenzen

Die folgende Matrix erfasst alle gefundenen Diskrepanzen zwischen der Dokumentation und der tatsächlichen Codebase:

| Nr. | Dokument / Stelle | Dokumentierter Inhalt (Soll) | Realität in Codebase (Ist) | Notwendige Harmonisierung |
|---|---|---|---|---|
| **D1** | `README.md` (Z. 206), `docs/frontend.md` (Z. 218), `docs/deployment.md` (Z. 108), `docs/wiki/Frontend-Architecture.md` (Z. 18) | „82 Vitest-Tests“ | **117 Tests in 22 Testdateien** (unter anderem `motion-footer.test.tsx` mit 24 Tests) | Testanzahl in allen Dokumenten auf den aktuellen Stand (117 Tests) anpassen. |
| **D2** | `docs/frontend.md` (Z. 42–43) | Führt `SkillManager.tsx` und `TimelineManager.tsx` unter `components/dashboard/` auf | Komponenten existieren physisch nicht im Dateisystem | Dateibaum in `docs/frontend.md` bereinigen. |
| **D3** | `docs/wiki/Frontend-Architecture.md` (Z. 39) | Bezeichnet `ProjectManager, TrackManager, SkillManager` als vollwertige CRUD-Verwaltung | `DashboardPage.tsx` hat nur 3 Tabs: Certificates, Projects, Inbox. Kein `TrackManager` / `SkillManager`. | Beschreibung auf die realen Tabs und Komponenten anpassen. |
| **D4** | `docs/frontend.md` (Z. 27–74) | Unvollständiger Dateibaum | Fehlende Komponenten: `ContactSection.tsx`, `Hero.tsx`, `HeroBanner.tsx`, `ArchitectureTerminal.tsx`, `LanguageSwitcher.tsx`, `shims/next-link.tsx`, `i18n.ts`, `locales/`, `components/ui/` (12 Dateien) | Dateibaum vollständig und realitätsgetreu aktualisieren. |
| **D5** | `README.md` (Z. 165) | Passwort-Reset-URL: `/password/reset/confirm/:uid/:token` | Route in `App.tsx` (Z. 65) und allen Tests: `/password-reset/confirm/:uid/:token` | URL in `README.md` korrigieren. |
| **D6** | `README.md` (Z. 10, 71), `docs/wiki/Frontend-Architecture.md` (Z. 3, 11) | „TypeScript 5.8“ | `package.json` nutzt `"typescript": "^7.0.2"` (`tsconfig.app.json`: `TypeScript 7+`) | Angabe auf TypeScript 7.x aktualisieren. |
| **D7** | `docs/deployment.md` (Z. 41–52) | Zeigt veraltetes `render.yaml`-Snippet (`buildCommand: bash build.sh`, `startCommand: uv run gunicorn core.wsgi:application`, kein Frontend-Service) | `render.yaml` nutzt `./build.sh`, Gunicorn mit `--bind 0.0.0.0:$PORT --workers 2 --threads 4` und deklariert `portfolio-frontend` als statische Site | YAML-Snippet in `docs/deployment.md` mit dem vollständigen Blueprint synchronisieren. |
| **D8** | `render.yaml` (Z. 29–62) | Syntaxfehler, unaufgelöster Git-Merge-Konflikt, falsche Settings & Hosts | Datei enthält Konfliktmarker (`<<<<<<< HEAD`), `key: false`, `DJANGO_SETTINGS_MODULE: core.DJANGO_SETTINGS_MODULE`, `ALLOWED_HOSTS: 3.13.0` | `render.yaml` sofort syntaktisch bereinigen. |
| **D9** | `.env.example` (Z. 64) | `GEMINI_MODEL=gemini-2.5-flash` | Standard-Modell ist `gemini-3.8-flash` | `.env.example` auf `gemini-3.8-flash` aktualisieren. |
| **D10** | `docs/frontend.md` (Z. 166) | „Haupt-Initial-Chunk unterschreitet damit deutlich die 100-kB-Marke (~77 kB)“ | `index.js` liegt bei 162.8 kB (gzip 41.8 kB), `vendor-react` bei 333.0 kB (gzip 104.7 kB) | Chunk-Größenangaben in der Dokumentation aktualisieren. |
| **D11** | `docs/backlog.md` (Z. 47) | Epic 16 (i18n & Theme Polish) als „Geplant (Backlog)“ markiert | i18n (`i18next`, `de.json`, `en.json`, `LanguageSwitcher`) ist bereits in `main.tsx` und Komponenten implementiert | Status von Epic 16 bzw. US 16.1 in `docs/backlog.md` aktualisieren. |

---

## 6. Empfehlungen für den Implementierungs- / Edit-Schritt

1. **`render.yaml` reparieren**:
   - Merge-Konflikt auflösen.
   - `DJANGO_SETTINGS_MODULE: core.settings` setzen.
   - `ALLOWED_HOSTS: "dfluechter.ipv64.de,dfluechter.onrender.com,localhost,127.0.0.1"` setzen.
   - `PORTFOLIO_OWNER_NAME` und `PORTFOLIO_OWNER_EMAIL` mit `sync: false` versehen.
2. **Frontend-Dokumentation (`docs/frontend.md` & `docs/wiki/Frontend-Architecture.md`) aktualisieren**:
   - Den Dateibaum in `docs/frontend.md` anpassen (fiktive Manager entfernen, `components/ui`, `i18n`, `ContactSection`, etc. aufnehmen).
   - Testanzahl auf 117 Tests aktualisieren.
   - Initial-Chunk-Größenangaben korrigieren.
3. **`README.md` & `.env.example` synchronisieren**:
   - Passwort-Reset-Link-Pfad auf `/password-reset/confirm/:uid/:token` korrigieren.
   - Vitest-Testanzahl auf 117 Tests anpassen.
   - `.env.example` auf `GEMINI_MODEL=gemini-3.8-flash` anheben.
   - TypeScript-Versionsangabe auf TypeScript 7 aktualisieren.
4. **`docs/deployment.md` vervollständigen**:
   - Das `render.yaml`-Codebeispiel um den `portfolio-frontend`-Block und korrekte Gunicorn-Flags ergänzen.
5. **Frontend-Tests für i18n angleichen (Folgeaufgabe für Test-Agenten)**:
   - Die 5 Tests in `PortfolioChatWidget.test.tsx` und 1 Test in `PendingCertificateManager.test.tsx` an die neuen i18n-Placeholder und Selektoren anpassen, damit `npm run test` wieder 100% grün ist.
