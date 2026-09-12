"""
SentinelTwin Windows Sensor (Multi-Device & Multi-Transport)
Collects Windows Event Log and Sysmon events.
Sends normalized telemetry to the central SentinelTwin server across prioritized transports:
  1. Direct HTTP (Localhost / Same LAN)
  2. Private / Overlay Network
  3. Google Drive Asynchronous Relay (Crash-safe atomic staging)
  4. Local Offline Queue (Decoupled checkpointing)

IMPORTANT: This sensor must only be run on machines where you
are explicitly authorized to collect endpoint telemetry.
"""
import os
import sys
import json
import time
import uuid
import socket
import logging
import platform
import hashlib
import requests
from pathlib import Path
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("sentineltwin-sensor")

DEFAULT_SERVER = "http://127.0.0.1:5000"
DEFAULT_INTERVAL = 5  # seconds between event polls
DEFAULT_SENSOR_TOKEN = os.getenv("SENSOR_TOKEN", "sentinel-sensor-auth-token-xyz").strip()

CHECKPOINT_FILE = Path("data") / "sensor_checkpoint.json"
DEVICE_FILE = Path("data") / "sensor_device.json"
OFFLINE_QUEUE_FILE = Path("data") / "sensor_offline_queue.json"
DEFAULT_DRIVE_DIR = Path("sentinel_events")

WATCHED_EVENT_IDS = {
    # Security log
    4624, 4625, 4634, 4648,
    4688, 4689,
    4698,
    4720, 4722, 4726, 4732,
    # Sysmon
    1, 3, 11, 22,
}

_CACHED_HOSTNAME = None
_CACHED_LOCAL_IP = None


def get_hostname() -> str:
    global _CACHED_HOSTNAME
    if _CACHED_HOSTNAME is None:
        _CACHED_HOSTNAME = socket.gethostname()
    return _CACHED_HOSTNAME


def get_local_ip() -> str:
    global _CACHED_LOCAL_IP
    if _CACHED_LOCAL_IP is None:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            _CACHED_LOCAL_IP = s.getsockname()[0]
            s.close()
        except Exception:
            _CACHED_LOCAL_IP = "127.0.0.1"
    return _CACHED_LOCAL_IP


def normalize_server_url(server: str) -> str:
    clean = server.strip().rstrip("/")
    if "://localhost" in clean:
        clean = clean.replace("://localhost", "://127.0.0.1")
    return clean


