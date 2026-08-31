import React, { useEffect, useState } from 'react'
import { Activity, ShieldCheck, Radio, Server } from 'lucide-react'
import { getNetworkInterfaces } from '../api/client'

export function StatusBar({ discoveryStatus, isMonitoring, backendOnline }) {
  const [status, setStatus] = useState({
    discovery: 'idle',
    monitoring: false,
    backend: true,
    lastChecked: new Date().toLocaleTimeString()
  })

  useEffect(() => {
    let isMounted = true

    const checkHealth = async () => {
      try {
        // Use the existing client to verify connection to the backend
        const res = await getNetworkInterfaces()
        if (isMounted && res) {
          setStatus(prev => ({
            ...prev,
            discovery: isMonitoring ? 'active' : 'idle',
            monitoring: Boolean(isMonitoring),
            backend: true,
            lastChecked: new Date().toLocaleTimeString()
          }))
        }
      } catch (err) {
        if (isMounted) {
          // If backendOnline prop was passed as true, prioritize it
          setStatus(prev => ({
            ...prev,
            backend: backendOnline ?? false,
            lastChecked: new Date().toLocaleTimeString()
          }))
        }
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 6000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [isMonitoring, backendOnline])

  const isConnected = backendOnline !== undefined ? backendOnline : status.backend

  const getDiscoveryBadge = () => {
    if (!isConnected) {
      return {
        label: 'Disconnected',
        color: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
        text: 'text-rose-400',
        pulse: false
      }
    }

    if (isMonitoring || status.monitoring || discoveryStatus === 'active' || discoveryStatus === 'scanning') {
      return {
        label: 'Monitoring Active',
        color: 'bg-emerald-400 shadow-[0_0_10px_#34d399]',
        text: 'text-emerald-400',
        pulse: true
      }
    }

    return {
      label: 'Ready',
      color: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
      text: 'text-emerald-300',
      pulse: false
    }
  }

  const discBadge = getDiscoveryBadge()

  return (
    <footer className="w-full bg-[#0b121e]/90 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-xs text-slate-400 select-none">
      {/* System State */}
      <div className="flex items-center gap-6">
        {/* Core API */}
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span>Core API:</span>
          <span className="flex items-center gap-1.5 font-medium font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
              }`}
            />
            <span className={isConnected ? 'text-slate-200' : 'text-rose-400'}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </span>
        </div>

        {/* Discovery */}
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-slate-400" />
          <span>Discovery:</span>
          <span className="flex items-center gap-1.5 font-medium font-mono">
            <span
              className={`w-2 h-2 rounded-full ${discBadge.color} ${
                discBadge.pulse ? 'animate-pulse' : ''
              }`}
            />
            <span className={discBadge.text}>{discBadge.label}</span>
          </span>
        </div>

        {/* Sentinel Engine */}
        <div className="hidden sm:flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sentinel Engine:</span>
          <span className="text-slate-300 font-medium font-mono">Enforcing</span>
        </div>
      </div>

      {/* Subnet Prober & Synced Timestamp */}
      <div className="flex items-center gap-4 text-slate-500 font-mono">
        <div className="hidden md:flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-cyan-500" />
          <span>Subnet Prober: /19 Active</span>
        </div>
        <span>Synced: {status.lastChecked}</span>
      </div>
    </footer>
  )
}

export default StatusBar