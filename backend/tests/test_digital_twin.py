"""
Unit Tests for Digital Twin Graph and Multi-Hop Attack Propagation
"""
import pytest
import tempfile
from backend.database.db import get_conn, init_db
from backend.services.digital_twin.service import (
    record_observed_connection,
    get_topology_graph,
    run_propagation_simulation,
    analyze_potential_propagation
)


def test_dynamic_edge_addition_and_topology():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    init_db(db_path)

    with get_conn(db_path) as conn:
        conn.execute("INSERT INTO devices (id, ip_address, hostname, criticality) VALUES ('dev-a', '10.0.0.1', 'Host-A', 1)")
        conn.execute("INSERT INTO devices (id, ip_address, hostname, criticality) VALUES ('dev-b', '10.0.0.2', 'Host-B', 2)")
        conn.execute("INSERT INTO devices (id, ip_address, hostname, criticality, device_type) VALUES ('dev-c', '10.0.0.3', 'DC-Server', 4, 'Server')")

    # Record observed connection: A -> B
    record_observed_connection("dev-a", "dev-b", protocol="TCP", port=445, db_path=db_path)
    # Record observed connection: B -> C
    record_observed_connection("dev-b", "dev-c", protocol="TCP", port=88, db_path=db_path)

    graph = get_topology_graph(db_path)
    assert graph["node_count"] == 3
    assert graph["edge_count"] == 2

    # Run multi-hop propagation from dev-a
    sim = run_propagation_simulation("dev-a", source_risk=80, db_path=db_path)
    assert sim["reachable_devices"] == 2
    assert "dev-c" in sim["critical_assets"]
    assert sim["max_depth"] == 2
    assert sim["estimated_impact"] in ("HIGH", "CRITICAL")
