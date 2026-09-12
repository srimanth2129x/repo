"""
Google Drive Asynchronous Telemetry Relay Manager
Discovers, validates, ingests, and archives offline batch files from the Google Drive relay directory.
"""
import os
import json
import logging
import shutil
from pathlib import Path
from datetime import datetime, timezone

from backend.config import config, BASE_DIR
from backend.database.db import get_conn
from backend.services.event_processing.processor import ingest_event as process_ingest_event

logger = logging.getLogger(__name__)


class DriveSyncManager:
    """Manages asynchronous batch ingestion from Google Drive relay directories."""

    def __init__(self):
        self.default_sync_dir = Path(config.GOOGLE_DRIVE_SYNC_DIR)

    def get_candidate_sync_dirs(self, custom_dir: str = None) -> list[Path]:
        dirs = []
        if custom_dir:
            dirs.append(Path(custom_dir))
        if self.default_sync_dir:
            dirs.append(self.default_sync_dir)
        local_sentinel_events = BASE_DIR / "sentinel_events"
        if local_sentinel_events not in dirs:
            dirs.append(local_sentinel_events)
        cwd_events = Path.cwd() / "sentinel_events"
        if cwd_events not in dirs:
            dirs.append(cwd_events)
        return [d for d in dirs if d.exists()]

    def sync_local_relay(self, sync_dir: str = None, db_path: str = None) -> list[dict]:
        """
        Scans candidate relay directories for outgoing batch files and ingests them.
        Archive processed batches to a 'processed/' subfolder.
        """
        results = []
        candidate_dirs = self.get_candidate_sync_dirs(sync_dir)
        if not candidate_dirs and sync_dir:
            p = Path(sync_dir)
            p.mkdir(parents=True, exist_ok=True)
            candidate_dirs = [p]

        for base_dir in candidate_dirs:
            outgoing_dirs = []
            if (base_dir / "outgoing").exists():
                outgoing_dirs.append(base_dir / "outgoing")

            for child in base_dir.iterdir():
                if child.is_dir() and child.name not in ("processed", "staging", "outgoing"):
                    dev_outgoing = child / "outgoing"
                    if dev_outgoing.exists():
                        outgoing_dirs.append(dev_outgoing)

            for out_dir in outgoing_dirs:
                # Find all .json batch files (strictly skip .tmp, staging, and hidden files)
                batch_files = sorted(
                    [f for f in out_dir.glob("*.json") if not f.name.endswith(".tmp") and not f.name.startswith(".")],
                    key=lambda f: f.stat().st_mtime
                )

                for bfile in batch_files:
                    res = self._process_batch_file(bfile, db_path=db_path)
                    if res:
                        results.append(res)

        return results

    def _process_batch_file(self, file_path: Path, db_path: str = None) -> dict:
        """Processes a single batch file safely."""
        try:
            if file_path.stat().st_size == 0:
                logger.warning(f"Skipping empty batch file: {file_path}")
                return None

            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            batch_id = str(data.get("batch_id") or "").strip()
            device_id = str(data.get("device_id") or "").strip()
            events = data.get("events") or []

            if not batch_id or not device_id:
                logger.warning(f"Invalid batch file structure in {file_path}: missing batch_id or device_id")
                return None

            now = datetime.now(timezone.utc).isoformat()

            with get_conn(db_path) as conn:
                # Check device authorization status
                dev = conn.execute("SELECT auth_status FROM devices WHERE id = ?", (device_id,)).fetchone()
                if dev and str(dev["auth_status"]).upper() == "REVOKED":
                    logger.warning(f"Rejecting relay batch {batch_id}: device {device_id} is REVOKED")
                    return {"batch_id": batch_id, "device_id": device_id, "status": "rejected_revoked"}
                if dev and str(dev["auth_status"]).upper() == "PENDING":
                    logger.warning(f"Deferring relay batch {batch_id}: device {device_id} is PENDING")
                    return {"batch_id": batch_id, "device_id": device_id, "status": "deferred_pending"}

                # Layer 1: Batch-level idempotency check
                cur = conn.cursor()
                cur.execute("SELECT batch_id FROM processed_batches WHERE batch_id = ?", (batch_id,))
                if cur.fetchone():
                    self._archive_file(file_path)
                    return {"batch_id": batch_id, "device_id": device_id, "status": "duplicate_ignored"}

            # Process events chronologically
            def _sort_key(ev):
                return (ev.get("event_timestamp") or ev.get("timestamp") or "", ev.get("record_id") or 0)

            sorted_events = sorted(events, key=_sort_key) if isinstance(events, list) else []
            processed_count = 0
            duplicate_count = 0

            for ev in sorted_events:
                if not isinstance(ev, dict):
                    continue
                ev["device_id"] = device_id
                ev["transport"] = "GOOGLE_DRIVE"
                try:
                    res = process_ingest_event(ev, db_path=db_path)
                    if res.get("status") == "duplicate_ignored":
                        duplicate_count += 1
                    else:
                        processed_count += 1
                except Exception as e:
                    logger.warning(f"Failed to ingest event in relay batch {batch_id}: {e}")

            # Record batch as processed in database
            with get_conn(db_path) as conn:
                conn.execute("""
                    INSERT INTO processed_batches (batch_id, device_id, processed_at, event_count, transport)
                    VALUES (?, ?, ?, ?, 'GOOGLE_DRIVE')
                    ON CONFLICT(batch_id) DO NOTHING
                """, (batch_id, device_id, now, processed_count))

                conn.execute("""
                    UPDATE devices
                    SET last_seen = ?,
                        transport_mode = 'GOOGLE_DRIVE',
                        last_event_received = ?
                    WHERE id = ?
                """, (now, now, device_id))

            # Move completed batch to processed folder
            self._archive_file(file_path)

            return {
                "batch_id": batch_id,
                "device_id": device_id,
                "status": "processed",
                "processed_events": processed_count,
                "duplicate_events": duplicate_count,
                "total_events": len(sorted_events)
            }

        except Exception as e:
            logger.error(f"Error processing batch file {file_path}: {e}")
            return {"file": str(file_path), "status": "error", "error": str(e)}

    def _archive_file(self, file_path: Path):
        """Moves a processed file to a sibling 'processed' folder."""
        try:
            processed_dir = file_path.parent.parent / "processed"
            if file_path.parent.name != "outgoing":
                processed_dir = file_path.parent / "processed"
            processed_dir.mkdir(parents=True, exist_ok=True)
            target = processed_dir / file_path.name
            shutil.move(str(file_path), str(target))
        except Exception as e:
            logger.warning(f"Could not archive batch file {file_path}: {e}")


drive_sync_manager = DriveSyncManager()
