"""
Database module for SentinelTwin
Supports dynamic database paths and automatic migrations for MITRE & Evidence Graph.
"""
import sqlite3
import os
from contextlib import contextmanager

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "sentineltwin.db")


@contextmanager
def get_conn(db_path=None):
    path = db_path or DEFAULT_DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


from datetime import datetime, timezone
from werkzeug.security import generate_password_hash

def init_db(db_path=None):
    """Initializes the database schema and performs required column migrations."""
    with get_conn(db_path) as conn:
        cur = conn.cursor()

        # 1. Users Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('Administrator', 'Sensor', 'Viewer')),
                created_at TEXT NOT NULL
            )
        """)

        # 2. Devices Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                ip_address TEXT UNIQUE,
                mac_address TEXT,
                hostname TEXT,
                vendor TEXT,
                device_type TEXT,
                os TEXT,
                status TEXT DEFAULT 'Online',
                first_seen TEXT,
                last_seen TEXT,
                sensor_connected INTEGER DEFAULT 0,
                trust_level TEXT DEFAULT 'Adaptive',
                discovery_method TEXT,
                criticality INTEGER DEFAULT 1,
                risk_score REAL DEFAULT 0.0,
                risk_level TEXT DEFAULT 'ADAPTIVE'
            )
        """)

        # 3. Topology Edges Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS topology_edges (
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                relationship_type TEXT DEFAULT 'network_reachability',
                observed INTEGER DEFAULT 1,
                inferred INTEGER DEFAULT 0,
                confidence REAL DEFAULT 0.85,
                protocol TEXT DEFAULT 'IP',
                port INTEGER,
                evidence TEXT,
                PRIMARY KEY (source, target),
                FOREIGN KEY (source) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (target) REFERENCES devices(id) ON DELETE CASCADE
            )
        """)

        # 4. CyberDNA Baselines Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cyberdna_baselines (
                metric_key TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                sample_count INTEGER DEFAULT 0,
                mean REAL DEFAULT 0.0,
                m2 REAL DEFAULT 0.0,
                variance REAL DEFAULT 0.0,
                standard_deviation REAL DEFAULT 0.0,
                last_updated TEXT NOT NULL,
                peer_group TEXT DEFAULT 'default',
                short_term_mean REAL DEFAULT 0.0,
                PRIMARY KEY (metric_key, entity_id)
            )
        """)

        # 5. Events Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                channel TEXT NOT NULL DEFAULT 'Security',
                event_id INTEGER NOT NULL DEFAULT 0,
                record_id INTEGER NOT NULL DEFAULT 0,
                event_timestamp TEXT NOT NULL,
                ingested_at TEXT NOT NULL,
                user TEXT,
                process_name TEXT,
                parent_process TEXT,
                command_line TEXT,
                source_ip TEXT,
                destination_ip TEXT,
                destination_port INTEGER,
                logon_type TEXT,
                risk_score REAL DEFAULT 0.0,
                details TEXT,
                metadata TEXT,
                event_type TEXT,
                source TEXT DEFAULT 'Sysmon',
                status TEXT,
                UNIQUE (device_id, channel, record_id),
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            )
        """)

        # 6. Alerts Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                severity TEXT NOT NULL,
                category TEXT DEFAULT 'Threat Detected',
                title TEXT DEFAULT '',
                description TEXT NOT NULL,
                timestamp TEXT,
                status TEXT DEFAULT 'Open',
                risk_points INTEGER DEFAULT 0,
                created_at TEXT,
                mitre_technique_id TEXT DEFAULT '',
                mitre_technique_name TEXT DEFAULT '',
                mitre_tactic TEXT DEFAULT '',
                evidence_graph TEXT DEFAULT '{}',
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            )
        """)

        # 7. Simulations Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS simulations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id INTEGER DEFAULT 0,
                source_device TEXT NOT NULL,
                target_devices TEXT DEFAULT '[]',
                path TEXT DEFAULT '[]',
                hop_count INTEGER DEFAULT 0,
                critical_assets TEXT DEFAULT '[]',
                estimated_impact TEXT DEFAULT 'LOW',
                created_at TEXT NOT NULL
            )
        """)

        # 8. Safe Schema Migrations for existing databases
        cur.execute("PRAGMA table_info(events)")
        existing_event_cols = [row["name"] for row in cur.fetchall()]
        if "channel" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN channel TEXT NOT NULL DEFAULT 'Security'")
        if "event_id" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN event_id INTEGER NOT NULL DEFAULT 0")
        if "record_id" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN record_id INTEGER NOT NULL DEFAULT 0")
        if "event_timestamp" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN event_timestamp TEXT")
            if "timestamp" in existing_event_cols:
                cur.execute("UPDATE events SET event_timestamp = timestamp WHERE event_timestamp IS NULL")
            else:
                now_str = datetime.now(timezone.utc).isoformat()
                cur.execute("UPDATE events SET event_timestamp = ? WHERE event_timestamp IS NULL", (now_str,))
        if "ingested_at" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN ingested_at TEXT")
        if "user" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN user TEXT")
        if "process_name" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN process_name TEXT")
        if "parent_process" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN parent_process TEXT")
        if "command_line" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN command_line TEXT")
        if "source_ip" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN source_ip TEXT")
        if "destination_ip" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN destination_ip TEXT")
        if "destination_port" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN destination_port INTEGER")
        if "logon_type" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN logon_type TEXT")
        if "metadata" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN metadata TEXT")
        if "status" not in existing_event_cols:
            cur.execute("ALTER TABLE events ADD COLUMN status TEXT")

        cur.execute("PRAGMA table_info(alerts)")
        existing_alert_cols = [row["name"] for row in cur.fetchall()]
        if "mitre_technique_id" not in existing_alert_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN mitre_technique_id TEXT DEFAULT ''")
        if "mitre_technique_name" not in existing_alert_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN mitre_technique_name TEXT DEFAULT ''")
        if "mitre_tactic" not in existing_alert_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN mitre_tactic TEXT DEFAULT ''")
        if "evidence_graph" not in existing_alert_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN evidence_graph TEXT DEFAULT '{}'")
        if "title" not in existing_alert_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN title TEXT DEFAULT ''")
        if "risk_points" not in existing_alert_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN risk_points INTEGER DEFAULT 0")

        cur.execute("PRAGMA table_info(devices)")
        existing_device_cols = [row["name"] for row in cur.fetchall()]
        if "sensor_connected" not in existing_device_cols:
            cur.execute("ALTER TABLE devices ADD COLUMN sensor_connected INTEGER DEFAULT 0")
        if "trust_level" not in existing_device_cols:
            cur.execute("ALTER TABLE devices ADD COLUMN trust_level TEXT DEFAULT 'Adaptive'")
        if "discovery_method" not in existing_device_cols:
            cur.execute("ALTER TABLE devices ADD COLUMN discovery_method TEXT")
        if "risk_score" not in existing_device_cols:
            cur.execute("ALTER TABLE devices ADD COLUMN risk_score REAL DEFAULT 0.0")
        if "risk_level" not in existing_device_cols:
            cur.execute("ALTER TABLE devices ADD COLUMN risk_level TEXT DEFAULT 'ADAPTIVE'")

        cur.execute("PRAGMA table_info(cyberdna_baselines)")
        existing_baseline_cols = [row["name"] for row in cur.fetchall()]
        if "peer_group" not in existing_baseline_cols:
            cur.execute("ALTER TABLE cyberdna_baselines ADD COLUMN peer_group TEXT DEFAULT 'default'")
        if "short_term_mean" not in existing_baseline_cols:
            cur.execute("ALTER TABLE cyberdna_baselines ADD COLUMN short_term_mean REAL DEFAULT 0.0")

        # 9. Indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(event_timestamp)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_events_dedup ON events(device_id, channel, record_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(severity, status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_criticality ON devices(criticality)")

        # 10. Seed Default Administrator if no users exist
        cur.execute("SELECT COUNT(*) as count FROM users")
        if cur.fetchone()["count"] == 0:
            now = datetime.now(timezone.utc).isoformat()
            cur.execute("""
                INSERT INTO users (username, password_hash, role, created_at)
                VALUES (?, ?, ?, ?)
            """, ("admin", generate_password_hash("SentinelAdmin#2026"), "Administrator", now))