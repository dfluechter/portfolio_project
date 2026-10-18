from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.utils import timezone

from portfolio.models import (
    Certificate,
    KnowledgeChunk,
    PendingCertificate,
    Project,
    Provider,
    Skill,
    SkillCategory,
    TimelineEntry,
    TimelineType,
    Track,
)
from portfolio.services.ai_assistant import answer_portfolio_query
from portfolio.services.chunking import (
    _format_date,
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

    def test_format_date_variants(self):
        assert _format_date(None, "%d.%m.%Y") == ""
        assert _format_date("2025-05-20", "%d.%m.%Y") == "20.05.2025"
        assert _format_date("invalid-date", "%d.%m.%Y") == "invalid-date"
        assert _format_date(12345, "%d.%m.%Y") == "12345"

    def test_build_chunks_for_project_published(self):
        skill = Skill.objects.create(name="Django", category=SkillCategory.BACKEND)
        project = Project.objects.create(
            title="SaaS Platform",
            description="High scalability API",
            live_url="https://demo.dev",
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
        assert "Live-Demo: https://demo.dev" in c["content"]
        assert c["metadata"]["target_id"] == f"project-{project.id}"

    def test_build_chunks_for_project_unpublished_returns_empty(self):
        project = Project.objects.create(
            title="Secret Project",
            description="Not yet ready",
            is_published=False,
        )
        assert build_chunks_for_project(project) == []

    def test_build_chunks_for_certificate_multi_chunk_ocr(self):
        provider = Provider.objects.create(provider="AWS")
        track = Track.objects.create(
            name="Cloud Architecture", slug="cloud-architecture"
        )
        long_ocr = " ".join(["Exam Topic Architecture and Microservices Security"] * 60)
        cert = Certificate.objects.create(
            title="AWS Certified Solutions Architect",
            provider=provider,
            issued_date=timezone.now().date(),
            credential_id="AWS-12345",
            sha256_hash="awscerthash123456",
            is_published=True,
        )
        cert.tracks.add(track)
        PendingCertificate.objects.create(
            original_file_name="aws.pdf",
            file_path="/tmp/aws.pdf",
            extracted_text=long_ocr,
            sha256_hash="awspendinghash123456",
            certificate=cert,
        )

        chunks = build_chunks_for_certificate(cert)
        # 1 Header-Chunk + mindestens 2 OCR-Chunks
        assert len(chunks) >= 2
        assert chunks[0]["title"] == "AWS Certified Solutions Architect"
        assert "Credential-ID: AWS-12345" in chunks[0]["content"]
        assert chunks[1]["metadata"]["is_ocr_extract"] is True

    def test_build_chunks_for_certificate_unpublished(self):
        provider = Provider.objects.create(provider="DraftProv")
        cert = Certificate.objects.create(
            title="Draft Cert",
            provider=provider,
            sha256_hash="draftcerthash999",
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
            entry_type=TimelineType.EXPERIENCE,
            start_date=timezone.now().date(),
            is_current=True,
            description="Verantwortlich für Cloud Migration und CI/CD.",
        )
        chunks = build_chunks_for_timeline(entry)
        assert len(chunks) == 1
        assert "Lead Platform Architect bei Tech GmbH" in chunks[0]["content"]

    def test_sync_and_delete_chunks_for_instance_and_edge_cases(self):
        # Unsaved / unsupported instance returns 0
        assert sync_chunks_for_instance(object(), generate_embeddings=False) == 0
        assert (
            sync_chunks_for_instance(Skill(name="NoPK"), generate_embeddings=False) == 0
        )

        skill = Skill.objects.create(name="Python", category=SkillCategory.BACKEND)
        with patch(
            "portfolio.services.chunking.generate_embedding",
            return_value=[0.05] * EMBEDDING_DIMENSIONS,
        ):
            count = sync_chunks_for_instance(skill, generate_embeddings=True)
        assert count == 1
        assert KnowledgeChunk.objects.filter(
            source_type="skill", source_id=skill.id
        ).exists()

        deleted = delete_chunks_for_instance("skill", skill.id)
        assert deleted == 1
        assert not KnowledgeChunk.objects.filter(
            source_type="skill", source_id=skill.id
        ).exists()

    def test_reindex_all_portfolio_chunks(self):
        Skill.objects.create(name="TypeScript", category=SkillCategory.FRONTEND)
        Project.objects.create(title="P1", description="D1", is_published=True)
        provider = Provider.objects.create(provider="Google")
        Certificate.objects.create(
            title="GCP Pro",
            provider=provider,
            sha256_hash="gcphash123",
            is_published=True,
        )
        TimelineEntry.objects.create(
            title="Dev",
            organization="Corp",
            location="Remote",
            entry_type=TimelineType.EXPERIENCE,
            start_date="2023-01-01",
            is_current=True,
            description="Coding",
        )
        total = reindex_all_portfolio_chunks(generate_embeddings=False)
        assert total >= 4
        assert KnowledgeChunk.objects.count() >= 4


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

        with patch(
            "portfolio.services.embeddings.get_genai_client",
            return_value=mock_client,
        ):
            vec1 = generate_embedding("Django ORM Best Practices")
            assert vec1 == dummy_vector
            assert mock_client.models.embed_content.call_count == 1

            # Zweiter Aufruf muss aus Cache kommen
            vec2 = generate_embedding("Django ORM Best Practices")
            assert vec2 == dummy_vector
            assert mock_client.models.embed_content.call_count == 1

    def test_generate_embedding_legacy_response_format(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "dummy-key-123")
        dummy_vector = [0.02 * i for i in range(EMBEDDING_DIMENSIONS)]

        mock_resp = MagicMock()
        mock_resp.embeddings = None
        mock_resp.embedding.values = dummy_vector

        mock_client = MagicMock()
        mock_client.models.embed_content.return_value = mock_resp

        with patch(
            "portfolio.services.embeddings.get_genai_client",
            return_value=mock_client,
        ):
            vec = generate_embedding("Legacy SDK attribute")
            assert vec == dummy_vector

    def test_generate_embedding_invalid_dimension_returns_none(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "dummy-key-123")
        mock_resp = MagicMock()
        mock_emb = MagicMock()
        mock_emb.values = [0.1, 0.2]
        mock_resp.embeddings = [mock_emb]

        mock_client = MagicMock()
        mock_client.models.embed_content.return_value = mock_resp

        with patch(
            "portfolio.services.embeddings.get_genai_client",
            return_value=mock_client,
        ):
            assert generate_embedding("Short vector") is None

    def test_generate_embedding_budget_block(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "dummy-key-123")
        with patch(
            "portfolio.services.embeddings.check_and_reserve_ai_budget",
            return_value=(False, "Budget voll"),
        ):
            assert generate_embedding("Some text") is None

    def test_generate_embedding_exception_handled(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "dummy-key-123")
        mock_client = MagicMock()
        mock_client.models.embed_content.side_effect = RuntimeError("API down")
        with patch(
            "portfolio.services.embeddings.get_genai_client",
            return_value=mock_client,
        ):
            assert generate_embedding("Some text") is None


@pytest.mark.django_db
class TestRetrievalService:
    """Tests für das Hybrid- und Keyword-Retrieval."""

    def test_retrieve_relevant_chunks_empty_query_or_db(self):
        assert retrieve_relevant_chunks("") == []
        KnowledgeChunk.objects.all().delete()
        assert retrieve_relevant_chunks("Django") == []

    def test_retrieve_relevant_chunks_keyword_match_and_fallback(self):
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

        # Fallback wenn kein Wort matcht
        fallback = retrieve_relevant_chunks("UnbekannterBegriffXYZ")
        assert len(fallback) == 2

    def test_format_chunks_for_grounding_and_sources(self):
        assert format_chunks_for_grounding([]) == ""

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

    def test_retrieve_relevant_chunks_pgvector_branch_and_fallback(self):
        dummy_vec = [0.01] * EMBEDDING_DIMENSIONS
        chunk = KnowledgeChunk.objects.create(
            source_type=KnowledgeChunk.SOURCE_PROJECT,
            source_id=99,
            chunk_index=0,
            title="Vector Native App",
            content="Semantic vector search test",
            metadata={"target_id": "project-99"},
            embedding=dummy_vec,
        )
        # Simuliere erfolgreichen pgvector-Query-Pfad (mit gemockter Distanz-Annotation)
        from django.db.models import Value

        with (
            patch("portfolio.services.retrieval.is_pgvector_active", return_value=True),
            patch(
                "portfolio.services.retrieval.generate_embedding",
                return_value=dummy_vec,
            ),
            patch(
                "pgvector.django.CosineDistance",
                return_value=Value(0.1),
            ),
        ):
            res_ok = retrieve_relevant_chunks("Vector Native")
            assert len(res_ok) == 1
            assert res_ok[0].id == chunk.id

        # Simuliere Fehler im pgvector-Pfad -> Fallback auf Keyword-Suche
        with (
            patch("portfolio.services.retrieval.is_pgvector_active", return_value=True),
            patch(
                "portfolio.services.retrieval.generate_embedding",
                side_effect=RuntimeError("DB vector error"),
            ),
        ):
            res_fb = retrieve_relevant_chunks("Vector Native")
            assert len(res_fb) >= 1
            assert res_fb[0].id == chunk.id

    def test_admin_has_embedding_display(self):
        from django.contrib.admin.sites import AdminSite

        from portfolio.admin import KnowledgeChunkAdmin

        admin_obj = KnowledgeChunkAdmin(KnowledgeChunk, AdminSite())
        c1 = KnowledgeChunk(title="No Vec", embedding=None)
        c2 = KnowledgeChunk(title="With Vec", embedding=[0.1] * EMBEDDING_DIMENSIONS)
        assert admin_obj.has_embedding(c1) is False
        assert admin_obj.has_embedding(c2) is True


@pytest.mark.django_db
class TestSignalAndCommandIntegration:
    """Tests für Chunk-Synchronisation, AI-Chat-Integration und CLI."""

    def test_signals_create_and_delete_chunks_automatically(self):
        proj = Project.objects.create(
            title="Auto Synced Project",
            description="Created via ORM",
            is_published=True,
        )
        assert KnowledgeChunk.objects.filter(
            source_type="project", source_id=proj.id
        ).exists()

        # Signal-Fehlerbehandlung abdecken
        with patch(
            "portfolio.signals.sync_chunks_for_instance",
            side_effect=RuntimeError("Sync fail"),
        ):
            proj.title = "Still Saves Cleanly"
            proj.save()

        proj_id = proj.id
        with patch(
            "portfolio.signals.delete_chunks_for_instance",
            side_effect=RuntimeError("Delete fail"),
        ):
            proj.delete()

        delete_chunks_for_instance("project", proj_id)
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

    @patch.dict("os.environ", {"GEMINI_API_KEY": "dummy_key"})
    @patch("portfolio.services.ai_assistant.genai.Client")
    def test_answer_portfolio_query_uses_retrieved_chunks(self, mock_client_cls):
        Project.objects.create(
            title="Quantum Analytics Engine",
            description="High speed data pipeline",
            is_published=True,
        )
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = "Dominik hat die Quantum Analytics Engine entwickelt."
        mock_resp.usage_metadata.total_token_count = 120
        mock_client.models.generate_content.return_value = mock_resp
        mock_client_cls.return_value = mock_client

        res = answer_portfolio_query(
            "Erzähl mir von Quantum Analytics",
            history=[{"role": "user", "text": "Hallo"}],
        )
        assert "Quantum Analytics Engine" in res["reply"]
        assert any(
            isinstance(s, dict) and s.get("target_id") is not None
            for s in res["sources"]
        )
