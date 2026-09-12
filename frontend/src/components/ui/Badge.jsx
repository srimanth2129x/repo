import React from 'react'

export function RiskBadge({ level, score, className = '' }) {
  const norm = String(level || '').toUpperCase()
  let bg = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
  let dot = 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
  let label = 'ADAPTIVE'

  if (norm.includes('HOSTILE') || norm.includes('CRITICAL')) {
    bg = 'bg-red-950/80 text-red-200 border-red-700/80'
    dot = 'bg-red-500 shadow-[0_0_8px_#ef4444]'
    label = 'HOSTILE'
  } else if (norm.includes('HIGH')) {
    bg = 'bg-rose-950/60 text-rose-300 border-rose-800/80'
    dot = 'bg-rose-400 shadow-[0_0_6px_#f43f5e]'
    label = 'HIGH RISK'
  } else if (norm.includes('SUSPICIOUS') || norm.includes('MEDIUM')) {
    bg = 'bg-amber-950/60 text-amber-300 border-amber-800/80'
    dot = 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
    label = 'SUSPICIOUS'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
      {typeof score === 'number' && <span className="opacity-75">({score.toFixed(0)})</span>}
    </span>
  )
}

export function MitreBadge({ techniqueId, techniqueName, tactic, className = '' }) {
  if (!techniqueId && !techniqueName && !tactic) return null

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border border-cyan-800/70 bg-cyan-950/40 text-cyan-300 ${className}`}
      title={techniqueName || tactic || techniqueId}
    >
      <span className="text-cyan-400 font-bold">{techniqueId || 'MITRE'}</span>
      {techniqueName && <span className="text-slate-300 truncate max-w-[140px]">· {techniqueName}</span>}
      {tactic && !techniqueName && <span className="text-slate-400">· {tactic}</span>}
    </span>
  )
}

export function SensorBadge({ connected, className = '' }) {
  return connected ? (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-emerald-800/70 bg-emerald-950/40 text-emerald-300 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]" />
      SENSOR ACTIVE
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-800 bg-slate-900/40 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      UNMONITORED
    </span>
  )
}

export function StatusBadge({ status, className = '' }) {
  const norm = String(status || '').toUpperCase()
  let style = 'bg-slate-800 text-slate-300 border-slate-700'

  if (norm === 'ONLINE' || norm === 'RESOLVED' || norm === 'OPERATIONAL') {
    style = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
  } else if (norm === 'OPEN' || norm === 'OFFLINE') {
    style = 'bg-rose-950/50 text-rose-300 border-rose-800/60'
  } else if (norm === 'INVESTIGATING' || norm === 'SCANNING') {
    style = 'bg-cyan-950/50 text-cyan-300 border-cyan-800/60 animate-pulse'
  } else if (norm === 'CONTAINED' || norm === 'SUSPICIOUS') {
    style = 'bg-amber-950/50 text-amber-300 border-amber-800/60'
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${style} ${className}`}
    >
      {status || 'UNKNOWN'}
    </span>
  )
}

export function CategoryBadge({ type, className = '' }) {
  const t = String(type || '').toLowerCase()
  let color = 'text-slate-300 border-slate-700 bg-slate-900/50'

  if (t.includes('router') || t.includes('gateway')) {
    color = 'text-cyan-300 border-cyan-800/70 bg-cyan-950/40'
  } else if (t.includes('laptop') || t.includes('pc') || t.includes('workstation')) {
    color = 'text-indigo-300 border-indigo-800/70 bg-indigo-950/40'
  } else if (t.includes('mobile') || t.includes('phone')) {
    color = 'text-emerald-300 border-emerald-800/70 bg-emerald-950/40'
  } else if (t.includes('server')) {
    color = 'text-purple-300 border-purple-800/70 bg-purple-950/40'
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${color} ${className}`}
    >
      {type || 'Node'}
    </span>
  )
}

export function AuthBadge({ status, className = '' }) {
  const norm = String(status || 'AUTHORIZED').toUpperCase()
  let style = 'bg-slate-800 text-slate-300 border-slate-700'
  let dot = 'bg-slate-400'

  if (norm === 'AUTHORIZED') {
    style = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
    dot = 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
  } else if (norm === 'PENDING') {
    style = 'bg-amber-950/60 text-amber-300 border-amber-800/80 animate-pulse'
    dot = 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
  } else if (norm === 'REVOKED') {
    style = 'bg-rose-950/60 text-rose-300 border-rose-800/80'
    dot = 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{norm}</span>
    </span>
  )
}

export function TransportBadge({ mode, className = '' }) {
  const norm = String(mode || 'DIRECT').toUpperCase()
  let style = 'bg-cyan-950/50 text-cyan-300 border-cyan-800/70'

  if (norm === 'PRIVATE_NETWORK') {
    style = 'bg-indigo-950/50 text-indigo-300 border-indigo-800/70'
  } else if (norm === 'GOOGLE_DRIVE') {
    style = 'bg-amber-950/50 text-amber-300 border-amber-800/70'
  } else if (norm === 'OFFLINE' || norm === 'OFFLINE_QUEUE') {
    style = 'bg-slate-800/80 text-slate-400 border-slate-700'
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${style} ${className}`}
    >
      {norm.replace('_', ' ')}
    </span>
  )
}
