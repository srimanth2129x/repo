import React, { useEffect, useState, useCallback } from 'react'
import {
  Dna,
  User,
  Laptop,
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Clock,
  Layers,
  BarChart2,
} from 'lucide-react'
import { getCyberDNAUsers, getCyberDNAProfile, getDevices } from '../api/client'
import { Card, SectionHeader, StatCard, Spinner, EmptyState } from '../components/ui/Card'
import { RiskBadge, StatusBadge } from '../components/ui/Badge'

export function CyberDNA() {
  const [entities, setEntities] = useState([])
  const [devices, setDevices] = useState([])
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  // Load Entities & Devices
  const loadEntities = useCallback(async () => {
    try {
      setLoading(true)
      const [entRes, devRes] = await Promise.all([
        getCyberDNAUsers().catch(() => ({ data: [] })),
        getDevices().catch(() => ({ data: [] })),
      ])

      const entList = Array.isArray(entRes.data) ? entRes.data : []
      const devList = Array.isArray(devRes.data) ? devRes.data : []

      // Merge unique entity list
      const combined = [...entList]
      devList.forEach((d) => {
        if (!combined.some((e) => (e.entity_id || e.id) === d.id)) {
          combined.push({
            entity_id: d.id,
            hostname: d.hostname,
            ip_address: d.ip_address,
            peer_group: d.device_type?.toLowerCase().includes('router') ? 'gateways' : 'workstations',
            metric_count: 0,
            is_device: true,
          })
        }
      })

      setEntities(combined)
      setDevices(devList)

      if (combined.length > 0 && !selectedEntityId) {
        setSelectedEntityId(combined[0].entity_id || combined[0].id)
      }
    } catch (err) {
      console.error('Failed to load CyberDNA entities:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId])

  useEffect(() => {
    loadEntities()
  }, [loadEntities])

  // Load Profile when selected entity changes
  useEffect(() => {
    if (!selectedEntityId) return
    let mounted = true
    setProfileLoading(true)

    getCyberDNAProfile(selectedEntityId)
      .then((res) => {
        if (mounted) {
          setProfile(res.data || null)
        }
      })
      .catch((err) => {
        console.error('Failed to load entity profile:', err)
        if (mounted) setProfile(null)
      })
      .finally(() => {
        if (mounted) setProfileLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedEntityId])

  if (loading) return <Spinner message="Loading CyberDNA Behavioral Profiles..." />

  const metrics = profile?.metrics || {}
  const metricEntries = Object.entries(metrics)
  const hasMetrics = metricEntries.length > 0

  // Calculate overall drift from available metrics
  let totalDriftPct = 0
  let evaluatedMetrics = 0
  metricEntries.forEach(([_, m]) => {
    if (m.mean > 0 && m.short_term_mean !== undefined) {
      const d = (Math.abs(m.short_term_mean - m.mean) / m.mean) * 100
      totalDriftPct += d
      evaluatedMetrics += 1
    }
  })
  const avgDrift = evaluatedMetrics > 0 ? (totalDriftPct / evaluatedMetrics).toFixed(1) : '0.0'
  const isDriftDetected = parseFloat(avgDrift) >= 25.0

  // Selected Entity details
  const currentEntity = entities.find(
    (e) => (e.entity_id || e.id) === selectedEntityId
  ) || {}

  const getMetricFriendlyName = (key) => {
    const map = {
      evt_4688_freq: 'Process Execution Rate',
      process_spawn_rate: 'Process Spawn Rate',
      logon_hour: 'Logon Time-of-Day',
      evt_4624_freq: 'Successful Logons',
      evt_4625_freq: 'Failed Authentication Bursts',
      cmd_length: 'PowerShell / CLI Command Length',
      net_flow_freq: 'Network Connection Frequency',
    }
    return map[key] || key.replace(/_/g, ' ').toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 backdrop-blur-md p-4 border border-slate-800/80 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-violet-950/60 border border-violet-800/70 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.15)]">
            <Dna className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                CyberDNA Behavioral Intelligence
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950/80 border border-violet-800/80 text-violet-300 font-semibold">
                WELFORD ONLINE & EWMA DRIFT
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Continuously calibrated personal baselines, cohort peer-group variance, and statistical drift gating
            </p>
          </div>
        </div>

        <button
          onClick={loadEntities}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-xs font-mono flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Baselines
        </button>
      </div>

      {/* Main Grid: Entity Selector + Profile View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Entity / Asset Selector */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <SectionHeader
              title="Monitored Entities"
              subtitle="Select endpoint or user profile"
            />

            {entities.length === 0 ? (
              <EmptyState message="No entities discovered yet. Run network discovery." />
            ) : (
              <div className="space-y-1.5 mt-3 max-h-[540px] overflow-y-auto pr-1">
                {entities.map((e) => {
                  const id = e.entity_id || e.id
                  const isSelected = selectedEntityId === id
                  const label = e.hostname || e.username || id
                  const peerGroup = e.peer_group || 'workstations'

                  return (
                    <div
                      key={id}
                      onClick={() => setSelectedEntityId(id)}
                      className={`p-2.5 rounded border cursor-pointer transition-all duration-150 text-xs font-mono ${
                        isSelected
                          ? 'bg-violet-950/40 border-violet-500/80 text-slate-100 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
                          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold truncate text-slate-200">{label}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {peerGroup}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center justify-between">
                        <span>{e.ip_address || id}</span>
                        {e.metric_count > 0 ? (
                          <span className="text-violet-400 font-semibold">{e.metric_count} metrics</span>
                        ) : (
                          <span className="text-slate-600">Calibrating</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Detailed Behavioral DNA */}
        <div className="lg:col-span-3 space-y-6">
          {profileLoading ? (
            <Card>
              <Spinner message="Computing behavioral variance and drift..." />
            </Card>
          ) : !profile || !hasMetrics ? (
            <Card>
              <EmptyState
                icon={<Dna className="w-6 h-6 text-violet-400" />}
                title="Waiting for Behavioral Telemetry"
                message={`No baseline entries have been recorded yet for ${
                  currentEntity.hostname || selectedEntityId
                }. Once security events (Process spawns, Network connections, Logons) are ingested, Welford statistical models and EWMA drift meters will calibrate automatically.`}
              />
            </Card>
          ) : (
            <>
              {/* Executive Behavioral KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Drift Meter Card */}
                <Card className="border-violet-900/40 bg-slate-900/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                      Behavioral Drift (EWMA)
                    </span>
                    <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="my-2 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-bold font-mono ${
                        isDriftDetected ? 'text-amber-400' : 'text-violet-400'
                      }`}
                    >
                      {avgDrift}%
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border ${
                        isDriftDetected
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {isDriftDetected ? 'DRIFT DETECTED' : 'STABLE BASELINE'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isDriftDetected ? 'bg-amber-400' : 'bg-violet-400'
                      }`}
                      style={{ width: `${Math.min(parseFloat(avgDrift), 100)}%` }}
                    />
                  </div>
                </Card>

                {/* Peer Group Cohort */}
                <Card className="border-slate-800 bg-slate-900/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                      Cohort Peer Group
                    </span>
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-xl font-bold font-mono text-slate-100 capitalize">
                      {profile.peer_group || 'Workstations'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      {metricEntries.length} active statistical dimensions
                    </div>
                  </div>
                </Card>

                {/* Calibration Maturity */}
                <Card className="border-slate-800 bg-slate-900/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                      Baseline Maturity
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      CALIBRATED
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      Anti-Poisoning Gate Active
                    </div>
                  </div>
                </Card>
              </div>

              {/* Personal vs. Peer Baseline Comparison */}
              <Card>
                <SectionHeader
                  title="Personal Baseline vs. Peer Cohort Comparison"
                  subtitle="Comparing entity mean (μ) against workstation pool baseline"
                />

                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2 px-3">Metric Dimension</th>
                        <th className="py-2 px-3">Personal Baseline (μ ± σ)</th>
                        <th className="py-2 px-3">Short-Term EWMA</th>
                        <th className="py-2 px-3">Peer Cohort (μ ± σ)</th>
                        <th className="py-2 px-3">Cohort Alignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {metricEntries.map(([mkey, m]) => {
                        const hasPeer = m.peer_mean !== undefined
                        const peerDiff = hasPeer ? Math.abs(m.mean - m.peer_mean).toFixed(2) : '—'
                        const isOutlier = hasPeer && m.peer_std_dev && Math.abs(m.mean - m.peer_mean) > 2 * m.peer_std_dev

                        return (
                          <tr key={mkey} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-200">
                                {getMetricFriendlyName(mkey)}
                              </div>
                              <div className="text-[10px] text-slate-500">{mkey}</div>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="text-violet-300 font-bold">{m.mean}</span>
                              <span className="text-slate-500 ml-1">± {m.std_dev}</span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span
                                className={`font-semibold ${
                                  Math.abs(m.short_term_mean - m.mean) > m.std_dev
                                    ? 'text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              >
                                {m.short_term_mean}
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              {hasPeer ? (
                                <span>
                                  <span className="text-indigo-300 font-bold">{m.peer_mean}</span>
                                  <span className="text-slate-500 ml-1">± {m.peer_std_dev}</span>
                                </span>
                              ) : (
                                <span className="text-slate-600">Pending peer calibration</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              {isOutlier ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800 font-bold">
                                  COHORT OUTLIER
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
                                  ALIGNED
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Welford Online Statistics Deep Dive */}
              <Card>
                <SectionHeader
                  title="Welford Incremental Statistics Engine"
                  subtitle="Live statistical variance maintained via streaming O(1) updates"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  {metricEntries.map(([mkey, m]) => (
                    <div
                      key={mkey}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                        <span className="font-bold text-slate-200 truncate">
                          {getMetricFriendlyName(mkey)}
                        </span>
                        <span className="text-[10px] text-violet-400 bg-violet-950/60 px-1.5 py-0.2 rounded border border-violet-800/60">
                          N={m.sample_count}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                        <div>
                          Historical Mean (μ):
                          <div className="text-slate-200 font-bold">{m.mean}</div>
                        </div>
                        <div>
                          Std Deviation (σ):
                          <div className="text-slate-200 font-bold">{m.std_dev}</div>
                        </div>
                        <div>
                          Short-Term EWMA:
                          <div className="text-cyan-400 font-bold">{m.short_term_mean}</div>
                        </div>
                        <div>
                          Variance (σ²):
                          <div className="text-slate-200 font-bold">
                            {(m.std_dev * m.std_dev).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-900 text-[10px] text-slate-500 truncate flex items-center justify-between">
                        <span>Last Updated:</span>
                        <span>{m.last_updated ? new Date(m.last_updated).toLocaleTimeString() : 'Recent'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CyberDNA
