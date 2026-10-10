from .settings import *

SECRET_KEY = "django-insecure-test-secret-key-at-least-32-chars-long-for-jwt"

DEBUG = False

# Security Overrides für Tests (verhindert 301 HTTPS-Redirects im Testclient)
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

USE_SUPABASE_S3 = False

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "test_media"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
