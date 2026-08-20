import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture
def api_client():
    """Standard DRF APIClient ohne Authentifizierung."""
    return APIClient()


@pytest.fixture
def test_user(db):
    """Erstellt einen Standard-Testbenutzer."""
    return User.objects.create_user(
        email="testuser@example.com",
        password="TestPassword123!",
    )


@pytest.fixture
def inactive_user(db):
    """Erstellt einen deaktivierten Testbenutzer."""
    user = User.objects.create_user(
        email="inactive@example.com",
        password="TestPassword123!",
    )
    user.is_active = False
    user.save()
    return user


@pytest.fixture
def auth_client(api_client, test_user):
    """APIClient mit gültigem SimpleJWT Bearer Token."""
    refresh = RefreshToken.for_user(test_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token!s}")
    return api_client
