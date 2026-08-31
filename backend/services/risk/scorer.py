"""
Risk Intelligence & Scoring Module
Computes device posture, security risk vectors, and network-wide threat scoring.
"""
import logging
from datetime import datetime, timezone
from backend.database.db import get_conn

logger = logging.getLogger(__name__)

# Severity multipliers for risk calculation
SEVERITY_WEIGHTS = {
    "INFORMATIONAL": 2.0,
    "LOW": 5.0,
    "MEDIUM": 15.0,
    "HIGH": 30.0,
    "CRITICAL": 50.0
}


def calculate_device_risk(device_id: str) -> tuple[float, str]:
    """
    Computes an explainable risk score (0-100) and risk level for an individual endpoint.
    Factors:
      - Active unresolved alerts & severities
      - Endpoint telemetry sensor presence
      - Device type & critical asset exposure
      - Behavioral mutations
    """
    try:
        with get_conn() as conn:
            dev_row = conn.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
            if not dev_row:
                return 0.0, "ADAPTIVE"

            dev = dict(dev_row)
            base_risk = 0.0

            # Factor 1: Lack of Endpoint Sensor Coverage (+10 risk)
            if not dev.get("sensor_connected"):
                base_risk += 10.0

            # Factor 2: Critical Asset Posture
            dev_type = dev.get("device_type", "Unknown")
            if dev_type in ("Router", "Gateway", "Server"):
                base_risk += 5.0

            # Factor 3: Active Alerts & Threats
            alerts = conn.execute(
                "SELECT severity, COUNT(*) as count FROM alerts WHERE device_id = ? AND status = 'OPEN' GROUP BY severity",
                (device_id,)
            ).fetchall()

            for a in alerts:
                sev = a["severity"].upper() if a["severity"] else "LOW"
                weight = SEVERITY_WEIGHTS.get(sev, 5.0)
                base_risk += weight * a["count"]

            # Factor 4: Behavioral Mutations / Anomalies
            try:
                mutations_count = conn.execute(
                    "SELECT COUNT(*) as count FROM behavioral_mutations WHERE device_id = ?",
                    (device_id,)
                ).fetchone()["count"]
                base_risk += min(mutations_count * 10.0, 30.0)
            except Exception:
                pass

            # Cap risk score between 0.0 and 100.0
            final_score = min(max(base_risk, 0.0), 100.0)

            # Assign categorical risk levels
            if final_score >= 80.0:
                level = "HOSTILE"
            elif final_score >= 50.0:
                level = "HIGH RISK"
            elif final_score >= 25.0:
                level = "SUSPICIOUS"
            else:
                level = "ADAPTIVE"

            # Update cached score in devices table
            conn.execute(
                "UPDATE devices SET risk_score = ?, risk_level = ? WHERE id = ?",
                (round(final_score, 1), level, device_id)
            )

            return round(final_score, 1), level

    except Exception as e:
        logger.error(f"Error calculating risk for device {device_id}: {e}")
        return 0.0, "ADAPTIVE"


def recalculate_all_device_risks():
    """Recalculates risk scores for every discovered device in the network."""
    try:
        with get_conn() as conn:
            devices = conn.execute("SELECT id FROM devices").fetchall()
            for row in devices:
                calculate_device_risk(row["id"])
    except Exception as e:
        logger.error(f"Batch risk calculation error: {e}")


def calculate_risk_summary() -> dict:
    """
    Computes overall network-level risk posture and distribution metrics for dashboard reporting.
    """
    try:
        recalculate_all_device_risks()

        with get_conn() as conn:
            row = conn.execute(
                "SELECT AVG(risk_score) as avg_score, MAX(risk_score) as max_score, COUNT(*) as total FROM devices"
            ).fetchone()

            avg_score = row["avg_score"] if row and row["avg_score"] is not None else 0.0
            max_score = row["max_score"] if row and row["max_score"] is not None else 0.0
            total_devices = row["total"] if row else 0

            critical_count = conn.execute(
                "SELECT COUNT(*) as count FROM devices WHERE risk_level IN ('HOSTILE', 'HIGH RISK')"
            ).fetchone()["count"]

            suspicious_count = conn.execute(
                "SELECT COUNT(*) as count FROM devices WHERE risk_level = 'SUSPICIOUS'"
            ).fetchone()["count"]

            adaptive_count = conn.execute(
                "SELECT COUNT(*) as count FROM devices WHERE risk_level = 'ADAPTIVE'"
            ).fetchone()["count"]

            if avg_score >= 60.0 or critical_count >= 2:
                posture = "CRITICAL"
            elif avg_score >= 30.0 or suspicious_count >= 2:
                posture = "ATTENTION"
            else:
                posture = "SECURE"

            return {
                "average_network_risk": round(avg_score, 1),
                "peak_device_risk": round(max_score, 1),
                "high_risk_endpoints": critical_count,
                "suspicious_endpoints": suspicious_count,
                "healthy_endpoints": adaptive_count,
                "total_monitored_devices": total_devices,
                "posture": posture
            }

    except Exception as e:
        logger.error(f"Error calculating risk summary: {e}")
        return {
            "average_network_risk": 0.0,
            "peak_device_risk": 0.0,
            "high_risk_endpoints": 0,
            "suspicious_endpoints": 0,
            "healthy_endpoints": 0,
            "total_monitored_devices": 0,
            "posture": "UNKNOWN"
        }


def get_device_risk_list() -> list[dict]:
    """
    Returns itemized device risk inventory sorted from highest to lowest risk.
    """
    try:
        with get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    id,
                    ip_address,
                    hostname,
                    vendor,
                    device_type,
                    status,
                    risk_score,
                    risk_level,
                    sensor_connected,
                    last_seen
                FROM devices 
                ORDER BY risk_score DESC, last_seen DESC
            """)
            return [dict(r) for r in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Error fetching device risk list: {e}")
        return []