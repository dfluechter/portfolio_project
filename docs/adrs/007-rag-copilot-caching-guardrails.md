# ADR-007: RAG Portfolio-Copilot, Native pgvector Hybrid Retrieval, Signals Cache Invalidation & Deep Linking

**Status:** Accepted
**Datum:** 2026-10-18
**Autor:** Dominik Flüchter

---

## Kontext und Problem
Besucher, Recruiter und Tech-Leads möchten auf dem Portfolio gezielte Fachfragen zu Projekten, Zertifikaten, Tech-Skills und dem beruflichen Werdegang stellen können. Eine klassische Volltextsuche erfasst keine semantischen Zusammenhänge, während ein ungeschützter LLM-Endpunkt folgende Risiken birgt:

1. **Halluzinationen:** Ohne striktes Grounding erfindet ein Sprachmodell nicht-existente Projekte oder Qualifikationen.
2. **Skalierbarkeit & Kontext-Fenster:** Mit wachsender Anzahl an Zertifikaten (inkl. mehrseitiger OCR-Textextrakte) wird ein monolithischer Kontext-Dump unpräzise und token-intensiv.
3. **Veraltete Antworten vs. API-Kosten:** Wiederholte identische Fragen verursachen unnötige Latenz und Kosten; gleichzeitig müssen Datenänderungen im Admin-Dashboard sofort im KI-Wissen sichtbar sein.
4. **Prompt Injection & Kosten-DoS:** Öffentliche KI-Endpunkte sind anfällig für Jailbreaks, System-Prompt-Leaks und unkontrollierten Token-Verbrauch.

---

## Entscheidungen

### 1. Native `pgvector` Vektordatenbank & Hybrid Retrieval (`KnowledgeChunk`)
* **Semantisches Chunking:** Alle veröffentlichten Entitäten (`Project`, `Certificate`, `Skill`, `TimelineEntry`) sowie OCR-Volltexte aus `Certificate.source_pending` werden über [`portfolio/services/chunking.py`](../../backend/portfolio/services/chunking.py) in kontextreiche `KnowledgeChunk`-Datensätze zerlegt.
* **Vektor-Speicherung & HNSW-Index:** Auf Neon PostgreSQL wird die Erweiterung `vector` (`pgvector`) aktiviert. Das Feld `embedding = VectorField(dimensions=768)` wird über einen HNSW-Index (`vector_cosine_ops`, `m=16`, `ef_construction=64`) für schnelle $O(\log N)$ Kosinus-Ähnlichkeitssuchen indiziert.
* **Embeddings via `text-embedding-004`:** Vektoreinbettungen werden über das `google-genai` SDK erzeugt und anhand des SHA-256-Text-Hashes für 7 Tage gecacht ([`portfolio/services/embeddings.py`](../../backend/portfolio/services/embeddings.py)).
* **Resilientes Hybrid Retrieval:** [`portfolio/services/retrieval.py`](../../backend/portfolio/services/retrieval.py) kombiniert auf PostgreSQL die Vektor-Distanzsuche (`CosineDistance`) mit einem nahtlosen Keyword-Fallback für lokale SQLite-Umgebungen oder den Fall erschöpfter API-Kontingente.

### 2. Echtzeit-Synchronisation & $O(1)$ Versioned Cache Invalidation
* **Django Signals (`post_save` / `post_delete`):** Jede Änderung an `Project`, `Certificate`, `Skill` oder `TimelineEntry` aktualisiert in [`portfolio/signals.py`](../../backend/portfolio/signals.py) automatisch die zugehörigen `KnowledgeChunk`-Einträge.
* **$O(1)$ Versions-Inkrement:** Gleichzeitig wird der globale Cache-Versionsschlüssel `portfolio_rag_context_version_v1` atomar inkrementiert. Da gecachte KI-Antworten (`portfolio_ai_resp_v{version}_{hash}`) diesen Versionsschlüssel im Cache-Key tragen, verfallen veraltete Antworten augenblicklich ohne teure Wildcard-Deletes.

### 3. Mehrstufige Sicherheits-Guardrails & Zero-Cost Circuit-Breaker
* **0-Token Pre-Flight Regex-Filter:** Bekannte Prompt-Injection-, Jailbreak- und System-Prompt-Leak-Muster werden vor dem LLM-Aufruf erkannt und mit 0 Token Verbrauch abgewiesen.
* **Strikte System-Instruktionen:** Google Gemini (`gemini-2.5-flash`) antwortet ausschließlich auf Basis der bereitgestellten Portfolio-Chunks und verweigert Off-Topic-Anfragen höflich.
* **Zero-Cost Circuit-Breaker:** Ein tägliches Request- und Token-Budget im Cache schützt zuverlässig vor Kosten-Spitzen; die Standard-Quota bleibt im kostenlosen Free-Tier.

### 4. Interaktives Deep-Linking & UI-Skills Polish
* **Klickbare Quell-Badges:** Antworten enthalten strukturierte Quellen-Referenzen (`#project-<id>`, `#cert-<id>`, `#skills`, `#experience`), die im `PortfolioChatWidget` als interaktive Deep-Link-Badges gerendert werden.
* **Smooth-Scroll & Glow-Ring:** Ein Klick auf ein Quell-Badge scrollt sanft zur jeweiligen Karte auf der Startseite und hebt diese für 2 Sekunden mit einem optischen Glow-Effekt (`ring-2 ring-blue-500 shadow-lg`) hervor.

---

## Konsequenzen

### Positiv
* **Hohe Antwortpräzision:** Durch das Hybrid-Retrieval über `KnowledgeChunk` und den kompakten Portfolio-Kontext liefert der Assistent faktengetreue Antworten mit direkten Belegen.
* **Umgebungsunabhängigkeit:** Sowohl mit aktivem `pgvector` auf Neon PostgreSQL als auch lokal mit SQLite laufen alle Features und die gesamte Test-Suite ($\ge 95\%$ Coverage) ohne Zusatzinfrastruktur.
* **Volle Kostenkontrolle:** 0-Token-Abwehr bei Angriffen, 7-Tage-Embedding-Cache und harter täglicher Circuit-Breaker garantieren maximale Sicherheit.

### Negativ / Trade-offs
* Für semantische Vektorsuche in Produktion muss `GEMINI_API_KEY` gesetzt sein und die `vector`-Extension auf Neon PostgreSQL durch die Migration `0014_knowledgechunk_pgvector` aktiviert werden (passiert automatisch in `build.sh`).
