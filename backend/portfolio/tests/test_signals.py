from unittest.mock import patch

import pytest
from django.core.cache import cache

from portfolio.models import (
    Certificate,
    Project,
    Provider,
    Skill,
    SkillCategory,
    TimelineEntry,
    TimelineType,
)
from portfolio.services.ai_assistant import (
    GROUNDING_CACHE_KEY,
    RAG_VERSION_KEY,
)
from portfolio.signals import invalidate_portfolio_cache


@pytest.fixture(autouse=True)
def clean_cache_environment():
    """Bereinigt den Cache vor und nach jedem Test."""
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestPortfolioCacheInvalidation:
    """Tests für die atomare Invalidierung und Versionierung des RAG-Caches."""

    def test_invalidate_cache_initializes_version_when_empty(self):
        cache.set(GROUNDING_CACHE_KEY, "Dummy Context")
        assert cache.get(RAG_VERSION_KEY) is None

        invalidate_portfolio_cache()

        assert cache.get(GROUNDING_CACHE_KEY) is None
        version = cache.get(RAG_VERSION_KEY)
        assert version is not None
        assert isinstance(version, int)
        assert version > 0

    def test_invalidate_cache_increments_existing_version(self):
        initial_version = 42
        cache.set(RAG_VERSION_KEY, initial_version)
        cache.set(GROUNDING_CACHE_KEY, "Dummy Context")

        invalidate_portfolio_cache()

        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == initial_version + 1

    def test_invalidate_cache_handles_incr_failure_gracefully(self):
        cache.set(RAG_VERSION_KEY, 100)
        with patch.object(cache, "incr", side_effect=ValueError("Key error")):
            invalidate_portfolio_cache()
            new_version = cache.get(RAG_VERSION_KEY)
            assert isinstance(new_version, int)


@pytest.mark.django_db
class TestModelSignalsTriggerCacheInvalidation:
    """Verifiziert, dass Änderungen an den Modellen Project, Skill, Certificate und TimelineEntry

    über Signals den Cache invalidieren und die RAG-Version inkrementieren.
    """

    def test_project_lifecycle_triggers_invalidation(self):
        cache.set(RAG_VERSION_KEY, 10)
        cache.set(GROUNDING_CACHE_KEY, "Grounding")

        # 1. Create
        proj = Project.objects.create(
            title="Signal Test Project",
            description="Testing signals",
            is_published=True,
        )
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 11

        # 2. Update
        cache.set(GROUNDING_CACHE_KEY, "Grounding Refreshed")
        proj.title = "Updated Signal Test Project"
        proj.save()
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 12

        # 3. Delete
        cache.set(GROUNDING_CACHE_KEY, "Grounding Refreshed")
        proj.delete()
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 13

    def test_skill_lifecycle_triggers_invalidation(self):
        cache.set(RAG_VERSION_KEY, 20)
        cache.set(GROUNDING_CACHE_KEY, "Grounding")

        # 1. Create
        skill = Skill.objects.create(
            name="Rust",
            category=SkillCategory.BACKEND,
            proficiency=85,
        )
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 21

        # 2. Update
        cache.set(GROUNDING_CACHE_KEY, "Grounding Refreshed")
        skill.proficiency = 90
        skill.save()
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 22

        # 3. Delete
        cache.set(GROUNDING_CACHE_KEY, "Grounding Refreshed")
        skill.delete()
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 23

    def test_certificate_lifecycle_triggers_invalidation(self):
        provider = Provider.objects.create(provider="Coursera")
        cache.set(RAG_VERSION_KEY, 30)

        # 1. Create
        cert = Certificate.objects.create(
            title="Cloud Architect Professional",
            provider=provider,
            sha256_hash="dummycertsignalhash",
            is_published=True,
        )
        assert cache.get(RAG_VERSION_KEY) == 31

        # 2. Update
        cache.set(GROUNDING_CACHE_KEY, "Grounding Refreshed")
        cert.title = "Cloud Architect Professional (Renewed)"
        cert.save()
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 32

        # 3. Delete
        cache.set(GROUNDING_CACHE_KEY, "Grounding Refreshed")
        cert.delete()
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 33

    def test_timeline_entry_lifecycle_triggers_invalidation(self):
        cache.set(RAG_VERSION_KEY, 40)

        # 1. Create
        entry = TimelineEntry.objects.create(
            entry_type=TimelineType.EXPERIENCE,
            title="Lead Architect",
            organization="Enterprise AG",
            location="Frankfurt",
            start_date="2024-01-01",
            is_current=True,
            description="Cloud Migration",
        )
        assert cache.get(RAG_VERSION_KEY) == 41

        # 2. Update
        cache.set(GROUNDING_CACHE_KEY, "Grounding Refreshed")
        entry.description = "Updated Cloud Migration & MLOps"
        entry.save()
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 42

        # 3. Delete
        cache.set(GROUNDING_CACHE_KEY, "Grounding Refreshed")
        entry.delete()
        assert cache.get(GROUNDING_CACHE_KEY) is None
        assert cache.get(RAG_VERSION_KEY) == 43
