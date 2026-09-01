"""
Network Discovery Manager - Accurate Device Categorization
Distinguishes Laptops/PCs, Mobile Phones, Gateways, Tablets, and IoT devices.
"""
import socket
import subprocess
import re
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Comprehensive Vendor & Hardware Mapping
OUI_MAP = {
    # Routers & Infrastructure
    "D4:BD:4F": ("Cisco Systems", "Core-Gateway", "Router / Gateway", 4),
    "C4:91:0C": ("Jio Platforms", "JioFiber-Gateway", "Router / Gateway", 4),
    "A8:DA:0C": ("Jio Platforms", "JioFiber-Gateway", "Router / Gateway", 4),
    "E4:8D:8C": ("Jio Platforms", "JioFiber-Gateway", "Router / Gateway", 4),
    "00:1A:2B": ("Cisco Systems", "Cisco-Switch", "Router / Gateway", 3),
    "50:D4:F7": ("TP-Link", "TP-Link-Router", "Router / Gateway", 3),
    "C0:06:C3": ("Netgear", "Netgear-Router", "Router / Gateway", 3),
    "00:0C:43": ("Ralink / MediaTek", "Wireless-AP", "Router / Gateway", 3),

    # PC / Laptop Network Adapters (Intel, Realtek, Broadcom, Dell, HP, Lenovo)
    "00:50:56": ("VMware Virtual", "Virtual-Machine", "Laptop / PC", 2),
    "00:15:5D": ("Microsoft Hyper-V", "Hyper-V-Virtual-Node", "Laptop / PC", 2),
    "A4:BB:6D": ("Dell Inc.", "Dell-PC", "Laptop / PC", 2),
    "8C:16:45": ("HP Inc.", "HP-Laptop", "Laptop / PC", 2),
    "28:D2:44": ("LCFC (Lenovo)", "Lenovo-ThinkPad", "Laptop / PC", 2),
    "54:E1:AD": ("Intel Corporate", "Intel-PC-Workstation", "Laptop / PC", 2),
    "00:1F:3B": ("Intel Corporate", "Intel-PC-Workstation", "Laptop / PC", 2),
    "18:CC:18": ("Realtek Semiconductor", "Realtek-PC-Adapter", "Laptop / PC", 2),
    "30:9C:23": ("Realtek Semiconductor", "Realtek-PC-Adapter", "Laptop / PC", 2),
    "80:6E:DD": ("Intel Corporate", "Intel-WiFi-Laptop", "Laptop / PC", 2),
    "E4:A7:A0": ("AsusTek Computer", "Asus-Laptop", "Laptop / PC", 2),
    "00:28:F8": ("Acer Inc.", "Acer-Laptop", "Laptop / PC", 2),
    "F0:99:B6": ("Apple Inc.", "Apple-MacBook", "Laptop / PC", 2),
    "60:F8:1D": ("Apple Inc.", "Apple-MacBook", "Laptop / PC", 2),

    # Mobile Phones & Smart Devices
    "08:02:3C": ("Samsung Electronics", "Samsung-Galaxy-S24", "Mobile", 1),
    "40:16:3B": ("Samsung Electronics", "Samsung-Galaxy-Phone", "Mobile", 1),
    "80:5B:65": ("Samsung Electronics", "Samsung-Phone", "Mobile", 1),
    "3C:22:FB": ("Apple Inc.", "Apple-iPhone", "Mobile", 1),
    "BC:D0:74": ("Apple Inc.", "Apple-iPhone", "Mobile", 1),
    "A4:C3:F0": ("Apple Inc.", "Apple-iPhone", "Mobile", 1),
    "CC:F5:5F": ("OnePlus / OPPO", "OnePlus-Phone", "Mobile", 1),
    "9C:2E:A1": ("OnePlus Technology", "OnePlus-Phone", "Mobile", 1),
    "C8:47:8C": ("Vivo Mobile", "Vivo-Phone", "Mobile", 1),
    "A4:3B:B0": ("Realme Mobile", "Realme-Phone", "Mobile", 1),
    "64:CC:2E": ("Xiaomi Communications", "Redmi-Phone", "Mobile", 1),

    # Tablets & Wearables
    "DC:A9:04": ("Apple Inc.", "Apple-iPad", "Tablet", 1),
    "50:64:2B": ("Samsung Electronics", "Galaxy-Tab", "Tablet", 1),

    # Smart TVs / Media / IoT
    "50:01:D9": ("Samsung Electronics", "Samsung-Smart-TV", "Smart Media / IoT", 2),
    "38:2C:4A": ("Jio Platforms", "Jio-SetTopBox", "Smart Media / IoT", 2),
    "68:54:5A": ("Amazon Technologies", "Amazon-FireTV", "Smart Media / IoT", 1),
    "D4:F5:47": ("Google LLC", "Google-Chromecast", "Smart Media / IoT", 1),
    "D8:3A:DD": ("Espressif IoT", "Smart-IoT-Device", "Smartwatch / IoT", 1),
    "B8:27:EB": ("Raspberry Pi", "Raspberry-Pi", "Smartwatch / IoT", 2)
}

