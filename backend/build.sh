#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

# Sicherstellen, dass uv verfügbar und lauffähig ist
if ! command -v uv >/dev/null 2>&1 || ! uv --version >/dev/null 2>&1; then
    echo "==> uv ist nicht im PATH verfügbar. Installiere Astral uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
fi

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

echo "==> Synchronisiere RAG Knowledge Chunks (Initial- & Delta-Indizierung)..."
uv run python manage.py index_rag_chunks

