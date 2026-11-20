#!/usr/bin/env bash
set -o errexit

# Sicherstellen, dass uv verfügbar ist (z. B. wenn Render im Root ohne uv gestartet wurde)
if ! command -v uv >/dev/null 2>&1 || ! uv --version >/dev/null 2>&1; then
    UV_INSTALL_VERSION="${UV_VERSION:-0.5.29}"
    echo "==> uv ist nicht im PATH verfügbar. Installiere Astral uv v${UV_INSTALL_VERSION}..."
    curl -LsSf "https://astral.sh/uv/${UV_INSTALL_VERSION}/install.sh" | sh
    export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
fi

# Falls Render im Root-Verzeichnis statt im Unterordner backend startet:
if [ -d "backend" ]; then
    echo "==> Monorepo Root erkannt: Wechsle in Verzeichnis backend/"
    cd backend
fi

bash build.sh
