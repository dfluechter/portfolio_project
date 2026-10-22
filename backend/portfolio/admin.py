from pathlib import Path

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.http import FileResponse, Http404
from django.urls import path, reverse
from django.utils.html import format_html

from .models import (
    Certificate,
    CertificateImportRun,
    KnowledgeChunk,
    PendingCertificate,
    Project,
    Provider,
    Skill,
    TimelineEntry,
    Track,
    User,
)
from .services.promotion import PromotionError, promote_pending_certificate


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
    list_display = (
        "title",
        "is_published",
        "is_featured",
        "created_at",
        "github_url",
        "live_url",
    )
    search_fields = ("title", "description")
    list_filter = ("is_published", "is_featured", "created_at")
    readonly_fields = ("created_at",)
    filter_horizontal = ("skills",)


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_at")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}  # noqa: RUF012


@admin.register(PendingCertificate)
class PendingCertificateAdmin(admin.ModelAdmin):
    change_form_template = "admin/portfolio/pendingcertificate/change_form.html"
    list_display = (
        "original_file_name",
        "guessed_title",
        "guessed_provider",
        "status",
        "show_file_button",
        "import_run",
        "created_at",
    )
    list_filter = ("status", "import_run")
    search_fields = ("original_file_name", "guessed_title", "guessed_provider")
    readonly_fields = (
        "created_at",
        "extracted_text",
        "certificate",
        "show_file_button",
    )
    filter_horizontal = ("suggested_tracks",)
    actions = ("promote_selected",)

    fieldsets = (
        (
            "Datei & Vorschau",
            {
                "fields": (
                    "show_file_button",
                    "original_file_name",
                    "file_path",
                    "sha256_hash",
                )
            },
        ),
        (
            "Metadaten-Vorschläge",
            {
                "fields": (
                    "guessed_title",
                    "guessed_provider",
                    "suggested_tracks",
                )
            },
        ),
        (
            "Status & Zuordnung",
            {
                "fields": (
                    "status",
                    "import_run",
                    "certificate",
                    "created_at",
                )
            },
        ),
        (
            "Extrahierter Text",
            {
                "classes": ("collapse",),
                "fields": ("extracted_text",),
            },
        ),
    )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<path:object_id>/show-file/",
                self.admin_site.admin_view(self.show_file_view),
                name="portfolio_pendingcertificate_show_file",
            ),
        ]
        return custom_urls + urls

    def show_file_view(self, request, object_id):
        pending = self.get_object(request, object_id)
        if not pending or not pending.file_path:
            raise Http404("Ausstehendes Zertifikat oder Dateipfad nicht gefunden.")

        file_path = Path(pending.file_path)
        if not file_path.exists() or not file_path.is_file():
            raise Http404(
                f"Die Datei '{pending.original_file_name}' existiert lokal nicht mehr unter '{pending.file_path}'."
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

    @admin.display(description="Show File")
    def show_file_button(self, obj):
        if not obj or not obj.pk or not obj.file_path:
            return "-"
        file_path = Path(obj.file_path)
        if not file_path.exists():
            return format_html(
                '<span style="color:#ef4444; font-weight:bold;">⚠️ Datei nicht gefunden ({})</span>',
                file_path.name,
            )

        url = reverse("admin:portfolio_pendingcertificate_show_file", args=[obj.pk])
        ext = file_path.suffix.upper().lstrip(".")
        icon = "📄" if ext == "PDF" else "🖼️"

        preview_markup = ""
        if ext == "PDF":
            preview_markup = format_html(
                '<div style="margin-top:10px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; max-width:850px;">'
                '<iframe src="{}" width="100%" height="450px" style="border:none;"></iframe>'
                "</div>",
                url,
            )
        elif ext in {"PNG", "JPG", "JPEG"}:
            preview_markup = format_html(
                '<div style="margin-top:10px; max-width:850px;">'
                '<img src="{}" alt="{}" style="max-width:100%; max-height:450px; border-radius:8px; border:1px solid #cbd5e1; object-fit:contain;" />'
                "</div>",
                url,
                obj.original_file_name,
            )

        return format_html(
            '<div style="margin-bottom:6px;">'
            '<a class="button" href="{}" target="_blank" rel="noopener noreferrer" '
            'style="background-color:#2563eb !important; color:#ffffff !important; padding:8px 16px; '
            "border-radius:6px; font-weight:bold; font-size:13px; text-decoration:none; display:inline-flex; "
            'align-items:center; gap:8px; box-shadow:0 1px 3px rgba(0,0,0,0.15);">'
            "{} Show File ({})</a>"
            "</div>"
            "{}",
            url,
            icon,
            ext,
            preview_markup,
        )

    @admin.action(description="Ausgewählte Zertifikate freigeben und übertragen")
    def promote_selected(self, request, queryset):
        success_count = 0
        for pending in queryset:
            try:
                promote_pending_certificate(pending)
                success_count += 1
            except PromotionError as exc:
                self.message_user(
                    request,
                    f"Fehler bei {pending.original_file_name}: {exc}",
                    level=messages.ERROR,
                )
        if success_count:
            self.message_user(
                request,
                f"{success_count} Zertifikat(e) erfolgreich freigegeben und übertragen.",
                level=messages.SUCCESS,
            )


@admin.register(CertificateImportRun)
class CertificateImportRunAdmin(admin.ModelAdmin):
    list_display = (
        "started_at",
        "status",
        "files_found",
        "files_imported",
        "files_skipped",
        "files_errored",
        "finished_at",
    )
    list_filter = ("status",)
    readonly_fields = (
        "started_at",
        "finished_at",
        "files_found",
        "files_imported",
        "files_skipped",
        "files_errored",
        "status",
        "inbox_path",
        "log",
    )


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "source_type",
        "source_id",
        "chunk_index",
        "has_embedding",
        "updated_at",
    )
    list_filter = ("source_type",)
    search_fields = ("title", "content")
    readonly_fields = ("created_at", "updated_at")

    @admin.display(boolean=True, description="Vektor vorhanden")
    def has_embedding(self, obj: KnowledgeChunk) -> bool:
        return obj.embedding is not None
