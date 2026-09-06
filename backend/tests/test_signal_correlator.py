"""
Unit Tests for Multi-Signal Threat Correlation Engine
"""
import pytest
from backend.services.detection.signal_correlator import signal_correlator


def test_auth_burst_correlation():
    signal_correlator.clear()

    # Record 3 failed logons
    for i in range(3):
        signal_correlator.record_signal(
            entity_id="dev-ws01",
            signal_type="failed_logon",
            event={"event_id": 4625, "user": "target_admin"}
        )

    res = signal_correlator.evaluate_correlation("dev-ws01")
    assert res["has_correlation"] is True
    assert any("Authentication Failure Burst" in p["pattern"] for p in res["patterns_matched"])

    # Now add a successful logon (Event 4624)
    signal_correlator.record_signal(
        entity_id="dev-ws01",
        signal_type="logon",
        event={"event_id": 4624, "user": "target_admin"}
    )

    res2 = signal_correlator.evaluate_correlation("dev-ws01")
    assert res2["has_correlation"] is True
    assert any("Brute Force Followed by Successful Logon" in p["pattern"] for p in res2["patterns_matched"])
    assert res2["correlation_bonus_points"] >= 30


def test_anomaly_and_execution_correlation():
    signal_correlator.clear()

    # Record CyberDNA anomaly
    signal_correlator.record_signal(
        entity_id="dev-ws02",
        signal_type="cyberdna_anomaly",
        event={"event_id": 4688},
        cyberdna_result={"is_anomaly": True}
    )

    # Record suspicious process with MITRE match
    signal_correlator.record_signal(
        entity_id="dev-ws02",
        signal_type="suspicious_process",
        event={"event_id": 4688, "process_name": "powershell.exe"},
        mitre_match={"technique_id": "T1059.001"}
    )

    res = signal_correlator.evaluate_correlation("dev-ws02")
    assert res["has_correlation"] is True
    assert any("Correlated CyberDNA Anomaly & Evasive Execution" in p["pattern"] for p in res["patterns_matched"])
