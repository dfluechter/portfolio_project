from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient

from portfolio.models import Certificate, Project, Provider, Skill, Track
from portfolio.services.ai_assistant import RAG_VERSION_KEY

User = get_user_model()


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def admin_user(db: None) -> Any:
    return User.objects.create_superuser(
        email="admin-cache@example.com",
        password="securepassword123",
    )


@pytest.fixture
def sample_data(db: None) -> dict[str, Any]:
    track = Track.objects.create(name="Cloud & DevOps", slug="cloud-devops", icon="cloud")
    provider = Provider.objects.create(provider="AWS", is_active=True)
    project = Project.objects.create(
        title="Cloud Pipeline",
        description="CI/CD Pipeline mit GitHub Actions",
        is_published=True,
    )
    skill = Skill.objects.create(name="Docker", level=90, category="DevOps")
    cert = Certificate.objects.create(
        title="AWS Solutions Architect",
        provider=provider,
        is_published=True,
    )
    cert.tracks.add(track)
    return {
        "track": track,
        "provider": provider,
        "project": project,
        "skill": skill,
        "certificate": cert,
    }


@pytest.mark.django_db
def test_etag_header_present_on_public_list_views(
    api_client: APIClient, sample_data: dict[str, Any]
) -> None:
    """Verifiziert, dass öffentliche Endpunkte ETag und Cache-Control Header liefern."""
    endpoints = [
        "/api/projects/",
        "/api/tracks/",
        "/api/skills/",
        "/api/certificates/",
        "/api/providers/",
    ]
    for url in endpoints:
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK, f"Fehler bei {url}"
        assert "ETag" in response.headers, f"ETag fehlt bei {url}"
        assert response.headers["ETag"].startswith('W/"')
        assert "Cache-Control" in response.headers
        assert "public" in response.headers["Cache-Control"]
        assert "max-age=300" in response.headers["Cache-Control"]


@pytest.mark.django_db
def test_if_none_match_returns_304(
    api_client: APIClient, sample_data: dict[str, Any]
) -> None:
    """Verifiziert, dass If-None-Match bei übereinstimmendem ETag mit 304 antwortet."""
    url = "/api/projects/"
    resp1 = api_client.get(url)
    assert resp1.status_code == status.HTTP_200_OK
    etag = resp1.headers["ETag"]

    # Zweiter Aufruf mit If-None-Match
    resp2 = api_client.get(url, HTTP_IF_NONE_MATCH=etag)
    assert resp2.status_code == status.HTTP_304_NOT_MODIFIED
    assert resp2.content == b""
    assert resp2.headers.get("ETag") == etag


@pytest.mark.django_db
def test_model_save_increments_version_and_invalidates_etag(
    api_client: APIClient, sample_data: dict[str, Any]
) -> None:
    """Verifiziert, dass Model-Mutationen die Cache-Version inkrementieren und alte ETags invalidieren."""
    url = "/api/projects/"
    resp1 = api_client.get(url)
    assert resp1.status_code == status.HTTP_200_OK
    old_etag = resp1.headers["ETag"]

    # Neues Projekt anlegen -> Signal feuert
    Project.objects.create(
        title="Neues Projekt",
        description="Beschreibung",
        is_published=True,
    )

    resp2 = api_client.get(url)
    assert resp2.status_code == status.HTTP_200_OK
    new_etag = resp2.headers["ETag"]
    assert new_etag != old_etag

    # Alter ETag liefert jetzt wieder 200 OK statt 304 Not Modified
    resp3 = api_client.get(url, HTTP_IF_NONE_MATCH=old_etag)
    assert resp3.status_code == status.HTTP_200_OK
    assert resp3.headers["ETag"] == new_etag


@pytest.mark.django_db
def test_authenticated_requests_receive_no_cache(
    api_client: APIClient, admin_user: Any, sample_data: dict[str, Any]
) -> None:
    """Verifiziert, dass authentifizierte Requests kein Caching und kein 304 erhalten."""
    url = "/api/projects/"
    resp_anon = api_client.get(url)
    etag = resp_anon.headers["ETag"]

    api_client.force_authenticate(user=admin_user)
    resp_auth = api_client.get(url)
    assert resp_auth.status_code == status.HTTP_200_OK
    assert "no-cache" in resp_auth.headers.get("Cache-Control", "")
    assert "private" in resp_auth.headers.get("Cache-Control", "")

    # If-None-Match wird bei eingeloggtem Admin ignoriert
    resp_auth_match = api_client.get(url, HTTP_IF_NONE_MATCH=etag)
    assert resp_auth_match.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_provider_and_track_signals_trigger_invalidation(
    api_client: APIClient, sample_data: dict[str, Any]
) -> None:
    """Verifiziert, dass Änderungen an Provider und Track das Signal auslösen und den ETag ändern."""
    url = "/api/tracks/"
    resp1 = api_client.get(url)
    etag1 = resp1.headers["ETag"]

    # Track anlegen
    Track.objects.create(name="AI Engineering", slug="ai-eng", icon="brain")
    resp2 = api_client.get(url)
    etag2 = resp2.headers["ETag"]
    assert etag2 != etag1

    # Provider anlegen
    url_prov = "/api/providers/"
    resp_prov1 = api_client.get(url_prov)
    etag_prov1 = resp_prov1.headers["ETag"]

    Provider.objects.create(provider="Google Cloud", is_active=True)
    resp_prov2 = api_client.get(url_prov)
    etag_prov2 = resp_prov2.headers["ETag"]
    assert etag_prov2 != etag_prov1


@pytest.mark.django_db
def test_detail_view_etag_and_304(
    api_client: APIClient, sample_data: dict[str, Any]
) -> None:
    """Verifiziert das Caching auf Detail-Ebene (/api/projects/<id>/)."""
    project = sample_data["project"]
    url = f"/api/projects/{project.id}/"
    resp1 = api_client.get(url)
    assert resp1.status_code == status.HTTP_200_OK
    etag = resp1.headers["ETag"]
    assert f"project_{project.id}" in etag

    resp2 = api_client.get(url, HTTP_IF_NONE_MATCH=etag)
    assert resp2.status_code == status.HTTP_304_NOT_MODIFIED
    assert resp2.content == b""
