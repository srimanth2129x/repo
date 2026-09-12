import React from 'react'
import { Shield, AlertCircle } from 'lucide-react'
import { RiskBadge, StatusBadge, MitreBadge, SensorBadge, CategoryBadge } from './Badge'

export { RiskBadge, StatusBadge, MitreBadge, SensorBadge, CategoryBadge }

export function Card({ children, className = '', hover = true, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-lg shadow-lg p-4 transition-all duration-200 ${
        hover ? 'hover:border-slate-700/90 hover:shadow-cyan-950/20 hover:shadow-md' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function StatCard({
  title,
  label,
  value,
  sub,
  subtitle,
  change,
  trend,
  icon,
  accent = 'cyan',
  onClick,
  className = '',
}) {
  const displayTitle = title || label
  const displaySub = sub || subtitle

  const accentGlow = {
    cyan: 'border-cyan-900/50 hover:border-cyan-600/70 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]',
    emerald: 'border-emerald-900/50 hover:border-emerald-600/70 hover:shadow-[0_0_15px_rgba(16,185,129,0.12)]',
    green: 'border-emerald-900/50 hover:border-emerald-600/70 hover:shadow-[0_0_15px_rgba(16,185,129,0.12)]',
    amber: 'border-amber-900/50 hover:border-amber-600/70 hover:shadow-[0_0_15px_rgba(245,158,11,0.12)]',
    orange: 'border-amber-900/50 hover:border-amber-600/70 hover:shadow-[0_0_15px_rgba(245,158,11,0.12)]',
    rose: 'border-rose-900/50 hover:border-rose-600/70 hover:shadow-[0_0_15px_rgba(244,63,94,0.12)]',
    red: 'border-rose-900/50 hover:border-rose-600/70 hover:shadow-[0_0_15px_rgba(244,63,94,0.12)]',
    violet: 'border-violet-900/50 hover:border-violet-600/70 hover:shadow-[0_0_15px_rgba(139,92,246,0.12)]',
  }[accent] || 'border-slate-800 hover:border-slate-700'

  const valueColor = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    orange: 'text-amber-400',
    rose: 'text-rose-400',
    red: 'text-rose-400',
    violet: 'text-violet-400',
  }[accent] || 'text-slate-100'

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/70 backdrop-blur-md border rounded-lg p-4 flex flex-col justify-between transition-all duration-200 select-none ${accentGlow} ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
          {displayTitle}
        </span>
        {icon && <span className="text-slate-400 text-sm">{icon}</span>}
      </div>

      <div className="my-2.5">
        <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${valueColor}`}>
          {value ?? '—'}
        </div>
        {(displaySub || change) && (
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5 truncate">
            {change && (
              <span
                className={`font-semibold ${
                  trend === 'up'
                    ? 'text-emerald-400'
                    : trend === 'down'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {change}
              </span>
            )}
            {displaySub && <span className="truncate">{displaySub}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export function SectionHeader({ title, subtitle, badge, action, children }) {
  const displayTitle = title || (typeof children === 'string' ? children : null)

  return (
    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
      <div>
        <div className="flex items-center gap-2">
          {displayTitle && (
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              {displayTitle}
            </h3>
          )}
          {badge}
        </div>
        {subtitle && <p className="text-[11px] font-mono text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function Spinner({ message = 'Loading Telemetry...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-950 border-t-cyan-400 animate-spin" />
        <div className="absolute inset-1.5 rounded-full border-2 border-violet-950 border-b-violet-400 animate-spin animate-reverse" />
      </div>
      <span className="text-xs font-mono text-slate-400 animate-pulse">{message}</span>
    </div>
  )
}

export function EmptyState({ title, message, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2.5">
        {icon || <AlertCircle className="w-5 h-5 text-slate-500" />}
      </div>
      {title && <div className="text-xs font-mono font-bold text-slate-300 mb-1">{title}</div>}
      <div className="text-xs text-slate-400 font-mono max-w-sm">{message || 'No telemetry recorded yet.'}</div>
    </div>
  )
}

export default Card