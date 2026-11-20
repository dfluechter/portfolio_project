"""Mehrstufige, layout- und musterbasierte Titel-Extraktion für Zertifikate.

Pipeline:
    1. Layout-Extraktion aus PDF-Textlayer (PyMuPDF falls vorhanden, sonst ``pypdf``
       ``visitor_text`` mit Schriftgrößen, Bold-Flags und Y-Koordinaten).
    2. Explizite plattformspezifische Strukturmuster (Udemy, Coursera,
       LinkedIn Learning, Microsoft, AWS, IHK / deutsche Bescheinigungen).
    3. Layout-Score-Analyse auf Font-Größen, Fettdruck und Position (inkl.
       Zusammenführung mehrzeiliger Titel).
    4. Zeilenbasierte Heuristik für reinen OCR-Text (mit Filterung von Floskeln,
       Teilnehmernamen, Datumszeilen, URLs, IDs und reinen Anbieternamen).
    5. PDF-Metadaten-Fallback und bereinigter Dateiname als letzter Fallback.
"""

from __future__ import annotations

import logging
import math
import os
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Bekannte generische Dokument-Header / Nicht-Titel-Zeilen (Kleinschreibung)
GENERIC_HEADERS: frozenset[str] = frozenset(
    {
        "certificate",
        "zertifikat",
        "certificate of completion",
        "certificate of achievement",
        "certificate of accomplishment",
        "certificate of attendance",
        "certificate of participation",
        "certificate of excellence",
        "certificate of graduation",
        "certificate of training",
        "course certificate",
        "professional certificate",
        "verified certificate",
        "statement of accomplishment",
        "record of achievement",
        "completion certificate",
        "zertifikat über die erfolgreiche teilnahme",
        "zertifikat uber die erfolgreiche teilnahme",
        "zertifikat der fertigstellung",
        "teilnahmebescheinigung",
        "teilnahme-bescheinigung",
        "teilnahmezertifikat",
        "weiterbildungsnachweis",
        "qualifikationsnachweis",
        "leistungsnachweis",
        "bescheinigung",
        "urkunde",
        "abschlusszertifikat",
        "abschlusszeugnis",
        "untitled",
        "document",
        "pdf",
        "scan",
    }
)

# Typische reine Einleitungs-/Floskel-Zeilen ohne Titelinhalt
BOILERPLATE_PHRASE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)^hiermit\s+wird\s+(?:bestätigt|bescheinigt)(?:\s*,?\s*dass)?\.?$"),
    re.compile(r"(?i)^(?:this\s+is\s+to\s+certify|this\s+certifies)(?:\s+that)?\.?$"),
    re.compile(r"(?i)^(?:is\s+hereby\s+)?(?:awarded|presented)\s+to:?$"),
    re.compile(r"(?i)^verliehen\s+an:?$"),
    re.compile(r"(?i)^congratulations\b.*$"),
    re.compile(r"(?i)^herzlichen\s+glückwunsch\b.*$"),
    re.compile(r"(?i)^course\s+completed\s+(?:by|on)\b.*$"),
    re.compile(r"(?i)^learning\s+path\s+completed\b.*$"),
    re.compile(r"(?i)^kurs\s+abgeschlossen\b.*$"),
    re.compile(r"(?i)^has\s+(?:successfully\s+)?completed(?:\s+the\s+(?:course|program|specialization|requirements))?\.?$"),
    re.compile(r"(?i)^hat\s+(?:erfolgreich\s+)?(?:am\s+kurs|an\s+(?:der|dem)\s+\w+)?\s*teilgenommen\.?$"),
    re.compile(r"(?i)^an\s+online\s+(?:non-credit\s+)?course\s+authorized\s+by\b.*$"),
    re.compile(r"(?i)^(?:authorized|offered|presented|issued)\s+by\b.*$"),
    re.compile(r"(?i)^training\s+and\s+certification$"),
    re.compile(r"(?i)^verify\s+(?:at|authenticity)\b.*$"),
    re.compile(r"(?i)^verifizieren\s+(?:sie\s+)?unter\b.*$"),
    re.compile(r"(?i)^signed\s+by\b.*$"),
    re.compile(r"(?i)^(?:unterschrift|signature|geschäftsführung|direktor|instructor|lehrkraft|dozent)\b.*$"),
)

