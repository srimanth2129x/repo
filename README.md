# SentinelTwin

**Cyber Behavior + Network Impact Intelligence**

REAL NETWORK · REAL TELEMETRY · EXPLAINABLE DETECTION · GRAPH-BASED SIMULATION

---

## ⚠ Authorization Notice

> Network discovery must only be performed on networks you own or are explicitly authorized to monitor.

SentinelTwin is a **defensive observation platform** only. It does not exploit, attack, persist, modify, disable, or destroy.

---

## Architecture

```
Real Wi-Fi / Network
     ↓
Network Discovery (ARP + ICMP ping)
     ↓
Device Database (SQLite)
     ↓
Windows Sensor (optional endpoint telemetry)
     ↓
Event Pipeline → CyberDNA Engine → Risk Intelligence
     ↓
Risk-Gated Cyber Twin (NetworkX graph simulation)
     ↓
React Dashboard
```

## Running

### Backend
```bash
cd sentineltwin
pip install -r requirements.txt
python -m backend.app
# → http://localhost:5000
```

### Frontend
```bash
cd sentineltwin/frontend
npm install
npm run dev
# → http://localhost:5173
```

### Windows Sensor (on authorized Windows endpoint)
```bash
pip install pywin32 requests
python sensor/windows_sensor.py --server http://YOUR_SENTINELTWIN_IP:5000
```

---

## Research Contributions

1. **CyberDNA** — Personal + peer behavioral baselines (Welford online statistics)
2. **Explainable Risk** — Every risk point traceable to a specific observable event
3. **Risk-Gated Cyber Twin** — Only high-confidence incidents trigger propagation simulation
4. **Real Network Impact Visibility** — Behavioral anomalies mapped to actual observed topology

## Stack

- Backend: Python, Flask, SQLite, NetworkX, Pandas
- Frontend: React, Vite, Tailwind CSS, Cytoscape.js, Recharts
- Network: OS ARP table, ICMP ping sweep, netifaces
- Endpoint: Windows Event Log, Sysmon (pywin32)
