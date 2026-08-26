import os
from typing import Any, ClassVar

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


# ==============================================================================
# VALIDATOREN (Security & Limits)
# ==============================================================================
def validate_file_extension(value: Any) -> None:
    """Prüft, ob die Dateiendung .pdf, .png, oder 'jpg' ist."""
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = [".pdf", ".png", ".jpg"]
    if ext not in valid_extensions:
        raise ValidationError(
            f"Ungültiges Format! Erlaubt sind nur: {', '.join(valid_extensions)}"
        )


def validate_file_size(value: Any) -> None:
    """Prüft, ob die Datei kleiner als 5 MB ist."""
    limit = 5 * 1024 * 1024  # 5 MB in Bytes
    if value.size > limit:
        raise ValidationError("Die Datei ist zu groß! Maximal erlaubt sind 5 MB.")


# ==============================================================================
# MODELLE
# ==============================================================================
def certificate_upload_path(instance: Any, filename: str) -> str:
    issuer_name = ""
    if hasattr(instance, "provider") and instance.provider:
        if isinstance(instance.provider, str):
            issuer_name = instance.provider
        elif hasattr(instance.provider, "provider"):
            issuer_name = instance.provider.provider
        else:
            issuer_name = str(instance.provider)
    elif hasattr(instance, "issuer") and instance.issuer:
        issuer_name = instance.issuer

    clean_issuer = slugify(issuer_name)
    if not clean_issuer:
        clean_issuer = "unsorted"
    return f"certificates/{clean_issuer}/{filename}"


class SkillCategory(models.TextChoices):
    BACKEND = "backend", "Backend"
    FRONTEND = "frontend", "Frontend"
    DEVOPS = "devops", "Cloud & DevOps"
    DATABASE = "database", "Datenbanken"
    TOOLS = "tools", "Tools & Methodik"
    OTHER = "other", "Sonstiges"


class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Skill-Name")
    category = models.CharField(
        max_length=20,
        choices=SkillCategory.choices,
        default=SkillCategory.BACKEND,
        verbose_name="Kategorie",
    )
    proficiency = models.PositiveSmallIntegerField(
        default=80,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        verbose_name="Kenntnisstand (%)",
        help_text="Wert zwischen 1 und 100",
    )
    icon = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Icon (z.B. fa-brands fa-python)",
        help_text="FontAwesome Icon-Klasse oder URL",
    )
    is_featured = models.BooleanField(
        default=False, verbose_name="Hervorgehoben / Top-Skill"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Erstellt am")

    class Meta:
        verbose_name = "Skill"
        verbose_name_plural = "Skills"
        ordering = ("category", "-proficiency", "name")

    def __str__(self) -> str:
        return f"{self.name} ({self.get_category_display()}, {self.proficiency}%)"


class TimelineType(models.TextChoices):
    EXPERIENCE = "experience", "Berufserfahrung"
    EDUCATION = "education", "Ausbildung & Studium"
    OTHER = "other", "Sonstiges"


class TimelineEntry(models.Model):
    entry_type = models.CharField(
        max_length=20,
        choices=TimelineType.choices,
        default=TimelineType.EXPERIENCE,
        verbose_name="Typ",
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Titel / Rolle / Abschluss",
        help_text="z. B. Senior Python Developer oder B.Sc. Informatik",
    )
    organization = models.CharField(
        max_length=255,
        verbose_name="Organisation / Unternehmen / Institution",
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Standort",
        help_text="z. B. Berlin, Deutschland oder Remote",
    )
    start_date = models.DateField(verbose_name="Startdatum")
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Enddatum",
        help_text="Leer lassen, falls aktuell",
    )
    is_current = models.BooleanField(
        default=False,
        verbose_name="Aktuelle Position / laufend",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Beschreibung / Tätigkeiten",
    )
    skills = models.ManyToManyField(
        Skill,
        blank=True,
        related_name="timeline_entries",
        verbose_name="Eingesetzte Skills",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Erstellt am")

    class Meta:
        verbose_name = "Werdegangs-Eintrag"
        verbose_name_plural = "Werdegang (Timeline)"
        ordering = ("-start_date",)

    def __str__(self) -> str:
        return f"{self.title} @ {self.organization}"


class Provider(models.Model):
    provider = models.CharField(max_length=255, unique=True, verbose_name="Anbieter")
    logo = models.ImageField(
        upload_to="provider_logos/", blank=True, null=True, verbose_name="Logo"
    )
    aktiv = models.BooleanField(default=True, verbose_name="Aktiv")
    url = models.URLField(blank=True, null=True, verbose_name="URL")

    def __str__(self):
        return self.provider

    class Meta:
        verbose_name = "Zertifikatsanbieter"
        verbose_name_plural = "Zertifikatsanbieter"


class Certificate(models.Model):
    title = models.CharField(max_length=255, verbose_name="Titel des Zertifikats")
    provider = models.ForeignKey(
        Provider,
        on_delete=models.PROTECT,
        related_name="certificates",
        verbose_name="Zertifikatsanbieter",
    )
    pdf_file = models.FileField(
        upload_to=certificate_upload_path,
        verbose_name="PDF / PNG / JPG Datei",
        validators=[validate_file_extension, validate_file_size],
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Hochgeladen am")

    class Meta:
        verbose_name = "Zertifikat"
        verbose_name_plural = "Zertifikate"
        ordering = ("-uploaded_at",)

    def __str__(self):
        return f"{self.title} ({self.provider.provider})"


class Project(models.Model):
    title = models.CharField(max_length=255, verbose_name="Projektname")
    description = models.TextField(verbose_name="Beschreibung")
    image = models.ImageField(
        upload_to="projects/",
        blank=True,
        null=True,
        verbose_name="Projekt-Vorschaubild",
    )
    skills = models.ManyToManyField(
        Skill,
        blank=True,
        related_name="projects",
        verbose_name="Eingesetzte Technologien",
    )
    github_url = models.URLField(
        blank=True, null=True, verbose_name="GitHub Repository URL"
    )
    live_url = models.URLField(blank=True, null=True, verbose_name="Live Demo URL")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Erstellt am")

    class Meta:
        verbose_name = "Projekt"
        verbose_name_plural = "Projekte"
        ordering = ("-created_at",)

    def __str__(self):
        return self.title


class UserManager(BaseUserManager):
    """
    Custom User Manager für die E-Mail-basierte Authentifizierung.
    """

    def create_user(
        self, email: str, password: str | None = None, **extra_fields: Any
    ) -> "User":
        if not email:
            raise ValueError("Die E-Mail-Adresse muss angegeben werden.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self, email: str, password: str | None = None, **extra_fields: Any
    ) -> "User":
        # Standardwerte für Superuser setzen
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser muss is_staff=True haben.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser muss is_superuser=True haben.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User-Modell, das E-Mail als primären Identifikator nutzt.
    """

    # E-Mail-Adresse als eindeutiger Login-Identifier
    email = models.EmailField(unique=True, db_index=True, verbose_name="E-Mail-Adresse")

    # Status-Flags
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    is_staff = models.BooleanField(default=False, verbose_name="Staff-Status")

    # Registrierungsdatum
    date_joined = models.DateTimeField(
        default=timezone.now, verbose_name="Registriert am"
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    class Meta:
        verbose_name = "Benutzer"
        verbose_name_plural = "Benutzer"

    def __str__(self) -> str:
        return self.email
