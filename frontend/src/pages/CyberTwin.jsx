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
} from 'lucide-react'
import { Card, SectionHeader, Spinner, EmptyState, RiskBadge } from '../components/ui/Card'
import { getTopology, runSimulation } from '../api/client'
import { getRiskColor } from '../utils/risk'

export function CyberTwin() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
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
      
      const safeNodes = Array.isArray(data.nodes) ? data.nodes : []
      const safeEdges = Array.isArray(data.edges) ? data.edges : []

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
    return devType === filterType.toUpperCase()
  })

  const getDeviceIcon = (type) => {
    const t = String(type || '').toLowerCase()
    if (t.includes('router') || t.includes('gateway')) return <Wifi className="w-4 h-4 text-cyan-400" />
    if (t.includes('server')) return <Server className="w-4 h-4 text-indigo-400" />
    return <Laptop className="w-4 h-4 text-slate-300" />
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-navy-900/60 p-4 border border-slate-800 rounded">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
              Network Digital Twin & Attack Simulation
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              Graph-inferred posture and blast-radius path modeling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-navy-950 border border-slate-700 text-slate-200 text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Nodes ({nodes.length})</option>
            <option value="ROUTER">Routers / Gateways</option>
            <option value="SERVER">Servers</option>
            <option value="WORKSTATION">Workstations</option>
            <option value="ENDPOINT">Endpoints</option>
          </select>

          <button
            onClick={() => setZoom((z) => Math.min(z + 0.1, 1.6))}
            className="p-1.5 bg-navy-950 border border-slate-700 rounded text-slate-300 hover:text-cyan-400"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.1, 0.6))}
            className="p-1.5 bg-navy-950 border border-slate-700 rounded text-slate-300 hover:text-cyan-400"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 bg-navy-950 border border-slate-700 rounded text-slate-300 hover:text-cyan-400"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="min-h-[480px] relative overflow-hidden bg-navy-950/90 border-slate-800">
            <SectionHeader title="Active Graph Canvas" subtitle="Inferred node connectivity map" />

            {nodes.length === 0 ? (
              <EmptyState message="No network nodes discovered yet. Run a scan from the Network tab." />
            ) : (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              >
                {filteredNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id
                  const isSimSource = simSource === node.id
                  const isCompromised =
                    simResults?.worst_path && simResults.worst_path.includes(node.id)
                  const colors = getRiskColor(node.risk_level)

                  return (
                    <div
                      key={node.id || Math.random()}
                      onClick={() => {
                        setSelectedNode(node)
                        setSimSource(node.id || '')
                      }}
                      className={`p-3 rounded border cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/50'
                          : isCompromised
                          ? 'border-red-500 bg-red-950/40 animate-pulse'
                          : 'border-slate-800 bg-navy-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {getDeviceIcon(node.device_type)}
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: colors.border }}
                        />
                      </div>

                      <div className="text-xs font-mono font-bold text-slate-100 truncate">
                        {node.hostname || 'Unknown Host'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {node.ip_address || '0.0.0.0'}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">{node.device_type || 'Node'}</span>
                        {isSimSource && (
                          <span className="text-cyan-400 font-bold text-[9px] uppercase">[Origin]</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {simResults && (
            <Card className="border-red-900/50 bg-red-950/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h3 className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                    Propagation Simulation Findings
                  </h3>
                </div>
                <button
                  onClick={handleResetSimulation}
                  className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono mb-4">
                <div className="bg-navy-950/80 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Reachability</span>
                  <span className="text-sm font-bold text-slate-100">
                    {simResults.reachable_devices ?? 0} Assets
                  </span>
                </div>
                <div className="bg-navy-950/80 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Hop Depth</span>
                  <span className="text-sm font-bold text-slate-100">
                    {simResults.max_depth ?? 0} Hops
                  </span>
                </div>
                <div className="bg-navy-950/80 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Critical Assets</span>
                  <span className="text-sm font-bold text-orange-400">
                    {simResults.critical_asset_count ?? 0} Exposed
                  </span>
                </div>
                <div className="bg-navy-950/80 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Projected Impact</span>
                  <span className="text-sm font-bold text-red-400">
                    {simResults.estimated_impact || 'UNKNOWN'}
                  </span>
                </div>
              </div>

              {simResults.worst_path && simResults.worst_path.length > 0 && (
                <div className="bg-navy-950 p-2.5 rounded border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Longest Estimated Lateral Movement Vector:
                  </span>
                  <div className="flex items-center flex-wrap gap-2 text-xs font-mono text-slate-200">
                    {simResults.worst_path.map((nodeId, idx) => (
                      <React.Fragment key={nodeId}>
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-semibold">
                          {nodeId}
                        </span>
                        {idx < simResults.worst_path.length - 1 && (
                          <span className="text-slate-600">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="Simulation Controller" subtitle="Trigger safe penetration analysis" />
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Designated Attack Origin
                </label>
                <select
                  value={simSource}
                  onChange={(e) => setSimSource(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 text-slate-200 text-xs font-mono rounded p-2 focus:outline-none focus:border-cyan-500"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.hostname || n.ip_address || n.id} ({n.ip_address || 'No IP'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSimulate}
                disabled={simulating || nodes.length === 0}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 text-xs font-mono font-bold rounded flex items-center justify-center gap-2 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {simulating ? 'Calculating Vectors...' : 'Execute Twin Simulation'}
              </button>
            </div>
          </Card>

          {selectedNode ? (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader title="Selected Node Telemetry" />
                <RiskBadge level={selectedNode.risk_level || 'ADAPTIVE'} />
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Hostname</span>
                  <span className="text-slate-200 font-semibold">{selectedNode.hostname || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">IP Address</span>
                  <span className="text-slate-200">{selectedNode.ip_address || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">MAC Address</span>
                  <span className="text-slate-200">{selectedNode.mac_address || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Device Type</span>
                  <span className="text-slate-200">{selectedNode.device_type || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Vendor</span>
                  <span className="text-slate-200">{selectedNode.vendor || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Sensor Status</span>
                  <span className={selectedNode.sensor_connected ? 'text-emerald-400' : 'text-slate-500'}>
                    {selectedNode.sensor_connected ? 'Connected' : 'Unmonitored'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Risk Score</span>
                  <span className="text-slate-100 font-bold">{selectedNode.risk_score ?? 0.0} / 100</span>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState message="Select an asset on the canvas to inspect telemetry." />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default CyberTwin