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


def init_db(db_path=None):
    """Initializes the database schema and performs required column migrations."""
    with get_conn(db_path) as conn:
        cur = conn.cursor()

        # 1. Devices Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                ip_address TEXT UNIQUE,
                mac_address TEXT,
                hostname TEXT,
                vendor TEXT,
                device_type TEXT,
                os TEXT,
                status TEXT,
                first_seen TEXT,
                last_seen TEXT,
                criticality INTEGER DEFAULT 2
            )
        """)

        # 2. Events Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                device_id TEXT,
                event_type TEXT,
                source TEXT,
                risk_score REAL DEFAULT 0.0,
                details TEXT,
                timestamp TEXT
            )
        """)

        # 3. Alerts Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                device_id TEXT,
                title TEXT,
                severity TEXT,
                status TEXT DEFAULT 'Active',
                description TEXT,
                created_at TEXT,
                mitre_technique_id TEXT DEFAULT '',
                mitre_technique_name TEXT DEFAULT '',
                mitre_tactic TEXT DEFAULT '',
                evidence_graph TEXT DEFAULT '{}'
            )
        """)

        # Safe schema migration for existing databases
        cur.execute("PRAGMA table_info(alerts)")
        existing_cols = [row["name"] for row in cur.fetchall()]
        if "mitre_technique_id" not in existing_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN mitre_technique_id TEXT DEFAULT ''")
        if "mitre_technique_name" not in existing_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN mitre_technique_name TEXT DEFAULT ''")
        if "mitre_tactic" not in existing_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN mitre_tactic TEXT DEFAULT ''")
        if "evidence_graph" not in existing_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN evidence_graph TEXT DEFAULT '{}'")