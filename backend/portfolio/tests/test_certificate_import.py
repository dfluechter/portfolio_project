"""Tests für den idempotenten Zertifikatsimport (Phase 1 - Datenmodell)."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError

from portfolio.models import (
    Certificate,
    CertificateImportRun,
    PendingCertificate,
    Provider,
    Track,
)


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
        first_cert = track.certificates.first()
        assert first_cert is not None
        assert first_cert.title == "Security Cert"

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


@pytest.mark.django_db
class TestScanInboxCommand:
    """Tests für den scan_inbox Management Command (Phase 2)."""

    def test_scan_inbox_creates_pending_with_run_and_tracks(self, tmp_path):
        """Gültige PDF wird eingelesen, mit Run und Tracks verknüpft."""
        from django.core.management import call_command

        from portfolio.services.extractor import compute_file_hash

        # Test-Datei mit Django-Keyword im Namen erzeugen
        cert_file = tmp_path / "Django_Developer_Certificate.pdf"
        cert_file.write_bytes(b"%PDF-1.4 test certificate content for django")

        file_hash = compute_file_hash(cert_file)

        call_command("scan_inbox", "--inbox", str(tmp_path))

        assert PendingCertificate.objects.count() == 1
        pending = PendingCertificate.objects.first()
        assert pending is not None
        assert pending.sha256_hash == file_hash
        assert pending.original_file_name == "Django_Developer_Certificate.pdf"
        assert pending.import_run is not None
        assert pending.import_run.files_imported == 1
        assert pending.import_run.files_found == 1

        # Track python-django sollte automatisch via Keyword verknüpft sein
        track_slugs = list(pending.suggested_tracks.values_list("slug", flat=True))
        assert "python-django" in track_slugs

    def test_scan_inbox_idempotent_skips_known_pending(self, tmp_path):
        """Zweiter Scan derselben Datei wird übersprungen (Idempotenz)."""
        from django.core.management import call_command

        cert_file = tmp_path / "Sample_Cert.pdf"
        cert_file.write_bytes(b"%PDF-1.4 sample content")

        call_command("scan_inbox", "--inbox", str(tmp_path))
        assert PendingCertificate.objects.count() == 1

        # Zweiter Aufruf
        call_command("scan_inbox", "--inbox", str(tmp_path))
        assert PendingCertificate.objects.count() == 1

        last_run = CertificateImportRun.objects.order_by("-started_at").first()
        assert last_run is not None
        assert last_run.files_skipped == 1
        assert last_run.files_imported == 0

    def test_scan_inbox_skips_if_already_in_certificate(self, tmp_path):
        """Datei, die bereits als Certificate existiert, wird übersprungen."""
        from django.core.management import call_command

        from portfolio.services.extractor import compute_file_hash

        cert_file = tmp_path / "Existing_Cert.pdf"
        cert_file.write_bytes(b"%PDF-1.4 existing cert content")
        file_hash = compute_file_hash(cert_file)

        provider = Provider.objects.create(provider="ExistingProvider")
        Certificate.objects.create(
            title="Existing Cert",
            provider=provider,
            pdf_file=SimpleUploadedFile("ex.pdf", b"x"),
            sha256_hash=file_hash,
        )

        call_command("scan_inbox", "--inbox", str(tmp_path))
        assert PendingCertificate.objects.count() == 0

        run = CertificateImportRun.objects.first()
        assert run is not None
        assert run.files_skipped == 1

    def test_scan_inbox_ignores_non_whitelist_extensions_silently(self, tmp_path):
        """Nicht erlaubte Dateien (.txt, .docx, .zip) erzeugen keine Fehler."""
        from django.core.management import call_command

        (tmp_path / "notes.txt").write_text("not a cert")
        (tmp_path / "archive.zip").write_bytes(b"PK000fakezip")
        (tmp_path / "word.docx").write_bytes(b"PK000word")
        valid_cert = tmp_path / "real_cert.png"
        valid_cert.write_bytes(b"\x89PNG\r\n\x1a\nfake png")

        call_command("scan_inbox", "--inbox", str(tmp_path))

        assert PendingCertificate.objects.count() == 1
        run = CertificateImportRun.objects.first()
        assert run is not None
        assert run.files_found == 1  # nur die PNG-Datei gezählt
        assert run.files_errored == 0

    def test_scan_inbox_dry_run_creates_no_pending_records(self, tmp_path):
        """--dry-run speichert keine PendingCertificates, erfasst aber Plan im Run."""
        from django.core.management import call_command

        (tmp_path / "Plan_Cert.pdf").write_bytes(b"%PDF-1.4 plan content")

        call_command("scan_inbox", "--inbox", str(tmp_path), "--dry-run")

        assert PendingCertificate.objects.count() == 0
        run = CertificateImportRun.objects.first()
        assert run is not None
        assert run.files_imported == 1
        assert "PLAN" in run.log

    def test_scan_inbox_recursive_finds_nested_files(self, tmp_path):
        """--recursive durchsucht auch Unterverzeichnisse der Inbox."""
        from django.core.management import call_command

        sub_dir = tmp_path / "subfolder" / "nested"
        sub_dir.mkdir(parents=True)
        (sub_dir / "Nested_Cert.pdf").write_bytes(b"%PDF-1.4 nested content")

        # Ohne --recursive wird Datei in Unterordner nicht gefunden
        call_command("scan_inbox", "--inbox", str(tmp_path))
        assert PendingCertificate.objects.count() == 0

        # Mit --recursive wird sie gefunden
        call_command("scan_inbox", "--inbox", str(tmp_path), "--recursive")
        assert PendingCertificate.objects.count() == 1


@pytest.mark.django_db
class TestPendingCertificatePromotion:
    """Prüft den Freigabe- und Promotionsservice."""

    def test_promote_pending_certificate_success(self, tmp_path):
        """Erfolgreiche Promotion legt Certificate an und verknüpft Pending-Datensatz."""
        from portfolio.services.promotion import promote_pending_certificate

        file = tmp_path / "cert.pdf"
        file.write_bytes(b"%PDF-1.4 test certificate binary data")

        track = Track.objects.create(name="DevOps Track", slug="devops-track")
        pending = PendingCertificate.objects.create(
            original_file_name="cert.pdf",
            file_path=str(file),
            guessed_title="DevOps Certified",
            guessed_provider="Linux Foundation",
        )
        pending.suggested_tracks.add(track)

        cert = promote_pending_certificate(pending)

        assert cert.pk is not None
        assert cert.title == "DevOps Certified"
        assert cert.provider.provider == "Linux Foundation"
        assert not cert.is_published
        assert cert.sha256_hash != ""
        assert list(cert.tracks.all()) == [track]

        pending.refresh_from_db()
        from portfolio.models import PendingCertificateStatus

        assert pending.status == PendingCertificateStatus.APPROVED
        assert pending.certificate == cert

    def test_promote_pending_certificate_already_processed_raises_error(self, tmp_path):
        """Bereits verarbeitetes Zertifikat kann nicht erneut freigegeben werden."""
        from portfolio.models import PendingCertificateStatus
        from portfolio.services.promotion import (
            PromotionError,
            promote_pending_certificate,
        )

        file = tmp_path / "cert.pdf"
        file.write_bytes(b"%PDF-1.4 data")

        pending = PendingCertificate.objects.create(
            original_file_name="cert.pdf",
            file_path=str(file),
            status=PendingCertificateStatus.APPROVED,
        )

        with pytest.raises(PromotionError, match="bereits verarbeitet"):
            promote_pending_certificate(pending)

    def test_promote_pending_certificate_missing_file_raises_error(self):
        """Fehlende lokale Quelldatei bricht mit PromotionError ab."""
        from portfolio.services.promotion import (
            PromotionError,
            promote_pending_certificate,
        )

        pending = PendingCertificate.objects.create(
            original_file_name="ghost.pdf",
            file_path="/tmp/non_existent_file_12345.pdf",
        )

        with pytest.raises(PromotionError, match="existiert nicht mehr lokal"):
            promote_pending_certificate(pending)

    def test_promote_pending_certificate_duplicate_hash_raises_error(self, tmp_path):
        """Wenn identischer SHA-256 existiert, wird Promotion verweigert."""
        from portfolio.services.extractor import compute_file_hash
        from portfolio.services.promotion import (
            PromotionError,
            promote_pending_certificate,
        )

        file = tmp_path / "cert.pdf"
        file.write_bytes(b"%PDF-1.4 duplicate test content")
        file_hash = compute_file_hash(file)

        provider = Provider.objects.create(provider="Existing Provider")
        Certificate.objects.create(
            title="Existing Cert",
            provider=provider,
            sha256_hash=file_hash,
            pdf_file=SimpleUploadedFile("dummy.pdf", b"test"),
        )

        pending = PendingCertificate.objects.create(
            original_file_name="cert.pdf",
            file_path=str(file),
            guessed_title="New Cert",
            guessed_provider="Existing Provider",
        )

        with pytest.raises(PromotionError, match="identischem Dateiinhalt"):
            promote_pending_certificate(pending)

    def test_reject_pending_certificate_sets_status(self, tmp_path):
        """Ablehnen setzt Status auf REJECTED."""
        from portfolio.models import PendingCertificateStatus
        from portfolio.services.promotion import reject_pending_certificate

        file = tmp_path / "cert.pdf"
        file.write_bytes(b"%PDF-1.4 data")

        pending = PendingCertificate.objects.create(
            original_file_name="cert.pdf",
            file_path=str(file),
        )

        reject_pending_certificate(pending)
        pending.refresh_from_db()
        assert pending.status == PendingCertificateStatus.REJECTED


@pytest.mark.django_db
class TestPromotionWorkflowAPIAndAdmin:
    """Prüft REST API Endpoints und Django Admin Action für Freigabe."""

    def test_viewset_approve_and_reject(self, tmp_path):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        from portfolio.models import PendingCertificateStatus

        user_model = get_user_model()
        staff_user = user_model.objects.create_user(
            email="admin@example.com", password="password", is_staff=True
        )

        file = tmp_path / "api_cert.pdf"
        file.write_bytes(b"%PDF-1.4 api cert binary")

        pending = PendingCertificate.objects.create(
            original_file_name="api_cert.pdf",
            file_path=str(file),
            guessed_title="API Cert",
            guessed_provider="API Provider",
        )

        client = APIClient()
        client.force_authenticate(user=staff_user)

        # Approve
        approve_url = f"/api/pending-certificates/{pending.pk}/approve/"
        res = client.post(
            approve_url,
            {"title": "Custom Title", "provider": "Custom Provider"},
            format="json",
        )
        assert res.status_code == 200
        assert res.data["detail"] == "Erfolgreich freigegeben."
        assert "certificate_id" in res.data

        pending.refresh_from_db()
        assert pending.status == PendingCertificateStatus.APPROVED
        assert pending.certificate is not None
        assert pending.certificate.title == "Custom Title"

        # Re-Approve fails
        res2 = client.post(approve_url, format="json")
        assert res2.status_code == 400

    def test_admin_promote_selected_action(self, tmp_path):
        """Admin Action promote_selected verarbeitet markierte PendingCertificates."""
        from django.contrib.admin.sites import AdminSite
        from django.contrib.auth import get_user_model
        from django.contrib.messages.storage.fallback import FallbackStorage
        from django.test import RequestFactory

        from portfolio.admin import PendingCertificateAdmin
        from portfolio.models import PendingCertificateStatus

        file = tmp_path / "admin_cert.pdf"
        file.write_bytes(b"%PDF-1.4 admin test content")

        pending = PendingCertificate.objects.create(
            original_file_name="admin_cert.pdf",
            file_path=str(file),
            guessed_title="Admin Cert",
            guessed_provider="Admin Provider",
        )

        user_model = get_user_model()
        staff_user = user_model.objects.create_user(
            email="staff@example.com", password="password", is_staff=True
        )

        rf = RequestFactory()
        request = rf.post("/admin/portfolio/pendingcertificate/")
        request.user = staff_user
        request.session = {}  # type: ignore[assignment]
        messages = FallbackStorage(request)
        request._messages = messages  # type: ignore[attr-defined]

        admin_instance = PendingCertificateAdmin(PendingCertificate, AdminSite())
        admin_instance.promote_selected(
            request, PendingCertificate.objects.filter(pk=pending.pk)
        )

        pending.refresh_from_db()
        assert pending.status == PendingCertificateStatus.APPROVED
        assert pending.certificate is not None
        assert pending.certificate.title == "Admin Cert"


class TestExtractorServiceAndOCR:
    """Umfassende Tests für die erweiterte Metadaten- und OCR-Pipeline."""

    def test_parse_date_string_various_formats(self):
        from portfolio.services.extractor import parse_date_string

        assert parse_date_string("2024-05-15") == "2024-05-15"
        assert parse_date_string("15.05.2024") == "2024-05-15"
        assert parse_date_string("01.01.2023") == "2023-01-01"
        assert parse_date_string("May 15, 2024") == "2024-05-15"
        assert parse_date_string("15 May 2024") == "2024-05-15"
        assert parse_date_string("October 9, 2026") == "2026-10-09"
        assert parse_date_string("09. Oktober 2026") == "2026-10-09"
        assert parse_date_string("May 2024") == "2024-05-01"
        assert parse_date_string("05/15/2024") == "2024-05-15"
        assert parse_date_string("invalid string") is None
        assert parse_date_string("") is None

    def test_extract_issued_date_context_keywords(self):
        from portfolio.services.extractor import extract_issued_date

        text_with_context = (
            "Certificate of Completion\n"
            "Awarded to John Doe\n"
            "Issue Date: October 9, 2026\n"
            "Some other text 2020-01-01"
        )
        assert extract_issued_date(text_with_context) == "2026-10-09"

        text_german = "Ausgestellt am: 15.03.2025 in Berlin"
        assert extract_issued_date(text_german) == "2025-03-15"

        text_no_context = "Hier steht nur ein Datum: 2024-11-20 im Text"
        assert extract_issued_date(text_no_context) == "2024-11-20"

        assert extract_issued_date("") == ""

    def test_guess_provider_filename_and_text(self):
        from portfolio.services.extractor import guess_provider

        # Filename matching
        assert guess_provider("", "Coursera_Deep_Learning.pdf") == "Coursera"
        assert guess_provider("", "cert-Udemy-React.pdf") == "Udemy"
        assert guess_provider("", "AWS_Certified_Architect.pdf") == "AWS"

        # Explicit phrase in text
        text_phrase = "This program was offered by edX in partnership with Harvard"
        assert guess_provider(text_phrase, "cert.pdf") in ["edX", "Harvard"]

        # Known provider in text
        text_body = "The recipient completed the deeplearning.ai neural networks course"
        assert guess_provider(text_body, "cert.pdf") == "DeepLearning.AI"

        # Custom known providers parameter
        custom_providers = ["CustomAcademy", "SpecialOrg"]
        assert (
            guess_provider(
                "Issued by CustomAcademy for achievements",
                "cert.pdf",
                known_providers=custom_providers,
            )
            == "CustomAcademy"
        )

    def test_guess_title_regex_and_fallback(self):
        from portfolio.services.extractor import guess_title

        text = (
            "Certificate of Completion\n"
            "This is to certify that John has successfully completed the course "
            "Advanced Django and DRF Architecture\n"
            "Date: 2026-10-09"
        )
        title = guess_title(text, "file.pdf", {})
        assert (
            "Advanced Django and DRF Architecture" in title
            or "Certificate of Completion" in title
        )

        # Fallback to cleaned filename
        title_from_fn = guess_title(
            "", "Udemy_React_and_TypeScript_Mastery.pdf", {}, provider="Udemy"
        )
        assert "React and TypeScript Mastery" in title_from_fn

    def test_extract_credential_id(self):
        from portfolio.services.extractor import extract_credential_id

        text = "Credential ID: UC-998877665544\nDate: 2025-01-01"
        assert extract_credential_id(text) == "UC-998877665544"

        verify_url = (
            "Verify authenticity at: https://verify.example.com/cert/ABC-XYZ-123"
        )
        assert extract_credential_id(verify_url) == "ABC-XYZ-123"

        assert extract_credential_id("No id present here") == ""

    def test_extract_from_image_success_and_tesseract_error(
        self, tmp_path, monkeypatch
    ):
        import pytesseract
        from PIL import Image

        from portfolio.services.extractor import _extract_from_image

        # Create dummy image
        img_path = tmp_path / "test_img.png"
        img = Image.new("RGB", (100, 100), color="white")
        img.save(img_path)

        # Mock pytesseract success
        monkeypatch.setattr(
            pytesseract, "image_to_string", lambda x: "Extracted Image Text"
        )
        _meta, text, dims, ocr_pending = _extract_from_image(img_path, enable_ocr=True)
        assert text == "Extracted Image Text"
        assert dims == "100x100"
        assert not ocr_pending

        # Mock pytesseract TesseractNotFoundError (graceful degradation)
        def raise_tesseract_error(x):
            raise pytesseract.TesseractNotFoundError()

        monkeypatch.setattr(pytesseract, "image_to_string", raise_tesseract_error)
        _meta, text, dims, ocr_pending = _extract_from_image(img_path, enable_ocr=True)
        assert text == ""
        assert ocr_pending is True

    def test_extract_from_pdf_embedded_images_ocr(self, tmp_path, monkeypatch):
        import pytesseract
        from PIL import Image

        from portfolio.services.extractor import _extract_from_pdf

        # Create dummy PDF without textlayer
        pdf_path = tmp_path / "scanned_doc.pdf"
        pdf_path.write_bytes(b"%PDF-1.4 dummy content")

        # Mock PdfReader to simulate an image on page 0
        class DummyImageFile:
            def __init__(self):
                self.data = b"dummy_img_bytes"

        class DummyPage:
            def __init__(self):
                self.images = [DummyImageFile()]

            def extract_text(self):
                return ""

        class DummyReader:
            def __init__(self):
                self.metadata = None
                self.pages = [DummyPage()]

        import portfolio.services.extractor as extractor_module

        monkeypatch.setattr(extractor_module, "PdfReader", lambda f: DummyReader())
        monkeypatch.setattr(Image, "open", lambda f: Image.new("RGB", (10, 10)))
        monkeypatch.setattr(
            pytesseract, "image_to_string", lambda img: "Scanned Certificate OCR Text"
        )

        _meta, text, ocr_pending = _extract_from_pdf(pdf_path, enable_ocr=True)
        assert "Scanned Certificate OCR Text" in text
        assert ocr_pending is False

    def test_extract_metadata_full_integration(self, tmp_path, monkeypatch):
        from portfolio.models import TRACK_RULES
        from portfolio.services.extractor import extract_metadata

        file_path = tmp_path / "Coursera_Machine_Learning.pdf"
        file_path.write_bytes(b"%PDF-1.4 header")

        class DummyReader:
            def __init__(self):
                self.metadata = None
                self.pages = []

        import portfolio.services.extractor as extractor_module

        monkeypatch.setattr(extractor_module, "PdfReader", lambda f: DummyReader())

        res = extract_metadata(
            file_path,
            tmp_path,
            TRACK_RULES,
            enable_ocr=False,
            known_providers=["Coursera"],
        )
        assert res is not None
        assert res.guessed_provider == "Coursera"
        assert res.source_type == "pdf"
        assert res.file_size > 0
