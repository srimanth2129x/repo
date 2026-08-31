import pytest
from backend.services.risk.engine import risk_engine

def test_explainable_risk_breakdown():
    event = {
        "event_id": 4625,
        "process_name": "powershell.exe",
        "command_line": "powershell.exe -NoP -NonI -W Hidden -Enc JAB"
    }
    cyberdna_res = {"is_anomaly": True, "z_score": 4.2}
    result = risk_engine.calculate_risk(event, cyberdna_res)

    assert result["risk_score"] > 50
    assert len(result["contributors"]) >= 2
    assert sum(c["points"] for c in result["contributors"]) == result["risk_score"]