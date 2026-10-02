import datetime

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from portfolio.models import (
    Certificate,
    CertificateImportRun,
    ImportRunStatus,
    PendingCertificate,
    PendingCertificateStatus,
    Project,
    Provider,
    Skill,
    SkillCategory,
    TimelineEntry,
    TimelineType,
    Track,
    certificate_upload_path,
)

# =====================================================================
# 1. Tests für die dynamische Pfad-Generierung (Unit-Tests)
# =====================================================================


class TestCertificateUploadPath:
    """
    Testet die certificate_upload_path Funktion isoliert.
    Dafür brauchen wir keine Datenbank, nur ein Dummy-Objekt.
    """

    class DummyProvider:
        def __init__(self, provider):
            self.provider = provider

    class DummyInstance:
        def __init__(self, provider):
            self.provider = provider

    def test_standard_provider_name(self):
        """Testet einen normalen Namen ohne Sonderzeichen."""
        instance = self.DummyInstance(
            provider=self.DummyProvider(provider="Cisco Systems")
        )
        instance.sha256_hash = "12345678901234567890"
        path = certificate_upload_path(instance, "cert.pdf")

        # 'Cisco Systems' sollte zu 'cisco-systems' werden
        assert path == "certificates/cisco-systems/123456789012/cert.pdf"

    def test_complex_provider_name(self):
        """Testet einen Namen mit Sonderzeichen und Umlauten."""
        instance = self.DummyInstance(
            provider=self.DummyProvider(provider="TÜV Süd! & Co. KG")
        )
        instance.sha256_hash = ""
        path = certificate_upload_path(instance, "mein_zertifikat.pdf")

        # 'TÜV Süd! & Co. KG' wird bereinigt (Umlaute/Sonderzeichen werden entfernt oder ersetzt)
        assert path == "certificates/tuv-sud-co-kg/unsorted/mein_zertifikat.pdf"

    def test_fallback_provider_name(self):
        """
        Testet den Randfall, wenn der Name nur aus nicht-konformen
        Zeichen besteht, die von slugify komplett gelöscht werden.
        """
        instance = self.DummyInstance(
            provider=self.DummyProvider(provider="??? *** !!!")
        )
        instance.sha256_hash = ""
        path = certificate_upload_path(instance, "test.pdf")

        # Da der Name wegschmilzt, muss unser Fallback 'unsorted' greifen
        assert path == "certificates/unsorted/unsorted/test.pdf"


# =====================================================================
# 2. Tests für Models (Datenbank-Tests)
# =====================================================================


@pytest.mark.django_db
class TestSkillModel:
    def test_skill_creation_and_str(self):
        """Testet das Erstellen eines Skills und die __str__ Methode."""
        skill = Skill.objects.create(
            name="Python",
            category=SkillCategory.BACKEND,
            proficiency=90,
            icon="fa-brands fa-python",
            is_featured=True,
        )
        assert Skill.objects.count() == 1
        assert str(skill) == "Python (Backend, 90%)"
        assert skill.is_featured is True

    def test_skill_proficiency_validation(self):
        """Testet, dass proficiency Grenzen (1-100) validiert werden."""
        skill_invalid = Skill(
            name="Rust",
            category=SkillCategory.BACKEND,
            proficiency=120,
        )
        with pytest.raises(ValidationError):
            skill_invalid.full_clean()


@pytest.mark.django_db
class TestTimelineEntryModel:
    def test_timeline_entry_creation_and_str(self):
        """Testet das Erstellen eines Timeline-Eintrags mit Skills."""
        skill1 = Skill.objects.create(name="Django", category=SkillCategory.BACKEND)
        skill2 = Skill.objects.create(
            name="PostgreSQL", category=SkillCategory.DATABASE
        )

        entry = TimelineEntry.objects.create(
            entry_type=TimelineType.EXPERIENCE,
            title="Senior Python Backend Developer",
            organization="Tech Solutions GmbH",
            location="Berlin / Remote",
            start_date=datetime.date(2023, 1, 1),
            is_current=True,
            description="Entwicklung von Microservices und APIs.",
        )
        entry.skills.add(skill1, skill2)

        assert TimelineEntry.objects.count() == 1
        assert str(entry) == "Senior Python Backend Developer @ Tech Solutions GmbH"
        assert entry.skills.count() == 2
        assert entry.is_current is True
        assert entry.end_date is None


@pytest.mark.django_db
class TestProviderModel:
    def test_provider_creation_and_str(self):
        """Testet das Erstellen eines Providers und die __str__ Methode."""
        provider = Provider.objects.create(
            provider="Microsoft", aktiv=True, url="https://microsoft.com"
        )
        assert Provider.objects.filter(provider="Microsoft").count() == 1
        assert str(provider) == "Microsoft"


@pytest.mark.django_db
class TestCertificateModel:
    def test_certificate_creation_and_str(self):
        """Testet das Erstellen eines Eintrags und die __str__ Methode."""
        provider = Provider.objects.create(provider="Udemy")
        dummy_file = SimpleUploadedFile(
            name="test_file.pdf",
            content=b"Dummy PDF Content",
            content_type="application/pdf",
        )

        cert = Certificate.objects.create(
            title="Python Advanced",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="a" * 64,
        )

        assert Certificate.objects.count() == 1
        assert str(cert) == "Python Advanced (Udemy)"
        assert cert.pdf_file.name is not None
        assert "certificates/udemy/" in cert.pdf_file.name
        assert cert.is_published is False


