"""Umfassende Tests für die mehrstufige OCR- und Titel-Extraktionspipeline."""

from __future__ import annotations

import logging
import os
import subprocess
from io import StringIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from PIL import Image, ImageDraw, ImageFont

from portfolio.models import TRACK_RULES, Certificate, Provider
from portfolio.services.extractor import extract_metadata, guess_title
from portfolio.services.ocr import (
    TesseractStatus,
    check_tesseract_health,
    is_tesseract_available,
    preprocess_image_for_ocr,
    render_pdf_pages_to_images,
    resolve_tesseract_cmd,
    run_tesseract_ocr,
)
from portfolio.services.title_extractor import (
    extract_best_title,
    is_non_title_line,
)

TESSERACT_OK = is_tesseract_available()


def _build_vector_pdf(lines: list[tuple[str, str, int, int, int]]) -> bytes:
    """Erzeugt ein valides Vektor-PDF mit definierten Schriftgrößen und Koordinaten."""
    stream_cmds = ["BT"]
    for font_key, text, size, x, y in lines:
        safe_txt = (
            text.replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)")
            .encode("latin-1", "replace")
            .decode("latin-1")
        )
        stream_cmds.append(f"/{font_key} {size} Tf")
        stream_cmds.append(f"1 0 0 1 {x} {y} Tm")
        stream_cmds.append(f"({safe_txt}) Tj")
    stream_cmds.append("ET")
    stream_bytes = "\n".join(stream_cmds).encode("latin-1")

    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        (
            b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj\n"
        ),
        (
            f"4 0 obj << /Length {len(stream_bytes)} >>\nstream\n".encode("latin-1")
            + stream_bytes
            + b"\nendstream\nendobj\n"
        ),
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        b"6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)
    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("latin-1"))
    for off in offsets[1:]:
        pdf.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
    pdf.extend(
        (
            f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF"
        ).encode("latin-1")
    )
    return bytes(pdf)


