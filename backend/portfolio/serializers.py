from typing import Any

from rest_framework import serializers

from .models import (
    Certificate,
    PendingCertificate,
    Project,
    Provider,
    Skill,
    TimelineEntry,
    Track,
    validate_file_extension,
    validate_file_size,
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
    pdf_file = serializers.FileField(
        required=False,
        allow_null=True,
        validators=[validate_file_extension, validate_file_size],
    )
    storage_key = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Certificate
        fields = (
            "id",
            "title",
            "provider",
            "provider_details",
            "tracks",
            "pdf_file",
            "storage_key",
            "uploaded_at",
            "sha256_hash",
            "is_published",
            "credential_id",
            "credential_url",
            "issued_date",
        )
        read_only_fields = ("sha256_hash", "is_published", "uploaded_at")

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        pdf_file = attrs.get("pdf_file") or (
            getattr(self.instance, "pdf_file", None) if self.instance else None
        )
        storage_key = attrs.get("storage_key") or (
            getattr(self.instance, "storage_key", None) if self.instance else None
        )
        if not pdf_file and not storage_key:
            raise serializers.ValidationError(
                {
                    "pdf_file": (
                        "Entweder pdf_file oder storage_key muss angegeben werden."
                    )
                }
            )
        return attrs


class ProjectSerializer(serializers.ModelSerializer):
    skills = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all(), required=False
    )
    skill_details = SkillSerializer(source="skills", many=True, read_only=True)
    created_at = serializers.DateTimeField(required=False)

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
            "is_published",
            "is_featured",
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

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        is_current = attrs.get(
            "is_current", getattr(self.instance, "is_current", False)
        )

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {"end_date": "Das Enddatum darf nicht vor dem Startdatum liegen."}
            )
        if is_current and end_date:
            raise serializers.ValidationError(
                {"end_date": "Eine laufende Position darf kein Enddatum haben."}
            )
        return attrs


class TrackSerializer(serializers.ModelSerializer):
    certificates = serializers.SerializerMethodField()
    icon_url = serializers.ReadOnlyField()

    class Meta:
        model = Track
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "icon_url",
            "certificates",
            "created_at",
        )

    def get_certificates(self, obj: Track) -> list[dict[str, Any]]:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        certificates = list(obj.certificates.all())
        if not (user and user.is_authenticated):
            # In Python filtern, damit das Prefetch des ViewSets genutzt wird
            certificates = [c for c in certificates if c.is_published]
        data = CertificateSerializer(certificates, many=True, context=self.context).data
        return list(data)


class PendingCertificateSerializer(serializers.ModelSerializer):
    """Inbox-Übersicht - kein file_path, kein extracted_text."""

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
