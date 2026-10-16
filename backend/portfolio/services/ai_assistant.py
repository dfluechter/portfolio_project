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
        }

    # 2. Gecachter Wissenskontext & Token-Kompression
    full_context = get_cached_grounding_context()
    grounding_data = prune_context_by_query(cleaned_query, full_context)

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

    try:
        client = get_genai_client(api_key=api_key)

        # Chat-Historie aufbauen
        contents: list[types.Content] = []
        if history:
            for item in history[-6:]:  # Maximal letzte 6 Nachrichten für Kontext
                role = "user" if item.get("role") == "user" else "model"
                text = item.get("text", "").strip()
                if text:
                    contents.append(
                        types.Content(
                            role=role, parts=[types.Part.from_text(text=text)]
                        )
                    )

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
                max_output_tokens=800,
            ),
        )

        reply_text = response.text or "Keine Antwort generiert."
        sources = extract_sources(reply_text)
        result = {
            "reply": reply_text,
            "sources": sources,
        }

        # Antwort cachen
        if is_single_turn:
            cache.set(response_cache_key, result, timeout=RESPONSE_CACHE_TTL)

        return result
    except Exception as exc:  # noqa: BLE001
        logger.error("Fehler beim Aufruf der Gemini API für Portfolio AI Chat: %s", exc)
        return {
            "reply": (
                "Entschuldigung, bei der Bearbeitung deiner Anfrage ist ein temporärer Fehler "
                "aufgetreten. Bitte versuche es in wenigen Momenten erneut oder wirf einen Blick "
                "auf die Projektübersicht."
            ),
            "sources": [],
        }
