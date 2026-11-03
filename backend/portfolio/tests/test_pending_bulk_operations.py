import hashlib

import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory
from rest_framework import status
from rest_framework.test import APIClient

from portfolio.admin import PendingCertificateAdmin
from portfolio.models import (
    Certificate,
    PendingCertificate,
    PendingCertificateStatus,
    Track,
    User,
)


class DummyMessageStorage:
    def __init__(self):
        self.messages = []

    def add(self, level, message, extra_tags=""):
        self.messages.append(message)

    def __iter__(self):
        return iter(self.messages)


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email="admin_bulk@example.com", password="password123"
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email="regular_bulk@example.com",
        password="password123",
        is_staff=False,
    )


@pytest.fixture
def auth_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def regular_client(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.fixture
def sample_track(db):
    return Track.objects.create(
        name="Cloud & DevOps", slug="cloud-devops", icon="cloud"
    )


@pytest.fixture
def second_track(db):
    return Track.objects.create(
        name="Backend Engineering", slug="backend", icon="server"
    )


@pytest.fixture
def dummy_pdf_files(tmp_path):
    f1 = tmp_path / "cert1.pdf"
    f1.write_bytes(b"%PDF-1.4 dummy content cert 1")
    f2 = tmp_path / "cert2.pdf"
    f2.write_bytes(b"%PDF-1.4 dummy content cert 2")
    f3 = tmp_path / "cert3.pdf"
    f3.write_bytes(b"%PDF-1.4 dummy content cert 3")
    return f1, f2, f3


@pytest.mark.django_db
class TestPendingCertificateBulkOperations:
    def test_unauthenticated_cannot_bulk_approve(self):
        client = APIClient()
        resp = client.post(
            "/api/pending-certificates/bulk_approve/", {"ids": [1]}, format="json"
        )
        assert resp.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_unauthenticated_cannot_bulk_reject(self):
        client = APIClient()
        resp = client.post(
            "/api/pending-certificates/bulk_reject/", {"ids": [1]}, format="json"
        )
        assert resp.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_non_staff_cannot_bulk_approve(self, regular_client):
        resp = regular_client.post(
            "/api/pending-certificates/bulk_approve/", {"ids": [1]}, format="json"
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_non_staff_cannot_bulk_reject(self, regular_client):
        resp = regular_client.post(
            "/api/pending-certificates/bulk_reject/", {"ids": [1]}, format="json"
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_bulk_approve_empty_payload_fails(self, auth_client):
        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/", {"ids": []}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Mindestens eine ID" in str(resp.data)

    def test_bulk_reject_empty_payload_fails(self, auth_client):
        resp = auth_client.post(
            "/api/pending-certificates/bulk_reject/", {}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Mindestens eine ID" in str(resp.data)

    def test_bulk_approve_exceeds_max_batch_limit_fails(self, auth_client):
        large_ids = list(range(1, 102))  # 101 IDs
        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": large_ids},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "100" in str(resp.data)

    def test_bulk_reject_exceeds_max_batch_limit_fails(self, auth_client):
        large_ids = list(range(1, 102))  # 101 IDs
        resp = auth_client.post(
            "/api/pending-certificates/bulk_reject/",
            {"ids": large_ids},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "100" in str(resp.data)

    def test_bulk_approve_duplicate_ids_in_payload_fails(
        self, auth_client, dummy_pdf_files, sample_track
    ):
        f1, _, _ = dummy_pdf_files
        p = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"cert1_dup").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )
        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": [p.id, p.id], "track_ids": [sample_track.id]},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Doppelte IDs" in str(resp.data)

    def test_bulk_approve_invalid_track_fails(self, auth_client, dummy_pdf_files):
        f1, _, _ = dummy_pdf_files
        p = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"cert1_inv_track").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )
        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": [p.id], "track_ids": [99999]},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Track 99999 nicht gefunden" in str(resp.data)

    def test_bulk_approve_missing_track_fails_with_filename_and_id(
        self, auth_client, dummy_pdf_files
    ):
        f1, _, _ = dummy_pdf_files
        p = PendingCertificate.objects.create(
            original_file_name="orphan_track.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"orphan_track").hexdigest(),
            guessed_title="No Tracks Cert",
            status=PendingCertificateStatus.PENDING,
        )
        # Kein suggested_track und keine track_ids im Request
        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": [p.id]},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        error_msg = str(resp.data.get("detail", resp.data))
        assert "orphan_track.pdf" in error_msg
        assert str(p.id) in error_msg
        assert "Track" in error_msg

        p.refresh_from_db()
        assert p.status == PendingCertificateStatus.PENDING
        assert Certificate.objects.count() == 0

    def test_bulk_approve_atomic_rollback_on_failure_cleans_storage(
        self, auth_client, dummy_pdf_files, sample_track
    ):
        f1, f2, _ = dummy_pdf_files
        p1 = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"batch_p1").hexdigest(),
            guessed_title="Cert 1",
            guessed_provider="Provider A",
            status=PendingCertificateStatus.PENDING,
        )
        p2 = PendingCertificate.objects.create(
            original_file_name="cert2.pdf",
            file_path=str(f2),
            sha256_hash=hashlib.sha256(b"batch_p2").hexdigest(),
            guessed_title="Cert 2",
            guessed_provider="Provider B",
            status=PendingCertificateStatus.PENDING,
        )
        # 3. Datensatz verweist auf eine nicht existierende Datei -> Fehler!
        p3_missing = PendingCertificate.objects.create(
            original_file_name="missing.pdf",
            file_path="/tmp/nonexistent_dummy_file_12345.pdf",
            sha256_hash=hashlib.sha256(b"batch_missing").hexdigest(),
            guessed_title="Cert 3 Missing",
            guessed_provider="Provider C",
            status=PendingCertificateStatus.PENDING,
        )

        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {
                "ids": [p1.id, p2.id, p3_missing.id],
                "track_ids": [sample_track.id],
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

        # Kein einziges Zertifikat darf existieren (atomarer Rollback)
        assert Certificate.objects.count() == 0

        p1.refresh_from_db()
        p2.refresh_from_db()
        p3_missing.refresh_from_db()
        assert p1.status == PendingCertificateStatus.PENDING
        assert p2.status == PendingCertificateStatus.PENDING
        assert p3_missing.status == PendingCertificateStatus.PENDING
        assert p1.certificate is None
        assert p2.certificate is None

    def test_bulk_approve_success_with_explicit_tracks(
        self, auth_client, sample_track, second_track, dummy_pdf_files
    ):
        f1, f2, _ = dummy_pdf_files
        p1 = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"cert1_explicit").hexdigest(),
            guessed_title="AWS Certified Architect",
            guessed_provider="AWS",
            status=PendingCertificateStatus.PENDING,
        )
        p2 = PendingCertificate.objects.create(
            original_file_name="cert2.pdf",
            file_path=str(f2),
            sha256_hash=hashlib.sha256(b"cert2_explicit").hexdigest(),
            guessed_title="Google Cloud Engineer",
            guessed_provider="Google",
            status=PendingCertificateStatus.PENDING,
        )

        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {
                "ids": [p1.id, p2.id],
                "track_ids": [sample_track.id, second_track.id],
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["approved_count"] == 2
        assert resp.data["failed_count"] == 0
        assert len(resp.data["results"]) == 2

        p1.refresh_from_db()
        p2.refresh_from_db()
        assert p1.status == PendingCertificateStatus.APPROVED
        assert p2.status == PendingCertificateStatus.APPROVED
        assert p1.certificate is not None
        assert p2.certificate is not None
        assert p1.certificate.tracks.filter(id=sample_track.id).exists()
        assert p1.certificate.tracks.filter(id=second_track.id).exists()
        assert p2.certificate.tracks.filter(id=sample_track.id).exists()
        assert p2.certificate.tracks.filter(id=second_track.id).exists()
        assert not p1.certificate.is_published
        assert not p2.certificate.is_published

    def test_bulk_approve_fallback_to_suggested_tracks(
        self, auth_client, sample_track, second_track, dummy_pdf_files
    ):
        f1, f2, _ = dummy_pdf_files
        p1 = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"cert1_fallback").hexdigest(),
            guessed_title="DevOps Master",
            status=PendingCertificateStatus.PENDING,
        )
        p1.suggested_tracks.add(sample_track)

        p2 = PendingCertificate.objects.create(
            original_file_name="cert2.pdf",
            file_path=str(f2),
            sha256_hash=hashlib.sha256(b"cert2_fallback").hexdigest(),
            guessed_title="Python Pro",
            status=PendingCertificateStatus.PENDING,
        )
        p2.suggested_tracks.add(second_track)

        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": [p1.id, p2.id]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["approved_count"] == 2

        p1.refresh_from_db()
        p2.refresh_from_db()
        assert p1.certificate is not None
        assert p2.certificate is not None
        assert p1.certificate.tracks.filter(id=sample_track.id).exists()
        assert p2.certificate.tracks.filter(id=second_track.id).exists()

    def test_bulk_approve_fails_if_item_not_pending(
        self, auth_client, dummy_pdf_files, sample_track
    ):
        f1, f2, _ = dummy_pdf_files
        p_valid = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"pending_valid").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )
        p_rejected = PendingCertificate.objects.create(
            original_file_name="cert2.pdf",
            file_path=str(f2),
            sha256_hash=hashlib.sha256(b"already_rejected").hexdigest(),
            status=PendingCertificateStatus.REJECTED,
        )

        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {
                "ids": [p_valid.id, p_rejected.id],
                "track_ids": [sample_track.id],
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "nur 'pending' kann genehmigt werden" in str(resp.data)

        p_valid.refresh_from_db()
        assert p_valid.status == PendingCertificateStatus.PENDING
        assert Certificate.objects.count() == 0

    def test_bulk_approve_fails_if_id_not_found(
        self, auth_client, dummy_pdf_files, sample_track
    ):
        f1, _, _ = dummy_pdf_files
        p_valid = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"p_valid_not_found").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )
        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": [p_valid.id, 999999], "track_ids": [sample_track.id]},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "999999 nicht gefunden" in str(resp.data)
        p_valid.refresh_from_db()
        assert p_valid.status == PendingCertificateStatus.PENDING

    def test_bulk_reject_success(self, auth_client):
        p1 = PendingCertificate.objects.create(
            original_file_name="reject1.pdf",
            file_path="/tmp/some_file1.pdf",
            sha256_hash=hashlib.sha256(b"reject1").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )
        p2 = PendingCertificate.objects.create(
            original_file_name="reject2.pdf",
            file_path="/tmp/some_file2.pdf",
            sha256_hash=hashlib.sha256(b"reject2").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )

        resp = auth_client.post(
            "/api/pending-certificates/bulk_reject/",
            {"ids": [p1.id, p2.id]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["rejected_count"] == 2
        assert resp.data["failed_count"] == 0

        p1.refresh_from_db()
        p2.refresh_from_db()
        assert p1.status == PendingCertificateStatus.REJECTED
        assert p2.status == PendingCertificateStatus.REJECTED

    def test_bulk_reject_fails_and_rolls_back_if_id_invalid_or_not_pending(
        self, auth_client
    ):
        p_valid = PendingCertificate.objects.create(
            original_file_name="valid_reject.pdf",
            file_path="/tmp/some_valid.pdf",
            sha256_hash=hashlib.sha256(b"valid_reject").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )
        p_already_rejected = PendingCertificate.objects.create(
            original_file_name="already_rejected.pdf",
            file_path="/tmp/already_rejected.pdf",
            sha256_hash=hashlib.sha256(b"already_rejected_case").hexdigest(),
            status=PendingCertificateStatus.REJECTED,
        )

        resp = auth_client.post(
            "/api/pending-certificates/bulk_reject/",
            {"ids": [p_valid.id, p_already_rejected.id]},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "nur 'pending' kann abgelehnt werden" in str(resp.data)

        # Atomarer Schutz: p_valid darf NICHT geändert worden sein!
        p_valid.refresh_from_db()
        assert p_valid.status == PendingCertificateStatus.PENDING

    def test_django_admin_reject_selected_action(self, admin_user):
        admin_site = AdminSite()
        admin_instance = PendingCertificateAdmin(PendingCertificate, admin_site)

        p = PendingCertificate.objects.create(
            original_file_name="admin_reject.pdf",
            file_path="/tmp/admin_reject.pdf",
            sha256_hash=hashlib.sha256(b"admin_reject").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )

        request_factory = RequestFactory()
        request = request_factory.post("/admin/portfolio/pendingcertificate/")
        request.user = admin_user
        request._messages = DummyMessageStorage()  # type: ignore[attr-defined]

        admin_instance.reject_selected(
            request, PendingCertificate.objects.filter(id=p.id)
        )

        p.refresh_from_db()
        assert p.status == PendingCertificateStatus.REJECTED

    def test_django_admin_promote_selected_action(
        self, admin_user, dummy_pdf_files, sample_track
    ):
        f1, _, _ = dummy_pdf_files
        admin_site = AdminSite()
        admin_instance = PendingCertificateAdmin(PendingCertificate, admin_site)

        p = PendingCertificate.objects.create(
            original_file_name="admin_promote.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"admin_promote").hexdigest(),
            guessed_title="Admin Promoted Cert",
            status=PendingCertificateStatus.PENDING,
        )
        p.suggested_tracks.add(sample_track)

        request_factory = RequestFactory()
        request = request_factory.post("/admin/portfolio/pendingcertificate/")
        request.user = admin_user
        request._messages = DummyMessageStorage()  # type: ignore[attr-defined]

        admin_instance.promote_selected(
            request, PendingCertificate.objects.filter(id=p.id)
        )

        p.refresh_from_db()
        assert p.status == PendingCertificateStatus.APPROVED
        assert p.certificate is not None
        assert p.certificate.title == "Admin Promoted Cert"
