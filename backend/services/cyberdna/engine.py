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
    """
    CyberDNA Behavioral Profile Engine
    - Personal baseline: Welford's algorithm tracking individual behavior
    - Peer-group baseline: Cohort aggregation across similar devices/roles
    - Personal vs Peer deviation analysis
    - Behavioral drift detection: Exponential moving average tracking long-term shifts
    - Anomaly gating against baseline poisoning
    """

    def _get_or_create_baseline(self, cur, metric_key: str, entity_id: str, observation: float, peer_group: str, now: str):
        cur.execute("""
            SELECT sample_count, mean, m2, variance, standard_deviation, peer_group, short_term_mean
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
            short_term_mean = float(observation)
            cur.execute("""
                INSERT INTO cyberdna_baselines (
                    metric_key, entity_id, sample_count, mean, m2,
                    variance, standard_deviation, last_updated, peer_group, short_term_mean
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (metric_key, entity_id, sample_count, mean, m2, variance, std_dev, now, peer_group, short_term_mean))
            return {
                "sample_count": sample_count, "mean": mean, "m2": m2,
                "variance": variance, "std_dev": std_dev, "peer_group": peer_group,
                "short_term_mean": short_term_mean, "is_new": True
            }
        
        return {
            "sample_count": row["sample_count"],
            "mean": row["mean"],
            "m2": row["m2"],
            "variance": row["variance"],
            "std_dev": row["standard_deviation"],
            "peer_group": row["peer_group"] or peer_group,
            "short_term_mean": row["short_term_mean"] if row["short_term_mean"] is not None else row["mean"],
            "is_new": False
        }

    def _update_welford(self, cur, metric_key: str, entity_id: str, observation: float, state: dict, now: str, alpha: float = 0.3):
        sample_count = state["sample_count"] + 1
        mean = state["mean"]
        m2 = state["m2"]

        delta = observation - mean
        mean += delta / sample_count
        delta2 = observation - mean
        m2 += delta * delta2
        variance = m2 / (sample_count - 1) if sample_count > 1 else 0.0
        std_dev = math.sqrt(variance)

        # Update Short-term EWMA for drift tracking
        short_term_mean = alpha * observation + (1.0 - alpha) * state["short_term_mean"]

        cur.execute("""
            UPDATE cyberdna_baselines 
            SET sample_count = ?, mean = ?, m2 = ?, variance = ?, standard_deviation = ?,
                short_term_mean = ?, last_updated = ?
            WHERE metric_key = ? AND entity_id = ?
        """, (sample_count, mean, m2, variance, std_dev, short_term_mean, now, metric_key, entity_id))

        return {
            "sample_count": sample_count,
            "mean": mean,
            "std_dev": std_dev,
            "short_term_mean": short_term_mean
        }

    def evaluate_and_update(
        self,
        metric_key: str,
        entity_id: str,
        observation: float,
        gate_anomalies: bool = True,
        db_path: str = None,
        peer_group: str = "workstations",
        alpha: float = 0.3
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        observation = float(observation)

        with get_conn(db_path) as conn:
            cur = conn.cursor()

            # 1. Personal Baseline
            personal = self._get_or_create_baseline(cur, metric_key, entity_id, observation, peer_group, now)
            
            p_count = personal["sample_count"]
            p_mean = personal["mean"]
            p_std = personal["std_dev"]
            p_st_mean = personal["short_term_mean"]

            # Compute personal Z-Score
            if not personal["is_new"] and p_count >= config.CYBERDNA_MIN_SAMPLES:
                if p_std > 0.0001:
                    personal_z = abs(observation - p_mean) / p_std
                else:
                    personal_z = 10.0 if abs(observation - p_mean) > 0.0001 else 0.0
            else:
                personal_z = 0.0

            is_anomaly = personal_z >= config.CYBERDNA_ANOMALY_THRESHOLD

            # Behavioral Drift Detection (short-term shift vs long-term mean)
            curr_st_mean = alpha * observation + (1.0 - alpha) * p_st_mean
            drift_detected = False
            drift_score = 0.0

            if p_count >= config.CYBERDNA_MIN_SAMPLES * 2:
                mean_denom = abs(p_mean) if abs(p_mean) > 0.0001 else 1.0
                relative_shift = abs(curr_st_mean - p_mean) / mean_denom
                sigma_denom = p_std if p_std > 0.0001 else 1.0
                drift_sigma = abs(curr_st_mean - p_mean) / sigma_denom

                # Drift detected if short-term trend diverged by >=1.2 sigma OR >=25% relative shift
                if drift_sigma >= 1.2 or relative_shift >= 0.25:
                    drift_detected = True
                    drift_score = round(min(100.0, max(drift_sigma * 20.0, relative_shift * 100.0)), 1)

            # Update personal baseline if not gated as poison
            if personal["is_new"]:
                p_updated = personal
            else:
                if not (gate_anomalies and personal_z >= config.CYBERDNA_GATE_THRESHOLD):
                    p_updated = self._update_welford(cur, metric_key, entity_id, observation, personal, now)
                else:
                    p_updated = personal

            # 2. Peer-Group Baseline (Cohort aggregation)
            peer_entity_id = f"peer_group:{peer_group}"
            peer = self._get_or_create_baseline(cur, metric_key, peer_entity_id, observation, peer_group, now)
            
            peer_count = peer["sample_count"]
            peer_mean = peer["mean"]
            peer_std = peer["std_dev"]

            if not peer["is_new"] and peer_count >= config.CYBERDNA_MIN_SAMPLES:
                if peer_std > 0.0001:
                    peer_z = abs(observation - peer_mean) / peer_std
                else:
                    peer_z = 10.0 if abs(observation - peer_mean) > 0.0001 else 0.0
            else:
                peer_z = 0.0

            peer_deviation = round(observation - peer_mean, 2)
            peer_outlier = peer_z >= config.CYBERDNA_ANOMALY_THRESHOLD

            if not peer["is_new"]:
                if not (gate_anomalies and peer_z >= config.CYBERDNA_GATE_THRESHOLD):
                    self._update_welford(cur, metric_key, peer_entity_id, observation, peer, now)

        return {
            "entity_id": entity_id,
            "peer_group": peer_group,
            "metric_key": metric_key,
            "observation": observation,
            "mean": round(p_updated["mean"], 2),
            "std_dev": round(p_updated["std_dev"], 2),
            "z_score": round(personal_z, 2),
            "is_anomaly": is_anomaly,
            "peer_mean": round(peer_mean, 2),
            "peer_std_dev": round(peer_std, 2),
            "peer_z_score": round(peer_z, 2),
            "peer_deviation": peer_deviation,
            "peer_outlier": peer_outlier,
            "drift_detected": drift_detected,
            "drift_score": drift_score
        }

    def get_profile(self, entity_id: str, db_path: str = None) -> dict:
        """Returns the full behavioral CyberDNA profile for an entity."""
        with get_conn(db_path) as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT metric_key, sample_count, mean, standard_deviation, short_term_mean,
                       peer_group, last_updated
                FROM cyberdna_baselines
                WHERE entity_id = ?
            """, (entity_id,))
            rows = cur.fetchall()

            metrics = {}
            peer_group = "workstations"
            for r in rows:
                peer_group = r["peer_group"] or peer_group
                metrics[r["metric_key"]] = {
                    "sample_count": r["sample_count"],
                    "mean": round(r["mean"], 2),
                    "std_dev": round(r["standard_deviation"], 2),
                    "short_term_mean": round(r["short_term_mean"] or r["mean"], 2),
                    "last_updated": r["last_updated"]
                }

            # Fetch peer baselines
            cur.execute("""
                SELECT metric_key, mean, standard_deviation
                FROM cyberdna_baselines
                WHERE entity_id = ?
            """, (f"peer_group:{peer_group}",))
            peer_rows = {r["metric_key"]: dict(r) for r in cur.fetchall()}

            for mkey, mdata in metrics.items():
                p_info = peer_rows.get(mkey)
                if p_info:
                    mdata["peer_mean"] = round(p_info["mean"], 2)
                    mdata["peer_std_dev"] = round(p_info["standard_deviation"], 2)

            return {
                "entity_id": entity_id,
                "peer_group": peer_group,
                "metrics": metrics,
                "metric_count": len(metrics)
            }

    def get_all_entities(self, db_path: str = None) -> list[dict]:
        """Returns all entities with active CyberDNA baselines."""
        with get_conn(db_path) as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT DISTINCT entity_id, peer_group, COUNT(metric_key) as metric_count, MAX(last_updated) as last_seen
                FROM cyberdna_baselines
                WHERE entity_id NOT LIKE 'peer_group:%'
                GROUP BY entity_id
            """)
            return [dict(r) for r in cur.fetchall()]

cyberdna_engine = CyberDNAEngine()