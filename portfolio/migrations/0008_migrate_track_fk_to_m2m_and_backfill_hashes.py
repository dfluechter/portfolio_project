"""Datenmigration: FK track → M2M tracks, Placeholder-Hashes für leere sha256_hash."""

import hashlib

from django.db import migrations


def migrate_track_fk_to_m2m(apps, schema_editor):
    """Überträgt bestehende Certificate.track FK-Werte in die neue M2M-Relation."""
    Certificate = apps.get_model("portfolio", "Certificate")
    for cert in Certificate.objects.filter(track__isnull=False).iterator():
        cert.tracks.add(cert.track)


def generate_placeholder_hashes(apps, schema_editor):
    """Generiert deterministische Placeholder-Hashes für Zertifikate ohne sha256_hash.

    Format: SHA-256 von 'legacy-{pk}-{title}-{provider_id}'.
    Diese Placeholder werden beim nächsten sync_certificates durch echte
    Datei-Hashes ersetzt.
    """
    Certificate = apps.get_model("portfolio", "Certificate")
    for cert in Certificate.objects.filter(sha256_hash="").iterator():
        raw = f"legacy-{cert.pk}-{cert.title}-{cert.provider_id}"
        cert.sha256_hash = hashlib.sha256(raw.encode()).hexdigest()
        cert.save(update_fields=["sha256_hash"])


def reverse_m2m_to_fk(apps, schema_editor):
    """Rückwärtsmigration: Erster M2M-Track → FK track."""
    Certificate = apps.get_model("portfolio", "Certificate")
    for cert in Certificate.objects.prefetch_related("tracks").iterator():
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
            generate_placeholder_hashes,
            reverse_code=reverse_placeholder_hashes,
        ),
    ]
