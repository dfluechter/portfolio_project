#!/usr/bin/env bash
set -o errexit

poetry install --only main --no-root

poetry run python manage.py collectstatic --noinput

poetry run python manage.py migrate