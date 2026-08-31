"""
SentinelTwin Windows Sensor
Collects Windows Event Log and Sysmon events.
Sends normalized telemetry to the SentinelTwin server.

IMPORTANT: This sensor must only be run on machines where you
are explicitly authorized to collect endpoint telemetry.

The sensor does NOT:
  - Hide itself
  - Establish stealth persistence
  - Disable Defender or firewall
  - Execute attack payloads
  - Dump credentials
  - Collect passwords or keystrokes
"""
import sys
import json
import time
import socket
import logging
import platform
import requests
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("sentineltwin-sensor")

DEFAULT_SERVER = "http://localhost:5000"
DEFAULT_INTERVAL = 5  # seconds between event polls

WATCHED_EVENT_IDS = {
    # Security log
    4624, 4625, 4634, 4648,
    4688, 4689,
    4698,
    4720, 4722, 4726, 4732,
    # Sysmon
    1, 3, 11, 22,
}


def get_hostname() -> str:
    return socket.gethostname()


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def read_windows_events(channels: list[str], max_events: int = 50) -> list[dict]:
    """
    Read events from Windows Event Log channels.
    Requires Windows and pywin32 or winevt.
    """
    events = []
    try:
        import win32evtlog
        import win32evtlogutil
        import win32con

        for channel in channels:
            try:
                handle = win32evtlog.OpenEventLog(None, channel)
                flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
                records = win32evtlog.ReadEventLog(handle, flags, 0)
                for record in records[:max_events]:
                    if record.EventID & 0xFFFF in WATCHED_EVENT_IDS:
                        events.append({
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "source": channel,
                            "event_id": record.EventID & 0xFFFF,
                            "event_type": _classify_event_id(record.EventID & 0xFFFF),
                            "hostname": get_hostname(),
                            "username": record.StringInserts[5] if record.StringInserts and len(record.StringInserts) > 5 else "Unknown",
                            "process_name": record.StringInserts[10] if record.StringInserts and len(record.StringInserts) > 10 else "",
                            "source_ip": get_local_ip(),
                        })
                win32evtlog.CloseEventLog(handle)
            except Exception as e:
                logger.warning(f"Channel {channel} read error: {e}")
    except ImportError:
        logger.error("pywin32 not installed. Install with: pip install pywin32")
    return events


def _classify_event_id(eid: int) -> str:
    mapping = {
        4624: "logon", 4625: "failed_logon", 4634: "logoff",
        4648: "explicit_logon", 4688: "process_creation", 4689: "process_exit",
        4698: "scheduled_task_created", 4720: "account_created",
        4722: "account_enabled", 4726: "account_deleted",
        4732: "group_membership_change",
        1: "process_creation", 3: "network_connection",
        11: "file_created", 22: "dns_query",
    }
    return mapping.get(eid, "unknown")


def send_event(server: str, event: dict) -> bool:
    try:
        r = requests.post(f"{server}/api/events", json=event, timeout=5)
        return r.status_code == 201
    except Exception as e:
        logger.warning(f"Failed to send event: {e}")
        return False


def run(server: str = DEFAULT_SERVER, interval: int = DEFAULT_INTERVAL):
    """Main sensor loop."""
    if platform.system() != "Windows":
        logger.error("Windows sensor unavailable on this operating system.")
        logger.info("Run on a Windows machine to collect endpoint telemetry.")
        sys.exit(1)

    hostname = get_hostname()
    local_ip = get_local_ip()
    logger.info(f"SentinelTwin Sensor starting on {hostname} ({local_ip})")
    logger.info(f"Server: {server}")
    logger.info("This sensor is authorized to collect endpoint telemetry on this machine.")

    channels = ["Security", "Microsoft-Windows-Sysmon/Operational"]
    sent = 0

    while True:
        events = read_windows_events(channels)
        for ev in events:
            if send_event(server, ev):
                sent += 1
        if events:
            logger.info(f"Sent {len(events)} events (total: {sent})")
        time.sleep(interval)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="SentinelTwin Windows Sensor")
    parser.add_argument("--server", default=DEFAULT_SERVER)
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL)
    args = parser.parse_args()
    run(server=args.server, interval=args.interval)
