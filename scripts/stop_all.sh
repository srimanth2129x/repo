#!/usr/bin/env bash
# ==============================================================================
# SentinelTwin — Stop All Running Services
# ==============================================================================

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
echo "  🛑 SentinelTwin — Stopping Running Services                         "
echo "======================================================================"

# Check OS and free ports 5000 and 5173
if command -v netstat >/dev/null 2>&1; then
    echo "[*] Checking for processes listening on ports 5000 and 5173..."
    
    # Port 5000 (Backend)
    PIDS_5000=$(netstat -ano 2>/dev/null | grep -E "(:5000\s)" | awk '{print $NF}' | sort -u || true)
    for PID in $PIDS_5000; do
        if [ "$PID" != "0" ] && [ -n "$PID" ]; then
            echo "[*] Terminating process on port 5000 (PID: $PID)..."
            taskkill //F //PID "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null || true
        fi
    done

    # Port 5173 (Frontend)
    PIDS_5173=$(netstat -ano 2>/dev/null | grep -E "(:5173\s)" | awk '{print $NF}' | sort -u || true)
    for PID in $PIDS_5173; do
        if [ "$PID" != "0" ] && [ -n "$PID" ]; then
            echo "[*] Terminating process on port 5173 (PID: $PID)..."
            taskkill //F //PID "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null || true
        fi
    done
fi

# Fallback process killing for POSIX/Linux/macOS
pkill -f "backend.app" 2>/dev/null || true
pkill -f "windows_sensor" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "[+] SentinelTwin services successfully stopped."
