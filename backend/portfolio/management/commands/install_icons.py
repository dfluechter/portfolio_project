from typing import Any

from django.core.management.base import BaseCommand

from portfolio.models import Track
from portfolio.services.icon_service import BEST_REPOSITORY_ICONS, ensure_track_icon, install_best_icons


class Command(BaseCommand):
    help = "Lädt die besten SVG-Icons für Tracks, Tech-Stacks und das gesamte Repository herunter und sichert sie lokal."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--all",
            action="store_true",
            help="Installiert sowohl alle Track-Icons aus der Datenbank als auch die kuratierte Icon-Palette.",
        )
        parser.add_argument(
            "icons",
            nargs="*",
            help="Spezifische Icon-Namen zum Herunterladen (optional).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        specific_icons = options.get("icons")
        if specific_icons:
            targets = specific_icons
            self.stdout.write(f"Installiere spezifische Icons: {', '.join(targets)}...")
            results = install_best_icons(targets)
        else:
            targets = list(BEST_REPOSITORY_ICONS)
            # Auch alle Icons aus der Track-Tabelle berücksichtigen
            track_icons = Track.objects.exclude(icon="").values_list("icon", flat=True)
            for ti in track_icons:
                if ti and ti not in targets:
                    targets.append(ti)

            self.stdout.write(f"Installiere kuratierte Icon-Palette ({len(targets)} Icons)...")
            results = install_best_icons(targets)

        success = [k for k, v in results.items() if v]
        failed = [k for k, v in results.items() if not v]

        self.stdout.write(
            self.style.SUCCESS(
                f"Fertig: {len(success)}/{len(targets)} Icons erfolgreich verifiziert/gespeichert."
            )
        )
        if failed:
            self.stdout.write(
                self.style.WARNING(
                    f"Folgende Icons konnten nicht bezogen werden: {', '.join(failed)}"
                )
            )
