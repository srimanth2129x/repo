# SentinelTwin — Complete Operations & Runbook

Welcome to SentinelTwin! This guide explains how to start, configure, build, and run the entire SentinelTwin platform: the central server (Flask API + React SOC Console) and the standalone Windows Telemetry Sensor.

---

## Architecture Overview

```text
CENTRAL SERVER (Laptop A)
  ├── Backend API (Flask on Port 5000)
  ├── SQLite Database (data/sentineltwin.db)
  └── SOC Dashboard (React + Vite on Port 5173)
           ▲
           │ Telemetry (HTTP / Google Drive / Offline Queue)
           ▼
ENDPOINTS / WORKSTATIONS (Laptop A, Laptop B, etc.)
  └── SentinelTwin-Sensor.exe (Standalone Windows Binary)
```

---

## 1. Quick Start (Running Central Services)

You can launch all server components in dedicated console windows with one click:

### Start All Services
Open Command Prompt or PowerShell in the repository root and run:
```cmd
scripts\start_all.bat
```
This automatically launches:
1. **Flask Backend API Service** on `http://127.0.0.1:5000`
2. **SOC Web Console** on `http://localhost:5173`

Open your browser to:
👉 **`http://localhost:5173`**

### Stop All Services
To cleanly shut down both the backend and frontend:
```cmd
scripts\stop_all.bat
```

---

## 2. Individual Service Controls (Manual Start)

If you prefer to run services individually:

### Backend Only:
```cmd
scripts\start_backend.bat
```
*(Runs `python -m backend.app` on `0.0.0.0:5000`)*

### Frontend Console Only:
```cmd
scripts\start_frontend.bat
```
*(Runs `npm run dev` in `frontend/` on `http://localhost:5173`)*

---

## 3. Building the Standalone Sensor Executable (`.exe`)

The SentinelTwin Windows Sensor collects Windows Security Event Logs and Sysmon telemetry. It is packaged into a **single, standalone Windows `.exe`** requiring **no Python, pip, or virtual environment** on the target laptop.

### Option A: Build for Localhost (Single-Laptop Testing)
```cmd
scripts\build_sensor_exe.bat
```
- Targets: `http://127.0.0.1:5000`
- Generates: `release\SentinelTwin-Sensor.exe` (~12.1 MB)

### Option B: Build for Remote Laptop B (LAN Deployment)
If you want to send the sensor to another laptop on your Wi-Fi/LAN:
1. Find your central server's LAN IP address (e.g. `ipconfig` -> `192.168.1.50`).
2. Run the build script with your server IP:
   ```cmd
   scripts\build_sensor_exe.bat http://192.168.1.50:5000
   ```
   *(Or set the environment variable: `set SENTINEL_SERVER_URL=http://192.168.1.50:5000` before running the script).*
3. The executable now has your server IP embedded at build time.

---

## 4. Running the Standalone Sensor

### On the Central Laptop (Laptop A):
```cmd
release\SentinelTwin-Sensor.exe
```
*(Or run `scripts\start_sensor.bat` if running from Python source).*

### On a Remote Laptop (Laptop B):
1. Copy **ONLY** `release\SentinelTwin-Sensor.exe` to Laptop B (via USB flash drive, shared folder, etc.).
2. Double-click `SentinelTwin-Sensor.exe` or run from PowerShell/CMD:
   ```cmd
   SentinelTwin-Sensor.exe
   ```
3. **No Python, no config file, and no command-line flags are required.**

> [!TIP]
> **Administrator Privileges Note**:
> - Collecting **Sysmon** telemetry requires standard non-administrator privileges.
> - Collecting the **Windows Security Log** (Logons, Process Creations) requires running as Administrator OR membership in the built-in Windows "Event Log Readers" group.

---

## 5. Approving the Device in the Dashboard (Security Gate)

For security, every newly connected workstation starts in a **`PENDING`** state.

1. When the sensor starts, its console displays:
   ```text
   [*] Status: PENDING — Waiting for administrator approval in dashboard...
   ```
2. Open the SentinelTwin Console in your browser: `http://localhost:5173`.
3. In the left sidebar under **SYSTEM & ASSETS**, click **DEVICES**.
4. Locate the newly connected workstation (marked with a yellow/orange `PENDING` badge).
5. Click the green **Authorize** button.
6. The sensor immediately detects authorization within 5 seconds and logs:
   ```text
   [+] Device AUTHORIZED by administrator!
   [+] Beginning live telemetry streaming.
   [+] Monitoring channels: Security, Microsoft-Windows-Sysmon/Operational.
   ```
7. Live events will begin streaming on your **OVERVIEW** and **EVENTS** tabs!

---

## 6. Runtime Configuration Overrides (Optional)

If you need to override the target server at runtime without recompiling:

| Priority | Method | Example |
| :--- | :--- | :--- |
| **1 (Highest)** | Command-Line Flag | `SentinelTwin-Sensor.exe --server http://10.0.0.5:5000` |
| **2** | Environment Variable | `set SENTINEL_SERVER=http://10.0.0.5:5000` |
| **3** | JSON Config File | Create `sentinel_sensor.json` next to the `.exe`: `{"server": "http://10.0.0.5:5000"}` |
| **4** | Build-Time Embedded URL | Injected during compilation via `build_sensor_exe.bat` |
| **5 (Lowest)** | Development Fallback | `http://127.0.0.1:5000` |

---

## 7. Running the Automated Test Suite

To verify the health and integrity of all system components:

```powershell
python -m pytest -v backend/tests/ tests/
```
- Total test coverage: **46 / 46 passing tests**
- Verifies: CyberDNA engine, risk scoring, digital twin graph simulation, MITRE ATT&CK mapping, sensor checkpoints, crash-safe Drive relay, single-instance mutex, and packaging.

---

## 8. Troubleshooting & FAQs

### Q: "Another instance of SentinelTwin Sensor is already running on this machine"
- **Reason**: SentinelTwin uses a Windows Named Mutex (`Global\SentinelTwin_Sensor_SingleInstance_Mutex`) to prevent competing processes from corrupting event log checkpoints.
- **Solution**: Check Task Manager or run `taskkill /f /im SentinelTwin-Sensor.exe` to terminate previous background runs.

### Q: "Cannot find package.json / npm error ENOENT"
- **Solution**: Ensure you are running `scripts\start_frontend.bat` (which automatically enters the `frontend` directory) or cd into `frontend/` before executing `npm run dev`.

### Q: Port 5000 or 5173 is already in use
- **Solution**: Run `scripts\stop_all.bat` to clear any lingering processes bound to ports 5000 and 5173.
