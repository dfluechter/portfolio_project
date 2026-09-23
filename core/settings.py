import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# -----------------------------------------------------------------------------
# Core
# -----------------------------------------------------------------------------

SECRET_KEY = os.getenv("SECRET_KEY", "unsafe-dev-secret-key")

DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")


ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "localhost,127.0.0.1",
    ).split(",")
    if host.strip()
]

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CSRF_TRUSTED_ORIGINS",
        "http://localhost:8000,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]


# -----------------------------------------------------------------------------
# Applications
# -----------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "storages",
    "rest_framework",
    "djoser",
    "drf_spectacular",
    "portfolio",
]


# -----------------------------------------------------------------------------
# Middleware
# -----------------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"


# -----------------------------------------------------------------------------
# Database: lokal SQLite, Production Neon via DATABASE_URL
# -----------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.config(
            default="sqlite:///db.sqlite3",  # Fallback, falls DATABASE_URL leer ist
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True,
        )
    }
else:
    DATABASES = {
        "default": dj_database_url.config(
            default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
            conn_max_age=600,
            conn_health_checks=True,
        )
    }


# -----------------------------------------------------------------------------
# Password validation
# -----------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# -----------------------------------------------------------------------------
# Internationalization
# -----------------------------------------------------------------------------

LANGUAGE_CODE = "de-de"
TIME_ZONE = "Europe/Berlin"
USE_I18N = True
USE_TZ = True


# -----------------------------------------------------------------------------
# Static files: WhiteNoise
# -----------------------------------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]


# -----------------------------------------------------------------------------
# Media files: Supabase Storage via S3
# -----------------------------------------------------------------------------

# --- Supabase S3 / django-storages Konfiguration ---

USE_SUPABASE_S3 = os.getenv("USE_SUPABASE_S3", "False").lower() == "true"

if USE_SUPABASE_S3:
    # Steuert, ob der Supabase Bucket öffentlich oder privat ist
    AWS_S3_PUBLIC_BUCKET = os.getenv("AWS_S3_PUBLIC_BUCKET", "True").lower() == "true"
    SUPABASE_PUBLIC_MEDIA_URL = os.getenv("SUPABASE_PUBLIC_MEDIA_URL", "")

    custom_domain = None
    if AWS_S3_PUBLIC_BUCKET and SUPABASE_PUBLIC_MEDIA_URL:
        custom_domain = (
            SUPABASE_PUBLIC_MEDIA_URL.replace("https://", "")
            .replace("http://", "")
            .rstrip("/")
        )

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "access_key": os.getenv("AWS_ACCESS_KEY_ID"),
                "secret_key": os.getenv("AWS_SECRET_ACCESS_KEY"),
                "bucket_name": os.getenv("AWS_STORAGE_BUCKET_NAME", "portfolio-media"),
                "endpoint_url": os.getenv("AWS_S3_ENDPOINT_URL"),
                "region_name": os.getenv("AWS_S3_REGION_NAME", "eu-central-1"),
                "signature_version": "s3v4",
                "addressing_style": "path",  # Erforderlich für Supabase S3 Pfad-Struktur
                "custom_domain": custom_domain,
                "querystring_auth": not AWS_S3_PUBLIC_BUCKET,  # True = Signierte URLs, False = Direkt-URLs
                "file_overwrite": False,  # Verhindert ungewolltes Überschreiben von Dateien
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

    # Basis-URL für Medien-Dateien
    if SUPABASE_PUBLIC_MEDIA_URL:
        MEDIA_URL = SUPABASE_PUBLIC_MEDIA_URL.rstrip("/") + "/"
    else:
        MEDIA_URL = f"{os.getenv('AWS_S3_ENDPOINT_URL')}/{os.getenv('AWS_STORAGE_BUCKET_NAME', 'portfolio-media')}/"
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    MEDIA_ROOT = BASE_DIR / "media"
    MEDIA_URL = "/media/"


# -----------------------------------------------------------------------------
# Production Security
# -----------------------------------------------------------------------------

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    SECURE_SSL_REDIRECT = True

    SECURE_CONTENT_TYPE_NOSNIFF = True

    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = False


AUTH_USER_MODEL = "portfolio.User"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# -----------------------------------------------------------------------------
# Django REST Framework + Djoser (JWT-Auth)
# -----------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

DJOSER = {
    "LOGIN_FIELD": "email",
    "USER_CREATE_PASSWORD_RETYPE": True,
    "SERIALIZERS": {},
    "PERMISSIONS": {
        # Sperrt die öffentliche Registrierung neuer Konten über die API
        "user_create": ["rest_framework.permissions.IsAdminUser"],
        # Verhindert das Ändern der E-Mail-Adresse/des Usernames über die API
        "username_update": ["rest_framework.permissions.IsAdminUser"],
        # Verhindert das Löschen des Kontos über die API
        "user_delete": ["rest_framework.permissions.IsAdminUser"],
    },
}


# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]


CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]


# -----------------------------------------------------------------------------
# DRF Spectacular - OpenAPI/Swagger Documentation
# -----------------------------------------------------------------------------

SPECTACULAR_SETTINGS = {
    "TITLE": "Portfolio Backend API",
    "DESCRIPTION": "Django REST API für Portfolio-Management mit JWT Authentication",
    "VERSION": "1.0.0",
    "SERVE_PERMISSIONS": ["rest_framework.permissions.AllowAny"],
    "SERVERS": [
        {"url": "http://localhost:8000", "description": "Development"},
        {"url": "https://portfolio-backend.onrender.com", "description": "Production"},
    ],
    "CONTACT": {
        "name": "Dominik Flüchter",
        "url": "https://github.com/dfluechter",
        "email": "dominik.fluechter@googlemail.com",
    },
    "LICENSE": {
        "name": "MIT",
    },
    "SECURITY": [{"Bearer": []}],
    "SECURITY_DEFINITIONS": {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    },
}

# -----------------------------------------------------------------------------
# Email Configuration
# -----------------------------------------------------------------------------

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "webmaster@localhost")
