import django.utils.timezone
from django.db import migrations, models

import portfolio.models


def enable_pgvector(apps, schema_editor):  # pragma: no cover
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("CREATE EXTENSION IF NOT EXISTS vector;")


def disable_pgvector(apps, schema_editor):  # pragma: no cover
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("DROP EXTENSION IF EXISTS vector;")


def create_hnsw_index(apps, schema_editor):  # pragma: no cover
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute(
            "CREATE INDEX IF NOT EXISTS chunk_vector_hnsw_idx "
            "ON portfolio_knowledgechunk USING hnsw (embedding vector_cosine_ops);"
        )


def drop_hnsw_index(apps, schema_editor):  # pragma: no cover
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("DROP INDEX IF EXISTS chunk_vector_hnsw_idx;")


class Migration(migrations.Migration):
    dependencies = [
        ("portfolio", "0013_track_icon"),
    ]

    operations = [
        migrations.RunPython(enable_pgvector, reverse_code=disable_pgvector),
        migrations.AlterField(
            model_name="project",
            name="created_at",
            field=models.DateTimeField(
                default=django.utils.timezone.now, verbose_name="Erstellt am"
            ),
        ),
        migrations.CreateModel(
            name="KnowledgeChunk",
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
                    "source_type",
                    models.CharField(
                        choices=[
                            ("project", "Projekt"),
                            ("certificate", "Zertifikat"),
                            ("skill", "Skill"),
                            ("timeline", "Werdegang"),
                        ],
                        db_index=True,
                        max_length=20,
                        verbose_name="Quell-Typ",
                    ),
                ),
                (
                    "source_id",
                    models.PositiveIntegerField(
                        db_index=True, verbose_name="Quell-Datensatz-ID"
                    ),
                ),
                (
                    "chunk_index",
                    models.PositiveIntegerField(default=0, verbose_name="Chunk-Index"),
                ),
                ("title", models.CharField(max_length=255, verbose_name="Titel")),
                (
                    "content",
                    models.TextField(verbose_name="Chunk-Inhalt (Grounding Text)"),
                ),
                (
                    "metadata",
                    models.JSONField(
                        blank=True, default=dict, verbose_name="Zusatz-Metadaten"
                    ),
                ),
                (
                    "embedding",
                    portfolio.models.VectorField(
                        blank=True,
                        dimensions=768,
                        null=True,
                        verbose_name="Vektor-Embedding (768 Dim)",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Erstellt am"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Aktualisiert am"),
                ),
            ],
            options={
                "verbose_name": "Knowledge Chunk",
                "verbose_name_plural": "Knowledge Chunks",
                "indexes": [
                    models.Index(
                        fields=["source_type", "source_id"],
                        name="portfolio_k_source__97faf5_idx",
                    )
                ],
                "unique_together": {("source_type", "source_id", "chunk_index")},
            },
        ),
        migrations.RunPython(create_hnsw_index, reverse_code=drop_hnsw_index),
    ]
