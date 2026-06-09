#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installiere Abhängigkeiten..."
pip install -r requirements.txt

echo "Sammle statische Dateien..."
python manage.py collectstatic --no-input

echo "Führe Datenbank-Migrationen aus..."
python manage.py migrate