import datetime

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from portfolio.models import Certificate, Project, Provider, Skill, TimelineEntry


@pytest.mark.django_db
class TestProjectAPI:
    def test_unauthenticated_can_list_projects(self, api_client):
        """Unauthentifizierte Nutzer können Projekte abrufen (Read-Only)."""
        Project.objects.create(title="Public Project", description="Public Description")
        url = reverse("project-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

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


@pytest.mark.django_db
class TestProviderAPI:
    def test_unauthenticated_can_list_providers(self, api_client):
        Provider.objects.create(provider="Coursera", aktiv=True)
        url = reverse("provider-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

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
        Certificate.objects.create(title="LFCS", provider=provider, pdf_file=dummy_file)
        url = reverse("certificate-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["provider_details"]["provider"] == "Linux Foundation"

    def test_authenticated_can_create_certificate_with_file(self, auth_client):
        provider = Provider.objects.create(provider="Amazon Web Services")
        url = reverse("certificate-list")
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"Sample PDF Certificate Binary Content",
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
