import os
import re
from django.db import models
from django.utils.text import slugify

def certificate_upload_path(instance, filename):
    """
    Generiert dynamisch den Speicherpfad: certificates/<Aussteller_Name>/<Dateiname>
    Nutzt einen bereinigten Ordnernamen, um Betriebssystem-Fehler zu vermeiden.
    """
    clean_issuer = slugify(instance.issuer)
    if not clean_issuer:
        clean_issuer = "unsorted"
    
    # WICHTIG: Nutze immer '/', da S3-Cloud-Speicher keine Windows-Backslashes (\) unterstützt!
    return f"certificates/{clean_issuer}/{filename}"


class Certificate(models.Model):
    title = models.CharField(
        max_length=255, 
        verbose_name="Titel des Zertifikats"
    )
    issuer = models.CharField(
        max_length=255, 
        verbose_name="Aussteller / Organisation"
    )
    pdf_file = models.FileField(
        upload_to=certificate_upload_path, 
        verbose_name="PDF Datei"
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="Hochgeladen am"
    )

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