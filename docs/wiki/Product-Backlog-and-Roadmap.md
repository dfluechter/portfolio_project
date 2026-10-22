# Product Backlog & Optimierungs-Roadmap

Diese Seite dokumentiert den aktuellen Status der agilen Epics, die Definition of Ready (DoR), die Definition of Done (DoD) und die anstehenden Meilensteine.

---

## 1. Definition of Ready (DoR) & Definition of Done (DoD)

### Definition of Ready (DoR)
Eine Story ist bereit zur Umsetzung ("Ready"), wenn:
1. Ein klarer Persona-Nutzen formuliert ist (*"Als [Rolle] möchte ich [Ziel], um [Nutzen]"*).
2. Automatisierbare, eindeutige Akzeptanzkriterien (BDD: Given / When / Then) definiert sind.
3. Architektur- und Sicherheitsimplikationen geklärt sind.
4. Externe Abhängigkeiten (Neon, Supabase, Render) identifiziert sind.

### Definition of Done (DoD)
Eine Story gilt als abgeschlossen ("Done"), wenn:
1. Alle Akzeptanzkriterien vollständig erfüllt sind.
2. **Backend**: Pytest Coverage $\ge 95\%$ (`pytest --cov=portfolio --cov-fail-under=95`).
3. **Backend**: Ruff (`ruff check .`), Mypy (`mypy .`) und Formatter laufen fehlerfrei.
4. **Frontend**: Oxlint (`npm run lint`), Vitest (`npm run test`) und Build (`npm run build`) sind grün.
5. **Dokumentation**: Änderungen in `/docs` und im Wiki nachgeführt sind.
6. **CI/CD**: GitHub Actions CI-Workflows auf `main` sind erfolgreich abgeschlossen.

---

## 2. Status-Matrix der Epics

| Epic | Thema | Status | Abgeschlossene Stories |
|---|---|---|---|
| **Epic 1** | CI/CD- & Build-Pipeline-Stabilität | Abgeschlossen | US 1.1 |
| **Epic 2** | Frontend-Architektur-Dokumentation | Abgeschlossen | US 2.1 |
| **Epic 3** | Repository-Hygiene & Dateistruktur | Abgeschlossen | US 3.1 |
| **Epic 4** | Deployment & Operations Leitfaden | Abgeschlossen | US 4.1 |
| **Epic 5** | Zertifikats-Review & Dashboard-Skalierung | Abgeschlossen | US 5.1, US 5.2 |
| **Epic 6** | Public Track-Filterung & Cold-Start UX | Abgeschlossen | US 6.1, US 6.2 |
| **Epic 7** | Headless Cleanup & Frontend Bundle Splitting | Abgeschlossen | US 7.1, US 7.2 |
| **Epic 8** | Neon Connection Separation & DDL-Stabilität | Abgeschlossen | US 8.1 |
| **Epic 9** | Gemini Vision Fallback & Magic-Byte Validation | Abgeschlossen | US 9.1, US 9.2 |
| **Epic 10** | Supabase S3 Presigned Uploads & Security | Abgeschlossen | US 10.1, US 10.2 |
| **Epic 11** | RAG Portfolio-Copilot, pgvector Hybrid Retrieval, Guardrails | Abgeschlossen | US 11.1 bis 11.5 |
| **Epic 12** | Track-Pflicht für Zertifikate & FontAwesome Solid Icons | Abgeschlossen | US 12.1 bis 12.4 |
| **Epic 13** | Robuste OCR-Extraktion, Show File & Commitlint-Governance | Abgeschlossen | US 13.1 bis 13.4 |
| **Epic 14** | Inbox-Automatisierung, Duplikatsprüfung & Batch-Processing | Bereit zur Umsetzung (Ready) | US 14.1, 14.2, 14.3 |
| **Epic 15** | Public Performance, HTTP-Caching & Core Web Vitals | In Umsetzung | US 15.1 (In Bearbeitung) |

---

## 3. Aktueller Sprint-Fokus

### US 15.1: HTTP Conditional Caching (ETag & Cache-Control)
- **Ziel**: Reduzierung der Neon Datenbankabfragen und Beschleunigung wiederkehrender Besucherzugriffe.
- **Akzeptanzkriterien**:
  - `ETag`-Header auf Basis der Signal-Cache-Version `portfolio_rag_context_version_v1`.
  - Bei übereinstimmendem `If-None-Match` antwortet Django sofort mit `304 Not Modified`.
  - `Cache-Control: public, max-age=300, stale-while-revalidate=60` für unauthentifizierte Aufrufe.

### US 14.2: Bulk-Approve und Bulk-Reject für Inbox-Zertifikate
- **Ziel**: Stapelverarbeitung mehrerer Inbox-Kandidaten im Admin-Dashboard.
- **Akzeptanzkriterien**:
  - Atomare Transaktionen (`transaction.atomic`) bei der Batch-Freigabe.
  - Zuweisung von Tracks zur Erfüllung der Track-Pflicht aus Epic 12.
