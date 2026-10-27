# Repository-Wide Markdown & Link Inventory Survey

**Erstellt von:** Explorer 1 (Markdown & Link Inventory Specialist)  
**Datum:** 2026-10-23  
**Status:** Abgeschlossen  
**Zielverzeichnis:** `d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_markdown.md`  

---

## 1. Executive Summary

Im Rahmen des Repository-weiten Markdown-Audits wurden sämtliche Markdown-Dokumente (`*.md`) im Projekt `portfolio_project` automatisiert erfasst, geparst und gegen das reale Dateisystem validiert.

### Kernkennzahlen
* **Gefundene Markdown-Dateien:** **139** (davon **43** Kern-Projektdokumente in Root, `/docs`, `design-system`, `.github`, `.agents/rules` und `frontend`)
* **Geprüfte Links & Pfade:** **566** Links
* **Valide Links:** **221**
* **Externe URLs:** **318** (21 eindeutige URLs in Projekt-Dokumenten, alle syntaktisch valide)
* **Tote Links (404 / Broken Paths):** **20**
* **Gebrochene Anker (Broken Heading Anchors):** **7**
* **Absolute lokale Windows-Dateisystem-URIs (`file:///...`):** **15**
* **Codeblöcke ohne Sprach-Tag:** **1** in Kern-Docs (`docs/frontend.md:27`), 8 in Agent-Skills
* **Ungeschlossene Code-Fences:** **0** (100% sauber geschlossen)
* **Tabellen-Syntaxfehler:** **0** (alle Markdown-Tabellen haben gültige Delimiter und passende Spaltenzahlen)
* **Veraltete LLM-Modellreferenzen:** **2** Stellen mit `gemini-2.5-flash` statt `gemini-3.8-flash` (`docs/backlog.md`, `docs/adrs/007-rag-copilot-caching-guardrails.md`)

---

## 2. Vollständiges Markdown-Dateien-Inventar

### 2.1 Kern-Projektdokumentation (43 Dateien)

