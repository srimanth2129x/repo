"""
Network Discovery Service
Discovers devices on the authorized local network using OS APIs, NetBIOS, and ARP tables.
No exploitation, no stealth scanning, no credential attacks.
"""
import socket
import subprocess
import platform
import struct
import logging
import uuid
import re
import ipaddress
import psutil
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Extended Vendor OUI prefix database
OUI_MAP = {
    # Virtualization & Lab
    "00:50:56": "VMware",
    "08:00:27": "VirtualBox",
    "b8:27:eb": "Raspberry Pi",
    "dc:a6:32": "Raspberry Pi",
    "e4:5f:01": "Raspberry Pi",
    
    # Network Equipment
    "fc:fb:fb": "Cisco",
    "f0:a7:31": "TP-Link",
    "50:c7:bf": "TP-Link",
    "ec:08:6b": "TP-Link",
    "c0:06:c3": "Netgear",
    "00:1a:2b": "D-Link",
    "cc:40:d0": "D-Link",

    # Amazon (Alexa, Echo, FireTV, Kindle)
    "08:a6:bc": "Amazon",
    "00:71:47": "Amazon",
    "00:bb:3a": "Amazon",
    "00:fc:8b": "Amazon",
    "08:12:a5": "Amazon",
    "08:57:fb": "Amazon",
    "08:84:9d": "Amazon",
    "0c:47:c9": "Amazon",
    "10:ae:60": "Amazon",
    "10:bf:67": "Amazon",
    "40:b4:cd": "Amazon",
    "44:65:0d": "Amazon",
    "50:dc:e7": "Amazon",
    "68:37:e9": "Amazon",
    "68:54:fd": "Amazon",
    "88:71:b1": "Amazon",
    "ac:63:be": "Amazon",
    "fc:a6:67": "Amazon",

    # Apple
    "00:25:00": "Apple",
    "3c:22:fb": "Apple",
    "a4:c3:f0": "Apple",
    "bc:d0:74": "Apple",
    "dc:a9:04": "Apple",
    "f0:18:98": "Apple",

    # Google / Smart Devices
    "00:1a:11": "Google",
    "54:60:09": "Google",
    "d8:6c:63": "Google",
    
    # Chips & PCs
    "00:1b:21": "Intel",
    "00:1f:3b": "Intel",
    "f4:4d:30": "Intel",
    "48:2a:e3": "Realtek",
}


def is_randomized_mac(mac: str) -> bool:
    """Check if MAC is a locally administered (private/randomized) address commonly used by iOS/Android."""
    if not mac or mac == "Unknown" or len(mac) < 2:
        return False
    try:
        second_char = mac[1].lower()
        return second_char in ('2', '6', 'a', 'e')
    except Exception:
        return False


def get_vendor(mac: str) -> str:
    if not mac or mac == "Unknown":
        return "Unknown"
    prefix = mac[:8].lower().replace("-", ":")
    if prefix in OUI_MAP:
        return OUI_MAP[prefix]
    if is_randomized_mac(mac):
        return "Private Device (Mobile)"
    return "Unknown"


def get_interfaces() -> list[dict]:
    """Return list of network interfaces with IP/subnet info using psutil."""
    interfaces = []
    try:
        stats = psutil.net_if_stats()
        addrs = psutil.net_if_addrs()

        for iface_name, addr_list in addrs.items():
            if iface_name in stats and not stats[iface_name].isup:
                continue

            for addr in addr_list:
                if addr.family == socket.AF_INET and not addr.address.startswith("127."):
                    ip = addr.address
                    netmask = addr.netmask or "255.255.255.0"
                    try:
                        net = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)
                        interfaces.append({
                            "name": iface_name,
                            "ip": ip,
                            "netmask": netmask,
                            "subnet": str(net),
                            "prefix_length": net.prefixlen,
                            "gateway": f"{ip.rsplit('.', 1)[0]}.1",
                            "status": "up"
                        })
                    except Exception as e:
                        logger.debug(f"Interface {iface_name} parse error: {e}")
    except Exception as e:
        logger.warning(f"psutil network interface enumeration error: {e}")

    if not interfaces:
        interfaces = _fallback_interfaces()

    return interfaces


