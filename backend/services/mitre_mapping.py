"""
SentinelTwin - Deterministic MITRE ATT&CK Mapping Engine
Evaluates normalized Windows/Sysmon telemetry against 8 core endpoint rules.
"""
from typing import Dict, Any, List, Optional


class MitreMapper:
    TECHNIQUES = {
        "T1059.001": {
            "technique_id": "T1059.001",
            "technique_name": "Command and Scripting Interpreter: PowerShell",
            "tactic": "Execution",
            "confidence": "HIGH"
        },
        "T1059.003": {
            "technique_id": "T1059.003",
            "technique_name": "Command and Scripting Interpreter: Windows Command Shell",
            "tactic": "Execution",
            "confidence": "HIGH"
        },
        "T1003.001": {
            "technique_id": "T1003.001",
            "technique_name": "OS Credential Dumping: LSASS Memory",
            "tactic": "Credential Access",
            "confidence": "VERY HIGH"
        },
        "T1543.003": {
            "technique_id": "T1543.003",
            "technique_name": "Create or Modify System Process: Windows Service",
            "tactic": "Persistence / Privilege Escalation",
            "confidence": "HIGH"
        },
        "T1070.001": {
            "technique_id": "T1070.001",
            "technique_name": "Indicator Removal on Host: Clear Windows Event Logs",
            "tactic": "Defense Evasion",
            "confidence": "VERY HIGH"
        },
        "T1046": {
            "technique_id": "T1046",
            "technique_name": "Network Service Discovery",
            "tactic": "Discovery",
            "confidence": "HIGH"
        },
        "T1082": {
            "technique_id": "T1082",
            "technique_name": "System Information Discovery",
            "tactic": "Discovery",
            "confidence": "MEDIUM"
        },
        "T1041": {
            "technique_id": "T1041",
            "technique_name": "Exfiltration Over C2 Channel",
            "tactic": "Exfiltration",
            "confidence": "MEDIUM"
        },
        "T1053.005": {
            "technique_id": "T1053.005",
            "technique_name": "Scheduled Task/Job: Scheduled Task",
            "tactic": "Persistence / Privilege Escalation",
            "confidence": "HIGH"
        },
        "T1136.001": {
            "technique_id": "T1136.001",
            "technique_name": "Create Account: Local Account",
            "tactic": "Persistence",
            "confidence": "HIGH"
        },
        "T1098": {
            "technique_id": "T1098",
            "technique_name": "Account Manipulation: Privileged Group Addition",
            "tactic": "Persistence / Privilege Escalation",
            "confidence": "HIGH"
        }
    }

    @classmethod
    def evaluate(
        cls,
        event_data: Dict[str, Any],
        behavioral_signals: Optional[List[str]] = None,
        recent_connection_history: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Deterministically evaluates whether an observed event and its context
        match one of the 8 supported MITRE ATT&CK techniques.
        """
        behavioral_signals = behavioral_signals or []
        recent_connection_history = recent_connection_history or []

        event_id_raw = str(event_data.get("event_type") or event_data.get("event_id") or "")
        event_id = event_id_raw.replace("Sysmon_", "").replace("Event_", "").strip()

        details = event_data.get("details", {})
        if isinstance(details, str):
            cmd_line = details.lower()
            proc_name = details.lower()
            target_proc = ""
            access_mask = ""
            outbound_bytes = 0
            dest_port = 0
        else:
            cmd_line = str(details.get("command_line") or details.get("CommandLine") or "").lower()
            proc_name = str(details.get("process_name") or details.get("Image") or details.get("ParentImage") or "").lower()
            target_proc = str(details.get("target_process") or details.get("TargetImage") or "").lower()
            access_mask = str(details.get("granted_access") or details.get("GrantedAccess") or "").upper()
            outbound_bytes = int(details.get("bytes_sent") or details.get("outbound_bytes") or 0)
            dest_port = int(details.get("destination_port") or details.get("DestinationPort") or 0)

        # Fallback to top-level normalized fields if details dict did not populate them
        if not cmd_line and event_data.get("command_line"):
            cmd_line = str(event_data.get("command_line")).lower()
        if not proc_name and event_data.get("process_name"):
            proc_name = str(event_data.get("process_name")).lower()

        supporting_events = [event_data.get("id") or f"evt-{event_id}"]

        # ----------------------------------------------------------------------
        # Rule 1: T1059.001 - PowerShell (Execution)
        # Context: powershell.exe/pwsh.exe + execution flags/encoded/download strings
        # ----------------------------------------------------------------------
        if ("powershell" in proc_name or "pwsh" in proc_name or "powershell.exe" in cmd_line):
            suspicious_indicators = ["-enc", "downloadstring", "iex", "bypass", "-encodedcommand", "invoke-expression"]
            matched_flag = next((flag for flag in suspicious_indicators if flag in cmd_line), None)
            if matched_flag:
                res = dict(cls.TECHNIQUES["T1059.001"])
                res["matched_rule"] = "Suspicious PowerShell Invocations"
                res["reason"] = f"PowerShell spawned with dangerous parameter/behavior: '{matched_flag}'."
                res["supporting_event_ids"] = supporting_events
                res["status"] = "matched"
                return res

        # ----------------------------------------------------------------------
        # Rule 2: T1059.003 - Windows Command Shell (Execution)
        # Context: cmd.exe /c invoking network transfer tools (certutil, bitsadmin, curl)
        # ----------------------------------------------------------------------
        if "cmd.exe" in proc_name or "cmd.exe" in cmd_line:
            lotl_bins = ["certutil", "bitsadmin", "curl"]
            matched_bin = next((b for b in lotl_bins if b in cmd_line), None)
            if matched_bin:
                res = dict(cls.TECHNIQUES["T1059.003"])
                res["matched_rule"] = "Command Shell Living-off-the-Land Invocation"
                res["reason"] = f"Windows Command Prompt executed with secondary utility: '{matched_bin}'."
                res["supporting_event_ids"] = supporting_events
                res["status"] = "matched"
                return res

        # ----------------------------------------------------------------------
        # Rule 3: T1003.001 - LSASS Memory Dumping (Credential Access)
        # Context: Sysmon Event ID 10 + target lsass.exe + specific access masks (0x1010, 0x1F0FFF)
        # ----------------------------------------------------------------------
        if event_id == "10" or "processaccess" in event_id_raw.lower():
            if "lsass.exe" in target_proc or "lsass" in target_proc:
                dangerous_masks = ["0X1010", "0X1F0FFF", "0X1410", "0X143A"]
                if any(m in access_mask for m in dangerous_masks) or "procdump" in proc_name:
                    res = dict(cls.TECHNIQUES["T1003.001"])
                    res["matched_rule"] = "LSASS Process Handle Access Request"
                    res["reason"] = f"Process '{proc_name}' requested high-privilege memory access mask {access_mask} against lsass.exe."
                    res["supporting_event_ids"] = supporting_events
                    res["status"] = "matched"
                    return res

        # ----------------------------------------------------------------------
        # Rule 4: T1543.003 - Windows Service Creation (Persistence / Privilege Escalation)
        # Context: Event 7045 OR Sysmon Event 1 with 'sc create' or 'New-Service'
        # ----------------------------------------------------------------------
        if event_id == "7045" or ("sc" in proc_name and "create" in cmd_line) or "new-service" in cmd_line:
            res = dict(cls.TECHNIQUES["T1543.003"])
            res["matched_rule"] = "Service Installation Signature"
            res["reason"] = "Observed creation of a new Windows Service binary path or service registration."
            res["supporting_event_ids"] = supporting_events
            res["status"] = "matched"
            return res

        # ----------------------------------------------------------------------
        # Rule 5: T1070.001 - Clear Windows Event Logs (Defense Evasion)
        # Context: Event ID 1102, 104 OR wevtutil cl
        # ----------------------------------------------------------------------
        if event_id in ("1102", "104") or "wevtutil" in proc_name or "wevtutil" in cmd_line:
            if "cl" in cmd_line or "clear-log" in cmd_line or event_id in ("1102", "104"):
                res = dict(cls.TECHNIQUES["T1070.001"])
                res["matched_rule"] = "Security/System Audit Log Cleared"
                res["reason"] = f"Audit log destruction activity detected (Event ID: {event_id} or wevtutil cl)."
                res["supporting_event_ids"] = supporting_events
                res["status"] = "matched"
                return res

        # ----------------------------------------------------------------------
        # Rule 6: T1046 - Network Service Discovery (Discovery)
        # Context: Behavioral sequence of rapid connection attempts across ports/hosts
        # ----------------------------------------------------------------------
        if "PORT_SCAN_DETECTED" in behavioral_signals or "NETWORK_SWEEP" in behavioral_signals:
            res = dict(cls.TECHNIQUES["T1046"])
            res["matched_rule"] = "Rapid Multi-Host/Port Sweep"
            res["reason"] = "Behavioral telemetry registered rapid sequential connections across multiple destination endpoints/ports."
            res["supporting_event_ids"] = supporting_events
            res["status"] = "matched"
            return res

        if recent_connection_history:
            unique_targets = {f"{c.get('dest_ip')}:{c.get('dest_port')}" for c in recent_connection_history}
            if len(unique_targets) >= 5:
                res = dict(cls.TECHNIQUES["T1046"])
                res["matched_rule"] = "Sequential Connection Anomaly"
                res["reason"] = f"Host established {len(unique_targets)} distinct network endpoints within the detection window."
                res["supporting_event_ids"] = supporting_events
                res["status"] = "matched"
                return res

        # ----------------------------------------------------------------------
        # Rule 7: T1082 - System Information Discovery (Discovery)
        # Context: Execution of systeminfo.exe (whoami.exe is excluded as per specification)
        # ----------------------------------------------------------------------
        if "systeminfo.exe" in proc_name or "systeminfo.exe" in cmd_line or "systeminfo" == proc_name.strip():
            res = dict(cls.TECHNIQUES["T1082"])
            res["matched_rule"] = "System Profiling Discovery Utility"
            res["reason"] = "Execution of systeminfo.exe to query host architecture, OS build, and patch level."
            res["supporting_event_ids"] = supporting_events
            res["status"] = "matched"
            return res

        # ----------------------------------------------------------------------
        # Rule 8: T1041 - Exfiltration Over C2 Channel (Exfiltration)
        # Context: Validated network telemetry with high outbound volume to non-standard port
        # ----------------------------------------------------------------------
        if "HIGH_OUTBOUND_ANOMALY" in behavioral_signals or (outbound_bytes > 5_000_000 and dest_port not in (80, 443, 8080)):
            res = dict(cls.TECHNIQUES["T1041"])
            res["matched_rule"] = "Outbound Data Anomaly"
            res["reason"] = f"Unusual volumetric outbound transfer ({round(outbound_bytes / (1024*1024), 2)} MB) to port {dest_port} outside baseline."
            res["supporting_event_ids"] = supporting_events
            res["status"] = "matched"
            return res

        # ----------------------------------------------------------------------
        # Rule 9: T1053.005 - Scheduled Task (Persistence / Privilege Escalation)
        # Context: Windows Event 4698 or execution of schtasks.exe
        # ----------------------------------------------------------------------
        if event_id in ("4698", "scheduled_task_created") or "schtasks" in proc_name or "schtasks" in cmd_line:
            res = dict(cls.TECHNIQUES["T1053.005"])
            res["matched_rule"] = "Scheduled Task Persistence / Execution"
            res["reason"] = "Creation or modification of a Windows scheduled task for persistence (Event 4698 / schtasks.exe)."
            res["supporting_event_ids"] = supporting_events
            res["status"] = "matched"
            return res

        # ----------------------------------------------------------------------
        # Rule 10: T1136.001 - Create Account: Local Account (Persistence)
        # Context: Windows Event 4720 or net user /add
        # ----------------------------------------------------------------------
        if event_id in ("4720", "account_created") or ("net" in proc_name and "user" in cmd_line and ("/add" in cmd_line or "-add" in cmd_line)):
            res = dict(cls.TECHNIQUES["T1136.001"])
            res["matched_rule"] = "Local Account Creation"
            res["reason"] = "A new local user account was created on the system (Event 4720 / net user /add)."
            res["supporting_event_ids"] = supporting_events
            res["status"] = "matched"
            return res

        # ----------------------------------------------------------------------
        # Rule 11: T1098 - Account Manipulation (Privilege Escalation)
        # Context: Windows Event 4732 or net localgroup administrators /add
        # ----------------------------------------------------------------------
        if event_id in ("4732", "group_membership_change") or ("localgroup" in cmd_line and ("admin" in cmd_line or "/add" in cmd_line)):
            res = dict(cls.TECHNIQUES["T1098"])
            res["matched_rule"] = "Privileged Group Membership Addition"
            res["reason"] = "A user account was added to a privileged security group (Event 4732 / net localgroup administrators)."
            res["supporting_event_ids"] = supporting_events
            res["status"] = "matched"
            return res

        return None
