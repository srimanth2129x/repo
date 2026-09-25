import React from 'react'
import { X, ShieldAlert, Terminal, Globe, Clock, CheckCircle, Trash2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import Badge from './Badge'
import Button from './Button'

export default function EvidenceModal() {
  const { evidenceModal, closeEvidence, resolveAlert, dismissAlert } = useApp()
  const alert = evidenceModal.alert

  if (!evidenceModal.isOpen || !alert) return null

  const handleResolve = () => {
    resolveAlert(alert.id)
    closeEvidence()
  }

  const handleDismiss = () => {
    dismissAlert(alert.id)
    closeEvidence()
  }

  const severityVariant = {
    Low: 'info',
    Medium: 'warning',
    High: 'threat',
    Critical: 'threat'
  }[alert.severity] || 'neutral'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-0.5">
                <Badge variant={severityVariant} size="sm" dot>
                  {alert.severity} Severity
                </Badge>
                <span className="text-xs text-slate-400">ID: {alert.id}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {alert.title}
              </h3>
            </div>
          </div>
          <button
            onClick={closeEvidence}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Plain English Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Behavioral Summary
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {alert.description}
            </p>
          </div>

          {/* Evidence Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <span className="text-xs text-slate-400 flex items-center space-x-1 mb-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>Source Process</span>
              </span>
              <p className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
                {alert.source}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <span className="text-xs text-slate-400 flex items-center space-x-1 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Observed Time</span>
              </span>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {alert.timestamp}
              </p>
            </div>
          </div>

          {/* MITRE Technique */}
          {alert.mitre && (
            <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                MITRE ATT&CK Mapping
              </span>
              <p className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
                {alert.mitre}
              </p>
            </div>
          )}

          {/* Recommended Action */}
          {alert.recommendedAction && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              <h5 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Recommended User Action</span>
              </h5>
              <p className="text-sm leading-relaxed">
                {alert.recommendedAction}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80">
          <Button variant="ghost" size="sm" icon={Trash2} onClick={handleDismiss}>
            Dismiss
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={closeEvidence}>
              Close
            </Button>
            <Button variant="primary" size="sm" icon={CheckCircle} onClick={handleResolve}>
              Acknowledge & Mark Safe
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