def _fallback_interfaces() -> list[dict]:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()

        if ip and not ip.startswith("127."):
            base = ip.rsplit(".", 1)[0]
            return [{
                "name": "Default Network Adapter",
                "ip": ip,
                "netmask": "255.255.255.0",
                "subnet": f"{base}.0/24",
                "prefix_length": 24,
                "gateway": f"{base}.1",
                "status": "up"
            }]
    except Exception as e:
        logger.error(f"Fallback socket resolution failed: {e}")
    return []


def get_arp_table() -> list[dict]:
    """Read ARP/neighbour table from OS."""
    entries = []
    system = platform.system()

    try:
        if system == "Windows":
            result = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=5)
            for line in result.stdout.splitlines():
                m = re.match(r"\s+([\d.]+)\s+([\w-]+)\s+(\w+)", line)
                if m:
                    ip, mac, arp_type = m.groups()
                    mac = mac.replace("-", ":").lower()
                    entries.append({"ip": ip, "mac": mac, "type": arp_type})

        elif system in ("Linux", "Darwin"):
            result = subprocess.run(["arp", "-n"], capture_output=True, text=True, timeout=5)
            for line in result.stdout.splitlines():
                parts = line.split()
                if len(parts) >= 3:
                    ip = parts[0]
                    mac = parts[2] if ":" in parts[2] else "Unknown"
                    try:
                        ipaddress.ip_address(ip)
                        entries.append({"ip": ip, "mac": mac.lower(), "type": "arp"})
                    except ValueError:
                        pass
    except Exception as e:
        logger.warning(f"ARP table read error: {e}")

    logger.info(f"ARP table: {len(entries)} entries")
    return entries


def ping_host(ip: str, timeout: float = 0.4) -> bool:
    """ICMP reachability check."""
    system = platform.system()
    try:
        if system == "Windows":
            result = subprocess.run(
                ["ping", "-n", "1", "-w", str(int(timeout * 1000)), ip],
                capture_output=True, timeout=timeout + 1
            )
        else:
            result = subprocess.run(
                ["ping", "-c", "1", "-W", str(int(timeout)), ip],
                capture_output=True, timeout=timeout + 1
            )
        return result.returncode == 0
    except Exception:
        return False


def resolve_hostname(ip: str, vendor: str = "", device_type: str = "") -> str:
    """Resolve hostname using NetBIOS (Windows nbtstat), reverse DNS, and heuristics."""
    # 1. NetBIOS query
    if platform.system() == "Windows":
        try:
            res = subprocess.run(["nbtstat", "-A", ip], capture_output=True, text=True, timeout=1.2)
            for line in res.stdout.splitlines():
                if "<00>" in line and "UNIQUE" in line:
                    name = line.split()[0].strip()
                    if name:
                        return name
        except Exception:
            pass

    # 2. Standard Reverse DNS
    try:
        socket.setdefaulttimeout(0.8)
        hostname = socket.gethostbyaddr(ip)[0]
        if hostname and hostname != ip:
            return hostname.split(".")[0]
    except Exception:
        pass
    finally:
        socket.setdefaulttimeout(None)

    # 3. Heuristic naming
    if ip.endswith(".1"):
        return "Main-Router"
    if "Amazon" in vendor or device_type == "Smart Speaker":
        return f"Amazon-Echo-{ip.rsplit('.', 1)[-1]}"
    if vendor == "Private Device (Mobile)":
        return f"Phone-{ip.rsplit('.', 1)[-1]}"
    if vendor and vendor != "Unknown":
        return f"{vendor}-{ip.rsplit('.', 1)[-1]}"

    return "Unknown"


def device_id_from_mac(mac: str, ip: str) -> str:
    if mac and mac != "Unknown" and mac not in ("ff:ff:ff:ff:ff:ff", "00:00:00:00:00:00"):
        return mac.replace(":", "").upper()
    return f"IP-{ip.replace('.', '-')}"


