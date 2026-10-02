import React, { useEffect, useState } from 'react'
import { Server, Radio, ShieldCheck, Clock, Wifi } from 'lucide-react'
import { getSystemStatus } from '../api/client'

export function StatusBar({ status = {}, isMonitoring, backendOnline }) {
  const [latency, setLatency] = useState(null)
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString())
  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    let mounted = true

    const measureHealth = async () => {
      const start = performance.now()
      try {
        await getSystemStatus()
        const duration = Math.round(performance.now() - start)
        if (mounted) {
          setLatency(duration)
          setIsLive(true)
          setLastSync(new Date().toLocaleTimeString())
        }
      } catch {
        if (mounted) {
          setIsLive(backendOnline ?? false)
          setLatency(null)
          setLastSync(new Date().toLocaleTimeString())
        }
      }
    }

    measureHealth()
    const interval = setInterval(measureHealth, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [backendOnline])

  const discoveryState = isMonitoring || status.is_monitoring || status.discovery_active
    ? 'SCANNING'
    : 'READY'

  const activeSubnet = status.subnet || '192.168.0.0/24'

  return (
    <footer className="w-full bg-slate-100 dark:bg-[#0c1018] border-t border-slate-200 dark:border-[#1e2738] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 select-none z-30 shrink-0 theme-transition">
      {/* Left Core Metrics */}
      <div className="flex items-center gap-5">
        {/* Core API & Latency */}
        <div className="flex items-center gap-2">
          <Server className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span>API TELEMETRY:</span>
          <span className="flex items-center gap-1.5 font-semibold">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive
                  ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                  : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]'
              }`}
            />
            <span className={isLive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-red-700 dark:text-red-400'}>
              {isLive ? (latency !== null ? `${latency}ms` : 'ONLINE') : 'OFFLINE'}
            </span>
          </span>
        </div>

        {/* Discovery Engine */}
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span>DISCOVERY ENGINE:</span>
          <span className="flex items-center gap-1.5 font-semibold">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                discoveryState === 'SCANNING'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-emerald-500'
              }`}
            />
            <span className={discoveryState === 'SCANNING' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}>
              {discoveryState}
            </span>
          </span>
        </div>

        {/* Sentinel Engine Rule Mode */}
        <div className="hidden sm:flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-slate-400" />
          <span>SENTINEL ENGINE:</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">CONTINUOUS ENFORCEMENT</span>
        </div>
      </div>

      {/* Right Subnet & Sync Info */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-slate-400" />
          <span>SUBNET:</span>
          <span className="text-slate-700 dark:text-slate-300 font-semibold">{activeSubnet}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span>SYNCED:</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">{lastSync}</span>
        </div>
      </div>
    </footer>
  )
}

export default StatusBar