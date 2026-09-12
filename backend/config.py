"""
Centralized Configuration Module
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1", "t")
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "0.0.0.0")

    DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "data" / "sentineltwin.db"))
    EVENT_RETENTION_DAYS = int(os.getenv("EVENT_RETENTION_DAYS", 30))

    SECRET_KEY = os.getenv("SECRET_KEY", "sentinel-insecure-dev-secret-key-change-in-prod")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
    SENSOR_TOKEN = os.getenv("SENSOR_TOKEN", "sentinel-sensor-auth-token-xyz").strip()

    # Multi-Device & Connectivity Configuration
    DEVICE_OFFLINE_TIMEOUT_SECONDS = int(os.getenv("DEVICE_OFFLINE_TIMEOUT_SECONDS", 300))
    GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")
    GOOGLE_DRIVE_CREDENTIALS = os.getenv("GOOGLE_DRIVE_CREDENTIALS", "")
    GOOGLE_DRIVE_SYNC_DIR = os.getenv("GOOGLE_DRIVE_SYNC_DIR", str(BASE_DIR / "data" / "drive_relay"))

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

    CYBERDNA_MIN_SAMPLES = int(os.getenv("CYBERDNA_MIN_SAMPLES", 3))
    CYBERDNA_ANOMALY_THRESHOLD = float(os.getenv("CYBERDNA_ANOMALY_THRESHOLD", 3.0))
    CYBERDNA_GATE_THRESHOLD = float(os.getenv("CYBERDNA_GATE_THRESHOLD", 3.5))

config = Config()