import datetime
import hashlib
import io
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import pytesseract
from django.utils.text import slugify
from PIL import Image
from pypdf import PdfReader

logger = logging.getLogger(__name__)

MONTH_MAP: dict[str, int] = {
    "jan": 1,
    "january": 1,
    "januar": 1,
    "feb": 2,
    "february": 2,
    "februar": 2,
    "mar": 3,
    "mär": 3,
    "march": 3,
    "maerz": 3,
    "märz": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "mai": 5,
    "jun": 6,
    "june": 6,
    "juni": 6,
    "jul": 7,
    "july": 7,
    "juli": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "september": 9,
    "oct": 10,
    "okt": 10,
    "october": 10,
    "oktober": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "dez": 12,
    "december": 12,
    "dezember": 12,
}

DEFAULT_KNOWN_PROVIDERS: list[str] = [
    "Coursera",
    "Udemy",
    "edX",
    "AWS",
    "Amazon Web Services",
    "Google Cloud",
    "Google",
    "Microsoft",
    "LinkedIn Learning",
    "Cisco",
    "Scrum.org",
    "Linux Foundation",
    "Pluralsight",
    "FreeCodeCamp",
    "Harvard",
    "Stanford",
    "MIT",
    "DeepLearning.AI",
]


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
    slugified_name = slugify(base_name) or "certificate"
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


