"""
REST API Blueprint for SentinelTwin Security Platform
Provides network discovery, device inventory, alerts, incidents,
CyberDNA behavioral analytics, Digital Twin topology, attack propagation, and event ingestion.
"""
import os
import json
import logging
import socket
import time
import traceback
import psutil
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import check_password_hash

from backend.config import config
from backend.database.db import get_conn
from backend.api.auth import generate_jwt, require_auth, require_sensor_or_admin
from backend.services.network_discovery.manager import discovery_manager
from backend.services.cyberdna.engine import cyberdna_engine
from backend.services.risk.engine import risk_engine
from backend.services.risk.scorer import calculate_risk_summary, get_device_risk_list
from backend.services.digital_twin.service import (
    get_topology_graph,
    analyze_potential_propagation,
    run_propagation_simulation
)
from backend.services.event_processing.processor import (
    ingest_event as process_ingest_event,
    get_events as get_pipeline_events
)
from backend.services.mitre_mapping import MitreMapper
from backend.services.evidence_graph import EvidenceGraphEngine

logger = logging.getLogger(__name__)

api_bp = Blueprint("api", __name__)


def _get_target_db():
    return current_app.config.get("DB_PATH", None)


# ==========================================================
# 1. AUTHENTICATION
# ==========================================================

@api_bp.route("/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    with get_conn(_get_target_db()) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, username, password_hash, role FROM users WHERE username = ?", (username,))
        user = cur.fetchone()

        if user and check_password_hash(user["password_hash"], password):
            token = generate_jwt(user["id"], user["username"], user["role"])
            return jsonify({
                "token": token,
                "role": user["role"],
                "username": user["username"]
            }), 200

    return jsonify({"error": "Invalid username or password."}), 401


# ==========================================================
# 2. SYSTEM STATUS & ADAPTER INTERFACES
# ==========================================================

@api_bp.route("/system/status", methods=["GET"])
def get_system_status():
    """Returns general platform health and CPU/memory statistics."""
    try:
        cpu_usage = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        return jsonify({
            "status": "online",
            "service": "SentinelTwin Backend",
            "cpu_usage_percent": cpu_usage,
            "memory_usage_percent": mem.percent,
            "memory_free_gb": round(mem.available / (1024 ** 3), 2),
            "sensor_connected": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
    except Exception as e:
        return jsonify({"status": "online", "error": str(e)}), 200


@api_bp.route("/network/interfaces", methods=["GET"])
def get_network_interfaces():
    """Returns active network adapters with IP, subnet mask, and host counts."""
    interfaces = []
    seen = set()
    try:
        addrs = psutil.net_if_addrs()
        for iface_name, addr_list in addrs.items():
            for addr in addr_list:
                if addr.family == socket.AF_INET:
                    if iface_name not in seen:
                        seen.add(iface_name)
                        interfaces.append({
                            "name": iface_name,
                            "ip": addr.address,
                            "netmask": addr.netmask or "255.255.255.0",
                            "family": "AF_INET"
                        })
    except Exception:
        interfaces = [{"name": "Ethernet0", "ip": "192.168.1.100", "netmask": "255.255.255.0", "family": "AF_INET"}]

    return jsonify(interfaces), 200


# ==========================================================
# 3. NETWORK DISCOVERY & DEVICE INVENTORY
# ==========================================================

@api_bp.route("/network/discover", methods=["POST", "OPTIONS"])
def trigger_network_discover():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True) or {}
    interface_ip = data.get("interface_ip")
    subnet = data.get("subnet")

    try:
        devices = []
        try:
            devices = discovery_manager.scan_network(interface_ip=interface_ip, subnet=subnet)
        except Exception:
            try:
                devices = discovery_manager.get_arp_table_devices()
            except Exception:
                devices = []

        now = datetime.now(timezone.utc).isoformat()
        with get_conn(_get_target_db()) as conn:
            cur = conn.cursor()
            for d in devices:
                ip_addr = str(d.get("ip_address", "")).strip()
                if not ip_addr:
                    continue

                dev_id = str(d.get("id") or f"dev-{ip_addr.replace('.', '-')}")
                cur.execute("""
                    INSERT INTO devices (
                        id, ip_address, mac_address, hostname, vendor,
                        device_type, os, status, first_seen, last_seen, criticality
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Online', ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        last_seen = excluded.last_seen,
                        status = 'Online'
                """, (
                    dev_id, ip_addr, d.get("mac_address", "00:00:00:00:00:00"),
                    d.get("hostname", "Discovered Host"), d.get("vendor", "Connected Endpoint"),
                    d.get("device_type", "Workstation"), d.get("os", "Generic OS"),
                    now, now, int(d.get("criticality", 1))
                ))

            cur.execute("SELECT * FROM devices ORDER BY last_seen DESC")
            all_devices = [dict(r) for r in cur.fetchall()]

        return jsonify({"discovered": len(devices), "devices": all_devices}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e), "devices": []}), 500


