#!/usr/bin/env bash
# ==============================================================================
# SentinelTwin — Start Windows Telemetry & Sysmon Sensor
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/backend/app.py" ]; then
    ROOT_DIR="$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/../backend/app.py" ]; then
    ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
elif [ -f "$SCRIPT_DIR/../sentineltwin/backend/app.py" ]; then
    ROOT_DIR="$(cd "$SCRIPT_DIR/../sentineltwin" && pwd)"
elif [ -f "$SCRIPT_DIR/sentineltwin/backend/app.py" ]; then
    ROOT_DIR="$(cd "$SCRIPT_DIR/sentineltwin" && pwd)"
else
    ROOT_DIR="$SCRIPT_DIR"
fi
cd "$ROOT_DIR"

echo "======================================================================"
echo "  📡 SentinelTwin — Windows Telemetry & Sysmon Sensor                 "
echo "======================================================================"

PYTHON_BIN=""
for candidate in \
    "venv/Scripts/python.exe" \
    "../venv/Scripts/python.exe" \
    "/c/Users/srima/AppData/Local/Python/pythoncore-3.14-64/python.exe" \
    "C:/Users/srima/AppData/Local/Python/pythoncore-3.14-64/python.exe" \
    "venv/bin/python" \
    "../venv/bin/python" \
    "py" \
    "python3" \
    "python"; do
    if [ -x "$candidate" ] || command -v "$candidate" >/dev/null 2>&1 || [ -f "$candidate" ]; then
        if "$candidate" -c "import requests" >/dev/null 2>&1; then
            PYTHON_BIN="$candidate"
            break
        fi
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    echo "[-] Error: Python interpreter with requests library not found."
    exit 1
fi

export PYTHONPATH="."
echo "[*] Using Python: $PYTHON_BIN"
echo "[*] Connecting to Backend at http://127.0.0.1:5000..."
echo "[*] Streaming Windows Event Log and Sysmon events into ingestion API..."
exec "$PYTHON_BIN" sensor/windows_sensor.py
