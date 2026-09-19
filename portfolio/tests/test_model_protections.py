import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models import ProtectedError
from portfolio.models import Certificate, Provider

@pytest.mark.django_db
class TestModelProtections:
    def test_provider_protected_on_delete_if_has_certificate(self):
        provider = Provider.objects.create(provider="Udemy")
        dummy_file = SimpleUploadedFile("cert.pdf", b"data", content_type="application/pdf")
        Certificate.objects.create(title="Python", provider=provider, pdf_file=dummy_file)
        
        with pytest.raises(ProtectedError):
            provider.delete()
