import datetime

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from portfolio.models import (
    Certificate,
    Project,
    Provider,
    Skill,
    SkillCategory,
    TimelineEntry,
    TimelineType,
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
        path = certificate_upload_path(instance, "cert.pdf")

        # 'Cisco Systems' sollte zu 'cisco-systems' werden
        assert path == "certificates/cisco-systems/cert.pdf"

    def test_complex_provider_name(self):
        """Testet einen Namen mit Sonderzeichen und Umlauten."""
        instance = self.DummyInstance(
            provider=self.DummyProvider(provider="TÜV Süd! & Co. KG")
        )
        path = certificate_upload_path(instance, "mein_zertifikat.pdf")

        # 'TÜV Süd! & Co. KG' wird bereinigt (Umlaute/Sonderzeichen werden entfernt oder ersetzt)
        assert path == "certificates/tuv-sud-co-kg/mein_zertifikat.pdf"

    def test_fallback_provider_name(self):
        """
        Testet den Randfall, wenn der Name nur aus nicht-konformen
        Zeichen besteht, die von slugify komplett gelöscht werden.
        """
        instance = self.DummyInstance(
            provider=self.DummyProvider(provider="??? *** !!!")
        )
        path = certificate_upload_path(instance, "test.pdf")

        # Da der Name wegschmilzt, muss unser Fallback 'unsorted' greifen
        assert path == "certificates/unsorted/test.pdf"


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
        assert Provider.objects.count() == 1
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
            title="Python Advanced", provider=provider, pdf_file=dummy_file
        )

        assert Certificate.objects.count() == 1
        assert str(cert) == "Python Advanced (Udemy)"
        assert "certificates/udemy/test_file" in cert.pdf_file.name


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
        assert project.skills.first().name == "FastAPI"


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
