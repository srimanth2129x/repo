"""
Flask Application Factory
"""
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import config
from backend.database.db import init_db
from backend.api.routes import api_bp

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

def create_app(db_path: str = None) -> Flask:
    app = Flask(__name__)
    target_db = db_path or config.DB_PATH
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["DB_PATH"] = target_db

    CORS(
        app,
        resources={r"/api/*": {"origins": config.CORS_ORIGINS}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Sensor-Token"]
    )

    init_db(target_db)
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Internal server error: {e}")
        return jsonify({"error": "Internal server error"}), 500

    return app

if __name__ == "__main__":
    app = create_app()
    logger.info(f"Starting SentinelTwin on {config.HOST}:{config.PORT}")
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
