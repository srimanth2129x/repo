"""
Unit Tests for CyberDNA Peer-Group Baseline & Personal-vs-Peer Deviation
"""
import pytest
import tempfile
from backend.database.db import init_db
from backend.services.cyberdna.engine import cyberdna_engine


def test_peer_group_baseline_aggregation():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    init_db(db_path)

    # Ingest baseline observations for two workstations in the same peer group
    for i in range(5):
        cyberdna_engine.evaluate_and_update(
            metric_key="process_count",
            entity_id="workstation-01",
            observation=20.0,
            gate_anomalies=True,
            db_path=db_path,
            peer_group="workstations"
        )
        cyberdna_engine.evaluate_and_update(
            metric_key="process_count",
            entity_id="workstation-02",
            observation=25.0,
            gate_anomalies=True,
            db_path=db_path,
            peer_group="workstations"
        )

    # Evaluate an outlier observation on workstation-01
    res = cyberdna_engine.evaluate_and_update(
        metric_key="process_count",
        entity_id="workstation-01",
        observation=150.0,
        gate_anomalies=True,
        db_path=db_path,
        peer_group="workstations"
    )

    assert res["is_anomaly"] is True
    assert res["z_score"] >= 3.0
    assert res["peer_outlier"] is True
    assert res["peer_z_score"] >= 3.0
    assert res["peer_deviation"] > 100.0


def test_peer_profile_retrieval():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    init_db(db_path)

    cyberdna_engine.evaluate_and_update(
        metric_key="network_bytes",
        entity_id="server-01",
        observation=5000.0,
        db_path=db_path,
        peer_group="servers"
    )

    profile = cyberdna_engine.get_profile("server-01", db_path=db_path)
    assert profile["entity_id"] == "server-01"
    assert profile["peer_group"] == "servers"
    assert "network_bytes" in profile["metrics"]
    assert profile["metrics"]["network_bytes"]["mean"] == 5000.0
