import datetime
import hashlib
import io
import json
import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

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

    # 1.5 Plattform-Signaturen (Kurz-URLs & Credential-Präfixe)
    if re.search(
        r"(?i)\bude\.my/|zertifikat-nr\.?:\s*UC-|certificate\s+no\.?:\s*UC-|\bUC-[a-f0-9-]{16,}\b",
        text,
    ):
        return "Udemy"
    if re.search(r"(?i)\bcoursera\.org\b", text):
        return "Coursera"
    if re.search(r"(?i)\bedx\.org\b", text):
        return "edX"

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
    # 0. Strukturmuster für Plattformen (mehrzeilig vor Zeilenende-Mustern)
    # Udemy Deutsch & Englisch: "Zertifikat über die erfolgreiche Teilnahme\n<Kursname>\nLehrkraft..."
    udemy_match = re.search(
        r"(?i)(?:zertifikat\s+(?:über\s+die\s+erfolgreiche\s+teilnahme|der\s+fertigstellung)|certificate\s+of\s+completion)\s*\n+([^\n\r]+?)(?:\s*\n+(?:lehrkraft|instructors?|dozent|unterrichtet\s+von|datum|date|zertifikat-nr|certificate\s+no|dauer|length|referenznummer))",
        text,
    )
    if udemy_match:
        cand = udemy_match.group(1).strip(" :,-_")
        if (
            cand
            and len(cand) > 3
            and not any(
                n in cand.lower()
                for n in ["dominik flüchter", "dominik", "completion", "zertifikat"]
            )
        ):
            return cand

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
            # Kürzen falls mehrzeilig
            if "\n" in candidate:
                candidate = candidate.split("\n")[0].strip()

            # Negativprüfung: Name des Teilnehmers oder reine Standardfloskeln verwerfen
            candidate_lower = candidate.lower()
            owner_name = os.getenv("PORTFOLIO_OWNER_NAME", "Dominik Flüchter").lower()
            if any(
                n in candidate_lower
                for n in [
                    owner_name,
                    "dominik flüchter",
                    "dominik fluechter",
                    "dominik",
                ]
            ) or candidate_lower in {
                "completion",
                "achievement",
                "accomplishment",
                "attendance",
                "erfolgreich",
                "teilnahme",
                "certificate",
                "zertifikat",
            }:
                continue

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
    # Temporäre System-Dateinamen (z. B. tmplz6lmxh3) niemals als Titel verwenden
    if re.match(r"^tmp[a-z0-9_]{4,}$", stem.lower()):
        return ""

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
        r"(?i)(?:credential[\s-]*id|certificate[\s-]*id|verification[\s-]*code|zertifikat[- ]*(?:id|nr\.?|nummer)|license\s*#?)[\s:.]*([A-Za-z0-9-_/]+)",
        r"(?i)(?:verify\s+(?:at|authenticity\s+at)?|verifizieren\s+unter)[\s:]*(?:https?://)?\S+/([A-Za-z0-9-_/]+)",
        r"(?i)certificate\s+number[\s:]*([A-Za-z0-9-_/]+)",
        r"(?i)\bude\.my/([A-Za-z0-9-_]+)",
        r"\b(UC-[A-Za-z0-9-]{16,})\b",
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

            # Wenn echter Textlayer vorhanden ist (>= 60 Zeichen und >= 8 Wörter)
            words = extracted_text.split()
            if len(extracted_text) >= 60 and len(words) >= 8:
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


MAX_GEMINI_VISION_FILE_BYTES = (
    10 * 1024 * 1024
)  # Max. 10 MB für hochauflösende Scans und Vektor-PDFs
MAX_GEMINI_VISION_OUTPUT_TOKENS = 2048


