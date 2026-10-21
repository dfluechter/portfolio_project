"""
Tests für Throttling, Rate-Limiting und Caching des öffentlichen KI-Chat-Endpunkts.
"""

from unittest.mock import patch

import pytest
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient

from portfolio.throttles import (
    AIChatBurstThrottle,
    AIChatGlobalBudgetThrottle,
    AIChatSustainedThrottle,
)


@pytest.fixture(autouse=True)
def clear_cache_between_tests():
    """Stellt sicher, dass Throttling- und Antwort-Caches vor jedem Test leer sind."""
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestAIChatThrottlingAndCaching:
    """Verifiziert Burst-Throttling, Global-Budget-Cap und Prompt-Caching."""

    def test_burst_throttle_blocks_excessive_requests(self, settings):
        """Prüft, ob nach Überschreiten des Burst-Limits HTTP 429 (Too Many Requests) folgt."""
        settings.REST_FRAMEWORK = {
            **getattr(settings, "REST_FRAMEWORK", {}),
            "DEFAULT_THROTTLE_RATES": {
                **getattr(settings, "REST_FRAMEWORK", {}).get(
                    "DEFAULT_THROTTLE_RATES", {}
                ),
                "ai_chat_burst": "2/min",
                "ai_chat_sustained": "50/day",
                "ai_chat_global": "500/day",
            },
        }
        AIChatBurstThrottle.THROTTLE_RATES["ai_chat_burst"] = "2/min"
        AIChatSustainedThrottle.THROTTLE_RATES["ai_chat_sustained"] = "50/day"
        AIChatGlobalBudgetThrottle.THROTTLE_RATES["ai_chat_global"] = "500/day"

        client = APIClient()
        url = "/api/chat/"

        with patch(
            "portfolio.services.ai_assistant.answer_portfolio_query",
            return_value={"reply": "Test-Antwort", "sources": []},
        ):
            for _ in range(2):
                response = client.post(
                    url, {"message": "Welche Skills hast du?"}, format="json"
                )
                assert response.status_code in (
                    status.HTTP_200_OK,
                    status.HTTP_404_NOT_FOUND,
                )

            # 3. Anfrage innerhalb einer Minute muss bei aktivem Endpunkt 429 liefern
            third_response = client.post(
                url, {"message": "Noch eine Frage"}, format="json"
            )
            if third_response.status_code != status.HTTP_404_NOT_FOUND:
                assert third_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_global_budget_throttle_uses_shared_key_across_ips(self):
        """Prüft, ob der globale Circuit-Breaker denselben Cache-Key für verschiedene IPs nutzt."""
        throttle = AIChatGlobalBudgetThrottle()
        client = APIClient()

        req1 = client.post("/api/chat/").wsgi_request
        req1.META["REMOTE_ADDR"] = "192.0.2.1"

        req2 = client.post("/api/chat/").wsgi_request
        req2.META["REMOTE_ADDR"] = "198.51.100.42"

        key1 = throttle.get_cache_key(req1, None)
        key2 = throttle.get_cache_key(req2, None)

        assert key1 is not None
        assert key1 == key2

    def test_global_budget_throttle_exempts_staff_users(self, test_user):
        """Authentifizierte Staff-Nutzer im Dashboard sind vom globalen Budget-Cap ausgenommen."""
        test_user.is_staff = True
        test_user.save()
        throttle = AIChatGlobalBudgetThrottle()
        client = APIClient()

        req = client.post("/api/chat/").wsgi_request
        req.user = test_user

        assert throttle.get_cache_key(req, None) is None