@api_bp.route("/devices", methods=["GET"])
@api_bp.route("/network/devices", methods=["GET"])
def get_devices():
    """Returns all discovered network devices."""
    try:
        with get_conn(_get_target_db()) as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM devices ORDER BY last_seen DESC")
            rows = [dict(row) for row in cur.fetchall()]
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/devices/<device_id>", methods=["GET", "DELETE"])
def handle_single_device(device_id):
    """Retrieves or removes an individual device record."""
    try:
        with get_conn(_get_target_db()) as conn:
            cur = conn.cursor()
            if request.method == "DELETE":
                cur.execute("DELETE FROM devices WHERE id = ?", (device_id,))
                return jsonify({"status": "deleted", "id": device_id}), 200

            cur.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Device not found"}), 404
            return jsonify(dict(row)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/network/clear", methods=["POST"])
@api_bp.route("/network/devices/clear", methods=["POST"])
def clear_devices():
    """Purges all devices from the database cache."""
    try:
        with get_conn(_get_target_db()) as conn:
            conn.execute("DELETE FROM devices")
        return jsonify({"status": "cleared"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# 4. EVENT INGESTION PIPELINE (CYBERDNA -> CORRELATION -> RISK -> TWIN)
# ==========================================================

@api_bp.route("/events/ingest", methods=["POST", "OPTIONS"])
@api_bp.route("/events", methods=["POST", "OPTIONS"])
def ingest_event_route():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True) or {}

    # Strict sensor payload validation (when sensor fields or events/ingest is called)
    required = ["event_id", "record_id", "channel", "device_id", "event_timestamp"]
    if any(k in data for k in ("record_id", "channel")) or request.path.endswith("/ingest"):
        for field in required:
            if field not in data or data[field] is None:
                return jsonify({"error": f"Missing required field: {field}"}), 400

    try:
        if "event_id" in data:
            int(data["event_id"])
        if "record_id" in data:
            int(data["record_id"])
    except (ValueError, TypeError):
        return jsonify({"error": "Fields 'event_id' and 'record_id' must be valid integers."}), 400

    db_path = _get_target_db()

    # Idempotent deduplication check for exact (device_id, channel, record_id)
    if data.get("record_id") and data.get("device_id") and data.get("channel"):
        with get_conn(db_path) as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT id FROM events 
                WHERE device_id = ? AND channel = ? AND record_id = ?
            """, (str(data["device_id"]), str(data["channel"]), int(data["record_id"])))
            if cur.fetchone():
                return jsonify({"status": "duplicate_ignored", "message": "Event already ingested"}), 409

    try:
        result = process_ingest_event(data, db_path=db_path)
        return jsonify(result), 201
    except Exception as e:
        logger.error(f"Event ingestion pipeline failed: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@api_bp.route("/events", methods=["GET"])
def get_events():
    limit = min(int(request.args.get("limit", 50)), 200)
    device_id = request.args.get("device_id")
    event_type = request.args.get("event_type")
    rows = get_pipeline_events(limit=limit, device_id=device_id, event_type=event_type, db_path=_get_target_db())
    return jsonify(rows), 200


# ==========================================================
# 5. CYBERDNA BEHAVIORAL PROFILES & SIMULATION
# ==========================================================

@api_bp.route("/cyberdna/profile/<entity_id>", methods=["GET"])
def get_cyberdna_profile(entity_id):
    """Returns the CyberDNA behavioral baseline profile and peer comparisons."""
    profile = cyberdna_engine.get_profile(entity_id, db_path=_get_target_db())
    return jsonify(profile), 200


@api_bp.route("/cyberdna/users", methods=["GET"])
@api_bp.route("/cyberdna/entities", methods=["GET"])
def get_cyberdna_entities():
    """Returns all entities with behavioral CyberDNA baselines."""
    entities = cyberdna_engine.get_all_entities(db_path=_get_target_db())
    return jsonify(entities), 200


@api_bp.route("/cyberdna/simulate", methods=["POST", "OPTIONS"])
def simulate_cyberdna():
    """Direct testing and evaluation of CyberDNA statistical anomalies."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True) or {}
    metric_key = data.get("metric_key", "evt_4688_freq")
    entity_id = data.get("device_id") or data.get("entity_id", "dev-corp-workstation-01")
    observation = float(data.get("observation", 1.0))
    gate = bool(data.get("gate_anomalies", True))

    res = cyberdna_engine.evaluate_and_update(
        metric_key=metric_key,
        entity_id=entity_id,
        observation=observation,
        gate_anomalies=gate,
        db_path=_get_target_db()
    )
    return jsonify(res), 200


# ==========================================================
# 6. DIGITAL TWIN TOPOLOGY & ATTACK PROPAGATION
# ==========================================================

@api_bp.route("/network/topology", methods=["GET"])
@api_bp.route("/cyber_twin/topology", methods=["GET"])
def get_topology():
    """Returns the NetworkX Digital Twin topology graph (nodes and edges)."""
    return jsonify(get_topology_graph(_get_target_db())), 200


@api_bp.route("/simulation/run", methods=["POST", "OPTIONS"])
@api_bp.route("/cyber_twin/propagate", methods=["POST", "OPTIONS"])
def simulate_propagation():
    """Executes multi-hop attack propagation simulation from a compromised entity."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True) or {}
    source_id = data.get("source_node_id") or data.get("source_device") or data.get("source_device_id")
    risk = data.get("source_risk", 70)

    if not source_id or not isinstance(source_id, str):
        return jsonify({"error": "Valid 'source_node_id' or 'source_device' string is required."}), 400

    try:
        risk_val = int(risk)
        if not (0 <= risk_val <= 100):
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Field 'source_risk' must be an integer between 0 and 100."}), 400

    db_path = _get_target_db()
    sim_result = run_propagation_simulation(source_device_id=source_id, source_risk=risk_val, db_path=db_path)
    sim_result["potential_propagation_paths"] = sim_result.get("opportunities", [])
    return jsonify(sim_result), 200


# ==========================================================
# 7. ALERTS, INCIDENTS & EVIDENCE RETRIEVAL
# ==========================================================

@api_bp.route("/alerts", methods=["GET", "POST"])
@api_bp.route("/incidents", methods=["GET", "PATCH"])
def handle_alerts():
    """Handles alert retrieval, manual creation, or incident status changes."""
    try:
        with get_conn(_get_target_db()) as conn:
            cur = conn.cursor()

            if request.method == "PATCH":
                data = request.get_json(silent=True) or {}
                incident_id = data.get("id")
                new_status = data.get("status", "Resolved")
                if incident_id:
                    cur.execute("UPDATE alerts SET status = ? WHERE id = ?", (new_status, incident_id))
                return jsonify({"status": "updated"}), 200

            if request.method == "POST":
                data = request.get_json(silent=True) or {}
                alert_id = data.get("id") or f"alt-{int(datetime.now(timezone.utc).timestamp())}"
                device_id = data.get("device_id", "local-host")
                title = data.get("title", "Security Threat Detected")
                severity = data.get("severity", "HIGH")
                status = data.get("status", "Open")
                description = data.get("description", "")
                created_at = data.get("created_at", datetime.now(timezone.utc).isoformat())
                risk_pts = int(data.get("risk_points", 50))

                cur.execute("""
                    INSERT INTO alerts (id, device_id, title, severity, status, description, created_at, timestamp, risk_points)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (alert_id, device_id, title, severity, status, description, created_at, created_at, risk_pts))
                return jsonify({"status": "created", "id": alert_id}), 201

            cur.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT 100")
            rows = [dict(row) for row in cur.fetchall()]
            for r in rows:
                if isinstance(r.get("evidence_graph"), str) and r["evidence_graph"]:
                    try:
                        r["evidence_graph"] = json.loads(r["evidence_graph"])
                    except Exception:
                        pass
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/alerts/<alert_id>/evidence", methods=["GET"])
def get_alert_evidence(alert_id):
    """Retrieves the deterministic Evidence Graph for an alert."""
    try:
        with get_conn(_get_target_db()) as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Alert not found"}), 404

            alert = dict(row)
            graph_data = alert.get("evidence_graph")
            if isinstance(graph_data, str) and graph_data:
                try:
                    graph_data = json.loads(graph_data)
                except Exception:
                    graph_data = {}

            return jsonify({
                "alert_id": alert["id"],
                "title": alert.get("title") or alert.get("description"),
                "severity": alert["severity"],
                "mitre": {
                    "id": alert.get("mitre_technique_id"),
                    "name": alert.get("mitre_technique_name"),
                    "tactic": alert.get("mitre_tactic")
                },
                "graph": graph_data
            }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# 8. DASHBOARD SUMMARY & RISK POSTURE
# ==========================================================

@api_bp.route("/dashboard/summary", methods=["GET"])
def get_dashboard_summary():
    """Provides high-level dashboard aggregate metrics."""
    with get_conn(_get_target_db()) as conn:
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) as count FROM devices")
        total_devices = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) as count FROM events")
        total_events = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) as count FROM alerts WHERE status != 'Resolved'")
        active_alerts = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) as count FROM alerts WHERE severity IN ('Critical', 'CRITICAL') AND status != 'Resolved'")
        critical_incidents = cur.fetchone()["count"]

        cur.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT 5")
        recent_alerts = [dict(row) for row in cur.fetchall()]

        cur.execute("SELECT * FROM events ORDER BY id DESC LIMIT 5")
        recent_events = [dict(row) for row in cur.fetchall()]

    return jsonify({
        "total_devices": total_devices,
        "total_events": total_events,
        "active_alerts": active_alerts,
        "critical_incidents": critical_incidents,
        "recent_alerts": recent_alerts,
        "recent_events": recent_events,
        "system_health": "Healthy" if active_alerts < 10 else "Degraded"
    }), 200


