"""
Normalized Windows Event Parser
"""
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

def parse_windows_event_xml(xml_content: str) -> dict:
    try:
        root = ET.fromstring(xml_content)
    except Exception as e:
        logger.error(f"Failed to parse XML: {e}")
        return {}

    ns = {"e": "http://schemas.microsoft.com/win/2004/08/events/event"}
    system = root.find("e:System", ns)
    if system is None:
        return {}

    event_id_elem = system.find("e:EventID", ns)
    event_id = int(event_id_elem.text) if event_id_elem is not None and event_id_elem.text else 0

    record_id_elem = system.find("e:EventRecordID", ns)
    record_id = int(record_id_elem.text) if record_id_elem is not None and record_id_elem.text else 0

    channel_elem = system.find("e:Channel", ns)
    channel = channel_elem.text if channel_elem is not None and channel_elem.text else "Security"

    computer_elem = system.find("e:Computer", ns)
    computer = computer_elem.text if computer_elem is not None and computer_elem.text else "localhost"

    time_created = system.find("e:TimeCreated", ns)
    if time_created is not None and "SystemTime" in time_created.attrib:
        event_timestamp = time_created.attrib["SystemTime"]
    else:
        event_timestamp = datetime.now(timezone.utc).isoformat()

    event_data = {}
    ed = root.find("e:EventData", ns)
    if ed is not None:
        for data in ed.findall("e:Data", ns):
            name = data.attrib.get("Name")
            val = data.text or ""
            if name:
                event_data[name] = val

    normalized = {
        "event_id": event_id,
        "record_id": record_id,
        "channel": channel,
        "device_id": f"dev-{computer.replace('.', '-')}",
        "computer": computer,
        "event_timestamp": event_timestamp,
        "user": None,
        "process_name": None,
        "parent_process": None,
        "command_line": None,
        "source_ip": None,
        "logon_type": None,
        "metadata": event_data
    }

    if event_id == 4624:
        normalized["user"] = event_data.get("TargetUserName")
        normalized["source_ip"] = event_data.get("IpAddress")
        normalized["logon_type"] = event_data.get("LogonType")
    elif event_id == 4625:
        normalized["user"] = event_data.get("TargetUserName")
        normalized["source_ip"] = event_data.get("IpAddress")
        normalized["logon_type"] = event_data.get("LogonType")
    elif event_id == 4688:
        normalized["user"] = event_data.get("SubjectUserName")
        normalized["process_name"] = event_data.get("NewProcessName")
        normalized["parent_process"] = event_data.get("ParentProcessName")
        normalized["command_line"] = event_data.get("CommandLine")

    return normalized