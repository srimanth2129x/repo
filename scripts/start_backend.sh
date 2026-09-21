#!/usr/bin/env bash
# ==============================================================================
# SentinelTwin — Start Backend Service (Flask API)
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
echo "  🛡️  SentinelTwin SOC — Starting Backend API Service (Port 5000)     "
echo "======================================================================"

# Auto-detect Python interpreter with dependency verification
PYTHON_BIN=""
for candidate in \
    "venv/Scripts/python.exe" \
    "../venv/Scripts/python.exe" \
    "venv/bin/python" \
    "../venv/bin/python" \
    "py" \
    "python3" \
    "python"; do
    if [ -x "$candidate" ] || command -v "$candidate" >/dev/null 2>&1 || [ -f "$candidate" ]; then
        if "$candidate" -c "import flask, jwt" >/dev/null 2>&1; then
            PYTHON_BIN="$candidate"
            break
        fi
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    echo "[-] Error: Could not find a Python interpreter with required dependencies (flask, jwt)."
    echo "[!] Please run: pip install pyjwt flask flask-cors networkx scapy"
    exit 1
fi

echo "[*] Using Python: $PYTHON_BIN"
export PYTHONPATH="."
export FLASK_ENV="development"

# Ensure data directory exists for SQLite database
mkdir -p data

echo "[+] Starting Flask API server on http://127.0.0.1:5000..."
exec "$PYTHON_BIN" -m backend.app
