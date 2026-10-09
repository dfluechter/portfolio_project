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
    valid_extensions = [".pdf", ".png", ".jpg", ".jpeg"]
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
# KONFIGURATION
# ==============================================================================
TRACK_RULES: dict[str, list[str]] = {
    "python-django": ["python", "django", "django rest framework", "fastapi"],
    "frontend-react": ["react", "typescript", "javascript", "frontend"],
    "cloud-devops": [
        "azure",
        "aws",
        "docker",
        "kubernetes",
        "github actions",
        "devops",
    ],
    "data-ai": [
        "artificial intelligence",
        "machine learning",
        "data science",
        "generative ai",
    ],
    "security": ["security", "cybersecurity", "identity", "compliance"],
}


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
    clean_issuer = slugify(issuer_name)
    if not clean_issuer:
        clean_issuer = "unsorted"

    hash_prefix = (
        instance.sha256_hash[:12]
        if getattr(instance, "sha256_hash", None)
        else "unsorted"
    )
    return f"certificates/{clean_issuer}/{hash_prefix}/{filename}"


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

    def __str__(self) -> str:
        return self.provider

    class Meta:
        verbose_name = "Zertifikatsanbieter"
        verbose_name_plural = "Zertifikatsanbieter"
        ordering = ("provider",)


class Track(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Track-Name")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="Slug")
    description = models.TextField(blank=True, verbose_name="Beschreibung")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Erstellt am")

    class Meta:
        verbose_name = "Track"
        verbose_name_plural = "Tracks"
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class Certificate(models.Model):
    title = models.CharField(max_length=255, verbose_name="Titel des Zertifikats")
    provider = models.ForeignKey(
        Provider,
        on_delete=models.PROTECT,
        related_name="certificates",
        verbose_name="Zertifikatsanbieter",
    )
    tracks = models.ManyToManyField(
        Track,
        blank=True,
        related_name="certificates",
        verbose_name="Zugeordnete Tracks",
    )
    pdf_file = models.FileField(
        upload_to=certificate_upload_path,
        verbose_name="PDF / PNG / JPG Datei",
        validators=[validate_file_extension, validate_file_size],
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Hochgeladen am")
    sha256_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name="SHA-256 Hash",
    )
    is_published = models.BooleanField(default=False, verbose_name="Veröffentlicht")
    credential_id = models.CharField(
        max_length=255, blank=True, verbose_name="Credential-ID"
    )
    issued_date = models.DateField(
        null=True, blank=True, verbose_name="Ausstellungsdatum"
    )
    storage_key = models.CharField(
        max_length=512, blank=True, verbose_name="Storage-Objektschlüssel"
    )
    ocr_pending = models.BooleanField(default=False, verbose_name="OCR ausstehend")

    class Meta:
        verbose_name = "Zertifikat"
        verbose_name_plural = "Zertifikate"
        ordering = ("-uploaded_at",)

    def __str__(self) -> str:
        return f"{self.title} ({self.provider.provider})"


class PendingCertificateStatus(models.TextChoices):
    PENDING = "pending", "Ausstehend"
    APPROVED = "approved", "Freigegeben"
    REJECTED = "rejected", "Abgelehnt"


class PendingCertificate(models.Model):
    original_file_name = models.CharField(
        max_length=255, verbose_name="Ursprünglicher Dateiname"
    )
    file_path = models.CharField(max_length=1024, verbose_name="Lokaler Dateipfad")
    extracted_text = models.TextField(
        blank=True, verbose_name="Extrahierter Text (Rohdaten)"
    )
    guessed_title = models.CharField(
        max_length=255, blank=True, verbose_name="Vermuteter Titel"
    )
    guessed_provider = models.CharField(
        max_length=255, blank=True, verbose_name="Vermuteter Anbieter"
    )
    status = models.CharField(
        max_length=20,
        choices=PendingCertificateStatus.choices,
        default=PendingCertificateStatus.PENDING,
        verbose_name="Status",
    )
    sha256_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
        verbose_name="SHA-256 Hash",
    )
    import_run = models.ForeignKey(
        "CertificateImportRun",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pending_certificates",
        verbose_name="Import-Lauf",
    )
    suggested_tracks = models.ManyToManyField(
        Track,
        blank=True,
        related_name="suggested_pending_certificates",
        verbose_name="Vorgeschlagene Tracks",
    )
    certificate = models.OneToOneField(
        Certificate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_pending",
        verbose_name="Zugeordnetes Zertifikat",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Eingelesen am")

    class Meta:
        verbose_name = "Ausstehendes Zertifikat (Inbox)"
        verbose_name_plural = "Ausstehende Zertifikate (Inbox)"
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"[{self.get_status_display()}] {self.original_file_name}"


class ImportRunStatus(models.TextChoices):
    RUNNING = "running", "Läuft"
    SUCCESS = "success", "Erfolgreich"
    PARTIAL = "partial", "Teilweise erfolgreich"
    FAILED = "failed", "Fehlgeschlagen"


class CertificateImportRun(models.Model):
    """Protokolliert einen einzelnen Scan-/Import-Lauf des scan_inbox-Commands."""

    # Zeitstempel
    started_at = models.DateTimeField(verbose_name="Gestartet um")
    finished_at = models.DateTimeField(null=True, blank=True, verbose_name="Beendet um")

    # Zähler
    files_found = models.PositiveIntegerField(
        default=0, verbose_name="Dateien gefunden"
    )
    files_imported = models.PositiveIntegerField(
        default=0, verbose_name="Dateien importiert"
    )
    files_skipped = models.PositiveIntegerField(
        default=0, verbose_name="Dateien übersprungen"
    )
    files_errored = models.PositiveIntegerField(
        default=0, verbose_name="Dateien fehlerhaft"
    )

    # Status & Log
    status = models.CharField(
        max_length=20,
        choices=ImportRunStatus.choices,
        default=ImportRunStatus.RUNNING,
        verbose_name="Status",
    )
    log = models.TextField(blank=True, verbose_name="Log-Protokoll")

    # Quelle
    inbox_path = models.CharField(
        max_length=1024, blank=True, verbose_name="Inbox-Verzeichnis"
    )

    class Meta:
        verbose_name = "Import-Lauf"
        verbose_name_plural = "Import-Läufe"
        ordering = ("-started_at",)

    def __str__(self) -> str:
        return (
            f"[{self.get_status_display()}] {self.started_at:%Y-%m-%d %H:%M} "
            f"({self.files_imported}/{self.files_found})"
        )

    def append_log(self, message: str) -> None:
        """Hängt eine Zeile an das Log-Feld an (ohne sofort zu speichern)."""
        if self.log:
            self.log += "\n"
        self.log += message


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

    def __str__(self) -> str:
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
        user.set_password(password)  # type: ignore
        user.save(using=self._db)
        return user  # type: ignore

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
