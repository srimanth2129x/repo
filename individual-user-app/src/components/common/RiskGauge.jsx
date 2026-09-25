import React from 'react'
import { ShieldCheck, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function RiskGauge({ score = 12, size = 'md' }) {
  const { openExplainer } = useApp()

  // Clamp score
  const clampedScore = Math.max(0, Math.min(100, score))

  // Determine risk level & color
  let level = 'Low'
  let label = 'Healthy & Protected'
  let color = '#10b981' // emerald
  let bgColor = 'text-emerald-500'
  let icon = ShieldCheck
  let badgeVariant = 'shield'

  if (clampedScore > 60) {
    level = 'High'
    label = 'Action Required'
    color = '#ef4444' // red
    bgColor = 'text-red-500'
    icon = AlertCircle
    badgeVariant = 'threat'
  } else if (clampedScore > 25) {
    level = 'Medium'
    label = 'Elevated Risk'
    color = '#f59e0b' // amber
    bgColor = 'text-amber-500'
    icon = AlertTriangle
    badgeVariant = 'warning'
  }

  const IconComponent = icon

  // SVG Arc calculation for semi-gauge
  const radius = 64
  const circumference = 2 * Math.PI * radius
  // We'll show a 240-degree arc
  const arcLength = circumference * (240 / 360)
  const offset = arcLength - (clampedScore / 100) * arcLength

  const handleExplain = () => {
    openExplainer(
      'Device Risk Score',
      'How your Risk Score is Calculated',
      `Your current risk score is ${clampedScore}/100 (${level} Risk). SentinelTwin evaluates several local signals to compute this score: Process behavior consistency, Network connection destinations, and CyberDNA behavioral alignment. A lower score indicates that your computer is operating normally and safely.`,
      'Maintain standard computing habits and keep your software updated to keep your risk score minimal.'
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        {/* SVG Circular Progress Gauge */}
        <svg className="w-48 h-48 -rotate-[210deg] transform" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={arcLength}
            strokeDashoffset="0"
            strokeLinecap="round"
            className="text-slate-100 dark:text-slate-800"
          />
          {/* Active Score Arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={arcLength}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Contents */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-2">
          <IconComponent className={`w-8 h-8 ${bgColor} mb-1 animate-pulse-slow`} />
          <div className="flex items-baseline">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
              {clampedScore}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">/100</span>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {level} Risk
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
        <button
          onClick={handleExplain}
          className="mt-1.5 inline-flex items-center text-xs font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 mr-1" />
          What does this mean?
        </button>
      </div>
    </div>
  )
}
