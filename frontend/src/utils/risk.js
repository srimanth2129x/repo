/**
 * SentinelTwin Risk Scoring and Presentation Helpers
 */

export function getRiskLevel(score) {
  const s = Number(score) || 0
  if (s >= 80) return 'HOSTILE'
  if (s >= 50) return 'HIGH RISK'
  if (s >= 25) return 'SUSPICIOUS'
  return 'ADAPTIVE'
}

export function getRiskColor(level) {
  const norm = String(level || '').toUpperCase()
  switch (norm) {
    case 'HOSTILE':
    case 'CRITICAL':
      return { border: '#ef4444', text: 'text-red-400', bg: 'bg-red-950', fill: '#ef4444' }
    case 'HIGH RISK':
    case 'HIGH':
      return { border: '#f97316', text: 'text-orange-400', bg: 'bg-orange-950', fill: '#f97316' }
    case 'SUSPICIOUS':
    case 'MEDIUM':
      return { border: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-950', fill: '#eab308' }
    case 'ADAPTIVE':
    case 'LOW':
    default:
      return { border: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-950', fill: '#10b981' }
  }
}

export function getRiskBadgeClass(level) {
  const norm = String(level || '').toUpperCase()
  switch (norm) {
    case 'HOSTILE':
    case 'CRITICAL':
      return 'bg-red-950 text-red-400 border-red-800'
    case 'HIGH RISK':
    case 'HIGH':
      return 'bg-orange-950 text-orange-400 border-orange-800'
    case 'SUSPICIOUS':
    case 'MEDIUM':
      return 'bg-yellow-950 text-yellow-400 border-yellow-800'
    case 'ADAPTIVE':
    case 'LOW':
    default:
      return 'bg-emerald-950 text-emerald-400 border-emerald-800'
  }
}

export function getRiskBarColor(score) {
  const s = Number(score) || 0
  if (s >= 80) return 'bg-red-500'
  if (s >= 50) return 'bg-orange-500'
  if (s >= 25) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

export function getRiskTextColor(level) {
  const norm = String(level || '').toUpperCase()
  switch (norm) {
    case 'HOSTILE':
    case 'CRITICAL':
      return 'text-red-400'
    case 'HIGH RISK':
    case 'HIGH':
      return 'text-orange-400'
    case 'SUSPICIOUS':
    case 'MEDIUM':
      return 'text-yellow-400'
    case 'ADAPTIVE':
    case 'LOW':
    default:
      return 'text-emerald-400'
  }
}