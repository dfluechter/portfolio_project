import json
import os
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

from portfolio.services.extractor import (
    extract_metadata,
    extract_via_gemini_vision,
)


@pytest.fixture(autouse=True)
def reset_ai_circuit_breaker():
    """Stellt sicher, dass der AI-Circuit-Breaker Tests nicht gegenseitig beeinflusst."""
    from django.core.cache import cache

    from portfolio.services.ai_assistant import AI_CIRCUIT_BREAKER_KEY

    cache.delete(AI_CIRCUIT_BREAKER_KEY)
    yield
    cache.delete(AI_CIRCUIT_BREAKER_KEY)


@pytest.fixture
def dummy_image_file(tmp_path):
    """Erstellt ein temporäres, leeres Bild ohne Text."""
    img_path = tmp_path / "cert_scan.png"
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    img.save(img_path)
    return img_path


def test_gemini_vision_graceful_degradation_without_api_key(dummy_image_file):
    """Wenn kein API-Key konfiguriert ist, muss die Funktion None liefern."""
    with patch.dict(os.environ, {}, clear=True):
        result = extract_via_gemini_vision(dummy_image_file)
        assert result is None


def test_gemini_vision_successful_extraction(dummy_image_file):
    """Testet den erfolgreichen Aufruf der Gemini Vision API mit gemocktem genai.Client."""
    mock_payload = {
        "title": "AWS Certified Solutions Architect",
        "provider": "Amazon Web Services",
        "credential_id": "AWS-123456",
        "issued_date": "2024-05-15",
        "extracted_text": "This certifies that Jane Doe has successfully completed...",
        "tracks": ["cloud-devops", "backend"],
    }

    mock_resp = MagicMock()
    mock_resp.text = json.dumps(mock_payload)
    mock_resp.usage_metadata.total_token_count = 150

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_resp

    with patch("google.genai.Client", return_value=mock_client):
        result = extract_via_gemini_vision(dummy_image_file, api_key="dummy-test-key")

    assert result is not None
    assert result["title"] == "AWS Certified Solutions Architect"
    assert result["provider"] == "Amazon Web Services"
    assert result["credential_id"] == "AWS-123456"
    assert result["issued_date"] == "2024-05-15"
    assert "cloud-devops" in result["tracks"]


def test_gemini_vision_handles_api_error_gracefully(dummy_image_file):
    """Testet, dass API-Fehler (z.B. HTTP 500 oder Netzwerkfehler) abgefangen werden."""
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = RuntimeError(
        "API connection failed"
    )

    with patch("google.genai.Client", return_value=mock_client):
        result = extract_via_gemini_vision(dummy_image_file, api_key="dummy-test-key")
        assert result is None


def test_extract_metadata_integrates_stage3_fallback(dummy_image_file, tmp_path):
    """
    Testet, dass extract_metadata bei unvollständiger lokaler Extraktion
    automatisch auf Stufe 3 (Gemini Vision) zurückgreift und Metadaten übernimmt.
    """
    mock_gemini_data = {
        "title": "Professional Cloud Architect",
        "provider": "Google Cloud",
        "credential_id": "GCP-98765",
        "issued_date": "2024-06-20",
        "extracted_text": "Certificate of Completion: Professional Cloud Architect",
        "tracks": ["cloud-devops"],
    }

    track_rules = {
        "cloud-devops": ["cloud", "architect", "gcp"],
        "backend": ["python", "django"],
    }

    with patch(
        "portfolio.services.extractor.extract_via_gemini_vision",
        return_value=mock_gemini_data,
    ):
        result = extract_metadata(
            file_path=dummy_image_file,
            source_root=tmp_path,
            track_rules=track_rules,
            enable_ocr=True,
        )

    assert result is not None
    assert result.guessed_title == "Professional Cloud Architect"
    assert result.guessed_provider == "Google Cloud"
    assert result.credential_id == "GCP-98765"
    assert result.issued_date == "2024-06-20"
    assert "cloud-devops" in result.guessed_track_slugs
    # Da Gemini Vision erfolgreich war, ist OCR nicht mehr pending
    assert result.ocr_pending is False


def test_gemini_vision_disabled_when_flag_false(dummy_image_file):
    """Stellt sicher, dass keine API-Aufrufe stattfinden, wenn GEMINI_VISION_ENABLED=False gesetzt ist."""
    with (
        patch.dict(
            os.environ,
            {"GEMINI_API_KEY": "dummy-key", "GEMINI_VISION_ENABLED": "False"},
        ),
        patch("google.genai.Client") as mock_client,
    ):
        result = extract_via_gemini_vision(dummy_image_file, api_key="dummy-key")
        assert result is None
        mock_client.assert_not_called()


def test_gemini_vision_skips_oversized_file_to_prevent_token_spike(
    dummy_image_file,
):
    """Verhindert das Senden zu großer Dateien an Gemini Vision, um Token-Grenzen zu schützen."""
    with (
        patch.dict(
            os.environ,
            {"GEMINI_API_KEY": "dummy-key", "GEMINI_VISION_MAX_FILE_BYTES": "10"},
        ),
        patch("google.genai.Client") as mock_client,
    ):
        result = extract_via_gemini_vision(dummy_image_file, api_key="dummy-key")
        assert result is None
        mock_client.assert_not_called()