def discover_network(interface: dict, timeout: float = 1.0) -> list[dict]:
    """Discover devices on authorized local network."""
    now = datetime.now(timezone.utc).isoformat()
    discovered = {}

    # Step 1: Read ARP table
    for entry in get_arp_table():
        ip = entry["ip"]
        mac = entry["mac"]

        if mac in ("ff:ff:ff:ff:ff:ff", "unknown", "", "00:00:00:00:00:00"):
            continue

        if _ip_in_subnet(ip, interface["subnet"]):
            dev_id = device_id_from_mac(mac, ip)
            if dev_id not in discovered:
                vendor = get_vendor(mac)
                dev_type = _infer_device_type("", vendor, ip, mac)
                hostname = resolve_hostname(ip, vendor, dev_type)
                discovered[dev_id] = {
                    "id": dev_id,
                    "ip_address": ip,
                    "mac_address": mac,
                    "hostname": hostname,
                    "vendor": vendor,
                    "device_type": dev_type,
                    "os": "Unknown",
                    "status": "Online",
                    "first_seen": now,
                    "last_seen": now,
                    "risk_score": 0.0,
                    "risk_level": "ADAPTIVE",
                    "sensor_connected": 0,
                    "trust_level": "Unknown",
                    "discovery_method": "arp"
                }

    # Step 2: Ping sweep to populate OS ARP table
    try:
        net = ipaddress.IPv4Network(interface["subnet"], strict=False)
        if net.prefixlen < 24:
            base = interface["ip"].rsplit(".", 1)[0]
            net = ipaddress.IPv4Network(f"{base}.0/24", strict=False)

        hosts = [str(h) for h in net.hosts() if not str(h).endswith(".255") and str(h) != interface["ip"]]

        import concurrent.futures
        def check_host(ip_str):
            return ip_str, ping_host(ip_str, timeout=0.3)

        with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
            executor.map(check_host, hosts[:254])

        # Step 3: Re-read ARP table after sweep
        for entry in get_arp_table():
            ip = entry["ip"]
            mac = entry["mac"]
            if mac in ("ff:ff:ff:ff:ff:ff", "unknown", "", "00:00:00:00:00:00"):
                continue
            if _ip_in_subnet(ip, interface["subnet"]):
                dev_id = device_id_from_mac(mac, ip)
                if dev_id not in discovered:
                    vendor = get_vendor(mac)
                    dev_type = _infer_device_type("", vendor, ip, mac)
                    hostname = resolve_hostname(ip, vendor, dev_type)
                    discovered[dev_id] = {
                        "id": dev_id,
                        "ip_address": ip,
                        "mac_address": mac,
                        "hostname": hostname,
                        "vendor": vendor,
                        "device_type": dev_type,
                        "os": "Unknown",
                        "status": "Online",
                        "first_seen": now,
                        "last_seen": now,
                        "risk_score": 0.0,
                        "risk_level": "ADAPTIVE",
                        "sensor_connected": 0,
                        "trust_level": "Unknown",
                        "discovery_method": "arp"
                    }

    except Exception as e:
        logger.error(f"Discovery ping sweep error: {e}")

    devices = list(discovered.values())
    logger.info(f"Discovery complete: {len(devices)} devices found")
    return devices


def _ip_in_subnet(ip: str, subnet: str) -> bool:
    try:
        ip_obj = ipaddress.ip_address(ip)
        net_obj = ipaddress.IPv4Network(subnet, strict=False)

        if ip_obj == net_obj.network_address or ip_obj == net_obj.broadcast_address:
            return False
        if ip_obj.is_multicast or ip_obj.is_reserved or ip_obj.is_loopback:
            return False

        return ip_obj in net_obj
    except Exception:
        return False


def _infer_device_type(hostname: str, vendor: str, ip: str = "", mac: str = "") -> str:
    h = hostname.lower()
    v = vendor.lower()

    if "amazon" in v or any(k in h for k in ["echo", "alexa", "amazon"]):
        return "Smart Speaker"
    if ip.endswith(".1") or "tp-link" in v or "cisco" in v or "netgear" in v or any(k in h for k in ["router", "gateway", "gw"]):
        return "Router"
    if any(k in h for k in ["laptop", "notebook", "desktop", "pc", "srimanth"]):
        return "Laptop"
    if v == "private device (mobile)" or is_randomized_mac(mac) or any(k in h for k in ["phone", "iphone", "android", "mobile"]):
        return "Phone"
    if any(k in h for k in ["tv", "chromecast", "firetv", "appletv", "bravia"]):
        return "Smart TV"
    if any(k in h for k in ["printer", "hp", "epson", "canon"]):
        return "Printer"
    if "raspberry" in v or "raspberry" in h:
        return "IoT Device"
    if "apple" in v:
        return "Apple Device"
    return "Unknown"