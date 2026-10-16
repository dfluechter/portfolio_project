"""
Custom DRF Throttling classes for protecting the public AI Assistant endpoint
against burst spam, single-IP abuse, and distributed budget exhaustion.
"""

from rest_framework.request import Request
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView


class AIChatBurstThrottle(AnonRateThrottle):
    """
    Schützt vor schnellen, automatisierten Anfragen (z. B. 5 Anfragen pro Minute pro IP).
    """

    scope = "ai_chat_burst"


class AIChatSustainedThrottle(AnonRateThrottle):
    """
    Begrenzt das langfristige Kontingent pro IP-Adresse (z. B. 30 Anfragen pro Tag).
    """

    scope = "ai_chat_sustained"


class AIChatGlobalBudgetThrottle(SimpleRateThrottle):
    """
    Globaler Circuit-Breaker über ALLE Nutzer und IPs hinweg (z. B. 300 Anfragen pro Tag).
    Verhindert, dass verteilte Botnetze mit wechselnden IPs das Gemini-API-Kontingent
    ausschöpfen. Authentifizierte Admins im Dashboard sind ausgenommen.
    """

    scope = "ai_chat_global"

    def get_cache_key(self, request: Request, view: APIView) -> str | None:
        if request.user and request.user.is_authenticated and request.user.is_staff:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": "global_gemini_budget",
        }
