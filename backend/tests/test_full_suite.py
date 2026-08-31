"""
Automated Test Suite for SentinelTwin Core Modules
"""
import pytest
import tempfile
from backend.app import create_app
from backend.database.db import get_conn, init_db
from sensor.parsers import parse_windows_event_xml
from backend.services.cyberdna.engine import cyberdna_engine
from backend.services.risk.engine import risk_engine
from backend.services.digital_twin.service import analyze_potential_propagation

@pytest.fixture
def test_client():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    init_db(db_path)
    app = create_app(db_path=db_path)
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client, db_path

def test_xml_event_timestamp_preservation():
    raw_xml = """<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
        <System>
            <EventID>4624</EventID>
            <EventRecordID>99201</EventRecordID>
            <Channel>Security</Channel>
            <Computer>CORP-DC01.local</Computer>
            <TimeCreated SystemTime="2026-08-17T14:30:12.000Z"/>
        </System>
        <EventData>
            <Data Name="TargetUserName">Administrator</Data>
            <Data Name="IpAddress">10.107.4.55</Data>
        </EventData>
    </Event>"""
    parsed = parse_windows_event_xml(raw_xml)
    assert parsed["event_timestamp"] == "2026-08-17T14:30:12.000Z"
    assert parsed["record_id"] == 99201
    assert parsed["user"] == "Administrator"

def test_cyberdna_anomaly_gating():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        test_db = tmp.name
    init_db(test_db)
    
    for _ in range(5):
        cyberdna_engine.evaluate_and_update("login_metric", "dev-test-suite", 10.0, gate_anomalies=True, db_path=test_db)

    res = cyberdna_engine.evaluate_and_update("login_metric", "dev-test-suite", 100.0, gate_anomalies=True, db_path=test_db)
    assert res["is_anomaly"] is True
    assert res["z_score"] >= 3.0

def test_explainable_risk_scoring():
    event = {
        "event_id": 4625,
        "user": "test_user",
        "process_name": "powershell.exe",
        "command_line": "powershell.exe -NoP -W Hidden -EncodedCommand JAB"
    }
    cyberdna_res = {"is_anomaly": True, "z_score": 4.0, "metric_key": "auth_failures"}
    risk = risk_engine.calculate_risk(event, cyberdna_res)

    assert risk["risk_score"] >= 50
    assert len(risk["contributors"]) >= 2
    assert sum(c["points"] for c in risk["contributors"]) == risk["risk_score"]

def test_contextual_powershell_detection():
    normal_ps = {"event_id": 4688, "process_name": "powershell.exe", "command_line": "powershell.exe Get-Process"}
    suspicious_ps = {"event_id": 4688, "process_name": "powershell.exe", "command_line": "powershell.exe -Enc JAB -w hidden"}

    risk_normal = risk_engine.calculate_risk(normal_ps)
    risk_suspicious = risk_engine.calculate_risk(suspicious_ps)

    assert risk_normal["risk_score"] == 0
    assert risk_suspicious["risk_score"] >= 30

def test_idempotent_event_ingestion(test_client):
    client, db_path = test_client
    event_payload = {
        "event_id": 4624,
        "record_id": 1001,
        "channel": "Security",
        "device_id": "dev-host01",
        "event_timestamp": "2026-08-17T14:00:00Z",
        "user": "analyst"
    }
    headers = {"X-Sensor-Token": "sentinel-sensor-auth-token-xyz"}

    res1 = client.post("/api/events/ingest", json=event_payload, headers=headers)
    assert res1.status_code == 201

    res2 = client.post("/api/events/ingest", json=event_payload, headers=headers)
    assert res2.status_code == 409

def test_database_authenticated_login(test_client):
    client, _ = test_client
    res = client.post("/api/auth/login", json={"username": "admin", "password": "SentinelAdmin#2026"})
    assert res.status_code == 200
    assert "token" in res.get_json()

def test_api_validation_rejection(test_client):
    client, _ = test_client
    headers = {"X-Sensor-Token": "sentinel-sensor-auth-token-xyz"}
    res = client.post("/api/events/ingest", json={"event_id": 4624}, headers=headers)
    assert res.status_code == 400

def test_cyber_twin_observed_vs_inferred(test_client):
    _, db_path = test_client
    with get_conn(db_path) as conn:
        conn.execute("INSERT OR IGNORE INTO devices (id, ip_address, first_seen, last_seen, criticality) VALUES ('dev-src', '10.0.0.1', '2026-08-17', '2026-08-17', 2)")
        conn.execute("INSERT OR IGNORE INTO devices (id, ip_address, first_seen, last_seen, criticality) VALUES ('dev-tgt', '10.0.0.2', '2026-08-17', '2026-08-17', 4)")
        conn.execute("INSERT OR REPLACE INTO topology_edges (source, target, observed, inferred, confidence) VALUES ('dev-src', 'dev-tgt', 0, 1, 0.9)")

    opportunities = analyze_potential_propagation("dev-src", 80, db_path=db_path)
    assert len(opportunities) == 1
    assert opportunities[0]["relationship"] == "Inferred Reachability"
    assert opportunities[0]["propagation_opportunity_score"] > 0