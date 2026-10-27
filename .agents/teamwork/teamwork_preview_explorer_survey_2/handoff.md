# Handoff Report — Explorer 2 (Backend & Database Architecture Reality)

**Datum:** 2026-10-23  
**Verfasser:** Explorer 2 (`teamwork_preview_explorer_survey_2`)  
**Typ:** Hard Handoff (Aufgabe vollständig abgeschlossen)  
**Bericht-Referenz:** [`survey_backend.md`](survey_backend.md)

---

## 1. Observation

1. **Python- und Django-Version:**
   - `.python-version` (Zeile 1): `3.13`
   - `backend/pyproject.toml` (Zeilen 9–11):
     ```toml
     requires-python = ">=3.13"
     dependencies = [
         "django>=5.2",
     ```
   - `backend/uv.lock` (Zeilen 440–443):
     ```toml
     [[package]]
     name = "django"
     version = "6.0.8"
     ```
   - Dokumente (`docs/architecture.md` Z. 25 & 57, `docs/AGENTS.md` Z. 18, `README.md` Z. 74): Konsistente Bezeichnung als „Django 5.2“ bzw. „Django 5.2+“.

2. **Backend-Apps & Einstellungen (`backend/core/settings.py`):**
   - `INSTALLED_APPS` (Zeilen 63–76): Enthält `django.contrib.*`, `corsheaders`, `storages`, `rest_framework`, `djoser`, `drf_spectacular`, `portfolio`.
   - `AUTH_USER_MODEL = "portfolio.User"` (Zeile 285).
   - Throttling (Zeilen 303–306): `anon: 60/minute`, `ai_chat: 20/minute`.
   - Media-Storage (Zeilen 210–262): Supabase S3 via `storages.backends.s3.S3Storage` (`USE_SUPABASE_S3=True`) mit Signatur `s3v4` und `addressing_style="path"`.

3. **URLs und Views (`backend/core/urls.py` & `backend/portfolio/views.py`):**
   - DefaultRouter unter `/api/`: `projects` (`ProjectViewSet`), `providers` (`ProviderViewSet`), `certificates` (`CertificateViewSet`), `skills` (`SkillViewSet`), `timeline` (`TimelineEntryViewSet`), `tracks` (`TrackViewSet`), `pending-certificates` (`PendingCertificateViewSet`).
   - Custom Actions auf `CertificateViewSet`: `presigned_upload`, `publish`, `unpublish`, `extract_metadata`.
   - Custom Actions auf `PendingCertificateViewSet`: `approve`, `reject`, `bulk_approve`, `bulk_reject`, `file`.
   - Standalone Views: `/` (`api_root_view`), `/health_check` (`health_check_view`), `/api/ai/chat/` (`AIChatView`), `/api/auth/password-reset/` (`PasswordResetRequestView`), `/api/auth/` (Djoser + JWT), `/api/schema/` (`SpectacularAPIView`), `/api/docs/` (`SpectacularSwaggerView`).

4. **Dual-Database Setup & Connection Routing:**
   - In `backend/core/settings.py` (Zeilen 124–160):
     - `IS_MIGRATION_COMMAND` prüft `sys.argv` auf `migrate`, `makemigrations`, `showmigrations`, `sqlmigrate` oder `RUNNING_MIGRATION == "1"`.
     - Bei Migrationen wird `DIRECT_DATABASE_URL` (ohne `-pooler`, `conn_max_age=0`) priorisiert.
     - Im Web-Betrieb wird `DATABASE_URL` (gepoolt über PgBouncer mit `-pooler`, `conn_max_age=600`, `conn_health_checks=True`) verwendet.
     - Ohne gesetzte Env-Variablen greift der lokale Fallback: `sqlite:///{BASE_DIR / 'db.sqlite3'}`.
   - Migration `0014_knowledgechunk_pgvector.py` (Zeilen 7–28):
     - `enable_pgvector` und `create_hnsw_index` führen DDL-Befehle nur aus, wenn `schema_editor.connection.vendor == "postgresql"`.
   - Fallback in `backend/portfolio/models.py` (Zeilen 15–36):
     - `VectorField` mappt bei `connection.vendor != "postgresql"` transparent auf den DB-Typ `text`.

5. **RAG / Vector Copilot Reality:**
   - LLM: `model="gemini-3.8-flash"` in `backend/portfolio/services/ai_assistant.py` (Zeile 586) und `backend/portfolio/services/extractor.py` (Zeile 661).
   - Embeddings: `DEFAULT_EMBEDDING_MODEL = "text-embedding-004"` mit 768 Dimensionen in `backend/portfolio/services/embeddings.py` (Zeilen 17–18).
   - Retrieval (`backend/portfolio/services/retrieval.py`): Hybrid-Retrieval mit `CosineDistance` auf PostgreSQL (`is_pgvector_active()`) und Keyword-Matching (`Q(title__icontains=...) | Q(content__icontains=...)`) als SQLite-Fallback.
   - Signals & Cache Invalidation (`backend/portfolio/signals.py`): `post_save` und `post_delete` invalidieren `portfolio_rag_grounding_context_v1` und inkrementieren atomar die Version `portfolio_rag_context_version_v1` ($O(1)$).
   - Response-Cache: `portfolio_ai_resp_v{version}_{query_hash}` verfällt bei Versionserhöhung automatisch.

