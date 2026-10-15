import os
from unittest.mock import MagicMock, patch

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from portfolio.models import Certificate, Provider, Track, User
from portfolio.serializers import TrackSerializer
from portfolio.services.icon_service import ensure_track_icon


@pytest.fixture
def auth_client():
    user = User.objects.create_superuser(
        email="admin@example.com", password="secretpassword123"
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def sample_provider():
    return Provider.objects.create(provider="AWS & Coursera")


@pytest.fixture
def sample_track():
    return Track.objects.create(
        name="Cloud & DevOps",
        slug="cloud-devops",
        icon="cloud",
    )


@pytest.fixture
def dummy_pdf():
    return SimpleUploadedFile(
        "cert.pdf",
        b"%PDF-1.4 mock certificate data",
        content_type="application/pdf",
    )


@pytest.mark.django_db
def test_publish_without_tracks_returns_400(auth_client, sample_provider, dummy_pdf):
    cert = Certificate.objects.create(
        title="AWS Solutions Architect",
        provider=sample_provider,
        pdf_file=dummy_pdf,
        sha256_hash="hash_no_track_publish",
        is_published=False,
    )
    response = auth_client.post(f"/api/certificates/{cert.id}/publish/")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "mindestens ein Track" in response.data["detail"]

    cert.refresh_from_db()
    assert cert.is_published is False


@pytest.mark.django_db
def test_publish_with_tracks_returns_200(
    auth_client, sample_provider, sample_track, dummy_pdf
):
    cert = Certificate.objects.create(
        title="AWS Certified DevOps Engineer",
        provider=sample_provider,
        pdf_file=dummy_pdf,
        sha256_hash="hash_with_track_publish",
        is_published=False,
    )
    cert.tracks.add(sample_track)

    with patch("portfolio.views.ensure_certificate_in_storage"):
        response = auth_client.post(f"/api/certificates/{cert.id}/publish/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["is_published"] is True

    cert.refresh_from_db()
    assert cert.is_published is True


@pytest.mark.django_db
def test_patch_is_published_true_without_tracks_returns_400(
    auth_client, sample_provider, dummy_pdf
):
    cert = Certificate.objects.create(
        title="Docker Certified Associate",
        provider=sample_provider,
        pdf_file=dummy_pdf,
        sha256_hash="hash_patch_no_track",
        is_published=False,
    )
    response = auth_client.patch(
        f"/api/certificates/{cert.id}/",
        {"is_published": True},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "mindestens ein Track" in str(response.data)

    cert.refresh_from_db()
    assert cert.is_published is False


@pytest.mark.django_db
def test_patch_is_published_true_with_tracks_returns_200(
    auth_client, sample_provider, sample_track, dummy_pdf
):
    cert = Certificate.objects.create(
        title="Kubernetes Administrator",
        provider=sample_provider,
        pdf_file=dummy_pdf,
        sha256_hash="hash_patch_with_track",
        is_published=False,
    )
    with patch("portfolio.views.ensure_certificate_in_storage"):
        response = auth_client.patch(
            f"/api/certificates/{cert.id}/",
            {"is_published": True, "tracks": [sample_track.id]},
            format="json",
        )
    assert response.status_code == status.HTTP_200_OK

    cert.refresh_from_db()
    assert cert.is_published is True
    assert cert.tracks.filter(id=sample_track.id).exists()


@pytest.mark.django_db
def test_already_published_certificate_can_update_without_tracks(
    auth_client, sample_provider, dummy_pdf
):
    """Bestandsschutz: Bereits veröffentlichte Zertifikate dürfen ohne Tracks aktualisiert werden."""
    cert = Certificate.objects.create(
        title="Legacy Published Cert",
        provider=sample_provider,
        pdf_file=dummy_pdf,
        sha256_hash="hash_legacy_published",
        is_published=True,
    )
    # PATCH auf bereits veröffentlichtes Zertifikat ohne Tracks
    response = auth_client.patch(
        f"/api/certificates/{cert.id}/",
        {"title": "Updated Legacy Title"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    cert.refresh_from_db()
    assert cert.title == "Updated Legacy Title"
    assert cert.is_published is True
    assert cert.tracks.count() == 0


@pytest.mark.django_db
def test_already_published_certificate_publish_idempotent(
    auth_client, sample_provider, dummy_pdf
):
    """Publish-Endpoint auf bereits veröffentlichtes Zertifikat bleibt idempotent und wirft keinen Fehler."""
    cert = Certificate.objects.create(
        title="Legacy Published Cert 2",
        provider=sample_provider,
        pdf_file=dummy_pdf,
        sha256_hash="hash_legacy_pub_2",
        is_published=True,
    )
    with patch("portfolio.views.ensure_certificate_in_storage"):
        response = auth_client.post(f"/api/certificates/{cert.id}/publish/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["is_published"] is True


@pytest.mark.django_db
def test_track_serializer_fields(sample_track):
    serializer = TrackSerializer(sample_track)
    data = serializer.data
    assert data["icon"] == "cloud"
    assert data["icon_url"] == "/static/img/icons/cloud.svg"
    assert "certificates" in data


def test_icon_service_security_and_download(tmp_path):
    # 1. Ungültiger Icon-Name wird abgewiesen
    assert ensure_track_icon("../invalid/icon") is None
    assert ensure_track_icon("icon with space") is None
    assert ensure_track_icon("") is None

    # 2. Erfolgreicher Download gemockt
    with patch(
        "portfolio.services.icon_service.settings.BASE_DIR",
        tmp_path,
    ):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = b"<svg>mock fontawesome solid</svg>"
        mock_response.__enter__.return_value = mock_response

        with patch("urllib.request.urlopen", return_value=mock_response):
            result = ensure_track_icon("database")
            assert result == "/static/img/icons/database.svg"

            expected_path = os.path.join(
                tmp_path, "static", "img", "icons", "database.svg"
            )
            assert os.path.exists(expected_path)
            with open(expected_path, "rb") as f:
                assert f.read() == b"<svg>mock fontawesome solid</svg>"

            # 3. Zweiter Aufruf nutzt lokalen Cache (ohne erneutes urlopen)
            with patch("urllib.request.urlopen") as mock_url:
                result_cached = ensure_track_icon("database")
                assert result_cached == "/static/img/icons/database.svg"
                mock_url.assert_not_called()
