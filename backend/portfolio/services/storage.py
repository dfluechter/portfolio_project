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

from portfolio.models import Certificate
from portfolio.services.extractor import safe_storage_key

logger = logging.getLogger(__name__)

CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


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

        file_content = ContentFile(file_bytes)
        ext = local_file.suffix.lower()
        file_content.content_type = CONTENT_TYPES.get(ext, "application/octet-stream")  # type: ignore[attr-defined]

        provider_slug = (
            slugify(cert.provider.provider) if cert.provider else "unsorted"
        )
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

    use_s3 = getattr(settings, "USE_SUPABASE_S3", False) or bool(
        os.getenv("AWS_S3_ENDPOINT_URL")
    )

    if use_s3:
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

