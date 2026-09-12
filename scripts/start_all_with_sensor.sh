#!/usr/bin/env bash
# ==============================================================================
# SentinelTwin — Start All Services + Telemetry Sensor
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/start_all.sh" --sensor "$@"
