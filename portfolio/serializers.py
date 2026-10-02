from rest_framework import serializers

from .models import (
    Certificate,
    PendingCertificate,
    Project,
    Provider,
    Skill,
    TimelineEntry,
    Track,
)


class SkillSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )

    class Meta:
        model = Skill
        fields = (
            "id",
            "name",
            "category",
            "category_display",
            "proficiency",
            "icon",
            "is_featured",
            "created_at",
        )


class ProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provider
        fields = ("id", "provider", "logo", "aktiv", "url")


class CertificateSerializer(serializers.ModelSerializer):
    provider_details = ProviderSerializer(source="provider", read_only=True)
    tracks = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Track.objects.all(), required=False
    )

    class Meta:
        model = Certificate
        fields = (
            "id",
            "title",
            "provider",
            "provider_details",
            "tracks",
            "pdf_file",
            "uploaded_at",
            "sha256_hash",
            "is_published",
        )
        read_only_fields = ("sha256_hash", "is_published", "uploaded_at")


class ProjectSerializer(serializers.ModelSerializer):
    skills = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all(), required=False
    )
    skill_details = SkillSerializer(source="skills", many=True, read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "title",
            "description",
            "image",
            "skills",
            "skill_details",
            "github_url",
            "live_url",
            "created_at",
        )


class TimelineEntrySerializer(serializers.ModelSerializer):
    entry_type_display = serializers.CharField(
        source="get_entry_type_display", read_only=True
    )
    skills = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all(), required=False
    )
    skill_details = SkillSerializer(source="skills", many=True, read_only=True)

    class Meta:
        model = TimelineEntry
        fields = (
            "id",
            "entry_type",
            "entry_type_display",
            "title",
            "organization",
            "location",
            "start_date",
            "end_date",
            "is_current",
            "description",
            "skills",
            "skill_details",
            "created_at",
        )


class TrackSerializer(serializers.ModelSerializer):
    certificates = serializers.SerializerMethodField()

    class Meta:
        model = Track
        fields = ("id", "name", "slug", "description", "certificates", "created_at")

    def get_certificates(self, obj):
        request = self.context.get("request")
        qs = obj.certificates.all()
        if request and not request.user.is_authenticated:
            qs = qs.filter(is_published=True)
        return CertificateSerializer(qs, many=True, context=self.context).data


class PendingCertificateSerializer(serializers.ModelSerializer):
    """Inbox-Übersicht – kein file_path, kein extracted_text."""

    class Meta:
        model = PendingCertificate
        fields = (
            "id",
            "original_file_name",
            "guessed_title",
            "guessed_provider",
            "status",
            "created_at",
        )
        read_only_fields = ("id", "status", "created_at")


class PendingCertificateDetailSerializer(serializers.ModelSerializer):
    """Erweiterte Felder nur für authentifizierte Staff-Nutzer (Dashboard-Prüfung)."""

    class Meta:
        model = PendingCertificate
        fields = (
            "id",
            "original_file_name",
            "extracted_text",
            "guessed_title",
            "guessed_provider",
            "status",
            "created_at",
        )
        read_only_fields = (
            "id",
            "original_file_name",
            "extracted_text",
            "status",
            "created_at",
        )
