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
            sensor_token = request.headers.get("X-Sensor-Token", "").strip()
            if sensor_token and config.SENSOR_TOKEN and sensor_token == config.SENSOR_TOKEN:
                request.current_user = {"role": "Sensor", "username": "telemetry_sensor"}
                return f(*args, **kwargs)

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