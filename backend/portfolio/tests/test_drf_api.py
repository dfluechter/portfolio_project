import datetime

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from portfolio.models import Certificate, Project, Provider, Skill, TimelineEntry, Track


@pytest.mark.django_db
class TestProjectAPI:
    def test_unauthenticated_can_list_projects(self, api_client):
        """Unauthentifizierte Nutzer können Projekte abrufen (Read-Only)."""
        Project.objects.create(title="Public Project", description="Public Description")
        url = reverse("project-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_unauthenticated_only_sees_published_projects(self, api_client):
        """Unauthentifizierte Nutzer sehen nur veröffentlichte Projekte."""
        Project.objects.create(title="Published", description="D1", is_published=True)
        Project.objects.create(title="Draft", description="D2", is_published=False)

        url = reverse("project-list")
        resp = api_client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]["title"] == "Published"

    def test_authenticated_sees_all_projects(self, auth_client):
        """Authentifizierte Nutzer sehen alle Projekte inklusive Entwürfe."""
        Project.objects.create(title="Published", description="D1", is_published=True)
        Project.objects.create(title="Draft", description="D2", is_published=False)

        url = reverse("project-list")
        resp = auth_client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_unauthenticated_cannot_create_project(self, api_client):
        """Unauthentifizierte Nutzer können keine Projekte erstellen."""
        url = reverse("project-list")
        payload = {"title": "Hack Attempt", "description": "No auth"}
        response = api_client.post(url, payload, format="json")
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_authenticated_can_create_project_with_skills(self, auth_client):
        """Authentifizierte Nutzer können Projekte mit Skills erstellen."""
        skill = Skill.objects.create(name="Django", category="backend")
        url = reverse("project-list")
        payload = {
            "title": "New Awesome Project",
            "description": "Built with Django & DRF",
            "github_url": "https://github.com/example/awesome",
            "skills": [skill.id],
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Project.objects.filter(title="New Awesome Project").exists()
        project = Project.objects.get(title="New Awesome Project")
        assert project.skills.count() == 1
        assert response.data["skill_details"][0]["name"] == "Django"


@pytest.mark.django_db
class TestSkillAPI:
    def test_unauthenticated_can_list_skills(self, api_client):
        Skill.objects.create(name="Python", category="backend", proficiency=95)
        url = reverse("skill-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["name"] == "Python"
        assert response.data[0]["category_display"] == "Backend"

    def test_authenticated_can_create_skill(self, auth_client):
        url = reverse("skill-list")
        payload = {
            "name": "Docker",
            "category": "devops",
            "proficiency": 85,
            "icon": "fa-brands fa-docker",
            "is_featured": True,
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Skill.objects.filter(name="Docker").exists()


@pytest.mark.django_db
class TestTimelineAPI:
    def test_unauthenticated_can_list_timeline(self, api_client):
        TimelineEntry.objects.create(
            entry_type="experience",
            title="Software Engineer",
            organization="Example Corp",
            start_date=datetime.date(2022, 1, 1),
        )
        url = reverse("timeline-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_authenticated_can_create_timeline_entry(self, auth_client):
        skill = Skill.objects.create(name="PostgreSQL", category="database")
        url = reverse("timeline-list")
        payload = {
            "entry_type": "experience",
            "title": "Backend Lead",
            "organization": "Startup Inc",
            "start_date": "2023-05-01",
            "is_current": True,
            "skills": [skill.id],
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert TimelineEntry.objects.filter(title="Backend Lead").exists()
        assert response.data["entry_type_display"] == "Berufserfahrung"
        assert len(response.data["skill_details"]) == 1

    def test_invalid_date_range_rejected(self, auth_client):
        url = reverse("timeline-list")
        payload = {
            "entry_type": "experience",
            "title": "Invalid Dates",
            "organization": "Startup Inc",
            "start_date": "2024-05-01",
            "end_date": "2023-01-01",
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "end_date" in response.data

    def test_current_with_end_date_rejected(self, auth_client):
        url = reverse("timeline-list")
        payload = {
            "entry_type": "experience",
            "title": "Invalid Current",
            "organization": "Startup Inc",
            "start_date": "2023-01-01",
            "end_date": "2024-01-01",
            "is_current": True,
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "end_date" in response.data


@pytest.mark.django_db
class TestProviderAPI:
    def test_unauthenticated_can_list_providers(self, api_client):
        Provider.objects.create(provider="Coursera", aktiv=True)
        url = reverse("provider-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert any(p["provider"] == "Coursera" for p in response.data)

    def test_authenticated_can_create_and_read_provider(self, auth_client):
        url = reverse("provider-list")
        payload = {
            "provider": "edX",
            "aktiv": True,
            "url": "https://edx.org",
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        get_res = auth_client.get(url)
        assert get_res.status_code == status.HTTP_200_OK
        assert any(p["provider"] == "edX" for p in get_res.data)


@pytest.mark.django_db
class TestCertificateAPI:
    def test_unauthenticated_can_list_certificates(self, api_client):
        provider = Provider.objects.create(provider="Linux Foundation")
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"Dummy content",
            content_type="application/pdf",
        )
        Certificate.objects.create(
            title="LFCS",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="a" * 64,
            is_published=True,
        )
        url = reverse("certificate-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert len(response.data["results"]) == 1
        assert (
            response.data["results"][0]["provider_details"]["provider"]
            == "Linux Foundation"
        )

    def test_unauthenticated_cannot_see_unpublished_certificates(self, api_client):
        provider = Provider.objects.create(provider="CompTIA")
        dummy_file = SimpleUploadedFile(
            "cert.pdf", b"data", content_type="application/pdf"
        )
        Certificate.objects.create(
            title="Security+",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="b" * 64,
            is_published=False,
        )
        url = reverse("certificate-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0
        assert len(response.data["results"]) == 0

    def test_authenticated_can_create_certificate_with_file(self, auth_client):
        provider = Provider.objects.create(provider="Amazon Web Services")
        url = reverse("certificate-list")
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"%PDF-1.4 Sample PDF Certificate Binary Content",
            content_type="application/pdf",
        )
        payload = {
            "title": "AWS Solutions Architect",
            "provider": provider.id,
            "pdf_file": dummy_file,
        }
        response = auth_client.post(url, payload, format="multipart")

        assert response.status_code == status.HTTP_201_CREATED
        assert Certificate.objects.filter(title="AWS Solutions Architect").exists()
        assert response.data["provider_details"]["provider"] == "Amazon Web Services"

    def test_unpaginated_results_with_no_page_or_all(self, api_client):
        provider = Provider.objects.create(provider="Linux Foundation")
        dummy_file = SimpleUploadedFile(
            "cert.pdf", b"data", content_type="application/pdf"
        )
        Certificate.objects.create(
            title="LFCS",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="c" * 64,
            is_published=True,
        )
        url = reverse("certificate-list")
        resp_no_page = api_client.get(f"{url}?no_page=true")
        assert resp_no_page.status_code == status.HTTP_200_OK
        assert isinstance(resp_no_page.data, list)
        assert len(resp_no_page.data) == 1

        resp_all = api_client.get(f"{url}?all=true")
        assert resp_all.status_code == status.HTTP_200_OK
        assert isinstance(resp_all.data, list)
        assert len(resp_all.data) == 1

    def test_pagination_page_and_page_size(self, api_client):
        provider = Provider.objects.create(provider="Linux Foundation")
        for i in range(3):
            dummy_file = SimpleUploadedFile(
                f"cert{i}.pdf", b"data", content_type="application/pdf"
            )
            Certificate.objects.create(
                title=f"Cert {i}",
                provider=provider,
                pdf_file=dummy_file,
                sha256_hash=f"{i}" * 64,
                is_published=True,
            )
        url = reverse("certificate-list")
        resp_page1 = api_client.get(f"{url}?page=1&page_size=2")
        assert resp_page1.status_code == status.HTTP_200_OK
        assert resp_page1.data["count"] == 3
        assert resp_page1.data["total_pages"] == 2
        assert resp_page1.data["current_page"] == 1
        assert len(resp_page1.data["results"]) == 2
        assert resp_page1.data["next"] is not None

        resp_page2 = api_client.get(f"{url}?page=2&page_size=2")
        assert resp_page2.status_code == status.HTTP_200_OK
        assert resp_page2.data["current_page"] == 2
        assert len(resp_page2.data["results"]) == 1
        assert resp_page2.data["previous"] is not None

    def test_filter_is_published_authenticated(self, auth_client):
        provider = Provider.objects.create(provider="Coursera")
        f1 = SimpleUploadedFile("c1.pdf", b"1", content_type="application/pdf")
        f2 = SimpleUploadedFile("c2.pdf", b"2", content_type="application/pdf")
        Certificate.objects.create(
            title="Published Cert",
            provider=provider,
            pdf_file=f1,
            sha256_hash="d" * 64,
            is_published=True,
        )
        Certificate.objects.create(
            title="Draft Cert",
            provider=provider,
            pdf_file=f2,
            sha256_hash="e" * 64,
            is_published=False,
        )
        url = reverse("certificate-list")

        # Authenticated: filter is_published=false
        auth_drafts = auth_client.get(f"{url}?is_published=false")
        assert auth_drafts.data["count"] == 1
        assert auth_drafts.data["results"][0]["title"] == "Draft Cert"

        # Authenticated: filter is_published=true
        auth_pub = auth_client.get(f"{url}?is_published=true")
        assert auth_pub.data["count"] == 1
        assert auth_pub.data["results"][0]["title"] == "Published Cert"

    def test_filter_is_published_unauthenticated_security(self, api_client):
        provider = Provider.objects.create(provider="Coursera")
        f1 = SimpleUploadedFile("c1.pdf", b"1", content_type="application/pdf")
        f2 = SimpleUploadedFile("c2.pdf", b"2", content_type="application/pdf")
        Certificate.objects.create(
            title="Published Cert",
            provider=provider,
            pdf_file=f1,
            sha256_hash="d" * 64,
            is_published=True,
        )
        Certificate.objects.create(
            title="Draft Cert",
            provider=provider,
            pdf_file=f2,
            sha256_hash="e" * 64,
            is_published=False,
        )
        url = reverse("certificate-list")

        # Unauthenticated: query is_published=false should still return 0 results
        unauth_resp = api_client.get(f"{url}?is_published=false")
        assert unauth_resp.data["count"] == 0

    def test_filter_incomplete(self, auth_client):
        provider = Provider.objects.create(provider="Coursera")
        f1 = SimpleUploadedFile("c1.pdf", b"1", content_type="application/pdf")
        f2 = SimpleUploadedFile("c2.pdf", b"2", content_type="application/pdf")
        f3 = SimpleUploadedFile("c3.pdf", b"3", content_type="application/pdf")

        # Incomplete 1: No issued_date
        Certificate.objects.create(
            title="Complete Title Without Date",
            provider=provider,
            pdf_file=f1,
            sha256_hash="f" * 64,
            issued_date=None,
        )
        # Incomplete 2: Has date, but title is raw filename pattern
        Certificate.objects.create(
            title="1712345678901.pdf",
            provider=provider,
            pdf_file=f2,
            sha256_hash="0" * 64,
            issued_date=datetime.date(2024, 1, 1),
        )
        # Complete: Has clean title and issued_date
        Certificate.objects.create(
            title="Verified Python Professional",
            provider=provider,
            pdf_file=f3,
            sha256_hash="1" * 64,
            issued_date=datetime.date(2024, 1, 1),
        )
        url = reverse("certificate-list")
        resp = auth_client.get(f"{url}?incomplete=true")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2
        titles = [c["title"] for c in resp.data["results"]]
        assert "Complete Title Without Date" in titles
        assert "1712345678901.pdf" in titles
        assert "Verified Python Professional" not in titles

    def test_filter_track(self, auth_client):
        provider = Provider.objects.create(provider="Test Provider")
        track = Track.objects.create(name="Cloud DevOps", slug="cloud-devops")
        f = SimpleUploadedFile("c.pdf", b"1", content_type="application/pdf")
        cert = Certificate.objects.create(
            title="Kubernetes Certified",
            provider=provider,
            pdf_file=f,
            sha256_hash="2" * 64,
            is_published=True,
        )
        cert.tracks.add(track)

        f2 = SimpleUploadedFile("c2.pdf", b"2", content_type="application/pdf")
        Certificate.objects.create(
            title="Django Advanced",
            provider=provider,
            pdf_file=f2,
            sha256_hash="3" * 64,
            is_published=True,
        )

        url = reverse("certificate-list")
        # Filter by track slug
        resp_slug = auth_client.get(f"{url}?track=cloud-devops")
        assert resp_slug.data["count"] == 1
        assert resp_slug.data["results"][0]["title"] == "Kubernetes Certified"

        # Filter by track ID
        resp_id = auth_client.get(f"{url}?track={track.id}")
        assert resp_id.data["count"] == 1
        assert resp_id.data["results"][0]["title"] == "Kubernetes Certified"

    def test_filter_provider_and_search(self, auth_client):
        p1 = Provider.objects.create(provider="Google Cloud")
        p2 = Provider.objects.create(provider="AWS")
        f1 = SimpleUploadedFile("c1.pdf", b"1", content_type="application/pdf")
        f2 = SimpleUploadedFile("c2.pdf", b"2", content_type="application/pdf")
        Certificate.objects.create(
            title="Cloud Architect",
            provider=p1,
            pdf_file=f1,
            sha256_hash="4" * 64,
            credential_id="GCP-ARCH-999",
            is_published=True,
        )
        Certificate.objects.create(
            title="Solutions Architect",
            provider=p2,
            pdf_file=f2,
            sha256_hash="5" * 64,
            credential_id="AWS-SA-111",
            is_published=True,
        )

        url = reverse("certificate-list")
        # Filter by provider id
        resp_p1 = auth_client.get(f"{url}?provider={p1.id}")
        assert resp_p1.data["count"] == 1
        assert resp_p1.data["results"][0]["title"] == "Cloud Architect"

        # Filter by provider name
        resp_p2 = auth_client.get(f"{url}?provider=AWS")
        assert resp_p2.data["count"] == 1
        assert resp_p2.data["results"][0]["title"] == "Solutions Architect"

        # Filter by search: title
        resp_search_title = auth_client.get(f"{url}?search=Solutions")
        assert resp_search_title.data["count"] == 1
        assert resp_search_title.data["results"][0]["title"] == "Solutions Architect"

        # Filter by search: credential_id
        resp_search_cred = auth_client.get(f"{url}?search=GCP-ARCH")
        assert resp_search_cred.data["count"] == 1
        assert resp_search_cred.data["results"][0]["title"] == "Cloud Architect"

    def test_authenticated_can_patch_certificate_review_and_publish(self, auth_client):
        provider = Provider.objects.create(provider="Coursera")
        track = Track.objects.create(name="Data Science", slug="data-science")
        dummy_file = SimpleUploadedFile(
            "cert.pdf", b"data", content_type="application/pdf"
        )
        cert = Certificate.objects.create(
            title="1712345678901.pdf",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="6" * 64,
            is_published=False,
            issued_date=None,
        )
        url = reverse("certificate-detail", kwargs={"pk": cert.pk})
        patch_payload = {
            "title": "Machine Learning Specialization",
            "issued_date": "2024-05-15",
            "is_published": True,
            "tracks": [track.id],
        }
        resp = auth_client.patch(url, patch_payload, format="json")
        assert resp.status_code == status.HTTP_200_OK
        cert.refresh_from_db()
        assert cert.title == "Machine Learning Specialization"
        assert str(cert.issued_date) == "2024-05-15"
        assert cert.is_published is True
        assert cert.tracks.filter(id=track.id).exists()

    def test_unauthenticated_cannot_patch_certificate(self, api_client):
        provider = Provider.objects.create(provider="Coursera")
        dummy_file = SimpleUploadedFile(
            "cert.pdf", b"data", content_type="application/pdf"
        )
        cert = Certificate.objects.create(
            title="Original Title",
            provider=provider,
            pdf_file=dummy_file,
            sha256_hash="7" * 64,
            is_published=True,
        )
        url = reverse("certificate-detail", kwargs={"pk": cert.pk})
        resp = api_client.patch(url, {"title": "Hacked Title"}, format="json")
        assert resp.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]
        cert.refresh_from_db()
        assert cert.title == "Original Title"

    def test_unauthenticated_can_search_published_certificates(self, api_client):
        p = Provider.objects.create(provider="Harvard")
        f1 = SimpleUploadedFile("c1.pdf", b"1", content_type="application/pdf")
        f2 = SimpleUploadedFile("c2.pdf", b"2", content_type="application/pdf")
        Certificate.objects.create(
            title="CS50x Introduction to Computer Science",
            provider=p,
            pdf_file=f1,
            sha256_hash="8" * 64,
            is_published=True,
        )
        Certificate.objects.create(
            title="CS50 Web Programming (Draft)",
            provider=p,
            pdf_file=f2,
            sha256_hash="9" * 64,
            is_published=False,
        )
        url = reverse("certificate-list")
        resp = api_client.get(f"{url}?search=CS50")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert (
            resp.data["results"][0]["title"] == "CS50x Introduction to Computer Science"
        )

    def test_unauthenticated_cannot_publish_or_unpublish(self, api_client):
        provider = Provider.objects.create(provider="MIT")
        f = SimpleUploadedFile("cert.pdf", b"data", content_type="application/pdf")
        cert = Certificate.objects.create(
            title="MIT AI",
            provider=provider,
            pdf_file=f,
            sha256_hash="f0" * 32,
            is_published=False,
        )
        publish_url = reverse("certificate-publish", kwargs={"pk": cert.pk})
        unpublish_url = reverse("certificate-unpublish", kwargs={"pk": cert.pk})

        resp_pub = api_client.post(publish_url)
        assert resp_pub.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

        resp_unpub = api_client.post(unpublish_url)
        assert resp_unpub.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_authenticated_can_publish_and_unpublish(self, auth_client):
        provider = Provider.objects.create(provider="MIT")
        f = SimpleUploadedFile("cert.pdf", b"data", content_type="application/pdf")
        cert = Certificate.objects.create(
            title="MIT AI",
            provider=provider,
            pdf_file=f,
            sha256_hash="f1" * 32,
            is_published=False,
        )
        publish_url = reverse("certificate-publish", kwargs={"pk": cert.pk})
        unpublish_url = reverse("certificate-unpublish", kwargs={"pk": cert.pk})

        auth_resp = auth_client.post(publish_url)
        assert auth_resp.status_code == status.HTTP_200_OK
        assert auth_resp.data["is_published"] is True
        cert.refresh_from_db()
        assert cert.is_published is True

        unpub_resp = auth_client.post(unpublish_url)
        assert unpub_resp.status_code == status.HTTP_200_OK
        assert unpub_resp.data["is_published"] is False
        cert.refresh_from_db()
        assert cert.is_published is False

    def test_unauthenticated_cannot_extract_metadata(self, api_client):
        provider = Provider.objects.create(provider="Coursera")
        f = SimpleUploadedFile(
            "cert.pdf", b"%PDF-1.4 header", content_type="application/pdf"
        )
        cert = Certificate.objects.create(
            title="1712345678901.pdf",
            provider=provider,
            pdf_file=f,
            sha256_hash="e1" * 32,
        )
        url = reverse("certificate-extract-metadata", kwargs={"pk": cert.pk})
        resp = api_client.post(url)
        assert resp.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_authenticated_can_extract_metadata(self, auth_client, monkeypatch):
        provider = Provider.objects.create(provider="Coursera")
        track = Track.objects.create(name="Python & Django", slug="python-django")
        f = SimpleUploadedFile(
            "Coursera_Python_Specialization.pdf",
            b"%PDF-1.4 header",
            content_type="application/pdf",
        )
        cert = Certificate.objects.create(
            title="Coursera_Python_Specialization.pdf",
            provider=provider,
            pdf_file=f,
            sha256_hash="e2" * 32,
        )

        class DummyPage:
            def extract_text(self):
                return (
                    "Completed by John Doe: Python & Django Development at Coursera. "
                    "Issue Date: 12.05.2023. Credential ID: COURSERA-12345"
                )

        class DummyReader:
            def __init__(self):
                self.metadata = None
                self.pages = [DummyPage()]

        import portfolio.services.extractor as extractor_module

        monkeypatch.setattr(
            extractor_module, "PdfReader", lambda _f: DummyReader()
        )

        url = reverse("certificate-extract-metadata", kwargs={"pk": cert.pk})
        resp = auth_client.post(url)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data
        assert data["guessed_provider"] == "Coursera"
        assert "python-django" in data["guessed_track_slugs"]
        assert track.id in data["matched_track_ids"]
        assert data["matched_provider"]["id"] == provider.id
        assert data["credential_id"] == "COURSERA-12345"
        assert data["issued_date"] == "2023-05-12"

