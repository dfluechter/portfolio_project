## 2026-10-23T00:42:55Z
Du bist Worker M2 für Milestone 2: Frontend, Tooling & Metric Harmonization.
Dein Arbeitsverzeichnis ist: d:\dev\portfolio_project\.agents\teamwork\worker_m2_1
Original Request Path: d:\dev\portfolio_project\.agents\teamwork\ORIGINAL_REQUEST.md
Project Scope: d:\dev\portfolio_project\PROJECT.md
Frontend Survey Report: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_frontend.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

DEINE EXKLUSIVEN SCHREIB-DATEIEN (File Boundaries):
- `README.md`
- `docs/frontend.md`
- `docs/deployment.md`
- `docs/wiki/Frontend-Architecture.md`
- `docs/wiki/System-Architecture.md`

AUFGABEN FÜR MILESTONE 2:
1. `README.md`:
   - Korrigiere den Passwort-Reset-URL-Tippfehler in Zeile 165 von `/password/reset/confirm/:uid/:token` zu `/password-reset/confirm/:uid/:token`.
   - Aktualisiere die Vitest-Testanzahl von „82 Vitest-Tests“ auf die reale Zahl: **117 Tests in 22 Dateien** (Zeile 206).
   - Aktualisiere die TypeScript-Version auf **TypeScript 7.x** (Zeile 10 und 71).
   - Stelle sicher, dass die Befehle (`uv sync`, `npm run build`, `npm run test`) exakt stimmen.
2. `docs/frontend.md`:
   - Ergänze in Zeile 27 beim Verzeichnis-Codeblock das fehlende Sprach-Tag `text` (```text).
   - Bereinige den Komponenten- und Dateibaum:
     - Entferne nicht existierende Komponenten (`SkillManager.tsx`, `TimelineManager.tsx`).
     - Ergänze reale Komponenten: `ContactSection.tsx`, `Hero.tsx`, `HeroBanner.tsx`, `ArchitectureTerminal.tsx`, `LanguageSwitcher.tsx`, `shims/next-link.tsx`, `i18n.ts`, `locales/` (`de.json`, `en.json`) sowie das gesamte `components/ui/`-Verzeichnis (12 Komponenten/Demos inkl. `button.tsx`, `motion-footer.tsx`, `stacked-cards-interaction.tsx`, etc.).
   - Aktualisiere die Vitest-Testanzahl auf 117 Tests in 22 Testdateien (Zeile 218).
   - Korrigiere die Initial-Chunk-Größenangaben in Zeile 166 (index.js ca. 163 kB / gzip 42 kB, vendor-react ca. 333 kB / gzip 105 kB).
3. `docs/deployment.md`:
   - Aktualisiere das Render-Blueprint-Snippet (Abschnitt 2.1) auf die tatsächliche `render.yaml` (inklusive `portfolio-frontend` als Static Site und korrekten Gunicorn-Parametern).
   - Aktualisiere die Testanzahl auf 117 Vitest-Tests (Zeile 108).
   - Django 6.0 (`django>=5.2`) klarstellen.
4. `docs/wiki/Frontend-Architecture.md`:
   - Korrigiere die Dashboard-Tabs: Es gibt 3 Tabs: Certificates (`CertificateManager`), Projects (`ProjectManager`) und Inbox (`PendingCertificateManager`). Es gibt keine separaten `TrackManager` / `SkillManager` Tabs im Dashboard.
   - Aktualisiere auf TypeScript 7.x und 117 Vitest-Tests.
5. `docs/wiki/System-Architecture.md`:
   - Harmonisiere die Frontend-Metriken (React 19, Vite 8, Tailwind v4, TanStack v5, TypeScript 7.x, 117 Vitest Tests).
6. Verifikation:
   - Führe `uv run python scripts/verify_markdown_integrity.py --tier 4` aus, um sicherzustellen, dass keine Tier-4-Konflikte mehr vorliegen.
   - Führe `npm run build` im Ordner `frontend` aus, um sicherzustellen, dass das Frontend fehlerfrei baut.
   - Schutzregel: CERTIFICATES_PATH ist STRIKT READ-ONLY!
