"""
CyberDNA Behavioral Profile Engine
Calculates incremental statistical baselines using Welford's algorithm
and gates anomalies to defend against baseline poisoning attacks.
"""
import math
import logging
from datetime import datetime, timezone
from backend.database.db import get_conn
from backend.config import config

logger = logging.getLogger(__name__)

class CyberDNAEngine:
    def evaluate_and_update(
        self,
        metric_key: str,
        entity_id: str,
        observation: float,
        gate_anomalies: bool = True,
        db_path: str = None
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        
        with get_conn(db_path) as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT sample_count, mean, m2, variance, standard_deviation 
                FROM cyberdna_baselines 
                WHERE metric_key = ? AND entity_id = ?
            """, (metric_key, entity_id))
            row = cur.fetchone()

            if not row:
                sample_count = 1
                mean = float(observation)
                m2 = 0.0
                variance = 0.0
                std_dev = 0.0
                z_score = 0.0
                is_anomaly = False

                cur.execute("""
                    INSERT INTO cyberdna_baselines (
                        metric_key, entity_id, sample_count, mean, m2,
                        variance, standard_deviation, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (metric_key, entity_id, sample_count, mean, m2, variance, std_dev, now))
            else:
                sample_count = row["sample_count"]
                mean = row["mean"]
                m2 = row["m2"]
                std_dev = row["standard_deviation"]

                # Calculate Z-Score deviation
                if sample_count >= config.CYBERDNA_MIN_SAMPLES:
                    if std_dev > 0.0001:
                        z_score = abs(observation - mean) / std_dev
                    else:
                        z_score = 10.0 if abs(observation - mean) > 0.0001 else 0.0
                else:
                    z_score = 0.0

                is_anomaly = z_score >= config.CYBERDNA_ANOMALY_THRESHOLD

                # Adaptive Welford Update with Poisoning Gating
                if not (gate_anomalies and z_score >= config.CYBERDNA_GATE_THRESHOLD):
                    sample_count += 1
                    delta = observation - mean
                    mean += delta / sample_count
                    delta2 = observation - mean
                    m2 += delta * delta2
                    variance = m2 / (sample_count - 1) if sample_count > 1 else 0.0
                    std_dev = math.sqrt(variance)

                    cur.execute("""
                        UPDATE cyberdna_baselines 
                        SET sample_count = ?, mean = ?, m2 = ?, variance = ?, standard_deviation = ?, last_updated = ?
                        WHERE metric_key = ? AND entity_id = ?
                    """, (sample_count, mean, m2, variance, std_dev, now, metric_key, entity_id))

        return {
            "entity_id": entity_id,
            "metric_key": metric_key,
            "observation": observation,
            "mean": round(mean, 2),
            "std_dev": round(std_dev, 2),
            "z_score": round(z_score, 2),
            "is_anomaly": is_anomaly
        }

cyberdna_engine = CyberDNAEngine()