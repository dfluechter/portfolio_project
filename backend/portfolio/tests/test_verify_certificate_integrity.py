import io
import json
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from django.core.management import call_command

from portfolio.models import Certificate, Provider


@pytest.fixture
def sample_certificate(db):
    provider = Provider.objects.create(provider="Coursera")
    return Certificate.objects.create(
        title="Google Cloud Architect",
        provider=provider,
        sha256_hash="correcthash1234567890abcdef1234567890abcdef1234567890abcdef12345678",
        storage_key="certificates/coursera/hash_gcp.pdf",
        is_published=True,
    )


@pytest.mark.django_db
class TestVerifyCertificateIntegrityCommand:
    """Tests für den Management-Befehl verify_certificate_integrity (US 14.3)."""

    @patch(
        "portfolio.management.commands.verify_certificate_integrity.check_s3_object_exists"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.list_s3_certificate_objects"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.delete_s3_object"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.ensure_certificate_in_storage"
    )
    def test_dry_run_reports_missing_and_orphans_without_modifications(
        self,
        mock_ensure_storage,
        mock_delete_s3,
        mock_list_s3,
        mock_exists,
        sample_certificate,
    ):
        mock_exists.return_value = False
        mock_list_s3.return_value = [
            {
                "storage_key": "certificates/orphans/old_cert.pdf",
                "size": 2048,
                "last_modified": datetime.now(UTC) - timedelta(days=2),
            }
        ]

        out = io.StringIO()
        call_command("verify_certificate_integrity", "--dry-run", stdout=out)
        output = out.getvalue()

        assert "DRY-RUN" in output
        assert "Fehlende S3-Objekte (1)" in output
        assert "Verwaiste S3-Objekte (1)" in output
        assert "old_cert.pdf" in output

        # Keine Modifikationen im Dry-Run
        mock_ensure_storage.assert_not_called()
        mock_delete_s3.assert_not_called()

    @patch(
        "portfolio.management.commands.verify_certificate_integrity.check_s3_object_exists"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.list_s3_certificate_objects"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.delete_s3_object"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.ensure_certificate_in_storage"
    )
    def test_sync_mode_repairs_missing_and_deletes_orphans(
        self,
        mock_ensure_storage,
        mock_delete_s3,
        mock_list_s3,
        mock_exists,
        sample_certificate,
    ):
        mock_exists.return_value = False
        mock_ensure_storage.return_value = True
        mock_delete_s3.return_value = True
        mock_list_s3.return_value = [
            {
                "storage_key": "certificates/orphans/dead.pdf",
                "size": 1024,
                "last_modified": datetime.now(UTC) - timedelta(days=3),
            }
        ]

        out = io.StringIO()
        call_command("verify_certificate_integrity", "--sync", stdout=out)
        output = out.getvalue()

        assert "Erfolgreich synchronisiert / hochgeladen (1)" in output
        assert "Gelöschte verwaiste S3-Objekte (1)" in output
        mock_ensure_storage.assert_called_once_with(sample_certificate)
        mock_delete_s3.assert_called_once_with("certificates/orphans/dead.pdf")

    @patch(
        "portfolio.management.commands.verify_certificate_integrity.check_s3_object_exists"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.list_s3_certificate_objects"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.delete_s3_object"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.ensure_certificate_in_storage"
    )
    def test_delete_orphans_flag_only_deletes_orphans(
        self,
        mock_ensure_storage,
        mock_delete_s3,
        mock_list_s3,
        mock_exists,
        sample_certificate,
    ):
        mock_exists.return_value = False
        mock_delete_s3.return_value = True
        mock_list_s3.return_value = [
            {
                "storage_key": "certificates/orphans/dead.pdf",
                "size": 1024,
                "last_modified": datetime.now(UTC) - timedelta(days=3),
            }
        ]

        out = io.StringIO()
        call_command("verify_certificate_integrity", "--delete-orphans", stdout=out)
        output = out.getvalue()

        assert "Gelöschte verwaiste S3-Objekte (1)" in output
        # Fehlende Dateien dürfen bei --delete-orphans NICHT synchronisiert werden
        mock_ensure_storage.assert_not_called()
        mock_delete_s3.assert_called_once_with("certificates/orphans/dead.pdf")

    @patch(
        "portfolio.management.commands.verify_certificate_integrity.check_s3_object_exists"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.compute_s3_object_hash"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.list_s3_certificate_objects"
    )
    def test_verify_hashes_detects_mismatch(
        self,
        mock_list_s3,
        mock_compute_hash,
        mock_exists,
        sample_certificate,
    ):
        mock_exists.return_value = True
        mock_compute_hash.return_value = "differenthash999"
        mock_list_s3.return_value = [
            {
                "storage_key": sample_certificate.storage_key,
                "size": 5000,
                "last_modified": datetime.now(UTC),
            }
        ]

        out = io.StringIO()
        call_command("verify_certificate_integrity", "--verify-hashes", stdout=out)
        output = out.getvalue()

        assert "Hash-Inkonsistenzen (1)" in output
        assert "differenthash999" in output

    @patch(
        "portfolio.management.commands.verify_certificate_integrity.check_s3_object_exists"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.list_s3_certificate_objects"
    )
    def test_json_output_mode(
        self,
        mock_list_s3,
        mock_exists,
        sample_certificate,
    ):
        mock_exists.return_value = True
        mock_list_s3.return_value = [
            {
                "storage_key": sample_certificate.storage_key,
                "size": 5000,
                "last_modified": datetime.now(UTC),
            }
        ]

        out = io.StringIO()
        call_command("verify_certificate_integrity", "--json", stdout=out)
        raw_json = out.getvalue()

        data = json.loads(raw_json)
        assert data["database_certificates_total"] == 1
        assert data["s3_objects_total"] == 1
        assert data["intact_count"] == 1
        assert data["missing_in_s3"] == []
        assert data["orphan_s3_objects"] == []

    @patch(
        "portfolio.management.commands.verify_certificate_integrity.check_s3_object_exists"
    )
    @patch(
        "portfolio.management.commands.verify_certificate_integrity.list_s3_certificate_objects"
    )
    def test_uploads_grace_period_ignores_recent_uploads(
        self,
        mock_list_s3,
        mock_exists,
        sample_certificate,
    ):
        mock_exists.return_value = True
        recent_upload_time = datetime.now(UTC) - timedelta(hours=2)
        mock_list_s3.return_value = [
            {
                "storage_key": sample_certificate.storage_key,
                "size": 5000,
                "last_modified": datetime.now(UTC),
            },
            {
                "storage_key": "certificates/uploads/fresh_temp.pdf",
                "size": 1024,
                "last_modified": recent_upload_time,
            },
        ]

        out = io.StringIO()
        call_command("verify_certificate_integrity", "--json", stdout=out)
        data = json.loads(out.getvalue())

        # recent upload (< 24h) darf nicht als Orphan eingestuft werden
        assert data["orphan_s3_objects"] == []
