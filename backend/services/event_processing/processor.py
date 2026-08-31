"""
Event Processing Pipeline
Ingests, normalizes, stores, and routes events from Windows sensors.
"""
import json
import logging
from datetime import datetime, timezone

from backend.database.db import get_conn
from backend.services.network_discovery.manager import network_manager

logger = logging.getLogger(__name__)


KNOWN_EVENT_TYPES = {
    4624: "logon",
    4625: "failed_logon",
    4634: "logoff",
    4648: "explicit_logon",
    4688: "process_creation",
    4689: "process_exit",
    4698: "scheduled_task_created",
    4720: "account_created",
    4722: "account_enabled",
    4726: "account_deleted",
    4732: "group_membership_change",
    # Sysmon
    1: "process_creation",
    3: "network_connection",
    11: "file_created",
    22: "dns_query",
}


def normalize_event(raw: dict) -> dict | None:
    """
    Normalize raw sensor payload to SentinelTwin event format.
    Returns None if event should be filtered.
    """
    try:
        event_id = int(raw.get("event_id", 0))
        event_type = raw.get("event_type") or KNOWN_EVENT_TYPES.get(event_id, "unknown")

        timestamp = raw.get("timestamp") or datetime.now(timezone.utc).isoformat()

        normalized = {
            "timestamp": timestamp,
            "hostname": (raw.get("hostname") or "Unknown")[:128],
            "username": (raw.get("username") or raw.get("user") or "Unknown")[:64],
            "source": raw.get("source", "Unknown"),
            "event_id": event_id,
            "event_type": event_type,
            "process_name": raw.get("process_name") or raw.get("image", ""),
            "file_path": raw.get("file_path") or raw.get("target_filename", ""),
            "source_ip": raw.get("source_ip") or raw.get("src_ip", ""),
            "destination_ip": raw.get("destination_ip") or raw.get("dest_ip", ""),
            "destination_port": raw.get("destination_port") or raw.get("dest_port"),
            "status": raw.get("status", ""),
        }

        return normalized
    except Exception as e:
        logger.warning(f"Event normalization error: {e} — raw: {raw}")
        return None


def ingest_event(raw: dict) -> dict | None:
    """
    Full ingestion pipeline:
    1. Normalize
    2. Associate with device
    3. Store
    4. Trigger analysis
    """
    normalized = normalize_event(raw)
    if not normalized:
        return None

    # Associate with device
    hostname = normalized["hostname"]
    source_ip = normalized["source_ip"]
    device_id = network_manager.associate_sensor(hostname, source_ip)

    if not device_id:
        # Device not in network yet — create minimal entry
        device_id = f"SENSOR-{hostname}"
        _ensure_sensor_device(device_id, hostname, source_ip)

    normalized["device_id"] = device_id

    # Store
    db_id = _store_event(normalized)
    normalized["_db_id"] = db_id

    # Async analysis (fire and forget per event for now)
    _trigger_analysis(normalized)

    logger.debug(f"Event ingested: {normalized['event_type']} from {hostname} (device={device_id})")
    return normalized


def _ensure_sensor_device(device_id: str, hostname: str, ip: str):
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        existing = conn.execute("SELECT id FROM devices WHERE id=?", (device_id,)).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO devices (id, hostname, ip_address, mac_address, vendor, device_type, "
                "os, status, sensor_connected, first_seen, last_seen, risk_score, risk_level) "
                "VALUES (?, ?, ?, 'Unknown', 'Unknown', 'Endpoint', 'Windows', 'Online', 1, ?, ?, 0, 'ADAPTIVE')",
                (device_id, hostname, ip or "", now, now)
            )
        else:
            conn.execute(
                "UPDATE devices SET sensor_connected=1, last_seen=? WHERE id=?",
                (now, device_id)
            )


def _store_event(event: dict) -> int:
    with get_conn() as conn:
        cursor = conn.execute(
            "INSERT INTO events (timestamp, device_id, hostname, username, source, event_id, "
            "event_type, process_name, file_path, source_ip, destination_ip, destination_port, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                event["timestamp"], event.get("device_id"), event["hostname"],
                event["username"], event["source"], event["event_id"],
                event["event_type"], event["process_name"], event["file_path"],
                event["source_ip"], event["destination_ip"], event["destination_port"],
                event["status"]
            )
        )
        return cursor.lastrowid


def _trigger_analysis(event: dict):
    """Run CyberDNA analysis and risk scoring on event."""
    try:
        from backend.services.cyberdna.engine import analyze_event
        from backend.services.risk.engine import calculate_device_risk, create_incident
        from backend.config import config

        mutations = analyze_event(event)
        if mutations:
            device_id = event.get("device_id")
            if device_id:
                risk = calculate_device_risk(device_id)
                if risk["score"] >= config.RISK_THRESHOLD_SUSPICIOUS:
                    create_incident(device_id, risk)

                # Trigger Cyber Twin simulation if thresholds met
                if (risk["score"] >= config.CYBER_TWIN_RISK_THRESHOLD and
                        risk["confidence"] >= config.CYBER_TWIN_CONFIDENCE_THRESHOLD):
                    logger.info(f"Cyber Twin TRIGGERED for {device_id} — risk={risk['score']}, conf={risk['confidence']}")
                    incident_id = create_incident(device_id, risk)
                    if incident_id:
                        from backend.services.cyber_twin.simulation import run_simulation
                        run_simulation(incident_id, device_id)
    except Exception as e:
        logger.error(f"Analysis pipeline error: {e}")


def get_events(limit: int = 100, device_id: str = None, event_type: str = None) -> list[dict]:
    with get_conn() as conn:
        q = "SELECT * FROM events WHERE 1=1"
        params = []
        if device_id:
            q += " AND device_id=?"
            params.append(device_id)
        if event_type:
            q += " AND event_type=?"
            params.append(event_type)
        q += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        return [dict(r) for r in conn.execute(q, params).fetchall()]
