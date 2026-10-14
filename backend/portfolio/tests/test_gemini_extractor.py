import json
import os
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

from portfolio.services.extractor import (
    extract_metadata,
    extract_via_gemini_vision,
)


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
    """Testet den erfolgreichen Aufruf der Gemini Vision API mit gemocktem HTTP-Response."""
    mock_gemini_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "title": "AWS Certified Solutions Architect",
                                    "provider": "Amazon Web Services",
                                    "credential_id": "AWS-123456",
                                    "issued_date": "2024-05-15",
                                    "extracted_text": "This certifies that Jane Doe has successfully completed...",
                                    "tracks": ["cloud-devops", "backend"],
                                }
                            )
                        }
                    ]
                }
            }
        ]
    }

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(mock_gemini_response).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        result = extract_via_gemini_vision(dummy_image_file, api_key="dummy-test-key")

    assert result is not None
    assert result["title"] == "AWS Certified Solutions Architect"
    assert result["provider"] == "Amazon Web Services"
    assert result["credential_id"] == "AWS-123456"
    assert result["issued_date"] == "2024-05-15"
    assert "cloud-devops" in result["tracks"]


def test_gemini_vision_handles_api_error_gracefully(dummy_image_file):
    """Testet, dass API-Fehler (z.B. HTTP 500 oder Netzwerkfehler) abgefangen werden."""
    with patch("urllib.request.urlopen", side_effect=OSError("Network connection refused")):
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
