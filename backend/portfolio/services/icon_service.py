import logging
import re
import shutil
import urllib.error
import urllib.request
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

ICON_NAME_REGEX = re.compile(r"^[a-z0-9\-]+$")

# Priorisierte Liste verifizierter SVG-Icon-Quellen
ICON_SOURCES: list[str] = [
    "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/{icon_name}.svg",
    "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/brands/{icon_name}.svg",
    "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/{icon_name}.svg",
]

# Kuratierte Liste der besten, wichtigsten Icons für das gesamte Portfolio-Repository
BEST_REPOSITORY_ICONS: list[str] = [
    # Track- und Architektur-Icons
    "code",
    "brain",
    "cloud",
    "database",
    "server",
    "shield-halved",
    "chart-pie",
    "robot",
    "network-wired",
    "laptop-code",
    "terminal",
    "microchip",
    "cubes",
    "layers",
    # Tech Stack & Programmiersprachen (Brands)
    "python",
    "react",
    "docker",
    "aws",
    "github",
    "git-alt",
    "js",
    "node-js",
    "linux",
    "vuejs",
    "angular",
    "html5",
    "css3-alt",
    "java",
    "rust",
    "golang",
    "google",
    "microsoft",
    # UI, Zertifikate & Werdegang
    "certificate",
    "award",
    "graduation-cap",
    "calendar",
    "file-pdf",
    "download",
    "external-link",
    "check",
]


def _get_target_icon_dirs() -> list[Path]:
    """Ermittelt alle relevanten Icon-Verzeichnisse im Repository (Backend Static & Frontend Public)."""
    target_dirs: list[Path] = []

    # 1. Django Staticfiles / BASE_DIR
    staticfiles_dirs = getattr(settings, "STATICFILES_DIRS", None)
    if staticfiles_dirs:
        static_base = Path(staticfiles_dirs[0])
    else:
        static_base = Path(settings.BASE_DIR) / "static"

    target_dirs.append(static_base / "img" / "icons")

    # 2. Frontend public static Verzeichnis (falls im Projekt vorhanden)
    base_dir = Path(getattr(settings, "BASE_DIR", ""))
    frontend_icons = (
        base_dir.parent / "frontend" / "public" / "static" / "img" / "icons"
    )
    if frontend_icons.parent.exists():
        target_dirs.append(frontend_icons)

    return target_dirs


def ensure_track_icon(icon_name: str) -> str | None:
    """Lädt ein Icon (FontAwesome Solid/Brands oder Lucide) bei Bedarf herunter und speichert es lokal.

    Gibt bei Erfolg den relativen Pfad '/static/img/icons/{icon_name}.svg' zurück,
    oder None bei Fehlern oder ungültigem Namen.
    """
    if not icon_name or not ICON_NAME_REGEX.match(icon_name):
        logger.warning("Ungültiger oder unsicherer Icon-Name abgewiesen: %s", icon_name)
        return None

    target_dirs = _get_target_icon_dirs()
    primary_dir = target_dirs[0]
    primary_dir.mkdir(parents=True, exist_ok=True)
    primary_file_path = primary_dir / f"{icon_name}.svg"

    # Cache-Prüfung: Bereits lokal vorhanden?
    if primary_file_path.exists():
        # Falls in Frontend-Public noch fehlend, dorthin spiegeln
        for extra_dir in target_dirs[1:]:
            extra_dir.mkdir(parents=True, exist_ok=True)
            dest = extra_dir / f"{icon_name}.svg"
            if not dest.exists():
                try:
                    shutil.copy2(primary_file_path, dest)
                except Exception as exc:  # noqa: BLE001
                    logger.debug("Fehler beim Spiegeln nach %s: %s", dest, exc)
        return f"/static/img/icons/{icon_name}.svg"

    # Prüfen, ob ein anderes Verzeichnis (z. B. frontend/public) das Icon bereits besitzt
    for other_dir in target_dirs[1:]:
        other_file = other_dir / f"{icon_name}.svg"
        if other_file.exists():
            try:
                shutil.copy2(other_file, primary_file_path)
                return f"/static/img/icons/{icon_name}.svg"
            except Exception as exc:  # noqa: BLE001
                logger.debug("Fehler beim Kopieren von %s: %s", other_file, exc)

    # On-Demand Download aus verifizierten Quellen (Solid -> Brands -> Lucide)
    for source_template in ICON_SOURCES:
        url = source_template.format(icon_name=icon_name)
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Portfolio-Icon-Fetcher/1.0"},
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    svg_data = resp.read()
                    # Atomares Schreiben via temporäre Datei gegen unvollständige Reads
                    temp_file = primary_file_path.with_name(
                        f"{primary_file_path.name}.tmp"
                    )
                    temp_file.write_bytes(svg_data)
                    temp_file.replace(primary_file_path)

                    # An alle weiteren Zielverzeichnisse verteilen
                    for extra_dir in target_dirs[1:]:
                        extra_dir.mkdir(parents=True, exist_ok=True)
                        dest = extra_dir / f"{icon_name}.svg"
                        try:
                            shutil.copy2(primary_file_path, dest)
                        except Exception as exc:  # noqa: BLE001
                            logger.debug("Fehler beim Spiegeln nach %s: %s", dest, exc)

                    logger.info(
                        "Icon '%s' erfolgreich von %s heruntergeladen.", icon_name, url
                    )
                    return f"/static/img/icons/{icon_name}.svg"
        except urllib.error.HTTPError as err:
            logger.debug(
                "Icon '%s' nicht unter %s gefunden (HTTP %s)", icon_name, url, err.code
            )
            continue
        except Exception as exc:  # noqa: BLE001
            logger.error("Fehler beim Abruf von '%s' über %s: %s", icon_name, url, exc)
            break

    logger.warning(
        "Icon '%s' konnte aus keiner konfigurierten Quelle bezogen werden.", icon_name
    )
    return None


def install_best_icons(icons: list[str] | None = None) -> dict[str, bool]:
    """Lädt die besten/wichtigsten Icons für das gesamte Repository vorab herunter."""
    icon_list = icons or BEST_REPOSITORY_ICONS
    results: dict[str, bool] = {}

    for icon in icon_list:
        path = ensure_track_icon(icon)
        results[icon] = path is not None

    return results
