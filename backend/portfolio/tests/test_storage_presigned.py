import hashlib
import io
from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from portfolio.models import Certificate, Provider, User


def _make_mock_s3_client(content: bytes = b"%PDF-1.4 valid pdf content"):
    """Hilfsfunktion zum Erzeugen eines gemockten boto3 S3-Clients für US 10.2."""
    mock_s3 = MagicMock()
    mock_s3.head_object.return_value = {"ContentLength": len(content)}

    def _get_object(**kwargs):
        if "Range" in kwargs:
            return {"Body": io.BytesIO(content[:2048])}
        return {"Body": io.BytesIO(content)}

    mock_s3.get_object.side_effect = _get_object
    return mock_s3


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

    def test_create_certificate_with_storage_key_success(self, settings):
        """US 10.2: Erfolgreiche S3-Existenz-, Größen-, Magic-Byte- und SHA-256-Prüfung."""
        settings.USE_SUPABASE_S3 = True
        self.client.force_authenticate(user=self.user)
        pdf_bytes = b"%PDF-1.4 custom-binary-cert-content"
        expected_hash = hashlib.sha256(pdf_bytes).hexdigest()
        mock_s3 = _make_mock_s3_client(pdf_bytes)

        payload = {
            "title": "AWS Direct Upload Certification",
            "provider": self.provider.id,
            "storage_key": "certificates/uploads/abc123_aws_direct.pdf",
            "sha256_hash": expected_hash,
        }

        with patch("portfolio.services.storage.get_s3_client", return_value=mock_s3):
            response = self.client.post("/api/certificates/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "AWS Direct Upload Certification"
        assert data["sha256_hash"] == expected_hash
        assert data["storage_key"] == "certificates/uploads/abc123_aws_direct.pdf"
        assert "certificates/uploads/abc123_aws_direct.pdf" in data["pdf_file"]

        cert = Certificate.objects.get(id=data["id"])
        assert cert.storage_key == "certificates/uploads/abc123_aws_direct.pdf"
        assert cert.sha256_hash == expected_hash
        assert cert.is_published is False

    def test_create_certificate_with_storage_key_returns_501_when_s3_disabled(
        self, settings, monkeypatch
    ):
        """US 10.2 Szenario 4: 501 Not Implemented wenn USE_SUPABASE_S3=False."""
        settings.USE_SUPABASE_S3 = False
        monkeypatch.setenv("USE_SUPABASE_S3", "False")
        self.client.force_authenticate(user=self.user)

        payload = {
            "title": "Direct Upload Without S3",
            "provider": self.provider.id,
            "storage_key": "certificates/uploads/abc123_test.pdf",
        }
        response = self.client.post("/api/certificates/", payload, format="json")
        assert response.status_code == status.HTTP_501_NOT_IMPLEMENTED
        assert "S3-Konfiguration" in response.json()["detail"]

    def test_create_certificate_with_storage_key_rejects_missing_s3_object(
        self, settings
    ):
        """US 10.2 Szenario 1a: 400 Bad Request wenn S3-Objekt nicht existiert."""
        settings.USE_SUPABASE_S3 = True
        self.client.force_authenticate(user=self.user)
        mock_s3 = MagicMock()
        mock_s3.head_object.side_effect = Exception("404 NoSuchKey")

        payload = {
            "title": "Ghost S3 Object",
            "provider": self.provider.id,
            "storage_key": "certificates/uploads/nonexistent.pdf",
        }
        with patch("portfolio.services.storage.get_s3_client", return_value=mock_s3):
            response = self.client.post("/api/certificates/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "storage_key" in response.json()

    def test_create_certificate_with_storage_key_rejects_oversized_s3_object(
        self, settings
    ):
        """US 10.2 Szenario 1b: 400 Bad Request wenn ContentLength > 10 MB."""
        settings.USE_SUPABASE_S3 = True
        self.client.force_authenticate(user=self.user)
        mock_s3 = MagicMock()
        mock_s3.head_object.return_value = {"ContentLength": 11 * 1024 * 1024}

        payload = {
            "title": "Oversized S3 Object",
            "provider": self.provider.id,
            "storage_key": "certificates/uploads/huge.pdf",
        }
        with patch("portfolio.services.storage.get_s3_client", return_value=mock_s3):
            response = self.client.post("/api/certificates/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "10 MB" in str(response.json()["storage_key"])

    def test_create_certificate_with_storage_key_rejects_magic_byte_mismatch(
        self, settings
    ):
        """US 10.2 Szenario 2: 400 Bad Request bei Magic-Byte-Mismatch (Range-Request)."""
        settings.USE_SUPABASE_S3 = True
        self.client.force_authenticate(user=self.user)
        spoofed_bytes = b"MZ\x90\x00 fake executable disguised as pdf"
        mock_s3 = _make_mock_s3_client(spoofed_bytes)

        payload = {
            "title": "Spoofed S3 PDF",
            "provider": self.provider.id,
            "storage_key": "certificates/uploads/spoofed.pdf",
        }
        with patch("portfolio.services.storage.get_s3_client", return_value=mock_s3):
            response = self.client.post("/api/certificates/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "MIME-Type-Spoofing" in str(response.json()["storage_key"])

    def test_create_certificate_with_storage_key_rejects_sha256_mismatch(
        self, settings
    ):
        """US 10.2 Szenario 3: 400 Bad Request wenn client_hash nicht mit S3-Objekt übereinstimmt."""
        settings.USE_SUPABASE_S3 = True
        self.client.force_authenticate(user=self.user)
        pdf_bytes = b"%PDF-1.4 authentic content"
        mock_s3 = _make_mock_s3_client(pdf_bytes)

        payload = {
            "title": "Tampered Hash Cert",
            "provider": self.provider.id,
            "storage_key": "certificates/uploads/valid.pdf",
            "sha256_hash": "0" * 64,
        }
        with patch("portfolio.services.storage.get_s3_client", return_value=mock_s3):
            response = self.client.post("/api/certificates/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "SHA-256" in str(response.json()["storage_key"])

    def test_create_certificate_fails_without_pdf_file_and_without_storage_key(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "title": "Invalid Certificate Without File",
            "provider": self.provider.id,
        }
        response = self.client.post("/api/certificates/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "pdf_file" in response.json()
