# Original User Request

## Initial Request — 2026-10-22T23:58:47Z

Review and harmonize all Markdown files (*.md) across the entire portfolio project repository (including /docs, root README.md, AGENTS.md, specs, and wiki documentation) to ensure complete factual consistency with the actual codebase, eliminate broken internal links, and enforce clean Markdown formatting and correct German language standards.

Working directory: d:/dev/portfolio_project
Integrity mode: development

## Requirements

### R1. Repository-Wide Markdown Audit & Link Integrity
Systematically scan and verify all Markdown documents (*.md) in the repository.
- Verify every relative link and file path reference against the real filesystem to eliminate 404/dead links.
- Ensure that referenced symbols (classes, functions, endpoints like `/api/certificates/`, `/api/ai/chat/`) accurately reflect the current Django 5.2/6.0 and React 19 codebase.
- Strictly respect project safety rules: `CERTIFICATES_PATH` and the original certificate files remain strictly read-only.

### R2. Architectural Alignment & Documentation Sync
Harmonize cross-document facts between README.md, docs/architecture.md, docs/backlog.md, docs/frontend.md, and docs/specs/:
- Reflect the dual-database architecture: Neon PostgreSQL (Production/Remote) and local SQLite fallback (backend/db.sqlite3).
- Reflect the RAG Copilot stack (gemini-3.8-flash, pgvector / SQLite vector fallback, signals-based cache invalidation).
- Reflect the frontend stack (React 19, Vite 8, Tailwind CSS v4, TanStack Query v5, shadcn UI components under frontend/src/components/ui).

### R3. Quality, Grammar & Formatting Standardization
- Fix typos, grammar, and phrasing across all German and English documentation files.
- Enforce standard GitHub Flavored Markdown (GFM) formatting, consistent heading hierarchies (#, ##, ###), and correctly formatted code blocks with appropriate language tags (bash, python, tsx, json).

## Acceptance Criteria

### Automated Verification & Link Check
- [ ] Every relative link (e.g. [link](docs/architecture.md), file:///...) in all edited .md files points to an existing file or heading anchor.
- [ ] No stale references to deprecated models (e.g., gemini-2.5-flash replaced with gemini-3.8-flash).
- [ ] No broken code block fences or invalid markdown table syntaxes.

### Content & Archival Accuracy
- [ ] README.md, docs/architecture.md, docs/deployment.md, and docs/backlog.md agree on database configuration, build commands (uv sync, npm run build), and environment variables.
- [ ] All rules in AGENTS.md and .agents/rules/ are preserved and coherent.
