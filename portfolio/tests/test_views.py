import pytest
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


@pytest.mark.django_db
class TestLoginView:
    def setup_method(self):
        self.client = Client()

    def test_get_returns_200(self):
        response = self.client.get("/")
        assert response.status_code == 200

    def test_get_authenticated_redirects_to_dashboard(self):
        user = User.objects.create_user(
            email="auth@example.com", password="password123"
        )
        self.client.force_login(user)
        response = self.client.get("/")
        assert response.status_code == 302
        assert response.url == "/dashboard/"

    def test_post_invalid_json_format_returns_400(self):
        response = self.client.post(
            "/", data="invalid-json-body", content_type="application/json"
        )
        assert response.status_code == 400
        assert response.json() == {"detail": "Ungültiges JSON-Format."}

    def test_post_missing_fields_returns_400(self):
        response = self.client.post(
            "/", data={"email": ""}, content_type="application/json"
        )
        assert response.status_code == 400
        assert (
            "E-Mail und Passwort müssen ausgefüllt sein." in response.json()["detail"]
        )

    def test_post_invalid_credentials_returns_400(self):
        User.objects.create_user(email="real@example.com", password="correctpassword")
        response = self.client.post(
            "/",
            data={"email": "real@example.com", "password": "wrongpassword"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "E-Mail-Adresse oder Passwort ungültig." in response.json()["detail"]

    def test_post_inactive_user_cannot_login(self):
        user = User.objects.create_user(
            email="inactive@example.com", password="password123", is_active=False
        )
        response = self.client.post(
            "/",
            data={"email": user.email, "password": "password123"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "E-Mail-Adresse oder Passwort ungültig." in response.json()["detail"]

    def test_post_successful_login_returns_200(self):
        User.objects.create_user(email="valid@example.com", password="password123")
        response = self.client.post(
            "/",
            data={"email": "valid@example.com", "password": "password123"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json() == {"success": True}

    def test_put_returns_405(self):
        response = self.client.put("/")
        assert response.status_code == 405

    def test_delete_returns_405(self):
        response = self.client.delete("/")
        assert response.status_code == 405


@pytest.mark.django_db
class TestDashboardView:
    def setup_method(self):
        self.client = Client()

    def test_unauthenticated_redirects_to_login(self):
        response = self.client.get("/dashboard/")
        assert response.status_code == 302
        assert response.url.startswith("/?next=/dashboard/") or response.url == "/"

    def test_authenticated_returns_200(self):
        user = User.objects.create_user(
            email="admin@example.com", password="password123"
        )
        self.client.force_login(user)
        response = self.client.get("/dashboard/")
        assert response.status_code == 200


@pytest.mark.django_db
class TestLogoutView:
    def setup_method(self):
        self.client = Client()

    def test_logout_redirects_to_root(self):
        user = User.objects.create_user(
            email="logout@example.com", password="password123"
        )
        self.client.force_login(user)
        response = self.client.post("/logout/")
        assert response.status_code == 302
        assert response.url == "/"


class TestHealthCheckView:
    def setup_method(self):
        self.client = Client()

    def test_health_check_returns_200(self):
        response = self.client.get("/health_check")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
