"""
Explainable Risk Engine
Evaluates contextual process lineages, suspicious execution flags,
and behavioral anomalies to generate transparent risk scores.
"""

class RiskEngine:
    """
    Explainable Point-Based Risk Engine & Triage Gate
    - Evaluates CyberDNA personal & peer baselines, behavioral drift
    - Correlates multi-signal threat patterns
    - Classifies threats through a LOW / MEDIUM / HIGH Triage Gate
    - High-risk events trigger Digital Twin propagation analysis
    """

    GATE_LOW_MAX = 29
    GATE_MEDIUM_MAX = 69
    GATE_HIGH_MIN = 70

    def calculate_risk(
        self,
        event: dict,
        cyberdna_result: dict = None,
        correlation_result: dict = None,
        mitre_result: dict = None
    ) -> dict:
        breakdown = []
        total_points = 0

        # ---------------------------------------------------------
        # 1. CyberDNA Personal Baseline Anomaly
        # ---------------------------------------------------------
        if cyberdna_result and cyberdna_result.get("is_anomaly"):
            z = cyberdna_result.get("z_score", 0.0)
            pts = min(35, max(15, int(z * 8)))
            breakdown.append({
                "category": "Behavioral Anomaly (CyberDNA Personal)",
                "points": pts,
                "detail": f"Statistical metric '{cyberdna_result.get('metric_key')}' deviated by {z} sigma from personal baseline"
            })
            total_points += pts

        # ---------------------------------------------------------
        # 2. CyberDNA Peer-Group Anomaly & Deviation
        # ---------------------------------------------------------
        if cyberdna_result and cyberdna_result.get("peer_outlier"):
            pz = cyberdna_result.get("peer_z_score", 0.0)
            p_pts = min(20, max(10, int(pz * 4)))
            breakdown.append({
                "category": "Cohort Anomaly (CyberDNA Peer Group)",
                "points": p_pts,
                "detail": f"Activity deviated by {pz} sigma from {cyberdna_result.get('peer_group', 'workstation')} peer cohort"
            })
            total_points += p_pts

        # ---------------------------------------------------------
        # 3. CyberDNA Behavioral Drift Detection
        # ---------------------------------------------------------
        if cyberdna_result and cyberdna_result.get("drift_detected"):
            d_score = cyberdna_result.get("drift_score", 20.0)
            d_pts = min(15, max(5, int(d_score * 0.2)))
            breakdown.append({
                "category": "Behavioral Drift (CyberDNA)",
                "points": d_pts,
                "detail": f"Gradual behavioral drift detected against historical baseline (score: {d_score})"
            })
            total_points += d_pts

        # ---------------------------------------------------------
        # 4. Authentication Failure Spikes (Event 4625)
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
        # 5. Process & Command Line Mutation Analysis (Event 4688 / Sysmon 1)
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

        # ---------------------------------------------------------
        # 6. MITRE ATT&CK Mapping
        # ---------------------------------------------------------
        if mitre_result:
            m_pts = 20
            breakdown.append({
                "category": f"MITRE ATT&CK ({mitre_result.get('technique_id', '')})",
                "points": m_pts,
                "detail": f"{mitre_result.get('technique_name', 'Technique Matched')}: {mitre_result.get('reason', '')}"
            })
            total_points += m_pts

        # ---------------------------------------------------------
        # 7. Multi-Signal Threat Correlation
        # ---------------------------------------------------------
        if correlation_result and correlation_result.get("has_correlation"):
            for pat in correlation_result.get("patterns_matched", []):
                p_points = pat.get("points", 15)
                breakdown.append({
                    "category": f"Correlated Attack Pattern: {pat.get('pattern')}",
                    "points": p_points,
                    "detail": pat.get("detail", "")
                })
                total_points += p_points

        final_score = min(100, total_points)

        # ---------------------------------------------------------
        # 8. LOW / MEDIUM / HIGH Risk Triage Gate
        # ---------------------------------------------------------
        gate = self.evaluate_gate(final_score)

        return {
            "risk_score": final_score,
            "score_type": "Explainable Point Model (0-100 Points)",
            "contributors": breakdown,
            "severity": (
                "Critical" if final_score >= 75
                else "High" if final_score >= 50
                else "Medium" if final_score >= 25
                else "Low"
            ),
            "triage_level": gate["triage_level"],
            "gate_decision": gate["gate_decision"],
            "trigger_propagation_analysis": gate["trigger_propagation_analysis"]
        }

    def evaluate_gate(self, risk_score: int) -> dict:
        """
        Triage Gate:
        - LOW (0-29): Nominal telemetry; baseline updates only.
        - MEDIUM (30-69): Suspicious telemetry; create alert for review.
        - HIGH (70-100): Critical incident; generate alert & trigger Digital Twin propagation analysis.
        """
        score = int(risk_score)
        if score >= self.GATE_HIGH_MIN:
            return {
                "triage_level": "HIGH",
                "gate_decision": "TRIGGER_PROPAGATION_ANALYSIS",
                "trigger_propagation_analysis": True,
                "description": "Risk score exceeded critical threshold (>=70). Triggering Digital Twin attack path simulation."
            }
        elif score > self.GATE_LOW_MAX:
            return {
                "triage_level": "MEDIUM",
                "gate_decision": "FLAG_SUSPICIOUS_ALERT",
                "trigger_propagation_analysis": False,
                "description": "Suspicious behavior (30-69). Generating security alert for SOC inspection."
            }
        else:
            return {
                "triage_level": "LOW",
                "gate_decision": "LOG_ONLY",
                "trigger_propagation_analysis": False,
                "description": "Nominal activity (0-29). Ingesting for continuous baseline calculation."
            }


risk_engine = RiskEngine()