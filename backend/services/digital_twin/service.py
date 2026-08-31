"""
Cyber Twin Graph & Potential Propagation Analysis
"""
from backend.database.db import get_conn

def get_topology_graph(db_path: str = None):
    nodes = []
    edges = []
    seen = set()

    with get_conn(db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, ip_address, hostname, vendor, device_type, status, trust_level, criticality FROM devices")
        for d in cur.fetchall():
            dev_id = d["id"]
            seen.add(dev_id)
            nodes.append({
                "data": {
                    "id": dev_id,
                    "label": d["hostname"] if d["hostname"] and d["hostname"] != "Unknown Device" else d["ip_address"],
                    "ip": d["ip_address"],
                    "type": d["device_type"],
                    "status": d["status"],
                    "trust": d["trust_level"],
                    "criticality": d["criticality"] if d["criticality"] is not None else 1
                }
            })

        cur.execute("SELECT source, target, relationship_type, observed, inferred, confidence, protocol, port FROM topology_edges")
        idx = 0
        for e in cur.fetchall():
            if e["source"] in seen and e["target"] in seen:
                edges.append({
                    "data": {
                        "id": f"edge-{idx}",
                        "source": e["source"],
                        "target": e["target"],
                        "relationship_type": e["relationship_type"],
                        "observed": bool(e["observed"]),
                        "inferred": bool(e["inferred"]),
                        "confidence": e["confidence"] or 0.85,
                        "protocol": e["protocol"],
                        "port": e["port"]
                    }
                })
                idx += 1

    return {"nodes": nodes, "edges": edges}

def analyze_potential_propagation(source_node_id: str, source_risk: int, db_path: str = None) -> list:
    graph = get_topology_graph(db_path)
    opportunities = []

    for edge in graph["edges"]:
        if edge["data"]["source"] == source_node_id:
            target_id = edge["data"]["target"]
            target_node = next((n for n in graph["nodes"] if n["data"]["id"] == target_id), None)
            if target_node:
                crit = target_node["data"].get("criticality", 1)
                conf = edge["data"].get("confidence", 0.85)
                score = round((source_risk * conf * (crit / 4.0)), 2)
                opportunities.append({
                    "target_node": target_id,
                    "target_ip": target_node["data"].get("ip"),
                    "target_criticality": crit,
                    "relationship": "Inferred Reachability" if edge["data"]["inferred"] else "Observed Traffic",
                    "confidence": conf,
                    "propagation_opportunity_score": score,
                    "classification": "Potential Lateral Movement Opportunity (Simulated Path)"
                })
    return opportunities