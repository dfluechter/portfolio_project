from unittest.mock import MagicMock, patch

import pytest
from django.test import Client
from rest_framework.test import APIClient

from portfolio.models import PendingCertificate, Track, User
from portfolio.services.promotion import PromotionError


@pytest.mark.django_db
class TestApiRootView:
    def setup_method(self):
        self.client = Client()

    def test_get_root_html_redirects_to_swagger_docs(self):
        response = self.client.get("/", HTTP_ACCEPT="text/html,application/xhtml+xml")
        assert response.status_code == 302
        assert response["Location"] == "/api/docs/"

    def test_get_root_json_returns_metadata(self):
        response = self.client.get("/", HTTP_ACCEPT="application/json")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Portfolio API"
        assert data["status"] == "online"
        assert data["docs_url"] == "/api/docs/"
        assert data["health_url"] == "/health_check"

    def test_obsolete_dashboard_returns_404(self):
        response = self.client.get("/dashboard/")
        assert response.status_code == 404

    def test_obsolete_logout_returns_404(self):
        response = self.client.post("/logout/")
        assert response.status_code == 404


@pytest.mark.django_db
class TestHealthCheckView:
    def setup_method(self):
        self.client = Client()

    def test_health_check_returns_200(self):
        response = self.client.get("/health_check")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_health_check_returns_503_on_db_failure(self):
        with patch(
            "portfolio.views.connection.cursor",
            side_effect=RuntimeError("DB down"),
        ):
            response = self.client.get("/health_check")
        assert response.status_code == 503
        assert response.json()["status"] == "error"


@pytest.mark.django_db
class TestPendingCertificateActionsView:
    def setup_method(self):
        self.api_client = APIClient()
        self.admin = User.objects.create_superuser(
            email="admin-views@example.com", password="password123"
        )
        self.api_client.force_authenticate(user=self.admin)
        self.track = Track.objects.create(name="Cloud", slug="cloud")
        self.pending = PendingCertificate.objects.create(
            original_file_name="cert.pdf",
            file_path="/tmp/cert.pdf",
            extracted_text="Extracted text",
            guessed_title="AWS Cert",
            guessed_provider="AWS",
        )

    def test_retrieve_uses_detail_serializer(self):
        res = self.api_client.get(f"/api/pending-certificates/{self.pending.id}/")
        assert res.status_code == 200
        assert "extracted_text" in res.json()

    def test_approve_validates_track_ids_and_promotes(self):
        # 1. Ungültiger Typ für track_ids
        res_bad_type = self.api_client.post(
            f"/api/pending-certificates/{self.pending.id}/approve/",
            {"track_ids": "not-a-list"},
            format="json",
        )
        assert res_bad_type.status_code == 400

        # 2. Nicht-numerische Track-ID
        res_nan = self.api_client.post(
            f"/api/pending-certificates/{self.pending.id}/approve/",
            {"track_ids": ["abc"]},
            format="json",
        )
        assert res_nan.status_code == 400

        # 3. Nicht existierende Track-ID
        res_missing = self.api_client.post(
            f"/api/pending-certificates/{self.pending.id}/approve/",
            {"track_ids": [999999]},
            format="json",
        )
        assert res_missing.status_code == 400

        # 4. Erfolgreiche Freigabe mit gültiger Track-ID
        fake_cert = MagicMock()
        fake_cert.id = 77
        with patch(
            "portfolio.views.promote_pending_certificate", return_value=fake_cert
        ):
            res_ok = self.api_client.post(
                f"/api/pending-certificates/{self.pending.id}/approve/",
                {"track_ids": [self.track.id]},
                format="json",
            )
        assert res_ok.status_code == 200
        assert res_ok.json()["certificate_id"] == 77

    def test_approve_returns_400_on_promotion_error(self):
        with patch(
            "portfolio.views.promote_pending_certificate",
            side_effect=PromotionError("Quelldatei existiert nicht mehr lokal"),
        ):
            res = self.api_client.post(
                f"/api/pending-certificates/{self.pending.id}/approve/",
                {"track_ids": [self.track.id]},
                format="json",
            )
        assert res.status_code == 400
        assert res.json()["detail"] == "Quelldatei existiert nicht mehr lokal"

    def test_reject_pending_certificate(self):
        with patch("portfolio.views.reject_pending_certificate"):
            res = self.api_client.post(
                f"/api/pending-certificates/{self.pending.id}/reject/"
            )
        assert res.status_code == 200
        assert res.json()["detail"] == "Abgelehnt."

    def test_reject_returns_400_on_promotion_error(self):
        with patch(
            "portfolio.views.reject_pending_certificate",
            side_effect=PromotionError("Zertifikat wurde bereits verarbeitet."),
        ):
            res = self.api_client.post(
                f"/api/pending-certificates/{self.pending.id}/reject/"
            )
        assert res.status_code == 400
        assert res.json()["detail"] == "Zertifikat wurde bereits verarbeitet."


@pytest.mark.django_db
class TestTrackViewSet:
    def setup_method(self):
        self.api_client = APIClient()
        self.admin = User.objects.create_superuser(
            email="admin-tracks@example.com", password="password123"
        )
        self.api_client.force_authenticate(user=self.admin)

    def test_perform_create_succeeds_when_ensure_track_icon_fails(self):
        with patch(
            "portfolio.views.ensure_track_icon",
            side_effect=RuntimeError("Icon-Download fehlgeschlagen"),
        ):
            response = self.api_client.post(
                "/api/tracks/",
                {
                    "name": "Cloud Architecture",
                    "slug": "cloud-architecture",
                    "icon": "cloud",
                },
                format="json",
            )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Cloud Architecture"
        assert data["slug"] == "cloud-architecture"
        assert data["icon"] == "cloud"
        assert Track.objects.filter(slug="cloud-architecture").exists()

    def test_perform_update_succeeds_when_ensure_track_icon_fails(self):
        track = Track.objects.create(
            name="DevOps Engineering",
            slug="devops-engineering",
            icon="server",
        )
        with patch(
            "portfolio.views.ensure_track_icon",
            side_effect=RuntimeError("Icon-Download fehlgeschlagen"),
        ):
            response = self.api_client.patch(
                f"/api/tracks/{track.id}/",
                {"icon": "terminal"},
                format="json",
            )
        assert response.status_code == 200
        data = response.json()
        assert data["icon"] == "terminal"
        track.refresh_from_db()
        assert track.icon == "terminal"
