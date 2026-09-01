"""
API Routes Blueprint for SentinelTwin Security Platform
Provides network discovery, device inventory, alerts, incidents, 
MITRE ATT&CK mapping, and deterministic evidence graph endpoints.
"""
import os
import json
import logging
import socket
import traceback
import psutil
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify

from backend.database.db import get_conn
from backend.services.network_discovery.manager import discovery_manager
from backend.services.mitre_mapping import MitreMapper
from backend.services.evidence_graph import EvidenceGraphEngine

logger = logging.getLogger(__name__)

api_bp = Blueprint("api", __name__)


# ==========================================================
# 1. SYSTEM STATUS & ADAPTER INTERFACES
# ==========================================================

@api_bp.route("/system/status", methods=["GET"])
def get_system_status():
    """Returns general platform health and CPU/memory statistics."""
    try:
        cpu_usage = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        return jsonify({
            "status": "online",
            "cpu_usage_percent": cpu_usage,
            "memory_usage_percent": mem.percent,
            "memory_free_gb": round(mem.available / (1024 ** 3), 2),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
    except Exception as e:
        return jsonify({"status": "online", "error": str(e)}), 200


@api_bp.route("/network/interfaces", methods=["GET"])
def get_network_interfaces():
    """Returns active network adapters with IP, subnet mask, and host counts."""
    interfaces = []
    try:
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()

        for name, addr_list in addrs.items():
            ipv4_info = next((a for a in addr_list if a.family == socket.AF_INET), None)
            if not ipv4_info:
                continue

            ip = ipv4_info.address
            netmask = ipv4_info.netmask or "255.255.255.0"
            is_up = stats[name].isup if name in stats else True

            # Calculate detected hosts for this interface from DB
            prefix = ".".join(ip.split(".")[:3])
            host_count = 0
            try:
                with get_conn() as conn:
                    cur = conn.cursor()
                    cur.execute("SELECT COUNT(*) as count FROM devices WHERE ip_address LIKE ?", (f"{prefix}.%",))
                    row = cur.fetchone()
                    host_count = row[0] if isinstance(row, (tuple, list)) else (row["count"] if row else 0)
            except Exception:
                pass

            interfaces.append({
                "name": name,
                "ip": ip,
                "subnet": netmask,
                "gateway": "-",
                "active": is_up,
                "hosts": host_count
            })

        return jsonify(interfaces), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# 2. NETWORK DISCOVERY & DEVICE MANAGEMENT
# ==========================================================

@api_bp.route("/network/discover", methods=["POST"])
def discover_network():
    """Triggers an active network sweep with safe fallback and updates the database."""
    try:
        data = request.get_json(silent=True) or {}
        interface_ip = data.get("interface_ip")
        subnet = data.get("subnet")

        devices = []
        try:
            devices = discovery_manager.scan_network(interface_ip=interface_ip, subnet=subnet)
        except Exception as scan_err:
            logger.warning(f"Active scan encountered an issue, falling back to ARP table: {scan_err}")
            try:
                devices = discovery_manager.get_arp_table_devices()
            except Exception:
                devices = []

        now = datetime.now(timezone.utc).isoformat()

        with get_conn() as conn:
            cur = conn.cursor()
            for d in devices:
                ip_addr = str(d.get("ip_address", "")).strip()
                if not ip_addr:
                    continue

                dev_id = str(d.get("id") or f"dev-{ip_addr.replace('.', '-')}")
                mac_addr = str(d.get("mac_address", ""))
                hostname = str(d.get("hostname", "Laptop / PC"))
                vendor = str(d.get("vendor", "Connected Endpoint"))
                device_type = str(d.get("device_type", "Laptop / PC"))
                os_str = str(d.get("os", "Network OS"))
                status = str(d.get("status", "Online"))
                first_seen = str(d.get("first_seen", now))
                last_seen = str(d.get("last_seen", now))
                criticality = int(d.get("criticality", 2))

                cur.execute("SELECT id FROM devices WHERE id = ? OR ip_address = ?", (dev_id, ip_addr))
                row = cur.fetchone()

                if row:
                    matched_id = row[0] if isinstance(row, (tuple, list)) else row["id"]
                    cur.execute("""
                        UPDATE devices 
                        SET hostname = ?, vendor = ?, device_type = ?, os = ?, status = ?, last_seen = ?, criticality = ?
                        WHERE id = ?
                    """, (hostname, vendor, device_type, os_str, status, last_seen, criticality, matched_id))
                else:
                    cur.execute("""
                        INSERT INTO devices (
                            id, ip_address, mac_address, hostname, vendor, 
                            device_type, os, status, first_seen, last_seen, criticality
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        dev_id, ip_addr, mac_addr, hostname, vendor,
                        device_type, os_str, status, first_seen, last_seen, criticality
                    ))

            # Retrieve updated list of devices
            cur.execute("SELECT * FROM devices ORDER BY last_seen DESC")
            all_devices = [dict(r) for r in cur.fetchall()]

        return jsonify({"discovered": len(devices), "devices": all_devices}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e), "devices": []}), 200


@api_bp.route("/devices", methods=["GET"])
@api_bp.route("/network/devices", methods=["GET"])
def get_devices():
    """Returns all discovered network devices."""
    try:
        with get_conn() as conn:
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
        with get_conn() as conn:
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
def clear_devices():
    """Purges all devices from the database cache."""
    try:
        with get_conn() as conn:
            conn.execute("DELETE FROM devices")
        return jsonify({"status": "cleared"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# 3. ALERTS, INCIDENTS & EVIDENCE RETRIEVAL
# ==========================================================

@api_bp.route("/alerts", methods=["GET", "POST"])
@api_bp.route("/incidents", methods=["GET", "PATCH"])
def handle_alerts():
    """Handles alert retrieval, manual creation, or incident status changes."""
    try:
        with get_conn() as conn:
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
                status = data.get("status", "Active")
                description = data.get("description", "")
                created_at = data.get("created_at", datetime.now(timezone.utc).isoformat())

                cur.execute("""
                    INSERT INTO alerts (id, device_id, title, severity, status, description, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (alert_id, device_id, title, severity, status, description, created_at))
                return jsonify({"status": "created", "id": alert_id}), 201

            cur.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100")
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
        with get_conn() as conn:
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
                "title": alert["title"],
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
# 4. EVENT INGESTION PIPELINE (CYBER DNA -> MITRE -> GRAPH)
# ==========================================================

@api_bp.route("/events/ingest", methods=["POST"])
@api_bp.route("/events", methods=["POST"])
def ingest_event():
    """
    Core Pipeline Ingestion:
    Event -> Cyber DNA -> Risk Intelligence -> MITRE ATT&CK -> Evidence Graph -> Alert
    """
    try:
        event = request.get_json(silent=True) or {}
        now_iso = datetime.now(timezone.utc).isoformat()

        event_id = event.get("id") or f"evt-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        device_id = event.get("device_id", "10.107.4.78")
        event_type = event.get("event_type") or str(event.get("event_id", "AUDIT"))
        source = event.get("source", "Sysmon")
        risk_score = float(event.get("risk_score", 0.0))
        details = event.get("details", {})
        user_id = event.get("user") or (details.get("user") if isinstance(details, dict) else "SYSTEM")
        timestamp = event.get("event_timestamp") or event.get("timestamp") or now_iso

        # 1. Cyber DNA Baseline Heuristic Evaluation
        behavioral_mutations = []
        hour = datetime.now().hour
        if hour < 6 or hour > 21:
            behavioral_mutations.append("Off-Hours Activity Deviation")
        if risk_score > 50:
            behavioral_mutations.append("High Process Velocity Deviation")

        # 2. MITRE ATT&CK Mapping Layer
        mitre_match = MitreMapper.evaluate(event, behavioral_mutations)
        if mitre_match:
            # Elevate risk deterministically when matched against known endpoint pattern
            risk_score = min(100.0, max(risk_score, 75.0))

        # 3. Store Event Record
        details_json = json.dumps(details) if isinstance(details, dict) else str(details)
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO events (id, device_id, event_type, source, risk_score, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (event_id, device_id, event_type, source, risk_score, details_json, timestamp))

            # 4. Generate High-Risk Alert & Explainable Evidence Graph (Threshold >= 65)
            if risk_score >= 65.0:
                alert_id = f"alt-{int(datetime.now(timezone.utc).timestamp())}"
                t_name = mitre_match["technique_name"] if mitre_match else event_type
                alert_title = f"High Risk: {t_name}"
                severity = "CRITICAL" if risk_score >= 85 else "HIGH"
                desc = mitre_match.get("reason", "Suspicious behavioral anomaly exceeded risk threshold.") if mitre_match else "Risk threshold triggered."

                evidence_graph = EvidenceGraphEngine.generate_graph(
                    alert_id=alert_id,
                    alert_title=alert_title,
                    risk_score=risk_score,
                    device_id=device_id,
                    user_id=user_id,
                    contributing_events=[{
                        "id": event_id,
                        "event_type": event_type,
                        "source": source,
                        "timestamp": timestamp,
                        "details": details
                    }],
                    behavioral_mutations=behavioral_mutations,
                    mitre_data=mitre_match
                )

                cur.execute("""
                    INSERT INTO alerts (
                        id, device_id, title, severity, status, description, created_at,
                        mitre_technique_id, mitre_technique_name, mitre_tactic, evidence_graph
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert_id, device_id, alert_title, severity, "Active", desc, now_iso,
                    mitre_match["technique_id"] if mitre_match else "",
                    mitre_match["technique_name"] if mitre_match else "",
                    mitre_match["tactic"] if mitre_match else "",
                    json.dumps(evidence_graph)
                ))

        return jsonify({"status": "received", "id": event_id, "risk_score": risk_score, "mitre": mitre_match}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ==========================================================
# 5. RISK SUMMARY & DEVICE BREAKDOWN
# ==========================================================

@api_bp.route("/risk/summary", methods=["GET"])
def get_risk_summary():
    """Aggregates platform metrics for the top overview dashboard."""
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) as total, AVG(risk_score) as avg_risk FROM events")
            ev_row = cur.fetchone()

            cur.execute("SELECT COUNT(*) as alert_count FROM alerts WHERE status != 'Resolved'")
            al_row = cur.fetchone()

            cur.execute("SELECT COUNT(*) as total_devs FROM devices")
            dev_row = cur.fetchone()

        total_events = ev_row[0] if isinstance(ev_row, (tuple, list)) else (ev_row["total"] if ev_row else 0)
        avg_score_raw = ev_row[1] if isinstance(ev_row, (tuple, list)) else (ev_row["avg_risk"] if ev_row else 0.0)
        avg_score = round(avg_score_raw or 0.0, 1)

        active_alerts = al_row[0] if isinstance(al_row, (tuple, list)) else (al_row["alert_count"] if al_row else 0)
        total_devices = dev_row[0] if isinstance(dev_row, (tuple, list)) else (dev_row["total_devs"] if dev_row else 0)

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
        with get_conn() as conn:
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