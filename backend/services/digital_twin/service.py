"""
Digital Twin Service
NetworkX Graph Modeling, Event-Driven Topology Updates,
and Multi-Hop Attack Propagation Analysis.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import networkx as nx

from backend.database.db import get_conn

logger = logging.getLogger(__name__)


def build_networkx_graph(db_path: str = None) -> nx.Graph:
    """Builds a NetworkX graph from devices and topology_edges tables."""
    G = nx.Graph()

    with get_conn(db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, ip_address, mac_address, hostname, vendor, device_type, status, trust_level, criticality, risk_score, risk_level, sensor_connected FROM devices")
        devices = cur.fetchall()

        for d in devices:
            G.add_node(d["id"], **{
                "id": d["id"],
                "label": d["hostname"] if d["hostname"] and d["hostname"] != "Unknown Device" else d["ip_address"],
                "ip": d["ip_address"],
                "ip_address": d["ip_address"],
                "mac_address": d["mac_address"] or "—",
                "hostname": d["hostname"] or "Unknown",
                "vendor": d["vendor"] or "Unknown",
                "device_type": d["device_type"] or "Unknown",
                "status": d["status"] or "Online",
                "trust": d["trust_level"] or "Adaptive",
                "criticality": d["criticality"] if d["criticality"] is not None else 1,
                "risk_score": d["risk_score"] or 0.0,
                "risk_level": d["risk_level"] or "ADAPTIVE",
                "sensor_connected": bool(d["sensor_connected"])
            })

        cur.execute("SELECT source, target, relationship_type, observed, inferred, confidence, protocol, port, evidence FROM topology_edges")
        edges = cur.fetchall()

        for e in edges:
            if G.has_node(e["source"]) and G.has_node(e["target"]):
                G.add_edge(e["source"], e["target"], **{
                    "relationship_type": e["relationship_type"] or "network_reachability",
                    "observed": bool(e["observed"]),
                    "inferred": bool(e["inferred"]),
                    "confidence": e["confidence"] or 0.85,
                    "protocol": e["protocol"] or "IP",
                    "port": e["port"],
                    "evidence": e["evidence"] or "observed telemetry"
                })

    # If no explicit edges exist, infer gateway connectivity (star topology)
    if G.number_of_nodes() > 1 and G.number_of_edges() == 0:
        _infer_gateway_topology(G)

    return G


def _infer_gateway_topology(G: nx.Graph):
    """Infers gateway connection if no edges are explicitly stored."""
    gateway_id = None
    for node_id, attrs in G.nodes(data=True):
        h = str(attrs.get("hostname", "")).lower()
        dt = str(attrs.get("device_type", "")).lower()
        if "router" in h or "gateway" in h or "router" in dt or "gateway" in dt:
            gateway_id = node_id
            break

    nodes = list(G.nodes())
    if gateway_id:
        for nid in nodes:
            if nid != gateway_id:
                G.add_edge(nid, gateway_id,
                           relationship_type="inferred_gateway",
                           observed=False, inferred=True, confidence=0.5,
                           protocol="IP", port=None, evidence="Inferred gateway topology")
    elif len(nodes) > 1:
        hub = nodes[0]
        for nid in nodes[1:]:
            G.add_edge(hub, nid,
                       relationship_type="inferred_local",
                       observed=False, inferred=True, confidence=0.3,
                       protocol="IP", port=None, evidence="Inferred local network reachability")


def get_topology_graph(db_path: str = None) -> Dict[str, Any]:
    """Returns cytoscape-compatible topology representation with both flat and nested attributes."""
    G = build_networkx_graph(db_path)
    nodes = []
    edges = []

    for node_id, attrs in G.nodes(data=True):
        node_data = {
            "id": node_id,
            "label": attrs.get("label", node_id),
            "ip": attrs.get("ip", ""),
            "ip_address": attrs.get("ip_address", attrs.get("ip", "")),
            "hostname": attrs.get("hostname", "Unknown"),
            "vendor": attrs.get("vendor", "Unknown"),
            "mac_address": attrs.get("mac_address", "—"),
            "type": attrs.get("device_type", "Workstation"),
            "device_type": attrs.get("device_type", "Workstation"),
            "status": attrs.get("status", "Online"),
            "trust": attrs.get("trust", "Adaptive"),
            "criticality": attrs.get("criticality", 1),
            "risk_score": attrs.get("risk_score", 0.0),
            "risk_level": attrs.get("risk_level", "ADAPTIVE"),
            "sensor_connected": attrs.get("sensor_connected", False)
        }
        nodes.append({
            **node_data,
            "data": node_data
        })

    idx = 0
    for u, v, attrs in G.edges(data=True):
        edge_data = {
            "id": f"edge-{idx}",
            "source": u,
            "target": v,
            "relationship": attrs.get("relationship_type", "network_reachability"),
            "relationship_type": attrs.get("relationship_type", "network_reachability"),
            "observed": attrs.get("observed", True),
            "inferred": attrs.get("inferred", False),
            "confidence": attrs.get("confidence", 0.85),
            "protocol": attrs.get("protocol", "IP"),
            "port": attrs.get("port")
        }
        edges.append({
            **edge_data,
            "data": edge_data
        })
        idx += 1

    return {
        "nodes": nodes,
        "edges": edges,
        "node_count": len(nodes),
        "edge_count": len(edges)
    }


def record_observed_connection(
    source_device: str,
    target_device: str,
    protocol: str = "TCP",
    port: Optional[int] = None,
    db_path: str = None
):
    """Event-driven graph update: persists observed network communication."""
    if not source_device or not target_device or source_device == target_device:
        return

    with get_conn(db_path) as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO topology_edges (source, target, relationship_type, observed, inferred, confidence, protocol, port, evidence)
            VALUES (?, ?, 'observed_connection', 1, 0, 0.95, ?, ?, 'Observed Network Telemetry')
            ON CONFLICT(source, target) DO UPDATE SET
                observed = 1,
                confidence = 0.95,
                protocol = excluded.protocol,
                port = COALESCE(excluded.port, topology_edges.port)
        """, (source_device, target_device, protocol, port))


