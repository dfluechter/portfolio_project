import hashlib
from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from portfolio.models import Certificate, Provider, User


@pytest.mark.django_db
class TestPresignedUploadAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            email="admin@example.com", password="password123"
        )
        self.provider = Provider.objects.create(
            provider="Amazon Web Services", aktiv=True
        )
        self.url = "/api/certificates/presigned_upload/"

    def test_presigned_upload_requires_authentication(self):
        response = self.client.post(self.url, {"filename": "cert.pdf"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_presigned_upload_requires_filename(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "filename" in response.json()["detail"]

    def test_presigned_upload_rejects_unsupported_extension(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url, {"filename": "malicious.exe"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Nicht unterstützter Dateityp" in response.json()["detail"]

    def test_presigned_upload_success_default_local_fallback(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url, {"filename": "my_certificate.pdf"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["method"] == "PUT"
        assert "storage_key" in data
        assert data["storage_key"].startswith("certificates/uploads/")
        assert data["storage_key"].endswith(".pdf")
        assert data["headers"]["Content-Type"] == "application/pdf"
        assert "http" in data["url"]

    def test_presigned_upload_with_s3_client_mock(self):
        self.client.force_authenticate(user=self.user)
        mock_s3 = MagicMock()
        mock_s3.generate_presigned_url.return_value = (
            "https://my-supabase-ref.storage.supabase.co/v1/s3/presigned-url"
        )

        with (
            patch("portfolio.services.storage.get_s3_client", return_value=mock_s3),
            patch.dict(
                "os.environ", {"AWS_S3_ENDPOINT_URL": "https://fake-s3.example.com"}
            ),
        ):
            response = self.client.post(
                self.url,
                {"filename": "k8s_badge.png", "content_type": "image/png"},
                format="json",
            )
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert (
                data["url"]
                == "https://my-supabase-ref.storage.supabase.co/v1/s3/presigned-url"
            )
            assert data["storage_key"].endswith(".png")
            assert data["headers"]["Content-Type"] == "image/png"
            mock_s3.generate_presigned_url.assert_called_once()
            call_kwargs = mock_s3.generate_presigned_url.call_args[1]
            assert call_kwargs["ClientMethod"] == "put_object"
            assert call_kwargs["Params"]["ContentType"] == "image/png"

    def test_create_certificate_with_storage_key(self):
        self.client.force_authenticate(user=self.user)
        custom_hash = hashlib.sha256(b"custom-binary-cert").hexdigest()
        payload = {
            "title": "AWS Direct Upload Certification",
            "provider": self.provider.id,
            "storage_key": "certificates/uploads/abc123_aws_direct.pdf",
            "sha256_hash": custom_hash,
        }

        response = self.client.post("/api/certificates/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "AWS Direct Upload Certification"
        assert data["sha256_hash"] == custom_hash
        assert data["storage_key"] == "certificates/uploads/abc123_aws_direct.pdf"
        assert "certificates/uploads/abc123_aws_direct.pdf" in data["pdf_file"]

        cert = Certificate.objects.get(id=data["id"])
        assert cert.storage_key == "certificates/uploads/abc123_aws_direct.pdf"
        assert cert.sha256_hash == custom_hash
        assert cert.is_published is False

    def test_create_certificate_fails_without_pdf_file_and_without_storage_key(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "title": "Invalid Certificate Without File",
            "provider": self.provider.id,
        }
        response = self.client.post("/api/certificates/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "pdf_file" in response.json()
