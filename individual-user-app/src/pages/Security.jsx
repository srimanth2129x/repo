import React, { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  FileCheck,
  Cpu,
  Fingerprint,
  Radio,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  DownloadCloud
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Switch from '../components/common/Switch'

export default function Security() {
  const { openExplainer, startScan, isScanning, scanProgress } = useApp()

  // Shield toggles state for UX experimentation
  const [shields, setShields] = useState([
    {
      id: 'behavioral',
      name: 'CyberDNA Behavioral Anomaly Guard',
      desc: 'Continuously correlates running applications against your learned normal patterns using Welford online variance.',
      icon: Fingerprint,
      active: true,
      stats: '1,420 events evaluated today',
      status: 'Healthy',
      explanation: 'CyberDNA Behavioral Guard learns your daily computer habits (when you work, what tools you launch, typical network traffic). If an unrecognized process starts running at odd hours or does something unusual, it alerts you immediately.'
    },
    {
      id: 'network',
      name: 'Outbound Network Sentinel',
      desc: 'Watches active TCP/UDP sockets, DNS lookups, and connections to external hosts.',
      icon: Globe,
      active: true,
      stats: '14 active connections verified',
      status: 'Healthy',
      explanation: 'Network Sentinel ensures malicious software cannot quietly establish external command-and-control backdoors or exfiltrate your private files to unknown servers.'
    },
    {
      id: 'process',
      name: 'Process Integrity & Injection Shield',
      desc: 'Monitors child process spawning, command-line arguments, and memory injection vectors.',
      icon: Cpu,
      active: true,
      stats: '84 background processes signed',
      status: 'Healthy',
      explanation: 'Process Integrity Shield watches for attempts by scripts (like PowerShell or CMD) to execute hidden base64 commands or inject themselves into legitimate system processes like explorer.exe.'
    },
    {
      id: 'file',
      name: 'Ransomware & File Integrity Guard',
      desc: 'Guards Documents, Desktop, and core system folders against sudden bulk encryption or tampering.',
      icon: FileCheck,
      active: true,
      stats: '0 unverified modifications',
      status: 'Healthy',
      explanation: 'This guard monitors file modification rates. If any program starts encrypting your files in bulk like ransomware, SentinelTwin halts execution and prompts for your permission.'
    },
    {
      id: 'mitre',
      name: 'MITRE ATT&CK Threat Triage',
      desc: 'Maps observed security events against the global cybersecurity threat knowledgebase.',
      icon: ShieldAlert,
      active: true,
      stats: 'Zero active hostile tactics',
      status: 'Optimal',
      explanation: 'MITRE ATT&CK is the industry gold standard catalog of known adversary behaviors. When a suspicious event occurs, SentinelTwin tags the exact technique so you know why it matters.'
    },
    {
      id: 'isolation',
      name: 'Assisted Host Isolation',
      desc: 'Provides one-click containment of high-risk network sockets with explicit user consent.',
      icon: Lock,
      active: true,
      stats: 'Standby (Consent enforced)',
      status: 'Ready',
      explanation: 'Rather than disruptive automatic blocks, Assisted Host Isolation asks for your confirmation before safely freezing suspicious network communication, ensuring you always stay in control.'
    }
  ])

  const toggleShield = (id) => {
    setShields(prev =>
      prev.map(s => (s.id === id ? { ...s, active: !s.active } : s))
    )
  }

  const handleExplain = (shield) => {
    openExplainer(
      shield.name,
      `How does ${shield.name} work?`,
      shield.explanation,
      'We recommend keeping this shield active to maintain complete endpoint protection.'
    )
  }

  return (
    <div className="space-y-6 animate-page pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Endpoint Protection Status
            </h2>
            <Badge variant="shield" size="sm" dot>
              All Shields Active
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            SentinelTwin provides multi-layered behavioral defense designed specifically for your personal workstation. All detections require zero cloud telemetry upload of your personal files.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            size="sm"
            icon={RefreshCw}
            onClick={startScan}
            disabled={isScanning}
          >
            {isScanning ? `Verifying (${scanProgress}%)` : 'Verify All Shields'}
          </Button>
        </div>
      </div>

      {/* Shields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shields.map(shield => {
          const Icon = shield.icon
          return (
            <Card
              key={shield.id}
              className="relative overflow-hidden transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3.5">
                  <div className={`p-3 rounded-2xl flex-shrink-0 ${
                    shield.active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {shield.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {shield.desc}
                    </p>
                  </div>
                </div>

                {/* Modern Desktop Switch */}
                <div className="pl-3 shrink-0 flex items-center">
                  <Switch
                    checked={shield.active}
                    onChange={() => toggleShield(shield.id)}
                    title={shield.active ? `Disable ${shield.name}` : `Enable ${shield.name}`}
                  />
                </div>
              </div>

              {/* Card Footer: Live stats + Explainer trigger */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {shield.stats}
                </span>

                <button
                  onClick={() => handleExplain(shield)}
                  className="inline-flex items-center space-x-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How it works</span>
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
