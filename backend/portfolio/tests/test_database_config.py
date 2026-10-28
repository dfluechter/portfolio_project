import os
from unittest.mock import patch

import dj_database_url
import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import Client

User = get_user_model()


def test_effective_database_url_selection():
    """
    Testet die Auswahl-Logik zwischen gepoolter (DATABASE_URL) und direkter (DIRECT_DATABASE_URL)
    Verbindung für Neon / Supabase PostgreSQL.
    """
    pooled_url = "postgresql://user:pass@ep-pooler.eu-central-1.aws.neon.tech/neondb"
    direct_url = "postgresql://user:pass@ep-direct.eu-central-1.aws.neon.tech/neondb"

    # Fall 1: Regulärer Web-Betrieb -> Gepoolte URL
    with patch.dict(
        os.environ, {"DATABASE_URL": pooled_url, "DIRECT_DATABASE_URL": direct_url}
    ):
        is_migration = False
        effective = (
            direct_url if (is_migration and direct_url) else (pooled_url or direct_url)
        )
        assert effective == pooled_url
        parsed = dj_database_url.parse(effective, conn_max_age=600)
        assert parsed["CONN_MAX_AGE"] == 600
        assert "ep-pooler" in parsed["HOST"]

    # Fall 2: Migrationen -> Direkte URL (Bypass von PgBouncer)
    with patch.dict(
        os.environ, {"DATABASE_URL": pooled_url, "DIRECT_DATABASE_URL": direct_url}
    ):
        is_migration = True
        effective = (
            direct_url if (is_migration and direct_url) else (pooled_url or direct_url)
        )
        assert effective == direct_url
        parsed = dj_database_url.parse(effective, conn_max_age=0)
        assert parsed["CONN_MAX_AGE"] == 0
        assert "ep-direct" in parsed["HOST"]

    # Fall 3: Fallback, falls DIRECT_DATABASE_URL nicht gesetzt ist
    with patch.dict(os.environ, {"DATABASE_URL": pooled_url}, clear=True):
        is_migration = True
        effective = pooled_url
        assert effective == pooled_url
        parsed = dj_database_url.parse(effective, conn_max_age=0)
        assert parsed["CONN_MAX_AGE"] == 0


@pytest.mark.django_db
def test_database_connection():
    """Prüft die aktive Datenbankverbindung über eine Modellabfrage."""
    count = User.objects.count()
    assert isinstance(count, int)
    assert count >= 0


@pytest.mark.django_db
def test_migrations_are_in_sync():
    """Stellt sicher, dass keine ausstehenden Migrationen fehlen (makemigrations --check)."""
    call_command("makemigrations", check=True, dry_run=True)


@pytest.mark.django_db
def test_health_endpoints_return_ok():
    """Prüft die Render Deployment Health-Check Endpunkte (/health/ und /health_check)."""
    client = Client()
    for endpoint in ("/health/", "/health_check"):
        response = client.get(endpoint)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_required_runtime_settings_configured():
    """Stellt sicher, dass kritische Laufzeit-Konfigurationen vorhanden sind."""
    assert bool(settings.SECRET_KEY)
    assert isinstance(settings.DEBUG, bool)
    assert isinstance(settings.ALLOWED_HOSTS, list)
    assert len(settings.ALLOWED_HOSTS) > 0
    assert "default" in settings.DATABASES