| Kategorie | Pfad | Zeilen | Zeichen | Beschreibung / Zweck |
|---|---|---|---|---|
| **Root** | `README.md` | 252 | 18.466 | Haupt-README: Tech Stack, Setup, Architektur, Befehle, Projektstruktur |
| **Root** | `AGENTS.md` | 19 | 875 | Projektrichtlinien & Schutzregeln für AI-Agenten |
| **Frontend** | `frontend/README.md` | 76 | 3.077 | Frontend SPA Setup, Scripts, Architektur-Verweise |
| **Design System** | `design-system/dominik-fluechter-portfolio/MASTER.md` | 126 | 5.892 | Design System Master Style Guide (Farben, Typo, Spacing) |
| **Design System** | `design-system/dominik-fluechter-portfolio/pages/dashboard.md` | 44 | 1.879 | Design Guidelines für Admin Dashboard |
| **GitHub** | `.github/ISSUE_TEMPLATE/bug_report.md` | 35 | 841 | Issue Template für Fehlerberichte |
| **GitHub** | `.github/ISSUE_TEMPLATE/feature_request.md` | 29 | 602 | Issue Template für Feature Requests |
| **Agents Rules** | `.agents/rules/language.md` | 19 | 741 | Sprach-Vorgabe (Deutsch für alle Agenten) |
| **Agents Rules** | `.agents/rules/protect-certificates.md` | 25 | 1.054 | Strikt schreibgeschützte Schutzregel für `CERTIFICATES_PATH` |
| **Docs Core** | `docs/AGENTS.md` | 120 | 8.394 | Detaillierte technische Agenten-Vorgaben & Stack-Regeln |
| **Docs Core** | `docs/CONTRIBUTING.md` | 119 | 5.548 | Beitragsrichtlinien, Commit-Konventionen, Code-Standards |
| **Docs Core** | `docs/GEMINI.md` | 51 | 3.680 | Gemini-spezifische Guidelines & Teamwork Rollen-Delegation |
| **Docs Core** | `docs/SECURITY.md` | 154 | 10.428 | Sicherheitsarchitektur, Defense-in-Depth, Zero-Cost Circuit Breaker |
| **Docs Core** | `docs/adr_proposals.md` | 39 | 3.671 | Übersicht und Status aller 7 ADRs |
| **Docs Core** | `docs/ai-assistant-rag.md` | 153 | 11.238 | RAG Copilot, pgvector, HNSW, Signals Caching & Guardrails |
| **Docs Core** | `docs/architecture.md` | 296 | 17.971 | Gesamtsystem-Architektur, Datenflüsse, API & Security |
| **Docs Core** | `docs/backlog.md` | 780 | 48.987 | Agiles Product Backlog (Epics 1–16), User Stories, DoR/DoD |
| **Docs Core** | `docs/deployment.md` | 223 | 12.858 | Render Deployment, Neon DB Branching, CI/CD, CORS |
| **Docs Core** | `docs/frontend.md` | 259 | 15.082 | React 19 Frontend-Architektur, State, Routing & Testing |
| **Docs Core** | `docs/glossary.md` | 123 | 9.062 | Verbindliches Glossar über Entitäten, Lifecycle & Vektorsuche |
| **Docs ADRs** | `docs/adrs/001-monorepo.md` | 64 | 2.511 | ADR-001: Monorepo vs. Polyrepo |
| **Docs ADRs** | `docs/adrs/002-neon-db.md` | 55 | 2.628 | ADR-002: Neon Serverless PostgreSQL & Branching |
| **Docs ADRs** | `docs/adrs/003-dual-auth-strategie.md` | 66 | 3.284 | ADR-003: Frühere Dual-Auth (abgelöst durch ADR-006) |
| **Docs ADRs** | `docs/adrs/004-state-management-frontend.md` | 57 | 2.802 | ADR-004: Frontend State Management (TanStack Query + Context) |
| **Docs ADRs** | `docs/adrs/005-certificate-lifecycle-and-review.md` | 55 | 2.569 | ADR-005: Zertifikats-Lifecycle & Review-Drawer |
| **Docs ADRs** | `docs/adrs/006-resolving-technical-debt-and-security.md` | 89 | 5.568 | ADR-006: Headless Cleanup, Neon Connection Separation |
| **Docs ADRs** | `docs/adrs/007-rag-copilot-caching-guardrails.md` | 114 | 7.375 | ADR-007: RAG Copilot, pgvector, Signals Caching, Deep Linking |
| **Docs ADRs** | `docs/adrs/template.md` | 44 | 1.157 | ADR Vorlage |
| **Docs Specs** | `docs/specs/us-14-2-bulk-approve-reject.md` | 204 | 12.181 | Spec: US-14.2 Bulk Approve/Reject für Pending Certificates |
| **Docs Specs** | `docs/specs/us-15-1-conditional-caching.md` | 117 | 7.747 | Spec: US-15.1 HTTP Conditional Caching (ETag/304) |
| **Docs Specs** | `docs/specs/us-16-1-i18n-portfolio-and-copilot.md` | 175 | 8.546 | Spec: US-16.1 Internationalisierung (i18n) |
| **Docs Specs** | `docs/specs/us-3-2-root-cleanup-and-auth-harmonization.md` | 91 | 5.485 | Spec: US-3.2 Root Cleanup & Auth Harmonization |
| **Docs Wiki** | `docs/wiki/Deployment-and-Operations.md` | 100 | 5.474 | Wiki: Deployment & Render Operations |
| **Docs Wiki** | `docs/wiki/Developer-Guide.md` | 93 | 5.097 | Wiki: Entwickler-Leitfaden, Setup & Tests |
| **Docs Wiki** | `docs/wiki/Frontend-Architecture.md` | 108 | 5.760 | Wiki: Frontend-Architektur |
| **Docs Wiki** | `docs/wiki/Glossary.md` | 112 | 8.243 | Wiki: Fachglossar |
| **Docs Wiki** | `docs/wiki/Home.md` | 121 | 9.304 | Wiki: Startseite & Schnellnavigation |
| **Docs Wiki** | `docs/wiki/Product-Backlog-and-Roadmap.md` | 106 | 6.840 | Wiki: Backlog & Roadmap Übersicht |
| **Docs Wiki** | `docs/wiki/RAG-Portfolio-Copilot.md` | 115 | 7.159 | Wiki: RAG Copilot & pgvector Handbuch |
| **Docs Wiki** | `docs/wiki/Security-Policy.md` | 109 | 6.223 | Wiki: Sicherheitskonzept |
| **Docs Wiki** | `docs/wiki/System-Architecture.md` | 114 | 6.877 | Wiki: System-Architektur |
| **Docs Wiki** | `docs/wiki/_Footer.md` | 7 | 258 | Wiki: Footer Navigation |
| **Docs Wiki** | `docs/wiki/_Sidebar.md` | 20 | 766 | Wiki: Sidebar Navigation |

