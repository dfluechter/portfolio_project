import hashlib
import json
import logging
import tempfile
from pathlib import Path

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Prefetch, ProtectedError, Q
from django.http import HttpResponseNotAllowed, JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import (
    IsAdminUser,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response

from .models import (
    TRACK_RULES,
    Certificate,
    PendingCertificate,
    Project,
    Provider,
    Skill,
    TimelineEntry,
    Track,
)
from .pagination import StandardResultsSetPagination
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
from .services.extractor import extract_metadata
from .services.promotion import (
    PromotionError,
    promote_pending_certificate,
    reject_pending_certificate,
)
from .services.storage import ensure_certificate_in_storage

logger = logging.getLogger(__name__)


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
    serializer_class = ProjectSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)

    def get_queryset(self):
        qs = Project.objects.all().prefetch_related("skills")
        if not self.request.user.is_authenticated:
            qs = qs.filter(is_published=True)
        return qs


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
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = (
            Certificate.objects.all()
            .select_related("provider")
            .prefetch_related("tracks")
        )
        params = self.request.query_params

        # 1. Öffentliche Sichtbarkeit: Anonyme Nutzer sehen ausschließlich veröffentlichte Zertifikate
        if not self.request.user.is_authenticated:
            qs = qs.filter(is_published=True)
            # Falls ein anonymer Nutzer explizit unpublished anfordert: leere Menge zurückgeben
            is_pub_param = params.get("is_published")
            if is_pub_param is not None and is_pub_param.lower() in ("false", "0"):
                return qs.none()
        else:
            # 2. Filter nach is_published (nur für eingeloggte Admins/Staff)
            is_pub_param = params.get("is_published")
            if is_pub_param is not None:
                if is_pub_param.lower() in ("true", "1"):
                    qs = qs.filter(is_published=True)
                elif is_pub_param.lower() in ("false", "0"):
                    qs = qs.filter(is_published=False)

        # 3. Filter nach unvollständigen Metadaten (Review-Modus)
        # Unvollständig = fehlendes Ausstellungsdatum ODER generierter/roher Dateiname als Titel
        if params.get("incomplete", "").lower() in ("true", "1"):
            qs = qs.filter(
                Q(issued_date__isnull=True)
                | Q(
                    title__iregex=r"^(1[67][0-9]{10}|share[0-9]+|UC-[a-f0-9-]+|\.trashed-)"
                )
                | Q(title__iendswith=".pdf")
                | Q(title__iendswith=".jpg")
                | Q(title__iendswith=".png")
            )

        # 4. Filter nach Track (ID oder Slug)
        track_param = params.get("track")
        if track_param:
            if track_param.isdigit():
                qs = qs.filter(tracks__id=int(track_param))
            else:
                qs = qs.filter(tracks__slug=track_param)

        # 5. Filter nach Provider (ID oder Name)
        provider_param = params.get("provider")
        if provider_param:
            if provider_param.isdigit():
                qs = qs.filter(provider__id=int(provider_param))
            else:
                qs = qs.filter(provider__provider__icontains=provider_param)

        # 6. Suchbegriff (Titel, Provider, Credential-ID)
        search_param = params.get("search")
        if search_param:
            qs = qs.filter(
                Q(title__icontains=search_param)
                | Q(provider__provider__icontains=search_param)
                | Q(credential_id__icontains=search_param)
            )

        return qs.distinct()

    def perform_create(self, serializer):
        """Berechnet SHA-256 aus der hochgeladenen Datei vor dem Speichern und erzwingt Entwurfsstatus."""
        pdf_file = self.request.FILES.get("pdf_file")
        if pdf_file:
            sha256 = hashlib.sha256()
            for chunk in pdf_file.chunks():
                sha256.update(chunk)
            pdf_file.seek(0)  # Datei-Cursor zurücksetzen für Storage
            serializer.save(sha256_hash=sha256.hexdigest(), is_published=False)
        else:
            serializer.save(is_published=False)

    def perform_update(self, serializer):
        """Erlaubt autorisierten Nutzern das Ändern des Veröffentlichungsstatus bei Updates."""
        if "is_published" in self.request.data:
            is_pub = self.request.data.get("is_published")
            if isinstance(is_pub, str):
                is_pub = is_pub.lower() in ("true", "1")
            is_pub_bool = bool(is_pub)
            instance = serializer.instance
            if is_pub_bool and (instance is None or not instance.is_published):
                ensure_certificate_in_storage(instance or serializer.instance)
            serializer.save(is_published=is_pub_bool)
        else:
            serializer.save()

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def publish(self, request, pk=None):
        """Dedizierter Endpoint zur Veröffentlichung eines geprüften Zertifikats.

        Stellt sicher, dass das Zertifikat im S3-Storage abgelegt wird.
        """
        cert = self.get_object()
        ensure_certificate_in_storage(cert)
        cert.is_published = True
        cert.save()
        return Response({"status": "published", "is_published": True})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def unpublish(self, request, pk=None):
        """Dedizierter Endpoint zum Zurückziehen eines Zertifikats."""
        cert = self.get_object()
        cert.is_published = False
        cert.save(update_fields=["is_published"])
        return Response({"status": "unpublished", "is_published": False})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def extract_metadata(self, request, pk=None):
        """Führt eine zweistufige On-Demand Extraktion (Textschicht + OCR) für das Zertifikat aus."""
        cert = self.get_object()
        if not cert.pdf_file:
            return Response(
                {"detail": "Keine Dokumentendatei für dieses Zertifikat gefunden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        suffix = Path(cert.pdf_file.name).suffix.lower() or ".pdf"
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
                for chunk in cert.pdf_file.chunks():
                    tmp_file.write(chunk)
                tmp_path = Path(tmp_file.name)

            try:
                known_providers = list(
                    Provider.objects.values_list("provider", flat=True)
                )
                result = extract_metadata(
                    file_path=tmp_path,
                    source_root=tmp_path.parent,
                    track_rules=TRACK_RULES,
                    enable_ocr=True,
                    known_providers=known_providers,
                )
            finally:
                if tmp_path.exists():
                    tmp_path.unlink()

            if not result:
                return Response(
                    {"detail": "Konnte keine Metadaten aus dem Dokument extrahieren."},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

            # Zugeordnete Track-IDs ermitteln basierend auf gefundenen Slugs
            matched_track_ids = list(
                Track.objects.filter(
                    slug__in=result.guessed_track_slugs
                ).values_list("id", flat=True)
            )

            # Zugeordneten Provider ermitteln oder matchen
            matched_provider = None
            if result.guessed_provider:
                p = Provider.objects.filter(
                    provider__iexact=result.guessed_provider
                ).first()
                if p:
                    matched_provider = {"id": p.id, "provider": p.provider}

            return Response(
                {
                    "guessed_title": result.guessed_title,
                    "guessed_provider": result.guessed_provider,
                    "matched_provider": matched_provider,
                    "credential_id": result.credential_id,
                    "issued_date": result.issued_date,
                    "guessed_track_slugs": result.guessed_track_slugs,
                    "matched_track_ids": matched_track_ids,
                    "extracted_text_preview": (
                        (result.extracted_text[:400] + "...")
                        if result.extracted_text
                        else ""
                    ),
                    "ocr_pending": result.ocr_pending,
                    "source_type": result.source_type,
                }
            )
        except Exception as e:
            logger.exception("Fehler bei der On-Demand-Metadatenextraktion.")
            return Response(
                {"detail": f"Fehler bei der Metadatenanalyse: {e!s}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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
