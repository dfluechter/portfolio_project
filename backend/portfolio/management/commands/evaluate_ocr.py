"""Strikt lesender Evaluations-Command für OCR & Titelerkennung."""

from __future__ import annotations

import os
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from portfolio.models import TRACK_RULES, Certificate, PendingCertificate, Provider
from portfolio.services.extractor import compute_file_hash, extract_metadata

VALID_EXTENSIONS = frozenset({".pdf", ".png", ".jpg", ".jpeg"})


class Command(BaseCommand):
    help = (
        "Evaluiert die OCR- und Titel-Extraktionsqualität strikt lesend auf "
        "Zertifikatsdateien (Standard: CERTIFICATES_PATH) und vergleicht sie mit DB-Titeln."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=str,
            default=None,
            help="Quellverzeichnis (Standard: Umgebungsvariable CERTIFICATES_PATH).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=25,
            help="Maximale Anzahl geprüfter Dateien (Standard: 25, 0 = alle).",
        )
        parser.add_argument(
            "--no-ocr",
            action="store_true",
            default=False,
            help="Deaktiviert Tesseract-OCR während der Evaluation.",
        )

    def handle(self, *args, **options):
        raw_path = options.get("path") or os.getenv("CERTIFICATES_PATH")
        if not raw_path:
            raise CommandError(
                "Kein Pfad angegeben und CERTIFICATES_PATH ist nicht gesetzt."
            )

        root = Path(raw_path).resolve()
        if not root.exists() or not root.is_dir():
            raise CommandError(f"Quellverzeichnis existiert nicht: {root}")
        if root.is_symlink():
            raise CommandError(f"Quellverzeichnis ist ein Symlink: {root}")

        limit: int = max(0, int(options.get("limit") or 0))
        enable_ocr: bool = not options.get("no_ocr", False)

        # Strikt read-only: Dateien nur sammeln, niemals verändern/verschieben/löschen
        candidates: list[Path] = []
        for item in sorted(root.rglob("*")):
            if not item.is_file() or item.is_symlink():
                continue
            if item.name.startswith(".") or item.suffix.lower() not in VALID_EXTENSIONS:
                continue
            candidates.append(item)
            if limit and len(candidates) >= limit:
                break

        known_providers = list(Provider.objects.values_list("provider", flat=True))
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"=== Read-Only OCR-Evaluation ({len(candidates)} Dateien aus {root.name}) ==="
            )
        )

        total = 0
        with_title = 0
        high_conf = 0
        ocr_pending_count = 0
        db_matched = 0

        for file_path in candidates:
            total += 1
            file_hash = compute_file_hash(file_path)
            result = extract_metadata(
                file_path=file_path,
                source_root=root,
                track_rules=TRACK_RULES,
                enable_ocr=enable_ocr,
                known_providers=known_providers,
            )
            if not result:
                self.stdout.write(f"[ERR ] {file_path.name} -> Extraktion None")
                continue

            if result.guessed_title:
                with_title += 1
            if result.title_confidence >= 0.80:
                high_conf += 1
            if result.ocr_pending:
                ocr_pending_count += 1

            db_cert = Certificate.objects.filter(sha256_hash=file_hash).first()
            db_pending = (
                None
                if db_cert
                else PendingCertificate.objects.filter(sha256_hash=file_hash).first()
            )
            db_title = ""
            if db_cert:
                db_title = db_cert.title
                db_matched += 1
            elif db_pending:
                db_title = db_pending.guessed_title
                db_matched += 1

            db_suffix = f" | DB: '{db_title}'" if db_title else ""
            self.stdout.write(
                f"[{result.extraction_stage or '-':13}] {file_path.name[:32]:32} | "
                f"Conf={result.title_confidence:.0%} | "
                f"Titel='{result.guessed_title or '-'}' | "
                f"Provider='{result.guessed_provider or '-'}'{db_suffix}"
            )

        self.stdout.write("\n--- Zusammenfassung ---")
        self.stdout.write(f"Geprüfte Dateien  : {total}")
        self.stdout.write(
            f"Titel erkannt     : {with_title}/{total} "
            f"({(with_title / total * 100):.1f}%)"
            if total
            else "Titel erkannt: 0/0"
        )
        self.stdout.write(f"Hohe Confidence   : {high_conf}/{total} (>= 80%)")
        self.stdout.write(f"OCR ausstehend    : {ocr_pending_count}/{total}")
        self.stdout.write(f"DB-Referenz Match : {db_matched}/{total}")
