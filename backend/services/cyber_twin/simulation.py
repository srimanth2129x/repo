"""
Cyber Twin Simulation Bridge
Delegates to unified Digital Twin service in backend.services.digital_twin.service.
Maintains backwards compatibility for existing imports and frontend callers.
"""
from backend.services.digital_twin.service import (
    build_networkx_graph as build_network_graph,
    get_topology_graph,
    run_propagation_simulation,
    analyze_potential_propagation,
    record_observed_connection
)

def run_simulation(incident_id: int, source_device_id: str) -> dict:
    return run_propagation_simulation(source_device_id=source_device_id, incident_id=incident_id)

def get_topology_for_api(include_risk: bool = True) -> dict:
    return get_topology_graph()
