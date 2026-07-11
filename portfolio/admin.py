from django.contrib import admin

from .models import Certificate, Project, Provider


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    # Zeigt diese Spalten in der Listenansicht an
    list_display = ("provider", "aktiv", "url")

    # Fügt eine Filter-Seitenleiste hinzu (z.B. um nur aktive zu sehen)
    list_filter = ("aktiv",)

    # Fügt eine Suchleiste hinzu, die den Namen durchsucht
    search_fields = ("provider",)

    # Definiert, wie die Detail-Ansicht formatiert ist
    fieldsets = (
        ("Basis-Daten", {"fields": ("provider", "aktiv")}),
        ("Zusatzinformationen", {"fields": ("logo", "url")}),
    )


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    # Welche Spalten in der Übersichtstabelle angezeigt werden sollen
    list_display = ("title", "issuer", "uploaded_at")

    # Fügt eine Suchleiste hinzu, die in diesen Feldern sucht
    search_fields = ("title", "issuer")

    # Fügt auf der rechten Seite einen Filter hinzu
    list_filter = ("issuer", "uploaded_at")

    # Verhindert, dass das Upload-Datum manuell geändert wird
    readonly_fields = ("uploaded_at",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "created_at", "github_url", "live_url")
    search_fields = ("title", "description")
    list_filter = ("created_at",)
    readonly_fields = ("created_at",)