# Label-Zeilen, die Metadaten statt Kurstitel enthalten
METADATA_LINE_PATTERN = re.compile(
    r"(?i)^(?:"
    r"lehrkraft|instructors?|dozent(?:en)?|unterrichtet\s+von|trainer|"
    r"datum|date|issued(?:\s+on)?|issue\s+date|ausgestellt\s+am|abschlussdatum|completed\s+on|"
    r"dauer|length|duration|umfang|stunden|hours|gesamtstunden|"
    r"zertifikat[- ]*(?:nr\.?|nummer|id|url)|certificate\s*(?:no\.?|number|id|url)|"
    r"credential[\s-]*id|verification[\s-]*code|referenznummer|reference\s*(?:no|number)|"
    r"license\s*#?|veranstalter|anbieter|provider|ort|standort|location|by"
    r")\b"
)

URL_OR_ID_PATTERN = re.compile(
    r"(?i)(?:https?://\S+|www\.\S+|\bude\.my/\S+|\bcoursera\.org/\S+|\bedx\.org/\S+|"
    r"\bUC-[A-Za-z0-9-]{8,}\b)"
)

PURE_DATE_LINE_PATTERN = re.compile(
    r"^(?:\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}/\d{1,2}/\d{4}|"
    r"[A-Za-zÄäÖöÜü]{3,12}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|"
    r"\d{1,2}\.?\s+[A-Za-zÄäÖöÜü]{3,12}\.?,?\s+\d{4})$"
)

# Standard-Anbieternamen, die alleinstehend kein Kurstitel sind
DEFAULT_PROVIDER_NAMES: frozenset[str] = frozenset(
    {
        "udemy",
        "coursera",
        "edx",
        "aws",
        "amazon web services",
        "aws training and certification",
        "google",
        "google cloud",
        "microsoft",
        "linkedin",
        "linkedin learning",
        "cisco",
        "scrum.org",
        "linux foundation",
        "pluralsight",
        "freecodecamp",
        "harvard",
        "stanford",
        "mit",
        "deeplearning.ai",
        "ibm",
        "ihk",
        "credly",
        "databricks",
        "datacamp",
    }
)


@dataclass
class LayoutLine:
    """Eine aus einem PDF rekonstruierte Textzeile mit Schrift- und Positionsmetadaten."""

    text: str
    font_size: float
    is_bold: bool
    y_norm: float  # 0.0 = Seitenanfang (oben), 1.0 = Seitenende (unten)
    page_num: int = 0


@dataclass
class TitleCandidate:
    """Ergebnis einer Titel-Extraktion inkl. Confidence-Score (0.0 bis 1.0)."""

    title: str
    confidence: float
    source: str  # 'pattern' | 'layout' | 'heuristic' | 'meta' | 'filename' | 'gemini' | 'none'
    reason: str = ""


