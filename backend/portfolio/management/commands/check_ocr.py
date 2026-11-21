"""Management-Command zum Prüfen der lokalen OCR- und PDF-Infrastruktur."""

from __future__ import annotations

import os

from django.core.management.base import BaseCommand, CommandError
from PIL import Image, ImageDraw, ImageFont

from portfolio.services.ocr import (
    TESSERACT_INSTALL_GUIDE,
    check_tesseract_health,
    run_tesseract_ocr,
)


class Command(BaseCommand):
    help = (
        "Prüft die lokale OCR-Konfiguration (Tesseract-Binary, Sprachpakete deu/eng, "
        "PDF-Renderer und Gemini-Vision-Einstellungen)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--strict",
            action="store_true",
            default=False,
            help="Bricht mit Exit-Code != 0 ab, falls Tesseract nicht einsatzbereit ist.",
        )
        parser.add_argument(
            "--no-smoke-test",
            action="store_true",
            default=False,
            help="Überspringt den synthetischen Bild-OCR-Smoke-Test.",
        )

    def handle(self, *args, **options):
        strict: bool = options.get("strict", False)
        no_smoke: bool = options.get("no_smoke_test", False)

        self.stdout.write(self.style.MIGRATE_HEADING("=== OCR Health-Check ==="))
        status = check_tesseract_health()

        self.stdout.write(f"Tesseract-Binary : {status.cmd or 'NICHT GEFUNDEN'}")
        self.stdout.write(f"Version          : {status.version or '-'}")
        self.stdout.write(f"TESSDATA_PREFIX  : {status.tessdata_dir or '-'}")
        self.stdout.write(
            f"Sprachpakete     : {', '.join(status.languages) if status.languages else '-'}"
        )
        self.stdout.write(f"  - eng          : {'OK' if status.has_eng else 'FEHLT'}")
        self.stdout.write(f"  - deu          : {'OK' if status.has_deu else 'FEHLT'}")
        self.stdout.write(
            f"PDF-Renderer     : {status.pdf_render_backend or '-'}"
            + (f" ({status.poppler_path})" if status.poppler_path else "")
        )

        gemini_enabled = os.getenv("GEMINI_VISION_ENABLED", "true")
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        has_api_key = bool(os.getenv("GEMINI_API_KEY", "").strip())
        self.stdout.write(
            f"Gemini Vision    : enabled={gemini_enabled}, model={gemini_model}, "
            f"api_key={'gesetzt' if has_api_key else 'nicht gesetzt'}"
        )

        if not status.available:
            self.stderr.write(self.style.ERROR(f"\nFEHLER: {status.error}"))
            self.stdout.write(self.style.WARNING(f"Hinweis: {TESSERACT_INSTALL_GUIDE}"))
            if strict:
                raise CommandError("Tesseract-OCR ist nicht einsatzbereit.")
            return

        if not status.has_deu:
            self.stdout.write(
                self.style.WARNING(
                    "\nWARNUNG: Sprachpaket 'deu' fehlt — deutsche Umlaute können "
                    "fehlerhaft erkannt werden. Bitte 'deu.traineddata' installieren."
                )
            )

        if not no_smoke:
            img = Image.new("RGB", (900, 220), color=(255, 255, 255))
            draw = ImageDraw.Draw(img)
            font = ImageFont.load_default(size=36)
            draw.text(
                (40, 80), "Python Architecture Masterclass", fill=(0, 0, 0), font=font
            )
            recognized = run_tesseract_ocr(img)
            if recognized:
                self.stdout.write(
                    self.style.SUCCESS(f"\nSmoke-Test OK    : '{recognized}'")
                )
            else:
                msg = "Smoke-Test lieferte keinen Text (prüfe Tesseract-Ausführung)."
                self.stderr.write(self.style.ERROR(f"\nFEHLER: {msg}"))
                if strict:
                    raise CommandError(msg)
                return

        self.stdout.write(self.style.SUCCESS("\nOCR-Pipeline ist einsatzbereit."))
