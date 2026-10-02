#!/usr/bin/env bash
# ==============================================================================
# SentinelTwin — Start Frontend Console (Vite React)
# ==============================================================================

set -e

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
cd "$ROOT_DIR/frontend"

echo "======================================================================"
echo "  ⚡ SentinelTwin SOC — Starting Frontend Console (Port 5173)         "
echo "======================================================================"

# Locate npm executable
NPM_BIN=""
if command -v npm >/dev/null 2>&1; then
    NPM_BIN="npm"
elif command -v npm.cmd >/dev/null 2>&1; then
    NPM_BIN="npm.cmd"
else
    echo "[-] Error: npm could not be found in PATH."
    exit 1
fi

# Install dependencies if node_modules is missing
if [[ ! -d "node_modules" ]]; then
    echo "[*] node_modules not found. Running npm install..."
    "$NPM_BIN" install
fi

echo "[+] Starting Vite dev server on http://localhost:5173..."
exec "$NPM_BIN" run dev