def test_gemini_vision_blocked_when_daily_token_limit_reached(dummy_image_file):
    """Deaktiviert Gemini Vision automatisch, wenn das tägliche Token-Limit erreicht ist."""
    from django.core.cache import cache

    cache.clear()
    with (
        patch.dict(
            os.environ,
            {"GEMINI_API_KEY": "dummy-key", "GEMINI_DAILY_TOKEN_LIMIT": "5"},
        ),
        patch("google.genai.Client") as mock_client,
    ):
        result = extract_via_gemini_vision(dummy_image_file, api_key="dummy-key")
        assert result is None
        mock_client.assert_not_called()
    cache.clear()


def test_guess_title_ignores_owner_name_and_phrases():
    """Prüft, dass der Name des Inhabers und reine Floskeln nicht als Titel fehlinterpretiert werden."""
    from portfolio.services.extractor import guess_title

    text = (
        "Certificate of Completion\n"
        "This is to certify that Dominik Flüchter has successfully completed the course\n"
        "Fullstack Architecture with Django and React"
    )
    title = guess_title(text, "file.pdf", {})
    assert "Fullstack Architecture with Django and React" in title
    assert "Dominik" not in title
    assert "Flüchter" not in title


def test_udemy_certificate_structure_extraction_live_example():
    """Prüft das reale Udemy-Beispiel: UC-3fOea848-5950-4fe9-ad31-7d4cb00039d3."""
    from portfolio.services.extractor import (
        extract_credential_id,
        extract_issued_date,
        guess_provider,
        guess_title,
    )

    udemy_text = (
        "ZERTIFIKAT ÜBER DIE ERFOLGREICHE TEILNAHME\n"
        "Data Science - Datenvorbereitung und Qualitätssicherung Excel\n"
        "Lehrkraft: Dr. Example\n"
        "Dominik Flüchter\n"
        "Datum: 28. Nov. 2023\n"
        "Dauer: 5 Gesamtstunden\n"
        "Zertifikat-Nr.: UC-3fOea848-5950-4fe9-ad31-7d4cb00039d3\n"
        "Zertifikat-URL: ude.my/UC-3fOea848-5950-4fe9-ad31-7d4cb00039d3\n"
        "Referenznummer: 0004"
    )

    # 1. Titel darf niemals der temp-Dateiname sein
    title = guess_title(udemy_text, "tmplz6lmxh3.pdf", {})
    assert title == "Data Science - Datenvorbereitung und Qualitätssicherung Excel"

    # 2. Provider muss als Udemy erkannt werden
    provider = guess_provider(udemy_text, "tmplz6lmxh3.pdf")
    assert provider == "Udemy"

    # 3. Credential-ID muss exakt matchen
    cred_id = extract_credential_id(udemy_text)
    assert cred_id == "UC-3fOea848-5950-4fe9-ad31-7d4cb00039d3"

    # 4. Datum muss 2023-11-28 sein
    issued = extract_issued_date(udemy_text)
    assert issued == "2023-11-28"


def _build_synthetic_vector_pdf(lines: list[tuple[str, str, int, int, int]]) -> bytes:
    """Erstellt ein valides Vektor-PDF mit definierten Fonts, Größen und Positionen."""
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


def test_synthetic_udemy_pdf_extraction(tmp_path):
    """Testet die vollständige Pipeline anhand einer synthetischen Udemy-PDF-Fixture."""
    from portfolio.models import TRACK_RULES
    from portfolio.services.extractor import extract_metadata

    pdf_path = tmp_path / "udemy_data_science_cert.pdf"
    pdf_bytes = _build_synthetic_vector_pdf(
        [
            ("F1", "ZERTIFIKAT UBER DIE ERFOLGREICHE TEILNAHME", 12, 60, 700),
            ("F2", "Data Science - Datenvorbereitung und Excel", 22, 60, 620),
            ("F1", "Lehrkraft: Dr. Example", 11, 60, 560),
            ("F1", "Dominik Fluechter", 14, 60, 520),
            ("F1", "Datum: 28. Nov. 2023", 10, 60, 480),
            ("F1", "Zertifikat-Nr.: UC-3f0ea848-5950-4fe9-ad31-7d4cb00039d3", 10, 60, 450),
            ("F1", "Zertifikat-URL: ude.my/UC-3f0ea848-5950-4fe9-ad31-7d4cb00039d3", 10, 60, 430),
        ]
    )
    pdf_path.write_bytes(pdf_bytes)

    with patch(
        "portfolio.services.extractor.extract_via_gemini_vision"
    ) as mock_gemini:
        res = extract_metadata(
            pdf_path,
            tmp_path,
            TRACK_RULES,
            enable_ocr=False,
            known_providers=["Udemy"],
        )

    assert res is not None
    assert res.guessed_title == "Data Science - Datenvorbereitung und Excel"
    assert res.title_confidence >= 0.85
    assert res.guessed_provider == "Udemy"
    assert res.issued_date == "2023-11-28"
    assert res.credential_id == "UC-3f0ea848-5950-4fe9-ad31-7d4cb00039d3"
    assert "data-ai" in res.guessed_track_slugs
    mock_gemini.assert_not_called()
