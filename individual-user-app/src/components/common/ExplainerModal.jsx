import React from 'react'
import { X, Info, Lightbulb, CheckCircle2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import Button from './Button'

export default function ExplainerModal() {
  const { explainer, closeExplainer } = useApp()

  if (!explainer.isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Security Guide
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {explainer.title || 'Security Explainer'}
              </h3>
            </div>
          </div>
          <button
            onClick={closeExplainer}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Explanation Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              What it means
            </h4>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {explainer.explanation}
            </p>
          </div>

          {/* Recommendation / Action */}
          {explainer.recommendation && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Recommended Best Practice
                </h5>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {explainer.recommendation}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80">
          <Button variant="primary" size="md" onClick={closeExplainer}>
            Got it, thanks
          </Button>
        </div>
      </div>
    </div>
  )
}
