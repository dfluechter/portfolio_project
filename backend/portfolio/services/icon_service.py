import logging
import re
import urllib.error
import urllib.request
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

ICON_NAME_REGEX = re.compile(r"^[a-z0-9\-]+$")
FONTAWESOME_SOLID_URL = "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/{icon_name}.svg"


def ensure_track_icon(icon_name: str) -> str | None:
    """Lädt ein FontAwesome Solid Icon bei erstmaliger Verwendung herunter und speichert es unter /static/img/icons/.

    Gibt bei Erfolg den relativen Pfad '/static/img/icons/{icon_name}.svg' zurück,
    oder None bei Fehlern oder ungültigem Namen.
    """
    if not icon_name or not ICON_NAME_REGEX.match(icon_name):
        logger.warning("Ungültiger oder unsicherer Icon-Name abgewiesen: %s", icon_name)
        return None

    staticfiles_dirs = getattr(settings, "STATICFILES_DIRS", None)
    if staticfiles_dirs:
        static_base = Path(staticfiles_dirs[0])
    else:
        static_base = Path(settings.BASE_DIR) / "static"

    icons_dir = static_base / "img" / "icons"
    icons_dir.mkdir(parents=True, exist_ok=True)
    icon_file_path = icons_dir / f"{icon_name}.svg"

    # Cache-Prüfung: Bereits lokal vorhanden?
    if icon_file_path.exists():
        return f"/static/img/icons/{icon_name}.svg"

    # On-Demand Download von FontAwesome Solid Quelle
    url = FONTAWESOME_SOLID_URL.format(icon_name=icon_name)
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Portfolio-Icon-Fetcher/1.0"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                svg_data = resp.read()
                # Atomares Schreiben via temporäre Datei gegen unvollständige Reads
                temp_file = icon_file_path.with_name(f"{icon_file_path.name}.tmp")
                temp_file.write_bytes(svg_data)
                temp_file.replace(icon_file_path)
                logger.info(
                    "FontAwesome Solid Icon '%s' erfolgreich heruntergeladen und gecacht.",
                    icon_name,
                )
                return f"/static/img/icons/{icon_name}.svg"
    except urllib.error.HTTPError as err:
        logger.warning(
            "FontAwesome Icon '%s' nicht auffindbar (HTTP %s) unter %s",
            icon_name,
            err.code,
            url,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Unerwarteter Fehler beim Download des FontAwesome Icons '%s': %s",
            icon_name,
            exc,
        )

    return None
