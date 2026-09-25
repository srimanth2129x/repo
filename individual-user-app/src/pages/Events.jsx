import React, { useState, useEffect } from 'react'
import {
  ListOrdered,
  Search,
  Filter,
  RefreshCw,
  Terminal,
  Globe,
  Fingerprint,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import { fetchEvents } from '../api/client'

export default function Events() {
  const { searchQuery, setSearchQuery, openExplainer } = useApp()
  const [filterType, setFilterType] = useState('ALL')
  const [eventsList, setEventsList] = useState([])
  const [expandedEventId, setExpandedEventId] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await fetchEvents(30)
      setEventsList(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const filterTabs = [
    { id: 'ALL', label: 'All Activity' },
    { id: 'PROCESS_START', label: 'Applications' },
    { id: 'NETWORK_CONNECT', label: 'Network' },
    { id: 'CYBERDNA_UPDATE', label: 'CyberDNA' },
    { id: 'FILE_INTEGRITY', label: 'Files' },
  ]

  const filteredEvents = eventsList.filter(evt => {
    const matchesFilter = filterType === 'ALL' || evt.event_type === filterType
    const matchesSearch =
      !searchQuery ||
      evt.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.process_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.details.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleEventExplain = () => {
    openExplainer(
      'Activity Events',
      'What are Activity Events?',
      'Activity events are a timeline of actions recorded by the SentinelTwin sensor on your workstation. This includes programs starting, background updates, network queries, and CyberDNA calibration. SentinelTwin filters out system noise so you can easily review what your computer has been doing.',
      'You can review this log whenever you suspect unusual software was installed or want to know what program accessed the network.'
    )
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'PROCESS_START':
        return Terminal
      case 'NETWORK_CONNECT':
        return Globe
      case 'CYBERDNA_UPDATE':
        return Fingerprint
      case 'FILE_INTEGRITY':
        return FileCheck
      default:
        return ListOrdered
    }
  }

  return (
    <div className="space-y-6 animate-page pb-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Recent Activity Events
            </h2>
            <Badge variant="shield" size="sm" dot>
              {eventsList.length} Recorded Events
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Human-readable activity timeline. SentinelTwin continuously normalizes raw Windows Event Logs into clear, understandable actions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleEventExplain}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-emerald-500" />
            <span>How events work</span>
          </button>

          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={loadEvents}
            disabled={loading}
          >
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Local Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by process or action..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Events Stream Card */}
      <Card>
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <ListOrdered className="w-10 h-10 mx-auto opacity-50" />
            <p className="text-sm font-semibold">No activity events match your filter</p>
            <p className="text-xs text-slate-500">Try changing the category or clearing the search query.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredEvents.map(evt => {
              const Icon = getEventIcon(evt.event_type)
              const isExpanded = expandedEventId === evt.id
              const isMediumRisk = evt.risk_level === 'Medium'

              return (
                <div key={evt.id} className="py-4 transition-colors">
                  <div
                    onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                    className="flex items-start justify-between cursor-pointer group"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                        isMediumRisk
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {evt.action}
                          </h4>
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {evt.process_name}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {evt.details}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0 text-xs">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{evt.timestamp}</span>
                      </span>

                      <Badge
                        variant={isMediumRisk ? 'warning' : 'shield'}
                        size="sm"
                      >
                        {evt.category}
                      </Badge>

                      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Technical Details Drawer */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                        <span>Raw Event Type: {evt.event_type}</span>
                        <span>Event ID: {evt.id}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                        <code>
                          {JSON.stringify({
                            event_id: evt.id,
                            timestamp: evt.timestamp,
                            event_type: evt.event_type,
                            process: evt.process_name,
                            action: evt.action,
                            risk_level: evt.risk_level,
                            category: evt.category,
                            details: evt.details,
                            normalized: true
                          }, null, 2)}
                        </code>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Normalized by SentinelTwin Event Processing Engine without transmitting sensitive payload contents.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
