import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from portfolio.models import Certificate, Project


@pytest.mark.django_db
class TestProjectAPI:
    def test_unauthenticated_cannot_list_projects(self, api_client):
        url = reverse("project-list")
        response = api_client.get(url)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_authenticated_can_list_projects(self, auth_client):
        Project.objects.create(title="Project Alpha", description="Description Alpha")
        url = reverse("project-list")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["title"] == "Project Alpha"

    def test_authenticated_can_create_project(self, auth_client):
        url = reverse("project-list")
        payload = {
            "title": "New Awesome Project",
            "description": "Built with Django & DRF",
            "github_url": "https://github.com/example/awesome",
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Project.objects.filter(title="New Awesome Project").exists()


@pytest.mark.django_db
class TestProviderAPI:
    def test_unauthenticated_cannot_list_providers(self, api_client):
        url = reverse("provider-list")
        response = api_client.get(url)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_authenticated_can_create_and_read_provider(self, auth_client):
        url = reverse("provider-list")
        payload = {
            "provider": "Coursera",
            "aktiv": True,
            "url": "https://coursera.org",
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        get_res = auth_client.get(url)
        assert get_res.status_code == status.HTTP_200_OK
        assert len(get_res.data) == 1
        assert get_res.data[0]["provider"] == "Coursera"


@pytest.mark.django_db
class TestCertificateAPI:
    def test_unauthenticated_cannot_list_certificates(self, api_client):
        url = reverse("certificate-list")
        response = api_client.get(url)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_authenticated_can_create_certificate_with_file(self, auth_client):
        url = reverse("certificate-list")
        dummy_file = SimpleUploadedFile(
            name="cert.pdf",
            content=b"Sample PDF Certificate Binary Content",
            content_type="application/pdf",
        )
        payload = {
            "title": "AWS Solutions Architect",
            "issuer": "Amazon Web Services",
            "pdf_file": dummy_file,
        }
        response = auth_client.post(url, payload, format="multipart")

        assert response.status_code == status.HTTP_201_CREATED
        assert Certificate.objects.filter(title="AWS Solutions Architect").exists()
