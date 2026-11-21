"""OCR-Infrastruktur, Tesseract-Konfiguration, Bild-Preprocessing und PDF-Rendering.

Windows-Installation (Tesseract + deutsches Sprachpaket):
    1. Per winget installieren:
       ``winget install --id UB-Mannheim.TesseractOCR -e``
       (Im Installer unter "Additional language data" das Paket "German (deu)"
       mit auswählen, oder ``deu.traineddata`` aus ``tesseract-ocr/tessdata_best``
       nach ``C:\\Program Files\\Tesseract-OCR\\tessdata\\`` kopieren.)
    2. Optional in ``.env`` konfigurieren, falls der Standardpfad abweicht:
       ``TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe``
       ``TESSDATA_PREFIX=C:\\Program Files\\Tesseract-OCR\\tessdata``
    3. Gesundheitscheck ausführen:
       ``python manage.py check_ocr``
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import pytesseract
from PIL import Image, ImageFilter, ImageOps

logger = logging.getLogger(__name__)

TESSERACT_INSTALL_GUIDE = (
    "Windows: `winget install --id UB-Mannheim.TesseractOCR -e` (im Setup "
    "Sprachpaket 'German (deu)' aktivieren) oder TESSERACT_CMD in .env setzen. "
    "Linux/Debian: `sudo apt-get install -y tesseract-ocr tesseract-ocr-deu poppler-utils`."
)

_WINDOWS_TESSERACT_CANDIDATES: tuple[Path, ...] = (
    Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
    Path(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
    Path(os.environ.get("LOCALAPPDATA", ""))
    / "Programs"
    / "Tesseract-OCR"
    / "tesseract.exe",
    Path(os.environ.get("USERPROFILE", ""))
    / "scoop"
    / "apps"
    / "tesseract"
    / "current"
    / "tesseract.exe",
)

_POSIX_TESSERACT_CANDIDATES: tuple[Path, ...] = (
    Path("/usr/bin/tesseract"),
    Path("/usr/local/bin/tesseract"),
    Path("/opt/homebrew/bin/tesseract"),
)


@dataclass
class TesseractStatus:
    """Strukturierter Diagnose-Status für lokale OCR- und PDF-Render-Backends."""

    available: bool
    cmd: str | None = None
    version: str | None = None
    languages: list[str] = field(default_factory=list)
    tessdata_dir: str | None = None
    has_deu: bool = False
    has_eng: bool = False
    pdf_render_backend: str | None = None
    poppler_path: str | None = None
    error: str | None = None
    install_hint: str = TESSERACT_INSTALL_GUIDE


def _configure_tessdata_for_cmd(cmd_path: str) -> str | None:
    """Ermittelt und setzt TESSDATA_PREFIX passend zum gefundenen Tesseract-Binary."""
    env_tessdata = os.getenv("TESSDATA_PREFIX", "").strip()
    if env_tessdata and Path(env_tessdata).is_dir():
        return env_tessdata

    candidate_dir = Path(cmd_path).resolve().parent / "tessdata"
    if candidate_dir.is_dir():
        os.environ["TESSDATA_PREFIX"] = str(candidate_dir)
        return str(candidate_dir)
    return None


def resolve_tesseract_cmd() -> str | None:
    """Ermittelt das Tesseract-Binary über Env-Var, PATH und Standardpfade."""
    env_cmd = os.getenv("TESSERACT_CMD", "").strip().strip('"')
    if env_cmd:
        env_path = Path(env_cmd)
        if env_path.is_file():
            cmd_str = str(env_path)
            pytesseract.pytesseract.tesseract_cmd = cmd_str
            _configure_tessdata_for_cmd(cmd_str)
            return cmd_str
        which_env = shutil.which(env_cmd)
        if which_env:
            pytesseract.pytesseract.tesseract_cmd = which_env
            _configure_tessdata_for_cmd(which_env)
            return which_env
        logger.warning(
            "TESSERACT_CMD='%s' existiert nicht oder ist nicht ausführbar.",
            env_cmd,
        )

    which_cmd = shutil.which("tesseract")
    if which_cmd:
        pytesseract.pytesseract.tesseract_cmd = which_cmd
        _configure_tessdata_for_cmd(which_cmd)
        return which_cmd

    candidates = (
        _WINDOWS_TESSERACT_CANDIDATES
        if os.name == "nt"
        else _POSIX_TESSERACT_CANDIDATES
    )
    for candidate in candidates:
        if str(candidate) and candidate.is_file():
            cmd_str = str(candidate)
            pytesseract.pytesseract.tesseract_cmd = cmd_str
            _configure_tessdata_for_cmd(cmd_str)
            return cmd_str

    return None


def resolve_pdftoppm_cmd() -> str | None:
    """Sucht nach dem Poppler-Tool `pdftoppm` für PDF-zu-Bild-Rendering."""
    env_poppler = os.getenv("POPPLER_PATH", "").strip().strip('"')
    if env_poppler:
        exe_name = "pdftoppm.exe" if os.name == "nt" else "pdftoppm"
        direct = Path(env_poppler)
        if direct.is_file():
            return str(direct)
        in_dir = direct / exe_name
        if in_dir.is_file():
            return str(in_dir)

    which_pdftoppm = shutil.which("pdftoppm")
    if which_pdftoppm:
        return which_pdftoppm

    if os.name == "nt":
        for root in (Path(r"D:\dev"), Path(r"C:\Program Files"), Path(r"C:\tools")):
            if not root.is_dir():
                continue
            for match in sorted(
                root.glob("poppler*/Library/bin/pdftoppm.exe"), reverse=True
            ):
                if match.is_file():
                    return str(match)
            for match in sorted(root.glob("poppler*/bin/pdftoppm.exe"), reverse=True):
                if match.is_file():
                    return str(match)
    return None


def _has_pymupdf() -> bool:
    """Prüft, ob PyMuPDF (`fitz`) im Python-Environment verfügbar ist."""
    try:
        import fitz  # noqa: F401
    except ImportError:
        return False
    return True


def _detect_pdf_render_backend() -> tuple[str | None, str | None]:
    """Ermittelt das beste verfügbare PDF-Render-Backend."""
    if _has_pymupdf():
        return "pymupdf", None
    pdftoppm_cmd = resolve_pdftoppm_cmd()
    if pdftoppm_cmd:
        return "pdftoppm", str(Path(pdftoppm_cmd).parent)
    return "pypdf-images", None


def check_tesseract_health() -> TesseractStatus:
    """Prüft Binary, Ausführbarkeit, Sprachpakete und PDF-Renderer im Detail."""
    render_backend, poppler_path = _detect_pdf_render_backend()
    cmd = resolve_tesseract_cmd()
    if not cmd:
        return TesseractStatus(
            available=False,
            pdf_render_backend=render_backend,
            poppler_path=poppler_path,
            error=(
                "Tesseract-Binary nicht gefunden (weder über TESSERACT_CMD, "
                "PATH noch in Standardinstallationspfaden)."
            ),
        )

    tessdata_dir = _configure_tessdata_for_cmd(cmd)

    try:
        ver_proc = subprocess.run(
            [cmd, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except OSError as exc:
        win_hint = ""
        if getattr(exc, "winerror", None) == 623:
            win_hint = (
                " (WinError 623: System-DLL-Relocation blockiert — z. B. durch "
                "Sandbox/AppContainer oder inkompatible MinGW-DLLs)"
            )
        return TesseractStatus(
            available=False,
            cmd=cmd,
            tessdata_dir=tessdata_dir,
            pdf_render_backend=render_backend,
            poppler_path=poppler_path,
            error=f"Tesseract-Binary '{cmd}' konnte nicht gestartet werden: {exc}{win_hint}",
        )
    except subprocess.TimeoutExpired:
        return TesseractStatus(
            available=False,
            cmd=cmd,
            tessdata_dir=tessdata_dir,
            pdf_render_backend=render_backend,
            poppler_path=poppler_path,
            error=f"Timeout beim Ausführen von '{cmd} --version'.",
        )

    if ver_proc.returncode != 0:
        stderr_msg = (ver_proc.stderr or ver_proc.stdout or "").strip()
        return TesseractStatus(
            available=False,
            cmd=cmd,
            tessdata_dir=tessdata_dir,
            pdf_render_backend=render_backend,
            poppler_path=poppler_path,
            error=f"Tesseract --version lieferte Exit-Code {ver_proc.returncode}: {stderr_msg}",
        )

    version_line = (ver_proc.stdout or ver_proc.stderr or "").splitlines()
    version_str = version_line[0].strip() if version_line else "unknown"

    languages: list[str] = []
    try:
        lang_proc = subprocess.run(
            [cmd, "--list-langs"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        raw_lines = (lang_proc.stdout or lang_proc.stderr or "").splitlines()
        for line in raw_lines:
            cleaned = line.strip()
            if not cleaned or cleaned.lower().startswith("list of available languages"):
                continue
            languages.append(cleaned)
    except (OSError, subprocess.TimeoutExpired) as exc:
        logger.warning("Konnte Tesseract-Sprachpakete nicht auflisten: %s", exc)

    return TesseractStatus(
        available=True,
        cmd=cmd,
        version=version_str,
        languages=languages,
        tessdata_dir=tessdata_dir,
        has_deu="deu" in languages,
        has_eng="eng" in languages,
        pdf_render_backend=render_backend,
        poppler_path=poppler_path,
        error=None,
    )


def is_tesseract_available() -> bool:
    """Gibt True zurück, wenn Tesseract lokal ausführbar ist."""
    return check_tesseract_health().available


def _otsu_threshold(gray_img: Image.Image) -> int:
    """Berechnet einen optimalen Binarisierungs-Schwellenwert nach Otsu (ohne NumPy)."""
    hist = gray_img.histogram()
    total = sum(hist)
    if total == 0:
        return 128

    sum_total = sum(i * h for i, h in enumerate(hist))
    sum_bg = 0
    weight_bg = 0
    max_var = -1.0
    threshold = 128

    for t in range(256):
        weight_bg += hist[t]
        if weight_bg == 0:
            continue
        weight_fg = total - weight_bg
        if weight_fg == 0:
            break
        sum_bg += t * hist[t]
        mean_bg = sum_bg / weight_bg
        mean_fg = (sum_total - sum_bg) / weight_fg
        between_var = weight_bg * weight_fg * (mean_bg - mean_fg) ** 2
        if between_var > max_var:
            max_var = between_var
            threshold = t

    return threshold


def preprocess_image_for_ocr(
    img: Image.Image,
    *,
    binarize: bool = False,
    target_min_width: int = 1800,
) -> Image.Image:
    """Bereitet ein Bild optimal für Tesseract-OCR vor.

    - Korrigiert EXIF-Orientierung.
    - Flacht Transparenz (RGBA/LA/P) auf weißen Hintergrund ab.
    - Konvertiert in Graustufen.
    - Skaliert mittelgroße Scans (ab 60px Breite) auf ~300-DPI-Äquivalent hoch.
    - Normalisiert Kontrast und wendet optional eine Otsu-Binarisierung an.
    """
    oriented = ImageOps.exif_transpose(img) or img

    # Transparenz sauber auf Weiß legen (sonst entsteht oft schwarzer Hintergrund)
    if oriented.mode in ("RGBA", "LA") or (
        oriented.mode == "P" and "transparency" in oriented.info
    ):
        rgba = oriented.convert("RGBA")
        white_bg = Image.new("RGB", rgba.size, (255, 255, 255))
        white_bg.paste(rgba, mask=rgba.split()[3])
        rgb_or_gray = white_bg
    else:
        rgb_or_gray = oriented

    gray = rgb_or_gray.convert("L")

    # Upscaling nur bei sinnvollen Scan-/Dokumentgrößen (schützt Winzig-Mocks)
    w, h = gray.size
    if 60 <= w < target_min_width:
        scale = min(3.0, target_min_width / float(w))
        new_w = min(3600, max(w, round(w * scale)))
        new_h = min(4800, max(h, round(h * scale)))
        if new_w > w and new_h > h:
            gray = gray.resize((new_w, new_h), Image.Resampling.LANCZOS)
            gray = gray.filter(ImageFilter.SHARPEN)

    gray = ImageOps.autocontrast(gray, cutoff=1)

    if binarize:
        thresh = _otsu_threshold(gray)
        gray = gray.point(lambda p: 255 if p > thresh else 0, mode="1").convert("L")

    return gray


def _select_tesseract_langs(preferred: str | None = None) -> str | None:
    """Wählt `deu+eng` falls verfügbar, sonst vorhandene Einzelsprachen."""
    if preferred:
        return preferred
    env_langs = os.getenv("TESSERACT_LANGS", "").strip()
    if env_langs:
        return env_langs

    tessdata = os.getenv("TESSDATA_PREFIX", "").strip()
    if not tessdata:
        cmd = resolve_tesseract_cmd()
        if cmd:
            candidate = Path(cmd).resolve().parent / "tessdata"
            if candidate.is_dir():
                tessdata = str(candidate)

    if tessdata:
        tess_path = Path(tessdata)
        has_deu = (tess_path / "deu.traineddata").is_file()
        has_eng = (tess_path / "eng.traineddata").is_file()
        if has_deu and has_eng:
            return "deu+eng"
        if has_deu:
            logger.warning(
                "Tesseract-Sprachpaket 'eng.traineddata' fehlt in %s; nutze 'deu'.",
                tessdata,
            )
            return "deu"
        if has_eng:
            logger.warning(
                "Tesseract-Sprachpaket 'deu.traineddata' fehlt in %s; nutze 'eng'.",
                tessdata,
            )
            return "eng"

    return "eng"


def _call_pytesseract(
    image: Image.Image, *, lang: str | None, psm: int, timeout: int
) -> str:
    """Ruft pytesseract auf und fällt bei simplen Test-Mocks auf 1-Arg-Aufruf zurück."""
    config = f"--psm {psm}"
    try:
        if lang:
            return str(
                pytesseract.image_to_string(
                    image, lang=lang, config=config, timeout=timeout
                )
            )
        return str(pytesseract.image_to_string(image, config=config, timeout=timeout))
    except TypeError:
        # Rückwärtskompatibilität für Tests, die `lambda img: ...` monkeypatchen
        return str(pytesseract.image_to_string(image))


def run_tesseract_ocr(
    img: Image.Image,
    *,
    langs: str | None = None,
    psm: int = 3,
    timeout: int = 30,
) -> str:
    """Führt Tesseract-OCR mit Preprocessing, Sprachwahl und sauberem Logging aus.

    Wirft keine Exception bei fehlendem/defektem Tesseract, sondern loggt klar
    und gibt einen leeren String zurück (Graceful Degradation).
    """
    resolve_tesseract_cmd()
    selected_langs = _select_tesseract_langs(langs)

    processed = preprocess_image_for_ocr(img, binarize=False)
    try:
        text = _call_pytesseract(
            processed, lang=selected_langs, psm=psm, timeout=timeout
        ).strip()
    except pytesseract.TesseractNotFoundError as exc:
        logger.warning(
            "Tesseract OCR nicht verfügbar (TesseractNotFoundError): %s | %s",
            exc,
            TESSERACT_INSTALL_GUIDE,
        )
        return ""
    except pytesseract.TesseractError as exc:
        # Falls z. B. 'deu' nicht geladen werden konnte, mit 'eng' versuchen
        if selected_langs and "deu" in selected_langs and "eng" in selected_langs:
            logger.warning(
                "Tesseract-Fehler mit lang='%s' (%s) — versuche Fallback auf 'eng'.",
                selected_langs,
                exc,
            )
            try:
                selected_langs = "eng"
                text = _call_pytesseract(
                    processed, lang=selected_langs, psm=psm, timeout=timeout
                ).strip()
            except Exception as fallback_exc:  # noqa: BLE001
                logger.warning(
                    "Tesseract-Fallback 'eng' fehlgeschlagen: %s", fallback_exc
                )
                return ""
        else:
            logger.warning("Tesseract-OCR-Fehler: %s", exc)
            return ""
    except OSError as exc:
        logger.warning(
            "Tesseract-Prozess konnte nicht ausgeführt werden (%s). "
            "Prüfe TESSERACT_CMD oder Windows-DLL/Sandbox-Berechtigungen.",
            exc,
        )
        return ""
    except Exception as exc:  # noqa: BLE001
        logger.warning("Unerwarteter Fehler bei Tesseract-OCR: %s", exc)
        return ""

    # Zweiter Pass mit Binarisierung + PSM 6, wenn Erstpass kaum Text geliefert hat
    if len(text) < 35 and img.width >= 60 and img.height >= 60:
        try:
            binarized = preprocess_image_for_ocr(img, binarize=True)
            retry_text = _call_pytesseract(
                binarized, lang=selected_langs, psm=6, timeout=timeout
            ).strip()
            if len(retry_text) > len(text):
                return retry_text
        except Exception as retry_exc:  # noqa: BLE001
            logger.debug("Tesseract-Binarisierungs-Pass fehlgeschlagen: %s", retry_exc)

    return text


def render_pdf_pages_to_images(
    file_path: Path,
    *,
    max_pages: int = 2,
    dpi: int = 300,
) -> list[Image.Image]:
    """Rendert die ersten PDF-Seiten in PIL-Images (PyMuPDF bevorzugt, sonst pdftoppm)."""
    # 1. PyMuPDF (keine Poppler-Abhängigkeit)
    if _has_pymupdf():
        try:
            import fitz

            rendered: list[Image.Image] = []
            with fitz.open(file_path) as doc:
                for page_index in range(min(max_pages, len(doc))):
                    page = doc[page_index]
                    pix = page.get_pixmap(dpi=dpi, alpha=False)
                    mode = "RGB" if pix.n < 4 else "RGBA"
                    img = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
                    rendered.append(img.copy())
            if rendered:
                return rendered
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "PyMuPDF-Rendering für %s fehlgeschlagen (%s) — prüfe pdftoppm-Fallback.",
                file_path.name,
                exc,
            )

    # 2. Poppler pdftoppm CLI
    pdftoppm_cmd = resolve_pdftoppm_cmd()
    if pdftoppm_cmd:
        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                out_prefix = str(Path(tmp_dir) / "page")
                proc = subprocess.run(
                    [
                        pdftoppm_cmd,
                        "-png",
                        "-r",
                        str(dpi),
                        "-f",
                        "1",
                        "-l",
                        str(max_pages),
                        str(file_path),
                        out_prefix,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False,
                )
                if proc.returncode == 0:
                    images: list[Image.Image] = []
                    for png_path in sorted(Path(tmp_dir).glob("page-*.png")):
                        with Image.open(png_path) as rendered_img:
                            images.append(rendered_img.copy())
                    if images:
                        return images
                else:
                    logger.warning(
                        "pdftoppm fehlgeschlagen für %s (Exit %d): %s",
                        file_path.name,
                        proc.returncode,
                        (proc.stderr or "").strip(),
                    )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "pdftoppm-Aufruf fehlgeschlagen für %s: %s", file_path.name, exc
            )

    return []