def parse_date_string(raw: str) -> str | None:
    """
    Parst verschiedene Datumsformate (ISO, Deutsch, Englisch) nach YYYY-MM-DD.
    Gibt None zurück, falls kein valides Datum erkannt wurde.
    """
    if not raw:
        return None

    # 1. ISO-Format: YYYY-MM-DD
    iso_match = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", raw)
    if iso_match:
        try:
            y, m, d = (
                int(iso_match.group(1)),
                int(iso_match.group(2)),
                int(iso_match.group(3)),
            )
            parsed = datetime.date(y, m, d)
            return parsed.isoformat()
        except ValueError:
            pass

    # 2. Deutsches / Europäisches Format: DD.MM.YYYY
    de_match = re.search(r"\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b", raw)
    if de_match:
        try:
            d, m, y = (
                int(de_match.group(1)),
                int(de_match.group(2)),
                int(de_match.group(3)),
            )
            parsed = datetime.date(y, m, d)
            return parsed.isoformat()
        except ValueError:
            pass

    # 3. Textmonate: z.B. "October 9, 2026", "15 May 2024", "Mai 2024"
    # Format a: "Month DD, YYYY" oder "Month DD YYYY"
    text_a = re.search(
        r"\b([A-Za-zÄäÖöÜü]{3,12})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b",
        raw,
    )
    if text_a:
        m_str, d_str, y_str = (
            text_a.group(1).lower(),
            text_a.group(2),
            text_a.group(3),
        )
        month = MONTH_MAP.get(m_str)
        if month:
            try:
                parsed = datetime.date(int(y_str), month, int(d_str))
                return parsed.isoformat()
            except ValueError:
                pass

    # Format b: "DD Month YYYY" oder "DD. Month YYYY"
    text_b = re.search(r"\b(\d{1,2})\.?\s+([A-Za-zÄäÖöÜü]{3,12}),?\s+(\d{4})\b", raw)
    if text_b:
        d_str, m_str, y_str = (
            text_b.group(1),
            text_b.group(2).lower(),
            text_b.group(3),
        )
        month = MONTH_MAP.get(m_str)
        if month:
            try:
                parsed = datetime.date(int(y_str), month, int(d_str))
                return parsed.isoformat()
            except ValueError:
                pass

    # Format c: "Month YYYY" (z. B. "May 2024") -> Tag 1 als Standard
    text_c = re.search(r"\b([A-Za-zÄäÖöÜü]{3,12})\s+(\d{4})\b", raw)
    if text_c:
        m_str, y_str = text_c.group(1).lower(), text_c.group(2)
        month = MONTH_MAP.get(m_str)
        if month:
            try:
                parsed = datetime.date(int(y_str), month, 1)
                return parsed.isoformat()
            except ValueError:
                pass

    # 4. US-Slash-Format: MM/DD/YYYY
    us_match = re.search(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", raw)
    if us_match:
        p1, p2, y = (
            int(us_match.group(1)),
            int(us_match.group(2)),
            int(us_match.group(3)),
        )
        # Wenn erster Wert > 12, dann DD/MM/YYYY
        m, d = (p2, p1) if p1 > 12 else (p1, p2)
        try:
            parsed = datetime.date(y, m, d)
            return parsed.isoformat()
        except ValueError:
            pass

    return None


def extract_issued_date(text: str) -> str:
    """
    Sucht nach Ausstellungsdaten im extrahierten Text.
    Priorisiert Schlüsselwort-Zeilen (Issued, Date, Datum etc.).
    """
    if not text:
        return ""

    context_pattern = re.compile(
        r"(?i)(?:issued(?:\s+on)?|issue\s+date|date\s+of\s+issue|completion\s+date|"
        r"completed(?:\s+on)?|date\s+of\s+completion|datum|date|ausgestellt(?:\s+am)?|"
        r"abschlussdatum)[\s:]*([^\n\r]+)"
    )

    for match in context_pattern.finditer(text):
        snippet = match.group(1)
        parsed = parse_date_string(snippet)
        if parsed:
            return parsed

    # Fallback: Allgemeine Suche im Volltext
    parsed_fallback = parse_date_string(text)
    return parsed_fallback or ""


def guess_provider(
    text: str, filename: str, known_providers: list[str] | None = None
) -> str:
    """
    Ermittelt den Aussteller/Provider hybrid aus Dateinamen und Textinhalt.
    Gleicht gegen bekannte Provider-Listen und Datenbank-Provider ab.
    """
    providers = list(DEFAULT_KNOWN_PROVIDERS)
    if known_providers:
        for p in known_providers:
            if p and p not in providers:
                providers.append(p)

    # 1. Dateinamen-Analyse
    for p in providers:
        pattern = rf"(?i)(?:^|[\W_]){re.escape(p)}(?:$|[\W_])"
        if re.search(pattern, filename):
            return p

    # 2. Textinhalt: Explizite Phrasen (z. B. "Offered by Coursera", "Ausgestellt von...")
    phrase_pattern = re.compile(
        r"(?i)(?:offered\s+by|authorized\s+by|issued\s+by|ausgestellt\s+von|"
        r"institution|organisation)[\s:]*([A-Za-z0-9\s&.-]{2,40})"
    )
    phrase_match = phrase_pattern.search(text)
    if phrase_match:
        candidate = phrase_match.group(1).strip()
        for p in providers:
            if p.lower() in candidate.lower():
                return p
        if candidate and len(candidate) <= 30:
            return candidate

    # 3. Bekannte Provider im Volltext suchen (längere Namen zuerst)
    for p in sorted(providers, key=len, reverse=True):
        pattern = rf"(?i)\b{re.escape(p)}\b"
        if re.search(pattern, text):
            return p

    # 4. Generischer Fallback
    fallback_match = re.search(
        r"(?i)(?:by|from|durch)\s+([A-Z][A-Za-z0-9&. ]{2,30})", text
    )
    if fallback_match:
        return fallback_match.group(1).strip()

    return ""


def guess_title(text: str, filename: str, pdf_meta: dict, provider: str = "") -> str:
    """
    Ermittelt den Zertifikatstitel aus Text-Mustern, PDF-Metadaten oder Dateinamen.
    """
    title_patterns = [
        r"(?i)certificate\s+of\s+(?:completion|achievement|accomplishment|attendance)[\s:]*(?:for)?\s*([^\n\r]+)",
        r"(?i)has\s+successfully\s+completed\s+(?:the\s+(?:course|program|specialization)\s+)?([^\n\r]+)",
        r"(?i)(?:erfolgreich\s+teilgenommen\s+am\s+kurs|bescheinigung\s+über)[\s:]*([^\n\r]+)",
        r"(?i)course\s+certificate[\s:]+([^\n\r]+)",
        r"(?i)certificate\s+(?:of\s+)?([^\n\r]+)",
    ]

    for pat in title_patterns:
        match = re.search(pat, text)
        if match:
            candidate = match.group(1).strip(" :,-_")
            # Kürzen falls zu lang
            if "\n" in candidate:
                candidate = candidate.split("\n")[0].strip()
            if candidate and len(candidate) > 3 and len(candidate) <= 120:
                return candidate

    # 2. PDF-Metadaten-Titel
    meta_title = (pdf_meta.get("title") or "").strip()
    if meta_title and meta_title.lower() not in {
        "untitled",
        "certificate",
        "document",
        "pdf",
        "scan",
    }:
        return meta_title

    # 3. Fallback: Bereinigter Dateiname
    stem = Path(filename).stem
    # Provider aus Dateinamen entfernen, falls vorhanden
    if provider:
        stem = re.sub(rf"(?i)\b{re.escape(provider)}\b", "", stem)

    # Trennzeichen durch Leerzeichen ersetzen
    clean_stem = re.sub(r"[_\-+.]+", " ", stem).strip()
    # Führende oder nachgestellte "cert", "certificate" bereinigen, wenn mehr Text vorhanden
    clean_title = re.sub(r"(?i)^(certificate|zertifikat)\s+", "", clean_stem)
    return clean_title.strip() or clean_stem or stem


def extract_credential_id(text: str) -> str:
    """Extrahiert Credential-ID oder Verifizierungsnummern via Regex."""
    if not text:
        return ""

    patterns = [
        r"(?i)(?:credential[\s-]*id|certificate[\s-]*id|verification[\s-]*code|zertifikat[- ]*(?:id|nr|nummer)|license\s*#?)[\s:]*([A-Za-z0-9-_/]+)",
        r"(?i)(?:verify\s+(?:at|authenticity\s+at)?|verifizieren\s+unter)[\s:]*https?://\S+/([A-Za-z0-9-_/]+)",
        r"(?i)certificate\s+number[\s:]*([A-Za-z0-9-_/]+)",
    ]

    for pat in patterns:
        match = re.search(pat, text)
        if match:
            val = match.group(1).strip()
            if len(val) >= 4 and val.lower() not in {"and", "with", "this"}:
                return val

    return ""


def _extract_from_pdf(
    file_path: Path, enable_ocr: bool = True
) -> tuple[dict, str, bool]:
    """
    Liest PDF-Metadaten und Textlayer. Bei leerem Textlayer wird bis zu 2 Seiten
    per OCR über extrahierte Bilder analysiert (ohne poppler-Abhängigkeit).
    """
    metadata: dict[str, str] = {}
    extracted_text = ""
    ocr_pending = False

    try:
        with open(file_path, "rb") as f:
            reader = PdfReader(f)

            if reader.metadata:
                metadata = {
                    "title": str(reader.metadata.title or ""),
                    "author": str(reader.metadata.author or ""),
                    "subject": str(reader.metadata.subject or ""),
                    "creation_date": str(reader.metadata.creation_date or ""),
                }

            # Textlayer auslesen
            pages_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            extracted_text = "\n".join(pages_text).strip()

            # Wenn Textlayer vorhanden ist (>= 15 Zeichen)
            if len(extracted_text) >= 15:
                ocr_pending = False
            else:
                # Bildbasierte PDF: OCR auf ersten 2 Seiten ausführen
                if enable_ocr:
                    ocr_texts: list[str] = []
                    try:
                        for page in reader.pages[:2]:
                            for img_file in page.images:
                                try:
                                    img = Image.open(io.BytesIO(img_file.data))
                                    ocr_snippet = pytesseract.image_to_string(img)
                                    if ocr_snippet.strip():
                                        ocr_texts.append(ocr_snippet.strip())
                                except Exception as img_err:  # noqa: BLE001
                                    logger.debug(
                                        "Bild-OCR in PDF fehlgeschlagen: %s",
                                        img_err,
                                    )
                                    continue
                        if ocr_texts:
                            extracted_text = "\n".join(ocr_texts).strip()
                            ocr_pending = False
                        else:
                            ocr_pending = True
                    except Exception as ocr_err:  # noqa: BLE001
                        logger.warning(
                            "OCR für PDF %s nicht möglich: %s",
                            file_path.name,
                            ocr_err,
                        )
                        ocr_pending = True
                else:
                    ocr_pending = True
    except Exception as exc:  # noqa: BLE001
        logger.warning("PDF-Extraktion fehlgeschlagen für %s: %s", file_path.name, exc)
        ocr_pending = True

    return metadata, extracted_text, ocr_pending


def _extract_from_image(
    file_path: Path, enable_ocr: bool = True
) -> tuple[dict, str, str, bool]:
    """Liest Bilddateien (.png, .jpg) und führt optional Tesseract-OCR aus."""
    metadata: dict[str, str] = {}
    extracted_text = ""
    dimensions = ""
    ocr_pending = False

    try:
        with Image.open(file_path) as img:
            img.verify()

        with Image.open(file_path) as img:
            dimensions = f"{img.width}x{img.height}"
            metadata = {
                "format": str(img.format or ""),
            }
            exif = img.getexif()
            if exif:
                date = exif.get(306)
                if date:
                    metadata["creation_date"] = str(date)

            if enable_ocr:
                try:
                    extracted_text = pytesseract.image_to_string(img).strip()
                    ocr_pending = not bool(extracted_text)
                except Exception as ocr_err:  # noqa: BLE001
                    logger.warning(
                        "OCR fehlgeschlagen für %s: %s",
                        file_path.name,
                        ocr_err,
                    )
                    ocr_pending = True
            else:
                ocr_pending = True
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Bildverarbeitung fehlgeschlagen für %s: %s", file_path.name, exc
        )
        ocr_pending = True

    return metadata, extracted_text, dimensions, ocr_pending


def extract_metadata(
    file_path: Path,
    source_root: Path,
    track_rules: dict[str, list[str]],
    enable_ocr: bool = True,
    known_providers: list[str] | None = None,
) -> ExtractionResult | None:
    """
    Extrahiert Metadaten, Volltext und Tracks aus einer Quelldatei.
    Gibt ein ExtractionResult zurück oder None bei ungültigen Dateien.
    """
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
        pdf_meta, extracted_text, ocr_pending = _extract_from_pdf(
            file_path, enable_ocr=enable_ocr
        )
    elif ext in {".png", ".jpg", ".jpeg"}:
        source_type = "image"
        _img_meta, extracted_text, image_dimensions, ocr_pending = _extract_from_image(
            file_path, enable_ocr=enable_ocr
        )
    else:
        return None

    guessed_provider = guess_provider(extracted_text, file_path.name, known_providers)
    guessed_title = guess_title(
        extracted_text, file_path.name, pdf_meta, guessed_provider
    )
    credential_id = extract_credential_id(extracted_text)
    issued_date = extract_issued_date(extracted_text)
    if not issued_date and pdf_meta.get("creation_date"):
        issued_date = parse_date_string(pdf_meta["creation_date"]) or ""

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
