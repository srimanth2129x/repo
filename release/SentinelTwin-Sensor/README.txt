======================================================================
  SentinelTwin - Standalone Windows Endpoint Sensor
======================================================================

Zero-Configuration Deployment:
1. Copy this entire folder to any authorized Windows laptop.
2. Double-click "start.bat" or "SentinelTwin-Sensor.exe".
3. The sensor automatically connects to: http://192.168.1.112:5000
4. Approve the new endpoint in the SentinelTwin Dashboard (Devices tab).

Requirements:
- NO Python installation required.
- NO pip or virtual environment required.
- Run as Administrator to monitor Windows Security Event Log (Logon/Process events).

Optional Customization:
- To change the server URL, edit "sentinel_sensor.json" or run:
    SentinelTwin-Sensor.exe --server http://<server-ip>:5000

Logs and persistent runtime state are stored in the local "data" subfolder.
