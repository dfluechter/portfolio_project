import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIRequestFactory

from portfolio.models import (
    Certificate,
    Project,
    Provider,
    Skill,
    TimelineEntry,
    Track,
    certificate_upload_path,
    validate_file_extension,
    validate_file_size,
)
from portfolio.serializers import (
    CertificateSerializer,
    ProjectSerializer,
    SkillSerializer,
    TimelineEntrySerializer,
    TrackSerializer,
)


class DummyCertificate:
    """Minimaler Ersatz für eine Certificate-Instanz (ohne DB-Zugriff)."""

    def __init__(self, provider=None, sha256_hash=None):
        self.provider = provider
        self.sha256_hash = sha256_hash


@pytest.mark.django_db
class TestSkillSerializer:
    def test_exposes_display_name_of_category(self):
        skill = Skill.objects.create(name="Django", category="backend")
        assert SkillSerializer(skill).data["category_display"] == "Backend"

    @pytest.mark.parametrize("value", [0, 101])
    def test_rejects_proficiency_outside_1_to_100(self, value):
        serializer = SkillSerializer(data={"name": "X", "proficiency": value})
        assert not serializer.is_valid()
        assert "proficiency" in serializer.errors

    def test_rejects_unknown_category(self):
        serializer = SkillSerializer(data={"name": "X", "category": "nope"})
        assert not serializer.is_valid()
        assert "category" in serializer.errors

    def test_rejects_duplicate_name(self):
        Skill.objects.create(name="Unique")
        serializer = SkillSerializer(data={"name": "Unique"})
        assert not serializer.is_valid()
        assert "name" in serializer.errors


@pytest.mark.django_db
class TestHybridSerializers:
    """Write: Primärschlüssel-IDs, Read: verschachtelte *_details."""

    def test_project_write_ids_read_nested_details(self):
        skill = Skill.objects.create(name="Python")
        serializer = ProjectSerializer(
            data={"title": "P", "description": "D", "skills": [skill.pk]}
        )
        assert serializer.is_valid(), serializer.errors
        project = serializer.save()

        data = ProjectSerializer(project).data
        assert data["skills"] == [skill.pk]
        assert [s["name"] for s in data["skill_details"]] == ["Python"]

    def test_project_rejects_unknown_skill_id(self):
        serializer = ProjectSerializer(
            data={"title": "P", "description": "D", "skills": [9999]}
        )
        assert not serializer.is_valid()
        assert "skills" in serializer.errors

    def test_project_skill_details_is_read_only(self):
        serializer = ProjectSerializer(
            data={
                "title": "P",
                "description": "D",
                "skill_details": [{"name": "Injected"}],
            }
        )
        assert serializer.is_valid(), serializer.errors
        serializer.save()
        assert not Skill.objects.filter(name="Injected").exists()

    def test_timeline_entry_exposes_type_display_and_nested_skills(self):
        skill = Skill.objects.create(name="Go")
        entry = TimelineEntry.objects.create(
            title="Dev",
            organization="ACME",
            start_date="2024-01-01",
            entry_type="education",
        )
        entry.skills.add(skill)

        data = TimelineEntrySerializer(entry).data

        assert data["entry_type_display"] == "Ausbildung & Studium"
        assert data["skill_details"][0]["name"] == "Go"

    def test_timeline_entry_requires_start_date(self):
        serializer = TimelineEntrySerializer(data={"title": "T", "organization": "O"})
        assert not serializer.is_valid()
        assert "start_date" in serializer.errors

    def test_certificate_exposes_provider_details_and_protects_fields(self):
        provider = Provider.objects.create(provider="Udemy")
        cert = Certificate.objects.create(
            title="C",
            provider=provider,
            pdf_file=SimpleUploadedFile("c.pdf", b"x", "application/pdf"),
            sha256_hash="d" * 64,
        )

        serializer = CertificateSerializer(cert)

        assert serializer.data["provider"] == provider.pk
        assert serializer.data["provider_details"]["provider"] == "Udemy"
        assert set(CertificateSerializer.Meta.read_only_fields) == {
            "sha256_hash",
            "is_published",
            "uploaded_at",
        }


@pytest.mark.django_db
class TestTrackSerializerVisibility:
    def _track_with_certificates(self):
        provider = Provider.objects.create(provider="P")
        track = Track.objects.create(name="T", slug="t")
        for char, published in (("a", True), ("b", False)):
            cert = Certificate.objects.create(
                title=f"C{char}",
                provider=provider,
                pdf_file=SimpleUploadedFile(f"{char}.pdf", b"x", "application/pdf"),
                sha256_hash=char * 64,
                is_published=published,
            )
            track.certificates.add(cert)
        return track

    def test_anonymous_request_only_gets_published_certificates(self):
        track = self._track_with_certificates()
        request = APIRequestFactory().get("/")
        request.user = type("Anon", (), {"is_authenticated": False})()

        data = TrackSerializer(track, context={"request": request}).data

        assert [c["title"] for c in data["certificates"]] == ["Ca"]

    def test_without_request_context_all_certificates_are_returned(self):
        track = self._track_with_certificates()
        assert len(TrackSerializer(track).data["certificates"]) == 2