### 2.2 Externe & Hilfsdateien (96 Dateien)
* **Agent Skills (`.agents/skills/**`):** 93 Markdown-Dateien (Referenz- und Skill-Definitionen u.a. für `django-pro`, `neon`, `supabase`, `python-pro`, `gemini-api-dev`).
* **Teamwork Metadaten (`.agents/teamwork/**`):** `ORIGINAL_REQUEST.md`, `DISPATCH.md`, `BRIEFING.md`.

---

## 3. Detaillierte Befunde zu toten Links (Dead Links / 404)

Es wurden **20 tote Links** identifiziert, die sich in drei Hauptursachen kategorisieren lassen:

### 3.1 Fehlende `.md`-Dateiendungen im GitHub Wiki (17 tote Links)
In `docs/wiki/Home.md` und `docs/wiki/_Sidebar.md` wurden Navigationslinks im GitHub-Wiki-Format ohne Dateiendung angelegt (z. B. `[System-Architecture](System-Architecture)`). Wenn diese Markdown-Dateien jedoch direkt im Repository unter `docs/wiki/` oder in einem IDE-/Markdown-Viewer geöffnet werden, schlägt die Auflösung fehl (404), da keine dateiendungslosen Dateien im Ordner existieren.

| Quelldatei | Zeile | Text | Fehlerhafter Link | Korrekter relativer Pfad |
|---|---|---|---|---|
| `docs/wiki/Home.md` | 11 | System-Architecture | `(System-Architecture)` | `(System-Architecture.md)` |
| `docs/wiki/Home.md` | 12 | RAG-Portfolio-Copilot | `(RAG-Portfolio-Copilot)` | `(RAG-Portfolio-Copilot.md)` |
| `docs/wiki/Home.md` | 13 | Frontend-Architecture | `(Frontend-Architecture)` | `(Frontend-Architecture.md)` |
| `docs/wiki/Home.md` | 14 | Deployment-and-Operations | `(Deployment-and-Operations)` | `(Deployment-and-Operations.md)` |
| `docs/wiki/Home.md` | 15 | Security-Policy | `(Security-Policy)` | `(Security-Policy.md)` |
| `docs/wiki/Home.md` | 16 | Developer-Guide | `(Developer-Guide)` | `(Developer-Guide.md)` |
| `docs/wiki/Home.md` | 17 | Product-Backlog-and-Roadmap | `(Product-Backlog-and-Roadmap)` | `(Product-Backlog-and-Roadmap.md)` |
| `docs/wiki/Home.md` | 18 | Glossary | `(Glossary)` | `(Glossary.md)` |
| `docs/wiki/_Sidebar.md` | 3 | 🏠 Startseite | `(Home)` | `(Home.md)` |
| `docs/wiki/_Sidebar.md` | 4 | 🏗️ System-Architektur | `(System-Architecture)` | `(System-Architecture.md)` |
| `docs/wiki/_Sidebar.md` | 5 | 🤖 RAG Copilot & pgvector | `(RAG-Portfolio-Copilot)` | `(RAG-Portfolio-Copilot.md)` |
| `docs/wiki/_Sidebar.md` | 6 | ⚛️ Frontend-Architektur | `(Frontend-Architecture)` | `(Frontend-Architecture.md)` |
| `docs/wiki/_Sidebar.md` | 7 | 🚀 Deployment & CI/CD | `(Deployment-and-Operations)` | `(Deployment-and-Operations.md)` |
| `docs/wiki/_Sidebar.md` | 8 | 🔒 Sicherheitskonzept | `(Security-Policy)` | `(Security-Policy.md)` |
| `docs/wiki/_Sidebar.md` | 9 | 🛠️ Developer Guide | `(Developer-Guide)` | `(Developer-Guide.md)` |
| `docs/wiki/_Sidebar.md` | 10 | 📋 Backlog & Roadmap | `(Product-Backlog-and-Roadmap)` | `(Product-Backlog-and-Roadmap.md)` |
| `docs/wiki/_Sidebar.md` | 11 | 📚 Glossar | `(Glossary)` | `(Glossary.md)` |

