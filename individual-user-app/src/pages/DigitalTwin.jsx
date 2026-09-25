import React, { useState } from 'react'
import {
  Share2,
  Laptop,
  Cpu,
  Globe,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Info,
  Maximize2,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldAlert
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'

export default function DigitalTwin() {
  const { openExplainer } = useApp()
  const [selectedNode, setSelectedNode] = useState({
    id: 'dev-1',
    label: 'My Workstation',
    type: 'Device',
    status: 'Healthy',
    details: 'DESKTOP-INDIVIDUAL (192.168.1.105)',
    blastRadius: 'Low (Local endpoint only)',
    recommendation: 'No threat detected on this node.'
  })

  const [simulatingAttack, setSimulatingAttack] = useState(false)

  const nodes = [
    {
      id: 'dev-1',
      label: 'My Computer',
      sub: 'DESKTOP-INDIVIDUAL',
      type: 'Device',
      status: 'Healthy',
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      icon: Laptop,
      x: '50%',
      y: '45%',
      blastRadius: 'Local workstation root',
      details: 'Primary monitored endpoint running SentinelTwin Individual Agent.'
    },
    {
      id: 'proc-chrome',
      label: 'chrome.exe',
      sub: 'PID: 1420',
      type: 'Process',
      status: 'Healthy',
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      icon: Cpu,
      x: '25%',
      y: '25%',
      blastRadius: 'Browser sandbox container only',
      details: 'Google Chrome web browser. Sandboxing active.'
    },
    {
      id: 'proc-code',
      label: 'code.exe',
      sub: 'PID: 8812',
      type: 'Process',
      status: 'Healthy',
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      icon: Cpu,
      x: '75%',
      y: '25%',
      blastRadius: 'Workspace file scope',
      details: 'Visual Studio Code editor. Standard developer environment.'
    },
    {
      id: 'proc-ps',
      label: 'powershell.exe',
      sub: 'PID: 9104',
      type: 'Process',
      status: simulatingAttack ? 'Threat' : 'Investigating',
      color: simulatingAttack
        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
        : 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      icon: Cpu,
      x: '30%',
      y: '70%',
      blastRadius: simulatingAttack ? 'High — Potential lateral movement' : 'Scripting execution rights',
      details: 'PowerShell runtime with executed command arguments.'
    },
    {
      id: 'net-router',
      label: 'Wi-Fi Gateway',
      sub: '192.168.1.1',
      type: 'Network Destination',
      status: 'Trusted',
      color: 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      icon: Globe,
      x: '70%',
      y: '70%',
      blastRadius: 'Local LAN infrastructure',
      details: 'Standard residential DHCP gateway and DNS resolver.'
    }
  ]

  const handleTwinExplain = () => {
    openExplainer(
      'Digital Twin Concept',
      'What is your personal Digital Twin?',
      'A Digital Twin is a lightweight graph model that mirrors your computer, its running programs, and the network paths it connects to. Rather than guessing, the Digital Twin answers: "If this application were ever infected, what other files, accounts, or devices on my home network could it reach next?"',
      'This helps SentinelTwin stop threats before they spread across your home Wi-Fi or work network.'
    )
  }

  const handleSimulate = () => {
    setSimulatingAttack(prev => !prev)
    if (!simulatingAttack) {
      setSelectedNode({
        id: 'proc-ps',
        label: 'powershell.exe',
        type: 'Process',
        status: 'Compromised (Simulation)',
        details: 'Simulated breach: PowerShell executed encoded script trying to contact external host.',
        blastRadius: 'Attempting connection to 192.168.1.1. Network Sentinel containment engaged.',
        recommendation: 'Verify script source. Terminate process or enable Assisted Host Isolation.'
      })
    }
  }

  return (
    <div className="space-y-6 animate-page pb-8">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Personal Digital Twin Topology
            </h2>
            <Badge variant="info" size="sm" dot>
              Interactive Map
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            A dynamic graph model of your computer, running applications, and network connections. Tap any node to inspect its blast radius and connectivity.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleTwinExplain}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-emerald-500" />
            <span>What is Digital Twin?</span>
          </button>

          <Button
            variant={simulatingAttack ? 'danger' : 'outline'}
            size="sm"
            icon={Zap}
            onClick={handleSimulate}
          >
            {simulatingAttack ? 'Stop Simulation' : 'Test Attack Path'}
          </Button>
        </div>
      </div>

      {/* Main Interactive Graph & Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Visual Graph Canvas (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Endpoint Topology Map"
            subtitle="Click on any node to analyze connection risks"
            className="relative overflow-hidden min-h-[440px]"
          >
            {/* Visual Canvas Area */}
            <div className="relative w-full h-96 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 p-4 flex items-center justify-center overflow-hidden">
              {/* SVG Connecting Links */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-300 dark:stroke-slate-700">
                {/* dev-1 to proc-chrome */}
                <line x1="50%" y1="45%" x2="25%" y2="25%" strokeWidth="2" strokeDasharray="4 4" />
                {/* dev-1 to proc-code */}
                <line x1="50%" y1="45%" x2="75%" y2="25%" strokeWidth="2" strokeDasharray="4 4" />
                {/* dev-1 to proc-ps */}
                <line
                  x1="50%"
                  y1="45%"
                  x2="30%"
                  y2="70%"
                  strokeWidth={simulatingAttack ? '3' : '2'}
                  className={simulatingAttack ? 'stroke-red-500 animate-pulse' : ''}
                />
                {/* proc-ps to net-router */}
                <line
                  x1="30%"
                  y1="70%"
                  x2="70%"
                  y2="70%"
                  strokeWidth={simulatingAttack ? '3' : '2'}
                  strokeDasharray="4 4"
                  className={simulatingAttack ? 'stroke-red-500 animate-pulse' : ''}
                />
              </svg>

              {/* Render Nodes */}
              {nodes.map(node => {
                const Icon = node.icon
                const isSelected = selectedNode?.id === node.id

                return (
                  <div
                    key={node.id}
                    onClick={() =>
                      setSelectedNode({
                        id: node.id,
                        label: node.label,
                        type: node.type,
                        status: node.status,
                        details: node.details,
                        blastRadius: node.blastRadius,
                        recommendation: node.status === 'Healthy'
                          ? 'This node is operating normally within its baseline.'
                          : 'Review active command-line invocations or terminate socket.'
                      })
                    }
                    style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
                    className={`absolute z-10 p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 shadow-md ${
                      node.color
                    } ${
                      isSelected
                        ? 'ring-4 ring-emerald-500/30 scale-105 shadow-xl'
                        : 'hover:scale-105'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold leading-tight">{node.label}</h4>
                        <p className="text-[10px] opacity-75 font-mono">{node.sub}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Status Hint Watermark */}
              <div className="absolute bottom-3 left-4 text-[11px] text-slate-400 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Green: Verified Baseline</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" />
                <span>Amber: Monitored</span>
                {simulatingAttack && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500 ml-2" />
                    <span>Red: Simulated Attack Vector</span>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Node Inspection Drawer / Panel (1 col) */}
        <Card
          title="Node Inspection Details"
          subtitle="Real-time security telemetry of selected entity"
          icon={Info}
        >
          {selectedNode ? (
            <div className="space-y-4 py-1">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Entity Name
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedNode.label}
                </h3>
                <div className="flex items-center space-x-2 mt-1.5">
                  <Badge variant="indigo" size="sm">
                    {selectedNode.type}
                  </Badge>
                  <Badge
                    variant={
                      selectedNode.status.includes('Healthy') || selectedNode.status.includes('Trusted')
                        ? 'shield'
                        : selectedNode.status.includes('Threat') || selectedNode.status.includes('Compromised')
                        ? 'threat'
                        : 'warning'
                    }
                    size="sm"
                    dot
                  >
                    {selectedNode.status}
                  </Badge>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-200 block">
                  Configuration & Details
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedNode.details}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-200 block">
                  Blast Radius & Propagation
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedNode.blastRadius}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1 text-emerald-800 dark:text-emerald-300">
                <span className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Recommendation</span>
                </span>
                <p className="leading-relaxed text-emerald-900 dark:text-emerald-200/90">
                  {selectedNode.recommendation}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">
              Click on any node in the map to view its details.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
