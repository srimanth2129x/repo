"""
Cyber Twin Attack Propagation Simulator
Simulates potential lateral movement paths across discovered topology nodes.
Safe analysis only — no actual packets/payloads sent.
"""
import logging
from backend.database.db import get_conn

logger = logging.getLogger(__name__)


def run_propagation_simulation(source_device: str, incident_id: int = 0) -> dict:
    """
    Calculates reachable network paths and estimated impact from a compromised source node.
    """
    try:
        conn = get_conn()
        cursor = conn.cursor()

        # Fetch devices
        cursor.execute("SELECT * FROM devices")
        devices = {row["id"]: dict(row) for row in cursor.fetchall()}

        # Fetch edges
        cursor.execute("SELECT source, target, confidence FROM topology_edges")
        edges = cursor.fetchall()

        if source_device not in devices:
            # Fallback to first available device if source not specified or found
            if devices:
                source_device = list(devices.keys())[0]
            else:
                return {
                    "source_ip": "Unknown",
                    "reachable_devices": 0,
                    "max_depth": 0,
                    "critical_asset_count": 0,
                    "estimated_impact": "LOW",
                    "worst_path": []
                }

        # Build adjacency graph
        adj = {}
        for edge in edges:
            u, v = edge["source"], edge["target"]
            adj.setdefault(u, []).append(v)
            adj.setdefault(v, []).append(u)

        # BFS Traversal to compute propagation reachability and depth
        visited = {source_device: 0}
        queue = [source_device]
        parent = {source_device: None}

        while queue:
            curr = queue.pop(0)
            curr_depth = visited[curr]

            for neighbor in adj.get(curr, []):
                if neighbor not in visited and neighbor in devices:
                    visited[neighbor] = curr_depth + 1
                    parent[neighbor] = curr
                    queue.append(neighbor)

        # Calculate impact metrics
        max_depth = max(visited.values()) if visited else 0
        critical_count = sum(
            1 for dev_id in visited
            if devices.get(dev_id, {}).get("device_type") in ("Router", "Server")
        )

        # Reconstruct longest/worst path
        deepest_node = max(visited, key=visited.get) if visited else source_device
        worst_path = []
        curr = deepest_node
        while curr:
            worst_path.append(curr)
            curr = parent.get(curr)
        worst_path.reverse()

        # Assess risk level
        if len(visited) > 4 or critical_count >= 1:
            impact = "HIGH"
        elif len(visited) > 2:
            impact = "MEDIUM"
        else:
            impact = "LOW"

        source_ip = devices.get(source_device, {}).get("ip_address", source_device)

        return {
            "source_ip": source_ip,
            "reachable_devices": len(visited),
            "max_depth": max_depth,
            "critical_asset_count": critical_count,
            "estimated_impact": impact,
            "worst_path": worst_path
        }

    except Exception as e:
        logger.error(f"Simulation run error: {e}")
        return {
            "source_ip": "Error",
            "reachable_devices": 0,
            "max_depth": 0,
            "critical_asset_count": 0,
            "estimated_impact": "UNKNOWN",
            "worst_path": []
        }