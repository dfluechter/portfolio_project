import json
import logging
from datetime import UTC, datetime
from typing import Any

from django.core.management.base import BaseCommand

from portfolio.models import Certificate, PendingCertificate
from portfolio.services.storage import (
    check_s3_object_exists,
    compute_s3_object_hash,
    delete_s3_object,
    ensure_certificate_in_storage,
    list_s3_certificate_objects,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Auditiert die Konsistenz von Zertifikaten im S3-Storage gegen die Datenbank (US 14.3). "
        "Findet fehlende Storage-Objekte und verwaiste S3-Dateien und synchronisiert diese optional."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Führt nur eine Analyse durch ohne Änderungen an S3 vorzunehmen (Standard).",
        )
        parser.add_argument(
            "--sync",
            action="store_true",
            help="Synchronisiert fehlende Dateien nach S3 und entfernt verwaiste S3-Dateien.",
        )
        parser.add_argument(
            "--delete-orphans",
            action="store_true",
            help="Löscht verwaiste S3-Objekte ohne fehlende Dateien neu hochzuladen.",
        )
        parser.add_argument(
            "--verify-hashes",
            action="store_true",
            help="Überprüft die SHA-256-Integrität aller S3-Objekte gegen den Datenbank-Hash.",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            dest="json_output",
            help="Gibt die Ergebnisse im strukturierten JSON-Format aus (z. B. für CI/CD).",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run")
        sync_mode = options.get("sync")
        delete_orphans_only = options.get("delete_orphans")
        verify_hashes = options.get("verify_hashes")
        json_output = options.get("json_output")

        # Standard ist Dry-Run, falls weder --sync noch --delete-orphans gewählt wurde
        is_dry_run = dry_run or (not sync_mode and not delete_orphans_only)
        should_sync_missing = bool(sync_mode and not is_dry_run)
        should_delete_orphans = bool(
            (sync_mode or delete_orphans_only) and not is_dry_run
        )

        report: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "mode": "dry-run"
            if is_dry_run
            else ("sync" if sync_mode else "delete-orphans"),
            "database_certificates_total": 0,
            "s3_objects_total": 0,
            "missing_in_s3": [],
            "repaired_in_s3": [],
            "orphan_s3_objects": [],
            "deleted_s3_orphans": [],
            "hash_mismatches": [],
            "intact_count": 0,
        }

        # 1. Datenbank-Zertifikate gegen S3 prüfen
        certs = Certificate.objects.all().select_related("provider")
        report["database_certificates_total"] = certs.count()

        db_storage_keys: set[str] = set()

        for cert in certs:
            storage_key = cert.storage_key or (
                cert.pdf_file.name if cert.pdf_file else ""
            )
            if storage_key:
                db_storage_keys.add(storage_key)

            if not storage_key:
                report["missing_in_s3"].append(
                    {
                        "id": cert.id,
                        "title": cert.title,
                        "error": "Kein storage_key und keine pdf_file in DB hinterlegt.",
                    }
                )
                continue

            exists = check_s3_object_exists(storage_key)
            if not exists:
                item_info = {
                    "id": cert.id,
                    "title": cert.title,
                    "storage_key": storage_key,
                }
                report["missing_in_s3"].append(item_info)

                if should_sync_missing:
                    try:
                        repaired = ensure_certificate_in_storage(cert)
                        if repaired:
                            report["repaired_in_s3"].append(
                                {
                                    "id": cert.id,
                                    "title": cert.title,
                                    "storage_key": cert.storage_key,
                                }
                            )
                    except Exception as exc:  # noqa: BLE001
                        logger.error(
                            "Reparatur für Zertifikat #%s fehlgeschlagen: %s",
                            cert.id,
                            exc,
                        )
            else:
                # Hash-Verifizierung (falls gewünscht)
                if verify_hashes and cert.sha256_hash:
                    actual_hash = compute_s3_object_hash(storage_key)
                    if actual_hash and actual_hash.lower() != cert.sha256_hash.lower():
                        report["hash_mismatches"].append(
                            {
                                "id": cert.id,
                                "title": cert.title,
                                "storage_key": storage_key,
                                "db_hash": cert.sha256_hash,
                                "s3_hash": actual_hash,
                            }
                        )
                    else:
                        report["intact_count"] += 1
                else:
                    report["intact_count"] += 1

        # 2. S3 nach verwaisten Objekten durchsuchen
        s3_objects = list_s3_certificate_objects(prefix="certificates/")
        report["s3_objects_total"] = len(s3_objects)

        # Auch Keys von PendingCertificates schützen
        pending_names = set(
            PendingCertificate.objects.values_list("original_file_name", flat=True)
        )

        now = datetime.now(UTC)

        for s3_obj in s3_objects:
            s3_key = s3_obj["storage_key"]
            if s3_key in db_storage_keys:
                continue

            # Fallback für Namen ohne Präfix
            basename = s3_key.split("/")[-1]
            if any(k.endswith(basename) for k in db_storage_keys):
                continue
            if basename in pending_names:
                continue

            # Uploads-Ordner prüfen: nur als Orphan werten, wenn älter als 24 Stunden
            if "certificates/uploads/" in s3_key:
                last_mod = s3_obj.get("last_modified")
                if last_mod:
                    age_seconds = (now - last_mod).total_seconds()
                    if age_seconds < 86400:  # < 24 Stunden Schonfrist
                        continue

            orphan_entry = {
                "storage_key": s3_key,
                "size": s3_obj.get("size", 0),
                "last_modified": s3_obj.get("last_modified"),
            }
            report["orphan_s3_objects"].append(orphan_entry)

            if should_delete_orphans:
                deleted = delete_s3_object(s3_key)
                if deleted:
                    report["deleted_s3_orphans"].append(s3_key)

        # 3. Ausgabe
        if json_output:
            self.stdout.write(json.dumps(report, indent=2, default=str))
            return

        self._print_human_report(
            report, is_dry_run, should_sync_missing, should_delete_orphans
        )

    def _print_human_report(
        self,
        report: dict[str, Any],
        is_dry_run: bool,
        sync_mode: bool,
        delete_orphans: bool,
    ):
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                "=== S3 Certificate Integrity & Storage Audit (US 14.3) ==="
            )
        )
        self.stdout.write(
            f"Modus: {'DRY-RUN (Keine Änderungen)' if is_dry_run else 'LIVE'}"
        )
        self.stdout.write(f"Zertifikate in DB: {report['database_certificates_total']}")
        self.stdout.write(f"Objekte in S3:     {report['s3_objects_total']}")
        self.stdout.write(f"Intakt / Verfügbar:{report['intact_count']}")

        if report["missing_in_s3"]:
            self.stdout.write(
                self.style.ERROR(
                    f"\n[!] Fehlende S3-Objekte ({len(report['missing_in_s3'])}):"
                )
            )
            for m in report["missing_in_s3"]:
                key = m.get("storage_key") or m.get("error")
                self.stdout.write(f"  - #{m['id']} {m['title']} -> {key}")

        if report["repaired_in_s3"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n[✓] Erfolgreich synchronisiert / hochgeladen ({len(report['repaired_in_s3'])}):"
                )
            )
            for r in report["repaired_in_s3"]:
                self.stdout.write(f"  - #{r['id']} {r['title']} -> {r['storage_key']}")

        if report["orphan_s3_objects"]:
            self.stdout.write(
                self.style.WARNING(
                    f"\n[?] Verwaiste S3-Objekte ({len(report['orphan_s3_objects'])}):"
                )
            )
            for o in report["orphan_s3_objects"]:
                self.stdout.write(f"  - {o['storage_key']} ({o['size']} Bytes)")

        if report["deleted_s3_orphans"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n[x] Gelöschte verwaiste S3-Objekte ({len(report['deleted_s3_orphans'])}):"
                )
            )
            for d in report["deleted_s3_orphans"]:
                self.stdout.write(f"  - {d}")

        if report["hash_mismatches"]:
            self.stdout.write(
                self.style.ERROR(
                    f"\n[!] Hash-Inkonsistenzen ({len(report['hash_mismatches'])}):"
                )
            )
            for h in report["hash_mismatches"]:
                self.stdout.write(
                    f"  - #{h['id']} {h['title']} (DB: {h['db_hash']} != S3: {h['s3_hash']})"
                )

        if (
            not report["missing_in_s3"]
            and not report["orphan_s3_objects"]
            and not report["hash_mismatches"]
        ):
            self.stdout.write(
                self.style.SUCCESS(
                    "\n[OK] Alle Zertifikate und S3-Objekte sind vollständig konsistent."
                )
            )