### 3.2 Root-Relative Pfadverwechslung in `docs/CONTRIBUTING.md` (2 tote Links)
In `docs/CONTRIBUTING.md` wird auf Konfigurationsdateien im Repository-Root verlinkt, jedoch ohne vorangestelltes `../`:

| Quelldatei | Zeile | Text | Fehlerhafter Link | Korrekter relativer Pfad |
|---|---|---|---|---|
| `docs/CONTRIBUTING.md` | 82 | `.editorconfig` | `(.editorconfig)` | `(../.editorconfig)` |
| `docs/CONTRIBUTING.md` | 99 | `.gitmessage` | `(.gitmessage)` | `(../.gitmessage)` |

*Ursache:* Der Link sucht relativ zum Verzeichnis der Datei nach `docs/.editorconfig` bzw. `docs/.gitmessage`.

### 3.3 Relativer Linkfehler in `.agents/teamwork/ORIGINAL_REQUEST.md` (1 toter Link)
| Quelldatei | Zeile | Text | Fehlerhafter Link | Korrekter relativer Pfad |
|---|---|---|---|---|
| `.agents/teamwork/ORIGINAL_REQUEST.md` | 31 | link | `(docs/architecture.md)` | `(../../docs/architecture.md)` |

---

## 4. Detaillierte Befunde zu gebrochenen Überschriften-Ankern (Broken Anchors)

Es wurden **7 gebrochene Anker** identifiziert:

| Quelldatei | Zeile | Text | Ziel-Anker | Ursache & Korrektur |
|---|---|---|---|---|
| `docs/architecture.md` | 156 | `deployment.md` | `deployment.md#5-supabase-storage-cors-für-direct-uploads` | **Veralteter Anker.** In `docs/deployment.md` lautet Heading 5: `## 5. Supabase Storage: CORS-Konfiguration für Direct-to-Storage Uploads`. Korrekter Anker: `#5-supabase-storage-cors-konfiguration-für-direct-to-storage-uploads`. |
| `docs/backlog.md` | 586 | `docs/deployment.md` | `deployment.md#32-konventionelle-commit-nachrichten--git-hooks` | **Veralteter Anker.** In `docs/deployment.md` lautet Heading 3.2: `### 3.2 Automatisierte Qualitätssicherung durch Git-Hooks und Commitlint`. Korrekter Anker: `#32-automatisierte-qualitätssicherung-durch-git-hooks-und-commitlint`. |
| `README.md` | 19 | ✨ Kernfunktionen & Architektur-Highlights | `#-kernfunktionen--architektur-highlights` | Führender Bindestrich und Emoji-Parsing-Inkonsistenz zu GitHub cmark-gfm. GFM-Slug für `## ✨ Kernfunktionen & Architektur-Highlights` ist `kernfunktionen--architektur-highlights` (ohne führendes `-`). |
| `README.md` | 21 | 📚 Technische Dokumentation & ADRs | `#-technische-dokumentation--adrs` | Führender Bindestrich (`technische-dokumentation--adrs`). |
| `README.md` | 24 | 🔒 Auth- & Sicherheitskonfiguration | `#-auth---sicherheitskonfiguration` | Führender Bindestrich (`auth---sicherheitskonfiguration`). |
| `README.md` | 26 | 🧪 Test Coverage & Qualitätssicherung | `#-test-coverage--qualitätssicherung` | Führender Bindestrich (`test-coverage--qualitätssicherung`). |
| `.agents/skills/neon-functions/SKILL.md` | 337 | Hono | `#hono` | Fehlender Anker `#hono` im Drittanbieter-Skill. |

