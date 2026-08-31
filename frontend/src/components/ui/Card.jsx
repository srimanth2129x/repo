import React from 'react'

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-navy-900/80 border border-slate-800 rounded p-4 ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({ title, value, change, subtitle, icon, trend, className = '' }) {
  return (
    <div className={`bg-navy-900/80 border border-slate-800 rounded p-4 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">{title}</span>
        {icon && <span className="text-cyan-400 text-sm">{icon}</span>}
      </div>
      <div className="my-2">
        <div className="text-2xl font-bold font-mono text-slate-100">{value ?? '—'}</div>
        {(subtitle || change) && (
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
            {change && <span className={trend === 'up' ? 'text-emerald-400 mr-1' : trend === 'down' ? 'text-rose-400 mr-1' : 'mr-1'}>{change}</span>}
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-3">
      <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">{title}</h3>
      {subtitle && <p className="text-[11px] font-mono text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function EmptyState({ message }) {
  return (
    <div className="text-center py-8 text-slate-500 font-mono text-xs">
      {message}
    </div>
  )
}

export function StatusBadge({ status }) {
  const isOnline = status?.toLowerCase() === 'online'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
      isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
    }`}>
      {status || 'Unknown'}
    </span>
  )
}

export function RiskBadge({ level }) {
  const styles = {
    ADAPTIVE: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    SUSPICIOUS: 'bg-yellow-950 text-yellow-400 border-yellow-800',
    'HIGH RISK': 'bg-orange-950 text-orange-400 border-orange-800',
    HOSTILE: 'bg-red-950 text-red-400 border-red-800',
  }
  const badgeStyle = styles[level] || styles.ADAPTIVE
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${badgeStyle}`}>
      {level || 'ADAPTIVE'}
    </span>
  )
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    cyan: 'bg-cyan-950 text-cyan-400 border-cyan-800',
    green: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    red: 'bg-red-950 text-red-400 border-red-800',
    yellow: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  )
}

export default Card