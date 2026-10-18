import pytest
from django.test import Client


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
