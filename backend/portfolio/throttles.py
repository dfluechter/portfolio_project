from rest_framework.request import Request
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView


class AIChatBurstThrottle(AnonRateThrottle):
    """
    1. Burst-Limit (pro IP): Blockiert schnelle Skript-Anfragen (Standard: 5/min).
    """
    scope = "ai_chat_burst"


class AIChatSustainedThrottle(AnonRateThrottle):
    """
    2. Sustained-Limit (pro IP): Begrenzt das Tageskontingent einzelner Besucher (Standard: 30/day).
    """
    scope = "ai_chat_sustained"


class AIChatGlobalBudgetThrottle(SimpleRateThrottle):
    """
    3. Globaler Budget-Schutz (IP-unabhängig): Ein globaler Zähler über alle Nutzer hinweg 
       (Standard: 300/day) zum Schutz des Gemini-API-Budgets bei verteilten Angriffen.
    """
    scope = "ai_chat_global"

    def get_cache_key(self, request: Request, view: APIView) -> str | None:
        # Authentifizierte Staff-User / Admins im Dashboard sind ausgenommen
        if request.user and request.user.is_authenticated and request.user.is_staff:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": "global_gemini_budget_pool",
        }