class NetworkDiscoveryManager:
    def __init__(self):
        self.is_monitoring = False

    def _query_netbios(self, ip: str) -> str:
        """Checks NetBIOS to detect Windows Workstations and SMB shares."""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(0.2)
            query = (
                b"\x82\x28\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00"
                b"\x20\x43\x4b\x41\x41\x41\x41\x41\x41\x41\x41\x41"
                b"\x41\x41\x41\x41\x41\x41\x41\x41\x41\x41\x41\x41"
                b"\x41\x41\x41\x41\x41\x41\x41\x41\x00\x00\x21\x00\x01"
            )
            sock.sendto(query, (ip, 137))
            data, _ = sock.recvfrom(1024)
            sock.close()
            if len(data) > 57 and data[56] > 0:
                name = data[57:57+15].decode("ascii", errors="ignore").strip()
                if name and not name.startswith("IS~"):
                    return name
        except Exception:
            pass
        return None

    def _check_pc_ports(self, ip: str) -> bool:
        """Tests ports typically open on PC/Laptops (SMB 445, RPC 135, RDP 3389)."""
        for port in (135, 445, 3389):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(0.08)
                    if s.connect_ex((ip, port)) == 0:
                        return True
            except Exception:
                continue
        return False

    def _fingerprint_device(self, ip: str, mac: str) -> tuple:
        mac_clean = mac.upper() if mac else ""
        oui = ":".join(mac_clean.split(":")[:3]) if mac_clean else ""

        # 1. Gateways / Routers
        if ip.endswith(".0.1") or ip.endswith(".1") or ip == "10.107.0.1":
            return f"Gateway-{ip}", "Network Gateway", "Router / Gateway", 4

        # 2. Match exact OUI database
        if oui in OUI_MAP:
            vendor, default_name, dev_type, crit = OUI_MAP[oui]
            netbios = self._query_netbios(ip)
            return (netbios or default_name), vendor, dev_type, crit

        # 3. Check if it's a PC/Laptop via NetBIOS or standard Windows/RPC ports
        netbios_name = self._query_netbios(ip)
        if netbios_name or self._check_pc_ports(ip):
            host_name = netbios_name if netbios_name else f"Workstation-{ip.split('.')[-1]}"
            return host_name, "PC / Workstation Host", "Laptop / PC", 2

        # 4. Check for True Locally Administered / Private MAC Address
        # Formally, bit 1 of the first byte must be 1 (0bxxxxxx1x)
        is_private_random_mac = False
        try:
            first_byte = int(mac_clean.split(":")[0], 16)
            if (first_byte & 0b00000010) != 0:
                is_private_random_mac = True
        except Exception:
            pass

        if is_private_random_mac:
            return f"Mobile-Client-{ip.split('.')[-1]}", "Wireless Client (Private MAC)", "Mobile", 1

        # 5. Default generic fallback (Generic network workstation)
        return f"Node-{ip.split('.')[-1]}", "Network Endpoint", "Laptop / PC", 2

    def _get_arp_table(self) -> dict:
        arp_entries = {}
        try:
            output = subprocess.check_output(["arp", "-a"], text=True, stderr=subprocess.DEVNULL)
            pattern = re.compile(r"(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F]{2}(?:-[0-9a-fA-F]{2}){5})\s+(\w+)")
            for match in pattern.finditer(output):
                ip, mac, _ = match.groups()
                mac_formatted = mac.replace("-", ":").upper()
                if not (
                    ip.startswith("224.") or 
                    ip.startswith("239.") or 
                    ip.startswith("169.254.") or 
                    ip.endswith(".255") or 
                    ip == "255.255.255.255" or
                    mac_formatted == "FF:FF:FF:FF:FF:FF"
                ):
                    arp_entries[ip] = mac_formatted
        except Exception as e:
            logger.error(f"Failed to read ARP cache: {e}")
        return arp_entries

    def scan_network(self, interface_ip: str = None, subnet: str = None) -> list:
        discovered = []
        now = datetime.now(timezone.utc).isoformat()
        seen_ips = set()

        # Local Host Machine
        try:
            hostname = socket.gethostname()
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
        except Exception:
            hostname = socket.gethostname()
            local_ip = "10.107.4.78"

        seen_ips.add(local_ip)
        discovered.append({
            "id": f"dev-{local_ip.replace('.', '-')}",
            "ip_address": local_ip,
            "mac_address": "00:50:56:C0:00:01",
            "hostname": hostname,
            "vendor": "Local PC (This Device)",
            "device_type": "Laptop / PC",
            "os": "Windows 11",
            "status": "Online",
            "first_seen": now,
            "last_seen": now,
            "criticality": 3
        })

        arp_table = self._get_arp_table()
        for ip, mac in arp_table.items():
            if ip not in seen_ips:
                seen_ips.add(ip)
                hostname, vendor, dev_type, crit = self._fingerprint_device(ip, mac)

                discovered.append({
                    "id": f"dev-{ip.replace('.', '-')}",
                    "ip_address": ip,
                    "mac_address": mac,
                    "hostname": hostname,
                    "vendor": vendor,
                    "device_type": dev_type,
                    "os": "Windows / Linux" if dev_type == "Laptop / PC" else "Mobile / Embedded OS",
                    "status": "Online",
                    "first_seen": now,
                    "last_seen": now,
                    "criticality": crit
                })

        return discovered
    def _fingerprint_device(self, ip: str, mac: str) -> tuple:
        mac_clean = mac.upper() if mac else ""
        oui = ":".join(mac_clean.split(":")[:3]) if mac_clean else ""

        # 1. Gateways / Routers
        if ip.endswith(".1") or ip.endswith(".0.1"):
            return f"Gateway-{ip}", "Network Gateway", "Router / Gateway", 4

        # 2. Query NetBIOS & DNS (Real system hostname if available)
        netbios_name = self._query_netbios(ip)
        dns_name = self._query_dns(ip)
        discovered_name = netbios_name or dns_name

        if discovered_name and not discovered_name.lower().startswith(("node-", "host-", "endpoint-")):
            d_lower = discovered_name.lower()
            if any(k in d_lower for k in ("desktop", "laptop", "pc", "win", "macbook", "workstation")):
                return discovered_name, "Windows / PC Host", "Laptop / PC", 2
            if any(k in d_lower for k in ("ipad", "tab")):
                return discovered_name, "Tablet Device", "Tablet", 1
            if any(k in d_lower for k in ("phone", "iphone", "galaxy", "pixel", "oneplus")):
                return discovered_name, "Mobile Device", "Mobile", 1
            if any(k in d_lower for k in ("tv", "watch", "iot", "cam", "cast", "echo")):
                return discovered_name, "Smart Media / IoT", "Smartwatch / IoT", 1

        # 3. Check Known OUI Mapping
        if oui in OUI_MAP:
            vendor, default_name, dev_type, crit = OUI_MAP[oui]
            return (discovered_name or default_name), vendor, dev_type, crit

        # 4. Check for Private / Randomized MAC addresses (Smartphones)
        is_private_mac = False
        if mac_clean and len(mac_clean) >= 2 and mac_clean[1] in ("2", "6", "A", "E"):
            is_private_mac = True

        # 5. Clean Fallback Names
        if is_private_mac:
            return "Mobile Phone", "Smartphone / Mobile", "Mobile", 1
        else:
            return "Laptop / PC", "Workstation Endpoint", "Laptop / PC", 2
