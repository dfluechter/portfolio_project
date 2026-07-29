import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseNotAllowed
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Project, Provider, Certificate
from .serializers import ProjectSerializer, ProviderSerializer, CertificateSerializer


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
            return JsonResponse({"detail": "E-Mail und Passwort müssen ausgefüllt sein."}, status=400)

        user = authenticate(request, username=email, password=password)
        if user is not None:
            if user.is_active:
                login(request, user)
                return JsonResponse({"success": True})
            else:
                return JsonResponse({"detail": "Dieses Benutzerkonto ist deaktiviert."}, status=403)
        else:
            return JsonResponse({"detail": "E-Mail-Adresse oder Passwort ungültig."}, status=400)

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


# ── API ViewSets für CRUD-Operationen ──

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]


class ProviderViewSet(viewsets.ModelViewSet):
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    permission_classes = [IsAuthenticated]


class CertificateViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
