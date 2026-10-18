import hashlib
import logging
import os
import re
import time
from typing import Any

from django.core.cache import cache
from google import genai
from google.genai import types

from portfolio.models import Certificate, Project, Skill, TimelineEntry

logger = logging.getLogger(__name__)

# Cache-Keys & TTL
GROUNDING_CACHE_KEY = "portfolio_rag_grounding_context_v1"
RAG_VERSION_KEY = "portfolio_rag_context_version_v1"
GROUNDING_CACHE_TTL = 900  # 15 Minuten
RESPONSE_CACHE_TTL = 3600  # 1 Stunde für identische Einzelanfragen

# Zero-Cost & Token-Limit Schutz (Circuit-Breaker)
AI_CIRCUIT_BREAKER_KEY = "portfolio_gemini_circuit_breaker_tripped_v1"
AI_DAILY_TOKENS_KEY = "portfolio_gemini_daily_tokens_v1"
AI_DAILY_REQUESTS_KEY = "portfolio_gemini_daily_requests_v1"
AI_BUDGET_TTL = 86400  # 24 Stunden Fenster

DEFAULT_DAILY_TOKEN_LIMIT = 50000  # Strikt im kostenlosen Kontingent (0 Kosten)
DEFAULT_DAILY_REQUEST_LIMIT = 100  # Max. Anfragen pro 24h
DEFAULT_MAX_INPUT_TOKENS = 4000  # Max. Input-Tokens pro Einzelanfrage
MAX_GROUNDING_CHARS = 12000  # Harte Obergrenze für RAG-Wissenskontext
MAX_HISTORY_ITEM_CHARS = 500  # Harte Obergrenze pro Nachricht in der Chat-Historie

# Pre-Flight Injection-Filter Patterns
INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?previous",
    r"ignore\s+(?:all\s+)?above",
    r"system\s*prompt",
    r"dan\s+mode",
    r"jailbreak",
    r"reveal\s+(?:all\s+|your\s+|the\s+)?(?:system\s+)?instructions?",
    r"show\s+(?:all\s+|your\s+|the\s+)?(?:system\s+)?instructions?",
    r"print\s+(?:all\s+|your\s+|the\s+)?(?:system\s+)?instructions?",
    r"disregard\s+(?:all\s+)?instructions?",
    r"override\s+(?:all\s+|your\s+|the\s+)?instructions?",
]
INJECTION_REGEX = re.compile("|".join(INJECTION_PATTERNS), re.IGNORECASE)

# Modul-weiter Client-Singleton
_GENAI_CLIENT: genai.Client | None = None
_CACHED_API_KEY: str | None = None


def is_ai_enabled() -> bool:
    """Prüft, ob die KI-Komponenten aktiv sind und das Token-Budget nicht überschritten wurde."""
    env_flag = os.getenv("GEMINI_AI_ENABLED", "true").strip().lower()
    if env_flag in ("false", "0", "no", "off"):
        return False
    return not bool(cache.get(AI_CIRCUIT_BREAKER_KEY))


def trip_ai_circuit_breaker(reason: str) -> None:
    """Deaktiviert alle Gemini-KI-Komponenten für 24h, sobald Token-Grenzen erreicht werden."""
    cache.set(AI_CIRCUIT_BREAKER_KEY, reason, timeout=AI_BUDGET_TTL)
    logger.warning(
        "Zero-Cost-Schutz: KI-Komponenten wurden deaktiviert (Grund: %s)", reason
    )


