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


@receiver([post_save, post_delete], sender=Project)
@receiver([post_save, post_delete], sender=Skill)
@receiver([post_save, post_delete], sender=Certificate)
@receiver([post_save, post_delete], sender=TimelineEntry)
def handle_portfolio_change(sender, instance, **kwargs) -> None:
    """Signal-Handler, der bei Änderungen an Kern-Entitäten den Cache invalidiert."""
    logger.info(
        "Portfolio-Daten geändert (Sender: %s, ID: %s). Invalidiere Cache.",
        sender.__name__,
        getattr(instance, "id", None),
    )
    invalidate_portfolio_cache()
