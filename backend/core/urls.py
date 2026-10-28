from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from portfolio.views import (
    AIChatView,
    CertificateViewSet,
    PasswordResetRequestView,
    PendingCertificateViewSet,
    ProjectViewSet,
    ProviderViewSet,
    SkillViewSet,
    TimelineEntryViewSet,
    TrackViewSet,
    api_root_view,
    health_check_view,
)

# Registrierung der REST-API-Routen
router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"providers", ProviderViewSet, basename="provider")
router.register(r"certificates", CertificateViewSet, basename="certificate")
router.register(r"skills", SkillViewSet, basename="skill")
router.register(r"timeline", TimelineEntryViewSet, basename="timeline")
router.register(r"tracks", TrackViewSet, basename="track")
router.register(
    r"pending-certificates", PendingCertificateViewSet, basename="pendingcertificate"
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health_check", health_check_view, name="health_check"),
    path("health/", health_check_view, name="health"),
    path("api/ai/chat/", AIChatView.as_view(), name="ai-chat"),
    # REST-API Endpunkte
    path(
        "api/auth/password-reset/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
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
    # React Frontend SPA (Startseite)
    path("", api_root_view, name="backend-root"),
]

if getattr(settings, "SERVE_FRONTEND", True):
    urlpatterns.append(
        re_path(
            r"^(?!api/|admin/|static/|media/|health_check|health/).*",
            api_root_view,
            name="spa-catchall",
        )
    )

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