def extract_via_gemini_vision(
    file_path: Path,
    api_key: str | None = None,
    model: str | None = None,
) -> dict[str, Any] | None:
    """
    Stufe 3 der Metadaten-Extraktion:
    Analysiert gescannte oder bildbasierte Zertifikate via Google Gemini 2.5 Flash Vision.
    Fällt transparent auf None zurück, wenn kein GEMINI_API_KEY konfiguriert ist oder
    Token-Grenzen/Circuit-Breaker greifen (0-Kosten-Garantie & Graceful Degradation).
    """
    from portfolio.services.ai_assistant import (
        check_and_reserve_ai_budget,
        estimate_tokens,
        record_actual_ai_tokens,
        trip_ai_circuit_breaker,
    )

    vision_flag = os.getenv("GEMINI_VISION_ENABLED", "true").strip().lower()
    ai_flag = os.getenv("GEMINI_AI_ENABLED", "true").strip().lower()
    if vision_flag in ("false", "0", "no", "off") or ai_flag in (
        "false",
        "0",
        "no",
        "off",
    ):
        logger.info(
            "Gemini Vision ist zum Schutz vor Kosten/Token-Überschreitung deaktiviert."
        )
        return None

    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        logger.debug(
            "Kein GEMINI_API_KEY konfiguriert - überspringe Gemini Vision Stufe 3."
        )
        return None

    ext = file_path.suffix.lower()
    if ext == ".pdf":
        mime_type = "application/pdf"
    elif ext == ".png":
        mime_type = "image/png"
    elif ext in {".jpg", ".jpeg"}:
        mime_type = "image/jpeg"
    else:
        return None

    try:
        file_size = file_path.stat().st_size
    except OSError:
        return None

    max_bytes = int(
        os.getenv("GEMINI_VISION_MAX_FILE_BYTES", str(MAX_GEMINI_VISION_FILE_BYTES))
    )
    if file_size > max_bytes:
        logger.warning(
            "Datei %s (%d Bytes) überschreitet das Token-Sicherheitslimit (%d Bytes) - "
            "Gemini Vision Stufe 3 wird deaktiviert/übersprungen.",
            file_path.name,
            file_size,
            max_bytes,
        )
        return None

    prompt = (
        "Du bist ein Experte für die präzise Analyse von Zertifikaten und Weiterbildungsnachweisen. "
        "Extrahiere die Metadaten dieses Zertifikats und antworte ausschließlich als valides JSON "
        "mit den folgenden Feldern:\n"
        "- title: Der genaue Titel des Zertifikats oder Kurses. ACHTUNG: Der Name der zertifizierten Person (z. B. Dominik Flüchter) ist NIEMALS der Titel!\n"
        "- provider: Der Name des Ausstellers oder der Plattform (z. B. AWS, Google Cloud, Coursera, Udemy, etc.)\n"
        "- credential_id: Identifikationsnummer oder Lizenznummer des Zertifikats (falls vorhanden, sonst leer)\n"
        "- issued_date: Ausstellungsdatum im ISO-Format YYYY-MM-DD (falls erkennbar, sonst leer)\n"
        "- extracted_text: Der wichtigste erkannte Text des Dokuments\n"
        "- tracks: Liste passender technischer Lernpfade aus [backend, frontend, fullstack, cloud-devops, data-ai, security, agile]\n"
    )

    estimated_tokens = estimate_tokens(prompt, extra_bytes=file_size)
    allowed, block_reason = check_and_reserve_ai_budget(estimated_tokens)
    if not allowed:
        logger.warning(
            "Gemini Vision für %s durch Token-Budget/Circuit-Breaker deaktiviert: %s",
            file_path.name,
            block_reason,
        )
        return None

    gemini_model: str = str(model or os.getenv("GEMINI_MODEL") or "gemini-3.8-flash")

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=key)

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        contents_payload: Any = [part, prompt]
        response = client.models.generate_content(
            model=gemini_model,
            contents=contents_payload,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
                max_output_tokens=MAX_GEMINI_VISION_OUTPUT_TOKENS,
            ),
        )

        if hasattr(response, "usage_metadata") and response.usage_metadata:
            actual_total = getattr(response.usage_metadata, "total_token_count", None)
            if isinstance(actual_total, int):
                record_actual_ai_tokens(estimated_tokens, actual_total)

        raw_text = (response.text or "").strip()
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
        if not raw_text:
            return None

        parsed_json: dict[str, Any] = json.loads(raw_text)
        return parsed_json
    except Exception as exc:  # noqa: BLE001
        err_msg = str(exc).lower()
        if getattr(exc, "code", None) == 429 or any(
            k in err_msg
            for k in ("429", "quota", "resource_exhausted", "rate limit", "exceeded")
        ):
            trip_ai_circuit_breaker(
                f"Gemini Vision Quota/Rate-Limit für {file_path.name} erreicht: {exc}"
            )
        logger.warning(
            "Gemini Vision Extraktion für %s fehlgeschlagen: %s", file_path.name, exc
        )
        return None


