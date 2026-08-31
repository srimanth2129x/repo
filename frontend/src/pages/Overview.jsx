import React, { useEffect, useState, useCallback } from 'react'
import { getDashboard, getDashboardSummary } from '../api/client'
import { StatCard, Card, SectionHeader, Spinner, EmptyState } from '../components/ui/Card'
import { getRiskBadgeClass } from '../utils/risk'

export function Overview({ onNav }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // Attempt getDashboard or fallback to getDashboardSummary
      const res = await (getDashboard ? getDashboard() : getDashboardSummary())
      setData(res?.data || {})
    } catch (err) {
      console.error('Failed to load dashboard overview data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 10000)
    return () => clearInterval(timer)
  }, [loadData])

  const handleNav = (targetPage) => {
    if (typeof onNav === 'function') {
      onNav(targetPage)
    }
  }

  if (loading && !data) return <Spinner />

  const d = data || {}
  const risk = d.risk_distribution || {}

  // Normalized counters to support both nested and flat API response structures
  const totalDevices = d.devices?.total ?? d.total_devices ?? d.devices_total ?? 0
  const onlineDevices = d.devices?.online ?? d.online_devices ?? d.devices_online ?? 0
  const totalEvents = d.events?.total ?? d.total_events ?? d.events_count ?? 0
  const openAlerts = d.alerts?.open ?? d.open_alerts ?? d.active_alerts ?? 0
  const highRiskCount = d.incidents?.high_risk ?? d.critical_threats ?? 0
  const connectedSensors = d.sensors?.connected ?? d.active_sensors ?? d.sensors_connected ?? 0
  const twinSims = d.cyber_twin?.simulations ?? 0
  const openIncidents = d.incidents?.open ?? d.active_incidents ?? 0

  return (
    <div className="p-6 space-y-6 font-mono">
      {/* Authorization Notice */}
      <div className="border border-yellow-600/70 bg-yellow-950/40 rounded p-3 text-xs text-yellow-300 flex items-start gap-2">
        <span className="text-yellow-400 font-bold">⚠</span>
        <span>
          Network discovery and digital twin simulations must only be performed on networks and endpoints you own or are explicitly authorized to monitor.
        </span>
      </div>

      {/* Primary Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Devices"
          value={totalDevices}
          sub={`${onlineDevices} online`}
          accent="cyan"
          onClick={() => handleNav('devices')}
        />
        <StatCard
          label="Events"
          value={totalEvents}
          sub="processed"
          accent="violet"
          onClick={() => handleNav('events')}
        />
        <StatCard
          label="Open Alerts"
          value={openAlerts}
          accent={openAlerts > 0 ? 'red' : 'green'}
          onClick={() => handleNav('alerts')}
        />
        <StatCard
          label="High Risk"
          value={highRiskCount}
          accent={highRiskCount > 0 ? 'orange' : 'green'}
          onClick={() => handleNav('incidents')}
        />
      </div>

      {/* Secondary Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Sensors Connected"
          value={connectedSensors}
          accent="cyan"
          onClick={() => handleNav('network')}
        />
        <StatCard
          label="Cyber Twin Sims"
          value={twinSims}
          accent="violet"
          onClick={() => handleNav('cybertwin')}
        />
        <StatCard
          label="Incidents Open"
          value={openIncidents}
          accent={openIncidents > 0 ? 'yellow' : 'green'}
          onClick={() => handleNav('incidents')}
        />
      </div>

      {/* Network Telemetry & Risk Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Network" />
          <div className="space-y-1 text-xs font-mono mt-2">
            {[
              ['Interface', d.network?.interface || d.network?.name || 'Local Subnet'],
              ['Local IP', d.network?.ip || d.network?.ip_address],
              ['Subnet', d.network?.subnet || d.network?.netmask || '255.255.255.0'],
              ['Gateway', d.network?.gateway],
              ['Discovery', d.network?.discovery_active || d.is_monitoring ? '🟢 Active' : '⚪ Idle'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1 border-b border-slate-800/40 last:border-0">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-200">{v || '—'}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Risk Distribution" />
          <div className="space-y-2 mt-2">
            {[
              { label: 'ADAPTIVE', key: 'ADAPTIVE', color: 'bg-green-500' },
              { label: 'SUSPICIOUS', key: 'SUSPICIOUS', color: 'bg-yellow-500' },
              { label: 'HIGH RISK', key: 'HIGH_RISK', color: 'bg-orange-500' },
              { label: 'HOSTILE', key: 'HOSTILE', color: 'bg-red-500' },
            ].map(({ label, key, color }) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-slate-400 w-24">{label}</span>
                <span className="text-slate-200 font-bold">{risk[key] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Alerts Feed */}
      <Card>
        <SectionHeader title="Recent Alerts" />
        {Array.isArray(d.recent_alerts) && d.recent_alerts.length > 0 ? (
          <div className="space-y-2 mt-2">
            {d.recent_alerts.map((a) => {
              const classification = (a.classification || a.severity || 'LOW').toUpperCase()
              return (
                <div
                  key={a.id || Math.random()}
                  className="flex items-center justify-between text-xs p-2.5 bg-[#040d1a] rounded border border-slate-800/60"
                >
                  <span className="text-slate-300 font-medium">{a.title || 'Security Anomaly Detected'}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] ${getRiskBadgeClass(classification)}`}>
                      {classification}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {typeof a.risk_score === 'number' ? a.risk_score.toFixed(0) : a.risk_score || 0}/100
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-2">
            <EmptyState message="No alerts — system nominal" />
          </div>
        )}
      </Card>

      {/* Recent Mutations */}
      <Card>
        <SectionHeader title="Behavioral Mutations" />
        {Array.isArray(d.recent_mutations) && d.recent_mutations.length > 0 ? (
          <div className="space-y-1 mt-2">
            {d.recent_mutations.map((m, i) => {
              const sev = (m.severity || 'LOW').toUpperCase()
              const sevColor =
                sev === 'CRITICAL' || sev === 'HOSTILE'
                  ? 'text-red-400'
                  : sev === 'HIGH' || sev === 'HIGH_RISK'
                  ? 'text-orange-400'
                  : 'text-yellow-400'

              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs p-2.5 bg-[#040d1a] rounded border border-slate-800/60"
                >
                  <span className="text-slate-400">
                    <strong className="text-slate-200">{m.username || 'System User'}</strong> · {m.metric || 'Behavioral Vector'}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 text-[11px]">
                      {typeof m.deviation === 'number' ? m.deviation.toFixed(0) : m.deviation || 0}% dev
                    </span>
                    <span className={`text-[10px] font-semibold uppercase ${sevColor}`}>
                      {sev}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-2">
            <EmptyState message="No mutations detected" />
          </div>
        )}
      </Card>
    </div>
  )
}

export default Overview