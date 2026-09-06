"""
Event Processing Pipeline
Ingests, normalizes, stores, and routes events from Windows sensors.
"""
import json
import logging
from datetime import datetime, timezone

from backend.database.db import get_conn
from backend.services.network_discovery.manager import discovery_manager
from backend.services.cyberdna.engine import cyberdna_engine
from backend.services.mitre_mapping import MitreMapper
from backend.services.detection.signal_correlator import signal_correlator
from backend.services.risk.engine import risk_engine
from backend.services.evidence_graph import EvidenceGraphEngine
from backend.services.digital_twin.service import record_observed_connection, run_propagation_simulation

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
        timestamp = raw.get("event_timestamp") or raw.get("timestamp") or datetime.now(timezone.utc).isoformat()
        device_id = str(raw.get("device_id") or f"dev-{raw.get('computer', 'localhost').replace('.', '-')}")

        normalized = {
            "timestamp": timestamp,
            "device_id": device_id,
            "hostname": (raw.get("computer") or raw.get("hostname") or "Unknown")[:128],
            "username": (raw.get("user") or raw.get("username") or "SYSTEM")[:64],
            "user": (raw.get("user") or raw.get("username") or "SYSTEM")[:64],
            "source": raw.get("source", "Sysmon"),
            "channel": raw.get("channel", "Security"),
            "event_id": event_id,
            "record_id": int(raw.get("record_id", 0)),
            "event_type": event_type,
            "process_name": raw.get("process_name") or raw.get("image", ""),
            "parent_process": raw.get("parent_process", ""),
            "command_line": raw.get("command_line", ""),
            "file_path": raw.get("file_path") or raw.get("target_filename", ""),
            "source_ip": raw.get("source_ip") or raw.get("src_ip", ""),
            "destination_ip": raw.get("destination_ip") or raw.get("dest_ip", ""),
            "destination_port": raw.get("destination_port") or raw.get("dest_port"),
            "logon_type": raw.get("logon_type"),
            "status": raw.get("status", ""),
            "metadata": raw.get("metadata") or raw.get("details") or {}
        }

        return normalized
    except Exception as e:
        logger.warning(f"Event normalization error: {e} — raw: {raw}")
        return None


