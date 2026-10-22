import hashlib
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

from django.core.cache import cache
from django.db import connection
from django.db.models import Prefetch, ProtectedError, Q, QuerySet
from django.http import (
    FileResponse,
    HttpRequest,
    HttpResponse,
    HttpResponseNotModified,
    JsonResponse,
)
from django.shortcuts import redirect
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import (
    AllowAny,
    IsAdminUser,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

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
from .services.ai_assistant import RAG_VERSION_KEY, answer_portfolio_query
from .services.extractor import extract_metadata
from .services.icon_service import ensure_track_icon
from .services.promotion import (
    PromotionError,
    promote_pending_certificate,
    reject_pending_certificate,
)
from .services.storage import (
    S3StorageNotConfiguredError,
    ensure_certificate_in_storage,
    generate_presigned_upload,
    verify_s3_uploaded_certificate,
)

logger = logging.getLogger(__name__)

PUBLISH_TRACK_REQUIRED_MESSAGE = "Ein Zertifikat kann nur veröffentlicht werden, wenn mindestens ein Track zugewiesen ist."


def _parse_bool_param(value: object) -> bool | None:
    """
    Parst boolesche Query- und Request-Parameter sauber.

    Unterstützt native bool (True/False) und Strings ('true', '1' -> True; 'false', '0' -> False,
    jeweils case-insensitive). Gibt None zurück, wenn der Wert nicht eindeutig als bool
    interpretiert werden kann.
    """
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        val = value.strip().lower()
        if val in ("true", "1"):
            return True
        if val in ("false", "0"):
            return False
    return None


def api_root_view(request: HttpRequest) -> HttpResponse:
    """
    Einstiegspunkt für das Headless-Backend:
    Leitet Browser auf Swagger-UI weiter oder liefert JSON-Metadaten.
    """
    accept_header = request.headers.get("Accept", "")
    if "text/html" in accept_header:
        return redirect("/api/docs/")

    return JsonResponse(
        {
            "name": "Portfolio API",
            "version": "1.0.0",
            "status": "online",
            "docs_url": "/api/docs/",
            "schema_url": "/api/schema/",
            "health_url": "/health_check",
        }
    )


def health_check_view(request: HttpRequest) -> JsonResponse:
    """
    Health-Check-Endpunkt für Render, Load-Balancer und Monitoring.
    Führt einen Datenbank-Konnektivitäts-Check durch und liefert Status 503 bei DB-Ausfall.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        logger.exception("Health-Check fehlgeschlagen: Datenbank nicht erreichbar.")
        return JsonResponse(
            {"status": "error", "database": "unavailable"},
            status=503,
        )
    return JsonResponse({"status": "ok"})


# ── API ViewSets für CRUD-Operationen ──


class ConditionalCacheMixin:
    """
    HTTP Conditional Caching Mixin für DRF ViewSets.

    Berechnet schwache ETags basierend auf dem Ressourcennamen, Parametern und der
    atomaren Cache-Version (portfolio_rag_context_version_v1).
    Liefert schnelles HTTP 304 Not Modified bei übereinstimmendem If-None-Match
    für unauthentifizierte GET/HEAD Anfragen, ohne SQL-Queries oder Serialisierung.
    """

    def _get_cache_version(self) -> int | str:
        version = cache.get(RAG_VERSION_KEY)
        return version if version is not None else 1

    def _get_etag(self, request: Request) -> str:
        version = self._get_cache_version()
        basename = getattr(self, "basename", None) or getattr(
            getattr(self, "queryset", None), "model", None
        )
        if basename and hasattr(basename, "__name__"):
            resource_name = basename.__name__.lower()
        elif isinstance(basename, str):
            resource_name = basename.lower()
        else:
            resource_name = self.__class__.__name__.lower()

        query_str = request.META.get("QUERY_STRING", "")
        pk = getattr(self, "kwargs", {}).get("pk") or getattr(
            self, "kwargs", {}
        ).get("id")
        scope = f"{resource_name}_{pk}" if pk else resource_name

        if query_str:
            query_hash = hashlib.md5(query_str.encode("utf-8")).hexdigest()[:8]
            return f'W/"{scope}_v{version}_{query_hash}"'
        return f'W/"{scope}_v{version}"'

    def check_conditional_cache(self, request: Request) -> HttpResponse | None:
        if request.method in ("GET", "HEAD") and not request.user.is_authenticated:
            if_none_match = request.META.get("HTTP_IF_NONE_MATCH")
            if if_none_match:
                etag = self._get_etag(request)
                req_etags = [e.strip() for e in if_none_match.split(",")]
                if etag in req_etags or "*" in req_etags:
                    response = HttpResponseNotModified()
                    response["ETag"] = etag
                    response["Cache-Control"] = (
                        "public, max-age=300, stale-while-revalidate=60"
                    )
                    return response
        return None

    def list(
        self, request: Request, *args: Any, **kwargs: Any
    ) -> Response | HttpResponse:
        cached_response = self.check_conditional_cache(request)
        if cached_response is not None:
            return cached_response
        return super().list(request, *args, **kwargs)  # type: ignore[misc]

    def retrieve(
        self, request: Request, *args: Any, **kwargs: Any
    ) -> Response | HttpResponse:
        cached_response = self.check_conditional_cache(request)
        if cached_response is not None:
            return cached_response
        return super().retrieve(request, *args, **kwargs)  # type: ignore[misc]

    def finalize_response(
        self, request: Request, response: Response, *args: Any, **kwargs: Any
    ) -> Response:
        response = super().finalize_response(request, response, *args, **kwargs)  # type: ignore[misc]
        if request.method in ("GET", "HEAD"):
            if not request.user.is_authenticated:
                etag = self._get_etag(request)
                response["ETag"] = etag
                response["Cache-Control"] = (
                    "public, max-age=300, stale-while-revalidate=60"
                )
            else:
                response["Cache-Control"] = "no-cache, private"
        return response


class ProjectViewSet(ConditionalCacheMixin, viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)

    def get_queryset(self) -> QuerySet[Project]:
        qs = Project.objects.all().prefetch_related("skills")
        if not self.request.user.is_authenticated:
            qs = qs.filter(is_published=True)
        return qs


class ProviderViewSet(ConditionalCacheMixin, viewsets.ModelViewSet):
    serializer_class = ProviderSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)

    def get_queryset(self) -> QuerySet[Provider]:
        qs = Provider.objects.all()
        has_certs = _parse_bool_param(self.request.query_params.get("has_certificates"))
        if has_certs is True:
            qs = qs.filter(certificates__isnull=False).distinct()
        return qs

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
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


class CertificateViewSet(ConditionalCacheMixin, viewsets.ModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    pagination_class = StandardResultsSetPagination

    def get_queryset(self) -> QuerySet[Certificate]:
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
            is_pub_param = _parse_bool_param(params.get("is_published"))
            if is_pub_param is False:
                return qs.none()
        # 2. Filter nach is_published (nur für eingeloggte Admins/Staff)
        else:
            is_pub_param = _parse_bool_param(params.get("is_published"))
            if is_pub_param is not None:
                qs = qs.filter(is_published=is_pub_param)

        # 3. Filter nach unvollständigen Metadaten (Review-Modus)
        # Unvollständig = fehlendes Ausstellungsdatum ODER generierter/roher Dateiname als Titel
        if _parse_bool_param(params.get("incomplete")) is True:
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

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        try:
            return super().create(request, *args, **kwargs)
        except S3StorageNotConfiguredError as err:
            return Response(
                {"detail": str(err)},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        """Berechnet SHA-256 aus der Datei oder verifiziert Direct-S3-Uploads (US 10.2)."""
        pdf_file = self.request.FILES.get("pdf_file")
        storage_key = self.request.data.get("storage_key")

        if pdf_file:
            sha256 = hashlib.sha256()
            for chunk in pdf_file.chunks():
                sha256.update(chunk)
            pdf_file.seek(0)  # Datei-Cursor zurücksetzen für Storage
            serializer.save(
                sha256_hash=sha256.hexdigest(),
                storage_key=storage_key or "",
                is_published=False,
            )
        elif storage_key:
            client_hash = self.request.data.get("sha256_hash")
            try:
                sha256_val = verify_s3_uploaded_certificate(
                    storage_key=str(storage_key),
                    client_hash=str(client_hash) if client_hash else None,
                )
            except ValueError as err:
                raise serializers.ValidationError({"storage_key": str(err)}) from err

            serializer.save(
                pdf_file=storage_key,
                storage_key=storage_key,
                sha256_hash=sha256_val,
                is_published=False,
            )
        else:
            serializer.save(is_published=False)

    def perform_update(self, serializer: serializers.BaseSerializer) -> None:
        """Erlaubt autorisierten Nutzern das Ändern von Status und Datei bei Updates."""
        update_kwargs: dict[str, Any] = {}
        storage_key = self.request.data.get("storage_key")
        if storage_key and not self.request.FILES.get("pdf_file"):
            update_kwargs["pdf_file"] = storage_key
            update_kwargs["storage_key"] = storage_key

        if "is_published" in self.request.data:
            raw_is_published = self.request.data.get("is_published")
            parsed_is_pub = _parse_bool_param(raw_is_published)
            is_pub_bool = (
                parsed_is_pub if parsed_is_pub is not None else bool(raw_is_published)
            )
            instance = serializer.instance

            # Track-Pflicht greift NUR bei Neu-Veröffentlichung (Statuswechsel von False -> True):
            # Bereits veröffentlichte Zertifikate unterliegen dem Bestandsschutz.
            if is_pub_bool and (instance is None or not instance.is_published):
                tracks_data = self.request.data.get("tracks")
                has_tracks = (
                    len(tracks_data) > 0
                    if tracks_data is not None
                    and isinstance(tracks_data, (list, tuple))
                    else (instance and instance.tracks.exists())
                )
                if not has_tracks:
                    raise serializers.ValidationError(
                        {"tracks": PUBLISH_TRACK_REQUIRED_MESSAGE}
                    )
                try:
                    ensure_certificate_in_storage(instance or serializer.instance)
                except Exception as err:
                    logger.exception(
                        "Fehler beim Übertragen des Zertifikats in den S3-Storage bei Veröffentlichung."
                    )
                    raise serializers.ValidationError(
                        {
                            "detail": "Zertifikat konnte nicht im Storage bereitgestellt werden."
                        }
                    ) from err
            update_kwargs["is_published"] = is_pub_bool

        serializer.save(**update_kwargs)

    @extend_schema(
        summary="Erzeugt eine signierte S3-Upload-URL für den direkten Upload zu Supabase S3",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "filename": {"type": "string", "example": "mein-zertifikat.pdf"},
                    "content_type": {"type": "string", "example": "application/pdf"},
                },
                "required": ["filename"],
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "url": {"type": "string"},
                    "storage_key": {"type": "string"},
                    "method": {"type": "string", "example": "PUT"},
                    "headers": {"type": "object"},
                },
            },
            400: {"type": "object", "properties": {"detail": {"type": "string"}}},
        },
    )
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="presigned_upload",
    )
    def presigned_upload(self, request: Request) -> Response:
        """Erzeugt eine signierte S3-Upload-URL für Direct-to-Storage Uploads zu Supabase S3."""
        filename = (
            request.data.get("filename") if isinstance(request.data, dict) else None
        )
        if not filename or not isinstance(filename, str):
            return Response(
                {"detail": "Der Parameter 'filename' ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = (
            request.data.get("content_type") if isinstance(request.data, dict) else None
        )
        try:
            data = generate_presigned_upload(filename, content_type)
            return Response(data, status=status.HTTP_200_OK)
        except ValueError as err:
            return Response(
                {"detail": str(err)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("Fehler bei der Generierung der Presigned-Upload-URL.")
            return Response(
                {"detail": "S3-Presigned-URL konnte nicht erzeugt werden."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def publish(self, request: Request, pk: str | None = None) -> Response:
        """Dedizierter Endpoint zur Veröffentlichung eines geprüften Zertifikats.

        Stellt sicher, dass das Zertifikat im S3-Storage abgelegt wird und bei
        Neu-Veröffentlichung mindestens ein Track zugeordnet ist.
        """
        cert = self.get_object()
        if not cert.is_published and not cert.tracks.exists():
            return Response(
                {"detail": PUBLISH_TRACK_REQUIRED_MESSAGE},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            ensure_certificate_in_storage(cert)
        except Exception:
            logger.exception(
                "Fehler beim Übertragen des Zertifikats ID %s in den S3-Storage bei Veröffentlichung.",
                cert.pk,
            )
            return Response(
                {"detail": "Zertifikat konnte nicht im Storage bereitgestellt werden."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        cert.is_published = True
        cert.save(update_fields=["is_published", "pdf_file", "storage_key"])
        return Response({"status": "published", "is_published": True})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def unpublish(self, request: Request, pk: str | None = None) -> Response:
        """Dedizierter Endpoint zum Zurückziehen eines Zertifikats."""
        cert = self.get_object()
        cert.is_published = False
        cert.save(update_fields=["is_published"])
        return Response({"status": "unpublished", "is_published": False})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def extract_metadata(self, request: Request, pk: str | None = None) -> Response:
        """Zweistufige On-Demand Extraktion (Textschicht + OCR) für Zertifikat."""
        cert = self.get_object()
        if not cert.pdf_file:
            return Response(
                {"detail": "Keine Dokumentendatei für dieses Zertifikat gefunden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        suffix = Path(cert.pdf_file.name).suffix.lower() or ".pdf"
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
                for chunk in cert.pdf_file.chunks():
                    tmp_file.write(chunk)
                tmp_path = Path(tmp_file.name)

            try:
                known_providers = list(
                    Provider.objects.values_list("provider", flat=True)
                )
                original_name = Path(cert.pdf_file.name).name
                result = extract_metadata(
                    file_path=tmp_path,
                    source_root=tmp_path.parent,
                    track_rules=TRACK_RULES,
                    enable_ocr=True,
                    known_providers=known_providers,
                    original_filename=original_name,
                )
            finally:
                if tmp_path and tmp_path.exists():
                    try:
                        tmp_path.unlink()
                    except OSError:
                        logger.warning(
                            "Temporäre Datei konnte nicht gelöscht werden: %s", tmp_path
                        )

            if not result:
                return Response(
                    {"detail": "Konnte keine Metadaten aus dem Dokument extrahieren."},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

            # Zugeordnete Track-IDs ermitteln basierend auf gefundenen Slugs
            matched_track_ids = list(
                Track.objects.filter(slug__in=result.guessed_track_slugs).values_list(
                    "id", flat=True
                )
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
        except Exception:
            logger.exception("Fehler bei der On-Demand-Metadatenextraktion.")
            return Response(
                {"detail": "Fehler bei der Metadatenanalyse des Dokuments."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SkillViewSet(ConditionalCacheMixin, viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class TimelineEntryViewSet(ConditionalCacheMixin, viewsets.ModelViewSet):
    queryset = TimelineEntry.objects.all().prefetch_related("skills")
    serializer_class = TimelineEntrySerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)


class TrackViewSet(ConditionalCacheMixin, viewsets.ModelViewSet):
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

    def _sync_track_icon(self, track: Track) -> None:
        """Synchronisiert und sichert das Track-Icon lokal über ensure_track_icon."""
        if track.icon:
            try:
                ensure_track_icon(track.icon)
            except Exception:  # noqa: BLE001
                logger.warning(
                    "Track-Icon '%s' konnte nicht heruntergeladen/gesichert werden.",
                    track.icon,
                )

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        track = serializer.save()
        self._sync_track_icon(track)

    def perform_update(self, serializer: serializers.BaseSerializer) -> None:
        track = serializer.save()
        self._sync_track_icon(track)


class PendingCertificateViewSet(viewsets.ModelViewSet):
    """Nur für Staff-Nutzer - nie öffentlich lesbar."""

    queryset = PendingCertificate.objects.all()
    serializer_class = PendingCertificateSerializer
    permission_classes = (IsAdminUser,)

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        """Detail-Ansicht liefert extracted_text mit, Liste nicht."""
        if self.action == "retrieve":
            return PendingCertificateDetailSerializer
        return PendingCertificateSerializer

    def _resolve_tracks(
        self, track_ids: object
    ) -> tuple[list[Track] | None, Response | None]:
        """
        Validiert und löst eine Liste von Track-IDs in Track-Instanzen auf.
        Liefert (tracks, None) bei Erfolg oder (None, error_response) bei Validierungsfehlern.
        """
        if track_ids is None:
            return None, None

        if not isinstance(track_ids, (list, tuple)):
            return None, Response(
                {"detail": "Der Parameter 'track_ids' muss eine Liste von IDs sein."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_pks: list[int] = []
        for track_id in track_ids:
            try:
                valid_pks.append(int(track_id))
            except (ValueError, TypeError):
                return None, Response(
                    {"detail": f"Track {track_id} nicht gefunden."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        track_map = Track.objects.in_bulk(valid_pks)
        tracks: list[Track] = []
        for raw_id, pk_val in zip(track_ids, valid_pks, strict=False):
            track_obj = track_map.get(pk_val)
            if track_obj is None:
                return None, Response(
                    {"detail": f"Track {raw_id} nicht gefunden."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            tracks.append(track_obj)

        return tracks, None

    @action(detail=True, methods=["post"])
    def approve(self, request: Request, pk: str | None = None) -> Response:
        pending = self.get_object()
        title = request.data.get("title") if isinstance(request.data, dict) else None
        provider_name = (
            request.data.get("provider") if isinstance(request.data, dict) else None
        )
        track_ids = (
            request.data.get("track_ids") if isinstance(request.data, dict) else None
        )

        tracks, error_response = self._resolve_tracks(track_ids)
        if error_response is not None:
            return error_response

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
        except Exception:
            logger.exception(
                "Unerwarteter Fehler beim Freigeben des Pending-Zertifikats."
            )
            return Response(
                {"detail": "Fehler bei der Freigabe des Zertifikats."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "detail": "Erfolgreich freigegeben.",
                "certificate_id": cert.id,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request: Request, pk: str | None = None) -> Response:
        pending = self.get_object()
        try:
            reject_pending_certificate(pending)
        except PromotionError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception(
                "Unerwarteter Fehler beim Ablehnen des Pending-Zertifikats."
            )
            return Response(
                {"detail": "Fehler beim Ablehnen des Zertifikats."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({"detail": "Abgelehnt."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def file(self, request: Request, pk: str | None = None) -> FileResponse | Response:
        """Gibt die Quelldatei des ausstehenden Zertifikats (PDF, PNG, JPG) zur Ansicht zurück."""
        pending = self.get_object()
        if not pending.file_path:
            return Response(
                {"detail": "Kein lokaler Dateipfad hinterlegt."},
                status=status.HTTP_404_NOT_FOUND,
            )

        file_path = Path(pending.file_path)
        if not file_path.exists() or not file_path.is_file():
            return Response(
                {
                    "detail": f"Datei '{pending.original_file_name}' existiert lokal nicht mehr."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        ext = file_path.suffix.lower()
        content_type = "application/pdf"
        if ext == ".png":
            content_type = "image/png"
        elif ext in {".jpg", ".jpeg"}:
            content_type = "image/jpeg"

        response = FileResponse(open(file_path, "rb"), content_type=content_type)  # noqa: SIM115
        response["Content-Disposition"] = (
            f'inline; filename="{pending.original_file_name}"'
        )
        return response


class AIChatView(APIView):
    """Beantwortet Besucherfragen zum Portfolio mittels RAG und Gemini 3.8 Flash.

    Öffentlich erreichbar mit Scoped Rate Limiting (20 Anfragen/Minute).
    """

    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "ai_chat"

    @extend_schema(
        summary="Portfolio AI-Copilot Chat",
        description="Beantwortet Fragen zum Portfolio, Projekten, Skills und Zertifikaten mit RAG via Gemini 3.8 Flash.",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "example": "Welche Erfahrungen hat Dominik mit Django?",
                    },
                    "history": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "role": {"type": "string", "enum": ["user", "model"]},
                                "text": {"type": "string"},
                            },
                        },
                    },
                },
                "required": ["message"],
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "reply": {"type": "string"},
                    "sources": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "target_id": {"type": "string"},
                                "type": {"type": "string"},
                            },
                        },
                    },
                },
            },
            400: {"type": "object", "properties": {"detail": {"type": "string"}}},
        },
    )
    def post(self, request: Request) -> Response:
        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Der Parameter 'message' ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = request.data.get("message")
        if not message or not isinstance(message, str) or not message.strip():
            return Response(
                {"detail": "Der Parameter 'message' ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        history = request.data.get("history")
        if history is not None and not isinstance(history, list):
            history = None

        language = request.data.get("language", "de")
        if not isinstance(language, str):
            language = "de"

        try:
            response_data = answer_portfolio_query(
                message, history=history, language=language
            )
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception:
            logger.exception(
                "Unerwarteter Fehler bei der Anfrage an den KI-Assistenten."
            )
            return Response(
                {
                    "reply": (
                        "Entschuldigung, bei der Bearbeitung deiner Anfrage ist ein temporärer Fehler "
                        "aufgetreten. Bitte versuche es in wenigen Momenten erneut oder wirf einen Blick "
                        "auf die Projektübersicht."
                    ),
                    "sources": [],
                },
                status=status.HTTP_200_OK,
            )


class PasswordResetRequestView(APIView):
    """Stößt den Use-Case 'Passwort zurücksetzen' für den Portfolio-User an.

    Versendet das Template backend/templates/email/password_reset.html
    an PORTFOLIO_OWNER_EMAIL.
    """

    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "anon"

    @extend_schema(
        summary="Passwort-Reset anfordern",
        description=(
            "Sendet eine E-Mail mit Wiederherstellungs-Token an den in .env "
            "hinterlegten Portfolio-Inhaber (PORTFOLIO_OWNER_EMAIL)."
        ),
        request=None,
        responses={
            200: {"type": "object", "properties": {"detail": {"type": "string"}}}
        },
    )
    def post(self, request: Request) -> Response:
        from django.contrib.auth import get_user_model
        from djoser.compat import get_user_email
        from djoser.conf import settings as djoser_settings

        User = get_user_model()
        owner_email = (os.getenv("PORTFOLIO_OWNER_EMAIL") or "").strip()
        user = None

        if owner_email:
            user = User.objects.filter(email__iexact=owner_email).first()

        # Fallback auf den einzigen Superuser/Staff-Account, falls die DB-E-Mail abweicht
        if not user:
            user = (
                User.objects.filter(is_superuser=True).first()
                or User.objects.filter(is_staff=True).first()
            )

        if user:
            recipient = owner_email or get_user_email(user)
            if recipient:
                context = {"user": user}
                to = [recipient]
                try:
                    djoser_settings.EMAIL.password_reset(request, context).send(to)
                except Exception:
                    logger.exception(
                        "Fehler beim Versenden der Passwort-Reset-Mail an %s", recipient
                    )
            else:
                logger.warning(
                    "Passwort-Reset angefordert: Benutzer ID %s gefunden, "
                    "aber keine gültige Empfänger-E-Mail vorhanden.",
                    user.pk,
                )
        else:
            logger.warning(
                "Passwort-Reset angefordert, aber kein passender Benutzer gefunden "
                "(weder für PORTFOLIO_OWNER_EMAIL='%s' noch existiert ein "
                "Superuser/Staff-Account).",
                owner_email,
            )

        return Response(
            {
                "detail": (
                    "Eine E-Mail zum Zurücksetzen des Passworts wurde an die hinterlegte "
                    "Inhaber-Adresse versendet."
                )
            },
            status=status.HTTP_200_OK,
        )
