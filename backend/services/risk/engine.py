"""
Explainable Risk Engine
Evaluates contextual process lineages, suspicious execution flags,
and behavioral anomalies to generate transparent risk scores.
"""

class RiskEngine:
    def calculate_risk(self, event: dict, cyberdna_result: dict = None) -> dict:
        breakdown = []
        total_points = 0

        # ---------------------------------------------------------
        # 1. CyberDNA Behavioral Outlier Mutation
        # ---------------------------------------------------------
        if cyberdna_result and cyberdna_result.get("is_anomaly"):
            z = cyberdna_result.get("z_score", 0.0)
            pts = min(35, int(z * 8))
            breakdown.append({
                "category": "Behavioral Anomaly (CyberDNA)",
                "points": pts,
                "detail": f"Statistical metric '{cyberdna_result.get('metric_key')}' deviated by {z} sigma"
            })
            total_points += pts

        # ---------------------------------------------------------
        # 2. Authentication Failure Spikes (Event 4625)
        # ---------------------------------------------------------
        event_id = event.get("event_id")
        if event_id == 4625:
            pts = 20
            breakdown.append({
                "category": "Authentication Failure",
                "points": pts,
                "detail": f"Failed Windows Logon (4625) for user: {event.get('user', 'Unknown')}"
            })
            total_points += pts

        # ---------------------------------------------------------
        # 3. Process & Command Line Mutation Analysis (Event 4688)
        # ---------------------------------------------------------
        proc = (event.get("process_name") or "").lower()
        cmd = (event.get("command_line") or "").lower()
        parent = (event.get("parent_process") or "").lower()

        # Check for Living-off-the-Land and scripting binaries
        script_interpreters = ["powershell.exe", "cmd.exe", "wscript.exe", "cscript.exe", "mshta.exe", "certutil.exe"]
        if any(si in proc for si in script_interpreters):
            
            # Evasive execution flags / mutation patterns
            suspicious_flags = [
                "-enc", "-encodedcommand", "-w hidden", "-windowstyle hidden",
                "-nop", "-noprofile", "-noni", "-ep bypass", "bypass",
                "iex", "downloadstring", "downloadfile", "mimikatz",
                "http://", "https://", "vssadmin", "invoke-expression"
            ]
            matched_flags = [flag for flag in suspicious_flags if flag in cmd]
            
            if matched_flags:
                pts = 30
                breakdown.append({
                    "category": "Suspicious Process Execution",
                    "points": pts,
                    "detail": f"Detected evasive execution flags: {', '.join(matched_flags)}"
                })
                total_points += pts

            # Anomalous / Mutated parent process lineages
            unusual_parents = [
                "winword.exe", "excel.exe", "powerpnt.exe", "outlook.exe",
                "acrobat.exe", "acrord32.exe", "wmiprvse.exe", "explorer.exe"
            ]
            matched_parent = next((p for p in unusual_parents if p in parent), None)
            if matched_parent:
                pts = 25
                breakdown.append({
                    "category": "Anomalous Parent Process",
                    "points": pts,
                    "detail": f"Script interpreter spawned by unusual parent application: {event.get('parent_process')}"
                })
                total_points += pts

        final_score = min(100, total_points)

        return {
            "risk_score": final_score,
            "score_type": "Explainable Point Model (0-100 Points)",
            "contributors": breakdown,
            "severity": (
                "Critical" if final_score >= 75
                else "High" if final_score >= 50
                else "Medium" if final_score >= 25
                else "Low"
            )
        }

risk_engine = RiskEngine()