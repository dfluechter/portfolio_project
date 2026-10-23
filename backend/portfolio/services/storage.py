import hashlib
import logging
import os
import uuid
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils.text import slugify

from portfolio.models import MAGIC_BYTE_SIGNATURES, Certificate
from portfolio.services.extractor import safe_storage_key

logger = logging.getLogger(__name__)

CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


def build_typed_content_file(data: bytes, suffix: str) -> ContentFile:
    """Erzeugt ein ContentFile mit gesetztem content_type basierend auf der Dateiendung."""
    content_file = ContentFile(data)
    content_file.content_type = CONTENT_TYPES.get(  # type: ignore[attr-defined]
        suffix.lower(), "application/octet-stream"
    )
    return content_file


def _is_s3_configured(*, allow_endpoint_fallback: bool = False) -> bool:
    """Prüft, ob S3-Storage über Django-Settings oder Umgebungsvariablen aktiv ist."""
    if bool(getattr(settings, "USE_SUPABASE_S3", False)):
        return True
    if allow_endpoint_fallback and bool(os.getenv("AWS_S3_ENDPOINT_URL")):
        return True
    env_use_s3 = os.getenv("USE_SUPABASE_S3", "").lower()
    return env_use_s3 in ("true", "1")


def find_local_certificate_file(cert: Certificate) -> Path | None:
    """Sucht strikt lesend nach der Quelldatei eines Zertifikats im CERTIFICATES_PATH.

    WICHTIGE SCHUTZREGEL: CERTIFICATES_PATH ist strikt READ-ONLY.
    Quelldateien werden ausschließlich lesend geöffnet und niemals geändert oder gelöscht.
    """
    cert_path_env = os.getenv("CERTIFICATES_PATH")
    if not cert_path_env:
        return None

    base_path = Path(cert_path_env)
    if not base_path.exists() or not base_path.is_dir():
        return None

    target_filename = (
        Path(cert.pdf_file.name).name.lower()
        if (cert.pdf_file and cert.pdf_file.name)
        else ""
    )

    # 1. Direkte Suche im Provider-Unterordner
    if cert.provider and cert.provider.provider:
        prov_name = cert.provider.provider
        prov_dir = base_path / prov_name
        if not prov_dir.exists():
            for d in base_path.iterdir():
                if d.is_dir() and d.name.lower() == prov_name.lower():
                    prov_dir = d
                    break

        if prov_dir.exists() and prov_dir.is_dir():
            for f in prov_dir.iterdir():
                if f.is_file():
                    if target_filename and f.name.lower() == target_filename:
                        return f
                    if cert.title and f.stem.lower() == cert.title.lower():
                        return f

    # 2. Rekursive Suche im gesamten CERTIFICATES_PATH
    for root, _dirs, files in os.walk(base_path):
        for f_name in files:
            f_path = Path(root) / f_name
            if target_filename and f_name.lower() == target_filename:
                return f_path
            if cert.title and Path(f_name).stem.lower() == cert.title.lower():
                return f_path

    return None


def ensure_certificate_in_storage(cert: Certificate) -> bool:
    """Stellt sicher, dass das Zertifikat im S3-Storage abgelegt ist.

    Wird aufgerufen, wenn ein Entwurfs-Zertifikat veröffentlicht wird.
    Falls die Datei noch nicht im S3-Storage vorhanden ist, wird sie lesend
    aus CERTIFICATES_PATH geholt und in den Storage hochgeladen.

    WICHTIGE SCHUTZREGEL: CERTIFICATES_PATH ist strikt READ-ONLY.
    """
    # 1. Prüfen, ob die Datei bereits im Default-Storage (S3) existiert
    if cert.pdf_file and cert.pdf_file.name:
        try:
            if default_storage.exists(cert.pdf_file.name):
                logger.info(
                    "Zertifikat %s (#%s) existiert bereits in S3: %s",
                    cert.title,
                    cert.pk,
                    cert.pdf_file.name,
                )
                return True
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Fehler beim Prüfen von S3 für %s: %s", cert.pdf_file.name, exc
            )

    # 2. Datei aus CERTIFICATES_PATH suchen und nach S3 übertragen
    local_file = find_local_certificate_file(cert)
    if not local_file or not local_file.exists():
        logger.warning(
            "Keine lokale Quelldatei für Zertifikat %s (#%s) in CERTIFICATES_PATH gefunden.",
            cert.title,
            cert.pk,
        )
        return False

    try:
        with open(local_file, "rb") as f:
            file_bytes = f.read()

        file_content = build_typed_content_file(file_bytes, local_file.suffix)

        provider_slug = slugify(cert.provider.provider) if cert.provider else "unsorted"
        storage_key = safe_storage_key(
            provider_slug, cert.sha256_hash or "nohash", local_file.name
        )
        safe_name = storage_key.split("/")[-1]

        cert.pdf_file.save(safe_name, file_content, save=False)
        cert.storage_key = storage_key
        logger.info(
            "Zertifikat %s (#%s) erfolgreich aus %s in S3 abgelegt.",
            cert.title,
            cert.pk,
            local_file.name,
        )
        return True
    except Exception as exc:
        logger.error(
            "Fehler beim S3-Upload für Zertifikat %s (#%s): %s",
            cert.title,
            cert.pk,
            exc,
        )
        raise