def normalize_whitespace(text: str) -> str:
    """Normalisiert Unicode-Text, Ligaturen und Leerzeichen, behält Zeilenstruktur."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKC", text)
    # Silbentrennung am Zeilenende behutsam bereinigen (Wort-\nfortsetzung)
    normalized = re.sub(r"([A-Za-zÄäÖöÜüß])-\n([a-zäöüß])", r"\1\2", normalized)
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in normalized.splitlines()]
    cleaned_lines: list[str] = []
    empty_streak = 0
    for line in lines:
        if not line:
            empty_streak += 1
            if empty_streak <= 1:
                cleaned_lines.append("")
        else:
            empty_streak = 0
            cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()


def normalize_title(raw: str) -> str:
    """Bereinigt einen Titelkandidaten von Umbrüchen, Rändern und Artefakten."""
    if not raw:
        return ""
    text = unicodedata.normalize("NFKC", raw)
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    text = text.strip(" \t\r\n\"'„“\u201a\u2018»«`*_•|·-")
    # Doppelpunkt am Ende entfernen (z.B. "Microsoft Certified:" -> nur wenn Rest bleibt)
    if text.endswith(":"):
        text = text[:-1].strip()
    return text


def _get_owner_tokens() -> list[str]:
    """Liefert normalisierte Varianten des Zertifikats-Inhabers aus Env/Defaults."""
    owner = os.getenv("PORTFOLIO_OWNER_NAME", "Dominik Flüchter").strip()
    variants = {
        owner.lower(),
        owner.lower().replace("ü", "ue").replace("ä", "ae").replace("ö", "oe"),
        "dominik flüchter",
        "dominik fluechter",
    }
    return [v for v in variants if v]


def _is_owner_name_line(line_lower: str) -> bool:
    """Prüft, ob eine Zeile der Name des Zertifikatsinhabers (oder Anrede + Name) ist."""
    cleaned = re.sub(r"^(?:herr|frau|mr\.?|ms\.?|dr\.?)\s+", "", line_lower).strip()
    for owner in _get_owner_tokens():
        if (cleaned == owner or owner in cleaned) and len(cleaned) <= len(owner) + 25:
            # Kurze Zeilen mit Inhabername sind fast immer die Personenzeile
            return True
    return False


def is_non_title_line(
    line: str,
    *,
    provider: str = "",
    known_providers: list[str] | None = None,
) -> bool:
    """Erkennt zuverlässig Zeilen, die KEIN Zertifikatstitel sein können."""
    cleaned = normalize_title(line)
    if not cleaned or len(cleaned) < 3:
        return True

    low = cleaned.lower()

    if low in GENERIC_HEADERS:
        return True

    if _is_owner_name_line(low):
        return True

    if METADATA_LINE_PATTERN.match(cleaned):
        return True

    if URL_OR_ID_PATTERN.search(cleaned) and len(cleaned.split()) <= 5:
        return True

    if PURE_DATE_LINE_PATTERN.match(cleaned):
        return True

    if any(pat.match(cleaned) for pat in BOILERPLATE_PHRASE_PATTERNS):
        return True

    provider_set = set(DEFAULT_PROVIDER_NAMES)
    if provider:
        provider_set.add(provider.strip().lower())
    if known_providers:
        for kp in known_providers:
            if kp and kp.strip():
                provider_set.add(kp.strip().lower())
    if low in provider_set:
        return True

    # Reine Zahlen / IDs ohne echten Wortinhalt
    if re.fullmatch(r"[\d\W_]+", cleaned):
        return True
    return bool(re.fullmatch(r"[A-Z0-9]{2,6}-[A-Z0-9-]{4,}", cleaned))


def _is_bold_font_name(font_name: str) -> bool:
    """Heuristik auf PDF-Fontnamen zur Erkennung fetter Schriften."""
    low = font_name.lower()
    return any(
        tok in low for tok in ("bold", "heavy", "black", "semibold", "demi", "medi")
    )


def extract_pdf_layout_lines(
    file_path: Path | None = None,
    *,
    reader: Any = None,
    max_pages: int = 2,
) -> list[LayoutLine]:
    """Extrahiert Textzeilen mit Schriftgröße, Fett-Status und Y-Position aus einem PDF.

    Nutzt bevorzugt PyMuPDF (``fitz``), sofern installiert und kein Mock-``reader``
    übergeben wurde; fällt ansonsten auf ``pypdf`` ``visitor_text`` zurück.
    """
    lines: list[LayoutLine] = []

    # 1. Optional PyMuPDF (exakteste Bounding-Boxes und Font-Flags)
    if file_path is not None and file_path.is_file():
        try:
            import fitz

            with fitz.open(file_path) as doc:
                for page_idx in range(min(max_pages, len(doc))):
                    page = doc[page_idx]
                    page_h = float(page.rect.height or 792.0)
                    text_dict = page.get_text("dict")
                    for block in text_dict.get("blocks", []):
                        if block.get("type") != 0:
                            continue
                        for raw_line in block.get("lines", []):
                            spans = raw_line.get("spans", [])
                            if not spans:
                                continue
                            parts: list[str] = []
                            weighted_size = 0.0
                            total_chars = 0
                            bold_chars = 0
                            for sp in spans:
                                t = str(sp.get("text") or "")
                                if not t.strip():
                                    if parts and not parts[-1].endswith(" "):
                                        parts.append(" ")
                                    continue
                                parts.append(t)
                                char_len = len(t.strip())
                                sp_size = float(sp.get("size") or 0.0)
                                weighted_size += sp_size * char_len
                                total_chars += char_len
                                flags = int(sp.get("flags") or 0)
                                font_name = str(sp.get("font") or "")
                                if (flags & 16) or _is_bold_font_name(font_name):
                                    bold_chars += char_len
                            joined = normalize_whitespace("".join(parts))
                            if not joined:
                                continue
                            bbox = raw_line.get("bbox") or (0, 0, 0, 0)
                            y_mid = (float(bbox[1]) + float(bbox[3])) / 2.0
                            y_norm = max(0.0, min(1.0, y_mid / page_h))
                            avg_size = weighted_size / max(1, total_chars)
                            lines.append(
                                LayoutLine(
                                    text=joined,
                                    font_size=round(avg_size, 2),
                                    is_bold=bold_chars >= (total_chars / 2.0),
                                    y_norm=round(y_norm, 4),
                                    page_num=page_idx,
                                )
                            )
            if lines:
                return lines
        except ImportError:
            pass
        except Exception as exc:  # noqa: BLE001
            logger.debug("PyMuPDF Layout-Extraktion fehlgeschlagen: %s", exc)

    # 2. Fallback: pypdf visitor_text (keine Zusatzabhängigkeit)
    if reader is None:
        return []

    pages = getattr(reader, "pages", None) or []
    for page_idx, page in enumerate(pages[:max_pages]):
        try:
            mediabox = getattr(page, "mediabox", None)
            page_h = float(getattr(mediabox, "height", 0) or 792.0)
        except Exception:  # noqa: BLE001
            page_h = 792.0

        raw_fragments: list[tuple[float, float, str, float, bool]] = []

        def _visitor(
            text: str,
            _cm: Any,
            tm: Any,
            font_dict: dict[str, Any] | None,
            font_size: float,
            *,
            _page_h: float = page_h,
            _frags: list[tuple[float, float, str, float, bool]] = raw_fragments,
        ) -> None:
            if not text or not text.strip():
                return
            try:
                tx = float(tm[4]) if tm and len(tm) >= 6 else 0.0
                ty = float(tm[5]) if tm and len(tm) >= 6 else 0.0
                scale_y = math.hypot(float(tm[2]), float(tm[3])) if tm and len(tm) >= 4 else 1.0
                eff_size = float(font_size or 0.0) * (scale_y or 1.0)
                if eff_size <= 0.1:
                    eff_size = float(font_size or 10.0)
            except (TypeError, ValueError, IndexError):
                tx, ty, eff_size = 0.0, 0.0, float(font_size or 10.0)

            base_font = str((font_dict or {}).get("/BaseFont") or "")
            is_bold = _is_bold_font_name(base_font)
            # PDF-Koordinaten starten unten (y=0); für y_norm oben=0 umrechnen
            y_norm = max(0.0, min(1.0, 1.0 - (ty / _page_h)))
            _frags.append((y_norm, tx, text, eff_size, is_bold))

        try:
            page.extract_text(visitor_text=_visitor)
        except TypeError:
            # DummyPage-Mocks in Unit-Tests unterstützen meist kein visitor_text
            continue
        except Exception as exc:  # noqa: BLE001
            logger.debug("pypdf visitor_text auf Seite %d fehlgeschlagen: %s", page_idx, exc)
            continue

        if not raw_fragments:
            continue

        # Fragmente mit nahezu gleicher Y-Position zu Zeilen gruppieren
        raw_fragments.sort(key=lambda item: (round(item[0], 3), item[1]))
        grouped: list[list[tuple[float, float, str, float, bool]]] = []
        for frag in raw_fragments:
            if grouped and abs(frag[0] - grouped[-1][0][0]) <= 0.012:
                grouped[-1].append(frag)
            else:
                grouped.append([frag])

        for group in grouped:
            group.sort(key=lambda item: item[1])
            joined_text = normalize_whitespace(" ".join(g[2].strip() for g in group))
            if not joined_text:
                continue
            total_len = sum(max(1, len(g[2].strip())) for g in group)
            avg_size = (
                sum(g[3] * max(1, len(g[2].strip())) for g in group) / total_len
            )
            bold_len = sum(max(1, len(g[2].strip())) for g in group if g[4])
            lines.append(
                LayoutLine(
                    text=joined_text,
                    font_size=round(avg_size, 2),
                    is_bold=bold_len >= (total_len / 2.0),
                    y_norm=round(group[0][0], 4),
                    page_num=page_idx,
                )
            )

    return lines


def _collect_multiline_block(
    lines: list[str],
    start_idx: int,
    *,
    provider: str = "",
    known_providers: list[str] | None = None,
    max_lines: int = 3,
) -> str:
    """Führt ab `start_idx` zusammengehörige, nicht-rauschende Titelzeilen zusammen."""
    collected: list[str] = []
    for idx in range(start_idx, min(len(lines), start_idx + max_lines)):
        line = lines[idx].strip()
        if not line:
            if collected:
                break
            continue
        if is_non_title_line(line, provider=provider, known_providers=known_providers):
            if collected:
                break
            continue
        # Abbruch vor typischen Nachsatz-Zeilen (Coursera/IHK/Udemy)
        if re.match(
            r"(?i)^(?:an\s+online|authorized\s+by|offered\s+by|teilgenommen\b|"
            r"lehrkraft|instructors?|datum|date|zertifikat-nr|certificate\s+no|"
            r"dauer|referenznummer|credential|by:)",
            line,
        ):
            break
        collected.append(line)
        # Wenn Zeile mit einem Satzende endet, nicht weiter anstückeln
        if line.endswith((".", "!")):
            break
    return normalize_title(" ".join(collected))


def _match_structured_patterns(
    text: str,
    *,
    provider: str = "",
    known_providers: list[str] | None = None,
) -> TitleCandidate | None:
    """Sucht nach hochpräzisen plattform- und satzbasierten Titelmustern."""
    norm_text = normalize_whitespace(text)
    if not norm_text:
        return None

    lines = [ln.strip() for ln in norm_text.splitlines()]

    # 1. Udemy Deutsch & Englisch (auch mehrzeiliger Kurstitel vor Metadaten-Block)
    udemy_block = re.search(
        r"(?is)(?:zertifikat\s+(?:über|uber)\s+die\s+erfolgreiche\s+teilnahme|"
        r"zertifikat\s+der\s+fertigstellung|certificate\s+of\s+completion)\s*\n+"
        r"(.+?)\s*\n+\s*(?:lehrkraft|instructors?|dozent(?:en)?|unterrichtet\s+von|"
        r"datum|date|zertifikat[- ]*nr\.?|certificate\s+no\.?|dauer|length|referenznummer)",
        norm_text,
    )
    if udemy_block:
        raw_block = udemy_block.group(1)
        block_lines = [
            ln.strip()
            for ln in raw_block.splitlines()
            if ln.strip()
            and not is_non_title_line(
                ln, provider=provider, known_providers=known_providers
            )
        ]
        candidate = normalize_title(" ".join(block_lines))
        if 4 <= len(candidate) <= 150:
            return TitleCandidate(
                title=candidate,
                confidence=0.95,
                source="pattern",
                reason="Udemy-Zertifikatsblock",
            )

    # 2. Microsoft Certified Präfix + Folgezeile zusammenführen
    ms_match = re.search(
        r"(?im)^(Microsoft\s+Certified\s*:)\s*(?:\n\s*)?([^\n\r]{4,90})$",
        norm_text,
    )
    if ms_match:
        ms_title = normalize_title(f"{ms_match.group(1)} {ms_match.group(2)}")
        if not is_non_title_line(ms_title, provider=provider, known_providers=known_providers):
            return TitleCandidate(
                title=ms_title,
                confidence=0.94,
                source="pattern",
                reason="Microsoft-Certified-Muster",
            )

    # 3. IHK / Deutsche Teilnahmebescheinigungen:
    #    "hat ... erfolgreich am (Lehrgang|Seminar|Kurs|...) <TITEL> teilgenommen"
    de_completed = re.search(
        r"(?is)hat\b[^\n]{0,80}?\berfolgreich\s+"
        r"(?:an\s+(?:dem|der)\s+(?:lehrgang|seminar|kurs|weiterbildung|maßnahme|workshop|schulung)\s+|"
        r"am\s+(?:lehrgang|seminar|kurs|workshop)\s+)?"
        r"[\"„]?(.{4,140}?)[\"“]?\s+teilgenommen\b",
        norm_text,
    )
    if de_completed:
        cand = normalize_title(de_completed.group(1))
        if cand and not is_non_title_line(cand, provider=provider, known_providers=known_providers):
            return TitleCandidate(
                title=cand,
                confidence=0.92,
                source="pattern",
                reason="Deutsches Teilnahme-Muster",
            )

    # Explizite deutsche Label: Thema / Lehrgang / Seminar / Veranstaltung / Maßnahme
    de_label = re.search(
        r"(?im)^(?:thema|lehrgang|seminar|veranstaltung|maßnahme|kursname|modul)\s*:\s*([^\n\r]{4,140})$",
        norm_text,
    )
    if de_label:
        cand = normalize_title(de_label.group(1))
        if cand and not is_non_title_line(cand, provider=provider, known_providers=known_providers):
            return TitleCandidate(
                title=cand,
                confidence=0.9,
                source="pattern",
                reason="Deutsches Titel-Label",
            )

    # 4. LinkedIn Learning: "Course completed on ..." oder "Course completed by ..."
    for idx, line in enumerate(lines):
        if re.match(r"(?i)^(?:course|learning\s+path)\s+completed\s+(?:on|by)\b", line):
            # Titel steht meist direkt darunter oder direkt darüber
            for probe_idx in (idx + 1, idx - 1):
                if 0 <= probe_idx < len(lines):
                    cand = _collect_multiline_block(
                        lines,
                        probe_idx,
                        provider=provider,
                        known_providers=known_providers,
                        max_lines=2,
                    )
                    if 4 <= len(cand) <= 130:
                        return TitleCandidate(
                            title=cand,
                            confidence=0.9,
                            source="pattern",
                            reason="LinkedIn-Learning-Muster",
                        )

    # 5. Coursera / Allgemeine Completion-Sätze:
    #    "has successfully completed (the course|program|specialization)?\n<TITEL>"
    inline_or_next_patterns: tuple[re.Pattern[str], ...] = (
        re.compile(
            r"(?i)has\s+(?:successfully\s+)?completed\b\s*"
            r"(?:the\s+(?:course|program|specialization|nanodegree)\b\s*)?([^\n\r]*)"
        ),
        re.compile(
            r"(?i)(?:erfolgreich\s+teilgenommen\s+am\s+kurs|bescheinigung\s+(?:über|uber))\s*[:\-]?\s*([^\n\r]*)"
        ),
        re.compile(
            r"(?i)certificate\s+of\s+(?:completion|achievement|accomplishment|attendance)\s*[:\-]\s*(?:for\s+)?([^\n\r]+)"
        ),
        re.compile(r"(?i)course\s+certificate\s*[:\-]\s*([^\n\r]+)"),
    )

    for idx, line in enumerate(lines):
        for pat in inline_or_next_patterns:
            m = pat.search(line)
            if not m:
                continue
            inline_part = normalize_title(m.group(1))
            if inline_part and not is_non_title_line(
                inline_part, provider=provider, known_providers=known_providers
            ):
                # Prüfe ob die nächste Zeile den Titel fortsetzt (z.B. 2-zeiliger Kursname)
                if idx + 1 < len(lines) and not inline_part.endswith((".", "!")):
                    next_line = lines[idx + 1]
                    if (
                        next_line
                        and not is_non_title_line(
                            next_line, provider=provider, known_providers=known_providers
                        )
                        and not re.match(r"(?i)^(?:an\s+online|authorized|offered|by:|date|datum)", next_line)
                        and len(inline_part) + len(next_line) <= 130
                    ):
                        combined = normalize_title(f"{inline_part} {next_line}")
                        return TitleCandidate(
                            title=combined,
                            confidence=0.9,
                            source="pattern",
                            reason="Mehrzeiliges Completion-Muster",
                        )
                if 4 <= len(inline_part) <= 130:
                    return TitleCandidate(
                        title=inline_part,
                        confidence=0.9,
                        source="pattern",
                        reason="Inline-Completion-Muster",
                    )

            # Wenn nach "has successfully completed" nur ein Zeilenumbruch folgt: nächste Zeilen holen
            cand = _collect_multiline_block(
                lines,
                idx + 1,
                provider=provider,
                known_providers=known_providers,
                max_lines=2,
            )
            if 4 <= len(cand) <= 130:
                return TitleCandidate(
                    title=cand,
                    confidence=0.88,
                    source="pattern",
                    reason="Mehrzeiliges Next-Line-Completion-Muster",
                )

    return None


def _rank_layout_lines(
    layout_lines: list[LayoutLine],
    *,
    provider: str = "",
    known_providers: list[str] | None = None,
) -> TitleCandidate | None:
    """Wählt anhand von Fontgröße, Bold-Attribut und Position den besten Titel aus PDF-Layoutzeilen."""
    page0 = [ln for ln in layout_lines if ln.page_num == 0] or layout_lines
    candidates: list[tuple[float, int, LayoutLine]] = []

    max_font = max((ln.font_size for ln in page0 if ln.font_size > 0), default=12.0)
    if max_font <= 0:
        max_font = 12.0

    for idx, ln in enumerate(page0):
        cleaned = normalize_title(ln.text)
        if not cleaned or len(cleaned) < 4 or len(cleaned) > 130:
            continue
        if is_non_title_line(cleaned, provider=provider, known_providers=known_providers):
            continue

        word_count = len(cleaned.split())
        if word_count == 1 and len(cleaned) < 8:
            continue

        # Score: Schriftgröße dominiert, ergänzt durch Bold und Position im oberen/mittleren Bereich
        size_ratio = ln.font_size / max_font
        score = size_ratio * 60.0
        if ln.is_bold:
            score += 15.0
        if 0.15 <= ln.y_norm <= 0.72:
            score += 15.0
        elif ln.y_norm < 0.15:
            score += 6.0
        if 2 <= word_count <= 14:
            score += 10.0

        # Malus für offensichtliche Volltext-Absätze
        if word_count > 18 or cleaned.endswith("."):
            score -= 20.0

        candidates.append((score, idx, ln))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    best_score, best_idx, best_line = candidates[0]

    # Prüfe auf mehrzeiligen Titel: direkt nachfolgende/vorhergehende Zeile mit gleicher Fontgröße
    merged_parts = [best_line.text]
    for offset in (1, 2):
        nxt_idx = best_idx + offset
        if nxt_idx >= len(page0):
            break
        nxt = page0[nxt_idx]
        if is_non_title_line(nxt.text, provider=provider, known_providers=known_providers):
            break
        size_diff = abs(nxt.font_size - best_line.font_size) / max(1.0, best_line.font_size)
        y_gap = nxt.y_norm - page0[nxt_idx - 1].y_norm
        if size_diff <= 0.15 and 0.0 <= y_gap <= 0.08 and len(nxt.text) <= 90:
            merged_parts.append(nxt.text)
        else:
            break

    final_title = normalize_title(" ".join(merged_parts))
    if not final_title:
        return None

    confidence = min(0.92, max(0.62, best_score / 100.0))
    return TitleCandidate(
        title=final_title,
        confidence=round(confidence, 2),
        source="layout",
        reason=f"Layout-Analyse (font={best_line.font_size:.1f}pt, bold={best_line.is_bold})",
    )


def _heuristic_from_plain_lines(
    text: str,
    *,
    provider: str = "",
    known_providers: list[str] | None = None,
) -> TitleCandidate | None:
    """Zeilenbasierte Heuristik für reinen OCR-Text ohne Layout-Informationen."""
    norm_text = normalize_whitespace(text)
    if not norm_text:
        return None

    lines = [ln.strip() for ln in norm_text.splitlines() if ln.strip()]
    scored: list[tuple[float, int, str]] = []

    for idx, raw_line in enumerate(lines[:25]):
        cand = normalize_title(raw_line)
        if not cand or len(cand) < 5 or len(cand) > 120:
            continue
        if is_non_title_line(cand, provider=provider, known_providers=known_providers):
            continue

        words = cand.split()
        if len(words) < 2 and len(cand) < 12:
            continue

        score = 45.0
        if 2 <= len(words) <= 12:
            score += 20.0
        if 1 <= idx <= 10:
            score += 10.0
        # Viele großgeschriebene Wörter (Title Case) sprechen für Kurstitel
        title_case_ratio = sum(1 for w in words if w[:1].isupper()) / max(1, len(words))
        score += title_case_ratio * 15.0
        if ":" in cand or "-" in cand:
            score += 5.0
        if cand.endswith("."):
            score -= 15.0

        scored.append((score, idx, cand))

    if not scored:
        return None

    scored.sort(key=lambda item: item[0], reverse=True)
    best_score, _, best_title = scored[0]
    confidence = min(0.75, max(0.45, best_score / 100.0))
    return TitleCandidate(
        title=best_title,
        confidence=round(confidence, 2),
        source="heuristic",
        reason="OCR-Zeilenheuristik",
    )


def _title_from_filename(filename: str, provider: str = "") -> TitleCandidate | None:
    """Extrahiert einen bereinigten Titel aus dem Dateinamen als letzten Fallback."""
    stem = Path(filename).stem
    if not stem or re.match(r"^tmp[a-z0-9_]{4,}$", stem.lower()):
        return None
    # Reine Hash-/UUID-Dateinamen verwerfen
    if re.fullmatch(r"[0-9a-f]{16,}", stem.lower()) or re.fullmatch(
        r"[0-9a-f-]{32,}", stem.lower()
    ):
        return None

    if provider:
        stem = re.sub(rf"(?i)(?:^|[\W_]){re.escape(provider)}(?:$|[\W_])", " ", stem)

    clean_stem = re.sub(r"[_\-+]+", " ", stem)
    clean_stem = re.sub(r"\s{2,}", " ", clean_stem).strip()
    clean_title = re.sub(r"(?i)^(certificate|zertifikat)\s+", "", clean_stem).strip()
    final = normalize_title(clean_title or clean_stem)
    if not final or is_non_title_line(final, provider=provider):
        return None
    return TitleCandidate(
        title=final,
        confidence=0.35,
        source="filename",
        reason="Dateiname-Fallback",
    )


def extract_best_title(
    text: str,
    filename: str,
    pdf_meta: dict[str, str] | None = None,
    *,
    provider: str = "",
    known_providers: list[str] | None = None,
    layout_lines: list[LayoutLine] | None = None,
) -> TitleCandidate:
    """Mehrstufige Titelerkennung: Strukturmuster -> PDF-Layout -> Zeilenheuristik -> Meta -> Dateiname."""
    pdf_meta = pdf_meta or {}

    # 1. Struktur-/Satzmuster im Text
    pattern_cand = _match_structured_patterns(
        text, provider=provider, known_providers=known_providers
    )
    if pattern_cand and pattern_cand.confidence >= 0.85:
        return pattern_cand

    # 2. Layout-/Fontgrößen-Analyse (eingebetteter PDF-Text)
    if layout_lines:
        layout_cand = _rank_layout_lines(
            layout_lines, provider=provider, known_providers=known_providers
        )
        if layout_cand:
            if pattern_cand and pattern_cand.confidence > layout_cand.confidence:
                return pattern_cand
            return layout_cand

    if pattern_cand:
        return pattern_cand

    # 3. Zeilenheuristik auf Volltext (z. B. reines Tesseract-OCR)
    heuristic_cand = _heuristic_from_plain_lines(
        text, provider=provider, known_providers=known_providers
    )
    if heuristic_cand:
        return heuristic_cand

    # 4. PDF-Metadaten (nur wenn nicht generisch / kein Tool-Präfix)
    meta_title = normalize_title(str(pdf_meta.get("title") or ""))
    if (
        meta_title
        and len(meta_title) >= 4
        and not re.match(r"(?i)^(?:microsoft\s+word|powerpoint|untitled)\b", meta_title)
        and not is_non_title_line(
            meta_title, provider=provider, known_providers=known_providers
        )
    ):
        return TitleCandidate(
            title=meta_title,
            confidence=0.55,
            source="meta",
            reason="PDF-Metadaten",
        )

    # 5. Dateiname als letzter Fallback
    fn_cand = _title_from_filename(filename, provider=provider)
    if fn_cand:
        return fn_cand

    return TitleCandidate(title="", confidence=0.0, source="none", reason="Kein Titel erkannt")


def is_weak_title(
    title: str,
    confidence: float,
    filename: str = "",
    *,
    provider: str = "",
) -> bool:
    """Bewertet, ob ein Titel schwach/unsicher ist und Gemini Vision Fallback benötigt."""
    if not title or confidence < 0.65:
        return True
    if is_non_title_line(title, provider=provider):
        return True
    if filename and title == Path(filename).stem:
        return True
    return bool(len(title.split()) <= 1 and len(title) < 15)
