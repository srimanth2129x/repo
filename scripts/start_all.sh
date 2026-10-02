#!/usr/bin/env bash
# ==============================================================================
# SentinelTwin — Start All Services (Backend + Frontend Console [+ Sensor])
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/backend/app.py" ]]; then
    ROOT_DIR="$SCRIPT_DIR"
elif [[ -f "$SCRIPT_DIR/../backend/app.py" ]]; then
    ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
elif [[ -f "$SCRIPT_DIR/../sentineltwin/backend/app.py" ]]; then
    ROOT_DIR="$(cd "$SCRIPT_DIR/../sentineltwin" && pwd)"
elif [[ -f "$SCRIPT_DIR/sentineltwin/backend/app.py" ]]; then
    ROOT_DIR="$(cd "$SCRIPT_DIR/sentineltwin" && pwd)"
else
    ROOT_DIR="$SCRIPT_DIR"
fi
cd "$ROOT_DIR"

START_SENSOR=false
for arg in "$@"; do
    case "$arg" in
        --sensor|-s|--with-sensor)
            START_SENSOR=true
            ;;
    esac
done

echo "======================================================================"
echo "  🛡️  SENTINELTWIN — ALL-IN-ONE SYSTEM LAUNCHER                       "
echo "======================================================================"
echo "  Components starting:"
echo "    1. Flask Backend API        -> http://127.0.0.1:5000"
echo "    2. Vite SOC Frontend Console -> http://localhost:5173"
if [[ "$START_SENSOR" == true ]]; then
echo "    3. Windows Telemetry Sensor  -> Streaming to http://127.0.0.1:5000"
fi
echo "======================================================================"
echo ""

BACKEND_PID=""
FRONTEND_PID=""
SENSOR_PID=""

cleanup() {
    echo ""
    echo "[!] Stopping SentinelTwin background services..."
    if [[ -n "$SENSOR_PID" ]]; then
        kill "$SENSOR_PID" 2>/dev/null || true
    fi
    if [[ -n "$FRONTEND_PID" ]]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    if [[ -n "$BACKEND_PID" ]]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    echo "[+] Done."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend in background
echo "[*] Launching Backend API Service (start_backend.sh)..."
"$SCRIPT_DIR/start_backend.sh" &
BACKEND_PID=$!

# Give backend 2 seconds to initialize
sleep 2

# 2. Start Frontend in background
echo "[*] Launching Frontend Console (start_frontend.sh)..."
"$SCRIPT_DIR/start_frontend.sh" &
FRONTEND_PID=$!

# 3. Start Sensor if requested
if [[ "$START_SENSOR" == true ]]; then
    echo "[*] Launching Endpoint Telemetry Sensor (start_sensor.sh)..."
    "$SCRIPT_DIR/start_sensor.sh" &
    SENSOR_PID=$!
fi

echo ""
echo "======================================================================"
echo "  🚀 SentinelTwin is LIVE!"
echo "  - SOC Web Console:  http://localhost:5173"
echo "  - Backend REST API: http://127.0.0.1:5000/api"
if [[ "$START_SENSOR" == true ]]; then
echo "  - Telemetry Sensor: ACTIVE (Streaming Windows Event Logs & Sysmon)"
else
echo "  - Telemetry Sensor: OFF (Run ./start_sensor.sh or pass --sensor)"
fi
echo "======================================================================"
echo "  Press [Ctrl+C] to stop all services."
echo "======================================================================"
echo ""

# Keep running until Ctrl+C
if [[ "$START_SENSOR" == true ]]; then
    wait "$BACKEND_PID" "$FRONTEND_PID" "$SENSOR_PID"
else
    wait "$BACKEND_PID" "$FRONTEND_PID"
fi