def get_s3_client():
    """Erzeugt einen boto3 S3-Client mit den konfigurierten Supabase-S3-Parametern."""
    endpoint_url = os.getenv("AWS_S3_ENDPOINT_URL")
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    region_name = os.getenv("AWS_S3_REGION_NAME", "eu-central-1")

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region_name,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def generate_presigned_upload(
    filename: str, content_type: str | None = None
) -> dict[str, Any]:
    """Erzeugt eine signierte S3-Upload-URL (PUT) für Direct-to-Storage-Uploads.

    Validiert die Dateiendung und erzeugt einen sicheren storage_key im Upload-Verzeichnis.
    Im lokalen/Test-Modus (ohne konfiguriertes Supabase S3) wird eine lokalisierte Mock-URL geliefert.
    """
    ext = Path(filename).suffix.lower()
    if ext not in CONTENT_TYPES:
        allowed = ", ".join(CONTENT_TYPES.keys())
        raise ValueError(
            f"Nicht unterstützter Dateityp '{ext}'. Erlaubte Dateitypen: {allowed}."
        )

    clean_stem = slugify(Path(filename).stem) or "cert"
    storage_key = f"certificates/uploads/{uuid.uuid4().hex[:12]}_{clean_stem}{ext}"
    final_content_type = content_type or CONTENT_TYPES[ext]
    bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME", "portfolio-media")

    if _is_s3_configured(allow_endpoint_fallback=True):
        try:
            s3_client = get_s3_client()
            url = s3_client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": bucket_name,
                    "Key": storage_key,
                    "ContentType": final_content_type,
                },
                ExpiresIn=3600,
            )
        except Exception as exc:
            logger.error("Fehler beim Erzeugen der Presigned S3-URL: %s", exc)
            raise
    else:
        # Lokaler Fallback / Testumgebung
        url = f"http://localhost:8000/media/{storage_key}"

    return {
        "url": url,
        "storage_key": storage_key,
        "method": "PUT",
        "headers": {
            "Content-Type": final_content_type,
        },
    }


class S3StorageNotConfiguredError(Exception):
    """Wird ausgelöst, wenn Direct-to-Storage-Uploads bei deaktiviertem S3 angefordert werden."""


