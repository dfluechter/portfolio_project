import logging
import time

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from portfolio.models import Certificate, Project, Skill, TimelineEntry
from portfolio.services.ai_assistant import (
    GROUNDING_CACHE_KEY,
    RAG_VERSION_KEY,
)
from portfolio.services.chunking import (
    delete_chunks_for_instance,
    sync_chunks_for_instance,
)

logger = logging.getLogger(__name__)


def invalidate_portfolio_cache() -> None:
    """Invalidiert den Wissenskontext-Cache und inkrementiert atomar die RAG-Cache-Version."""
    cache.delete(GROUNDING_CACHE_KEY)
    if cache.get(RAG_VERSION_KEY) is not None:
        try:
            cache.incr(RAG_VERSION_KEY)
        except ValueError:
            cache.set(RAG_VERSION_KEY, int(time.time()), timeout=None)
    else:
        cache.set(RAG_VERSION_KEY, int(time.time()), timeout=None)


@receiver(post_save, sender=Project)
@receiver(post_save, sender=Skill)
@receiver(post_save, sender=Certificate)
@receiver(post_save, sender=TimelineEntry)
def handle_portfolio_save(sender, instance, **kwargs) -> None:
    """Signal-Handler, der bei Erstellung/Änderung Chunks aktualisiert und Cache invalidiert."""
    logger.info(
        "Portfolio-Daten gespeichert (Sender: %s, ID: %s). Aktualisiere Chunks & invalidiere Cache.",
        sender.__name__,
        getattr(instance, "id", None),
    )
    invalidate_portfolio_cache()
    try:
        sync_chunks_for_instance(instance, generate_embeddings=False)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fehler beim Synchronisieren von Chunks für %s: %s", sender.__name__, exc)


@receiver(post_delete, sender=Project)
@receiver(post_delete, sender=Skill)
@receiver(post_delete, sender=Certificate)
@receiver(post_delete, sender=TimelineEntry)
def handle_portfolio_delete(sender, instance, **kwargs) -> None:
    """Signal-Handler, der bei Löschung Chunks entfernt und Cache invalidiert."""
    logger.info(
        "Portfolio-Daten gelöscht (Sender: %s, ID: %s). Entferne Chunks & invalidiere Cache.",
        sender.__name__,
        getattr(instance, "id", None),
    )
    invalidate_portfolio_cache()
    type_map = {
        "Project": "project",
        "Certificate": "certificate",
        "Skill": "skill",
        "TimelineEntry": "timeline",
    }
    src_type = type_map.get(sender.__name__, sender.__name__.lower())
    try:
        delete_chunks_for_instance(src_type, instance.id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fehler beim Löschen von Chunks für %s: %s", sender.__name__, exc)

