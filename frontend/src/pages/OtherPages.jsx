import React, { useEffect, useState } from 'react'
import {
  getIncidents,
  getRiskDevices,
  getRiskSummary,
  getCyberDNAUsers,
  getCyberDNAUser,
  getDevices,
} from '../api/client'
import { Card, SectionHeader, Spinner, EmptyState } from '../components/ui/Card'
import { getRiskBadgeClass, getRiskBarColor } from '../utils/risk'

// ---------------------------------------------------------------------------
// 1. Incidents Component
// ---------------------------------------------------------------------------
export function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getIncidents()
      .then((r) => setIncidents(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <Card>
        <SectionHeader title={`Incidents (${incidents.length})`}>
          Incidents ({incidents.length})
        </SectionHeader>
        {loading ? (
          <Spinner />
        ) : incidents.length === 0 ? (
          <EmptyState message="No incidents" />
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => (
              <div
                key={inc.id || Math.random()}
                className="p-3 rounded border border-slate-700 hover:border-slate-600 bg-[#040d1a]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-200">
                      #{inc.id} — {inc.title || 'Security Anomaly'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">
                      Device: {inc.device_id || 'Localhost'} · {inc.created_at || 'Recent'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {typeof inc.risk_score === 'number' ? inc.risk_score.toFixed(0) : inc.risk_score ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-500">/ 100</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded border text-xs font-mono ${getRiskBadgeClass(
                        inc.classification
                      )}`}
                    >
                      {inc.classification || 'ADAPTIVE'}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        inc.status === 'OPEN'
                          ? 'bg-blue-900 text-blue-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {inc.status || 'CLOSED'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Risk Intelligence Component
// ---------------------------------------------------------------------------
export function RiskIntel() {
  const [devices, setDevices] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getRiskDevices().catch(() => ({ data: [] })),
      getRiskSummary().catch(() => ({ data: {} })),
    ])
      .then(([devRes, sumRes]) => {
        setDevices(devRes.data || [])
        setSummary(sumRes.data || {})
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'ADAPTIVE', label: 'Adaptive', color: 'text-green-400' },
          { key: 'SUSPICIOUS', label: 'Suspicious', color: 'text-yellow-400' },
          { key: 'HIGH_RISK', label: 'High Risk', color: 'text-orange-400' },
          { key: 'HOSTILE', label: 'Hostile', color: 'text-red-400' },
        ].map(({ key, label, color }) => (
          <Card key={key}>
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-3xl font-bold ${color}`}>{summary[key] ?? 0}</div>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHeader title="Device Risk Ranking">Device Risk Ranking</SectionHeader>
        {loading ? (
          <Spinner />
        ) : devices.length === 0 ? (
          <EmptyState message="No risk data" />
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <div
                key={d.id || d.ip_address || Math.random()}
                className="flex items-center gap-3 text-xs font-mono p-2 rounded hover:bg-[#040d1a]"
              >
                <div className="w-32 text-cyan-300 truncate">{d.ip_address || '0.0.0.0'}</div>
                <div className="w-40 text-slate-400 truncate">{d.hostname || '—'}</div>
                <div className="flex-1">
                  <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${d.risk_score ?? 0}%`,
                        backgroundColor: getRiskBarColor(d.risk_score),
                      }}
                    />
                  </div>
                </div>
                <div className="w-10 text-right text-slate-300">
                  {(d.risk_score ?? 0).toFixed(0)}
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded border text-[10px] ${getRiskBadgeClass(
                    d.risk_level
                  )}`}
                >
                  {d.risk_level || 'ADAPTIVE'}
                </span>
                {d.sensor_connected ? (
                  <span className="text-cyan-400 text-[10px]">SENSOR</span>
                ) : (
                  <span className="text-slate-600 text-[10px]">NO SENSOR</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. CyberDNA Component
// ---------------------------------------------------------------------------
export function CyberDNA() {
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    getCyberDNAUsers()
      .then((r) => setUsers(r.data || []))
      .catch(console.error)
  }, [])

  const loadProfile = (username, device_id) => {
    setSelected({ username, device_id })
    const identifier = username || device_id
    getCyberDNAUser(identifier)
      .then((r) => setProfile(r.data))
      .catch(console.error)
  }

  return (
    <div className="p-6 space-y-4 font-mono">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <SectionHeader title="Users / Devices">Users / Devices</SectionHeader>
          {users.length === 0 ? (
            <EmptyState message="No behavioral data yet — connect sensors" />
          ) : (
            users.map((u, i) => (
              <div
                key={i}
                onClick={() => loadProfile(u.username, u.device_id)}
                className={`p-2 rounded cursor-pointer text-xs font-mono mb-1 ${
                  selected?.username === u.username
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                    : 'hover:bg-[#040d1a] text-slate-300'
                }`}
              >
                <div className="font-bold">{u.username || 'System User'}</div>
                <div className="text-slate-500 text-[11px]">{u.device_id || 'Endpoint'}</div>
              </div>
            ))
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {profile ? (
            <>
              <Card>
                <SectionHeader title={`CyberDNA — ${profile.username || 'User Profile'}`}>
                  CyberDNA — {profile.username || 'User Profile'}
                </SectionHeader>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono mt-2">
                  <div className="bg-[#040d1a] p-3 rounded border border-slate-800">
                    <div className="text-slate-500 mb-1">Behavior Stability</div>
                    <div className="text-2xl font-bold text-cyan-400">
                      {(profile.behavior_stability ?? 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-[#040d1a] p-3 rounded border border-slate-800">
                    <div className="text-slate-500 mb-1">Mutations Detected</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {profile.mutation_count ?? profile.mutations?.length ?? 0}
                    </div>
                  </div>
                  <div className="bg-[#040d1a] p-3 rounded border border-slate-800">
                    <div className="text-slate-500 mb-1">Profile Maturity</div>
                    <div className="text-2xl font-bold text-green-400">
                      {profile.profile_maturity || 'Baseline Ready'}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHeader title="Behavioral Baselines">Behavioral Baselines</SectionHeader>
                <div className="space-y-1 mt-2">
                  {profile.baselines?.map((b, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs font-mono py-1 border-b border-slate-900"
                    >
                      <span className="text-slate-500 w-48 truncate">{b.metric}</span>
                      <span className="text-slate-300">
                        μ={typeof b.baseline_value === 'number' ? b.baseline_value.toFixed(2) : b.baseline_value}
                      </span>
                      <span className="text-slate-500">
                        σ={typeof b.standard_deviation === 'number' ? b.standard_deviation.toFixed(2) : b.standard_deviation}
                      </span>
                      <span className="text-slate-600">n={b.sample_count ?? 0}</span>
                    </div>
                  ))}
                  {(!profile.baselines || profile.baselines.length === 0) && (
                    <div className="text-slate-600 text-xs py-4 text-center">No baselines yet</div>
                  )}
                </div>
              </Card>

              <Card>
                <SectionHeader title="Recent Mutations">Recent Mutations</SectionHeader>
                <div className="space-y-2 mt-2">
                  {profile.mutations?.slice(0, 10).map((m, i) => (
                    <div key={i} className="p-2 bg-[#040d1a] rounded text-xs font-mono border border-slate-800/60">
                      <div className="flex justify-between items-center">
                        <span className="text-yellow-400">{m.metric}</span>
                        <span
                          className={
                            m.severity === 'CRITICAL'
                              ? 'text-red-400'
                              : m.severity === 'HIGH'
                              ? 'text-orange-400'
                              : 'text-yellow-400'
                          }
                        >
                          {m.severity || 'LOW'}
                        </span>
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        Baseline: {typeof m.baseline_value === 'number' ? m.baseline_value.toFixed(2) : m.baseline_value} → Observed:{' '}
                        {typeof m.observed_value === 'number' ? m.observed_value.toFixed(2) : m.observed_value}
                        <span className="text-red-400 ml-2">
                          (+{typeof m.deviation === 'number' ? m.deviation.toFixed(0) : m.deviation}% dev)
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!profile.mutations || profile.mutations.length === 0) && (
                    <div className="text-slate-600 text-xs py-4 text-center">No mutations detected</div>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <EmptyState message="Select a user to view CyberDNA profile" />
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 4. Devices Inventory Component
// ---------------------------------------------------------------------------
export function Devices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDevices()
      .then((r) => setDevices(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-4 font-mono">
      <Card>
        <SectionHeader title={`All Devices (${devices.length})`}>
          All Devices ({devices.length})
        </SectionHeader>
        {loading ? (
          <Spinner />
        ) : devices.length === 0 ? (
          <EmptyState message="No devices discovered" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {devices.map((d) => (
              <div
                key={d.id || d.ip_address || Math.random()}
                className={`p-4 rounded border ${
                  d.risk_level === 'HOSTILE'
                    ? 'border-red-700'
                    : d.risk_level === 'HIGH_RISK'
                    ? 'border-orange-700'
                    : d.risk_level === 'SUSPICIOUS'
                    ? 'border-yellow-700'
                    : 'border-slate-700'
                } bg-[#040d1a]`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-200">
                      {d.hostname || 'Unknown'}
                    </div>
                    <div className="text-xs text-cyan-300 font-mono">{d.ip_address}</div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${getRiskBadgeClass(
                      d.risk_level
                    )}`}
                  >
                    {d.risk_level || 'ADAPTIVE'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 text-xs font-mono">
                  {[
                    ['MAC', d.mac_address || '—'],
                    ['Vendor', d.vendor || '—'],
                    ['Type', d.device_type || 'Endpoint'],
                    ['OS', d.os || '—'],
                    ['Status', d.status || 'Offline'],
                    ['Trust', d.trust_level || 'Adaptive'],
                    ['Sensor', d.sensor_connected ? '✓ Yes' : '✗ None'],
                    ['Risk', `${(d.risk_score || 0).toFixed(0)}/100`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-1 py-0.5">
                      <span className="text-slate-600">{k}:</span>
                      <span className="text-slate-300 truncate">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-slate-600 border-t border-slate-800/40 pt-1.5">
                  First: {d.first_seen ? new Date(d.first_seen).toLocaleString() : '—'} · Last:{' '}
                  {d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dual default export for total compatibility
// ---------------------------------------------------------------------------
export default {
  Incidents,
  RiskIntel,
  CyberDNA,
  Devices,
}