def _build_scan_certificate_image(lines: list[str]) -> Image.Image:
    """Erstellt ein synthetisches Zertifikatsbild (PNG) ohne eingebetteten Textlayer."""
    img = Image.new("RGB", (1200, 800), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    font_large = ImageFont.load_default(size=32)
    font_small = ImageFont.load_default(size=22)

    y = 80
    for idx, line in enumerate(lines):
        font = font_large if idx == 1 else font_small
        draw.text((80, y), line, fill=(10, 10, 10), font=font)
        y += 85
    return img


# ---------------------------------------------------------------------------
# 1. Titel-Heuristik für typische Zertifikats-Layouts
# ---------------------------------------------------------------------------


def test_non_title_filter_rejects_boilerplate_names_urls_and_dates():
    """Filtert generische Überschriften, Inhabername, Daten, URLs und Anbieter."""
    noise_lines = [
        "Zertifikat",
        "Certificate of Completion",
        "Teilnahmebescheinigung",
        "Hiermit wird bestätigt",
        "Dominik Flüchter",
        "Herr Dominik Flüchter",
        "Datum: 15.05.2024",
        "28. Nov. 2023",
        "https://ude.my/UC-1234567890",
        "Zertifikat-Nr.: UC-3f0ea848-5950-4fe9-ad31-7d4cb00039d3",
        "Udemy",
        "Coursera",
        "LinkedIn Learning",
    ]
    for line in noise_lines:
        assert is_non_title_line(line) is True, f"Hätte gefiltert werden müssen: {line}"

    assert is_non_title_line("Kubernetes Production Engineering") is False


def test_udemy_multiline_title_extraction():
    """Erkennt mehrzeilige Udemy-Kurstitel zwischen Header und Lehrkraft/Datum."""
    text = (
        "ZERTIFIKAT ÜBER DIE ERFOLGREICHE TEILNAHME\n"
        "Fullstack Web Development mit\n"
        "Django REST Framework und React 19\n"
        "Lehrkraft: Max Mustermann\n"
        "Dominik Flüchter\n"
        "Datum: 12. März 2025\n"
        "Zertifikat-Nr.: UC-aaaa1111-2222-3333-4444-555566667777"
    )
    cand = extract_best_title(text, "tmp9988.pdf", {}, provider="Udemy")
    assert (
        cand.title == "Fullstack Web Development mit Django REST Framework und React 19"
    )
    assert cand.confidence >= 0.90


def test_coursera_multiline_layout_extraction(tmp_path):
    """Erkennt Coursera-Kurstitel nach 'has successfully completed' (mehrzeilig)."""
    pdf_path = tmp_path / "coursera_ml.pdf"
    pdf_path.write_bytes(
        _build_vector_pdf(
            [
                ("F1", "coursera", 14, 60, 720),
                ("F1", "May 15, 2024", 10, 60, 680),
                ("F1", "Dominik Fluechter", 16, 60, 630),
                ("F1", "has successfully completed", 11, 60, 595),
                ("F2", "Machine Learning Engineering for", 20, 60, 555),
                ("F2", "Production (MLOps) Specialization", 20, 60, 530),
                (
                    "F1",
                    "an online non-credit course authorized by DeepLearning.AI",
                    10,
                    60,
                    480,
                ),
                ("F1", "Verify at https://coursera.org/verify/ABC123XYZ", 9, 60, 420),
            ]
        )
    )
    with patch("portfolio.services.extractor.extract_via_gemini_vision") as mock_gem:
        res = extract_metadata(pdf_path, tmp_path, TRACK_RULES, enable_ocr=False)

    assert res is not None
    assert (
        res.guessed_title
        == "Machine Learning Engineering for Production (MLOps) Specialization"
    )
    assert res.guessed_provider == "Coursera"
    assert res.issued_date == "2024-05-15"
    assert res.title_confidence >= 0.85
    mock_gem.assert_not_called()


def test_linkedin_learning_layout_extraction(tmp_path):
    """Erkennt LinkedIn Learning Titel ohne Verwechslung mit Gratulationstext."""
    pdf_path = tmp_path / "linkedin_docker.pdf"
    pdf_path.write_bytes(
        _build_vector_pdf(
            [
                ("F1", "LinkedIn Learning", 14, 60, 720),
                ("F1", "Certificate of Completion", 12, 60, 690),
                ("F1", "Congratulations, Dominik Fluechter", 14, 60, 640),
                ("F1", "Course completed on Mar 12, 2024", 11, 60, 610),
                ("F2", "Docker Foundations Professional Certificate", 22, 60, 550),
                ("F1", "By: LinkedIn Learning", 10, 60, 500),
            ]
        )
    )
    with patch("portfolio.services.extractor.extract_via_gemini_vision") as mock_gem:
        res = extract_metadata(pdf_path, tmp_path, TRACK_RULES, enable_ocr=False)

    assert res is not None
    assert res.guessed_title == "Docker Foundations Professional Certificate"
    assert res.guessed_provider == "LinkedIn Learning"
    assert res.issued_date == "2024-03-12"
    mock_gem.assert_not_called()


def test_ihk_german_teilnahmebescheinigung_extraction(tmp_path):
    """Erkennt Kurstitel aus deutschen IHK-/Weiterbildungsbescheinigungen."""
    text_sentence = (
        "IHK Akademie\n"
        "Teilnahmebescheinigung\n"
        "Hiermit wird bestätigt:\n"
        "Herr Dominik Flüchter\n"
        'hat erfolgreich am Lehrgang "Cloud-Architektur und DevOps Praxis" teilgenommen.\n'
        "Ausgestellt am: 18.09.2024"
    )
    title = guess_title(text_sentence, "bescheinigung.pdf", {}, provider="IHK")
    assert title == "Cloud-Architektur und DevOps Praxis"

    pdf_path = tmp_path / "ihk_thema.pdf"
    pdf_path.write_bytes(
        _build_vector_pdf(
            [
                ("F2", "Teilnahmebescheinigung", 18, 60, 720),
                ("F1", "Herr Dominik Fluechter", 12, 60, 660),
                (
                    "F2",
                    "Thema: IT-Sicherheit und Datenschutz im Unternehmen",
                    16,
                    60,
                    610,
                ),
                ("F1", "Veranstalter: IHK Weiterbildungszentrum", 11, 60, 560),
                ("F1", "Datum: 10.10.2024", 10, 60, 520),
            ]
        )
    )
    with patch("portfolio.services.extractor.extract_via_gemini_vision"):
        res = extract_metadata(pdf_path, tmp_path, TRACK_RULES, enable_ocr=False)

    assert res is not None
    assert res.guessed_title == "IT-Sicherheit und Datenschutz im Unternehmen"
    assert res.issued_date == "2024-10-10"


def test_microsoft_and_aws_certificate_layouts():
    """Erkennt mehrzeilige Microsoft- und AWS-Zertifikatsnamen."""
    ms_text = (
        "Microsoft Certified:\n"
        "Azure Administrator Associate\n"
        "Dominik Flüchter\n"
        "Date of achievement: June 10, 2024\n"
        "learn.microsoft.com/verify/MS-9988"
    )
    cand_ms = extract_best_title(ms_text, "ms_cert.pdf", {}, provider="Microsoft")
    assert cand_ms.title == "Microsoft Certified: Azure Administrator Associate"
    assert cand_ms.confidence >= 0.90

    aws_text = (
        "AWS Training and Certification\n"
        "Certificate of Completion\n"
        "Dominik Flüchter\n"
        "has successfully completed\n"
        "AWS Certified Solutions Architect - Associate\n"
        "Issue Date: 2024-07-01"
    )
    cand_aws = extract_best_title(aws_text, "aws_cert.pdf", {}, provider="AWS")
    assert cand_aws.title == "AWS Certified Solutions Architect - Associate"


def test_layout_font_size_wins_without_explicit_keywords(tmp_path):
    """Bei PDFs ohne 'has successfully completed' gewinnt die größte fette Nicht-Noise-Zeile."""
    pdf_path = tmp_path / "vector_layout_only.pdf"
    pdf_path.write_bytes(
        _build_vector_pdf(
            [
                (
                    "F2",
                    "ZERTIFIKAT",
                    28,
                    60,
                    720,
                ),  # Größer, aber generischer Header -> gefiltert
                ("F1", "Dominik Fluechter", 16, 60, 650),  # Inhabername -> gefiltert
                ("F2", "Kubernetes Production", 22, 60, 580),
                (
                    "F2",
                    "Engineering & Security",
                    22,
                    60,
                    550,
                ),  # Zweizeiler mit gleicher Größe
                (
                    "F1",
                    "Linux Foundation Training | Date: 2025-02-01 | Verify ID LF-4242",
                    10,
                    60,
                    440,
                ),
            ]
        )
    )
    with patch("portfolio.services.extractor.extract_via_gemini_vision") as mock_gem:
        res = extract_metadata(pdf_path, tmp_path, TRACK_RULES, enable_ocr=False)

    assert res is not None
    assert res.guessed_title == "Kubernetes Production Engineering & Security"
    assert res.title_confidence >= 0.80
    assert res.guessed_provider == "Linux Foundation"
    mock_gem.assert_not_called()


# ---------------------------------------------------------------------------
# 2. OCR-Infrastruktur, Diagnose & Preprocessing
# ---------------------------------------------------------------------------


def test_resolve_tesseract_cmd_prefers_env_var(tmp_path, monkeypatch):
    """TESSERACT_CMD Env-Var setzt den Binary-Pfad und TESSDATA_PREFIX automatisch."""
    import pytesseract

    fake_dir = tmp_path / "tess"
    fake_dir.mkdir()
    fake_exe = fake_dir / "tesseract.exe"
    fake_exe.write_bytes(b"stub")
    tessdata_dir = fake_dir / "tessdata"
    tessdata_dir.mkdir()

    monkeypatch.setenv("TESSERACT_CMD", str(fake_exe))
    monkeypatch.delenv("TESSDATA_PREFIX", raising=False)

    resolved = resolve_tesseract_cmd()
    assert resolved == str(fake_exe)
    assert pytesseract.pytesseract.tesseract_cmd == str(fake_exe)
    assert Path(os.environ["TESSDATA_PREFIX"]) == tessdata_dir


def test_check_tesseract_health_reports_oserror_clearly(monkeypatch):
    """Fängt OSError (z.B. WinError 623) mit klarer Diagnosemeldung statt stumm ab."""
    monkeypatch.setattr(
        "portfolio.services.ocr.resolve_tesseract_cmd",
        lambda: r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    )

    def raise_win_dll_err(*_args, **_kwargs):
        raise OSError(22, "System-DLL verschoben", None, 623)

    monkeypatch.setattr(subprocess, "run", raise_win_dll_err)

    status = check_tesseract_health()
    assert status.available is False
    assert status.error is not None
    assert "WinError 623" in status.error
    assert "UB-Mannheim.TesseractOCR" in status.install_hint


def test_preprocess_image_flattens_rgba_to_white_and_upscales():
    """RGBA-Transparenz wird auf Weiß gelegt und kleine Bilder werden hochskaliert."""
    rgba = Image.new("RGBA", (300, 100), (255, 255, 255, 0))
    draw = ImageDraw.Draw(rgba)
    draw.text((20, 30), "Django Certificate", fill=(0, 0, 0, 255))

    processed = preprocess_image_for_ocr(rgba, binarize=True, target_min_width=900)
    assert processed.mode == "L"
    assert processed.width == 900
    # Hintergrund-Ecke (0, 0) muss weiß (255) statt schwarz (0) sein
    assert processed.getpixel((0, 0)) == 255


def test_run_tesseract_ocr_logs_warning_and_falls_back_to_eng(caplog, monkeypatch):
    """Bei TesseractError mit deu+eng erfolgt Fallback auf eng; Fehler werden geloggt."""
    import pytesseract

    img = Image.new("RGB", (200, 80), color=(255, 255, 255))
    calls: list[str] = []

    def fake_image_to_string(_image, lang=None, config=None, timeout=None):
        calls.append(str(lang))
        if lang == "deu+eng":
            raise pytesseract.TesseractError(1, "Failed loading language 'deu'")
        return "Python Backend Architecture Certification"

    monkeypatch.setattr(
        "portfolio.services.ocr.resolve_tesseract_cmd", lambda: "tesseract"
    )
    monkeypatch.setattr(
        "portfolio.services.ocr._select_tesseract_langs", lambda _l=None: "deu+eng"
    )
    monkeypatch.setattr(pytesseract, "image_to_string", fake_image_to_string)

    with caplog.at_level(logging.WARNING):
        result = run_tesseract_ocr(img)

    assert result == "Python Backend Architecture Certification"
    assert calls == ["deu+eng", "eng"]
    assert "Fallback auf 'eng'" in caplog.text


def test_scanned_image_pdf_renders_and_triggers_ocr(tmp_path, monkeypatch):
    """Bildbasierte PDF ohne Textlayer wird gerendert und per OCR ausgewertet."""
    pdf_path = tmp_path / "scanned_cert.pdf"
    scan_img = _build_scan_certificate_image(
        [
            "Certificate of Completion",
            "React TypeScript Architecture",
            "Provider: Udemy",
        ]
    )
    scan_img.save(pdf_path, "PDF", resolution=100.0)

    rendered_mock = MagicMock(return_value=[scan_img])
    monkeypatch.setattr(
        "portfolio.services.extractor.render_pdf_pages_to_images", rendered_mock
    )
    monkeypatch.setattr(
        "portfolio.services.extractor.run_tesseract_ocr",
        lambda _img: (
            "CERTIFICATE OF COMPLETION\n"
            "React TypeScript Architecture\n"
            "Instructors: Jane Doe\n"
            "Date: May 10, 2024\n"
            "Certificate no: UC-11112222-3333-4444-5555-666677778888"
        ),
    )

    with patch("portfolio.services.extractor.extract_via_gemini_vision") as mock_gem:
        res = extract_metadata(pdf_path, tmp_path, TRACK_RULES, enable_ocr=True)

    assert res is not None
    assert rendered_mock.called
    assert res.ocr_pending is False
    assert res.extraction_stage == "tesseract-ocr"
    assert res.guessed_title == "React TypeScript Architecture"
    assert res.guessed_provider == "Udemy"
    mock_gem.assert_not_called()


def test_render_pdf_pages_falls_back_to_pdftoppm(tmp_path, monkeypatch):
    """Wenn PyMuPDF fehlt, rendert render_pdf_pages_to_images sauber via pdftoppm."""
    pdf_path = tmp_path / "dummy.pdf"
    pdf_path.write_bytes(b"%PDF-1.4")

    monkeypatch.setattr("portfolio.services.ocr._has_pymupdf", lambda: False)
    monkeypatch.setattr(
        "portfolio.services.ocr.resolve_pdftoppm_cmd", lambda: "pdftoppm"
    )

    def fake_run(cmd, **_kwargs):
        out_prefix = Path(cmd[-1])
        out_img = out_prefix.parent / f"{out_prefix.name}-1.png"
        Image.new("RGB", (400, 300), color="white").save(out_img)
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)

    pages = render_pdf_pages_to_images(pdf_path, max_pages=1, dpi=150)
    assert len(pages) == 1
    assert pages[0].size == (400, 300)