def extract_metadata(
    file_path: Path,
    source_root: Path,
    track_rules: dict[str, list[str]],
    enable_ocr: bool = True,
    known_providers: list[str] | None = None,
    original_filename: str | None = None,
) -> ExtractionResult | None:
    """
    Extrahiert Metadaten, Volltext und Tracks aus einer Quelldatei.
    Gibt ein ExtractionResult zurück oder None bei ungültigen Dateien.
    """
    if not validate_source_path(file_path, source_root):
        return None

    if not file_path.exists() or not file_path.is_file():
        return None

    effective_filename = original_filename or file_path.name
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

    guessed_provider = guess_provider(
        extracted_text, effective_filename, known_providers
    )
    guessed_title = guess_title(
        extracted_text, effective_filename, pdf_meta, guessed_provider
    )
    credential_id = extract_credential_id(extracted_text)
    issued_date = extract_issued_date(extracted_text)
    if not issued_date and pdf_meta.get("creation_date"):
        issued_date = parse_date_string(pdf_meta["creation_date"]) or ""

    guessed_track_slugs = guess_tracks(guessed_title, track_rules, extracted_text)
    guessed_track_slug = guessed_track_slugs[0] if guessed_track_slugs else ""

    # Stufe 3: Multimodaler Gemini Flash Vision Fallback
    # Triggert, wenn Text unvollständig ist, Titel minderwertig/fehlt oder Aussteller fehlt
    is_weak_title = (
        not guessed_title
        or guessed_title.lower() in {"certificate", "zertifikat", "document", "scan"}
        or guessed_title == Path(file_path.name).stem
        or (len(guessed_title.split()) <= 1 and len(guessed_title) < 15)
        or any(
            n in guessed_title.lower()
            for n in ["dominik flüchter", "dominik fluechter"]
        )
    )
    if ocr_pending or len(extracted_text) < 60 or is_weak_title or not guessed_provider:
        gemini_data = extract_via_gemini_vision(file_path)
        if gemini_data and isinstance(gemini_data, dict):
            logger.info(
                "Metadaten erfolgreich via Gemini Vision (Stufe 3) für %s extrahiert.",
                file_path.name,
            )
            g_title = str(gemini_data.get("title") or "").strip()
            if g_title:
                guessed_title = g_title

            g_provider = str(gemini_data.get("provider") or "").strip()
            if g_provider:
                guessed_provider = g_provider

            g_cred = str(gemini_data.get("credential_id") or "").strip()
            if g_cred and not credential_id:
                credential_id = g_cred

            g_date = str(gemini_data.get("issued_date") or "").strip()
            if g_date and not issued_date:
                parsed_g_date = parse_date_string(g_date)
                if parsed_g_date:
                    issued_date = parsed_g_date

            g_text = str(gemini_data.get("extracted_text") or "").strip()
            if g_text and len(extracted_text) < len(g_text):
                extracted_text = g_text

            if gemini_data.get("tracks") and isinstance(gemini_data["tracks"], list):
                for g_track in gemini_data["tracks"]:
                    g_slug = slugify(str(g_track))
                    if g_slug and g_slug not in guessed_track_slugs:
                        guessed_track_slugs.append(g_slug)
            if not guessed_track_slug and guessed_track_slugs:
                guessed_track_slug = guessed_track_slugs[0]

            # Gemini Vision hat das Dokument erfolgreich analysiert
            ocr_pending = False

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
