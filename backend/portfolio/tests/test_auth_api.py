import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.mark.django_db
class TestDjoserJWTEndpoints:
    """Tests fuer Djoser & SimpleJWT Authentifizierungsendpunkte."""

    def test_jwt_create_valid_credentials_returns_tokens(self, api_client, test_user):
        """Erfolgreicher Login gibt access und refresh Token zurueck."""
        url = reverse("jwt-create")
        data = {
            "email": test_user.email,
            "password": "TestPassword123!",
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_jwt_create_invalid_password_returns_401(self, api_client, test_user):
        """Falsches Passwort verweigert den Login mit 401."""
        url = reverse("jwt-create")
        data = {
            "email": test_user.email,
            "password": "WrongPassword123!",
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "access" not in response.data

    def test_jwt_create_inactive_user_returns_401(self, api_client, inactive_user):
        """Deaktivierter Benutzer kann keine Tokens erzeugen."""
        url = reverse("jwt-create")
        data = {
            "email": inactive_user.email,
            "password": "TestPassword123!",
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_jwt_refresh_success(self, api_client, test_user):
        """Ein gueltiges Refresh-Token liefert ein neues Access-Token."""
        refresh = RefreshToken.for_user(test_user)
        url = reverse("jwt-refresh")
        data = {
            "refresh": str(refresh),
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_jwt_refresh_invalid_token_returns_401(self, api_client):
        """Ein ungueltiges Refresh-Token liefert 401."""
        url = reverse("jwt-refresh")
        data = {
            "refresh": "invalid-garbage-token",
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_jwt_verify_success(self, api_client, test_user):
        """Token-Verifizierung mit gueltigem Access-Token."""
        refresh = RefreshToken.for_user(test_user)
        url = reverse("jwt-verify")
        data = {
            "token": str(refresh.access_token),
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK

    def test_user_registration_is_denied_for_anonymous_user(self, api_client):
        """Djoser user_create Endpunkt ist fuer normale/anonyme Nutzer gesperrt."""
        url = reverse("user-list")
        data = {
            "email": "newuser@example.com",
            "password": "Password123!",
            "re_password": "Password123!",
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_current_user_me_authenticated(self, auth_client, test_user):
        """Abfrage von /api/auth/users/me/ mit gueltigem JWT."""
        url = reverse("user-me")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == test_user.email

    def test_current_user_me_unauthenticated_is_denied(self, api_client):
        """Abfrage von /api/auth/users/me/ ohne JWT wird verweigert."""
        url = reverse("user-me")
        response = api_client.get(url)

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]
