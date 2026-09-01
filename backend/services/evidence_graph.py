"""
SentinelTwin - Deterministic Evidence Graph Engine
Constructs an explainable NetworkX Directed Acyclic Graph (DAG) for High-Risk Alerts.
"""
import networkx as nx
from typing import Dict, Any, List, Optional


class EvidenceGraphEngine:
    @staticmethod
    def generate_graph(
        alert_id: str,
        alert_title: str,
        risk_score: float,
        device_id: str,
        user_id: str,
        contributing_events: List[Dict[str, Any]],
        behavioral_mutations: List[str],
        mitre_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Builds a reproducible NetworkX DAG and serializes it to nodes/edges for the frontend.
        """
        G = nx.DiGraph()

        # 1. Base Entity Nodes
        dev_node = f"device:{device_id}"
        G.add_node(dev_node, label="Device", name=device_id, type="entity", details={"device_id": device_id})

        user_name = user_id or "SYSTEM"
        user_node = f"user:{user_name}"
        G.add_node(user_node, label="User", name=user_name, type="entity", details={"user": user_name})

        # 2. Security Event Nodes
        event_nodes = []
        for idx, ev in enumerate(contributing_events):
            ev_id = ev.get("id") or f"event-{idx}"
            node_key = f"event:{ev_id}"
            event_nodes.append(node_key)
            G.add_node(
                node_key,
                label="Security Event",
                name=str(ev.get("event_type") or "Windows / Sysmon Event"),
                type="event",
                details={
                    "event_id": ev.get("event_type") or ev.get("id"),
                    "source": ev.get("source", "Sysmon"),
                    "timestamp": ev.get("timestamp"),
                    "raw_details": ev.get("details")
                }
            )
            G.add_edge(dev_node, node_key, relationship="originated_from")
            G.add_edge(user_node, node_key, relationship="executed_by")

        # 3. Behavioral Mutation Nodes (Cyber DNA)
        mutation_nodes = []
        for idx, mutation in enumerate(behavioral_mutations):
            mut_key = f"mutation:{idx}"
            mutation_nodes.append(mut_key)
            G.add_node(
                mut_key,
                label="Cyber DNA Mutation",
                name=mutation,
                type="mutation",
                details={"deviation": mutation}
            )
            for ev_k in event_nodes:
                G.add_edge(ev_k, mut_key, relationship="caused_by")

        # 4. MITRE ATT&CK Node
        mitre_node = None
        if mitre_data and mitre_data.get("technique_id"):
            tid = mitre_data["technique_id"]
            mitre_node = f"mitre:{tid}"
            G.add_node(
                mitre_node,
                label="MITRE ATT&CK",
                name=f"{tid}: {mitre_data.get('technique_name', '')}",
                type="mitre",
                details={
                    "technique_id": tid,
                    "technique_name": mitre_data.get("technique_name"),
                    "tactic": mitre_data.get("tactic"),
                    "matched_rule": mitre_data.get("matched_rule"),
                    "reason": mitre_data.get("reason"),
                    "confidence": mitre_data.get("confidence", "HIGH")
                }
            )
            for ev_k in event_nodes:
                G.add_edge(ev_k, mitre_node, relationship="consistent_with")

        # 5. Risk Intelligence Node
        risk_node = f"risk:{alert_id}"
        G.add_node(
            risk_node,
            label="Risk Intelligence",
            name=f"Calculated Risk: {risk_score}/100",
            type="risk",
            details={
                "risk_score": risk_score,
                "classification": "CRITICAL" if risk_score >= 85 else ("HIGH" if risk_score >= 65 else "ELEVATED")
            }
        )

        for m_k in mutation_nodes:
            G.add_edge(m_k, risk_node, relationship="contributed_to")

        if mitre_node:
            G.add_edge(mitre_node, risk_node, relationship="elevated_by")

        if not mutation_nodes and not mitre_node:
            for ev_k in event_nodes:
                G.add_edge(ev_k, risk_node, relationship="scored_from")

        # 6. High-Risk Alert Node
        alert_node = f"alert:{alert_id}"
        G.add_node(
            alert_node,
            label="High-Risk Alert",
            name=alert_title,
            type="alert",
            details={"alert_id": alert_id, "risk_score": risk_score}
        )
        G.add_edge(risk_node, alert_node, relationship="triggered")

        # Export structure
        return {
            "alert_id": alert_id,
            "nodes": [{"id": n, **d} for n, d in G.nodes(data=True)],
            "edges": [{"source": u, "target": v, "relationship": d.get("relationship", "related_to")} for u, v, d in G.edges(data=True)]
        }