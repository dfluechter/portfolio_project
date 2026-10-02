"""Tests für den idempotenten Zertifikatsimport (Phase 1 – Datenmodell)."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError

from portfolio.models import Certificate, Provider, Track


@pytest.mark.django_db
class TestCertificateSHA256Uniqueness:
    """Prüft, dass sha256_hash echte Duplikaterkennung ermöglicht."""

    def _make_cert(self, provider, sha256_hash, title="Test Cert"):
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"Dummy content",
            content_type="application/pdf",
        )
        return Certificate.objects.create(
            title=title,
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash=sha256_hash,
        )

    def test_unique_constraint_prevents_duplicate(self):
        """Zwei Zertifikate mit identischem Hash → IntegrityError."""
        provider = Provider.objects.create(provider="TestProvider")
        self._make_cert(provider, sha256_hash="a" * 64)
        with pytest.raises(IntegrityError):
            self._make_cert(provider, sha256_hash="a" * 64, title="Anderer Titel")

    def test_different_hashes_allowed(self):
        """Verschiedene Hashes → beide Zertifikate gespeichert."""
        provider = Provider.objects.create(provider="TestProvider")
        self._make_cert(provider, sha256_hash="a" * 64)
        self._make_cert(provider, sha256_hash="b" * 64, title="Zweites Cert")
        assert Certificate.objects.count() == 2

    def test_sha256_hash_is_required_on_validation(self):
        """Ohne sha256_hash → ValidationError bei full_clean()."""
        from django.core.exceptions import ValidationError

        provider = Provider.objects.create(provider="TestProvider")
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"content",
            content_type="application/pdf",
        )
        cert = Certificate(
            title="No Hash",
            provider=provider,
            pdf_file=dummy_file,
        )
        with pytest.raises(ValidationError) as exc_info:
            cert.full_clean()
        assert "sha256_hash" in exc_info.value.message_dict


@pytest.mark.django_db
class TestCertificateUnpublishedByDefault:
    """Prüft, dass neue Zertifikate unveröffentlicht sind."""

    def test_certificate_created_unpublished(self):
        provider = Provider.objects.create(provider="TestProvider")
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"content",
            content_type="application/pdf",
        )
        cert = Certificate.objects.create(
            title="Neues Zertifikat",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="c" * 64,
        )
        assert cert.is_published is False


@pytest.mark.django_db
class TestCertificateM2MTracks:
    """Prüft die M2M-Beziehung zwischen Certificate und Track."""

    def test_certificate_multiple_tracks(self):
        """Ein Zertifikat kann mehreren Tracks zugeordnet werden."""
        provider = Provider.objects.create(provider="TestProvider")
        track_a = Track.objects.create(name="Python Django", slug="python-django")
        track_b = Track.objects.create(name="Cloud DevOps", slug="cloud-devops")
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"content",
            content_type="application/pdf",
        )
        cert = Certificate.objects.create(
            title="Multi-Track Cert",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="d" * 64,
        )
        cert.tracks.set([track_a, track_b])

        assert cert.tracks.count() == 2
        assert set(cert.tracks.values_list("slug", flat=True)) == {
            "python-django",
            "cloud-devops",
        }

    def test_track_lists_its_certificates(self):
        """Track.certificates (reverse M2M) gibt zugeordnete Zertifikate zurück."""
        provider = Provider.objects.create(provider="TestProvider")
        track = Track.objects.create(name="Security", slug="security")
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"content",
            content_type="application/pdf",
        )
        cert = Certificate.objects.create(
            title="Security Cert",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="e" * 64,
        )
        cert.tracks.add(track)

        assert track.certificates.count() == 1
        assert track.certificates.first().title == "Security Cert"

    def test_certificate_no_tracks_allowed(self):
        """Zertifikat ohne Track-Zuordnung ist gültig."""
        provider = Provider.objects.create(provider="TestProvider")
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"content",
            content_type="application/pdf",
        )
        cert = Certificate.objects.create(
            title="Untracked Cert",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="f" * 64,
        )
        assert cert.tracks.count() == 0