def get_or_create_device_id(device_file: Path = DEVICE_FILE) -> tuple[str, str | None]:
    """
    Retrieves or generates a persistent device ID (ST-DEVICE-XXXXXXXX) and stored token.
    Persisted across sensor restarts in data/sensor_device.json.
    """
    if device_file.exists():
        try:
            with open(device_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                dev_id = data.get("device_id")
                token = data.get("token")
                if dev_id:
                    return dev_id, token
        except Exception as e:
            logger.warning(f"Could not read device file {device_file}: {e}")

    # Generate new device ID based on hostname hash + random entropy
    h = hashlib.sha256(f"{get_hostname()}-{uuid.uuid4().hex}".encode()).hexdigest()[:8].upper()
    dev_id = f"ST-DEVICE-{h}"
    save_device_credentials(dev_id, None, device_file=device_file)
    logger.info(f"Initialized persistent device identity: {dev_id}")
    return dev_id, None


def save_device_credentials(device_id: str, token: str | None, device_file: Path = DEVICE_FILE):
    """Persists device ID and authorization token."""
    try:
        device_file.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "device_id": device_id,
            "hostname": get_hostname(),
            "token": token,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        with open(device_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save device credentials to {device_file}: {e}")


def load_checkpoints(checkpoint_file: Path | None = None) -> dict:
    target_file = checkpoint_file or CHECKPOINT_FILE
    if target_file.exists():
        try:
            with open(target_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return {k: int(v) for k, v in data.items() if str(v).isdigit()}
        except Exception as e:
            logger.warning(f"Failed to load checkpoint file {target_file}: {e}")
    return {}


def save_checkpoints(checkpoints: dict, checkpoint_file: Path | None = None):
    target_file = checkpoint_file or CHECKPOINT_FILE
    try:
        target_file.parent.mkdir(parents=True, exist_ok=True)
        with open(target_file, "w", encoding="utf-8") as f:
            json.dump(checkpoints, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save checkpoint file {target_file}: {e}")


def probe_transport(server_url: str, timeout: float = 1.5) -> bool:
    """Fast health probe against candidate server URL."""
    try:
        url = f"{normalize_server_url(server_url)}/api/health"
        res = requests.get(url, timeout=timeout)
        return res.status_code == 200 and res.json().get("status") == "ok"
    except Exception:
        return False


def register_with_server(
    server_url: str,
    device_id: str,
    device_file: Path = DEVICE_FILE,
    token: str = None
) -> tuple[str, str | None]:
    """
    Registers the device with the central server via POST /api/sensor/register.
    Returns (auth_status, token).
    """
    url = f"{normalize_server_url(server_url)}/api/sensor/register"
    payload = {
        "device_id": device_id,
        "hostname": get_hostname(),
        "source_ip": get_local_ip(),
        "os": platform.system()
    }
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Sensor-Token"] = token

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=3.0)
        data = res.json()
        status = data.get("status", "PENDING").upper()
        new_token = data.get("token") or token
        if new_token:
            save_device_credentials(device_id, new_token, device_file=device_file)
        return status, new_token
    except Exception as e:
        logger.warning(f"Registration probe to {server_url} failed: {e}")
        return "UNREACHABLE", token


def cleanup_stale_staging(drive_dir: Path, device_id: str, max_age_seconds: int = 3600):
    """Cleans up abandoned .tmp staging files older than max_age_seconds on startup."""
    staging_dir = drive_dir / device_id / "staging"
    if not staging_dir.exists():
        return
    now = time.time()
    for tmp_file in staging_dir.glob("*.tmp"):
        try:
            if now - tmp_file.stat().st_mtime > max_age_seconds:
                tmp_file.unlink()
                logger.debug(f"Removed stale staging file: {tmp_file}")
        except Exception:
            pass


def write_crash_safe_drive_batch(
    drive_dir: Path,
    device_id: str,
    events: list[dict],
    batch_id: str = None
) -> tuple[bool, str]:
    """
    Crash-safe 8-step atomic Google Drive batch delivery sequence:
    1. Read and normalize events (caller provided).
    2. Create a unique deterministic batch ID.
    3. Write the batch to a local staging file (.tmp).
    4. Flush the file buffer.
    5. Perform os.fsync.
    6. Atomically rename/move the completed file to outgoing relay folder.
    7. Confirm the final batch exists as a complete non-empty batch.
    8. Only then does caller advance the Event Log checkpoint.

    Returns: (success: bool, batch_id: str)
    """
    if not events:
        return True, ""

    if not batch_id:
        batch_id = f"batch-{device_id}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"

    staging_dir = drive_dir / device_id / "staging"
    outgoing_dir = drive_dir / device_id / "outgoing"

    try:
        staging_dir.mkdir(parents=True, exist_ok=True)
        outgoing_dir.mkdir(parents=True, exist_ok=True)

        staging_path = staging_dir / f"{batch_id}.tmp"
        final_path = outgoing_dir / f"{batch_id}.json"

        batch_payload = {
            "batch_id": batch_id,
            "device_id": device_id,
            "transport": "GOOGLE_DRIVE",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "event_count": len(events),
            "events": events
        }

        # Steps 3, 4, 5: Write, Flush, fsync
        with open(staging_path, "w", encoding="utf-8") as f:
            json.dump(batch_payload, f, indent=2)
            f.flush()
            os.fsync(f.fileno())

        # Step 6: Atomic rename/move to final location
        os.replace(str(staging_path), str(final_path))

        # Step 7: Confirm final batch exists as complete file
        if final_path.exists() and final_path.stat().st_size > 0:
            return True, batch_id
        else:
            logger.error(f"Verification failed: {final_path} does not exist or is empty")
            return False, batch_id

    except Exception as e:
        logger.error(f"Failed to write crash-safe Drive batch {batch_id}: {e}")
        return False, batch_id


def enqueue_offline(events: list[dict], queue_file: Path = OFFLINE_QUEUE_FILE):
    """
    Appends events to the local offline queue file.
    Does NOT advance the checkpoint.
    """
    if not events:
        return
    queue = []
    if queue_file.exists():
        try:
            with open(queue_file, "r", encoding="utf-8") as f:
                queue = json.load(f)
                if not isinstance(queue, list):
                    queue = []
        except Exception:
            queue = []

    queue.extend(events)
    try:
        queue_file.parent.mkdir(parents=True, exist_ok=True)
        with open(queue_file, "w", encoding="utf-8") as f:
            json.dump(queue, f, indent=2)
        logger.info(f"Queued {len(events)} events offline (total buffered: {len(queue)})")
    except Exception as e:
        logger.error(f"Failed to append to offline queue {queue_file}: {e}")


def drain_offline_queue(
    server_url: str,
    device_id: str,
    token: str,
    session: requests.Session = None,
    queue_file: Path = OFFLINE_QUEUE_FILE
) -> int:
    """
    Drains buffered offline events to the server in chronological order via /api/events/batch.
    Removes drained events from disk upon successful acknowledgement.
    """
    if not queue_file.exists():
        return 0

    try:
        with open(queue_file, "r", encoding="utf-8") as f:
            events = json.load(f)
            if not isinstance(events, list) or not events:
                return 0
    except Exception as e:
        logger.warning(f"Failed to read offline queue {queue_file}: {e}")
        return 0

    batch_id = f"offline-{device_id}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    url = f"{normalize_server_url(server_url)}/api/events/batch"
    headers = {
        "Content-Type": "application/json",
        "X-Sensor-Token": token or DEFAULT_SENSOR_TOKEN,
        "X-Device-Id": device_id,
        "X-Transport-Mode": "DIRECT"
    }
    payload = {
        "batch_id": batch_id,
        "device_id": device_id,
        "transport": "DIRECT",
        "events": events
    }

    client = session or requests
    try:
        r = client.post(url, json=payload, headers=headers, timeout=10.0)
        if r.status_code in (200, 201):
            logger.info(f"Successfully drained {len(events)} offline events to {server_url}")
            queue_file.unlink(missing_ok=True)
            return len(events)
        elif r.status_code == 403:
            logger.warning("Device authorization required before draining offline queue (HTTP 403)")
            return 0
        else:
            logger.warning(f"Failed to drain offline queue ({r.status_code}): {r.text[:100]}")
            return 0
    except Exception as e:
        logger.warning(f"Error while draining offline queue to {server_url}: {e}")
        return 0


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


def _normalize_record(record, channel: str, device_id: str) -> dict:
    """Normalizes a raw win32evtlog record into SentinelTwin telemetry schema."""
    eid = record.EventID & 0xFFFF
    record_id = int(record.RecordNumber) if hasattr(record, "RecordNumber") else int(time.time() * 1000) % 1_000_000_000
    ts = datetime.now(timezone.utc).isoformat()
    if hasattr(record, "TimeGenerated") and record.TimeGenerated:
        try:
            ts = record.TimeGenerated.isoformat()
        except Exception:
            ts = str(record.TimeGenerated)

    strings = getattr(record, "StringInserts", []) or []
    username = "Unknown"
    process_name = ""
    command_line = ""

    if eid == 1 and len(strings) > 3:  # Sysmon Process Create
        process_name = strings[4] if len(strings) > 4 and strings[4].endswith(".exe") else strings[3]
        username = strings[11] if len(strings) > 11 else (strings[12] if len(strings) > 12 else "Unknown")
        command_line = strings[9] if len(strings) > 9 else ""
    elif eid in (4688, 4689):  # Windows Process Create / Exit
        process_name = strings[5] if len(strings) > 5 else ""
        username = strings[1] if len(strings) > 1 else "Unknown"
        command_line = strings[8] if len(strings) > 8 else ""
    elif eid in (4624, 4625):  # Windows Logon
        username = strings[5] if len(strings) > 5 else "Unknown"
        process_name = strings[17] if len(strings) > 17 else ""
    else:
        username = strings[5] if len(strings) > 5 else "Unknown"
        process_name = strings[10] if len(strings) > 10 else ""

    hostname = get_hostname()
    return {
        "timestamp": ts,
        "event_timestamp": ts,
        "channel": channel,
        "source": "Sysmon" if "Sysmon" in channel or eid in (1, 3, 11, 22) else channel,
        "event_id": eid,
        "record_id": record_id,
        "event_type": _classify_event_id(eid),
        "hostname": hostname,
        "computer": hostname,
        "device_id": device_id,
        "username": username,
        "process_name": process_name,
        "command_line": command_line,
        "source_ip": get_local_ip(),
    }


def read_channel_events(
    channel: str,
    last_checkpoint: int | None,
    device_id: str = None,
    max_events: int = 50,
    max_scan_chunks: int = 10
) -> tuple[list[dict], int]:
    if not device_id:
        device_id = f"dev-{get_hostname().replace('.', '-')}"
    events = []
    newest_record_in_log = last_checkpoint or 0

    try:
        import win32evtlog

        try:
            handle = win32evtlog.OpenEventLog(None, channel)
        except Exception as e:
            logger.warning(f"Channel {channel} read error: {e}")
            return [], newest_record_in_log

        flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
        records = win32evtlog.ReadEventLog(handle, flags, 0)

        if not records:
            win32evtlog.CloseEventLog(handle)
            return [], newest_record_in_log

        newest_in_log = int(records[0].RecordNumber)

        if last_checkpoint is None:
            newest_record_in_log = newest_in_log
            for record in records[:max_events]:
                eid = record.EventID & 0xFFFF
                if eid in WATCHED_EVENT_IDS:
                    events.append(_normalize_record(record, channel, device_id))
            win32evtlog.CloseEventLog(handle)
            events.sort(key=lambda ev: ev["record_id"])
            return events, newest_record_in_log

        if newest_in_log < last_checkpoint:
            logger.warning(
                f"Channel {channel} record number reset (newest {newest_in_log} < checkpoint {last_checkpoint}). "
                f"Resetting checkpoint to {newest_in_log}."
            )
            win32evtlog.CloseEventLog(handle)
            return [], newest_in_log

        if newest_in_log <= last_checkpoint:
            win32evtlog.CloseEventLog(handle)
            return [], last_checkpoint

        newest_record_in_log = newest_in_log
        reached_checkpoint = False
        chunks_scanned = 0

        while records and not reached_checkpoint and chunks_scanned < max_scan_chunks:
            chunks_scanned += 1
            for record in records:
                rec_num = int(record.RecordNumber)
                if rec_num <= last_checkpoint:
                    reached_checkpoint = True
                    break

                eid = record.EventID & 0xFFFF
                if eid in WATCHED_EVENT_IDS:
                    events.append(_normalize_record(record, channel, device_id))

            if not reached_checkpoint:
                try:
                    records = win32evtlog.ReadEventLog(handle, flags, 0)
                except Exception:
                    break

        win32evtlog.CloseEventLog(handle)

    except ImportError:
        logger.error("pywin32 not installed. Install with: pip install pywin32")
    except Exception as e:
        logger.warning(f"Error reading channel {channel}: {e}")

    events.sort(key=lambda ev: ev["record_id"])
    return events, newest_record_in_log


def read_windows_events(channels: list[str], max_events: int = 50) -> list[dict]:
    """Compatibility wrapper for batch event reading without external checkpoint state."""
    all_events = []
    for channel in channels:
        evts, _ = read_channel_events(channel, last_checkpoint=None, max_events=max_events)
        all_events.extend(evts)
    return all_events


def send_event(
    server: str,
    event: dict,
    session: requests.Session = None,
    token: str = DEFAULT_SENSOR_TOKEN,
    transport: str = "DIRECT"
) -> str:
    """
    Sends normalized event to /api/events.
    Returns: 'sent', 'duplicate', 'forbidden', or 'failed'.
    """
    url = f"{normalize_server_url(server)}/api/events"
    headers = {
        "Content-Type": "application/json",
        "X-Sensor-Token": token or DEFAULT_SENSOR_TOKEN,
        "X-Device-Id": event.get("device_id", ""),
        "X-Transport-Mode": transport
    }
    client = session or requests
    try:
        r = client.post(url, json=event, headers=headers, timeout=3.0)
        if r.status_code in (200, 201):
            return "sent"
        elif r.status_code == 409:
            return "duplicate"
        elif r.status_code == 403:
            logger.warning(f"Telemetry rejected by server (403 Forbidden): {r.text[:100]}")
            return "forbidden"
        logger.warning(f"Server rejected event {event.get('record_id')} ({r.status_code}): {r.text[:120]}")
        return "failed"
    except Exception as e:
        logger.warning(f"Failed to send event: {e}")
        return "failed"


def run(
    server: str = DEFAULT_SERVER,
    interval: int = DEFAULT_INTERVAL,
    private_server: str = None,
    drive_dir: str = None
):
    """
    Main multi-transport sensor loop.
    Detects transports, registers endpoint, monitors event logs, delivers telemetry,
    and supports crash-safe Google Drive fallback and offline queue draining.
    """
    if platform.system() != "Windows":
        logger.error("Windows sensor unavailable on this operating system.")
        logger.info("Run on a Windows machine to collect endpoint telemetry.")
        sys.exit(1)

    device_id, stored_token = get_or_create_device_id()
    token = stored_token or DEFAULT_SENSOR_TOKEN
    drive_path = Path(drive_dir) if drive_dir else DEFAULT_DRIVE_DIR
    cleanup_stale_staging(drive_path, device_id)

    hostname = get_hostname()
    local_ip = get_local_ip()
    logger.info(f"SentinelTwin Sensor starting on {hostname} ({local_ip})")
    logger.info(f"Device ID: {device_id}")
    logger.info(f"Preferred Server: {server} (polling interval: {interval}s)")
    if private_server:
        logger.info(f"Private Network Server: {private_server}")
    logger.info(f"Google Drive Relay Directory: {drive_path}")
    logger.info("This sensor is authorized to collect endpoint telemetry on this machine.")

    channels = ["Security", "Microsoft-Windows-Sysmon/Operational"]
    checkpoints = load_checkpoints()
    if checkpoints:
        logger.info(f"Loaded existing checkpoints: {checkpoints}")
    else:
        logger.info("No existing checkpoints found. Initializing live monitoring checkpoints.")

    # Persistent HTTP session
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "X-Sensor-Token": token,
        "X-Device-Id": device_id
    })

    # Initial registration attempt
    active_server = server
    reg_status = "UNKNOWN"
    if probe_transport(server):
        reg_status, new_token = register_with_server(server, device_id, token=token)
        if new_token:
            token = new_token
            session.headers["X-Sensor-Token"] = token
        logger.info(f"Registration status with direct server: {reg_status}")
    elif private_server and probe_transport(private_server):
        active_server = private_server
        reg_status, new_token = register_with_server(private_server, device_id, token=token)
        if new_token:
            token = new_token
            session.headers["X-Sensor-Token"] = token
        logger.info(f"Registration status with private server: {reg_status}")

    total_sent = 0

    try:
        while True:
            loop_start = time.perf_counter()

            # Dynamic Transport Selection
            current_mode = "DIRECT"
            target_url = server

            if probe_transport(server):
                current_mode = "DIRECT"
                target_url = server
            elif private_server and probe_transport(private_server):
                current_mode = "PRIVATE_NETWORK"
                target_url = private_server
            elif drive_path.exists():
                current_mode = "GOOGLE_DRIVE"
                target_url = None
            else:
                current_mode = "OFFLINE_QUEUE"
                target_url = None

            # Auto-recovery: If Direct or Private HTTP is back online, drain offline queue first
            if current_mode in ("DIRECT", "PRIVATE_NETWORK"):
                drained = drain_offline_queue(target_url, device_id, token, session=session)
                if drained > 0:
                    total_sent += drained

            batch_read = 0
            batch_sent = 0
            batch_duplicates = 0
            batch_failed = 0

            for channel in channels:
                last_cp = checkpoints.get(channel)
                events, newest_seen = read_channel_events(channel, last_cp, device_id)

                if not events:
                    if newest_seen > (last_cp or 0) and current_mode in ("DIRECT", "PRIVATE_NETWORK"):
                        checkpoints[channel] = newest_seen
                        save_checkpoints(checkpoints)
                    continue

                batch_read += len(events)
                channel_cp = last_cp or 0
                delivery_ok = True

                # Delivery by active transport mode
                if current_mode in ("DIRECT", "PRIVATE_NETWORK"):
                    for ev in events:
                        status = send_event(target_url, ev, session=session, token=token, transport=current_mode)
                        if status == "sent":
                            batch_sent += 1
                            total_sent += 1
                            channel_cp = max(channel_cp, ev["record_id"])
                        elif status == "duplicate":
                            batch_duplicates += 1
                            channel_cp = max(channel_cp, ev["record_id"])
                        else:
                            batch_failed += 1
                            delivery_ok = False
                            # Buffer undelivered events to offline queue and do NOT advance checkpoint
                            enqueue_offline(events[events.index(ev):])
                            break

                    if delivery_ok:
                        channel_cp = max(channel_cp, newest_seen)
                    if channel_cp > (last_cp or 0):
                        checkpoints[channel] = channel_cp
                        save_checkpoints(checkpoints)

                elif current_mode == "GOOGLE_DRIVE":
                    # Crash-safe atomic 8-step sequence
                    success, b_id = write_crash_safe_drive_batch(drive_path, device_id, events)
                    if success:
                        batch_sent += len(events)
                        total_sent += len(events)
                        # ONLY advance checkpoint upon verified complete file existence
                        checkpoints[channel] = max(channel_cp, newest_seen)
                        save_checkpoints(checkpoints)
                        logger.info(f"Relayed {len(events)} events via Google Drive batch {b_id}")
                    else:
                        batch_failed += len(events)
                        enqueue_offline(events)

                else:  # OFFLINE_QUEUE
                    enqueue_offline(events)
                    batch_failed += len(events)
                    # Checkpoint intentionally NOT advanced

            if batch_read > 0 or batch_failed > 0:
                logger.info(
                    f"[{current_mode}] Processed: read={batch_read} sent={batch_sent} "
                    f"duplicates={batch_duplicates} failed={batch_failed} (total sent: {total_sent})"
                )

            elapsed = time.perf_counter() - loop_start
            sleep_duration = max(0.05, float(interval) - elapsed)
            time.sleep(sleep_duration)

    finally:
        session.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="SentinelTwin Windows Sensor")
    parser.add_argument("--server", default=DEFAULT_SERVER, help="Central SentinelTwin server URL")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, help="Polling interval in seconds")
    parser.add_argument("--private-server", default=None, help="Private/Overlay network server URL")
    parser.add_argument("--drive-dir", default=None, help="Local Google Drive sync/relay folder path")
    args = parser.parse_args()

    run(
        server=args.server,
        interval=args.interval,
        private_server=args.private_server,
        drive_dir=args.drive_dir
    )
