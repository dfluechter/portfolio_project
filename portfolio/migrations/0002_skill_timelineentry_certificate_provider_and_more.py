import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("portfolio", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Skill",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        max_length=100, unique=True, verbose_name="Skill-Name"
                    ),
                ),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("backend", "Backend"),
                            ("frontend", "Frontend"),
                            ("devops", "Cloud & DevOps"),
                            ("database", "Datenbanken"),
                            ("tools", "Tools & Methodik"),
                            ("other", "Sonstiges"),
                        ],
                        default="backend",
                        max_length=20,
                        verbose_name="Kategorie",
                    ),
                ),
                (
                    "proficiency",
                    models.PositiveSmallIntegerField(
                        default=80,
                        help_text="Wert zwischen 1 und 100",
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(100),
                        ],
                        verbose_name="Kenntnisstand (%)",
                    ),
                ),
                (
                    "icon",
                    models.CharField(
                        blank=True,
                        help_text="FontAwesome Icon-Klasse oder URL",
                        max_length=100,
                        verbose_name="Icon (z.B. fa-brands fa-python)",
                    ),
                ),
                (
                    "is_featured",
                    models.BooleanField(
                        default=False, verbose_name="Hervorgehoben / Top-Skill"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Erstellt am"),
                ),
            ],
            options={
                "verbose_name": "Skill",
                "verbose_name_plural": "Skills",
                "ordering": ("category", "-proficiency", "name"),
            },
        ),
        migrations.CreateModel(
            name="TimelineEntry",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "entry_type",
                    models.CharField(
                        choices=[
                            ("experience", "Berufserfahrung"),
                            ("education", "Ausbildung & Studium"),
                            ("other", "Sonstiges"),
                        ],
                        default="experience",
                        max_length=20,
                        verbose_name="Typ",
                    ),
                ),
                (
                    "title",
                    models.CharField(
                        help_text="z. B. Senior Python Developer oder B.Sc. Informatik",
                        max_length=255,
                        verbose_name="Titel / Rolle / Abschluss",
                    ),
                ),
                (
                    "organization",
                    models.CharField(
                        max_length=255,
                        verbose_name="Organisation / Unternehmen / Institution",
                    ),
                ),
                (
                    "location",
                    models.CharField(
                        blank=True,
                        help_text="z. B. Berlin, Deutschland oder Remote",
                        max_length=255,
                        verbose_name="Standort",
                    ),
                ),
                ("start_date", models.DateField(verbose_name="Startdatum")),
                (
                    "end_date",
                    models.DateField(
                        blank=True,
                        help_text="Leer lassen, falls aktuell",
                        null=True,
                        verbose_name="Enddatum",
                    ),
                ),
                (
                    "is_current",
                    models.BooleanField(
                        default=False,
                        verbose_name="Aktuelle Position / laufend",
                    ),
                ),
                (
                    "description",
                    models.TextField(
                        blank=True, verbose_name="Beschreibung / Tätigkeiten"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Erstellt am"),
                ),
                (
                    "skills",
                    models.ManyToManyField(
                        blank=True,
                        related_name="timeline_entries",
                        to="portfolio.skill",
                        verbose_name="Eingesetzte Skills",
                    ),
                ),
            ],
            options={
                "verbose_name": "Werdegangs-Eintrag",
                "verbose_name_plural": "Werdegang (Timeline)",
                "ordering": ("-start_date",),
            },
        ),
        migrations.AddField(
            model_name="project",
            name="skills",
            field=models.ManyToManyField(
                blank=True,
                related_name="projects",
                to="portfolio.skill",
                verbose_name="Eingesetzte Technologien",
            ),
        ),
        migrations.RemoveField(
            model_name="certificate",
            name="issuer",
        ),
        migrations.AddField(
            model_name="certificate",
            name="provider",
            field=models.ForeignKey(
                default=1,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="certificates",
                to="portfolio.provider",
                verbose_name="Zertifikatsanbieter",
            ),
            preserve_default=False,
        ),
    ]
