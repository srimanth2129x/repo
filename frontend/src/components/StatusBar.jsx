import React, { useEffect, useState } from 'react'
import { Server, Radio, ShieldCheck, Clock, Activity, Wifi } from 'lucide-react'
import { getSystemStatus } from '../api/client'

export function StatusBar({ status = {}, discoveryStatus, isMonitoring, backendOnline }) {
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
      } catch (err) {
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
    <footer className="w-full bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-30 shrink-0">
      {/* Left Core Metrics */}
      <div className="flex items-center gap-5">
        {/* Core API & Measured Latency */}
        <div className="flex items-center gap-2">
          <Server className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">CORE API:</span>
          <span className="flex items-center gap-1.5 font-semibold">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
              }`}
            />
            <span className={isLive ? 'text-emerald-300' : 'text-rose-400'}>
              {isLive ? (latency !== null ? `${latency}ms` : 'ONLINE') : 'OFFLINE'}
            </span>
          </span>
        </div>

        {/* Discovery Engine */}
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">DISCOVERY:</span>
          <span className="flex items-center gap-1.5 font-semibold">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                discoveryState === 'SCANNING'
                  ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-ping'
                  : 'bg-emerald-400'
              }`}
            />
            <span className={discoveryState === 'SCANNING' ? 'text-cyan-300' : 'text-slate-300'}>
              {discoveryState}
            </span>
          </span>
        </div>

        {/* Sentinel Engine Rule Mode */}
        <div className="hidden sm:flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-cyan-400" />
          <span className="text-slate-400">SENTINEL ENGINE:</span>
          <span className="text-cyan-300 font-semibold">ACTIVE ENFORCEMENT</span>
        </div>
      </div>

      {/* Right Subnet & Sync Info */}
      <div className="flex items-center gap-4 text-slate-400">
        <div className="hidden md:flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-indigo-400" />
          <span className="text-slate-400">SUBNET:</span>
          <span className="text-slate-300 font-medium">{activeSubnet}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>SYNCED:</span>
          <span className="text-slate-300">{lastSync}</span>
        </div>
      </div>
    </footer>
  )
}

export default StatusBar