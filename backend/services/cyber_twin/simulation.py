"""
Cyber Twin Simulation
Graph-based propagation analysis using NetworkX.
This is a SIMULATED analysis — not an actual attack.
All paths are POTENTIAL paths based on observed topology.
"""
import json
import logging
import networkx as nx
from datetime import datetime, timezone

from backend.database.db import get_conn
from backend.config import config

logger = logging.getLogger(__name__)


def build_network_graph() -> nx.Graph:
    """Build NetworkX graph from discovered devices and relationships."""
    G = nx.Graph()

    with get_conn() as conn:
        devices = conn.execute("SELECT * FROM devices").fetchall()
        for d in devices:
            G.add_node(d["id"], **{
                "hostname": d["hostname"] or "Unknown",
                "ip": d["ip_address"],
                "mac": d["mac_address"] or "Unknown",
                "vendor": d["vendor"] or "Unknown",
                "device_type": d["device_type"] or "Unknown",
                "status": d["status"],
                "risk_score": d["risk_score"],
                "risk_level": d["risk_level"],
                "sensor_connected": bool(d["sensor_connected"])
            })

        relationships = conn.execute("SELECT * FROM network_relationships").fetchall()
        for r in relationships:
            G.add_edge(r["source_device"], r["destination_device"], **{
                "relationship_type": r["relationship_type"],
                "confidence": r["confidence"],
                "evidence": r["evidence"] or "observed"
            })

    # If no explicit relationships, infer gateway connections
    # (all devices assumed to route through gateway)
    if G.number_of_edges() == 0:
        _infer_gateway_topology(G)

    return G


def _infer_gateway_topology(G: nx.Graph):
    """
    Infer star topology: all devices connect through gateway.
    Marked as INFERRED — not observed.
    """
    gateway_id = None
    for node_id, attrs in G.nodes(data=True):
        hostname = attrs.get("hostname", "").lower()
        device_type = attrs.get("device_type", "").lower()
        if "router" in hostname or "router" in device_type or "gateway" in hostname:
            gateway_id = node_id
            break

    if gateway_id:
        for node_id in list(G.nodes()):
            if node_id != gateway_id:
                G.add_edge(node_id, gateway_id,
                           relationship_type="inferred_gateway",
                           confidence=0.5,
                           evidence="inferred from network topology — not observed")
        logger.info(f"Inferred gateway topology via {gateway_id}")
    else:
        # No gateway found — connect first online device as hub
        nodes = list(G.nodes())
        if len(nodes) > 1:
            hub = nodes[0]
            for node_id in nodes[1:]:
                G.add_edge(hub, node_id,
                           relationship_type="inferred_local",
                           confidence=0.3,
                           evidence="inferred local network — not observed")


def run_simulation(incident_id: int, source_device_id: str) -> dict:
    """
    Run propagation simulation from a high-risk device.
    Returns potential attack paths and estimated impact.
    THIS IS SIMULATED — NO ACTUAL ATTACK IS PERFORMED.
    """
    G = build_network_graph()

    if source_device_id not in G:
        return {"error": "Source device not in network graph", "incident_id": incident_id}

    # BFS traversal from source
    reachable = list(nx.bfs_tree(G, source_device_id).nodes())
    reachable = [n for n in reachable if n != source_device_id]

    # Shortest paths to all reachable nodes
    paths = {}
    for target in reachable:
        try:
            path = nx.shortest_path(G, source_device_id, target)
            paths[target] = path
        except nx.NetworkXNoPath:
            pass

    # Identify critical assets (high-value targets)
    critical_assets = []
    with get_conn() as conn:
        for target_id in reachable:
            d = conn.execute("SELECT * FROM devices WHERE id=?", (target_id,)).fetchone()
            if d:
                hostname = (d["hostname"] or "").lower()
                device_type = (d["device_type"] or "").lower()
                if any(k in hostname for k in ["server", "db", "database", "nas", "storage", "dc", "domain"]):
                    critical_assets.append(target_id)
                elif any(k in device_type for k in ["server", "database"]):
                    critical_assets.append(target_id)

    # Max depth
    max_depth = max((len(p) - 1 for p in paths.values()), default=0)

    # Impact score
    impact_score = _calculate_impact(len(reachable), len(critical_assets), max_depth)

    # Pick worst-case path for visualization
    worst_path = []
    if paths:
        worst_path = max(paths.values(), key=lambda p: len(p))

    result = {
        "incident_id": incident_id,
        "source_device": source_device_id,
        "source_ip": G.nodes[source_device_id].get("ip", "Unknown"),
        "reachable_devices": len(reachable),
        "reachable_device_ids": reachable,
        "paths": {k: v for k, v in list(paths.items())[:10]},  # top 10
        "worst_path": worst_path,
        "max_depth": max_depth,
        "critical_assets": critical_assets,
        "critical_asset_count": len(critical_assets),
        "estimated_impact": impact_score["label"],
        "impact_score": impact_score["score"],
        "note": "SIMULATED PROPAGATION — NOT AN ACTUAL ATTACK. Paths are potential based on observed topology.",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    _save_simulation(result)
    return result


def _calculate_impact(reachable: int, critical: int, depth: int) -> dict:
    score = 0
    score += min(reachable * 5, 40)  # up to 40 for reach
    score += min(critical * 20, 40)  # up to 40 for critical assets
    score += min(depth * 5, 20)      # up to 20 for depth

    if score >= 70:
        label = "CRITICAL"
    elif score >= 50:
        label = "HIGH"
    elif score >= 25:
        label = "MEDIUM"
    else:
        label = "LOW"

    return {"score": min(score, 100), "label": label}


def _save_simulation(result: dict):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO simulations "
            "(incident_id, source_device, target_devices, path, hop_count, critical_assets, estimated_impact, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                result["incident_id"],
                result["source_device"],
                json.dumps(result["reachable_device_ids"]),
                json.dumps(result["worst_path"]),
                result["max_depth"],
                json.dumps(result["critical_assets"]),
                result["estimated_impact"],
                result["created_at"]
            )
        )


def get_topology_for_api(include_risk: bool = True) -> dict:
    """Return network topology as nodes/edges for frontend visualization."""
    G = build_network_graph()
    nodes = []
    edges = []

    for node_id, attrs in G.nodes(data=True):
        nodes.append({
            "id": node_id,
            "label": attrs.get("hostname") or attrs.get("ip") or node_id,
            "ip": attrs.get("ip", ""),
            "hostname": attrs.get("hostname", "Unknown"),
            "device_type": attrs.get("device_type", "Unknown"),
            "status": attrs.get("status", "Unknown"),
            "risk_score": attrs.get("risk_score", 0),
            "risk_level": attrs.get("risk_level", "ADAPTIVE"),
            "sensor_connected": attrs.get("sensor_connected", False),
            "vendor": attrs.get("vendor", "Unknown"),
        })

    for src, dst, attrs in G.edges(data=True):
        edges.append({
            "source": src,
            "target": dst,
            "relationship": attrs.get("relationship_type", "connected"),
            "confidence": attrs.get("confidence", 0.5),
            "evidence": attrs.get("evidence", "observed"),
            "inferred": "inferred" in attrs.get("relationship_type", "")
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "node_count": len(nodes),
        "edge_count": len(edges)
    }
