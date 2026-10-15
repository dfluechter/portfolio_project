from unittest.mock import patch

import pytest
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework.test import APIClient

from portfolio.models import Certificate, Provider, Track, User
from portfolio.services.storage import (
    ensure_certificate_in_storage,
    find_local_certificate_file,
)


@pytest.mark.django_db
class TestCertificatePublishStorage:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            email="admin@example.com", password="password123"
        )
        self.client.force_authenticate(user=self.user)
        self.provider = Provider.objects.create(provider="Udemy", aktiv=True)

    def test_ensure_certificate_in_storage_when_already_in_storage(self):
        cert = Certificate.objects.create(
            title="Python Course",
            provider=self.provider,
            sha256_hash="dummyhash123456",
            is_published=False,
        )
        cert.pdf_file.save("test.pdf", ContentFile(b"%PDF-test-content"), save=True)

        # Da default_storage.exists True zurückgibt, muss ensure_certificate_in_storage True liefern
        assert ensure_certificate_in_storage(cert) is True

    def test_ensure_certificate_in_storage_from_local_source(self, tmp_path):
        # Simuliere CERTIFICATES_PATH
        cert_dir = tmp_path / "Udemy"
        cert_dir.mkdir(parents=True)
        local_file = cert_dir / "uc-test-certificate.pdf"
        local_file.write_bytes(b"%PDF-real-content-from-disk")

        cert = Certificate.objects.create(
            title="uc-test-certificate",
            provider=self.provider,
            sha256_hash="localhash987654321012",
            is_published=False,
        )

        track = Track.objects.create(name="Publish Track", slug="publish-track")
        cert.tracks.add(track)

        with patch.dict("os.environ", {"CERTIFICATES_PATH": str(tmp_path)}):
            found = find_local_certificate_file(cert)
            assert found is not None
            assert found.name == "uc-test-certificate.pdf"

            success = ensure_certificate_in_storage(cert)
            assert success is True
            assert cert.pdf_file and cert.pdf_file.name
            assert default_storage.exists(cert.pdf_file.name)

    def test_publish_endpoint_triggers_storage_and_publishes(self, tmp_path):
        cert_dir = tmp_path / "Udemy"
        cert_dir.mkdir(parents=True)
        local_file = cert_dir / "uc-publish-test.pdf"
        local_file.write_bytes(b"%PDF-publish-content")

        cert = Certificate.objects.create(
            title="uc-publish-test",
            provider=self.provider,
            sha256_hash="publishhash987654321012",
            is_published=False,
        )
        track = Track.objects.create(name="Publish Test Track", slug="publish-test-track")
        cert.tracks.add(track)

        with patch.dict("os.environ", {"CERTIFICATES_PATH": str(tmp_path)}):
            response = self.client.post(f"/api/certificates/{cert.id}/publish/")
            assert response.status_code == 200
            assert response.json()["status"] == "published"
            assert response.json()["is_published"] is True

            cert.refresh_from_db()
            assert cert.is_published is True
            assert cert.pdf_file and cert.pdf_file.name
            assert default_storage.exists(cert.pdf_file.name)