class TestFileValidators:
    @pytest.mark.parametrize("name", ["a.pdf", "a.PNG", "a.jpg", "a.jpeg"])
    def test_accepts_allowed_extensions(self, name):
        validate_file_extension(SimpleUploadedFile(name, b"x"))

    @pytest.mark.parametrize("name", ["a.txt", "a.exe", "a", "a.pdf.php"])
    def test_rejects_other_extensions(self, name):
        with pytest.raises(ValidationError):
            validate_file_extension(SimpleUploadedFile(name, b"x"))

    def test_size_limit_is_exactly_5_mb(self):
        limit = 5 * 1024 * 1024
        validate_file_size(SimpleUploadedFile("a.pdf", b"0" * limit))
        with pytest.raises(ValidationError):
            validate_file_size(SimpleUploadedFile("a.pdf", b"0" * (limit + 1)))


class TestCertificateUploadPath:
    def test_uses_slugified_provider_and_hash_prefix(self):
        class Provider_:
            provider = "Meine Schule GmbH"

        instance = DummyCertificate(Provider_(), "abcdef1234567890" + "0" * 48)
        path = certificate_upload_path(instance, "cert.pdf")
        assert path == "certificates/meine-schule-gmbh/abcdef123456/cert.pdf"

    def test_falls_back_to_unsorted_without_provider_and_hash(self):
        path = certificate_upload_path(DummyCertificate(), "cert.pdf")
        assert path == "certificates/unsorted/unsorted/cert.pdf"

    def test_symbol_only_provider_falls_back_to_unsorted(self):
        path = certificate_upload_path(DummyCertificate("??? ***"), "cert.pdf")
        assert path.startswith("certificates/unsorted/")

    def test_provider_name_cannot_escape_directory(self):
        path = certificate_upload_path(DummyCertificate("../../etc"), "c.pdf")
        assert ".." not in path
        assert path.startswith("certificates/etc/")


@pytest.mark.django_db
class TestModelRepresentation:
    def test_string_representations(self):
        provider = Provider.objects.create(provider="Udemy")
        cert = Certificate.objects.create(
            title="Python",
            provider=provider,
            pdf_file=SimpleUploadedFile("c.pdf", b"x", "application/pdf"),
            sha256_hash="e" * 64,
        )
        skill = Skill(name="Python", category="backend", proficiency=90)
        entry = TimelineEntry(title="Dev", organization="ACME")

        assert str(skill) == "Python (Backend, 90%)"
        assert str(cert) == "Python (Udemy)"
        assert str(entry) == "Dev @ ACME"
        assert str(provider) == "Udemy"
        assert str(Project(title="Portfolio")) == "Portfolio"

    @pytest.mark.parametrize(
        "model",
        [Skill, TimelineEntry, Provider, Track, Certificate, Project],
    )
    def test_models_define_german_verbose_names(self, model):
        assert model._meta.verbose_name
        assert model._meta.verbose_name_plural

    def test_skill_ordering_is_category_then_proficiency_desc(self):
        Skill.objects.create(name="B", category="backend", proficiency=50)
        Skill.objects.create(name="A", category="backend", proficiency=90)
        Skill.objects.create(name="C", category="frontend", proficiency=99)

        assert [s.name for s in Skill.objects.all()] == ["A", "B", "C"]


@pytest.mark.django_db
class TestQueryCounts:
    """Listen-Endpunkte dürfen nicht mit der Datenmenge mehr Queries erzeugen."""

    @staticmethod
    def _count_queries(client, url):
        with CaptureQueriesContext(connection) as ctx:
            assert client.get(url).status_code == 200
        return len(ctx)

    def _grow_projects(self, count, offset=0):
        skill, _ = Skill.objects.get_or_create(name="Shared")
        for i in range(count):
            Project.objects.create(title=f"P{offset + i}", description="D").skills.add(
                skill
            )

    def test_project_list_query_count_is_constant(self, api_client):
        url = reverse("project-list")
        self._grow_projects(2)
        small = self._count_queries(api_client, url)
        self._grow_projects(8, offset=2)
        assert self._count_queries(api_client, url) == small

    def test_timeline_list_query_count_is_constant(self, api_client):
        url = reverse("timeline-list")
        skill = Skill.objects.create(name="S")

        def add(n):
            for i in range(n):
                TimelineEntry.objects.create(
                    title=f"T{i}", organization="O", start_date="2024-01-01"
                ).skills.add(skill)

        add(2)
        small = self._count_queries(api_client, url)
        add(8)
        assert self._count_queries(api_client, url) == small

    def _add_tracks_with_certificate(self, start, stop):
        provider, _ = Provider.objects.get_or_create(provider="P")
        for i in range(start, stop):
            track = Track.objects.create(name=f"T{i}", slug=f"t{i}")
            track.certificates.add(
                Certificate.objects.create(
                    title=f"C{i}",
                    provider=provider,
                    pdf_file=SimpleUploadedFile(f"{i}.pdf", b"x", "application/pdf"),
                    sha256_hash=f"{i:02d}" * 32,
                    is_published=True,
                )
            )

    def test_track_list_query_count_is_constant_for_anonymous(self, api_client):
        url = reverse("track-list")
        self._add_tracks_with_certificate(0, 2)
        small = self._count_queries(api_client, url)
        self._add_tracks_with_certificate(2, 10)
        assert self._count_queries(api_client, url) == small

    def test_track_list_query_count_is_constant_for_authenticated(self, auth_client):
        url = reverse("track-list")
        self._add_tracks_with_certificate(0, 2)
        small = self._count_queries(auth_client, url)
        self._add_tracks_with_certificate(2, 10)
        assert self._count_queries(auth_client, url) == small
