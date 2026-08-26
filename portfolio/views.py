import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotAllowed, JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from .models import Certificate, Project, Provider, Skill, TimelineEntry
from .serializers import (
    CertificateSerializer,
    ProjectSerializer,
    ProviderSerializer,
    SkillSerializer,
    TimelineEntrySerializer,
)


@csrf_exempt
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
            if user.is_active:
                login(request, user)
                return JsonResponse({"success": True})
            else:
                return JsonResponse(
                    {"detail": "Dieses Benutzerkonto ist deaktiviert."}, status=403
                )
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
