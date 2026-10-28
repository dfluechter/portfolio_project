from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

User = get_user_model()


@pytest.mark.django_db
class TestUserAndAuthConstraints:
    """Unit- und Datenbank-Tests fuer das User-Modell und E-Mail-Constraints."""

    def test_user_str_representation(self, test_user):
        """String-Repraesentation des Benutzers entspricht der E-Mail-Adresse."""
        assert str(test_user) == test_user.email

    def test_email_unique_constraint(self):
        """Doppelte E-Mail-Adressen verletzen den Unique-Constraint (IntegrityError)."""
        User.objects.create_user(email="unique@test.de", password="TestPassword123!")

        with pytest.raises(IntegrityError):
            User.objects.create_user(
                email="unique@test.de", password="TestPassword123!"
            )


@pytest.mark.django_db
class TestDjoserJWTEndpoints:
    """Integrations- und Security-Tests fuer Djoser & SimpleJWT Endpunkte."""

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

    def test_jwt_create_unknown_email_returns_401(self, api_client):
        """Unbekannte E-Mail-Adresse verweigert den Login mit 401."""
        url = reverse("jwt-create")
        data = {
            "email": "unknown-user@example.com",
            "password": "TestPassword123!",
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
        """Ein manipuliertes / ungueltiges Refresh-Token liefert 401."""
        url = reverse("jwt-refresh")
        data = {
            "refresh": "invalid-garbage-token",
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_jwt_refresh_expired_token_returns_401(self, api_client, test_user):
        """Ein abgelaufenes Refresh-Token wird mit 401 abgelehnt."""
        refresh = RefreshToken.for_user(test_user)
        refresh.set_exp(lifetime=-timedelta(seconds=60))
        url = reverse("jwt-refresh")
        data = {
            "refresh": str(refresh),
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

    def test_user_registration_validation_by_admin(self, api_client):
        """Prueft Registrierungs-Validierung (gueltig, doppelte E-Mail, schwaches Passwort, fehlende Pflichtfelder)."""
        admin = User.objects.create_superuser(
            email="admin-reg@example.com", password="AdminPassword123!"
        )
        refresh = RefreshToken.for_user(admin)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token!s}")
        url = reverse("user-list")

        # 1. Gueltige Registrierung durch Admin
        valid_res = api_client.post(
            url,
            {
                "email": "valid-new@example.com",
                "password": "StrongPassword123!",
                "re_password": "StrongPassword123!",
            },
            format="json",
        )
        assert valid_res.status_code == status.HTTP_201_CREATED

        # 2. Doppelte E-Mail
        dup_res = api_client.post(
            url,
            {
                "email": "valid-new@example.com",
                "password": "StrongPassword123!",
                "re_password": "StrongPassword123!",
            },
            format="json",
        )
        assert dup_res.status_code == status.HTTP_400_BAD_REQUEST

        # 3. Ungueltiges / zu kurzes Passwort
        weak_res = api_client.post(
            url,
            {
                "email": "weak@example.com",
                "password": "123",
                "re_password": "123",
            },
            format="json",
        )
        assert weak_res.status_code == status.HTTP_400_BAD_REQUEST

        # 4. Fehlende Pflichtfelder
        missing_res = api_client.post(url, {}, format="json")
        assert missing_res.status_code == status.HTTP_400_BAD_REQUEST

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

    def test_current_user_me_expired_jwt_is_denied(self, api_client, test_user):
        """Abfrage von /api/auth/users/me/ mit abgelaufenem Access-Token wird mit 401 abgelehnt."""
        token = AccessToken.for_user(test_user)
        token.set_exp(lifetime=-timedelta(seconds=60))
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token!s}")

        url = reverse("user-me")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
