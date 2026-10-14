import logging
import os
from pathlib import Path

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
