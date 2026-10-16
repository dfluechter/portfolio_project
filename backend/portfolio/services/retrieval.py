import logging
from typing import Any

from django.db import connection
from django.db.models import Q

from portfolio.models import KnowledgeChunk
from .embeddings import generate_embedding

logger = logging.getLogger(__name__)

DEFAULT_RETRIEVAL_LIMIT = 5


def is_pgvector_active() -> bool:
    """Prüft, ob die aktuelle Datenbankverbindung PostgreSQL nutzt."""
    return connection.vendor == "postgresql"


def retrieve_relevant_chunks(
    query: str,
    limit: int = DEFAULT_RETRIEVAL_LIMIT,
) -> list[KnowledgeChunk]:
    """Führt ein Hybrid-Retrieval aus:

    1. Semantische Suche via pgvector CosineDistance (auf PostgreSQL/Neon)
    2. Heuristisches Keyword-Retrieval als Fallback/Ergänzung (auf SQLite oder ohne Embeddings).
    """
    clean_query = (query or "").strip()
    if not clean_query:
        return []

    # 1. Prüfen, ob Chunks existieren
    if not KnowledgeChunk.objects.exists():
        return []

    results: list[KnowledgeChunk] = []

    # 2. Vektorsuche auf PostgreSQL
    if is_pgvector_active():
        try:
            from pgvector.django import CosineDistance

            query_vec = generate_embedding(clean_query)
            if query_vec:
                vector_chunks = list(
                    KnowledgeChunk.objects.filter(embedding__isnull=False)
                    .annotate(distance=CosineDistance("embedding", query_vec))
                    .order_by("distance")[:limit]
                )
                if vector_chunks:
                    return vector_chunks
        except Exception as exc:  # noqa: BLE001
            logger.warning("Vektorsuche fehlgeschlagen, nutze Keyword-Fallback: %s", exc)

    # 3. Keyword-Fallback (z. B. auf SQLite oder bei API-Budget-Überschreitung)
    words = [w.lower() for w in clean_query.split() if len(w) > 2]
    if words:
        q_filter = Q()
        for word in words:
            q_filter |= Q(title__icontains=word) | Q(content__icontains=word)

        results = list(KnowledgeChunk.objects.filter(q_filter)[:limit])

    # 4. Falls keine spezifischen Treffer, die neuesten Chunks als Basis
    if not results:
        results = list(KnowledgeChunk.objects.all().order_by("-updated_at")[:limit])

    return results


def format_chunks_for_grounding(chunks: list[KnowledgeChunk]) -> str:
    """Formatiert die abgerufenen Chunks in einen strukturierten Wissenskontext für Gemini."""
    if not chunks:
        return ""

    parts = ["--- RELEVANTE AUSZÜGE AUS DEM PORTFOLIO (HYBRID RETRIEVAL) ---"]
    for i, c in enumerate(chunks, 1):
        target = c.metadata.get("target_id", "")
        target_info = f" [Referenz: #{target}]" if target else ""
        parts.append(f"[{i}] {c.title}{target_info}\n{c.content}\n")

    return "\n".join(parts)


def extract_chunk_sources(chunks: list[KnowledgeChunk]) -> list[dict[str, Any]]:
    """Extrahiert strukturierte Zitate aus den abgerufenen Chunks für das Frontend."""
    sources: list[dict[str, Any]] = []
    seen: set[str] = set()

    for c in chunks:
        target_id = c.metadata.get("target_id")
        if target_id and target_id not in seen:
            seen.add(target_id)
            sources.append(
                {
                    "type": c.source_type,
                    "id": c.source_id,
                    "title": c.title,
                    "target_id": target_id,
                }
            )

    return sources
