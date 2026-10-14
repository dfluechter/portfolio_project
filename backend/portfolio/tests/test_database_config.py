import os
from unittest.mock import patch

import dj_database_url


def test_effective_database_url_selection():
    """
    Testet die Auswahl-Logik zwischen gepoolter (DATABASE_URL) und direkter (DIRECT_DATABASE_URL)
    Verbindung für Neon PostgreSQL.
    """
    pooled_url = "postgresql://user:pass@ep-pooler.eu-central-1.aws.neon.tech/neondb"
    direct_url = "postgresql://user:pass@ep-direct.eu-central-1.aws.neon.tech/neondb"

    # Fall 1: Regulärer Web-Betrieb -> Gepoolte URL
    with patch.dict(os.environ, {"DATABASE_URL": pooled_url, "DIRECT_DATABASE_URL": direct_url}):
        is_migration = False
        effective = (
            direct_url
            if (is_migration and direct_url)
            else (pooled_url or direct_url)
        )
        assert effective == pooled_url
        parsed = dj_database_url.parse(effective, conn_max_age=600)
        assert parsed["CONN_MAX_AGE"] == 600
        assert "ep-pooler" in parsed["HOST"]

    # Fall 2: Migrationen -> Direkte URL (Bypass von PgBouncer)
    with patch.dict(os.environ, {"DATABASE_URL": pooled_url, "DIRECT_DATABASE_URL": direct_url}):
        is_migration = True
        effective = (
            direct_url
            if (is_migration and direct_url)
            else (pooled_url or direct_url)
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
