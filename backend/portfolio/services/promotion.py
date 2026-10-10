import logging
import os
from pathlib import Path

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils.text import slugify

logger = logging.getLogger(__name__)

from portfolio.models import (
    Certificate,
    PendingCertificate,
    PendingCertificateStatus,
    Provider,
    Track,
)
from portfolio.services.extractor import (
    compute_file_hash,
    safe_storage_key,
)

CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


class PromotionError(Exception):
    """Wird ausgelöst, wenn die Freigabe eines ausstehenden Zertifikats fehlschlägt."""


def promote_pending_certificate(
    pending: PendingCertificate,
    title: str | None = None,
    provider_name: str | None = None,
    tracks: list[Track] | None = None,
) -> Certificate:
    """
    Überträgt ein PendingCertificate in ein echtes Certificate.

    - Prüft den Status (nur PENDING erlaubt).
    - Liest die Originaldatei strikt lesend aus pending.file_path.
    - Berechnet SHA-256 Hash und verhindert Duplikate.
    - Speichert die Datei über Django Storage (Supabase S3 / local).
    - Verknüpft Provider und Tracks (M2M).
    - Markiert das Zertifikat als unveröffentlicht (is_published=False).
    - Aktualisiert pending.status auf APPROVED und verknüpft pending.certificate.
    """
    if pending.status != PendingCertificateStatus.PENDING:
        raise PromotionError("Zertifikat wurde bereits verarbeitet.")

    file_path = Path(pending.file_path)
    if not file_path.exists() or not file_path.is_file():
        raise PromotionError(
            f"Quelldatei existiert nicht mehr lokal: {pending.file_path}"
        )

    if file_path.is_symlink():
        raise PromotionError("Quelldatei ist ein Symlink - Freigabe abgelehnt.")

    # Titel und Provider ermitteln
    final_title = (
        title
        or pending.guessed_title
        or os.path.splitext(pending.original_file_name)[0]
    ).strip()
    final_provider_name = (
        provider_name or pending.guessed_provider or "Unbekannt"
    ).strip()

    if not final_title:
        raise PromotionError("Ein Titel für das Zertifikat ist erforderlich.")
    if not final_provider_name:
        raise PromotionError("Ein Anbieter für das Zertifikat ist erforderlich.")

    # SHA-256 berechnen und Duplikat prüfen
    try:
        file_hash = compute_file_hash(file_path)
    except Exception as exc:
        raise PromotionError(
            f"Hash-Berechnung der Quelldatei fehlgeschlagen: {exc}"
        ) from exc

    if Certificate.objects.filter(sha256_hash=file_hash).exists():
        raise PromotionError(
            "Ein Zertifikat mit identischem Dateiinhalt (SHA-256) existiert bereits."
        )

    # Provider laden oder anlegen
    provider_obj, _ = Provider.objects.get_or_create(
        provider=final_provider_name, defaults={"aktiv": True}
    )

    # Tracks ermitteln (übergebene Liste oder vorgeschlagene Tracks)
    if tracks is not None:
        final_tracks = tracks
    else:
        final_tracks = list(pending.suggested_tracks.all())

    provider_slug = slugify(final_provider_name) or "unsorted"
    storage_key = safe_storage_key(provider_slug, file_hash, pending.original_file_name)

    # Datei binär lesen (strikter Read-Only-Zugriff)
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
    except Exception as exc:
        raise PromotionError(f"Quelldatei konnte nicht gelesen werden: {exc}") from exc

    file_content = ContentFile(file_bytes)
    ext = file_path.suffix.lower()
    file_content.content_type = CONTENT_TYPES.get(  # type: ignore[attr-defined]
        ext, "application/octet-stream"
    )

    cert = Certificate(
        title=final_title,
        provider=provider_obj,
        sha256_hash=file_hash,
        is_published=False,
        storage_key=storage_key,
    )

    safe_name = storage_key.split("/")[-1]

    # 1. Storage-Upload zuerst (Dateikopie nach Supabase Storage)
    try:
        cert.pdf_file.save(safe_name, file_content, save=False)
    except Exception as exc:
        raise PromotionError(f"Upload der Dateikopie zu Storage fehlgeschlagen: {exc}") from exc

    saved_storage_name = cert.pdf_file.name

    # 2. Atomare Datenbanktransaktion nach Neon (PostgreSQL)
    try:
        with transaction.atomic():
            cert.save()
            if final_tracks:
                cert.tracks.set(final_tracks)

            # Pending-Datensatz aktualisieren
            pending.certificate = cert
            pending.status = PendingCertificateStatus.APPROVED
            pending.save(update_fields=["certificate", "status"])
    except Exception as db_exc:
        # 3. Clean Compensation: Falls DB-Schreiben fehlschlägt, Datei aus Storage löschen
        try:
            cert.pdf_file.storage.delete(saved_storage_name)
            logger.info(
                "Kompensationslöschung in Storage erfolgreich für: %s",
                saved_storage_name,
            )
        except Exception as delete_exc:  # noqa: BLE001
            logger.warning(
                "Kompensationslöschung in Storage fehlgeschlagen für %s: %s",
                saved_storage_name,
                delete_exc,
            )
        raise PromotionError(
            f"Datenbanktransaktion für Zertifikat fehlgeschlagen: {db_exc}"
        ) from db_exc

    return cert


def reject_pending_certificate(pending: PendingCertificate) -> None:
    """Lehnt ein ausstehendes Zertifikat ab."""
    if pending.status != PendingCertificateStatus.PENDING:
        raise PromotionError("Zertifikat wurde bereits verarbeitet.")
    pending.status = PendingCertificateStatus.REJECTED
    pending.save(update_fields=["status"])
