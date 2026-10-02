import hashlib
import json
import os

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.files.base import ContentFile
from django.http import HttpResponseNotAllowed, JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import (
    Certificate,
    PendingCertificate,
    PendingCertificateStatus,
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


class CertificateViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.all().select_related("provider")
    serializer_class = CertificateSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class TimelineEntryViewSet(viewsets.ModelViewSet):
    queryset = TimelineEntry.objects.all().prefetch_related("skills")
    serializer_class = TimelineEntrySerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class TrackViewSet(viewsets.ModelViewSet):
    queryset = Track.objects.all().prefetch_related("certificates")
    serializer_class = TrackSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class PendingCertificateViewSet(viewsets.ModelViewSet):
    """Nur für Staff-Nutzer – nie öffentlich lesbar."""

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
        if pending.status != PendingCertificateStatus.PENDING:
            return Response({"detail": "Bereits verarbeitet."}, status=400)

        title = request.data.get("title", pending.guessed_title)
        provider_name = request.data.get("provider", pending.guessed_provider)
        track_ids = request.data.get("track_ids", [])

        if not title or not provider_name:
            return Response(
                {"detail": "Titel und Anbieter sind erforderlich."}, status=400
            )

        provider, _ = Provider.objects.get_or_create(
            provider=provider_name, defaults={"aktiv": True}
        )

        tracks = []
        for track_id in track_ids:
            try:
                tracks.append(Track.objects.get(pk=track_id))
            except Track.DoesNotExist:
                return Response(
                    {"detail": f"Track {track_id} nicht gefunden."}, status=400
                )

        if not os.path.exists(pending.file_path):
            return Response(
                {"detail": "Datei existiert nicht mehr lokal."}, status=400
            )

        # SHA-256 berechnen und Duplikat prüfen
        sha256 = hashlib.sha256()
        with open(pending.file_path, "rb") as f:
            file_bytes = f.read()
            sha256.update(file_bytes)
        file_hash = sha256.hexdigest()

        if Certificate.objects.filter(sha256_hash=file_hash).exists():
            return Response(
                {"detail": "Zertifikat mit identischem Dateiinhalt existiert bereits."},
                status=400,
            )

        file_content = ContentFile(file_bytes)
        ext = os.path.splitext(pending.file_path)[1].lower()
        content_types = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        }
        file_content.content_type = content_types.get(  # type: ignore[attr-defined]
            ext, "application/octet-stream"
        )

        cert = Certificate(
            title=title,
            provider=provider,
            sha256_hash=file_hash,
            is_published=False,
        )
        cert.pdf_file.save(pending.original_file_name, file_content, save=True)

        if tracks:
            cert.tracks.set(tracks)

        pending.status = PendingCertificateStatus.APPROVED
        pending.save()
        return Response({"detail": "Erfolgreich freigegeben."})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        pending = self.get_object()
        pending.status = PendingCertificateStatus.REJECTED
        pending.save()
        return Response({"detail": "Abgelehnt."})
