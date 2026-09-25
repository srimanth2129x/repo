import React, { useState } from 'react'
import {
  Bell,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Filter,
  Trash2,
  ExternalLink,
  Eye,
  Check
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'

export default function Alerts() {
  const {
    alerts,
    activeAlertsCount,
    resolveAlert,
    dismissAlert,
    openEvidence,
    openExplainer
  } = useApp()

  const [filterState, setFilterState] = useState('ALL') // 'ALL' | 'Active' | 'Resolved'

  const filteredAlerts = alerts.filter(a => {
    if (filterState === 'Active') return a.status === 'Active'
    if (filterState === 'Resolved') return a.status === 'Resolved'
    return true
  })

  const handleAlertExplain = () => {
    openExplainer(
      'Alert Triage System',
      'How does SentinelTwin prioritize alerts?',
      'Instead of bombarding you with false alarms every time a background program starts, SentinelTwin correlates multiple behavior points. Alerts only trigger when an application breaks multiple baseline habits simultaneously (such as an unusual script connecting to an unknown IP).',
      'Review any Active alerts. If it was software you launched intentionally, click "Acknowledge & Mark Safe" so CyberDNA can update your baseline.'
    )
  }

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'Critical':
      case 'High':
        return <Badge variant="threat" size="sm" dot>{sev} Risk</Badge>
      case 'Medium':
        return <Badge variant="warning" size="sm" dot>{sev} Severity</Badge>
      default:
        return <Badge variant="info" size="sm" dot>{sev} Severity</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-page pb-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Security Alerts & Notifications
            </h2>
            <Badge variant={activeAlertsCount > 0 ? 'warning' : 'shield'} size="sm" dot>
              {activeAlertsCount} Active {activeAlertsCount === 1 ? 'Alert' : 'Alerts'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Prioritized issues detected on your computer. Review anomalous actions and adjust your safety preferences.
          </p>
        </div>

        <button
          onClick={handleAlertExplain}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex-shrink-0"
        >
          <HelpCircle className="w-4 h-4 text-emerald-500" />
          <span>How alerts work</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 w-fit">
        {[
          { id: 'ALL', label: `All Alerts (${alerts.length})` },
          { id: 'Active', label: `Active (${activeAlertsCount})` },
          { id: 'Resolved', label: `Resolved (${alerts.length - activeAlertsCount})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterState(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterState === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                No alerts in this view
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Your device has no pending warnings in this category. All background systems are operating smoothly.
              </p>
            </div>
          </Card>
        ) : (
          filteredAlerts.map(alert => {
            const isResolved = alert.status === 'Resolved'

            return (
              <Card
                key={alert.id}
                className={`transition-all ${
                  isResolved ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/50' : 'border-amber-500/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                      isResolved
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {isResolved ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {alert.title}
                        </h4>
                        {getSeverityBadge(alert.severity)}
                        <Badge variant="neutral" size="sm">
                          {alert.category}
                        </Badge>
                        {isResolved && (
                          <Badge variant="shield" size="sm">
                            Resolved
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                        {alert.description}
                      </p>

                      <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-400">
                        <span>Source: <strong className="font-mono text-slate-600 dark:text-slate-300">{alert.source}</strong></span>
                        <span>Time: {alert.timestamp}</span>
                        {alert.mitre && (
                          <span className="hidden sm:inline">MITRE: {alert.mitre.split('-')[0]}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this alert */}
                  <div className="flex items-center space-x-2 sm:self-center flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Eye}
                      onClick={() => openEvidence(alert)}
                    >
                      Review Evidence
                    </Button>

                    {!isResolved && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Check}
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Mark Safe
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => dismissAlert(alert.id)}
                      title="Dismiss alert"
                    />
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