@pytest.mark.django_db
class TestTrackModel:
    def test_track_creation_and_str(self):
        """Testet das Erstellen eines Tracks und die __str__ Methode."""
        track = Track.objects.create(
            name="Python Django",
            slug="python-django",
            description="Alles rund um Django",
        )
        assert Track.objects.count() == 1
        assert str(track) == "Python Django"
        assert track.slug == "python-django"

    def test_track_slug_unique(self):
        """Testet, dass doppelte Slugs einen IntegrityError auslösen."""
        from django.db import IntegrityError

        Track.objects.create(name="Track A", slug="same-slug")
        with pytest.raises(IntegrityError):
            Track.objects.create(name="Track B", slug="same-slug")


@pytest.mark.django_db
class TestPendingCertificateModel:
    def test_creation_and_str(self):
        """Testet Erstellung und Status-Display."""
        pending = PendingCertificate.objects.create(
            original_file_name="cert.pdf",
            file_path="/fake/path/cert.pdf",
            guessed_title="Azure Admin",
            guessed_provider="Microsoft",
        )
        assert PendingCertificate.objects.count() == 1
        assert str(pending) == "[Ausstehend] cert.pdf"
        assert pending.status == PendingCertificateStatus.PENDING

    def test_sha256_hash_nullable_unique(self):
        """Mehrere PendingCertificates ohne Hash (NULL) sind erlaubt."""
        PendingCertificate.objects.create(
            original_file_name="a.pdf",
            file_path="/fake/a.pdf",
            sha256_hash=None,
        )
        PendingCertificate.objects.create(
            original_file_name="b.pdf",
            file_path="/fake/b.pdf",
            sha256_hash=None,
        )
        assert PendingCertificate.objects.count() == 2

    def test_sha256_hash_unique_constraint(self):
        """Doppelte Hashes lösen IntegrityError aus."""
        from django.db import IntegrityError

        hash_val = "b" * 64
        PendingCertificate.objects.create(
            original_file_name="a.pdf",
            file_path="/fake/a.pdf",
            sha256_hash=hash_val,
        )
        with pytest.raises(IntegrityError):
            PendingCertificate.objects.create(
                original_file_name="b.pdf",
                file_path="/fake/b.pdf",
                sha256_hash=hash_val,
            )


@pytest.mark.django_db
class TestCertificateImportRunModel:
    def test_creation_and_str(self):
        """Testet Erstellung und __str__ Methode."""
        run = CertificateImportRun.objects.create(
            started_at=datetime.datetime(2026, 1, 1, 10, 0, tzinfo=datetime.UTC),
            files_found=5,
            files_imported=3,
            status=ImportRunStatus.SUCCESS,
        )
        assert CertificateImportRun.objects.count() == 1
        assert "[Erfolgreich]" in str(run)
        assert "(3/5)" in str(run)

    def test_append_log(self):
        """Testet, dass append_log korrekt konkateniert."""
        run = CertificateImportRun.objects.create(
            started_at=datetime.datetime(2026, 1, 1, 10, 0, tzinfo=datetime.UTC),
        )
        run.append_log("Zeile 1")
        run.append_log("Zeile 2")
        assert run.log == "Zeile 1\nZeile 2"


@pytest.mark.django_db
class TestProjectModel:
    def test_project_creation_with_skills_and_str(self):
        """Testet das Erstellen eines Projekts mit verknüpften Skills."""
        skill = Skill.objects.create(name="FastAPI", category=SkillCategory.BACKEND)
        project = Project.objects.create(
            title="My Portfolio",
            description="Django portfolio app",
            github_url="https://github.com/user/repo",
            live_url="https://live.com",
        )
        project.skills.add(skill)

        assert Project.objects.count() == 1
        assert str(project) == "My Portfolio"
        assert project.skills.count() == 1
        first_skill = project.skills.first()
        assert first_skill is not None
        assert first_skill.name == "FastAPI"


# =====================================================================
# 3. Tests für das Custom User Model & UserManager
# =====================================================================


@pytest.mark.django_db
class TestUserModel:
    def test_create_user_success(self):
        """Testet die Erstellung eines normalen Benutzers mit E-Mail."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.create_user(
            email="developer@example.com", password="SecurePassword123!"
        )

        assert user.email == "developer@example.com"
        assert user.check_password("SecurePassword123!")
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False
        assert str(user) == "developer@example.com"

    def test_create_user_without_email_raises_value_error(self):
        """Testet, dass create_user ohne E-Mail einen ValueError wirft."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        with pytest.raises(
            ValueError, match=r"Die E-Mail-Adresse muss angegeben werden\."
        ):
            User.objects.create_user(email="", password="password123")

    def test_create_superuser_success(self):
        """Testet die Erstellung eines Superusers."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        admin = User.objects.create_superuser(
            email="admin@example.com", password="SuperSecretAdminPass123!"
        )

        assert admin.email == "admin@example.com"
        assert admin.check_password("SuperSecretAdminPass123!")
        assert admin.is_active is True
        assert admin.is_staff is True
        assert admin.is_superuser is True

    def test_create_superuser_invalid_staff_flag_raises_error(self):
        """Testet, dass create_superuser mit is_staff=False fehlschlägt."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        with pytest.raises(ValueError, match=r"Superuser muss is_staff=True haben\."):
            User.objects.create_superuser(
                email="admin@example.com",
                password="password123",
                is_staff=False,
            )

    def test_create_superuser_invalid_superuser_flag_raises_error(self):
        """Testet, dass create_superuser mit is_superuser=False fehlschlägt."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        with pytest.raises(
            ValueError, match=r"Superuser muss is_superuser=True haben\."
        ):
            User.objects.create_superuser(
                email="admin@example.com",
                password="password123",
                is_superuser=False,
            )