# ---------------------------------------------------------------------------
# 3. Echte Tesseract-Tests (übersprungen, wenn lokal/Sandbox nicht ausführbar)
# ---------------------------------------------------------------------------


@pytest.mark.skipif(
    not TESSERACT_OK,
    reason="Tesseract-Binary ist in dieser Umgebung nicht ausführbar.",
)
def test_real_tesseract_ocr_on_synthetic_certificate(tmp_path):
    """Führt echtes Tesseract-OCR auf einem synthetisch generierten Bild aus."""
    img = _build_scan_certificate_image(
        [
            "CERTIFICATE OF COMPLETION",
            "Python Django REST Mastery",
            "Dominik Fluechter",
            "Issued on: 2024-08-15",
        ]
    )
    img_path = tmp_path / "real_ocr_test.png"
    img.save(img_path)

    with patch("portfolio.services.extractor.extract_via_gemini_vision"):
        res = extract_metadata(img_path, tmp_path, TRACK_RULES, enable_ocr=True)

    assert res is not None
    assert res.ocr_pending is False
    assert "Django" in res.extracted_text


# ---------------------------------------------------------------------------
# 4. Management Commands: check_ocr & evaluate_ocr (read-only)
# ---------------------------------------------------------------------------


def test_check_ocr_command_strict_raises_when_unavailable(monkeypatch):
    """`check_ocr --strict` meldet CommandError, wenn Tesseract nicht verfügbar ist."""
    monkeypatch.setattr(
        "portfolio.management.commands.check_ocr.check_tesseract_health",
        lambda: TesseractStatus(available=False, error="Tesseract fehlt"),
    )

    out = StringIO()
    err = StringIO()
    # Ohne --strict läuft der Check informativ durch
    call_command("check_ocr", stdout=out, stderr=err)
    assert "Tesseract fehlt" in err.getvalue()

    with pytest.raises(CommandError):
        call_command("check_ocr", "--strict", stdout=out, stderr=err)


