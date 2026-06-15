import os
from django.db import models
from django.utils.text import slugify
from django.core.exceptions import ValidationError

# ==============================================================================
# VALIDATOREN (Security & Limits)
# ==============================================================================
def validate_file_extension(value):
    """Prüft, ob die Dateiendung .pdf oder .png ist."""
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.pdf', '.png']
    if ext not in valid_extensions:
        raise ValidationError(f'Ungültiges Format! Erlaubt sind nur: {", ".join(valid_extensions)}')

def validate_file_size(value):
    """Prüft, ob die Datei kleiner als 5 MB ist."""
    limit = 5 * 1024 * 1024  # 5 MB in Bytes
    if value.size > limit:
        raise ValidationError('Die Datei ist zu groß! Maximal erlaubt sind 5 MB.')


# ==============================================================================
# MODELLE
# ==============================================================================
def certificate_upload_path(instance, filename):
    clean_issuer = slugify(instance.issuer)
    if not clean_issuer:
        clean_issuer = "unsorted"
    return f"certificates/{clean_issuer}/{filename}"


class Certificate(models.Model):
    title = models.CharField(max_length=255, verbose_name="Titel des Zertifikats")
    issuer = models.CharField(max_length=255, verbose_name="Aussteller / Organisation")
    
    # NEU: Die Validatoren wurden hier hinzugefügt!
    pdf_file = models.FileField(
        upload_to=certificate_upload_path, 
        verbose_name="PDF / PNG Datei",
        validators=[validate_file_extension, validate_file_size]
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Hochgeladen am")

    class Meta:
        verbose_name = "Zertifikat"
        verbose_name_plural = "Zertifikate"
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.title} ({self.issuer})"


class Project(models.Model):
    title = models.CharField(
        max_length=255, 
        verbose_name="Projektname"
    )
    description = models.TextField(
        verbose_name="Beschreibung"
    )
    image = models.ImageField(
        upload_to='projects/', 
        blank=True, 
        null=True, 
        verbose_name="Projekt-Vorschaubild"
    )
    github_url = models.URLField(
        blank=True, 
        null=True, 
        verbose_name="GitHub Repository URL"
    )
    live_url = models.URLField(
        blank=True, 
        null=True, 
        verbose_name="Live Demo URL"
    )
    created_at = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="Erstellt am"
    )

    class Meta:
        verbose_name = "Projekt"
        verbose_name_plural = "Projekte"
        ordering = ['-created_at']

    def __str__(self):
        return self.title