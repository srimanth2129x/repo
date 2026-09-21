"""
Centralized Configuration Module
================================
This module defines application-wide configuration parameters with fallback defaults
and environment variable overrides.

All configuration is accessible via the singleton instance `config = Config()`.
"""
import os
from pathlib import Path

# Base repository root directory (sentineltwin/sentineltwin)
BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    """
    Centralized configuration container for SentinelTwin backend services.
    Reads settings from environment variables with safe development defaults.
    """
    # Environment mode (development / production / testing)
    ENV = os.getenv("FLASK_ENV", "development")
    # Debug mode flag enables hot-reloading and detailed traceback in development
    DEBUG = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1", "t")
    # Network bind port and host for Flask REST API
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "0.0.0.0")

    # Primary SQLite database file location: defaults to sentineltwin/data/sentineltwin.db
    DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "data" / "sentineltwin.db"))
    # Retention period in days for historical event logs before archiving
    EVENT_RETENTION_DAYS = int(os.getenv("EVENT_RETENTION_DAYS", 30))

    # Cryptographic secret key used for session cookie signing and JWT token validation
    SECRET_KEY = os.getenv("SECRET_KEY", "sentinel-insecure-dev-secret-key-change-in-prod")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))

    # Pre-shared security token required for sensors pushing telemetry via X-Sensor-Token header
    SENSOR_TOKEN = os.getenv("SENSOR_TOKEN", "sentinel-sensor-auth-token-xyz").strip()

    # --- Multi-Device & Connectivity Configuration ---
    # Number of seconds without telemetry heartbeat before an endpoint is marked 'offline' (5 minutes)
    DEVICE_OFFLINE_TIMEOUT_SECONDS = int(os.getenv("DEVICE_OFFLINE_TIMEOUT_SECONDS", 300))

    # Cloud relay synchronization settings (optional Google Drive fallback relay)
    GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")
    GOOGLE_DRIVE_CREDENTIALS = os.getenv("GOOGLE_DRIVE_CREDENTIALS", "")
    GOOGLE_DRIVE_SYNC_DIR = os.getenv("GOOGLE_DRIVE_SYNC_DIR", str(BASE_DIR / "data" / "drive_relay"))

    # Allowed CORS Origins: Allows frontend dev server (Vite port 5173 or alternative 3000)
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

    # --- CyberDNA Behavioral Modeling Parameters ---
    # Minimum observations required before an entity's baseline is considered statistically valid
    CYBERDNA_MIN_SAMPLES = int(os.getenv("CYBERDNA_MIN_SAMPLES", 3))
    # Standard deviation multiplier (z-score) above which an action is flagged as a behavioral anomaly
    CYBERDNA_ANOMALY_THRESHOLD = float(os.getenv("CYBERDNA_ANOMALY_THRESHOLD", 3.0))
    # Higher threshold used to gate high-confidence alerts triggering propagation simulation in CyberTwin
    CYBERDNA_GATE_THRESHOLD = float(os.getenv("CYBERDNA_GATE_THRESHOLD", 3.5))

config = Config()