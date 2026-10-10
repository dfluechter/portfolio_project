import pytest
from django.urls import reverse
from rest_framework import status

from portfolio.models import Project


@pytest.mark.django_db
class TestProjectCRUD:
    def test_retrieve_project(self, api_client):
        project = Project.objects.create(title="CRUD Project", description="Test")
        url = reverse("project-detail", kwargs={"pk": project.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "CRUD Project"

    def test_unauthenticated_cannot_update_project(self, api_client):
        project = Project.objects.create(title="Old Title", description="Test")
        url = reverse("project-detail", kwargs={"pk": project.pk})
        response = api_client.put(url, {"title": "New Title"}, format="json")
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_authenticated_can_update_project(self, auth_client):
        project = Project.objects.create(title="Old Title", description="Test")
        url = reverse("project-detail", kwargs={"pk": project.pk})
        response = auth_client.put(
            url, {"title": "New Title", "description": "Test"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "New Title"

    def test_authenticated_can_partial_update_project(self, auth_client):
        project = Project.objects.create(title="Old Title", description="Old Desc")
        url = reverse("project-detail", kwargs={"pk": project.pk})
        response = auth_client.patch(url, {"title": "Patched Title"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Patched Title"
        assert response.data["description"] == "Old Desc"

    def test_unauthenticated_cannot_delete_project(self, api_client):
        project = Project.objects.create(title="Delete Me", description="Test")
        url = reverse("project-detail", kwargs={"pk": project.pk})
        response = api_client.delete(url)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]
        assert Project.objects.filter(pk=project.pk).exists()

    def test_authenticated_can_delete_project(self, auth_client):
        project = Project.objects.create(title="Delete Me", description="Test")
        url = reverse("project-detail", kwargs={"pk": project.pk})
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Project.objects.filter(pk=project.pk).exists()