def analyze_potential_propagation(source_node_id: str, source_risk: int, db_path: str = None) -> list:
    """
    Computes single-hop and multi-hop propagation opportunities from a compromised source node.
    Compatible with existing test suite and endpoints.
    """
    graph = get_topology_graph(db_path)
    opportunities = []

    for edge in graph["edges"]:
        e_data = edge["data"]
        # In an undirected or bidirectional network, check both source and target connections
        target_id = None
        if e_data["source"] == source_node_id:
            target_id = e_data["target"]
        elif e_data["target"] == source_node_id:
            target_id = e_data["source"]

        if target_id and target_id != source_node_id:
            target_node = next((n for n in graph["nodes"] if n["data"]["id"] == target_id), None)
            if target_node:
                crit = target_node["data"].get("criticality", 1)
                conf = e_data.get("confidence", 0.85)
                score = round((source_risk * conf * (crit / 4.0)), 2)
                opportunities.append({
                    "target_node": target_id,
                    "target_ip": target_node["data"].get("ip"),
                    "target_criticality": crit,
                    "relationship": "Inferred Reachability" if e_data.get("inferred") else "Observed Traffic",
                    "confidence": conf,
                    "propagation_opportunity_score": score,
                    "classification": "Potential Lateral Movement Opportunity (Simulated Path)"
                })
    return opportunities


def run_propagation_simulation(source_device_id: str, source_risk: int = 70, incident_id: int = 0, db_path: str = None) -> dict:
    """
    Full Attack Propagation Simulation using NetworkX:
    Answers: "If this entity is compromised, what could potentially be reached next?"
    """
    G = build_networkx_graph(db_path)

    if source_device_id not in G:
        # Fallback to matching by IP or first available device
        matched = next((nid for nid, d in G.nodes(data=True) if d.get("ip") == source_device_id), None)
        if matched:
            source_device_id = matched
        elif G.number_of_nodes() > 0:
            source_device_id = list(G.nodes())[0]
        else:
            return {
                "source_device": source_device_id,
                "reachable_devices": 0,
                "reachable_device_ids": [],
                "paths": {},
                "worst_path": [],
                "max_depth": 0,
                "critical_assets": [],
                "estimated_impact": "LOW",
                "opportunities": []
            }

    # BFS traversal
    reachable = list(nx.bfs_tree(G, source_device_id).nodes())
    reachable = [n for n in reachable if n != source_device_id]

    # Shortest paths to all reachable nodes
    paths = {}
    for target in reachable:
        try:
            path = nx.shortest_path(G, source_device_id, target)
            paths[target] = path
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            pass

    # Identify critical assets
    critical_assets = []
    for tid in reachable:
        ndata = G.nodes[tid]
        crit = ndata.get("criticality", 1)
        dtype = str(ndata.get("device_type", "")).lower()
        hname = str(ndata.get("hostname", "")).lower()
        if crit >= 3 or any(k in hname for k in ["server", "dc", "db", "nas"]) or any(k in dtype for k in ["server", "router", "gateway"]):
            critical_assets.append(tid)

    max_depth = max((len(p) - 1 for p in paths.values()), default=0)
    worst_path = max(paths.values(), key=len) if paths else [source_device_id]

    # Impact calculation
    impact_score = min(100, len(reachable) * 10 + len(critical_assets) * 25 + max_depth * 10)
    estimated_impact = "CRITICAL" if impact_score >= 70 else "HIGH" if impact_score >= 45 else "MEDIUM" if impact_score >= 20 else "LOW"

    # Immediate single-hop opportunities
    opportunities = analyze_potential_propagation(source_device_id, source_risk, db_path)

    result = {
        "incident_id": incident_id,
        "source_device": source_device_id,
        "source_ip": G.nodes[source_device_id].get("ip", "Unknown"),
        "source_risk": source_risk,
        "reachable_devices": len(reachable),
        "reachable_device_ids": reachable,
        "paths": paths,
        "worst_path": worst_path,
        "max_depth": max_depth,
        "critical_assets": critical_assets,
        "critical_asset_count": len(critical_assets),
        "estimated_impact": estimated_impact,
        "impact_score": impact_score,
        "opportunities": opportunities,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    # Save to simulations table
    try:
        with get_conn(db_path) as conn:
            conn.execute("""
                INSERT INTO simulations (incident_id, source_device, target_devices, path, hop_count, critical_assets, estimated_impact, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                incident_id,
                source_device_id,
                json.dumps(reachable),
                json.dumps(worst_path),
                max_depth,
                json.dumps(critical_assets),
                estimated_impact,
                result["created_at"]
            ))
    except Exception as err:
        logger.warning(f"Could not persist simulation record: {err}")

    return result