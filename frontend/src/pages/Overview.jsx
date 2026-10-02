import React, { useEffect, useState, useCallback } from 'react'
import {
  Shield,
  Activity,
  AlertTriangle,
  Laptop,
  Radio,
  Share2,
  Dna,
  ArrowRight,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { getDashboardSummary, getDevices, getEvents, getAlerts } from '../api/client'
import { Card, SectionHeader, StatCard, Spinner, EmptyState } from '../components/ui/Card'
import { useTheme } from '../context/ThemeContext'

export function Overview({ onNav }) {
  const { isDark } = useTheme()
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
    return <Spinner message="Assembling SOC Executive Telemetry..." />
  }

  // Calculate Real Risk Distribution
  const riskCounts = {
    ADAPTIVE: 0,
    SUSPICIOUS: 0,
    HIGH_RISK: 0,
    HOSTILE: 0,
  }

  let totalScore = 0
  devices.forEach((d) => {
    const level = String(d.risk_level || '').toUpperCase()
    const score = d.risk_score ?? 0
    totalScore += score
    if (level.includes('HOSTILE') || score >= 80) {
      riskCounts.HOSTILE += 1
    } else if (level.includes('HIGH') || score >= 50) {
      riskCounts.HIGH_RISK += 1
    } else if (level.includes('SUSPICIOUS') || score >= 25) {
      riskCounts.SUSPICIOUS += 1
    } else {
      riskCounts.ADAPTIVE += 1
    }
  })

  const avgFleetRisk = devices.length > 0 ? (totalScore / devices.length).toFixed(0) : '0'

  const riskChartData = [
    { name: 'Adaptive (Normal)', value: riskCounts.ADAPTIVE, color: '#10b981' },
    { name: 'Suspicious', value: riskCounts.SUSPICIOUS, color: '#f59e0b' },
    { name: 'High Risk', value: riskCounts.HIGH_RISK, color: '#f97316' },
    { name: 'Hostile Threat', value: riskCounts.HOSTILE, color: '#ef4444' },
  ].filter((item) => item.value > 0)

  const finalChartData = riskChartData.length > 0 ? riskChartData : [
    { name: 'Awaiting Telemetry', value: 1, color: isDark ? '#1e293b' : '#e2e8f0' }
  ]

  const totalDevices = devices.length || summary?.total_devices || 0
  const onlineDevices = devices.filter((d) => (d.status || '').toLowerCase() === 'online').length
  const activeAlerts = alerts.filter((a) => (a.status || '').toUpperCase() !== 'RESOLVED').length
  const highAlerts = alerts.filter((a) => {
    const s = String(a.severity || '').toUpperCase()
    return s.includes('HIGH') || s.includes('CRITICAL')
  }).length
  const totalEvents = summary?.total_events ?? events.length

  const recentTelemetry = events.slice(0, 7)

  // Pipeline architecture nodes
  const pipelineStages = [
    { name: 'Windows Sensor', sub: 'Event Telemetry', active: true },
    { name: 'Event Processing', sub: 'Sysmon & Security', active: true },
    { name: 'CyberDNA', sub: 'Welford Baselines', active: true },
    { name: 'Threat Detection', sub: 'ATT&CK Correlation', active: activeAlerts > 0 },
    { name: 'Risk Engine', sub: 'Point-Attribution', active: true },
    { name: 'Risk Gate', sub: 'Autonomous Triage', active: true },
    { name: 'Digital Twin', sub: 'Network Topology', active: true },
    { name: 'Attack Path', sub: 'BFS Blast-Radius', active: true },
  ]

  return (
    <div className="space-y-6">
      {/* 1. Architecture Pipeline Visual Ribbon */}
      <Card className="bg-slate-50 dark:bg-[#0c1018] border-slate-200 dark:border-[#1e2738] p-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
              SentinelTwin Architecture Pipeline
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
            Observe → Understand → Detect → Score → Simulate → Respond
          </span>
        </div>

        {/* Horizontal Pipeline Steps */}
        <div className="overflow-x-auto pb-1">
          <div className="flex items-center min-w-[760px] justify-between gap-1 text-center font-mono">
            {pipelineStages.map((stage, idx) => (
              <React.Fragment key={stage.name}>
                <div className="flex-1 px-2 py-2 rounded-lg bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800/80 shadow-sm transition hover:border-slate-400 dark:hover:border-slate-600">
                  <div className="text-[10px] font-bold text-slate-900 dark:text-slate-100 truncate">
                    {stage.name}
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {stage.sub}
                  </div>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <span className="text-slate-400 dark:text-slate-600 px-1 text-xs font-bold">➔</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Top Executive KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Overall Fleet Risk"
          value={`${avgFleetRisk} / 100`}
          sub={Number.parseInt(avgFleetRisk, 10) >= 50 ? 'HIGH RISK' : Number.parseInt(avgFleetRisk, 10) >= 25 ? 'SUSPICIOUS' : 'NOMINAL / LOW'}
          accent={Number.parseInt(avgFleetRisk, 10) >= 50 ? 'red' : Number.parseInt(avgFleetRisk, 10) >= 25 ? 'amber' : 'emerald'}
          icon={<Shield className="w-4 h-4" />}
          onClick={() => handleNav('risk')}
        />
        <StatCard
          title="Active Devices"
          value={totalDevices}
          sub={`${onlineDevices} online on local subnet`}
          accent="neutral"
          icon={<Laptop className="w-4 h-4" />}
          onClick={() => handleNav('devices')}
        />
        <StatCard
          title="Active Alerts"
          value={activeAlerts}
          sub={highAlerts > 0 ? `${highAlerts} critical/high priority` : 'Zero active breaches'}
          accent={activeAlerts > 0 ? 'red' : 'emerald'}
          icon={<AlertTriangle className="w-4 h-4" />}
          onClick={() => handleNav('alerts')}
        />
        <StatCard
          title="Events Ingested"
          value={totalEvents.toLocaleString()}
          sub="Normalized & correlated"
          accent="neutral"
          icon={<Activity className="w-4 h-4" />}
          onClick={() => handleNav('events')}
        />
        <StatCard
          title="Digital Twin Sims"
          value={summary?.cyber_twin?.simulations ?? 0}
          sub="Lateral attack scenarios"
          accent="neutral"
          icon={<Share2 className="w-4 h-4" />}
          onClick={() => handleNav('cybertwin')}
        />
      </div>

      {/* 3. Main Central Split: Fleet Risk Distribution & Real-Time Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Risk Distribution */}
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
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={isDark ? '#0c1018' : '#ffffff'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0c1018' : '#ffffff',
                      borderColor: isDark ? '#1e2738' : '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total Assets Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalDevices}</span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Monitored</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-2 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs block">{riskCounts.ADAPTIVE}</span>
              <span className="text-slate-500 dark:text-slate-400">Normal</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-amber-600 dark:text-amber-400 font-bold text-xs block">{riskCounts.SUSPICIOUS}</span>
              <span className="text-slate-500 dark:text-slate-400">Suspicious</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-red-600 dark:text-red-400 font-bold text-xs block">
                {riskCounts.HIGH_RISK + riskCounts.HOSTILE}
              </span>
              <span className="text-slate-500 dark:text-slate-400">Elevated</span>
            </div>
          </div>
        </Card>

        {/* Live Security Ingestion Stream */}
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Live Security Telemetry & Correlation Stream"
            subtitle="Normalized Windows Security & Sysmon events passing through correlation engine"
            action={
              <button
                onClick={() => handleNav('events')}
                className="text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                Full Stream <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          {recentTelemetry.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-6 h-6 text-slate-400" />}
              title="Awaiting Telemetry Ingestion"
              message="No security events recorded yet. Connect Windows Event Sensor or run discovery."
            />
          ) : (
            <div className="space-y-2 mt-2">
              {recentTelemetry.map((ev, i) => {
                const ts = ev.event_timestamp || ev.timestamp
                const timeStr = ts ? new Date(ts).toLocaleTimeString() : 'Recent'
                const host = ev.device_id || ev.source_ip || 'Localhost'
                const eventName = ev.process_name || ev.event_type || 'System Event'

                return (
                  <div
                    key={ev.id || i}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNav('events')}
                    onKeyDown={(evKey) => {
                      if (evKey.key === 'Enter' || evKey.key === ' ') {
                        evKey.preventDefault()
                        handleNav('events')
                      }
                    }}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-xs font-mono transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-slate-400 text-[11px] shrink-0 font-mono">
                        {timeStr}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {eventName}
                      </span>
                      <span className="text-slate-500 text-[11px] hidden sm:inline truncate">
                        on {host}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ev.mitre_technique_id && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold">
                          {ev.mitre_technique_id}
                        </span>
                      )}
                      {ev.risk_score !== undefined && (
                        <span
                          className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border ${
                            ev.risk_score >= 50
                              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                              : ev.risk_score >= 25
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          +{ev.risk_score} pts
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

      {/* 4. Quick SOC Operations & Simulation Triggers */}
      <Card>
        <SectionHeader
          title="Rapid SOC Operations & Simulation Triggers"
          subtitle="Direct operational actions linked to live SentinelTwin engines"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          {/* Quick Action 1: Network Discovery */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleNav('network')}
            onKeyDown={(evKey) => {
              if (evKey.key === 'Enter' || evKey.key === ' ') {
                evKey.preventDefault()
                handleNav('network')
              }
            }}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <Radio className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
              Run Network Discovery
            </div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
              Trigger high-speed 50-thread ping sweep across local subnet to discover active endpoints.
            </p>
          </div>

          {/* Quick Action 2: Attack Propagation */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleNav('cybertwin')}
            onKeyDown={(evKey) => {
              if (evKey.key === 'Enter' || evKey.key === ' ') {
                evKey.preventDefault()
                handleNav('cybertwin')
              }
            }}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <Share2 className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
              Simulate Lateral Movement
            </div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
              Designate patient zero in Digital Twin and evaluate multi-hop BFS blast-radius reachability.
            </p>
          </div>

          {/* Quick Action 3: Inspect Drift */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleNav('cyberdna')}
            onKeyDown={(evKey) => {
              if (evKey.key === 'Enter' || evKey.key === ' ') {
                evKey.preventDefault()
                handleNav('cyberdna')
              }
            }}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <Dna className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
              Inspect Behavioral Drift
            </div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
              Compare personal Welford baselines against cohort peer groups and EWMA drift meters.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Overview