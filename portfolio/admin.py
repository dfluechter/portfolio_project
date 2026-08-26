from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Certificate, Project, Provider, Skill, TimelineEntry, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "is_staff", "is_superuser", "is_active")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email",)
    ordering = ("email",)
    filter_horizontal = ()
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Berechtigungen",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password"),
            },
        ),
    )


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "proficiency", "is_featured", "created_at")
    list_filter = ("category", "is_featured")
    search_fields = ("name",)
    ordering = ("category", "-proficiency", "name")


@admin.register(TimelineEntry)
class TimelineEntryAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "organization",
        "entry_type",
        "start_date",
        "end_date",
        "is_current",
    )
    list_filter = ("entry_type", "is_current")
    search_fields = ("title", "organization", "description")
    filter_horizontal = ("skills",)
    ordering = ("-start_date",)


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
    list_display = ("title", "provider", "uploaded_at")

    # Fügt eine Suchleiste hinzu, die in diesen Feldern sucht
    search_fields = ("title", "provider__provider")

    # Fügt auf der rechten Seite einen Filter hinzu
    list_filter = ("provider", "uploaded_at")

    # Verhindert, dass das Upload-Datum manuell geändert wird
    readonly_fields = ("uploaded_at",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "created_at", "github_url", "live_url")
    search_fields = ("title", "description")
    list_filter = ("created_at",)
    readonly_fields = ("created_at",)
    filter_horizontal = ("skills",)
