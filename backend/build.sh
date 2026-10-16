#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

echo "==> Installiere Produktionsabhängigkeiten via uv..."
uv sync --frozen --no-dev

echo "==> Prüfe Django-Systemkonfiguration..."
uv run python manage.py check

echo "==> Sammle statische Dateien (WhiteNoise)..."
uv run python manage.py collectstatic --noinput

# Für Schema-Migrationen DIRECT_DATABASE_URL priorisieren (PgBouncer-Bypass)
if [ -n "${DIRECT_DATABASE_URL:-}" ]; then
    echo "==> Führe Migrationen mit direkter Neon-Verbindung (DIRECT_DATABASE_URL) aus..."
    RUNNING_MIGRATION=1 uv run python manage.py migrate --noinput
else
    echo "==> Führe Migrationen mit Standard-Verbindung aus..."
    uv run python manage.py migrate --noinput
fi
