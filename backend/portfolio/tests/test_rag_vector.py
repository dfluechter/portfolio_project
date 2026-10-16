from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.utils import timezone

from portfolio.models import (
    Certificate,
    KnowledgeChunk,
    Project,
    Provider,
    Skill,
    SkillCategory,
    TimelineEntry,
    TimelineType,
    Track,
)
from portfolio.services.chunking import (
    build_chunks_for_certificate,
    build_chunks_for_project,
    build_chunks_for_skill,
    build_chunks_for_timeline,
    delete_chunks_for_instance,
    reindex_all_portfolio_chunks,
    sync_chunks_for_instance,
)
from portfolio.services.embeddings import (
    EMBEDDING_DIMENSIONS,
    generate_embedding,
)
from portfolio.services.retrieval import (
    extract_chunk_sources,
    format_chunks_for_grounding,
    is_pgvector_active,
    retrieve_relevant_chunks,
)


@pytest.fixture(autouse=True)
def clean_cache_and_chunks():
    """Bereinigt Cache und KnowledgeChunks vor/nach jedem Test."""
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestKnowledgeChunkModel:
    """Tests für das KnowledgeChunk-Modell."""

    def test_create_chunk_and_str(self):
        chunk = KnowledgeChunk.objects.create(
            source_type=KnowledgeChunk.SOURCE_PROJECT,
            source_id=1,
            chunk_index=0,
            title="Portfolio Cloud Backend",
            content="Django 5.2 API mit pgvector und Neon Postgres.",
            metadata={"target_id": "project-1"},
        )
        assert chunk.id is not None
        assert "[Projekt] Portfolio Cloud Backend (Chunk 0)" in str(chunk)
        assert chunk.embedding is None


@pytest.mark.django_db
class TestChunkingService:
    """Tests für die Chunk-Erstellung aus Portfolio-Modellen."""

    def test_build_chunks_for_project_published(self):
        skill = Skill.objects.create(name="Django", category=SkillCategory.BACKEND)
        project = Project.objects.create(
            title="SaaS Platform",
            description="High scalability API",
            short_description="Scalable API",
            demo_url="https://demo.dev",
            github_url="https://github.com/test",
            is_published=True,
            is_featured=True,
        )
        project.skills.add(skill)

        chunks = build_chunks_for_project(project)
        assert len(chunks) == 1
        c = chunks[0]
        assert c["source_type"] == "project"
        assert c["source_id"] == project.id
        assert "Django" in c["content"]
        assert c["metadata"]["target_id"] == f"project-{project.id}"

    def test_build_chunks_for_project_unpublished_returns_empty(self):
        project = Project.objects.create(
            title="Secret Project",
            description="Not yet ready",
            is_published=False,
        )
        assert build_chunks_for_project(project) == []

    def test_build_chunks_for_certificate_multi_chunk_ocr(self):
        provider = Provider.objects.create(provider="AWS", issuer="Amazon Web Services")
        track = Track.objects.create(name="Cloud Architecture")
        long_ocr = " ".join(["Exam Topic Architecture and Microservices Security"] * 60)
        cert = Certificate.objects.create(
            title="AWS Certified Solutions Architect",
            provider=provider,
            issued_date=timezone.now().date(),
            credential_id="AWS-12345",
            extracted_text=long_ocr,
            is_published=True,
        )
        cert.tracks.add(track)

        chunks = build_chunks_for_certificate(cert)
        # 1 Header-Chunk + mindestens 1 OCR-Chunk
        assert len(chunks) >= 2
        assert chunks[0]["title"] == "AWS Certified Solutions Architect"
        assert "Credential-ID: AWS-12345" in chunks[0]["content"]
        assert chunks[1]["metadata"]["is_ocr_extract"] is True

    def test_build_chunks_for_certificate_unpublished(self):
        cert = Certificate.objects.create(
            title="Draft Cert",
            is_published=False,
        )
        assert build_chunks_for_certificate(cert) == []

    def test_build_chunks_for_skill(self):
        skill = Skill.objects.create(
            name="PostgreSQL",
            category=SkillCategory.DATABASE,
            proficiency=90,
            is_featured=True,
        )
        chunks = build_chunks_for_skill(skill)
        assert len(chunks) == 1
        assert "90%" in chunks[0]["content"]
        assert "(Hervorgehobener Kern-Skill)" in chunks[0]["content"]

    def test_build_chunks_for_timeline(self):
        entry = TimelineEntry.objects.create(
            title="Lead Platform Architect",
            organization="Tech GmbH",
            location="Frankfurt / Remote",
            entry_type=TimelineType.CAREER,
            start_date=timezone.now().date(),
            is_current=True,
            description="Verantwortlich für Cloud Migration und CI/CD.",
        )
        chunks = build_chunks_for_timeline(entry)
        assert len(chunks) == 1
        assert "Lead Platform Architect bei Tech GmbH" in chunks[0]["content"]

    def test_sync_and_delete_chunks_for_instance(self):
        skill = Skill.objects.create(name="Python", category=SkillCategory.BACKEND)
        count = sync_chunks_for_instance(skill, generate_embeddings=False)
        assert count == 1
        assert KnowledgeChunk.objects.filter(source_type="skill", source_id=skill.id).exists()

        deleted = delete_chunks_for_instance("skill", skill.id)
        assert deleted == 1
        assert not KnowledgeChunk.objects.filter(source_type="skill", source_id=skill.id).exists()

    def test_reindex_all_portfolio_chunks(self):
        Skill.objects.create(name="TypeScript", category=SkillCategory.FRONTEND)
        Project.objects.create(title="P1", description="D1", is_published=True)
        total = reindex_all_portfolio_chunks(generate_embeddings=False)
        assert total >= 2
        assert KnowledgeChunk.objects.count() >= 2


