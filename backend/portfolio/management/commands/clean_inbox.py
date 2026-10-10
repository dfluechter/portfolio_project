import logging
import re
from pathlib import Path

from django.core.management.base import BaseCommand

from portfolio.models import (
    TRACK_RULES,
    PendingCertificate,
    PendingCertificateStatus,
    Provider,
    Track,
)
from portfolio.services.extractor import extract_metadata

logger = logging.getLogger(__name__)

# Zuordnung der Ordner in media/certificates zu lesbaren Provider-Namen
PROVIDER_FOLDER_MAPPING: dict[str, str] = {
    "a-cloud-guru": "A Cloud Guru",
    "alteryx": "Alteryx",
    "analytics-valdya": "Analytics Vidhya",
    "arize-university": "Arize University",
    "atlassian": "Atlassian",
    "aws": "AWS",
    "codecademy": "Codecademy",
    "codesignal": "CodeSignal",
    "couchbase": "Couchbase",
    "coursera": "Coursera",
    "coursera-deeplearning-ai": "DeepLearning.AI",
    "coursera-google": "Google",
    "coursera-ibm": "IBM",
    "credly": "Credly",
    "databricks": "Databricks",
    "datacamp": "DataCamp",
    "datascientest": "DataScientest",
    "geeksforgeeks": "GeeksforGeeks",
    "google-cloud": "Google Cloud",
    "greatlearning": "Great Learning",
    "heise": "Heise",
    "ibm": "IBM",
    "ibm-cognitive-class": "Cognitive Class",
    "ibm-skillsbuild": "IBM SkillsBuild",
    "kaggle": "Kaggle",
    "linkedin-learning": "LinkedIn Learning",
    "microsoft": "Microsoft",
    "mimo": "Mimo",
    "mongodb": "MongoDB",
    "programming-hero": "Programming Hero",
    "programming-hub": "Programming Hub",
    "redpandas": "Redpandas",
    "sololearn": "SoloLearn",
    "stepik": "Stepik",
    "supabase": "Supabase",
    "tableau": "Tableau",
    "udemy": "Udemy",
}

# Zusätzliche bekannte Plattformen für das Portfolio
ADDITIONAL_PROVIDERS: list[str] = [
    "Bundesagentur für Arbeit",
    "GoMining Academy",
    "HackerRank",
    "Scrum.org",
    "Linux Foundation",
    "FreeCodeCamp",
    "Harvard",
    "Stanford",
]

# Schlüsselwörter für private/sensible Dokumente (strikt abzulehnen)
PRIVATE_KEYWORDS: tuple[str, ...] = (
    "bewilligung",
    "nachweis",
    "kontoauszug",
    "sgb",
    "familienpass",
    "schreiben",
    "epieos",
    "karriere-profil",
    "bioage",
    "psychologie-tools",
    "430668061",
)

# Schlüsselwörter für Kursmaterialien, eBooks, Folien, Workbooks (keine Zertifikate)
COURSE_MATERIAL_KEYWORDS: tuple[str, ...] = (
    "ebook",
    "guide",
    "cheatsheet",
    "cheat+sheet",
    "handout",
    "workbook",
    "canvas",
    "glossary",
    "presentation",
    "playbook",
    "review_de",
    "resources_de",
    "reading",
    "wp-lhind",
    "resilienz",
    "shilajit",
    "iodine",
    "arxiv",
    "2302.11382",
    "module5",
    "chapter1",
    "custom-template-tags",
    "bestbodyguide",
    "gymondo",
    "study_plan",
    "study-plan",
)


def is_private_document(filename: str, title: str) -> bool:
    """Erkennt private, sensible oder behördliche Dokumente."""
    combined = f"{filename} {title}".lower()
    return any(keyword in combined for keyword in PRIVATE_KEYWORDS)


def is_course_material_or_noise(filename: str, title: str) -> bool:
    """Erkennt eBooks, Folien, Lernunterlagen und unklare Bildartefakte."""
    combined = f"{filename} {title}".lower()
    if any(keyword in combined for keyword in COURSE_MATERIAL_KEYWORDS):
        return True

    # Hashes, Logos oder Screenshots ohne Zertifikatsbezug
    fn = filename.lower()
    return bool(
        re.match(
            r"^(logo.*|img_.*|crop_.*|cde33f43.*|fb_img.*|[a-za-z0-9+/=]{20,})\.(png|jpg|jpeg)$",
            fn,
        )
        and not any(k in fn for k in ("certificate", "zertifikat", "badge"))
    )


