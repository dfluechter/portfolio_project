from django.urls import include, path
from rest_framework.routers import DefaultRouter

from portfolio.views import (
    CertificateViewSet,
    ProjectViewSet,
    ProviderViewSet,
    dashboard_view,
    login_view,
    logout_view,
)

# Registrierung der REST-API-Routen
router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"providers", ProviderViewSet, basename="provider")
router.register(r"certificates", CertificateViewSet, basename="certificate")

urlpatterns = [
    path("", login_view, name="login"),
    path("dashboard/", dashboard_view, name="dashboard"),
    path("logout/", logout_view, name="logout"),
    # REST-API Endpunkte
    path("api/", include(router.urls)),
    path("api/auth/", include("djoser.urls")),
    path("api/auth/", include("djoser.urls.jwt")),
]