def get_arp_table_devices(self) -> list:
        """Reads the Windows ARP table to discover active local endpoints."""
        import subprocess
        import re

        devices = []
        try:
            output = subprocess.check_output("arp -a", shell=True, text=True, stderr=subprocess.DEVNULL)
            for line in output.splitlines():
                match = re.search(r"(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17}|[0-9a-fA-F:]{17})\s+(\w+)", line)
                if match:
                    ip, mac, arp_type = match.groups()
                    mac = mac.replace("-", ":").upper()

                    # Filter out broadcast/multicast addresses
                    if ip.endswith(".255") or ip.startswith("224.") or ip.startswith("239.") or mac == "FF:FF:FF:FF:FF:FF":
                        continue

                    hostname, vendor, dev_type, crit = self._fingerprint_device(ip, mac)
                    devices.append({
                        "id": f"dev-{ip.replace('.', '-')}",
                        "ip_address": ip,
                        "mac_address": mac,
                        "hostname": hostname,
                        "vendor": vendor,
                        "device_type": dev_type,
                        "os": "Windows / Generic OS",
                        "status": "Online",
                        "criticality": crit
                    })
        except Exception as e:
            logger.error(f"Error reading ARP cache: {e}")

        return devices
discovery_manager = NetworkDiscoveryManager()