class Command(BaseCommand):
    help = (
        "Bereinigt die PendingCertificate-Inbox: legt Provider-Stamm an, "
        "weist Rauschen/private Dokumente ab und aktualisiert Metadaten."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Zeigt geplante Änderungen ohne Schreibzugriff auf die DB an.",
        )
        parser.add_argument(
            "--skip-reextract",
            action="store_true",
            default=False,
            help="Überspringt die Re-Extraktion der verbleibenden Zertifikate.",
        )

    def handle(self, *args, **options):
        dry_run: bool = options.get("dry_run", False)
        skip_reextract: bool = options.get("skip_reextract", False)

        mode_str = "[DRY-RUN]" if dry_run else "[LIVE]"
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"\n=== {mode_str} Starte Bereinigung der Inbox ==="
            )
        )

        # ── 1. Provider anlegen ──
        self.stdout.write(
            self.style.WARNING("\n1. Prüfe und synchronisiere Provider-Stamm...")
        )

        if not dry_run:
            from django.db import connection

            if connection.vendor == "postgresql":
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT setval(pg_get_serial_sequence('portfolio_provider', 'id'), "
                        "coalesce(max(id), 1)) FROM portfolio_provider;"
                    )

        all_target_providers = set(PROVIDER_FOLDER_MAPPING.values()) | set(
            ADDITIONAL_PROVIDERS
        )
        created_providers = 0

        for prov_name in sorted(all_target_providers):
            if dry_run:
                if not Provider.objects.filter(provider=prov_name).exists():
                    created_providers += 1
            else:
                _, created = Provider.objects.get_or_create(
                    provider=prov_name, defaults={"aktiv": True}
                )
                if created:
                    created_providers += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"  -> {created_providers} neue Provider {'vorgemerkt' if dry_run else 'angelegt'} "
                f"(Gesamt-Ziel: {len(all_target_providers)})."
            )
        )

        known_db_providers = sorted(
            set(Provider.objects.values_list("provider", flat=True))
            | all_target_providers
        )

        # ── 2. Rauschen & Private Dokumente ablehnen ──
        self.stdout.write(
            self.style.WARNING("\n2. Prüfe Pending-Zertifikate auf Rauschen...")
        )
        pending_qs = PendingCertificate.objects.filter(
            status=PendingCertificateStatus.PENDING
        )
        rejected_private_count = 0
        rejected_material_count = 0
        valid_candidates: list[PendingCertificate] = []

        for p in pending_qs:
            fn = p.original_file_name
            title = p.guessed_title or ""

            if is_private_document(fn, title):
                rejected_private_count += 1
                self.stdout.write(
                    self.style.ERROR(f"  [REJECT PRIVATE] {fn} (Titel: {title})")
                )
                if not dry_run:
                    p.status = PendingCertificateStatus.REJECTED
                    p.save(update_fields=["status"])
            elif is_course_material_or_noise(fn, title):
                rejected_material_count += 1
                self.stdout.write(self.style.NOTICE(f"  [REJECT MATERIAL] {fn}"))
                if not dry_run:
                    p.status = PendingCertificateStatus.REJECTED
                    p.save(update_fields=["status"])
            else:
                valid_candidates.append(p)

        self.stdout.write(
            self.style.SUCCESS(
                f"  -> {rejected_private_count} private Dokumente und "
                f"{rejected_material_count} Lernmaterialien/Logos "
                f"{'würden abgewiesen' if dry_run else 'abgewiesen'}."
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"  -> {len(valid_candidates)} valide Zertifikat-Kandidaten verbleiben."
            )
        )

        # ── 3. Re-Extraktion & Metadaten-Update ──
        if not skip_reextract and valid_candidates:
            self.stdout.write(
                self.style.WARNING(
                    f"\n3. Re-Evaluiere {len(valid_candidates)} Zertifikat-Kandidaten mit neuem Extractor..."
                )
            )
            updated_count = 0

            for p in valid_candidates:
                file_path = Path(p.file_path)
                if not file_path.exists():
                    continue

                source_root = file_path.parent
                try:
                    result = extract_metadata(
                        file_path=file_path,
                        source_root=source_root,
                        track_rules=TRACK_RULES,
                        enable_ocr=True,
                        known_providers=known_db_providers,
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Extraktion fehlgeschlagen für %s: %s", fn, exc)
                    continue

                if not result:
                    continue

                new_title = result.guessed_title or p.guessed_title
                new_provider = result.guessed_provider or p.guessed_provider

                # Falls der Provider noch leer ist, prüfe ob Ordnername im Dateipfad auf Provider hinweist
                if not new_provider:
                    for folder_key, prov_name in PROVIDER_FOLDER_MAPPING.items():
                        if folder_key in file_path.parts:
                            new_provider = prov_name
                            break

                if not dry_run:
                    p.guessed_title = new_title[:255] if new_title else ""
                    p.guessed_provider = new_provider[:255] if new_provider else ""
                    p.extracted_text = (result.extracted_text or "")[:100000]
                    p.save(
                        update_fields=[
                            "guessed_title",
                            "guessed_provider",
                            "extracted_text",
                        ]
                    )

                    # Tracks verknüpfen
                    for slug in result.guessed_track_slugs:
                        track_obj, _ = Track.objects.get_or_create(
                            slug=slug,
                            defaults={"name": slug.replace("-", " ").title()},
                        )
                        p.suggested_tracks.add(track_obj)

                updated_count += 1
                self.stdout.write(
                    f"  [OK] {p.original_file_name[:35]:35} | "
                    f"Provider: {new_provider or '-':20} | Titel: {new_title or '-'}"
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f"\n  -> {updated_count} Zertifikate erfolgreich "
                    f"{'analysiert' if dry_run else 'aktualisiert'}."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n=== Bereinigung {mode_str} erfolgreich abgeschlossen ===\n"
            )
        )
