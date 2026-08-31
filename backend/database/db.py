"""
Database Management Module
"""
import sqlite3
import logging
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path
from werkzeug.security import generate_password_hash
from backend.config import config

logger = logging.getLogger(__name__)

_INITIALIZED_PATHS = set()

def init_db(db_path: str = None):
    target_path = db_path or config.DB_PATH
    Path(target_path).parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(target_path, timeout=15.0) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")

        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
        if cur.fetchone():
            cur.execute("PRAGMA table_info(events)")
            cols = [row[1] for row in cur.fetchall()]
            if "timestamp" in cols and "event_timestamp" not in cols:
                conn.execute("ALTER TABLE events RENAME COLUMN timestamp TO event_timestamp")
            if "channel" not in cols:
                conn.execute("ALTER TABLE events ADD COLUMN channel TEXT DEFAULT 'Security'")
            if "record_id" not in cols:
                conn.execute("ALTER TABLE events ADD COLUMN record_id INTEGER DEFAULT 0")

        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('Administrator', 'Sensor', 'Viewer')),
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                ip_address TEXT UNIQUE NOT NULL,
                mac_address TEXT,
                hostname TEXT,
                vendor TEXT,
                device_type TEXT,
                os TEXT,
                status TEXT DEFAULT 'Online',
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                sensor_connected INTEGER DEFAULT 0,
                trust_level TEXT DEFAULT 'Adaptive',
                discovery_method TEXT,
                criticality INTEGER DEFAULT 1 CHECK(criticality BETWEEN 0 AND 4)
            );

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
            );

            CREATE TABLE IF NOT EXISTS cyberdna_baselines (
                metric_key TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                sample_count INTEGER DEFAULT 0,
                mean REAL DEFAULT 0.0,
                m2 REAL DEFAULT 0.0,
                variance REAL DEFAULT 0.0,
                standard_deviation REAL DEFAULT 0.0,
                last_updated TEXT NOT NULL,
                PRIMARY KEY (metric_key, entity_id)
            );

            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                event_id INTEGER NOT NULL,
                record_id INTEGER NOT NULL,
                event_timestamp TEXT NOT NULL,
                ingested_at TEXT NOT NULL,
                user TEXT,
                process_name TEXT,
                parent_process TEXT,
                command_line TEXT,
                source_ip TEXT,
                logon_type TEXT,
                risk_score INTEGER DEFAULT 0,
                metadata TEXT,
                UNIQUE (device_id, channel, record_id),
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                severity TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                status TEXT DEFAULT 'Open',
                risk_points INTEGER DEFAULT 0,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(event_timestamp);
            CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
            CREATE INDEX IF NOT EXISTS idx_events_dedup ON events(device_id, channel, record_id);
            CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(severity, status);
            CREATE INDEX IF NOT EXISTS idx_devices_criticality ON devices(criticality);
        """)

        cur.execute("SELECT COUNT(*) as count FROM users")
        if cur.fetchone()["count"] == 0:
            now = datetime.now(timezone.utc).isoformat()
            default_users = [
                ("admin", generate_password_hash("SentinelAdmin#2026"), "Administrator"),
                ("sensor_svc", generate_password_hash("SensorServiceKey#2026"), "Sensor"),
                ("analyst", generate_password_hash("SentinelAnalyst#2026"), "Viewer"),
            ]
            for username, pwd_hash, role in default_users:
                cur.execute(
                    "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
                    (username, pwd_hash, role, now)
                )
        conn.commit()
    _INITIALIZED_PATHS.add(str(Path(target_path).resolve()))

@contextmanager
def get_conn(db_path: str = None):
    target_path = db_path or config.DB_PATH
    resolved = str(Path(target_path).resolve())
    if resolved not in _INITIALIZED_PATHS:
        init_db(target_path)

    conn = sqlite3.connect(target_path, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction failure: {e}")
        raise
    finally:
        conn.close()

def prune_old_events(days: int = None, db_path: str = None) -> int:
    retention_days = days or config.EVENT_RETENTION_DAYS
    cutoff = (datetime.now(timezone.utc) - timedelta(days=retention_days)).isoformat()
    with get_conn(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM events WHERE event_timestamp < ?", (cutoff,))
        pruned_count = cursor.rowcount
        return pruned_count