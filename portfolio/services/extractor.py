import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path

import pytesseract
from django.utils.text import slugify
from PIL import Image
from pypdf import PdfReader


@dataclass
class ExtractionResult:
    sha256_hash: str
    guessed_title: str
    guessed_provider: str
    guessed_track_slug: str
    credential_id: str
    issued_date: str  # ISO format or empty
    extracted_text: str
    ocr_pending: bool
    source_type: str  # 'pdf' | 'image'
    file_size: int
    image_dimensions: str  # 'WxH' or empty
    guessed_track_slugs: list[str] = field(default_factory=list)


def compute_file_hash(file_path: Path) -> str:
    """Berechnet den SHA-256 Hash der Datei in 8KB Chunks."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(8192), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def guess_tracks(title: str, rules: dict[str, list[str]], text: str = "") -> list[str]:
    """Ermittelt alle passenden Tracks basierend auf Keywords in Titel und Text."""
    matches: list[str] = []
    combined = f"{title} {text}".lower()
    for track_slug, keywords in rules.items():
        if any(keyword.lower() in combined for keyword in keywords):
            matches.append(track_slug)
    return matches


def guess_track(title: str, rules: dict[str, list[str]]) -> str | None:
    """Ermittelt den ersten passenden Track basierend auf Keywords im Titel."""
    tracks = guess_tracks(title, rules)
    return tracks[0] if tracks else None


def safe_storage_key(provider_slug: str, hash_hex: str, original_name: str) -> str:
    """Generiert einen sicheren Speicherpfad."""
    path = Path(original_name)
    ext = path.suffix
    base_name = path.stem
    slugified_name = slugify(base_name)
    hash_prefix = hash_hex[:12]
    return f"certificates/{provider_slug}/{hash_prefix}/{slugified_name}{ext}"


def validate_source_path(file_path: Path, source_root: Path) -> bool:
    """Überprüft, ob der Pfad sicher ist und nicht auf einen Symlink verweist."""
    if file_path.is_symlink():
        return False
    try:
        resolved_path = file_path.resolve()
        resolved_root = source_root.resolve()
        return resolved_root in resolved_path.parents
    except Exception:  # noqa: BLE001
        return False


def _extract_from_pdf(file_path: Path) -> tuple[dict, str, bool]:
    metadata = {}
    extracted_text = ""
    ocr_pending = False
    try:
        with open(file_path, "rb") as f:
            reader = PdfReader(f)

            # Read metadata
            if reader.metadata:
                metadata = {
                    "title": reader.metadata.title or "",
                    "author": reader.metadata.author or "",
                    "subject": reader.metadata.subject or "",
                    "creation_date": reader.metadata.creation_date or "",
                }

            # Extract text from existing text layer
            pages_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            extracted_text = "\n".join(pages_text)

            # If no usable text layer exists, set ocr_pending
            if not extracted_text.strip():
                ocr_pending = True
    except Exception:  # noqa: BLE001, S110
        pass

    return metadata, extracted_text, ocr_pending


def _extract_from_image(file_path: Path, enable_ocr: bool) -> tuple[dict, str, str]:
    metadata = {}
    extracted_text = ""
    dimensions = ""
    try:
        with Image.open(file_path) as img:
            img.verify()  # verify format

        # Re-open because verify() closes or leaves in weird state
        with Image.open(file_path) as img:
            dimensions = f"{img.width}x{img.height}"
            metadata = {
                "format": img.format,
            }
            # exif date extraction if available
            exif = img.getexif()
            if exif:
                # 306 is DateTime
                date = exif.get(306)
                if date:
                    metadata["creation_date"] = str(date)

            if enable_ocr:
                extracted_text = pytesseract.image_to_string(img)
    except Exception:  # noqa: BLE001, S110
        pass
    return metadata, extracted_text, dimensions


def _apply_regex_rules(text: str) -> dict:
    """Extrahiert Titel, Provider, Datum, Credential-ID via Regex."""
    result = {
        "guessed_title": "",
        "guessed_provider": "",
        "issued_date": "",
        "credential_id": "",
    }

    # Some fallback patterns
    title_match = re.search(r"(?i)certificate\s+(?:of\s+)?([^\n]+)", text)
    if title_match:
        result["guessed_title"] = title_match.group(1).strip()

    provider_match = re.search(r"(?i)(?:by|from)\s+([A-Z][A-Za-z0-9 ]+)", text)
    if provider_match:
        result["guessed_provider"] = provider_match.group(1).strip()

    date_match = re.search(r"\b\d{4}-\d{2}-\d{2}\b", text)
    if date_match:
        result["issued_date"] = date_match.group(0)

    cred_match = re.search(r"(?i)credential[\s-]*id:?\s*([A-Za-z0-9-]+)", text)
    if cred_match:
        result["credential_id"] = cred_match.group(1).strip()

    return result


def extract_metadata(
    file_path: Path, source_root: Path, track_rules: dict, enable_ocr: bool = False
) -> ExtractionResult | None:
    if not validate_source_path(file_path, source_root):
        return None

    if not file_path.exists() or not file_path.is_file():
        return None

    file_size = file_path.stat().st_size
    sha256_hash = compute_file_hash(file_path)

    source_type = ""
    extracted_text = ""
    ocr_pending = False
    image_dimensions = ""

    ext = file_path.suffix.lower()

    pdf_meta: dict[str, str] = {}
    if ext == ".pdf":
        source_type = "pdf"
        pdf_meta, extracted_text, ocr_pending = _extract_from_pdf(file_path)
    elif ext in [".png", ".jpg", ".jpeg"]:
        source_type = "image"
        _img_meta, extracted_text, image_dimensions = _extract_from_image(
            file_path, enable_ocr
        )
    else:
        # Unsupported type
        return None

    regex_info = _apply_regex_rules(extracted_text)

    # Priority for title: Regex, then PDF metadata title
    guessed_title = regex_info.get("guessed_title") or pdf_meta.get("title", "")
    guessed_provider = regex_info.get("guessed_provider", "")
    credential_id = regex_info.get("credential_id", "")

    # Issued date priority: Regex, then metadata
    issued_date = regex_info.get("issued_date") or pdf_meta.get("creation_date", "")

    guessed_track_slugs = guess_tracks(guessed_title, track_rules, extracted_text)
    guessed_track_slug = guessed_track_slugs[0] if guessed_track_slugs else ""

    return ExtractionResult(
        sha256_hash=sha256_hash,
        guessed_title=guessed_title,
        guessed_provider=guessed_provider,
        guessed_track_slug=guessed_track_slug,
        credential_id=credential_id,
        issued_date=issued_date,
        extracted_text=extracted_text,
        ocr_pending=ocr_pending,
        source_type=source_type,
        file_size=file_size,
        image_dimensions=image_dimensions,
        guessed_track_slugs=guessed_track_slugs,
    )
