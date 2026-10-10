from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from portfolio.models import (
    Certificate,
    PendingCertificate,
    Project,
    Provider,
    Skill,
    Track,
)

User = get_user_model()

# Fehlende oder ungültige Authentifizierung wird als 401 beantwortet
# (JWTAuthentication steht in REST_FRAMEWORK vor SessionAuthentication).
DENIED = (status.HTTP_401_UNAUTHORIZED,)


@pytest.fixture
def staff_client(db):
    """APIClient mit JWT eines Staff-Benutzers."""
    user = User.objects.create_user(
        email="staff@example.com", password="StaffPassword123!", is_staff=True
    )
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token!s}")
    return client


@pytest.fixture
def provider(db):
    return Provider.objects.create(provider="Security Provider")


def make_certificate(provider, *, published, hash_char="a"):
    return Certificate.objects.create(
        title=f"Cert {hash_char}",
        provider=provider,
        pdf_file=SimpleUploadedFile(
            f"{hash_char}.pdf", b"data", content_type="application/pdf"
        ),
        sha256_hash=hash_char * 64,
        is_published=published,
    )


@pytest.mark.django_db
class TestAnonymousWriteAccess:
    """Anonyme Nutzer dürfen nur lesen, nie schreiben."""

    @pytest.mark.parametrize(
        "basename",
        ["project", "provider", "skill", "timeline", "track", "certificate"],
    )
    def test_anonymous_post_is_denied(self, api_client, basename):
        response = api_client.post(reverse(f"{basename}-list"), {}, format="json")
        assert response.status_code in DENIED

    def test_anonymous_cannot_modify_or_delete_existing_objects(self, api_client):
        skill = Skill.objects.create(name="Immutable")
        url = reverse("skill-detail", kwargs={"pk": skill.pk})

        assert api_client.put(url, {"name": "X"}, format="json").status_code in DENIED
        assert api_client.patch(url, {"name": "X"}, format="json").status_code in DENIED
        assert api_client.delete(url).status_code in DENIED

        skill.refresh_from_db()
        assert skill.name == "Immutable"

    @pytest.mark.parametrize(
        "basename",
        ["project", "provider", "skill", "timeline", "track", "certificate"],
    )
    def test_anonymous_can_read_public_lists(self, api_client, basename):
        response = api_client.get(reverse(f"{basename}-list"))
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestJwtHandling:
    """Manipulierte, abgelaufene oder falsche Token werden abgewiesen."""

    def _assert_post_project_denied(self, token):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = client.post(
            reverse("project-list"),
            {"title": "T", "description": "D"},
            format="json",
        )
        assert response.status_code in DENIED
        assert Project.objects.count() == 0

    def test_unauthenticated_response_announces_bearer_scheme(self, api_client):
        response = api_client.post(reverse("project-list"), {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response["WWW-Authenticate"].startswith("Bearer")

    def test_garbage_token_is_denied(self):
        self._assert_post_project_denied("invalid.token.here")

    def test_tampered_signature_is_denied(self, test_user):
        token = str(AccessToken.for_user(test_user))
        tampered = token[:-4] + ("AAAA" if not token.endswith("AAAA") else "BBBB")
        self._assert_post_project_denied(tampered)

    def test_expired_token_is_denied(self, test_user):
        token = AccessToken.for_user(test_user)
        token.set_exp(lifetime=-timedelta(seconds=10))
        self._assert_post_project_denied(str(token))

    def test_refresh_token_is_not_accepted_as_access_token(self, test_user):
        self._assert_post_project_denied(str(RefreshToken.for_user(test_user)))

    def test_token_of_deactivated_user_is_denied(self, test_user):
        token = str(AccessToken.for_user(test_user))
        test_user.is_active = False
        test_user.save()
        self._assert_post_project_denied(token)

    def test_user_me_does_not_leak_sensitive_fields(self, auth_client):
        response = auth_client.get(reverse("user-me"))
        assert response.status_code == status.HTTP_200_OK
        for field in ("password", "is_superuser", "user_permissions", "groups"):
            assert field not in response.data


@pytest.mark.django_db
class TestPendingCertificateAccess:
    """Die Inbox ist ausschließlich für Staff-Nutzer zugänglich."""

    @pytest.fixture
    def pending(self):
        return PendingCertificate.objects.create(
            original_file_name="secret.pdf",
            file_path="C:/private/secret.pdf",
            extracted_text="vertraulicher Text",
            guessed_title="Titel",
            guessed_provider="Anbieter",
        )

    def test_anonymous_is_denied(self, api_client, pending):
        response = api_client.get(reverse("pendingcertificate-list"))
        assert response.status_code in DENIED

    def test_regular_user_gets_403(self, auth_client, pending):
        response = auth_client.get(reverse("pendingcertificate-list"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_regular_user_cannot_approve_or_reject(self, auth_client, pending):
        for action in ("approve", "reject"):
            url = reverse(f"pendingcertificate-{action}", kwargs={"pk": pending.pk})
            assert auth_client.post(url).status_code == status.HTTP_403_FORBIDDEN
        pending.refresh_from_db()
        assert pending.status == "pending"

    def test_staff_never_sees_local_file_path(self, staff_client, pending):
        list_resp = staff_client.get(reverse("pendingcertificate-list"))
        detail_resp = staff_client.get(
            reverse("pendingcertificate-detail", kwargs={"pk": pending.pk})
        )

        assert list_resp.status_code == status.HTTP_200_OK
        assert "file_path" not in list_resp.data[0]
        assert "extracted_text" not in list_resp.data[0]
        assert detail_resp.status_code == status.HTTP_200_OK
        assert "file_path" not in detail_resp.data
        assert detail_resp.data["extracted_text"] == "vertraulicher Text"


@pytest.mark.django_db
class TestCertificateVisibility:
    """Unveröffentlichte Zertifikate bleiben für Besucher unsichtbar."""

    def test_anonymous_gets_404_for_unpublished_detail(self, api_client, provider):
        cert = make_certificate(provider, published=False)
        url = reverse("certificate-detail", kwargs={"pk": cert.pk})
        assert api_client.get(url).status_code == status.HTTP_404_NOT_FOUND

    def test_authenticated_can_see_unpublished_detail(self, auth_client, provider):
        cert = make_certificate(provider, published=False)
        url = reverse("certificate-detail", kwargs={"pk": cert.pk})
        assert auth_client.get(url).status_code == status.HTTP_200_OK

    def test_track_hides_unpublished_certificates_from_anonymous(
        self, api_client, provider
    ):
        track = Track.objects.create(name="T", slug="t")
        public = make_certificate(provider, published=True, hash_char="b")
        hidden = make_certificate(provider, published=False, hash_char="c")
        track.certificates.add(public, hidden)

        response = api_client.get(reverse("track-detail", kwargs={"pk": track.pk}))

        ids = [c["id"] for c in response.data["certificates"]]
        assert ids == [public.pk]


@pytest.mark.django_db
class TestUploadSecurity:
    def _upload(self, client, provider, upload):
        return client.post(
            reverse("certificate-list"),
            {"title": "Upload", "provider": provider.pk, "pdf_file": upload},
            format="multipart",
        )

    def test_disallowed_extension_is_rejected(self, auth_client, provider):
        upload = SimpleUploadedFile("shell.php", b"<?php ?>", "text/plain")
        response = self._upload(auth_client, provider, upload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "pdf_file" in response.data

    def test_double_extension_is_rejected(self, auth_client, provider):
        upload = SimpleUploadedFile("invoice.pdf.exe", b"MZ", "application/pdf")
        response = self._upload(auth_client, provider, upload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_file_over_5_mb_is_rejected(self, auth_client, provider):
        upload = SimpleUploadedFile(
            "big.pdf", b"0" * (5 * 1024 * 1024 + 1), "application/pdf"
        )
        response = self._upload(auth_client, provider, upload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Certificate.objects.count() == 0

    def test_path_traversal_filename_stays_inside_certificate_dir(
        self, auth_client, provider
    ):
        upload = SimpleUploadedFile("../../evil.pdf", b"content", "application/pdf")
        response = self._upload(auth_client, provider, upload)

        assert response.status_code == status.HTTP_201_CREATED
        stored = Certificate.objects.get(pk=response.data["id"]).pdf_file.name
        assert stored is not None
        assert ".." not in stored
        assert stored.startswith("certificates/security-provider/")

    def test_client_cannot_set_hash_or_publish_flag(self, auth_client, provider):
        upload = SimpleUploadedFile("ok.pdf", b"content", "application/pdf")
        response = auth_client.post(
            reverse("certificate-list"),
            {
                "title": "Mass Assignment",
                "provider": provider.pk,
                "pdf_file": upload,
                "sha256_hash": "f" * 64,
                "is_published": True,
            },
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        cert = Certificate.objects.get(pk=response.data["id"])
        assert cert.sha256_hash != "f" * 64
        assert cert.is_published is False


@pytest.mark.django_db
class TestInjectionHandling:
    PAYLOADS = (
        "<script>alert(1)</script>",
        "'; DROP TABLE portfolio_project; --",
        '" OR 1=1 --',
    )

    @pytest.mark.parametrize("payload", PAYLOADS)
    def test_malicious_strings_are_stored_verbatim_and_harmless(
        self, auth_client, payload
    ):
        response = auth_client.post(
            reverse("project-list"),
            {"title": payload, "description": payload},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert Project.objects.get(pk=response.data["id"]).title == payload
        # Tabelle existiert weiterhin, Liste bleibt abrufbar
        assert auth_client.get(reverse("project-list")).status_code == 200

    def test_sql_injection_in_login_is_rejected(self, client):
        response = client.post(
            reverse("login"),
            {"email": "' OR '1'='1", "password": "' OR '1'='1"},
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_api_response_is_json_not_html(self, auth_client):
        auth_client.post(
            reverse("skill-list"),
            {"name": "<img src=x onerror=alert(1)>"},
            format="json",
        )
        response = auth_client.get(reverse("skill-list"))
        assert response["Content-Type"].startswith("application/json")


@pytest.mark.django_db
class TestSessionViews:
    def test_dashboard_redirects_anonymous_to_login(self, client):
        response = client.get(reverse("dashboard"))
        assert response.status_code == status.HTTP_302_FOUND
        assert response.url.startswith("/")

    def test_logout_requires_post(self, client):
        assert client.get(reverse("logout")).status_code == 405
