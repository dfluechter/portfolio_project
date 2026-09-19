from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from portfolio.views import (
    CertificateViewSet,
    ProjectViewSet,
    ProviderViewSet,
    SkillViewSet,
    TimelineEntryViewSet,
    dashboard_view,
    health_check_view,
    login_view,
    logout_view,
)

# Registrierung der REST-API-Routen
router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"providers", ProviderViewSet, basename="provider")
router.register(r"certificates", CertificateViewSet, basename="certificate")
router.register(r"skills", SkillViewSet, basename="skill")
router.register(r"timeline", TimelineEntryViewSet, basename="timeline")

urlpatterns = [
    path("", login_view, name="login"),
    path("admin/", admin.site.urls),
    path("health_check", health_check_view, name="health_check"),
    path("dashboard/", dashboard_view, name="dashboard"),
    path("logout/", logout_view, name="logout"),
    # REST-API Endpunkte
    path("api/", include(router.urls)),
    path("api/auth/", include("djoser.urls")),
    path("api/auth/", include("djoser.urls.jwt")),
    # OpenAPI / Swagger Dokumentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
