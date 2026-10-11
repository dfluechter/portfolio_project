#!/usr/bin/env bash
set -o errexit

# Falls Render im Root-Verzeichnis statt im Unterordner backend startet:
if [ -d "backend" ]; then
    echo "==> Monorepo Root erkannt: Wechsle in Verzeichnis backend/"
    cd backend
fi

bash build.sh