@api_bp.route("/risk/summary", methods=["GET"])
def get_risk_summary():
    """Aggregates platform risk metrics."""
    try:
        with get_conn(_get_target_db()) as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) as total, AVG(risk_score) as avg_risk FROM events")
            ev_row = cur.fetchone()

            cur.execute("SELECT COUNT(*) as alert_count FROM alerts WHERE status != 'Resolved'")
            al_row = cur.fetchone()

            cur.execute("SELECT COUNT(*) as total_devs FROM devices")
            dev_row = cur.fetchone()

        total_events = ev_row["total"] if ev_row else 0
        avg_score = round(ev_row["avg_risk"] or 0.0, 1) if ev_row else 0.0
        active_alerts = al_row["alert_count"] if al_row else 0
        total_devices = dev_row["total_devs"] if dev_row else 0

        return jsonify({
            "overall_threat_level": "Elevated" if active_alerts > 0 else "Nominal",
            "average_risk_score": avg_score,
            "active_alerts_count": active_alerts,
            "monitored_devices_count": total_devices,
            "total_events_processed": total_events
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/risk/devices", methods=["GET"])
def get_device_risk_breakdown():
    """Returns risk assessment breakdown per device."""
    try:
        with get_conn(_get_target_db()) as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    d.id, d.hostname, d.ip_address, d.device_type, d.criticality,
                    COALESCE(MAX(e.risk_score), 0) as peak_risk,
                    COALESCE(COUNT(a.id), 0) as alert_count
                FROM devices d
                LEFT JOIN events e ON d.id = e.device_id
                LEFT JOIN alerts a ON d.id = a.device_id
                GROUP BY d.id
                ORDER BY peak_risk DESC
            """)
            rows = [dict(row) for row in cur.fetchall()]
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500