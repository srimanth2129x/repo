import React from 'react';
import { Shield, Radio, ExternalLink, RefreshCw, Server } from 'lucide-react';

export function WindowHeader({ status, isConnected, serverUrl, onRefresh, isRefreshing, socWebUrl }) {
  const handleOpenSoc = () => {
    const url = socWebUrl || 'http://localhost:5173';
    if (window.sentinelUserApi?.openExternal) {
      window.sentinelUserApi.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <header className="h-14 bg-graphite-900 border-b border-graphite-800 flex items-center justify-between px-4 select-none shrink-0 z-10">
      {/* Brand & Mode */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm tracking-wide text-slate-100">SentinelTwin</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-graphite-800 text-slate-400 border border-graphite-700">
              User App
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Personal Workstation Telemetry & Posture</p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-graphite-950 border border-graphite-800 text-xs">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-slate-300 font-mono text-[11px]">
            {isConnected ? 'Backend Active' : 'Offline / Standalone Mode'}
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-graphite-950 border border-graphite-800 text-xs text-slate-400 font-mono">
          <Server className="w-3 h-3 text-slate-500" />
          <span className="text-[11px] truncate max-w-[180px]">{serverUrl}</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Data"
          className="p-1.5 rounded-md hover:bg-graphite-800 text-slate-400 hover:text-slate-200 border border-transparent hover:border-graphite-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        <button
          onClick={handleOpenSoc}
          title="Open Main SOC Web Console in Browser"
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-graphite-800 hover:bg-graphite-700 text-slate-200 border border-graphite-700 hover:border-slate-600 text-xs font-medium transition"
        >
          <span>SOC Console</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