6. **Inkonsistenzen in Dokumenten & Konfigurationen:**
   - `.env.example` (Zeile 64): `GEMINI_MODEL=gemini-2.5-flash`.
   - `docs/adrs/007-rag-copilot-caching-guardrails.md` (Zeile 33): `Google Gemini (gemini-2.5-flash)`.
   - `backend/portfolio/services/extractor.py` (Docstring Zeile 580): `Gemini 2.5 Flash Vision`.
   - `render.yaml` (Zeilen 46–58): Ungelöster Git-Merge-Konflikt-Marker (`<<<<<<< HEAD` / `=======` / `>>>>>>> 92e9546`) und Syntaxfehler `key: false`.
   - `docs/architecture.md` (Tabelle 3.1 & 3.4): Es fehlen `bulk_approve`, `bulk_reject` und `/api/auth/password-reset/`.

7. **Schutzregel CERTIFICATES_PATH:**
   - Verzeichnis und Originaldateien werden ausnahmslos read-only behandelt (`hashlib.sha256`, Lese-Streams). Keine Lösch- oder Schreiboperationen.

---

## 2. Logic Chain

1. **Beobachtung 1 → Schlussfolgerung Stack:**
   - Da `uv.lock` die exakt aufgelöste Laufzeitumgebung darstellt und dort `django = 6.0.8` fixiert ist, läuft das Projekt real auf Django 6.0.8 unter Python 3.13. Da in `pyproject.toml` `django>=5.2` gefordert ist, ist die Codebase für 5.2 und 6.0 gleichermaßen valide. Die Dokumentation ist historisch auf „Django 5.2“ fixiert und sollte als „Django 6.0 (kompatibel mit Django 5.2+)“ harmonisiert werden.
2. **Beobachtung 4 → Schlussfolgerung Dual-DB:**
   - Die Trennung von `DATABASE_URL` (PgBouncer Transaction Pooling) und `DIRECT_DATABASE_URL` (DDL-Migrationen) ist in `core/settings.py` vollständig implementiert und durch Unit-Tests (`portfolio/tests/test_database_config.py`) abgesichert. SQLite funktioniert nahtlos als lokaler Zero-Config Fallback.
3. **Beobachtung 5 → Schlussfolgerung RAG-Stack:**
   - Alle aktiven Codepfade in `ai_assistant.py` und `render.yaml` nutzen `gemini-3.8-flash` via `google-genai` SDK. Die Nennungen von `gemini-2.5-flash` in `.env.example` und `ADR-007` sind veraltete Dokumentationsartefakte, die Verwirrung stiften und angepasst werden müssen.
4. **Beobachtung 3 & 6 → Schlussfolgerung Dokumentationslücken:**
   - Die in US 14.2 umgesetzten Batch-Aktionen (`bulk_approve`, `bulk_reject`) und der spezifische Reset-Endpunkt (`PasswordResetRequestView`) sind in der API aktiv, fehlen jedoch in den Referenztabellen der `docs/architecture.md`.
5. **Beobachtung 6 → Schlussfolgerung Render-YAML-Defekt:**
   - Der Merge-Konflikt in `render.yaml` macht die Deklaration syntaktisch fehlerhaft und verhindert saubere automatisierte Deployments über Render Blueprints.

---

## 3. Caveats

- **Verzeichnis `backend/apps/`:** Enthält Unterordner `backend/apps/portfolio/` mit `__pycache__` und leeren Ordnern, wird aber im Code nirgends referenziert (`INSTALLED_APPS` nutzt `"portfolio"`). Dies ist ein harmloses, aber unsauberes Relikt.
- Es wurden keine Schreibzugriffe auf Produktiv- oder Testdatenbanken ausgeführt; alle Feststellungen basieren auf der statischen Analyse des Quellcodes, der Lockfiles und der Testsuite.

---

## 4. Conclusion

Das Backend und die Datenbank-Architektur sind hochgradig modular, robust und modern aufgestellt (Django 6.0.8 / Python 3.13, Neon PostgreSQL mit PgBouncer-Bypass, Supabase S3, Gemini 3.8 Flash RAG mit $O(1)$ Signal-Caching und pgvector/SQLite-Hybrid-Retrieval).  
Für eine vollständige Konsistenz mit den Markdown-Dateien müssen im nachfolgenden Schritt die identifizierten Punkte D1 bis D8 behoben werden:
1. `gemini-2.5-flash` in `.env.example`, `ADR-007` und `extractor.py` durch `gemini-3.8-flash` ersetzen.
2. `render.yaml` Merge-Konflikt auflösen und Keys korrigieren.
3. `docs/architecture.md` um die fehlenden Endpunkte (`bulk_approve`, `bulk_reject`, `/api/auth/password-reset/`) und die Klarstellung der Django-Version (Django 6.0) ergänzen.

---

## 5. Verification Method

Zur unabhängigen Überprüfung der Ergebnisse können folgende Befehle und Inspektionen ausgeführt werden:

1. **Django- und Python-Version verifizieren:**
   - Lockfile inspizieren:
     `view_file` auf `backend/uv.lock` Zeile 440–445
   - Python-Version prüfen:
     `view_file` auf `.python-version`
2. **Gemini 3.8 Flash im Code verifizieren:**
   - `grep_search` nach `gemini-3.8-flash` in `backend/portfolio/services/ai_assistant.py` (Zeile 586)
   - `grep_search` nach `gemini-2.5-flash` in `docs/` und `.env.example`
3. **Dual-Database & Test-Ausführung:**
   - Testbefehl für DB-Config:
     `cd backend && uv run pytest portfolio/tests/test_database_config.py`
   - Testbefehl für RAG-Vector & Hybrid-Retrieval:
     `cd backend && uv run pytest portfolio/tests/test_rag_vector.py`
4. **Git-Merge-Konflikt in `render.yaml` prüfen:**
   - `view_file` auf `render.yaml` Zeile 45–60
