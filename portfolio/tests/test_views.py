import pytest
from django.test import Client


@pytest.mark.django_db
class TestLoginView:
    def setup_method(self):
        self.client = Client()

    def test_get_returns_200(self):
        response = self.client.get("/")
        assert response.status_code == 200

    def test_post_invalid_json_returns_400(self):
        response = self.client.post("/", data="{}", content_type="application/json")
        assert response.status_code == 400

    def test_put_returns_405(self):
        response = self.client.put("/")
        assert response.status_code == 405

    def test_delete_returns_405(self):
        response = self.client.delete("/")
        assert response.status_code == 405


class TestHealthCheckView:
    def setup_method(self):
        self.client = Client()

    def test_health_check_returns_200(self):
        response = self.client.get("/health_check")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
