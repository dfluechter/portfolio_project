import logging
import os
from pathlib import Path
from typing import Any

from django.db import transaction
from django.utils.text import slugify

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
from portfolio.services.storage import (
    build_typed_content_file,
)

logger = logging.getLogger(__name__)


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

    file_content = build_typed_content_file(file_bytes, file_path.suffix)

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
        raise PromotionError(
            f"Upload der Dateikopie zu Storage fehlgeschlagen: {exc}"
        ) from exc

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
            if saved_storage_name:
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


def promote_pending_certificates_bulk(
    pending_ids: list[int],
    track_ids: list[int] | None = None,
) -> list[Certificate]:
    """
    Überträgt mehrere PendingCertificates atomar in echte Certificates (Alles oder nichts).

    - Läuft vollständig in transaction.atomic().
    - Nur IDs mit Status 'pending' sind zulässig. Nicht existierende IDs oder
      IDs, die nicht 'pending' sind -> PromotionError (Batch wird abgelehnt).
    - Track-Pflicht (Epic 12): Vorab für alle Items prüfen, ob nach Auflösung von
      track_ids (Request) bzw. suggested_tracks (Fallback) jedes Item mindestens einen Track hat.
      Falls ein Item keinen Track hat -> PromotionError mit Nennung von Dateiname und ID.
    - Falls bei irgendeinem Item ein Fehler auftritt: Rollback der gesamten Transaktion
      und saubere Kompensationslöschung ALLER in diesem Batch bereits in den Storage hochgeladenen Dateien.
    """
    if not pending_ids:
        return []

    if len(set(pending_ids)) != len(pending_ids):
        raise PromotionError("Doppelte IDs in der Anfrage sind nicht zulässig.")

    # 1. Datensätze laden und Existenz prüfen
    pending_items = list(
        PendingCertificate.objects.filter(id__in=pending_ids).prefetch_related(
            "suggested_tracks"
        )
    )
    found_map = {p.id: p for p in pending_items}

    for pid in pending_ids:
        if pid not in found_map:
            raise PromotionError(f"Datensatz mit ID {pid} nicht gefunden.")

    ordered_items = [found_map[pid] for pid in pending_ids]

    # 2. Status prüfen: Alle müssen 'pending' sein
    for item in ordered_items:
        if item.status != PendingCertificateStatus.PENDING:
            raise PromotionError(
                f"Datensatz '{item.original_file_name}' (ID: {item.id}) hat Status '{item.status}', "
                "nur 'pending' kann genehmigt werden."
            )

    # 3. Explizite Tracks validieren und auflösen
    explicit_tracks: list[Track] | None = None
    if track_ids is not None:
        track_map = Track.objects.in_bulk(track_ids)
        for tid in track_ids:
            if tid not in track_map:
                raise PromotionError(f"Track {tid} nicht gefunden.")
        explicit_tracks = [track_map[tid] for tid in track_ids]

    # 4. Track-Pflicht (Epic 12) vorab für ALLE Items prüfen!
    for item in ordered_items:
        effective_tracks = (
            explicit_tracks
            if explicit_tracks is not None
            else list(item.suggested_tracks.all())
        )
        if not effective_tracks:
            raise PromotionError(
                f"Zertifikat '{item.original_file_name}' (ID: {item.id}) hat keine zugeordneten Tracks. "
                "Mindestens ein Track ist erforderlich."
            )

    # 5. Atomare Durchführung mit Storage-Kompensation
    uploaded_storage_files: list[tuple[Any, str]] = []
    promoted_certs: list[Certificate] = []

    try:
        with transaction.atomic():
            for item in ordered_items:
                tracks_to_assign = (
                    explicit_tracks
                    if explicit_tracks is not None
                    else list(item.suggested_tracks.all())
                )
                cert = promote_pending_certificate(
                    pending=item,
                    tracks=tracks_to_assign,
                )
                # Pending-Verknüpfung für Response-Zwecke im Speicher setzen
                cert._pending_id = item.id  # type: ignore[attr-defined]
                cert.source_pending = item  # type: ignore[attr-defined]
                if cert.pdf_file and cert.pdf_file.name:
                    uploaded_storage_files.append(
                        (cert.pdf_file.storage, cert.pdf_file.name)
                    )
                promoted_certs.append(cert)
    except Exception:
        # Bei jeglichem Fehler im Batch: Kompensationslöschung ALLER bereits hochgeladenen Dateien!
        for storage, file_name in uploaded_storage_files:
            try:
                storage.delete(file_name)
                logger.info(
                    "Batch-Kompensationslöschung in Storage erfolgreich für: %s",
                    file_name,
                )
            except Exception as del_exc:  # noqa: BLE001
                logger.warning(
                    "Batch-Kompensationslöschung in Storage fehlgeschlagen für %s: %s",
                    file_name,
                    del_exc,
                )
        raise

    return promoted_certs


def reject_pending_certificates_bulk(pending_ids: list[int]) -> int:
    """
    Lehnt mehrere PendingCertificates atomar ab.

    - Läuft vollständig in transaction.atomic().
    - Nur IDs mit Status 'pending' sind zulässig.
    - Nicht existierende IDs oder IDs, die nicht 'pending' sind -> PromotionError.
    - Bei Fehler wird kein Datensatz geändert (atomar).
    """
    if not pending_ids:
        return 0

    if len(set(pending_ids)) != len(pending_ids):
        raise PromotionError("Doppelte IDs in der Anfrage sind nicht zulässig.")

    with transaction.atomic():
        pending_items = list(
            PendingCertificate.objects.select_for_update().filter(id__in=pending_ids)
        )
        found_map = {p.id: p for p in pending_items}

        for pid in pending_ids:
            if pid not in found_map:
                raise PromotionError(f"Datensatz mit ID {pid} nicht gefunden.")

        ordered_items = [found_map[pid] for pid in pending_ids]

        for item in ordered_items:
            if item.status != PendingCertificateStatus.PENDING:
                raise PromotionError(
                    f"Datensatz '{item.original_file_name}' (ID: {item.id}) hat Status '{item.status}', "
                    "nur 'pending' kann abgelehnt werden."
                )

        for item in ordered_items:
            reject_pending_certificate(item)

        return len(ordered_items)