---

## 5. Detaillierte Befunde zu absoluten `file:///` URIs (15 Fälle)

In **6 Kerndokumenten** wurden **15 absolute `file:///d:/dev/portfolio_project/...` URIs** gefunden. Diese Links sind auf fremden Systemen (Linux/Mac/GitHub Web/andere Entwickler-PCs) nicht portabel und brechen sofort.

| Quelldatei | Zeile | Link-Text | Absoluter Pfad (`file:///...`) | Portabler relativer Link |
|---|---|---|---|---|
| `AGENTS.md` | 16 | `.agents/rules/language.md` | `file:///d:/dev/portfolio_project/.agents/rules/language.md` | `[.agents/rules/language.md](.agents/rules/language.md)` |
| `docs/backlog.md` | 445 | `backend/portfolio/tests/test_certificate_track_validation.py` | `file:///D:/dev/portfolio_project/backend/portfolio/tests/test_certificate_track_validation.py` | `[`backend/portfolio/tests/test_certificate_track_validation.py`](../backend/portfolio/tests/test_certificate_track_validation.py)` |
| `docs/deployment.md` | 55 | `backend/build.sh` | `file:///d:/dev/portfolio_project/backend/build.sh` | `[`backend/build.sh`](../backend/build.sh)` |
| `docs/deployment.md` | 55 | `build.sh` | `file:///d:/dev/portfolio_project/build.sh` | `[`build.sh`](../build.sh)` |
| `docs/deployment.md` | 95 | `.github/workflows/ci.yml` | `file:///d:/dev/portfolio_project/.github/workflows/ci.yml` | `[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)` |
| `docs/deployment.md` | 117 | `render.yaml` | `file:///d:/dev/portfolio_project/render.yaml` | `[render.yaml](../render.yaml)` |
| `docs/deployment.md` | 120 | `.github/CODEOWNERS` | `file:///d:/dev/portfolio_project/.github/CODEOWNERS` | `[`.github/CODEOWNERS`](../.github/CODEOWNERS)` |
| `docs/deployment.md` | 141 | `.commitlintrc.json` | `file:///d:/dev/portfolio_project/.commitlintrc.json` | `[`.commitlintrc.json`](../.commitlintrc.json)` |
| `docs/deployment.md` | 164 | `.husky/commit-msg` | `file:///d:/dev/portfolio_project/.husky/commit-msg` | `[`.husky/commit-msg`](../.husky/commit-msg)` |
| `docs/deployment.md` | 173 | `.github/workflows/ci.yml` | `file:///d:/dev/portfolio_project/.github/workflows/ci.yml` | `[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)` |
| `docs/SECURITY.md` | 64 | `ai_assistant.py` | `file:///d:/dev/portfolio_project/backend/portfolio/services/ai_assistant.py` | `[`ai_assistant.py`](../backend/portfolio/services/ai_assistant.py)` |
| `docs/SECURITY.md` | 146 | `render.yaml` | `file:///d:/dev/portfolio_project/render.yaml` | `[render.yaml](../render.yaml)` |
| `docs/SECURITY.md` | 148 | `.github/CODEOWNERS` | `file:///d:/dev/portfolio_project/.github/CODEOWNERS` | `[`.github/CODEOWNERS`](../.github/CODEOWNERS)` |
| `docs/specs/us-15-1-conditional-caching.md` | 114 | `backend/portfolio/tests/test_caching.py` | `file:///d:/dev/portfolio_project/backend/portfolio/tests/test_caching.py` | `[`backend/portfolio/tests/test_caching.py`](../../backend/portfolio/tests/test_caching.py)` |
| `docs/wiki/Deployment-and-Operations.md` | 9 | `render.yaml` | `file:///d:/dev/portfolio_project/render.yaml` | `[render.yaml](../../render.yaml)` |

