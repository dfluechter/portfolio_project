import hashlib
import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Prefetch, ProtectedError
from django.http import HttpResponseNotAllowed, JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import (
    Certificate,
    PendingCertificate,
    Project,
    Provider,
    Skill,
    TimelineEntry,
    Track,
)
from .serializers import (
    CertificateSerializer,
    PendingCertificateDetailSerializer,
    PendingCertificateSerializer,
    ProjectSerializer,
    ProviderSerializer,
    SkillSerializer,
    TimelineEntrySerializer,
    TrackSerializer,
)
from .services.promotion import (
    PromotionError,
    promote_pending_certificate,
    reject_pending_certificate,
)


def login_view(request):
    if request.method not in ["GET", "POST"]:
        return HttpResponseNotAllowed(["GET", "POST"])

    # Falls der User bereits angemeldet ist, leiten wir direkt auf das Dashboard weiter
    if request.user.is_authenticated:
        return redirect("/dashboard/")

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Ungültiges JSON-Format."}, status=400)

        if not email or not password:
            return JsonResponse(
                {"detail": "E-Mail und Passwort müssen ausgefüllt sein."}, status=400
            )

        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({"success": True})
        else:
            return JsonResponse(
                {"detail": "E-Mail-Adresse oder Passwort ungültig."}, status=400
            )

    return render(request, "login.html")


@login_required(login_url="/")
def dashboard_view(request):
    """
    Rendert die Portfolio-Verwaltungsseite (Dashboard).
    """
    return render(request, "dashboard.html")


@require_POST
def logout_view(request):
    """
    Meldet den Benutzer ab und leitet auf die Login-Seite weiter.
    """
    logout(request)
    return redirect("/")


def health_check_view(request):
    """
    Einfacher Health-Check-Endpunkt für Render und Monitoring.
    """
    return JsonResponse({"status": "ok"})


# ── API ViewSets für CRUD-Operationen ──


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().prefetch_related("skills")
    serializer_class = ProjectSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class ProviderViewSet(viewsets.ModelViewSet):
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "detail": "Anbieter kann nicht gelöscht werden, "
                    "solange ihm Zertifikate zugeordnet sind."
                },
                status=status.HTTP_409_CONFLICT,
            )


class CertificateViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)

    def get_queryset(self):
        qs = Certificate.objects.all().select_related("provider")
        if not self.request.user.is_authenticated:
            qs = qs.filter(is_published=True)
        return qs

    def perform_create(self, serializer):
        """Berechnet SHA-256 aus der hochgeladenen Datei vor dem Speichern."""
        pdf_file = self.request.FILES.get("pdf_file")
        if pdf_file:
            sha256 = hashlib.sha256()
            for chunk in pdf_file.chunks():
                sha256.update(chunk)
            pdf_file.seek(0)  # Datei-Cursor zurücksetzen für Storage
            serializer.save(sha256_hash=sha256.hexdigest())
        else:
            serializer.save()


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class TimelineEntryViewSet(viewsets.ModelViewSet):
    queryset = TimelineEntry.objects.all().prefetch_related("skills")
    serializer_class = TimelineEntrySerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class TrackViewSet(viewsets.ModelViewSet):
    queryset = Track.objects.all().prefetch_related(
        Prefetch(
            "certificates",
            queryset=Certificate.objects.select_related("provider").prefetch_related(
                "tracks"
            ),
        )
    )
    serializer_class = TrackSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class PendingCertificateViewSet(viewsets.ModelViewSet):
    """Nur für Staff-Nutzer - nie öffentlich lesbar."""

    queryset = PendingCertificate.objects.all()
    serializer_class = PendingCertificateSerializer
    permission_classes = (IsAdminUser,)

    def get_serializer_class(self):
        """Detail-Ansicht liefert extracted_text mit, Liste nicht."""
        if self.action == "retrieve":
            return PendingCertificateDetailSerializer
        return PendingCertificateSerializer

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        pending = self.get_object()
        title = request.data.get("title")
        provider_name = request.data.get("provider")
        track_ids = request.data.get("track_ids")

        tracks = None
        if track_ids is not None:
            tracks = []
            for track_id in track_ids:
                try:
                    tracks.append(Track.objects.get(pk=track_id))
                except Track.DoesNotExist:
                    return Response(
                        {"detail": f"Track {track_id} nicht gefunden."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        try:
            cert = promote_pending_certificate(
                pending=pending,
                title=title,
                provider_name=provider_name,
                tracks=tracks,
            )
        except PromotionError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": "Erfolgreich freigegeben.",
                "certificate_id": cert.id,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        pending = self.get_object()
        try:
            reject_pending_certificate(pending)
        except PromotionError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Abgelehnt."}, status=status.HTTP_200_OK)
