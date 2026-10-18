import hashlib
import logging
import os

from django.core.cache import cache

from .ai_assistant import (
    check_and_reserve_ai_budget,
    estimate_tokens,
    get_genai_client,
    is_ai_enabled,
    record_actual_ai_tokens,
)

logger = logging.getLogger(__name__)

DEFAULT_EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIMENSIONS = 768


def generate_embedding(text: str, model_name: str | None = None) -> list[float] | None:
    """Erzeugt eine 768-dimensionale Vektoreinbettung für den übergebenen Text.

    Nutzt das Google GenAI SDK (text-embedding-004) unter Einhaltung des
    Zero-Cost-Circuit-Breakers und des Token-Budgets.
    """
    clean_text = (text or "").strip()
    if not clean_text:
        return None

    if not is_ai_enabled():
        logger.debug("Embedding übersprungen: KI-Komponenten sind deaktiviert.")
        return None

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        logger.debug("Embedding übersprungen: Kein GEMINI_API_KEY hinterlegt.")
        return None

    # Cache-Lookup für identischen Text (spart API-Calls)
    text_hash = hashlib.sha256(clean_text.encode("utf-8")).hexdigest()
    cache_key = f"portfolio_emb_v1_{text_hash}"
    cached_vec = cache.get(cache_key)
    if (
        cached_vec
        and isinstance(cached_vec, list)
        and len(cached_vec) == EMBEDDING_DIMENSIONS
    ):
        return cached_vec

    # Budgetierung prüfen
    est_tokens = estimate_tokens(clean_text)
    allowed, reason = check_and_reserve_ai_budget(est_tokens)
    if not allowed:
        logger.warning("Embedding-Budgetprüfung fehlgeschlagen: %s", reason)
        return None

    active_model: str = (
        model_name or os.getenv("GEMINI_EMBEDDING_MODEL") or DEFAULT_EMBEDDING_MODEL
    )

    try:
        client = get_genai_client(api_key)
        response = client.models.embed_content(
            model=active_model,
            contents=clean_text,
        )

        vector: list[float] | None = None
        if hasattr(response, "embeddings") and response.embeddings:
            first_emb = response.embeddings[0]
            if hasattr(first_emb, "values") and first_emb.values:
                vector = [float(v) for v in first_emb.values]
        elif hasattr(response, "embedding") and hasattr(response.embedding, "values"):
            vector = [float(v) for v in response.embedding.values]

        if vector and len(vector) == EMBEDDING_DIMENSIONS:
            cache.set(cache_key, vector, timeout=86400 * 7)
            record_actual_ai_tokens(est_tokens, est_tokens)
            return vector

        logger.warning(
            "Unerwartetes Embedding-Format von Gemini API (Länge: %s)",
            len(vector) if vector else 0,
        )
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fehler bei Gemini Embedding-Generierung: %s", exc)
        return None
