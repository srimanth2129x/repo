import React, { useEffect, useState, useCallback } from 'react'
import { getEvents } from '../api/client'
import { Card, SectionHeader, Spinner, EmptyState } from '../components/ui/Card'

export function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ device_id: '', event_type: '' })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getEvents({ limit: 200, ...filter })
      setEvents(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Events load error:', err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const EVENT_TYPE_COLORS = {
    logon: 'text-green-400',
    failed_logon: 'text-red-400',
    process_creation: 'text-cyan-400',
    network_connection: 'text-violet-400',
    file_created: 'text-yellow-400',
  }

  const formatTime = (ts) => {
    if (!ts) return '—'
    try {
      const d = new Date(ts)
      return isNaN(d.getTime()) ? String(ts) : d.toLocaleTimeString()
    } catch {
      return String(ts)
    }
  }

  return (
    <div className="p-6 space-y-4 font-mono">
      <div className="flex gap-3 items-center">
        <input
          className="px-3 py-1.5 bg-[#0a1628] border border-slate-700 rounded text-xs font-mono text-slate-300 w-48 focus:outline-none focus:border-cyan-500"
          placeholder="Filter by device ID..."
          value={filter.device_id}
          onChange={(e) => setFilter((f) => ({ ...f, device_id: e.target.value }))}
        />
        <input
          className="px-3 py-1.5 bg-[#0a1628] border border-slate-700 rounded text-xs font-mono text-slate-300 w-48 focus:outline-none focus:border-cyan-500"
          placeholder="Filter by event type..."
          value={filter.event_type}
          onChange={(e) => setFilter((f) => ({ ...f, event_type: e.target.value }))}
        />
        <button
          onClick={load}
          className="px-3 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded text-xs font-mono transition"
        >
          Refresh
        </button>
      </div>

      <Card>
        <SectionHeader title={`Events (${events.length})`} />
        {loading ? (
          <Spinner />
        ) : events.length === 0 ? (
          <EmptyState message="No events — connect a Windows sensor to collect telemetry" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  {['Time', 'Device', 'User', 'Type', 'Event ID', 'Process', 'Source'].map((h) => (
                    <th key={h} className="text-left py-2 pr-4 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const evType = (e.event_type || '').toLowerCase()
                  const typeColor = EVENT_TYPE_COLORS[evType] || 'text-slate-400'

                  return (
                    <tr
                      key={e.id || Math.random()}
                      className="border-b border-slate-900 hover:bg-[#040d1a] transition-colors"
                    >
                      <td className="py-1.5 pr-4 text-slate-500 whitespace-nowrap">
                        {formatTime(e.timestamp || e.created_at)}
                      </td>
                      <td className="pr-4 text-cyan-300">{e.hostname || e.device_id || '—'}</td>
                      <td className="pr-4 text-slate-300">{e.username || '—'}</td>
                      <td className={`pr-4 ${typeColor}`}>{e.event_type || '—'}</td>
                      <td className="pr-4 text-slate-500">{e.event_id || '—'}</td>
                      <td className="pr-4 text-slate-400">{e.process_name || '—'}</td>
                      <td className="text-slate-500">{e.source || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Events