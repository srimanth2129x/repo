import React from 'react'
import { Shield, RefreshCw, Cpu, Server, Activity, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export function TopBar({ status = {}, onRefresh, refreshing }) {
  const { toggleTheme, isDark } = useTheme()
  const isOnline = status.status === 'operational' || status.backendOnline !== false
  const activeSensors = status.active_sensors ?? status.sensors_connected ?? 0
  const onlineDevices = status.online_devices ?? status.devices_online ?? 0
  const totalDevices = status.total_devices ?? status.devices_total ?? 0
  const activeSubnet = status.subnet || '192.168.0.0/24'

  return (
    <header className="w-full bg-white dark:bg-[#0c1018] border-b border-slate-200 dark:border-[#1e2738] px-4 py-2.5 flex items-center justify-between select-none z-30 shrink-0 theme-transition">
      {/* Left: Branding & Core Architecture Tagline */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-white shadow-sm border border-slate-700">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-extrabold tracking-wider text-slate-900 dark:text-slate-100 uppercase">
              Sentinel<span className="text-slate-500 dark:text-slate-400 font-semibold">Twin</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold tracking-widest uppercase">
              SOC CONSOLE
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-tight hidden sm:block">
            Continuous Endpoint Baseline & Digital Twin Platform
          </p>
        </div>
      </div>

      {/* Center: Live System Posture Telemetry */}
      <div className="hidden lg:flex items-center gap-5 text-xs font-mono">
        {/* Core Health Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isOnline
                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
            }`}
          />
          <span className="text-[11px] font-semibold tracking-wide">
            {isOnline ? 'OPERATIONAL' : 'DISCONNECTED'}
          </span>
          <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-800/60">
            CONNECTED
          </span>
        </div>

        {/* Subnet Indicator */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span>SUBNET:</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">{activeSubnet}</span>
        </div>

        {/* Sensor State */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span>SENSORS:</span>
          <span className={`font-semibold ${activeSensors > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
            {activeSensors > 0 ? `${activeSensors} ONLINE` : 'STANDBY'}
          </span>
        </div>

        {/* Devices Summary */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span>ASSETS:</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold">
            {onlineDevices}
            <span className="text-slate-400 font-normal">/{totalDevices || onlineDevices || 1} MONITORED</span>
          </span>
        </div>
      </div>

      {/* Right: Actions, Theme Switcher & Refresh */}
      <div className="flex items-center gap-2">
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-md transition cursor-pointer"
          title={isDark ? 'Switch to Clean Light Mode' : 'Switch to Dark SOC Mode'}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-700 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Manual Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-md transition cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-slate-900 dark:text-white' : ''}`} />
          </button>
        )}

        {/* Operator Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-slate-800 dark:text-slate-200 font-semibold">SOC OPERATOR</span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">· AUDIT</span>
        </div>
      </div>
    </header>
  )
}

export default TopBar
