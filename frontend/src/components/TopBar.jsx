import React from 'react'
import { Shield, Radio, RefreshCw, Cpu, Server, Activity } from 'lucide-react'

export function TopBar({ status = {}, onRefresh, refreshing }) {
  const isOnline = status.status === 'operational' || status.backendOnline !== false
  const activeSensors = status.active_sensors ?? status.sensors_connected ?? 0
  const onlineDevices = status.online_devices ?? status.devices_online ?? 0
  const totalDevices = status.total_devices ?? status.devices_total ?? 0
  const activeSubnet = status.subnet || '192.168.0.0/24'

  return (
    <header className="w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between select-none z-30 shrink-0">
      {/* Left: Branding & Tagline */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-800/80 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-extrabold tracking-wider text-slate-100 uppercase">
              Sentinel<span className="text-cyan-400">Twin</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-semibold tracking-widest uppercase">
              SOC CONSOLE
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400 tracking-tight hidden sm:block">
            Behavioral CyberDNA & Network Digital Twin Platform
          </p>
        </div>
      </div>

      {/* Center: Live System State Telemetry */}
      <div className="hidden md:flex items-center gap-5 text-xs font-mono">
        {/* Core Health Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
            }`}
          />
          <span className="text-[11px] font-semibold tracking-wide">
            {isOnline ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
          </span>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/60">
            LIVE
          </span>
        </div>

        {/* Subnet Indicator */}
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>SUBNET:</span>
          <span className="text-slate-200 font-semibold">{activeSubnet}</span>
        </div>

        {/* Sensor State */}
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <Server className="w-3.5 h-3.5 text-indigo-400" />
          <span>SENSORS:</span>
          <span className={`font-semibold ${activeSensors > 0 ? 'text-emerald-300' : 'text-slate-400'}`}>
            {activeSensors > 0 ? `${activeSensors} CONNECTED` : 'STANDBY'}
          </span>
        </div>

        {/* Devices Summary */}
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span>ASSETS:</span>
          <span className="text-cyan-300 font-bold">
            {onlineDevices}
            <span className="text-slate-500 font-normal">/{totalDevices || onlineDevices} ONLINE</span>
          </span>
        </div>
      </div>

      {/* Right: Tenant, Actions & Refresh */}
      <div className="flex items-center gap-2.5">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-slate-400 hover:text-cyan-400 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        )}

        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-navy-950/80 border border-slate-800 text-[11px] font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-slate-300 font-semibold">ADMIN</span>
          <span className="text-slate-500 text-[10px] hidden sm:inline">· LOCAL SOC</span>
        </div>
      </div>
    </header>
  )
}

export default TopBar