---

## 6. Formatierungs-, Syntax- & Konsistenz-Befunde

### 6.1 Codeblöcke & Language-Tags
- **Fehlendes Sprach-Tag in Projekt-Dokumentation:**
  - `docs/frontend.md`, Zeile 27: Ein Codeblock für die Verzeichnisstruktur beginnt mit ` ``` ` ohne Sprachangabe.
  - **Empfehlung:** Ergänzung von ` ```text ` oder ` ```ascii `.
- **Ungeschlossene Codeblöcke:** Keine im gesamten Repository gefunden. Alle Codeblöcke werden ordnungsgemäß mit den passenden Fences geschlossen.

### 6.2 Markdown-Tabellen
- Sämtliche Tabellen in der Projektdokumentation (z. B. in `README.md`, `docs/architecture.md`, `docs/deployment.md`, `docs/adr_proposals.md`, `docs/wiki/Home.md`) weisen eine valide GFM-Tabellen-Syntax auf:
  - Vollständige Pipes am Zeilenanfang und -ende (`| ... |`)
  - Gültige Trennzeilen mit mindestens 3 Bindestrichen (`|---|---|`)
  - Einheitliche Spaltenanzahl zwischen Kopfzeile und Datenzeilen

### 6.3 Veraltete Modell-Referenzen
Im Projekt ist `gemini-3.8-flash` als Standardmodell für RAG und multimodale OCR etabliert. An 2 Stellen wird noch das veraltete Modell `gemini-2.5-flash` referenziert:
1. `docs/backlog.md`, Zeile 516: `Anfragen an veraltete Modelle (z. B. gemini-2.5-flash)` (historische Formulierung im Acceptance Criteria Kontext)
2. `docs/adrs/007-rag-copilot-caching-guardrails.md`, Zeile 33: `Google Gemini (gemini-2.5-flash) antwortet...` -> **Muss auf `gemini-3.8-flash` aktualisiert werden.**

### 6.4 In-Text Dateipfade und Namens-Inkonsistenzen
1. **Fehlender Ordner `common/` bei Component-Referenz:**
   - In `docs/specs/us-16-1-i18n-portfolio-and-copilot.md`, Zeile 146 wird `frontend/src/components/common/LanguageSwitcher.tsx` referenziert.
   - Reales Dateisystem: Die Komponente liegt direkt unter `frontend/src/components/LanguageSwitcher.tsx`.
2. **Fehlendes `backend/`-Präfix im Fließtext:**
   - In `docs/AGENTS.md`, `docs/architecture.md`, `docs/backlog.md`, `docs/adrs/007-rag-copilot-caching-guardrails.md` und `docs/wiki/RAG-Portfolio-Copilot.md` werden Pfade wie `portfolio/signals.py`, `core/settings.py` oder `portfolio/models.py` ohne `backend/`-Präfix genannt.
   - Da das Projekt ein Monorepo ist, sollte konsistent `backend/portfolio/signals.py` und `backend/core/settings.py` verwendet werden.

---

## 7. Einhaltung der Schutzregeln

* **`CERTIFICATES_PATH`:** Weder der Pfad noch die dortigen Originaldateien wurden verändert, verschoben oder gelöscht. Sämtliche Untersuchungen erfolgten rein lesend und unter ausschließlicher Nutzung lokaler Metadaten-Scans.
* **Workspace-Disziplin:** Alle Analyse-Skripte und Zwischenergebnisse (`scan_markdown.py`, `summarize_findings.py`, `deep_doc_audit.py`, `scan_results.json`, `deep_audit.json`) wurden streng im Agenten-Arbeitsverzeichnis `.agents/teamwork/teamwork_preview_explorer_survey_1/` belassen.
