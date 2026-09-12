import React, { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard,
  Shield,
  Activity,
  AlertTriangle,
  Laptop,
  Radio,
  Share2,
  Dna,
  RefreshCw,
  TrendingUp,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { getDashboardSummary, getDevices, getEvents, getAlerts } from '../api/client'
import { Card, SectionHeader, StatCard, Spinner, EmptyState } from '../components/ui/Card'
import { RiskBadge, StatusBadge, MitreBadge } from '../components/ui/Badge'

export function Overview({ onNav }) {
  const [summary, setSummary] = useState(null)
  const [devices, setDevices] = useState([])
  const [events, setEvents] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const [sumRes, devRes, evRes, alRes] = await Promise.all([
        getDashboardSummary().catch(() => ({ data: {} })),
        getDevices().catch(() => ({ data: [] })),
        getEvents({ limit: 10 }).catch(() => ({ data: [] })),
        getAlerts().catch(() => ({ data: [] })),
      ])

      setSummary(sumRes.data || {})
      setDevices(Array.isArray(devRes.data) ? devRes.data : [])
      setEvents(Array.isArray(evRes.data) ? evRes.data : [])
      setAlerts(Array.isArray(alRes.data) ? alRes.data : [])
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
    const timer = setInterval(loadDashboard, 8000)
    return () => clearInterval(timer)
  }, [loadDashboard])

  const handleNav = (page) => {
    if (typeof onNav === 'function') {
      onNav(page)
    }
  }

  if (loading && !summary) {
    return <Spinner message="Assembling SOC Executive Metrics..." />
  }

  // Calculate Real Risk Distribution
  const riskCounts = {
    ADAPTIVE: 0,
    SUSPICIOUS: 0,
    HIGH_RISK: 0,
    HOSTILE: 0,
  }

  devices.forEach((d) => {
    const level = String(d.risk_level || '').toUpperCase()
    const score = d.risk_score ?? 0
    if (level.includes('HOSTILE') || score >= 90) {
      riskCounts.HOSTILE += 1
    } else if (level.includes('HIGH') || score >= 70) {
      riskCounts.HIGH_RISK += 1
    } else if (level.includes('SUSPICIOUS') || score >= 30) {
      riskCounts.SUSPICIOUS += 1
    } else {
      riskCounts.ADAPTIVE += 1
    }
  })

  const riskChartData = [
    { name: 'Adaptive', value: riskCounts.ADAPTIVE, color: '#10b981' },
    { name: 'Suspicious', value: riskCounts.SUSPICIOUS, color: '#f59e0b' },
    { name: 'High Risk', value: riskCounts.HIGH_RISK, color: '#f43f5e' },
    { name: 'Hostile', value: riskCounts.HOSTILE, color: '#ef4444' },
  ].filter((item) => item.value > 0)

  // Fallback if zero devices
  const finalChartData = riskChartData.length > 0 ? riskChartData : [
    { name: 'Waiting for Assets', value: 1, color: '#334155' }
  ]

  const totalDevices = devices.length || summary?.total_devices || 0
  const onlineDevices = devices.filter((d) => (d.status || '').toLowerCase() === 'online').length
  const activeAlerts = alerts.filter((a) => (a.status || '').toUpperCase() !== 'RESOLVED').length
  const criticalCount = alerts.filter((a) => String(a.severity || '').toUpperCase().includes('CRITICAL')).length
  const totalEvents = summary?.total_events ?? events.length

  const recentTelemetry = events.slice(0, 7)

  return (
    <div className="space-y-6">
      {/* Executive Security State Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 backdrop-blur-md p-4 border border-slate-800/80 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyan-950/60 border border-cyan-800/70 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                Security Operations Center (SOC)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-semibold">
                SYSTEM HEALTH: {activeAlerts > 0 ? 'ATTENTION REQUIRED' : 'NOMINAL ENFORCEMENT'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Live threat posture, behavioral anomaly telemetry, and attack propagation reachability
            </p>
          </div>
        </div>

        <button
          onClick={loadDashboard}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-xs font-mono flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Executive Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Monitored Assets"
          value={totalDevices}
          sub={`${onlineDevices} online on subnet`}
          accent="cyan"
          icon={<Laptop className="w-4 h-4 text-cyan-400" />}
          onClick={() => handleNav('devices')}
        />
        <StatCard
          title="Active Alerts"
          value={activeAlerts}
          sub={criticalCount > 0 ? `${criticalCount} critical alerts` : 'Under active watch'}
          accent={activeAlerts > 0 ? 'rose' : 'emerald'}
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          onClick={() => handleNav('alerts')}
        />
        <StatCard
          title="High-Risk Endpoints"
          value={riskCounts.HIGH_RISK + riskCounts.HOSTILE}
          sub="Triggered triage threshold"
          accent={riskCounts.HIGH_RISK + riskCounts.HOSTILE > 0 ? 'amber' : 'green'}
          icon={<Shield className="w-4 h-4 text-amber-400" />}
          onClick={() => handleNav('risk')}
        />
        <StatCard
          title="Telemetry Events"
          value={totalEvents}
          sub="Ingested & normalized"
          accent="violet"
          icon={<Activity className="w-4 h-4 text-violet-400" />}
          onClick={() => handleNav('events')}
        />
        <StatCard
          title="Digital Twin Sims"
          value={summary?.cyber_twin?.simulations ?? 0}
          sub="Propagation scenarios"
          accent="indigo"
          icon={<Share2 className="w-4 h-4 text-indigo-400" />}
          onClick={() => handleNav('cybertwin')}
        />
      </div>

      {/* Main Split: Risk Donut Chart & Live Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Real Risk Distribution Donut Chart */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Fleet Risk Distribution"
              subtitle="Breakdown of monitored assets by behavioral posture"
            />

            <div className="h-56 w-full mt-2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finalChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {finalChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#030712',
                      borderColor: '#1e293b',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-xl font-bold font-mono text-slate-100">{totalDevices}</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">Assets</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 mt-2 grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-emerald-400 font-bold block">{riskCounts.ADAPTIVE}</span>
              <span className="text-slate-500">Adaptive</span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-rose-400 font-bold block">
                {riskCounts.HIGH_RISK + riskCounts.HOSTILE}
              </span>
              <span className="text-slate-500">Elevated</span>
            </div>
          </div>
        </Card>

        {/* Right 2 Cols: Live Telemetry Stream */}
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Live Telemetry & Threat Ingestion Stream"
            subtitle="Normalized Windows Security & Sysmon events passing through correlation"
            action={
              <button
                onClick={() => handleNav('events')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
              >
                Full Stream <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          {recentTelemetry.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-6 h-6 text-slate-600" />}
              title="Waiting for Event Ingestion"
              message="No telemetry events recorded yet. Connect Windows Event Sensor or submit simulated events."
            />
          ) : (
            <div className="space-y-2 mt-3">
              {recentTelemetry.map((ev, i) => {
                const ts = ev.event_timestamp || ev.timestamp
                const timeStr = ts ? new Date(ts).toLocaleTimeString() : 'Recent'
                const host = ev.device_id || ev.source_ip || 'Localhost'
                const eventName = ev.process_name || ev.event_type || 'System Event'

                return (
                  <div
                    key={ev.id || i}
                    className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between text-xs font-mono transition-colors"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-slate-500 text-[11px] font-mono shrink-0">
                        {timeStr}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span className="font-semibold text-slate-200 truncate">
                        {eventName}
                      </span>
                      <span className="text-slate-500 text-[11px] hidden sm:inline truncate">
                        on {host}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ev.mitre_technique_id && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {ev.mitre_technique_id}
                        </span>
                      )}
                      {ev.risk_score !== undefined && (
                        <span
                          className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border ${
                            ev.risk_score >= 70
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : ev.risk_score >= 30
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {ev.risk_score} pts
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Operations Triggers */}
      <Card>
        <SectionHeader
          title="Rapid SOC Operations & Simulation Triggers"
          subtitle="Direct workflows integrated with the running SentinelTwin engine"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          {/* Quick Action 1: Network Discovery */}
          <div
            onClick={() => handleNav('network')}
            className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/80 cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-2">
              <Radio className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-100">
              Run Network Discovery
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Trigger high-speed 50-thread ping sweep across local subnet to map live devices.
            </p>
          </div>

          {/* Quick Action 2: Attack Propagation */}
          <div
            onClick={() => handleNav('cybertwin')}
            className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-indigo-500/80 cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-2">
              <Share2 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-100">
              Simulate Lateral Attack
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Select attack origin in Digital Twin and run multi-hop BFS blast-radius modeling.
            </p>
          </div>

          {/* Quick Action 3: Inspect Drift */}
          <div
            onClick={() => handleNav('cyberdna')}
            className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-violet-500/80 cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-2">
              <Dna className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-100">
              Inspect Behavioral Drift
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Compare personal Welford baselines against cohort peer groups and EWMA meters.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Overview