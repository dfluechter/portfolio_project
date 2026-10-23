import hashlib

import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory
from rest_framework import status
from rest_framework.test import APIClient

from portfolio.admin import PendingCertificateAdmin
from portfolio.models import (
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
def auth_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
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
    return f1, f2


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

    def test_bulk_approve_empty_payload_fails(self, auth_client):
        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/", {"ids": []}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Mindestens eine ID" in resp.data["detail"]

    def test_bulk_reject_empty_payload_fails(self, auth_client):
        resp = auth_client.post(
            "/api/pending-certificates/bulk_reject/", {}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Mindestens eine ID" in resp.data["detail"]

    def test_bulk_approve_invalid_track_fails(self, auth_client, dummy_pdf_files):
        f1, _ = dummy_pdf_files
        p = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"cert1").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )
        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": [p.id], "track_ids": [99999]},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Track 99999 nicht gefunden" in resp.data["detail"]

    def test_bulk_approve_success_with_explicit_tracks(
        self, auth_client, sample_track, dummy_pdf_files
    ):
        f1, f2 = dummy_pdf_files
        p1 = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"cert1").hexdigest(),
            guessed_title="AWS Certified Architect",
            guessed_provider="AWS",
            status=PendingCertificateStatus.PENDING,
        )
        p2 = PendingCertificate.objects.create(
            original_file_name="cert2.pdf",
            file_path=str(f2),
            sha256_hash=hashlib.sha256(b"cert2").hexdigest(),
            guessed_title="Google Cloud Engineer",
            guessed_provider="Google",
            status=PendingCertificateStatus.PENDING,
        )

        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": [p1.id, p2.id], "track_ids": [sample_track.id]},
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
        assert p2.certificate.tracks.filter(id=sample_track.id).exists()
        assert not p1.certificate.is_published
        assert not p2.certificate.is_published

    def test_bulk_approve_fallback_to_suggested_tracks(
        self, auth_client, sample_track, second_track, dummy_pdf_files
    ):
        f1, f2 = dummy_pdf_files
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

    def test_bulk_approve_partial_success(
        self, auth_client, dummy_pdf_files, sample_track
    ):
        f1, _ = dummy_pdf_files
        p_valid = PendingCertificate.objects.create(
            original_file_name="cert1.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"cert_valid").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )
        p_missing_file = PendingCertificate.objects.create(
            original_file_name="missing.pdf",
            file_path="/tmp/nonexistent_path_cert.pdf",
            sha256_hash=hashlib.sha256(b"cert_missing").hexdigest(),
            status=PendingCertificateStatus.PENDING,
        )

        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": [p_valid.id, p_missing_file.id], "track_ids": [sample_track.id]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["approved_count"] == 1
        assert resp.data["failed_count"] == 1
        assert len(resp.data["errors"]) == 1
        assert resp.data["errors"][0]["id"] == p_missing_file.id

        p_valid.refresh_from_db()
        p_missing_file.refresh_from_db()
        assert p_valid.status == PendingCertificateStatus.APPROVED
        assert p_missing_file.status == PendingCertificateStatus.PENDING

    def test_bulk_approve_ignores_already_processed_items(
        self, auth_client, dummy_pdf_files
    ):
        f1, _ = dummy_pdf_files
        p_already_rejected = PendingCertificate.objects.create(
            original_file_name="rejected.pdf",
            file_path=str(f1),
            sha256_hash=hashlib.sha256(b"cert_already_rejected").hexdigest(),
            status=PendingCertificateStatus.REJECTED,
        )
        resp = auth_client.post(
            "/api/pending-certificates/bulk_approve/",
            {"ids": [p_already_rejected.id]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["approved_count"] == 0
        assert resp.data["failed_count"] == 1
        assert "nur 'pending' kann genehmigt werden" in resp.data["errors"][0]["error"]

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
        f1, _ = dummy_pdf_files
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