@pytest.mark.django_db
def test_evaluate_ocr_command_is_read_only_and_compares_db(tmp_path):
    """`evaluate_ocr` liest Dateien unverändert und vergleicht Titel mit DB-Einträgen."""
    from portfolio.services.extractor import compute_file_hash

    pdf_path = tmp_path / "aws_sample.pdf"
    original_bytes = _build_vector_pdf(
        [
            ("F1", "AWS Training and Certification", 12, 60, 710),
            ("F1", "Certificate of Completion", 11, 60, 680),
            ("F1", "Dominik Fluechter", 14, 60, 640),
            ("F1", "has successfully completed", 11, 60, 605),
            ("F2", "AWS Cloud Practitioner Essentials", 22, 60, 565),
            ("F1", "Date: 2024-04-01", 10, 60, 510),
        ]
    )
    pdf_path.write_bytes(original_bytes)
    expected_hash = compute_file_hash(pdf_path)

    provider = Provider.objects.create(provider="AWS", aktiv=True)
    Certificate.objects.create(
        title="cert_old_bad_title",
        provider=provider,
        sha256_hash=expected_hash,
    )

    out = StringIO()
    with patch("portfolio.services.extractor.extract_via_gemini_vision"):
        call_command(
            "evaluate_ocr",
            "--path",
            str(tmp_path),
            "--limit",
            "5",
            "--no-ocr",
            stdout=out,
        )

    report = out.getvalue()
    assert "AWS Cloud Practitioner Essentials" in report
    assert "DB: 'cert_old_bad_title'" in report
    assert "Titel erkannt     : 1/1 (100.0%)" in report
    # Quelldatei darf nicht verändert worden sein
    assert pdf_path.read_bytes() == original_bytes
