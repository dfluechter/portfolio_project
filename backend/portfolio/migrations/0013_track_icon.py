from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("portfolio", "0012_certificate_credential_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="icon",
            field=models.CharField(
                blank=True,
                default="",
                help_text="z. B. 'database', 'code', 'cloud', 'shield-halved', 'brain'",
                max_length=64,
                verbose_name="FontAwesome Solid Icon Name",
            ),
        ),
    ]
