"""Datenmigration: FK track → M2M tracks, Placeholder-Hashes für leere sha256_hash."""

import hashlib

from django.db import migrations


def migrate_track_fk_to_m2m(apps, schema_editor):
    """Überträgt bestehende Certificate.track FK-Werte in die neue M2M-Relation."""
    Certificate = apps.get_model("portfolio", "Certificate")
    for cert in Certificate.objects.filter(track__isnull=False).iterator():
        cert.tracks.add(cert.track)


def generate_real_hashes(apps, schema_editor):
    """Berechnet echte SHA-256-Hashes für bestehende Zertifikate aus den PDF-Dateien.

    Falls eine Datei lokal fehlt (z.B. in der Entwicklungsumgebung),
    wird auf einen eindeutigen Dummy-Hash zurückgegriffen.
    """
    Certificate = apps.get_model("portfolio", "Certificate")
    for cert in Certificate.objects.filter(sha256_hash="").iterator():
        file_hashed = False
        if bool(cert.pdf_file) and cert.pdf_file.name:
            try:
                sha256 = hashlib.sha256()
                with cert.pdf_file.open("rb") as f:
                    # Django File objects might not have chunks() in all storage backends,
                    # but they do support read(). For safety with large files:
                    for chunk in (
                        f.chunks()
                        if hasattr(f, "chunks")
                        else iter(lambda: f.read(4096), b"")
                    ):
                        sha256.update(chunk)
                cert.sha256_hash = sha256.hexdigest()
                file_hashed = True
            except Exception:  # noqa: BLE001, S110
                pass

        if not file_hashed:
            # Fallback für lokale Tests ohne die echte PDF-Datei
            raw = f"legacy-{cert.pk}-{cert.title}-{cert.provider_id}"
            cert.sha256_hash = hashlib.sha256(raw.encode()).hexdigest()

        cert.save(update_fields=["sha256_hash"])


def reverse_m2m_to_fk(apps, schema_editor):
    """Rückwärtsmigration: Erster M2M-Track → FK track."""
    Certificate = apps.get_model("portfolio", "Certificate")
    for cert in Certificate.objects.prefetch_related("tracks").all():
        first_track = cert.tracks.first()
        if first_track:
            cert.track = first_track
            cert.save(update_fields=["track"])


def reverse_placeholder_hashes(apps, schema_editor):
    """Rückwärtsmigration: Placeholder-Hashes auf '' zurücksetzen."""
    Certificate = apps.get_model("portfolio", "Certificate")
    Certificate.objects.filter(sha256_hash__startswith="").update(sha256_hash="")


class Migration(migrations.Migration):
    dependencies = [
        ("portfolio", "0007_add_certificate_tracks_m2m_and_pending_sha256"),
    ]

    operations = [
        migrations.RunPython(
            migrate_track_fk_to_m2m,
            reverse_code=reverse_m2m_to_fk,
        ),
        migrations.RunPython(
            generate_real_hashes,
            reverse_code=reverse_placeholder_hashes,
        ),
    ]
