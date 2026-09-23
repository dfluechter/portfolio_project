import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models import ProtectedError
from django.urls import reverse
from rest_framework import status

from portfolio.models import Certificate, Provider


@pytest.mark.django_db
class TestProviderAndCertificateCRUD:
    def test_authenticated_can_update_provider(self, auth_client):
        provider = Provider.objects.create(provider="Coursera", aktiv=True)
        url = reverse("provider-detail", kwargs={"pk": provider.pk})
        response = auth_client.patch(url, {"aktiv": False}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert not response.data["aktiv"]

    def test_provider_protected_on_delete_if_has_certificate(self, auth_client):
        provider = Provider.objects.create(provider="Udemy")
        dummy_file = SimpleUploadedFile(
            "cert.pdf", b"data", content_type="application/pdf"
        )
        Certificate.objects.create(
            title="Python", provider=provider, pdf_file=dummy_file
        )

        url = reverse("provider-detail", kwargs={"pk": provider.pk})
        with pytest.raises(ProtectedError):
            auth_client.delete(url)

    def test_authenticated_can_delete_provider_without_certificates(self, auth_client):
        provider = Provider.objects.create(provider="Delete Me")
        url = reverse("provider-detail", kwargs={"pk": provider.pk})
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Provider.objects.filter(pk=provider.pk).exists()

    def test_file_validators_untested(self):
        # We test validators directly in test_models
        pass