@pytest.mark.django_db
class TestEmbeddingsService:
    """Tests für die Vektoreinbettungs-Generierung mit Gemini."""

    def test_generate_embedding_empty_text_returns_none(self):
        assert generate_embedding("") is None
        assert generate_embedding("   ") is None

    def test_generate_embedding_ai_disabled_returns_none(self, monkeypatch):
        monkeypatch.setenv("GEMINI_AI_ENABLED", "false")
        assert generate_embedding("Test text") is None

    def test_generate_embedding_no_api_key_returns_none(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        assert generate_embedding("Test text") is None

    def test_generate_embedding_success_and_cache(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "dummy-key-123")
        dummy_vector = [0.01 * i for i in range(EMBEDDING_DIMENSIONS)]

        mock_resp = MagicMock()
        mock_embedding = MagicMock()
        mock_embedding.values = dummy_vector
        mock_resp.embeddings = [mock_embedding]

        mock_client = MagicMock()
        mock_client.models.embed_content.return_value = mock_resp

        with patch("portfolio.services.embeddings.get_genai_client", return_value=mock_client):
            vec1 = generate_embedding("Django ORM Best Practices")
            assert vec1 == dummy_vector
            assert mock_client.models.embed_content.call_count == 1

            # Zweiter Aufruf muss aus Cache kommen
            vec2 = generate_embedding("Django ORM Best Practices")
            assert vec2 == dummy_vector
            assert mock_client.models.embed_content.call_count == 1  # Keine erneute API-Abfrage!

    def test_generate_embedding_budget_block(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "dummy-key-123")
        with patch("portfolio.services.embeddings.check_and_reserve_ai_budget", return_value=(False, "Budget voll")):
            assert generate_embedding("Some text") is None

    def test_generate_embedding_exception_handled(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "dummy-key-123")
        mock_client = MagicMock()
        mock_client.models.embed_content.side_effect = RuntimeError("API down")
        with patch("portfolio.services.embeddings.get_genai_client", return_value=mock_client):
            assert generate_embedding("Some text") is None


@pytest.mark.django_db
class TestRetrievalService:
    """Tests für das Hybrid- und Keyword-Retrieval."""

    def test_retrieve_relevant_chunks_empty_query(self):
        assert retrieve_relevant_chunks("") == []

    def test_retrieve_relevant_chunks_keyword_match(self):
        KnowledgeChunk.objects.create(
            source_type=KnowledgeChunk.SOURCE_PROJECT,
            source_id=1,
            chunk_index=0,
            title="Kubernetes Cluster",
            content="Bereitstellung und Betrieb von K8s Clustern.",
            metadata={"target_id": "project-1"},
        )
        KnowledgeChunk.objects.create(
            source_type=KnowledgeChunk.SOURCE_PROJECT,
            source_id=2,
            chunk_index=0,
            title="React Frontend",
            content="Vite und Tailwind Dashboard.",
            metadata={"target_id": "project-2"},
        )

        results = retrieve_relevant_chunks("Kubernetes Cluster Deploy")
        assert len(results) >= 1
        assert results[0].title == "Kubernetes Cluster"

    def test_format_chunks_for_grounding_and_sources(self):
        chunk = KnowledgeChunk.objects.create(
            source_type=KnowledgeChunk.SOURCE_CERTIFICATE,
            source_id=42,
            chunk_index=0,
            title="Docker Pro",
            content="Container Expert",
            metadata={"target_id": "cert-42"},
        )
        formatted = format_chunks_for_grounding([chunk])
        assert "Docker Pro" in formatted
        assert "[Referenz: #cert-42]" in formatted

        sources = extract_chunk_sources([chunk])
        assert len(sources) == 1
        assert sources[0]["target_id"] == "cert-42"
        assert sources[0]["type"] == "certificate"

    def test_is_pgvector_active_returns_bool(self):
        assert isinstance(is_pgvector_active(), bool)


@pytest.mark.django_db
class TestSignalAndCommandIntegration:
    """Tests für automatische Chunk-Synchronisation bei Model-Änderungen und Management Command."""

    def test_signals_create_and_delete_chunks_automatically(self):
        # Erstellen
        proj = Project.objects.create(
            title="Auto Synced Project",
            description="Created via ORM",
            is_published=True,
        )
        assert KnowledgeChunk.objects.filter(
            source_type="project", source_id=proj.id
        ).exists()

        # Löschen
        proj_id = proj.id
        proj.delete()
        assert not KnowledgeChunk.objects.filter(
            source_type="project", source_id=proj_id
        ).exists()

    def test_index_rag_chunks_management_command(self):
        Project.objects.create(
            title="Cmd Test Project",
            description="Testing command",
            is_published=True,
        )
        call_command("index_rag_chunks")
        assert KnowledgeChunk.objects.filter(title="Cmd Test Project").exists()
