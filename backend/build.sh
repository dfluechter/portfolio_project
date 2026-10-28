#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Render Production Build & Deployment Script
# Führt Dependency-Installation, Django-Checks, Collectstatic,
# Datenbank-Migrationen und RAG-Initialisierung mit strukturiertem Error-Handling aus.
# ==============================================================================

log_info() {
    echo -e "\n\033[1;34m==>\033[0m \033[1m$1\033[0m"
}

log_success() {
    echo -e "\033[1;32m✓\033[0m $1"
}

log_error() {
    echo -e "\033[1;31m✖ FEHLER:\033[0m $1" >&2
}

# Trap für unerwartete Fehler-Abbrüche
trap 'log_error "build.sh ist unerwartet in Zeile $LINENO mit Exit-Code $? abgebrochen."' ERR

# 1. Sicherstellen, dass uv verfügbar und lauffähig ist
if ! command -v uv >/dev/null 2>&1 || ! uv --version >/dev/null 2>&1; then
    log_info "uv ist nicht im PATH verfügbar. Installiere Astral uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh || {
        log_error "Installation von Astral uv fehlgeschlagen!"
        exit 1
    }
    export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
fi
log_success "uv Version: $(uv --version)"

# 1b. Sicherstellen, dass Node.js (>= 20.19.0 bzw. >= 22.12.0 für Vite 8 / Rolldown) und npm verfügbar sind
node_is_compatible() {
    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        return 1
    fi
    node -e '
        const [maj, min] = process.versions.node.split(".").map(Number);
        const ok = (maj === 20 && min >= 19) || (maj === 22 && min >= 12) || (maj > 22);
        process.exit(ok ? 0 : 1);
    ' >/dev/null 2>&1
}

if ! node_is_compatible; then
    CURRENT_NODE="$(command -v node >/dev/null 2>&1 && node --version || echo 'nicht installiert')"
    NODE_VERSION="22.14.0"
    log_info "Node.js fehlt oder ist inkompatibel (${CURRENT_NODE}; benötigt ^20.19.0 || >=22.12.0). Installiere Node.js LTS (v${NODE_VERSION})..."
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64) NODE_ARCH="x64" ;;
        aarch64|arm64) NODE_ARCH="arm64" ;;
        *) NODE_ARCH="x64" ;;
    esac
    rm -rf "$HOME/.local/node"
    mkdir -p "$HOME/.local/node"
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.gz" | tar -xz --strip-components=1 -C "$HOME/.local/node" || {
        log_error "Installation von Node.js v${NODE_VERSION} fehlgeschlagen!"
        exit 1
    }
    export PATH="$HOME/.local/node/bin:$PATH"
    hash -r 2>/dev/null || true
fi
log_success "Node.js Version: $(node --version), npm Version: $(npm --version)"

# 2. Produktionsabhängigkeiten via uv installieren
log_info "Installiere Produktionsabhängigkeiten via uv..."
if ! uv sync --frozen --no-dev; then
    log_error "'uv sync --frozen --no-dev' fehlgeschlagen! Bitte uv.lock und pyproject.toml prüfen."
    exit 1
fi
log_success "Produktionsabhängigkeiten erfolgreich synchronisiert."

# 3. Django System-Checks durchführen
log_info "Prüfe Django-Systemkonfiguration (manage.py check)..."
if ! uv run python manage.py check; then
    log_error "Django System-Check fehlgeschlagen! Bitte Settings, Apps und Umgebungsvariablen prüfen."
    exit 1
fi
log_success "Django System-Check erfolgreich bestanden."

# 3b. React Frontend kompilieren (für integrierte Single-Domain SPA Auslieferung auf https://dfluechter.ipv64.de)
if [ -d "../frontend" ]; then
    log_info "Kompiliere React Frontend (npm run build)..."
    (cd ../frontend && npm ci --include=optional --legacy-peer-deps && npm run build) || {
        log_error "React Frontend-Build fehlgeschlagen! Bitte frontend Dependencies und Build-Skript prüfen."
        exit 1
    }
    log_success "React Frontend erfolgreich kompiliert (frontend/dist/index.html bereitgestellt)."
else
    log_error "Verzeichnis ../frontend wurde nicht gefunden!"
    exit 1
fi

# 4. Statische Dateien kompilieren (WhiteNoise)
log_info "Sammle statische Dateien (WhiteNoise collectstatic)..."
if ! uv run python manage.py collectstatic --noinput; then
    log_error "Kompilierung der statischen Dateien ('collectstatic') fehlgeschlagen!"
    log_error "Mögliche Ursachen: Fehlendes STATIC_ROOT, ungültige Dateiberechtigungen oder Syntaxfehler im Manifest-Speicher."
    exit 1
fi
log_success "Statische Dateien erfolgreich gesammelt."

# 5. Datenbank-Migrationen ausführen
# Für Schema-Migrationen DIRECT_DATABASE_URL priorisieren (PgBouncer Transaction-Bypass)
if [ -n "${DIRECT_DATABASE_URL:-}" ]; then
    log_info "Führe Migrationen mit direkter Neon-Verbindung (DIRECT_DATABASE_URL) aus..."
    if ! RUNNING_MIGRATION=1 uv run python manage.py migrate --noinput; then
        log_error "Datenbank-Migration via DIRECT_DATABASE_URL fehlgeschlagen!"
        log_error "Mögliche Ursachen: Unerreichbare Direct-PostgreSQL-Instanz, ungültige Zugangsdaten oder blockierende Sperren."
        exit 1
    fi
else
    log_info "Führe Migrationen mit Standard-Verbindung (DATABASE_URL) aus..."
    if ! uv run python manage.py migrate --noinput; then
        log_error "Datenbank-Migration via Standard-Datenbankverbindung fehlgeschlagen!"
        log_error "Mögliche Ursachen: DATABASE_URL nicht erreichbar oder blockierende PgBouncer-Transaktionssperren."
        exit 1
    fi
fi
log_success "Datenbank-Migrationen erfolgreich abgeschlossen."

# 6. Synchronisiere RAG Knowledge Chunks
log_info "Synchronisiere RAG Knowledge Chunks (Initial- & Delta-Indizierung)..."
if ! uv run python manage.py index_rag_chunks; then
    log_error "RAG Chunk-Indizierung ('index_rag_chunks') fehlgeschlagen!"
    log_error "Deployment wird fortgesetzt, KI-Copilot-Chunks sollten jedoch nach dem Start manuell reindiziert werden."
else
    log_success "RAG Knowledge Chunks erfolgreich synchronisiert."
fi

log_success "Backend-Build erfolgreich abgeschlossen! Bereit für Gunicorn-Start."