def ingest_event(raw: dict, db_path: str = None) -> dict:
    """
    Full SentinelTwin Phase 1 Ingestion Pipeline:
    1. Normalization & Validation
    2. Device inventory association & event-driven topology update
    3. CyberDNA evaluation (personal baseline + peer baseline + behavioral drift)
    4. MITRE ATT&CK mapping
    5. Multi-signal threat correlation
    6. Explainable point-based risk calculation
    7. LOW / MEDIUM / HIGH Triage Gate
    8. Storage & Alert generation (with Evidence Graph)
    9. (If HIGH) Automatic Digital Twin attack-propagation simulation
    """
    normalized = normalize_event(raw)
    if not normalized:
        raise ValueError("Invalid event payload")

    device_id = normalized["device_id"]
    hostname = normalized["hostname"]
    source_ip = normalized["source_ip"]
    now = datetime.now(timezone.utc).isoformat()

    # 1. Ensure Device Record
    _ensure_sensor_device(device_id, hostname, source_ip, db_path)

    # 2. Event-driven Digital Twin updates on network connections / logons
    dest_ip = normalized.get("destination_ip")
    if dest_ip and dest_ip not in ("127.0.0.1", "0.0.0.0", ""):
        target_dev_id = f"dev-{dest_ip.replace('.', '-')}"
        _ensure_sensor_device(target_dev_id, dest_ip, dest_ip, db_path)
        record_observed_connection(
            source_device=device_id,
            target_device=target_dev_id,
            protocol="TCP",
            port=normalized.get("destination_port"),
            db_path=db_path
        )

    # 3. CyberDNA Engine Evaluation
    metric_key = f"evt_{normalized['event_id']}_freq"
    cdna_res = cyberdna_engine.evaluate_and_update(
        metric_key=metric_key,
        entity_id=device_id,
        observation=1.0,
        gate_anomalies=True,
        db_path=db_path,
        peer_group="workstations"
    )

    # 4. MITRE ATT&CK Mapping
    mitre_match = MitreMapper.evaluate(normalized)

    # 5. Signal Correlation
    sig_type = "suspicious_process" if normalized.get("process_name") and mitre_match else normalized["event_type"]
    correlation_res = signal_correlator.record_signal(
        entity_id=device_id,
        signal_type=sig_type,
        event=normalized,
        cyberdna_result=cdna_res,
        mitre_match=mitre_match
    )

    # 6. Risk Engine & Triage Gate
    risk_res = risk_engine.calculate_risk(
        event=normalized,
        cyberdna_result=cdna_res,
        correlation_result=correlation_res,
        mitre_result=mitre_match
    )
    risk_score = risk_res["risk_score"]

    # 7. Store Event Record (Idempotent)
    event_db_id = _store_event(normalized, risk_score, db_path)

    # 8. Alert & Digital Twin Attack Propagation
    alert_info = None
    propagation_sim = None

    # Alert threshold: Medium (>=30) or High (>=70)
    if risk_score >= 30 or risk_res["triage_level"] in ("MEDIUM", "HIGH"):
        alert_id = f"alt-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        t_name = mitre_match["technique_name"] if mitre_match else normalized["event_type"]
        alert_title = f"{risk_res['severity']} Risk: {t_name}"
        desc = mitre_match.get("reason") if mitre_match else f"Event triggered {risk_score} risk points ({risk_res['triage_level']} triage)."

        # Evidence Graph DAG
        mutations = []
        if cdna_res.get("is_anomaly"):
            mutations.append(f"Personal Baseline Outlier ({cdna_res.get('z_score')} sigma)")
        if cdna_res.get("peer_outlier"):
            mutations.append(f"Cohort Outlier ({cdna_res.get('peer_z_score')} sigma from peer group)")
        if cdna_res.get("drift_detected"):
            mutations.append(f"Behavioral Drift ({cdna_res.get('drift_score')} score)")

        evidence_graph = EvidenceGraphEngine.generate_graph(
            alert_id=alert_id,
            alert_title=alert_title,
            risk_score=risk_score,
            device_id=device_id,
            user_id=normalized.get("user", "SYSTEM"),
            contributing_events=[{
                "id": str(event_db_id),
                "event_type": str(normalized.get("event_id")),
                "source": normalized.get("source"),
                "timestamp": normalized.get("timestamp"),
                "details": normalized
            }],
            behavioral_mutations=mutations,
            mitre_data=mitre_match
        )

        with get_conn(db_path) as conn:
            conn.execute("""
                INSERT INTO alerts (
                    id, device_id, title, severity, category, status, description,
                    created_at, timestamp, risk_points, mitre_technique_id,
                    mitre_technique_name, mitre_tactic, evidence_graph
                ) VALUES (?, ?, ?, ?, 'Risk Threshold Exceeded', 'Open', ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert_id, device_id, alert_title, risk_res["severity"], desc,
                now, now, risk_score,
                mitre_match["technique_id"] if mitre_match else "",
                mitre_match["technique_name"] if mitre_match else "",
                mitre_match["tactic"] if mitre_match else "",
                json.dumps(evidence_graph)
            ))

        alert_info = {
            "id": alert_id,
            "title": alert_title,
            "severity": risk_res["severity"],
            "triage_level": risk_res["triage_level"],
            "evidence_graph": evidence_graph
        }

        # 9. HIGH Risk Trigger: Run Digital Twin Attack Propagation Simulation
        if risk_res["trigger_propagation_analysis"]:
            logger.info(f"[Digital Twin] HIGH Risk Gate triggered for device {device_id} (Score: {risk_score})")
            propagation_sim = run_propagation_simulation(
                source_device_id=device_id,
                source_risk=risk_score,
                incident_id=int(time.time()),
                db_path=db_path
            )

    return {
        "status": "success",
        "event_id": normalized.get("event_id"),
        "record_id": normalized.get("record_id"),
        "device_id": device_id,
        "cyberdna": cdna_res,
        "mitre": mitre_match,
        "correlation": correlation_res,
        "risk": risk_res,
        "alert": alert_info,
        "propagation_simulation": propagation_sim
    }


def _ensure_sensor_device(device_id: str, hostname: str, ip: str, db_path: str = None):
    now = datetime.now(timezone.utc).isoformat()
    with get_conn(db_path) as conn:
        conn.execute("""
            INSERT INTO devices (id, hostname, ip_address, mac_address, vendor, device_type,
                                os, status, sensor_connected, first_seen, last_seen, risk_score, risk_level)
            VALUES (?, ?, ?, 'Unknown', 'Unknown', 'Workstation', 'Windows', 'Online', 1, ?, ?, 0.0, 'ADAPTIVE')
            ON CONFLICT(id) DO UPDATE SET
                last_seen = excluded.last_seen,
                sensor_connected = 1
        """, (device_id, hostname or "Unknown Host", ip or f"192.168.1.{abs(hash(device_id)) % 250 + 2}", now, now))


def _store_event(event: dict, risk_score: float, db_path: str = None) -> int:
    now = datetime.now(timezone.utc).isoformat()
    with get_conn(db_path) as conn:
        cur = conn.cursor()
        meta = event.get("metadata", {})
        meta_str = json.dumps(meta) if isinstance(meta, dict) else str(meta)

        cur.execute("""
            INSERT INTO events (
                device_id, channel, event_id, record_id, event_timestamp,
                ingested_at, user, process_name, parent_process, command_line,
                source_ip, destination_ip, destination_port, logon_type,
                risk_score, details, metadata, event_type, source, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event["device_id"], event.get("channel", "Security"), event.get("event_id", 0),
            event.get("record_id", 0), event.get("timestamp", now), now,
            event.get("user"), event.get("process_name"), event.get("parent_process"),
            event.get("command_line"), event.get("source_ip"), event.get("destination_ip"),
            event.get("destination_port"), event.get("logon_type"),
            risk_score, meta_str, meta_str, event.get("event_type"),
            event.get("source", "Sysmon"), event.get("status", "")
        ))
        return cur.lastrowid


def get_events(limit: int = 100, device_id: str = None, event_type: str = None, db_path: str = None) -> list[dict]:
    with get_conn(db_path) as conn:
        q = "SELECT * FROM events WHERE 1=1"
        params = []
        if device_id:
            q += " AND device_id=?"
            params.append(device_id)
        if event_type:
            q += " AND event_type=?"
            params.append(event_type)
        q += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
        return [dict(r) for r in conn.execute(q, params).fetchall()]

