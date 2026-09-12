import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  Server,
  Laptop,
  Wifi,
  Smartphone,
  Share2,
  Layers,
  ArrowRight,
  CheckCircle2,
  X,
  Activity,
  Cpu,
  RefreshCw,
} from 'lucide-react'
import { Card, SectionHeader, Spinner, EmptyState } from '../components/ui/Card'
import { RiskBadge, StatusBadge, SensorBadge, CategoryBadge } from '../components/ui/Badge'
import { getTopology, runSimulation } from '../api/client'
import { getRiskColor } from '../utils/risk'

export function CyberTwin() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [simSource, setSimSource] = useState('')
  const [simResults, setSimResults] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [filterType, setFilterType] = useState('ALL')
  const [zoom, setZoom] = useState(1)

  const fetchTopologyData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getTopology()
      const data = res.data || {}

      const rawNodes = Array.isArray(data.nodes) ? data.nodes : []
      const rawEdges = Array.isArray(data.edges) ? data.edges : []

      const safeNodes = rawNodes.map((n) => {
        const d = n.data || n
        return {
          ...d,
          ...n,
          id: d.id || n.id,
          hostname: d.hostname || n.hostname || 'Unknown Host',
          ip_address: d.ip_address || d.ip || n.ip_address || n.ip || '0.0.0.0',
          device_type: d.device_type || d.type || n.device_type || 'Node',
          vendor: d.vendor || n.vendor || 'Unknown Vendor',
          mac_address: d.mac_address || n.mac_address || '—',
          status: d.status || n.status || 'Online',
          risk_score: d.risk_score ?? n.risk_score ?? 0,
          risk_level: d.risk_level || n.risk_level || 'ADAPTIVE',
          sensor_connected: Boolean(d.sensor_connected ?? n.sensor_connected),
        }
      })

      const safeEdges = rawEdges.map((e, idx) => {
        const d = e.data || e
        return {
          id: d.id || e.id || `edge-${idx}`,
          source: d.source || e.source,
          target: d.target || e.target,
          relationship: d.relationship || d.relationship_type || 'network_reachability',
        }
      })

      setNodes(safeNodes)
      setEdges(safeEdges)

      if (safeNodes.length > 0 && !selectedNode) {
        setSelectedNode(safeNodes[0])
        setSimSource(safeNodes[0].id || '')
      }
    } catch (err) {
      console.error('Failed to load topology:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedNode])

  useEffect(() => {
    fetchTopologyData()
  }, [fetchTopologyData])

  const handleSimulate = async () => {
    if (!simSource) return
    try {
      setSimulating(true)
      const res = await runSimulation({ source_device: simSource })
      setSimResults(res.data || null)
    } catch (err) {
      console.error('Simulation execution failed:', err)
    } finally {
      setSimulating(false)
    }
  }

  const handleResetSimulation = () => {
    setSimResults(null)
  }

  const filteredNodes = nodes.filter((node) => {
    if (filterType === 'ALL') return true
    const devType = String(node?.device_type || '').toUpperCase()
    return devType.includes(filterType.toUpperCase())
  })

  const getDeviceIcon = (type) => {
    const t = String(type || '').toLowerCase()
    if (t.includes('router') || t.includes('gateway')) return <Wifi className="w-4 h-4 text-cyan-400" />
    if (t.includes('mobile') || t.includes('phone')) return <Smartphone className="w-4 h-4 text-emerald-400" />
    if (t.includes('server')) return <Server className="w-4 h-4 text-indigo-400" />
    return <Laptop className="w-4 h-4 text-slate-300" />
  }

  if (loading && nodes.length === 0) {
    return <Spinner message="Assembling Digital Twin NetworkX Graph..." />
  }

  // Find Gateway & Connected Nodes for topology positioning
  const gatewayNode = nodes.find((n) => {
    const t = (n.device_type || '').toLowerCase()
    const h = (n.hostname || '').toLowerCase()
    return t.includes('router') || t.includes('gateway') || h.includes('gateway') || h.includes('router')
  }) || nodes[0]

  const endpointNodes = nodes.filter((n) => n.id !== gatewayNode?.id)

  const compromisedPath = simResults?.worst_path || []

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 backdrop-blur-md p-4 border border-slate-800/80 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyan-950/60 border border-cyan-800/70 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                Network Digital Twin & Lateral Attack Simulation
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 font-semibold">
                NETWORKX BFS ENGINE
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Live graph modeling, gateway star-topology inference, and blast-radius path simulation
            </p>
          </div>
        </div>

        {/* Filters & Canvas Zoom */}
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Assets ({nodes.length})</option>
            <option value="ROUTER">Gateways ({nodes.filter(n => (n.device_type || '').toLowerCase().includes('router') || (n.device_type || '').toLowerCase().includes('gateway')).length})</option>
            <option value="LAPTOP">Laptops / PCs ({nodes.filter(n => (n.device_type || '').toLowerCase().includes('laptop') || (n.device_type || '').toLowerCase().includes('pc')).length})</option>
            <option value="MOBILE">Mobile Devices ({nodes.filter(n => (n.device_type || '').toLowerCase().includes('mobile')).length})</option>
            <option value="SERVER">Servers ({nodes.filter(n => (n.device_type || '').toLowerCase().includes('server')).length})</option>
          </select>

          <button
            onClick={() => setZoom((z) => Math.min(z + 0.1, 1.5))}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-cyan-400 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.1, 0.7))}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-cyan-400 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-cyan-400 transition"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Canvas + Telemetry Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Graph Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="min-h-[500px] relative overflow-hidden bg-slate-950/90 border-slate-800/90 flex flex-col justify-between">
            <SectionHeader
              title="Active Digital Twin Topology Canvas"
              subtitle="NetworkX node-connectivity model & blast-radius reachability"
              action={
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {nodes.length} Nodes · {edges.length} Edges
                </span>
              }
            />

            {nodes.length === 0 ? (
              <EmptyState
                icon={<Share2 className="w-6 h-6 text-slate-600" />}
                title="No Network Nodes Discovered"
                message="Run network discovery to populate the digital twin graph with local assets."
              />
            ) : (
              <div
                className="relative py-6 px-4 transition-transform duration-200 flex-1 flex flex-col justify-center items-center"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              >
                {/* Visual Gateway Center Node */}
                {gatewayNode && (
                  <div className="flex flex-col items-center mb-8 relative">
                    <div
                      onClick={() => {
                        setSelectedNode(gatewayNode)
                        setSimSource(gatewayNode.id)
                        setDrawerOpen(true)
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 min-w-[200px] text-center ${
                        selectedNode?.id === gatewayNode.id
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                          : compromisedPath.includes(gatewayNode.id)
                          ? 'bg-rose-950/70 border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.4)] animate-pulse'
                          : 'bg-slate-900/90 border-slate-700 hover:border-cyan-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Wifi className="w-4 h-4 text-cyan-400" />
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                          GATEWAY HUB
                        </span>
                      </div>
                      <div className="font-mono font-bold text-xs text-slate-100 truncate">
                        {gatewayNode.hostname}
                      </div>
                      <div className="font-mono text-[11px] text-cyan-400 mt-0.5">
                        {gatewayNode.ip_address}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        Criticality Weight: {gatewayNode.criticality || 4}x
                      </div>
                    </div>

                    {/* Central Vertical Connector Line */}
                    <div className="w-0.5 h-8 bg-gradient-to-b from-cyan-500 to-slate-700 mt-1" />
                  </div>
                )}

                {/* Subnet Endpoints Row */}
                <div className="flex flex-wrap items-center justify-center gap-6 w-full pt-2">
                  {endpointNodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id
                    const isSimOrigin = simSource === node.id
                    const isPathCompromised = compromisedPath.includes(node.id)

                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setSelectedNode(node)
                          setSimSource(node.id)
                          setDrawerOpen(true)
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 min-w-[170px] max-w-[210px] flex-1 text-left ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400'
                            : isPathCompromised
                            ? 'bg-rose-950/70 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          {getDeviceIcon(node.device_type)}
                          <RiskBadge level={node.risk_level || 'ADAPTIVE'} />
                        </div>

                        <div className="text-xs font-mono font-bold text-slate-100 truncate">
                          {node.hostname}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-400 truncate">
                          {node.ip_address}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400 truncate">{node.device_type}</span>
                          {isSimOrigin && (
                            <span className="text-cyan-400 font-bold uppercase tracking-wide bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800 text-[9px]">
                              [ORIGIN]
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Simulation Results Banner */}
            {simResults && (
              <div className="border-t border-rose-900/60 bg-rose-950/30 p-4 rounded-b-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <h4 className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider">
                      Lateral Movement Blast-Radius Findings
                    </h4>
                  </div>
                  <button
                    onClick={handleResetSimulation}
                    className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Reachability</span>
                    <span className="text-slate-200 font-bold">
                      {simResults.reachable_count ?? simResults.target_devices?.length ?? 0} Assets
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Max Depth</span>
                    <span className="text-slate-200 font-bold">{simResults.max_depth ?? simResults.hop_count ?? 1} Hops</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Critical Assets</span>
                    <span className="text-amber-400 font-bold">
                      {simResults.critical_assets?.length ?? 0} At Risk
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Estimated Impact</span>
                    <span className="text-rose-400 font-bold">{simResults.estimated_impact || 'MEDIUM'}</span>
                  </div>
                </div>

                {simResults.worst_path && simResults.worst_path.length > 0 && (
                  <div className="bg-slate-950/90 p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5 font-semibold">
                      Worst-Case Lateral Attack Vector Path:
                    </span>
                    <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
                      {simResults.worst_path.map((nid, i) => (
                        <React.Fragment key={nid}>
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                            {nid}
                          </span>
                          {i < simResults.worst_path.length - 1 && (
                            <span className="text-rose-500 font-bold animate-pulse">➔</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Simulation Controller & Telemetry Drawer */}
        <div className="space-y-4">
          {/* Simulation Controller */}
          <Card className="border-cyan-900/50">
            <SectionHeader
              title="Simulation Controller"
              subtitle="Trigger safe lateral penetration analysis"
            />

            <div className="space-y-3 mt-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 font-semibold">
                  Designated Attack Origin (Patient Zero)
                </label>
                <select
                  value={simSource}
                  onChange={(e) => setSimSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono rounded p-2 focus:outline-none focus:border-cyan-500"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.hostname} ({n.ip_address})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSimulate}
                disabled={simulating || nodes.length === 0}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-mono font-bold rounded flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-950/40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {simulating ? 'Calculating Lateral Vectors...' : 'Execute Twin Simulation'}
              </button>
            </div>
          </Card>

          {/* Node Telemetry Drawer */}
          {selectedNode && drawerOpen ? (
            <Card className="border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <SectionHeader title="Selected Asset Telemetry" />
                <RiskBadge
                  level={selectedNode.risk_level || 'ADAPTIVE'}
                  score={selectedNode.risk_score}
                />
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Hostname</span>
                  <span className="text-slate-100 font-bold">{selectedNode.hostname}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">IP Address</span>
                  <span className="text-cyan-400 font-semibold">{selectedNode.ip_address}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">MAC Address</span>
                  <span className="text-slate-300">{selectedNode.mac_address || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Device Category</span>
                  <span className="text-slate-200">{selectedNode.device_type}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Hardware Vendor</span>
                  <span className="text-slate-300 truncate max-w-[170px]">
                    {selectedNode.vendor || 'Connected Device'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Operating System</span>
                  <span className="text-slate-300">{selectedNode.os || 'Windows'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Sensor Status</span>
                  <SensorBadge connected={selectedNode.sensor_connected} />
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Criticality Weight</span>
                  <span className="text-slate-200 font-bold">{selectedNode.criticality || 1}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Seen</span>
                  <span className="text-slate-400">
                    {selectedNode.last_seen ? new Date(selectedNode.last_seen).toLocaleTimeString() : 'Recent'}
                  </span>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState message="Click an asset on the canvas to inspect real-time telemetry." />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default CyberTwin