MAX_DIRECT_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def verify_s3_uploaded_certificate(
    storage_key: str, client_hash: str | None = None
) -> str:
    """Verifiziert ein per Direct-to-Storage hochgeladenes S3-Objekt serverseitig (US 10.2).

    1. Prüft, ob S3-Storage aktiv ist (sonst S3StorageNotConfiguredError -> HTTP 501).
    2. Prüft Existenz und Maximalgröße (<= 10 MB) via head_object.
    3. Liest die ersten 2048 Bytes per Range-Request ('bytes=0-2047') und validiert Magic Bytes.
    4. Berechnet den serverseitigen SHA-256-Hash und gleicht ihn gegen einen optionalen client_hash ab.
    """
    if not _is_s3_configured():
        raise S3StorageNotConfiguredError(
            "Direct-to-Storage-Uploads erfordern eine aktive S3-Konfiguration (USE_SUPABASE_S3=True)."
        )

    ext = Path(storage_key).suffix.lower()
    if ext not in MAGIC_BYTE_SIGNATURES:
        allowed = ", ".join(MAGIC_BYTE_SIGNATURES.keys())
        raise ValueError(f"Ungültiges Dateiformat '{ext}'. Erlaubt sind nur: {allowed}")

    bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME", "portfolio-media")
    s3_client = get_s3_client()

    # 1. Existenz- und Größenprüfung via head_object
    try:
        head_resp = s3_client.head_object(Bucket=bucket_name, Key=storage_key)
    except Exception as exc:
        logger.warning(
            "S3 head_object fehlgeschlagen für storage_key='%s': %s", storage_key, exc
        )
        raise ValueError(
            "Das angegebene S3-Objekt wurde im Storage-Bucket nicht gefunden."
        ) from exc

    content_length = int(head_resp.get("ContentLength", 0))
    if content_length <= 0:
        raise ValueError("Das hochgeladene S3-Objekt ist leer.")
    if content_length > MAX_DIRECT_UPLOAD_SIZE_BYTES:
        raise ValueError(
            "Die Datei im S3-Storage ist zu groß! Maximal erlaubt sind 10 MB."
        )

    # 2. Magic-Byte-Validierung via Range-Request (erste 2048 Bytes)
    try:
        range_resp = s3_client.get_object(
            Bucket=bucket_name, Key=storage_key, Range="bytes=0-2047"
        )
        header_bytes = range_resp["Body"].read(2048)
    except Exception as exc:
        logger.warning(
            "S3 Range-Request fehlgeschlagen für storage_key='%s': %s", storage_key, exc
        )
        raise ValueError(
            "Header-Bytes des S3-Objekts konnten nicht gelesen werden."
        ) from exc

    expected_signatures = MAGIC_BYTE_SIGNATURES[ext]
    if not header_bytes or not any(
        header_bytes.startswith(sig) for sig in expected_signatures
    ):
        raise ValueError(
            f"MIME-Type-Spoofing erkannt! Der Dateiinhalt im S3-Storage passt nicht zur Dateiendung '{ext}'."
        )

    # 3. Serverseitige SHA-256 Integritätsprüfung
    try:
        obj_resp = s3_client.get_object(Bucket=bucket_name, Key=storage_key)
        body = obj_resp["Body"]
        sha256 = hashlib.sha256()
        while True:
            chunk = body.read(65536)
            if not chunk:
                break
            sha256.update(chunk)
        computed_hash = sha256.hexdigest()
    except Exception as exc:
        logger.warning(
            "Fehler beim Berechnen des SHA-256-Hashes für S3-Objekt '%s': %s",
            storage_key,
            exc,
        )
        raise ValueError(
            "Integritätsprüfung (SHA-256) des S3-Objekts fehlgeschlagen."
        ) from exc

    if client_hash and client_hash.strip().lower() != computed_hash.lower():
        raise ValueError(
            "SHA-256-Integritätsfehler: Der übermittelte Hash stimmt nicht mit dem S3-Objekt überein."
        )

    return computed_hash


def list_s3_certificate_objects(
    prefix: str = "certificates/",
) -> list[dict[str, Any]]:
    """Listet alle Objekte im S3-Bucket unter dem angegebenen Prefix auf.

    Gibt eine Liste von Dicts mit 'storage_key', 'size' und 'last_modified' zurück.
    """
    if not _is_s3_configured(allow_endpoint_fallback=True):
        return []

    bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME", "portfolio-media")
    s3_client = get_s3_client()
    paginator = s3_client.get_paginator("list_objects_v2")

    objects: list[dict[str, Any]] = []
    try:
        for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
            for item in page.get("Contents", []):
                objects.append(
                    {
                        "storage_key": item["Key"],
                        "size": item["Size"],
                        "last_modified": item["LastModified"],
                    }
                )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Fehler beim Auflisten der S3-Objekte unter Prefix '%s': %s", prefix, exc
        )
    return objects


def delete_s3_object(storage_key: str) -> bool:
    """Löscht ein Objekt aus dem S3-Storage. Gibt True bei Erfolg zurück."""
    if not _is_s3_configured(allow_endpoint_fallback=True):
        return False

    bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME", "portfolio-media")
    s3_client = get_s3_client()
    try:
        s3_client.delete_object(Bucket=bucket_name, Key=storage_key)
        logger.info("S3-Objekt gelöscht: %s", storage_key)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Fehler beim Löschen des S3-Objekts '%s': %s", storage_key, exc)
        return False


def check_s3_object_exists(storage_key: str) -> bool:
    """Prüft via head_object, ob ein Objekt im S3-Storage existiert."""
    if not _is_s3_configured(allow_endpoint_fallback=True):
        return False

    bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME", "portfolio-media")
    s3_client = get_s3_client()
    try:
        s3_client.head_object(Bucket=bucket_name, Key=storage_key)
        return True
    except Exception:  # noqa: BLE001
        return False


def compute_s3_object_hash(storage_key: str) -> str | None:
    """Berechnet den SHA-256-Hash eines Objekts im S3-Storage."""
    if not _is_s3_configured(allow_endpoint_fallback=True):
        return None

    bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME", "portfolio-media")
    s3_client = get_s3_client()
    try:
        resp = s3_client.get_object(Bucket=bucket_name, Key=storage_key)
        sha256 = hashlib.sha256()
        body = resp["Body"]
        while True:
            chunk = body.read(65536)
            if not chunk:
                break
            sha256.update(chunk)
        return sha256.hexdigest()
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Fehler beim Berechnen des Hashs für S3-Objekt '%s': %s", storage_key, exc
        )
        return None
