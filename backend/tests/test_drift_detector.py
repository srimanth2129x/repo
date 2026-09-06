"""
Unit Tests for CyberDNA Behavioral Drift Detection
"""
import pytest
import tempfile
from backend.database.db import init_db
from backend.services.cyberdna.engine import cyberdna_engine


def test_behavioral_drift_detection():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    init_db(db_path)

    # Establish long-term baseline around 10.0 with low variance
    for _ in range(8):
        cyberdna_engine.evaluate_and_update(
            metric_key="session_duration",
            entity_id="user-alice",
            observation=10.0,
            db_path=db_path
        )

    # Gradually shift observations higher (e.g. 15, 18, 20, 22) - gradual shift, not single spike
    for val in [14.0, 16.0, 18.0, 22.0, 25.0]:
        res = cyberdna_engine.evaluate_and_update(
            metric_key="session_duration",
            entity_id="user-alice",
            observation=val,
            gate_anomalies=False,
            db_path=db_path
        )

    # Verify drift was detected
    assert res["drift_detected"] is True
    assert res["drift_score"] > 0
