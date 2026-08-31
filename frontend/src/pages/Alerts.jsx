import React, { useEffect, useState, useCallback } from 'react'
import { getAlerts, updateAlert } from '../api/client'
import { Card, SectionHeader, Spinner, EmptyState } from '../components/ui/Card'
import { getRiskBadgeClass } from '../utils/risk'

export function Alerts({ onAlertChange }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAlerts()
      setAlerts(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleStatus = async (id, status) => {
    try {
      await updateAlert(id, { status })
      await load()
      if (typeof onAlertChange === 'function') {
        onAlertChange()
      }
    } catch (err) {
      console.error('Failed to update alert status:', err)
    }
  }

  const openAlertsCount = alerts.filter(
    (a) => (a.status || '').toUpperCase() === 'OPEN'
  ).length

  return (
    <div className="p-6 space-y-4">
      <Card>
        <SectionHeader
          title={`Active Alerts (${openAlertsCount})`}
          subtitle="Real-time behavioral anomalies and rule violation notifications"
        />
        {loading ? (
          <Spinner />
        ) : alerts.length === 0 ? (
          <EmptyState message="No alerts — system nominal" />
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => {
              const isOpen = (a.status || 'OPEN').toUpperCase() === 'OPEN'
              const classification = (a.classification || a.severity || 'LOW').toUpperCase()

              return (
                <div
                  key={a.id || Math.random()}
                  className={`p-4 rounded border transition-all ${
                    !isOpen ? 'opacity-40' : ''
                  } ${
                    classification === 'HOSTILE' || classification === 'CRITICAL'
                      ? 'border-red-700 bg-red-950/60'
                      : classification === 'HIGH_RISK' || classification === 'HIGH'
                      ? 'border-orange-700 bg-orange-950/60'
                      : classification === 'SUSPICIOUS' || classification === 'MEDIUM'
                      ? 'border-yellow-700 bg-yellow-950/60'
                      : 'border-slate-700 bg-[#040d1a]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-200">
                        {a.title || a.rule_name || 'Suspicious Activity Detected'}
                      </div>
                      <div className="text-xs font-mono space-y-0.5">
                        <div>
                          <span className="text-slate-500">Device: </span>
                          <span className="text-cyan-300">{a.device_id || 'Unknown Host'}</span>
                        </div>
                        {a.username && (
                          <div>
                            <span className="text-slate-500">User: </span>
                            <span className="text-slate-300">{a.username}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">Risk: </span>
                          <span className="text-white font-bold">
                            {Number(a.risk_score || 0).toFixed(0)}/100
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Confidence: </span>
                          <span className="text-slate-300">
                            {Number(a.confidence || 0).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded border text-xs font-mono font-semibold ${getRiskBadgeClass(
                          classification
                        )}`}
                      >
                        {classification}
                      </span>

                      {isOpen ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStatus(a.id, 'FALSE_POSITIVE')}
                            className="text-[10px] font-mono px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 border border-slate-700 transition"
                          >
                            FP
                          </button>
                          <button
                            onClick={() => handleStatus(a.id, 'EXPECTED')}
                            className="text-[10px] font-mono px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 border border-slate-700 transition"
                          >
                            Expected
                          </button>
                          <button
                            onClick={() => handleStatus(a.id, 'CONFIRMED')}
                            className="text-[10px] font-mono px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-red-200 border border-red-700 transition"
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {a.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 mt-2">
                    {a.created_at || a.timestamp || 'Recent'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

export default Alerts