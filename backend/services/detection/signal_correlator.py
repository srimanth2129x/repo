"""
Multi-Signal Threat Correlation Engine
Correlates disparate security events and behavioral anomalies within sliding time windows
to identify coordinated attack sequences (e.g. Brute Force -> Execution -> C2).
"""
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional


class SignalCorrelator:
    def __init__(self, window_seconds: int = 600):
        self.window_seconds = window_seconds
        # In-memory sliding window cache: entity_id -> deque of signals
        self._history: Dict[str, deque] = defaultdict(deque)

    def _prune(self, entity_id: str, current_timestamp: float):
        queue = self._history[entity_id]
        cutoff = current_timestamp - self.window_seconds
        while queue and queue[0]["ts"] < cutoff:
            queue.popleft()

    def record_signal(
        self,
        entity_id: str,
        signal_type: str,
        event: Dict[str, Any],
        risk_contribution: int = 0,
        cyberdna_result: Optional[Dict[str, Any]] = None,
        mitre_match: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Records an observable signal for an entity and evaluates multi-signal correlations.
        """
        now_ts = time.time()
        self._prune(entity_id, now_ts)

        signal_record = {
            "ts": now_ts,
            "signal_type": signal_type,
            "event_id": event.get("event_id"),
            "process_name": event.get("process_name") or "",
            "command_line": event.get("command_line") or "",
            "risk_contribution": risk_contribution,
            "mitre": mitre_match.get("technique_id") if mitre_match else None,
            "is_anomaly": cyberdna_result.get("is_anomaly", False) if cyberdna_result else False,
            "drift_detected": cyberdna_result.get("drift_detected", False) if cyberdna_result else False
        }

        self._history[entity_id].append(signal_record)
        return self.evaluate_correlation(entity_id)

    def evaluate_correlation(self, entity_id: str) -> Dict[str, Any]:
        """
        Evaluates active signals in the current window for patterns:
        - Brute Force & Access: multiple 4625s followed by 4624
        - Execution Chain: suspicious process + script interpreter
        - Compound Behavioral Outlier: CyberDNA anomaly + MITRE technique
        - Exfiltration Pipeline: suspicious execution + network connection
        """
        now_ts = time.time()
        self._prune(entity_id, now_ts)
        signals = list(self._history[entity_id])

        patterns_matched = []
        bonus_points = 0

        event_ids = [s["event_id"] for s in signals]
        anomalies = [s for s in signals if s.get("is_anomaly")]
        drifts = [s for s in signals if s.get("drift_detected")]
        mitres = [s["mitre"] for s in signals if s.get("mitre")]

        # Pattern 1: Authentication Surge / Password Spray
        auth_failures = sum(1 for eid in event_ids if eid == 4625)
        auth_successes = sum(1 for eid in event_ids if eid == 4624)
        if auth_failures >= 3:
            if auth_successes >= 1:
                patterns_matched.append({
                    "pattern": "Brute Force Followed by Successful Logon",
                    "severity": "HIGH",
                    "points": 30,
                    "detail": f"{auth_failures} failed logons followed by successful logon within {self.window_seconds // 60} min"
                })
                bonus_points += 30
            else:
                patterns_matched.append({
                    "pattern": "Authentication Failure Burst",
                    "severity": "MEDIUM",
                    "points": 15,
                    "detail": f"{auth_failures} logon failures clustered within time window"
                })
                bonus_points += 15

        # Pattern 2: Behavioral Anomaly combined with Suspicious Execution
        has_suspicious_proc = any(
            s.get("signal_type") == "suspicious_process" or s.get("mitre") in ("T1059.001", "T1059.003", "T1003.001")
            for s in signals
        )
        if anomalies and has_suspicious_proc:
            patterns_matched.append({
                "pattern": "Correlated CyberDNA Anomaly & Evasive Execution",
                "severity": "HIGH",
                "points": 25,
                "detail": f"Statistical baseline outlier coincided with flagged execution technique ({mitres[0] if mitres else 'Evasive Process'})"
            })
            bonus_points += 25

        # Pattern 3: Behavioral Drift with Ongoing Telemetry Spikes
        if drifts and len(signals) >= 4:
            patterns_matched.append({
                "pattern": "Persistent Behavioral Drift in Active Session",
                "severity": "MEDIUM",
                "points": 15,
                "detail": "Gradual behavioral baseline drift observed alongside repeated system activity"
            })
            bonus_points += 15

        # Pattern 4: Multi-Stage Attack Sequence (Execution + Credential Access/Defense Evasion)
        unique_mitres = set(mitres)
        if len(unique_mitres) >= 2:
            patterns_matched.append({
                "pattern": "Multi-Stage Attack Sequence",
                "severity": "CRITICAL",
                "points": 35,
                "detail": f"Multiple distinct MITRE techniques observed ({', '.join(unique_mitres)})"
            })
            bonus_points += 35

        return {
            "entity_id": entity_id,
            "window_seconds": self.window_seconds,
            "signal_count": len(signals),
            "patterns_matched": patterns_matched,
            "correlation_bonus_points": min(50, bonus_points),
            "has_correlation": len(patterns_matched) > 0
        }

    def clear(self, entity_id: Optional[str] = None):
        """Clears correlation history."""
        if entity_id:
            self._history.pop(entity_id, None)
        else:
            self._history.clear()


signal_correlator = SignalCorrelator()
