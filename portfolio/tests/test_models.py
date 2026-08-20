import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from portfolio.models import Certificate, Project, Provider, certificate_upload_path

# =====================================================================
# 1. Tests für die dynamische Pfad-Generierung (Unit-Tests)
# =====================================================================


class TestCertificateUploadPath:
    """
    Testet die certificate_upload_path Funktion isoliert.
    Dafür brauchen wir keine Datenbank, nur ein Dummy-Objekt.
    """

    class DummyInstance:
        def __init__(self, issuer):
            self.issuer = issuer

    def test_standard_issuer_name(self):
        """Testet einen normalen Namen ohne Sonderzeichen."""
        instance = self.DummyInstance(issuer="Cisco Systems")
        path = certificate_upload_path(instance, "cert.pdf")

        # 'Cisco Systems' sollte zu 'cisco-systems' werden
        assert path == "certificates/cisco-systems/cert.pdf"

    def test_complex_issuer_name(self):
        """Testet einen Namen mit Sonderzeichen und Umlauten."""
        instance = self.DummyInstance(issuer="TÜV Süd! & Co. KG")
        path = certificate_upload_path(instance, "mein_zertifikat.pdf")

        # 'TÜV Süd! & Co. KG' wird bereinigt (Umlaute/Sonderzeichen werden entfernt oder ersetzt)
        assert path == "certificates/tuv-sud-co-kg/mein_zertifikat.pdf"

    def test_fallback_issuer_name(self):
        """
        Testet den Randfall, wenn der Name nur aus nicht-konformen
        Zeichen besteht, die von slugify komplett gelöscht werden.
        """
        instance = self.DummyInstance(issuer="??? *** !!!")
        path = certificate_upload_path(instance, "test.pdf")

        # Da der Name wegschmilzt, muss unser Fallback 'unsorted' greifen
        assert path == "certificates/unsorted/test.pdf"


# =====================================================================
# 2. Tests für das Certificate Model (Datenbank-Tests)
# =====================================================================


# Dieser Decorator erlaubt es Pytest, auf die Test-Datenbank zuzugreifen
@pytest.mark.django_db
class TestCertificateModel:
    def test_certificate_creation_and_str(self):
        """Testet das Erstellen eines Eintrags und die __str__ Methode."""

        # Wir simulieren eine hochgeladene Datei im Speicher
        dummy_file = SimpleUploadedFile(
            name="test_file.pdf",
            content=b"Dummy PDF Content",  # b'' = Byte-String (Dateiinhalt)
            content_type="application/pdf",
        )

        # Zertifikat in der Test-Datenbank erstellen
        cert = Certificate.objects.create(
            title="Python Advanced", issuer="Udemy", pdf_file=dummy_file
        )

        # Prüfen, ob das Objekt existiert
        assert Certificate.objects.count() == 1

        # Prüfen, ob die __str__ Methode exakt das erwartete Format liefert
        assert str(cert) == "Python Advanced (Udemy)"

        # Prüfen, ob die Datei im richtigen dynamischen Pfad abgelegt werden würde
        assert "certificates/udemy/test_file" in cert.pdf_file.name


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
class TestProjectModel:
    def test_project_creation_and_str(self):
        """Testet das Erstellen eines Projekts und die __str__ Methode."""
        project = Project.objects.create(
            title="My Portfolio",
            description="Django portfolio app",
            github_url="https://github.com/user/repo",
            live_url="https://live.com",
        )
        assert Project.objects.count() == 1
        assert str(project) == "My Portfolio"


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
        with pytest.raises(
            ValueError, match=r"Superuser muss is_staff=True haben\."
        ):
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