def estimate_tokens(text: str, extra_bytes: int = 0) -> int:
    """Konservative Schätzung der Token-Anzahl (ca. 4 Zeichen pro Token + Binärdaten-Aufschlag)."""
    text_tokens = max(1, len(text or "") // 4 + 1)
    # Für Bilder/PDFs in Gemini Vision: ca. 258 Tokens pro angefangene 100 KB konservativ ansetzen
    binary_tokens = (
        max(0, extra_bytes) // (100 * 1024) + (1 if extra_bytes > 0 else 0)
    ) * 258
    return text_tokens + binary_tokens


def check_and_reserve_ai_budget(estimated_tokens: int) -> tuple[bool, str]:
    """Prüft Token- und Request-Grenzen vor jedem API-Call.

    Wenn eine Grenze überschritten wird, wird die Komponente via Circuit-Breaker deaktiviert,
    damit garantiert keine Kosten entstehen.
    """
    env_flag = os.getenv("GEMINI_AI_ENABLED", "true").strip().lower()
    if env_flag in ("false", "0", "no", "off"):
        return False, "KI-Komponenten sind administrativ deaktiviert."

    tripped_reason = cache.get(AI_CIRCUIT_BREAKER_KEY)
    if tripped_reason:
        return False, str(tripped_reason)

    try:
        daily_token_limit = int(
            os.getenv("GEMINI_DAILY_TOKEN_LIMIT", str(DEFAULT_DAILY_TOKEN_LIMIT))
        )
    except ValueError:
        daily_token_limit = DEFAULT_DAILY_TOKEN_LIMIT

    try:
        daily_req_limit = int(
            os.getenv("GEMINI_DAILY_REQUEST_LIMIT", str(DEFAULT_DAILY_REQUEST_LIMIT))
        )
    except ValueError:
        daily_req_limit = DEFAULT_DAILY_REQUEST_LIMIT

    try:
        max_input_tokens = int(
            os.getenv("GEMINI_MAX_INPUT_TOKENS", str(DEFAULT_MAX_INPUT_TOKENS))
        )
    except ValueError:
        max_input_tokens = DEFAULT_MAX_INPUT_TOKENS

    if estimated_tokens > max_input_tokens:
        return (
            False,
            f"Anfrage überschreitet das Token-Limit pro Aufruf ({estimated_tokens} > {max_input_tokens}).",
        )

    current_tokens = int(cache.get(AI_DAILY_TOKENS_KEY) or 0)
    current_reqs = int(cache.get(AI_DAILY_REQUESTS_KEY) or 0)

    if (
        current_tokens + estimated_tokens > daily_token_limit
        or current_reqs + 1 > daily_req_limit
    ):
        reason = (
            f"Tägliches kostenfreies Token-/Anfragelimit erreicht "
            f"(Tokens: {current_tokens + estimated_tokens}/{daily_token_limit}, "
            f"Requests: {current_reqs + 1}/{daily_req_limit})."
        )
        trip_ai_circuit_breaker(reason)
        return False, reason

    cache.set(
        AI_DAILY_TOKENS_KEY,
        current_tokens + estimated_tokens,
        timeout=AI_BUDGET_TTL,
    )
    cache.set(
        AI_DAILY_REQUESTS_KEY,
        current_reqs + 1,
        timeout=AI_BUDGET_TTL,
    )
    return True, ""


def record_actual_ai_tokens(
    reserved_tokens: int, actual_total_tokens: int | None
) -> None:
    """Aktualisiert den täglichen Token-Zähler mit den real verbrauchten Tokens der API-Antwort."""
    if actual_total_tokens is None or actual_total_tokens <= 0:
        return
    try:
        daily_token_limit = int(
            os.getenv("GEMINI_DAILY_TOKEN_LIMIT", str(DEFAULT_DAILY_TOKEN_LIMIT))
        )
    except ValueError:
        daily_token_limit = DEFAULT_DAILY_TOKEN_LIMIT

    current_tokens = int(cache.get(AI_DAILY_TOKENS_KEY) or 0)
    diff = max(0, int(actual_total_tokens) - int(reserved_tokens))
    updated_tokens = current_tokens + diff
    if diff > 0:
        cache.set(AI_DAILY_TOKENS_KEY, updated_tokens, timeout=AI_BUDGET_TTL)

    if updated_tokens >= daily_token_limit:
        trip_ai_circuit_breaker(
            f"Tägliches Token-Limit nach Antwort erreicht ({updated_tokens}/{daily_token_limit})."
        )


def get_genai_client(api_key: str) -> genai.Client:
    """Wiederverwendbarer Singleton-Client zur Vermeidung von TLS/HTTP2-Handshake-Latenzen."""
    global _GENAI_CLIENT, _CACHED_API_KEY
    if _GENAI_CLIENT is None or _CACHED_API_KEY != api_key:
        _GENAI_CLIENT = genai.Client(api_key=api_key)
        _CACHED_API_KEY = api_key
    return _GENAI_CLIENT


def reset_genai_client() -> None:
    """Setzt den Singleton-Client und den Cache-Schlüssel für Test-Isolation zurück."""
    global _GENAI_CLIENT, _CACHED_API_KEY
    _GENAI_CLIENT = None
    _CACHED_API_KEY = None


def get_rag_context_version() -> int:
    """Liefert die aktuelle RAG-Kontext-Version aus dem Cache oder initialisiert sie."""
    version = cache.get(RAG_VERSION_KEY)
    if version is None:
        version = int(time.time())
        cache.set(RAG_VERSION_KEY, version, timeout=None)
    return int(version)


def extract_sources(reply_text: str) -> list[dict[str, Any] | str]:
    """Extrahiert relevante Quellen (Projekte, Zertifikate) aus dem Antworttext.

    Gibt strukturierte Dictionaries oder einen String-Fallback zurück.
    """
    if not reply_text:
        return ["Dominik's Verified Portfolio Knowledge Base"]

    sources: list[dict[str, Any] | str] = []
    seen: set[str] = set()

    try:
        # 1. Veröffentlichte Projekte scannen
        for project in Project.objects.filter(is_published=True).only("id", "title"):
            if (
                project.title
                and project.title.strip()
                and re.search(
                    re.escape(project.title.strip()), reply_text, re.IGNORECASE
                )
            ):
                key = f"project:{project.id}"
                if key not in seen:
                    seen.add(key)
                    sources.append(
                        {
                            "type": "project",
                            "id": project.id,
                            "title": project.title,
                            "target_id": f"project-{project.id}",
                        }
                    )

        # 2. Verifizierte Zertifikate scannen
        for cert in Certificate.objects.filter(is_published=True).only("id", "title"):
            if (
                cert.title
                and cert.title.strip()
                and re.search(re.escape(cert.title.strip()), reply_text, re.IGNORECASE)
            ):
                key = f"certificate:{cert.id}"
                if key not in seen:
                    seen.add(key)
                    sources.append(
                        {
                            "type": "certificate",
                            "id": cert.id,
                            "title": cert.title,
                            "target_id": f"cert-{cert.id}",
                        }
                    )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fehler beim Extrahieren strukturierter Quellen: %s", exc)

    if not sources:
        return ["Dominik's Verified Portfolio Knowledge Base"]

    return sources


def build_portfolio_grounding_context() -> str:
    """Sammelt alle freigegebenen Portfolio-Daten und baut einen strukturierten

    Wissenskontext für die RAG-Antwortgenerierung.
    """
    context_parts: list[str] = [
        "=== DOMINIK FLÜCHTER - PORTFOLIO WISSENSBASIS ===",
        "Rolle: Senior Full-Stack & Backend Engineer / Cloud Architect",
        "Schwerpunkte: Python, Django 5.x, React 19, TypeScript, PostgreSQL, Cloud-Infrastruktur & MLOps.",
        "",
    ]

    # 1. Skills
    skills = Skill.objects.all().order_by("category", "-proficiency")
    if skills.exists():
        context_parts.append("--- TECHNISCHE SKILLS ---")
        for s in skills:
            featured = " (Top-Skill)" if s.is_featured else ""
            context_parts.append(
                f"- {s.name} ({s.get_category_display()}, {s.proficiency}% Kenntnisstand){featured}"
            )
        context_parts.append("")

    # 2. Projekte
    projects = Project.objects.filter(is_published=True).prefetch_related("skills")
    if projects.exists():
        context_parts.append("--- HIGHLIGHT-PROJEKTE ---")
        for p in projects:
            skill_names = ", ".join(s.name for s in p.skills.all())
            urls = []
            if p.github_url:
                urls.append(f"GitHub: {p.github_url}")
            if p.live_url:
                urls.append(f"Live-Demo: {p.live_url}")
            url_str = f" [{'; '.join(urls)}]" if urls else ""
            context_parts.append(f"Projekt: {p.title}")
            context_parts.append(f"Beschreibung: {p.description}")
            if skill_names:
                context_parts.append(f"Verwendete Technologien: {skill_names}")
            if url_str:
                context_parts.append(f"Links: {url_str}")
            context_parts.append("")

    # 3. Zertifikate
    certificates = (
        Certificate.objects.filter(is_published=True)
        .select_related("provider")
        .prefetch_related("tracks")
    )
    if certificates.exists():
        context_parts.append("--- VERIFIZIERTE QUALIFIKATIONEN & ZERTIFIKATE ---")
        for c in certificates:
            provider_name = c.provider.provider if c.provider else "Unbekannt"
            tracks_str = (
                ", ".join(t.name for t in c.tracks.all()) if c.tracks.exists() else ""
            )
            date_str = (
                c.issued_date.strftime("%d.%m.%Y")
                if c.issued_date
                else c.uploaded_at.strftime("%d.%m.%Y")
            )
            track_info = f" | Track: {tracks_str}" if tracks_str else ""
            cred_info = f" (ID: {c.credential_id})" if c.credential_id else ""
            context_parts.append(
                f"- {c.title} von {provider_name} [{date_str}]{cred_info}{track_info}"
            )
        context_parts.append("")

    # 4. Werdegang / Timeline
    timeline_entries = TimelineEntry.objects.all().order_by("-start_date")
    if timeline_entries.exists():
        context_parts.append("--- BERUFLICHER WERDEGANG & AUSBILDUNG ---")
        for entry in timeline_entries:
            start = entry.start_date.strftime("%m/%Y")
            end = (
                "Aktuell"
                if entry.is_current
                else (entry.end_date.strftime("%m/%Y") if entry.end_date else "")
            )
            period = f"{start} - {end}".strip(" -")
            context_parts.append(
                f"- {entry.title} bei {entry.organization} ({period}, {entry.location}): {entry.description}"
            )
        context_parts.append("")

    return "\n".join(context_parts)


def get_cached_grounding_context() -> str:
    """Liefert den Wissenskontext aus dem Cache oder baut ihn bei Bedarf neu auf."""
    cached = cache.get(GROUNDING_CACHE_KEY)
    if cached and isinstance(cached, str):
        return cached

    fresh_context = build_portfolio_grounding_context()
    cache.set(GROUNDING_CACHE_KEY, fresh_context, timeout=GROUNDING_CACHE_TTL)
    return fresh_context


def prune_context_by_query(user_message: str, full_context: str) -> str:
    """Kompression des Wissenskontextes: Filtert bei spezifischen Anfragen unpassende

    Abschnitte heraus, um Token-Verbrauch und TTFT-Latenz um 40-60% zu senken.
    """
    msg_lower = user_message.lower()
    sections = full_context.split("--- ")

    # Kopfzeile (Profil / Basisdaten) immer beibehalten
    header = sections[0].strip()
    pruned_sections = [header]

    is_skill_query = any(
        k in msg_lower
        for k in ["skill", "technolog", "sprache", "framework", "tool", "stack"]
    )
    is_project_query = any(
        k in msg_lower
        for k in [
            "projekt",
            "app",
            "gebaut",
            "entwickelt",
            "arbeit",
            "code",
            "github",
            "demo",
        ]
    )
    is_cert_query = any(
        k in msg_lower
        for k in [
            "zertifikat",
            "certificate",
            "prüfung",
            "qualifikation",
            "nachweis",
            "kurs",
            "aussteller",
            "cloud",
            "aws",
            "gcp",
        ]
    )
    is_career_query = any(
        k in msg_lower
        for k in [
            "werdegang",
            "lebenslauf",
            "erfahrung",
            "karriere",
            "studium",
            "beruf",
            "cv",
            "station",
        ]
    )

    # Wenn die Frage sehr allgemein ist, den vollen Kontext beibehalten
    if not (is_skill_query or is_project_query or is_cert_query or is_career_query):
        return full_context

    for sec in sections[1:]:
        sec_title = sec.split("\n", 1)[0].upper()
        if (
            ("TECHNISCHE SKILLS" in sec_title and is_skill_query)
            or ("HIGHLIGHT-PROJEKTE" in sec_title and is_project_query)
            or ("VERIFIZIERTE QUALIFIKATIONEN" in sec_title and is_cert_query)
            or ("BERUFLICHER WERDEGANG" in sec_title and is_career_query)
        ):
            pruned_sections.append("--- " + sec.strip())

    # Fallback falls alle Filter leer wären: Gesamtkontext nutzen
    if len(pruned_sections) <= 1:
        return full_context

    return "\n\n".join(pruned_sections)


def answer_portfolio_query(
    user_message: str, history: list[dict[str, str]] | None = None
) -> dict[str, Any]:
    """Beantwortet eine Besucher-Frage über das Portfolio mit RAG via Gemini 3.8 Flash.

    Verwendet Guardrails, In-Memory-Caching, Token-Pruning und versioniertes Response-Caching.
    """
    cleaned_query = (user_message or "").strip()
    if not cleaned_query:
        return {
            "reply": "Bitte stelle eine konkrete Frage zu Dominiks Portfolio oder Werdegang.",
            "sources": [],
        }

    # Guardrail a: Längenprüfung (> 500 Zeichen)
    if len(cleaned_query) > 500:
        return {
            "reply": "Bitte formuliere deine Frage etwas kürzer (maximal 500 Zeichen).",
            "sources": [],
        }

    # Guardrail b: Pre-Flight Injection-Filter (0 Tokens verbraucht!)
    if INJECTION_REGEX.search(cleaned_query):
        logger.warning("Prompt-Injection Versuch abgewehrt: %s", cleaned_query[:80])
        return {
            "reply": (
                "Ich bin Dominiks Portfolio-Assistent und beantworte ausschließlich "
                "Fragen zu seinen Projekten, Skills und Zertifikaten."
            ),
            "sources": [],
        }

    # 1. Versionierter Response-Cache für wiederkehrende Anfragen ohne Historie (< 5ms Antwortzeit)
    is_single_turn = not history or len(history) == 0
    version = get_rag_context_version()
    query_hash = hashlib.sha256(cleaned_query.lower().encode("utf-8")).hexdigest()[:16]
    response_cache_key = f"portfolio_ai_resp_v{version}_{query_hash}"

    if is_single_turn:
        cached_response = cache.get(response_cache_key)
        if cached_response and isinstance(cached_response, dict):
            logger.info(
                "Portfolio AI Response aus Cache ausgeliefert (%s, v%s)",
                query_hash,
                version,
            )
            return cached_response

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY nicht gesetzt. Liefere Fallback-Antwort.")
        return {
            "reply": (
                "Vielen Dank für dein Interesse! Der KI-Assistent ist aktuell im Wartungsmodus, "
                "da kein API-Schlüssel konfiguriert ist. Du kannst alle Projekte, Skills und "
                "Zertifikate direkt auf der Portfolio-Startseite einsehen."
            ),
            "sources": [],
            "disabled": True,
        }

    # 2. Gecachter Wissenskontext & Hybrid Retrieval
    from .retrieval import (
        extract_chunk_sources,
        format_chunks_for_grounding,
        retrieve_relevant_chunks,
    )

    retrieved_chunks = retrieve_relevant_chunks(cleaned_query)
    if retrieved_chunks:
        grounding_data = format_chunks_for_grounding(retrieved_chunks)[
            :MAX_GROUNDING_CHARS
        ]
    else:
        full_context = get_cached_grounding_context()
        grounding_data = prune_context_by_query(cleaned_query, full_context)[
            :MAX_GROUNDING_CHARS
        ]

    system_instruction = (
        "Du bist 'Dominik's Portfolio Copilot', ein freundlicher, hochkompetenter und präziser "
        "KI-Assistent für das persönliche Entwickler-Portfolio von Dominik Flüchter.\n"
        "Deine Aufgaben:\n"
        "1. Beantworte Fragen von Recruitern, Kunden und Entwicklern wahrheitsgemäß auf Basis der "
        "bereitgestellten Wissensbasis.\n"
        "2. Bleibe strikt bei den Fakten: Erfinde keine Projekte, Technologien oder Zertifikate, "
        "die nicht in der Wissensbasis aufgeführt sind.\n"
        "3. Antworte in der Sprache, in der die Frage gestellt wurde (primär Deutsch oder Englisch).\n"
        "4. Hebe relevante Highlights hervor (z. B. Django 5, React 19, Neon PostgreSQL, Render Deployment, "
        "Cloud-Zertifizierungen).\n"
        "5. Formatiere deine Antwort lesbar mit Aufzählungspunkten oder Fettungen in Markdown.\n\n"
        f"Hier ist die offizielle Wissensbasis über Dominik:\n{grounding_data}"
    )

    # Chat-Historie vorbereiten & Längen pro Eintrag strikt begrenzen
    history_texts: list[tuple[str, str]] = []
    if history:
        for item in history[-6:]:  # Maximal letzte 6 Nachrichten für Kontext
            if isinstance(item, dict):
                role = "user" if item.get("role") == "user" else "model"
                text = str(item.get("text") or "").strip()[:MAX_HISTORY_ITEM_CHARS]
                if text:
                    history_texts.append((role, text))

    # 3. Zero-Cost & Token-Limit Guardrail vor dem API-Aufruf
    combined_input_text = (
        system_instruction
        + "\n"
        + "\n".join(t for _, t in history_texts)
        + "\n"
        + cleaned_query
    )
    estimated_tokens = estimate_tokens(combined_input_text)
    allowed, block_reason = check_and_reserve_ai_budget(estimated_tokens)
    if not allowed:
        logger.warning(
            "Portfolio AI Anfrage durch Token-Limit/Circuit-Breaker blockiert: %s",
            block_reason,
        )
        return {
            "reply": (
                "Das kostenfreie Token-Limit für den KI-Assistenten wurde erreicht. "
                "Um Kosten zuverlässig auszuschließen, wurde die KI-Komponente vorübergehend "
                "deaktiviert. Du kannst alle Projekte, Skills und Zertifikate direkt auf der "
                "Portfolio-Seite einsehen."
            ),
            "sources": [],
            "disabled": True,
        }

    try:
        client = get_genai_client(api_key=api_key)

        contents: list[Any] = [
            types.Content(role=role, parts=[types.Part.from_text(text=text)])
            for role, text in history_texts
        ]

        # Aktuelle Benutzerfrage anhängen
        contents.append(
            types.Content(role="user", parts=[types.Part.from_text(text=cleaned_query)])
        )

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
                max_output_tokens=600,
            ),
        )

        # Tatsächlich verbrauchte Tokens aus usage_metadata erfassen (falls vorhanden)
        usage_meta = getattr(response, "usage_metadata", None)
        actual_total = getattr(usage_meta, "total_token_count", None)
        if isinstance(actual_total, int):
            record_actual_ai_tokens(estimated_tokens, actual_total)

        reply_text = response.text or "Keine Antwort generiert."
        extracted_text_sources = extract_sources(reply_text)
        chunk_sources = (
            extract_chunk_sources(retrieved_chunks) if retrieved_chunks else []
        )

        # Zusammenführen und Duplikate anhand target_id eliminieren
        combined_sources: list[dict[str, Any] | str] = []
        seen_targets: set[str] = set()
        dict_sources = [s for s in extracted_text_sources if isinstance(s, dict)]
        for s in chunk_sources + dict_sources:
            target = s.get("target_id")
            if target and target not in seen_targets:
                seen_targets.add(target)
                combined_sources.append(s)

        if not combined_sources:
            combined_sources = extracted_text_sources or [
                "Dominik's Verified Portfolio Knowledge Base"
            ]

        result: dict[str, Any] = {
            "reply": reply_text,
            "sources": combined_sources,
            "disabled": not is_ai_enabled(),
        }

        # Antwort cachen
        if is_single_turn:
            cache.set(response_cache_key, result, timeout=RESPONSE_CACHE_TTL)

        return result
    except Exception as exc:  # noqa: BLE001
        err_msg = str(exc).lower()
        if any(
            k in err_msg
            for k in ("429", "quota", "resource_exhausted", "rate limit", "exceeded")
        ):
            trip_ai_circuit_breaker(f"Gemini API Quota/Rate-Limit erreicht: {exc}")
            return {
                "reply": (
                    "Das kostenfreie Kontingent des KI-Dienstes ist erschöpft. "
                    "Die KI-Komponente wurde zum Schutz vor Kosten automatisch deaktiviert."
                ),
                "sources": [],
                "disabled": True,
            }
        logger.error("Fehler beim Aufruf der Gemini API für Portfolio AI Chat: %s", exc)
        return {
            "reply": (
                "Entschuldigung, bei der Bearbeitung deiner Anfrage ist ein temporärer Fehler "
                "aufgetreten. Bitte versuche es in wenigen Momenten erneut oder wirf einen Blick "
                "auf die Projektübersicht."
            ),
            "sources": [],
        }
