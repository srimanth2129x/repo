======================================================================
               SENTINELTWIN STANDALONE SENSOR DEPLOYMENT
======================================================================

The SentinelTwin Standalone Sensor (SentinelTwin-Sensor.exe) collects
endpoint telemetry (Windows Security Event Log and Sysmon) and securely
relays it to the central SentinelTwin server.

This executable is self-contained. It requires NO Python, pip, virtual
environments, or source code installation on this machine.

----------------------------------------------------------------------
PREREQUISITES
----------------------------------------------------------------------
1. Operating System: Windows 10, 11, or Windows Server 2019/2022 (x64).
2. Network Access: TCP connectivity to the central SentinelTwin server
   (port 5000 by default, or via private overlay VPN / Google Drive).
3. Sysmon (Recommended):
   - Install Sysmon with default config if detailed process, network,
     file, and DNS telemetry is required:
       Sysmon64.exe -accepteula -i
4. Privileges:
   - Sysmon telemetry requires standard non-admin execution.
   - Reading the Windows Security Log requires membership in the built-in
     "Event Log Readers" group OR running as Administrator.

----------------------------------------------------------------------
CONFIGURATION METHODS
----------------------------------------------------------------------
The sensor resolves its target server in the following priority order:

Option 1: Config File (Recommended for double-click execution)
  1. Rename sentinel_sensor.example.json to sentinel_sensor.json:
       copy sentinel_sensor.example.json sentinel_sensor.json
  2. Open sentinel_sensor.json in Notepad and set your server's LAN IP:
       {
         "server": "http://192.168.1.50:5000",
         "interval": 5
       }
  3. Double-click SentinelTwin-Sensor.exe to start.

Option 2: Command-Line Flags
  Run from Command Prompt or PowerShell:
    SentinelTwin-Sensor.exe --server http://192.168.1.50:5000 --interval 5

Option 3: Environment Variables
  set SENTINEL_SERVER=http://192.168.1.50:5000
  SentinelTwin-Sensor.exe

----------------------------------------------------------------------
FIRST-TIME REGISTRATION & DASHBOARD APPROVAL
----------------------------------------------------------------------
1. On first run, the sensor generates a unique persistent device ID
   (e.g., ST-DEVICE-A1B2C3D4) and connects to the central server.
2. For remote workstations, the initial state is PENDING.
   The console will display:
     [*] Status: PENDING — Awaiting administrator approval in the dashboard.
3. The administrator opens the SentinelTwin Dashboard on the central server:
     http://localhost:5000 -> "Devices" tab
4. Click "Authorize" next to the newly registered workstation.
5. The sensor automatically detects approval within seconds and begins
   streaming live telemetry:
     [+] Device AUTHORIZED by administrator!
     [+] Beginning live telemetry streaming.

----------------------------------------------------------------------
DATA & LOGS
----------------------------------------------------------------------
Sensor runtime state is stored in the local "data" subfolder:
- data/sensor_device.json     : Persistent unique device identity & token
- data/sensor_checkpoint.json : Per-channel event bookmarks
- data/sensor_offline_queue.json : Offline buffer during network outages

----------------------------------------------------------------------
SAFE CLEANUP
----------------------------------------------------------------------
To stop the sensor, press Ctrl+C in the console window.
The sensor holds a Windows Named Mutex while running to prevent
duplicate instances from conflicting on event log checkpoints.
======================================================================
