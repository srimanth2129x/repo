"""
Authentication & Authorization Module
"""
import jwt
from functools import wraps
from datetime import datetime, timezone, timedelta
from flask import request, jsonify
from backend.config import config

def generate_jwt(user_id: int, username: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=config.JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, config.SECRET_KEY, algorithm="HS256")

def require_auth(allowed_roles=None):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or malformed Authorization header"}), 401
            
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
                request.current_user = payload
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Authentication token has expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid authentication token"}), 401

            if allowed_roles and payload.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden: Insufficient privileges"}), 403

            return f(*args, **kwargs)
        return wrapper
    return decorator

def require_sensor_or_admin():
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            import hashlib
            from backend.database.db import get_conn
            from flask import current_app

            sensor_token = request.headers.get("X-Sensor-Token", "").strip()
            device_id = request.headers.get("X-Device-Id", "").strip()

            # If not in header, try extracting device_id from JSON payload if present
            if not device_id and request.is_json:
                data = request.get_json(silent=True) or {}
                if isinstance(data, dict):
                    device_id = str(data.get("device_id", "")).strip()

            target_db = None
            try:
                target_db = current_app.config.get("DB_PATH", None)
            except Exception:
                pass

            # 1. Device-specific validation and revocation check
            if device_id:
                try:
                    with get_conn(target_db) as conn:
                        row = conn.execute(
                            "SELECT id, auth_status, sensor_token_hash FROM devices WHERE id = ?",
                            (device_id,)
                        ).fetchone()
                        if row:
                            auth_status = str(row["auth_status"] or "AUTHORIZED").upper()
                            if auth_status == "REVOKED":
                                return jsonify({"error": "Forbidden: Device telemetry access is REVOKED"}), 403
                            if auth_status == "PENDING":
                                return jsonify({"error": "Forbidden: Device registration is PENDING approval"}), 403

                            # Per-device token validation against stored SHA-256 hash
                            stored_hash = str(row["sensor_token_hash"] or "").strip()
                            if stored_hash and sensor_token:
                                incoming_hash = hashlib.sha256(sensor_token.encode("utf-8")).hexdigest()
                                if incoming_hash == stored_hash:
                                    request.current_user = {"role": "Sensor", "username": device_id, "device_id": device_id}
                                    return f(*args, **kwargs)
                except Exception:
                    pass

            # 2. Universal Sensor Token validation (backward compatibility)
            if sensor_token and config.SENSOR_TOKEN and sensor_token == config.SENSOR_TOKEN:
                request.current_user = {"role": "Sensor", "username": device_id or "telemetry_sensor"}
                return f(*args, **kwargs)

            # 3. JWT Bearer token validation (Admin / SOC operator)
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                try:
                    payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
                    if payload.get("role") in ("Administrator", "Sensor"):
                        request.current_user = payload
                        return f(*args, **kwargs)
                except Exception:
                    pass

            return jsonify({"error": "Unauthorized: Valid Sensor Token or Admin JWT required"}), 401
        return wrapper
    return decorator