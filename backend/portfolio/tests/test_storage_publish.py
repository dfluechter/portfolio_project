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
        track = Track.objects.create(
            name="Publish Test Track", slug="publish-test-track"
        )
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

    def test_find_local_certificate_file_edge_cases(self, tmp_path):
        cert = Certificate.objects.create(
            title="nested-cert",
            provider=self.provider,
            sha256_hash="edgehash1234567890",
            is_published=False,
        )
        with patch.dict("os.environ", {"CERTIFICATES_PATH": ""}):
            assert find_local_certificate_file(cert) is None

        with patch.dict(
            "os.environ", {"CERTIFICATES_PATH": str(tmp_path / "nonexistent")}
        ):
            assert find_local_certificate_file(cert) is None

        # Case-insensitive provider dir & recursive fallback
        other_dir = tmp_path / "udemy"
        other_dir.mkdir(parents=True)
        nested_dir = tmp_path / "archive" / "2025"
        nested_dir.mkdir(parents=True)
        nested_file = nested_dir / "nested-cert.pdf"
        nested_file.write_bytes(b"%PDF-nested")

        with patch.dict("os.environ", {"CERTIFICATES_PATH": str(tmp_path)}):
            found = find_local_certificate_file(cert)
            assert found == nested_file

    def test_ensure_certificate_in_storage_missing_and_error_paths(self, tmp_path):
        cert = Certificate.objects.create(
            title="missing-local-cert",
            provider=self.provider,
            sha256_hash="missinghash123456",
            is_published=False,
        )
        with patch.dict("os.environ", {"CERTIFICATES_PATH": str(tmp_path)}):
            assert ensure_certificate_in_storage(cert) is False

        # Exception in default_storage.exists falls back gracefully
        cert.pdf_file.name = "certificates/broken.pdf"
        with (
            patch(
                "portfolio.services.storage.default_storage.exists",
                side_effect=OSError("S3 timeout"),
            ),
            patch.dict("os.environ", {"CERTIFICATES_PATH": str(tmp_path)}),
        ):
            assert ensure_certificate_in_storage(cert) is False

    def test_get_s3_client_uses_path_style_and_env(self):
        from portfolio.services.storage import get_s3_client

        with (
            patch.dict(
                "os.environ",
                {
                    "AWS_S3_ENDPOINT_URL": "https://example.supabase.co/storage/v1/s3",
                    "AWS_ACCESS_KEY_ID": "key-id",
                    "AWS_SECRET_ACCESS_KEY": "secret-key",
                    "AWS_S3_REGION_NAME": "eu-central-1",
                },
            ),
            patch("portfolio.services.storage.boto3.client") as mock_boto,
        ):
            get_s3_client()
            assert mock_boto.called
            _, kwargs = mock_boto.call_args
            assert kwargs["endpoint_url"] == "https://example.supabase.co/storage/v1/s3"
            assert kwargs["aws_access_key_id"] == "key-id"
