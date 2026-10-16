import logging
from smtplib import SMTPException
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db import OperationalError
from django.urls import reverse
from djoser.utils import encode_uid
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestPasswordResetRequestView:
    """Tests für den PasswordResetRequestView (POST /api/auth/password-reset/)."""

    def setup_method(self) -> None:
        self.client = APIClient()
        self.url = reverse("password-reset-request")

    def test_password_reset_sends_to_portfolio_owner_email(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Erfolgreicher Request versendet E-Mail an PORTFOLIO_OWNER_EMAIL."""
        owner_email = "owner@portfolio.dev"
        monkeypatch.setenv("PORTFOLIO_OWNER_EMAIL", owner_email)
        User.objects.create_superuser(email=owner_email, password="OldPassword123!")

        with patch("djoser.email.PasswordResetEmail.send") as mock_send:
            response = self.client.post(self.url, {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "Inhaber-Adresse" in response.data["detail"]
        mock_send.assert_called_once_with([owner_email])

    def test_password_reset_falls_back_to_superuser_when_owner_email_differs(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Nutzt hinterlegte PORTFOLIO_OWNER_EMAIL als Empfänger,
        auch wenn DB-Superuser abweicht.
        """
        monkeypatch.setenv("PORTFOLIO_OWNER_EMAIL", "configured-owner@portfolio.dev")
        User.objects.create_superuser(
            email="db-admin@portfolio.dev", password="OldPassword123!"
        )

        with patch("djoser.email.PasswordResetEmail.send") as mock_send:
            response = self.client.post(self.url, {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        mock_send.assert_called_once_with(["configured-owner@portfolio.dev"])

    def test_password_reset_falls_back_to_staff_when_no_owner_and_no_superuser(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Greift auf Staff-Account zurück,
        falls PORTFOLIO_OWNER_EMAIL fehlt und kein Superuser existiert.
        """
        monkeypatch.delenv("PORTFOLIO_OWNER_EMAIL", raising=False)
        User.objects.create_user(
            email="staff-lead@portfolio.dev",
            password="OldPassword123!",
            is_staff=True,
        )

        with patch("djoser.email.PasswordResetEmail.send") as mock_send:
            response = self.client.post(self.url, {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        mock_send.assert_called_once_with(["staff-lead@portfolio.dev"])

    def test_password_reset_handles_runtime_error_gracefully(
        self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Fängt RuntimeError bei E-Mail-Versand ab,
        loggt den Fehler und gibt 200 OK zurück.
        """
        owner_email = "owner@portfolio.dev"
        monkeypatch.setenv("PORTFOLIO_OWNER_EMAIL", owner_email)
        User.objects.create_superuser(email=owner_email, password="OldPassword123!")

        with (
            caplog.at_level(logging.ERROR),
            patch(
                "djoser.email.PasswordResetEmail.send",
                side_effect=RuntimeError("SMTP Connection Timeout"),
            ),
        ):
            response = self.client.post(self.url, {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "Inhaber-Adresse" in response.data["detail"]
        assert "Fehler beim Versenden der Passwort-Reset-Mail" in caplog.text

    def test_password_reset_handles_smtp_exception_gracefully(
        self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Fängt SMTPException bei Mailserver-Ausfall ab,
        loggt und gibt kontrollierte 200 Response.
        """
        owner_email = "owner@portfolio.dev"
        monkeypatch.setenv("PORTFOLIO_OWNER_EMAIL", owner_email)
        User.objects.create_superuser(email=owner_email, password="OldPassword123!")

        with (
            caplog.at_level(logging.ERROR),
            patch(
                "djoser.email.PasswordResetEmail.send",
                side_effect=SMTPException(
                    "554 Transaction failed: Relay access denied"
                ),
            ),
        ):
            response = self.client.post(self.url, {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "Fehler beim Versenden der Passwort-Reset-Mail" in caplog.text

    def test_password_reset_returns_200_even_if_no_user_exists(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Anti-Enumeration: Gibt 200 OK zurück,
        auch wenn kein passender Account existiert.
        """
        monkeypatch.setenv("PORTFOLIO_OWNER_EMAIL", "nonexistent@portfolio.dev")
        User.objects.all().delete()

        with patch("djoser.email.PasswordResetEmail.send") as mock_send:
            response = self.client.post(self.url, {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        mock_send.assert_not_called()


@pytest.mark.django_db
class TestPasswordResetConfirmAPI:
    """Tests für den Djoser Bestätigungsendpunkt (POST /api/auth/users/reset_password_confirm/)."""

    def setup_method(self) -> None:
        self.client = APIClient()
        self.confirm_url = reverse("user-reset-password-confirm")
        self.login_url = reverse("jwt-create")

    def test_reset_password_confirm_e2e_success_and_login(self) -> None:
        """End-to-End Test: Passwort wird erfolgreich zurückgesetzt
        und neuer Login gelingt.
        """
        old_password = "OldPassword123!"
        new_password = "BrandNewSecurePassword2026!#"
        user = User.objects.create_superuser(
            email="admin@portfolio.dev", password=old_password
        )

        uid = encode_uid(user.pk)
        token = default_token_generator.make_token(user)

        payload = {
            "uid": uid,
            "token": token,
            "new_password": new_password,
            "re_new_password": new_password,
        }

        # 1. Passwort über Confirm-Endpunkt aktualisieren
        confirm_response = self.client.post(self.confirm_url, payload, format="json")
        assert confirm_response.status_code in (
            status.HTTP_204_NO_CONTENT,
            status.HTTP_200_OK,
        )

        # 2. Passwortänderung in DB verifizieren
        user.refresh_from_db()
        assert user.check_password(new_password) is True
        assert user.check_password(old_password) is False

        # 3. Login mit neuem Passwort muss erfolgreich Tokens liefern
        login_response = self.client.post(
            self.login_url,
            {"email": user.email, "password": new_password},
            format="json",
        )
        assert login_response.status_code == status.HTTP_200_OK
        assert "access" in login_response.data
        assert "refresh" in login_response.data

        # 4. Altes Passwort darf nicht mehr funktionieren
        failed_login = self.client.post(
            self.login_url,
            {"email": user.email, "password": old_password},
            format="json",
        )
        assert failed_login.status_code == status.HTTP_401_UNAUTHORIZED

    def test_reset_password_confirm_invalid_uid_returns_400(self) -> None:
        """Ungültige oder nicht existierende UID führt zu 400 Bad Request."""
        user = User.objects.create_superuser(
            email="admin@portfolio.dev", password="OldPassword123!"
        )
        token = default_token_generator.make_token(user)

        # Fall A: Völlig ungültiger Base64 String
        payload_invalid_b64 = {
            "uid": "invalid-uid-string",
            "token": token,
            "new_password": "BrandNewSecurePassword2026!#",
            "re_new_password": "BrandNewSecurePassword2026!#",
        }
        res_a = self.client.post(self.confirm_url, payload_invalid_b64, format="json")
        assert res_a.status_code == status.HTTP_400_BAD_REQUEST

        # Fall B: Valides Base64, aber User-ID existiert nicht
        payload_nonexistent_user = {
            "uid": encode_uid(9999999),
            "token": token,
            "new_password": "BrandNewSecurePassword2026!#",
            "re_new_password": "BrandNewSecurePassword2026!#",
        }
        res_b = self.client.post(
            self.confirm_url, payload_nonexistent_user, format="json"
        )
        assert res_b.status_code == status.HTTP_400_BAD_REQUEST

    def test_reset_password_confirm_invalid_or_expired_token_returns_400(self) -> None:
        """Abgelaufener oder manipulierter Token führt zu 400 Bad Request."""
        user = User.objects.create_superuser(
            email="admin@portfolio.dev", password="OldPassword123!"
        )
        uid = encode_uid(user.pk)

        payload = {
            "uid": uid,
            "token": "invalid-token-tampered-123",
            "new_password": "BrandNewSecurePassword2026!#",
            "re_new_password": "BrandNewSecurePassword2026!#",
        }

        response = self.client.post(self.confirm_url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Token-spezifischer Validierungsfehler im Response-Body
        assert "token" in response.data or "detail" in response.data

    def test_reset_password_confirm_weak_or_short_password_returns_400(self) -> None:
        """Zu kurzes Passwort (< 8 Zeichen) verletzt Validierung
        und liefert 400 Bad Request.
        """
        old_password = "OldPassword123!"
        user = User.objects.create_superuser(
            email="admin@portfolio.dev", password=old_password
        )
        uid = encode_uid(user.pk)
        token = default_token_generator.make_token(user)

        payload = {
            "uid": uid,
            "token": token,
            "new_password": "short",  # Weniger als 8 Zeichen
            "re_new_password": "short",
        }

        response = self.client.post(self.confirm_url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "new_password" in response.data

        # Sicherstellen, dass das alte Passwort unangetastet blieb
        user.refresh_from_db()
        assert user.check_password(old_password) is True


@pytest.mark.django_db
class TestHealthCheckAndAPIErrorHandling:
    """Tests für erweitertes Error-Handling in health_check_view und AIChatView."""

    def setup_method(self) -> None:
        self.client = APIClient()

    def test_health_check_returns_200_when_db_ok(self) -> None:
        response = self.client.get(reverse("health_check"))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"status": "ok"}

    def test_health_check_returns_503_when_db_fails(self) -> None:
        with patch(
            "portfolio.views.connection.cursor",
            side_effect=OperationalError("DB down"),
        ):
            response = self.client.get(reverse("health_check"))

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.json() == {"status": "error", "database": "unavailable"}

    def test_ai_chat_handles_unexpected_service_exception_gracefully(self) -> None:
        url = reverse("ai-chat")
        with patch(
            "portfolio.views.answer_portfolio_query",
            side_effect=RuntimeError("Unexpected LLM failure"),
        ):
            response = self.client.post(
                url, {"message": "Welche Projekte hast du?"}, format="json"
            )

        assert response.status_code == status.HTTP_200_OK
        assert "temporärer Fehler" in response.data["reply"]
        assert response.data["sources"] == []
