import React, { useEffect, useState, useCallback } from 'react'
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  GitBranch,
  Clock,
  Laptop,
  CheckCircle2,
  AlertOctagon,
  Eye,
} from 'lucide-react'
import { getIncidents, updateIncident } from '../api/client'
import { Card, SectionHeader, Spinner, EmptyState } from '../components/ui/Card'
import { RiskBadge, StatusBadge, MitreBadge } from '../components/ui/Badge'
import EvidenceModal from '../components/EvidenceModal'

export function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIncidentForGraph, setSelectedIncidentForGraph] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getIncidents()
      setIncidents(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to load incidents:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIncidents()
  }, [loadIncidents])

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      setUpdatingId(incidentId)
      await updateIncident(incidentId, { id: incidentId, status: newStatus })
      await loadIncidents()
    } catch (err) {
      console.error('Failed to update incident status:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredIncidents = incidents.filter((inc) => {
    // Severity filter
    if (filterSeverity !== 'ALL') {
      const sev = String(inc.severity || '').toUpperCase()
      if (filterSeverity === 'HIGH_PLUS' && !sev.includes('HIGH') && !sev.includes('CRITICAL')) {
        return false
      }
      if (filterSeverity === 'OPEN' && (inc.status || '').toUpperCase() === 'RESOLVED') {
        return false
      }
      if (filterSeverity === 'RESOLVED' && (inc.status || '').toUpperCase() !== 'RESOLVED') {
        return false
      }
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = (inc.title || '').toLowerCase().includes(q)
      const matchDevice = (inc.device_id || '').toLowerCase().includes(q)
      const matchMitre = (inc.mitre_technique_id || '').toLowerCase().includes(q)
      const matchDesc = (inc.description || '').toLowerCase().includes(q)
      return matchTitle || matchDevice || matchMitre || matchDesc
    }

    return true
  })

  if (loading && incidents.length === 0) {
    return <Spinner message="Loading security incidents..." />
  }

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 backdrop-blur-md p-4 border border-slate-800/80 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-rose-950/60 border border-rose-800/70 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                Incident Triage & Investigation
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/80 text-rose-300 font-semibold">
                {incidents.filter((i) => (i.status || '').toUpperCase() !== 'RESOLVED').length} ACTIVE
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Correlated security threats, MITRE ATT&CK causal chains, and deterministic evidence graphs
            </p>
          </div>
        </div>

        <button
          onClick={loadIncidents}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-xs font-mono flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2">
            {[
              { id: 'ALL', label: `All (${incidents.length})` },
              {
                id: 'OPEN',
                label: `Active (${
                  incidents.filter((i) => (i.status || '').toUpperCase() !== 'RESOLVED').length
                })`,
              },
              {
                id: 'HIGH_PLUS',
                label: `High/Critical (${
                  incidents.filter(
                    (i) =>
                      String(i.severity || '').toUpperCase().includes('HIGH') ||
                      String(i.severity || '').toUpperCase().includes('CRITICAL')
                  ).length
                })`,
              },
              {
                id: 'RESOLVED',
                label: `Resolved (${
                  incidents.filter((i) => (i.status || '').toUpperCase() === 'RESOLVED').length
                })`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterSeverity(tab.id)}
                className={`px-3 py-1 rounded text-xs font-mono transition font-medium ${
                  filterSeverity === tab.id
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search incidents, MITRE, devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 rounded text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </Card>

      {/* Incidents List */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ShieldAlert className="w-6 h-6 text-slate-600" />}
              title="No Incidents Match Filter"
              message={
                searchQuery
                  ? 'No security incidents found matching your query.'
                  : 'No active incidents reported. All systems nominal.'
              }
            />
          </Card>
        ) : (
          filteredIncidents.map((inc) => {
            const isResolved = (inc.status || '').toUpperCase() === 'RESOLVED'
            const hasEvidence = inc.evidence_graph && Object.keys(inc.evidence_graph).length > 0

            return (
              <Card
                key={inc.id || Math.random()}
                className={`transition-all duration-150 ${
                  isResolved ? 'opacity-70 border-slate-800/60' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Title, Device & MITRE */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 font-bold">
                        #{inc.id}
                      </span>
                      <RiskBadge level={inc.severity || 'HIGH'} />
                      <StatusBadge status={inc.status || 'Open'} />
                      {inc.risk_points !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          +{inc.risk_points} pts
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-bold text-slate-100 font-mono">
                      {inc.title || 'Security Anomaly Detected'}
                    </div>

                    {inc.description && (
                      <p className="text-xs text-slate-400 font-mono leading-relaxed max-w-3xl">
                        {inc.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-cyan-400" />
                        Device: <span className="text-slate-200">{inc.device_id || 'local-host'}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {inc.created_at ? new Date(inc.created_at).toLocaleString() : 'Recent'}
                      </span>

                      {/* MITRE Badge */}
                      {inc.mitre_technique_id && (
                        <MitreBadge
                          techniqueId={inc.mitre_technique_id}
                          techniqueName={inc.mitre_technique_name}
                          tactic={inc.mitre_tactic}
                        />
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                    {/* Evidence Graph Trigger */}
                    {hasEvidence && (
                      <button
                        onClick={() => setSelectedIncidentForGraph(inc)}
                        className="px-2.5 py-1.5 bg-violet-950/60 hover:bg-violet-900 border border-violet-800 text-violet-300 rounded text-xs font-mono flex items-center gap-1.5 transition"
                        title="Open Causal Evidence Graph"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        Evidence DAG
                      </button>
                    )}

                    {/* Status Toggle Button */}
                    {!isResolved ? (
                      <button
                        onClick={() => handleStatusChange(inc.id, 'Resolved')}
                        disabled={updatingId === inc.id}
                        className="px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded text-xs font-mono flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Resolved
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(inc.id, 'Open')}
                        disabled={updatingId === inc.id}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 rounded text-xs font-mono flex items-center gap-1.5 transition"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Evidence Graph DAG Modal */}
      {selectedIncidentForGraph && (
        <EvidenceModal
          alert={selectedIncidentForGraph}
          onClose={() => setSelectedIncidentForGraph(null)}
        />
      )}
    </div>
  )
}

export default Incidents
