from rest_framework import serializers

from .models import Certificate, Project, Provider, Skill, TimelineEntry


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
        fields = "__all__"


class CertificateSerializer(serializers.ModelSerializer):
    provider_details = ProviderSerializer(source="provider", read_only=True)

    class Meta:
        model = Certificate
        fields = (
            "id",
            "title",
            "provider",
            "provider_details",
            "pdf_file",
            "uploaded_at",
        )


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
