import React from 'react';
import {
  Sun,
  Moon,
  RefreshCw,
  ExternalLink,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { getApiBaseUrl } from '../../api/client';

export default function Header() {
  const {
    deviceInfo,
    startScan,
    isScanning,
    scanProgress,
    activeTab
  } = useApp();
  const { theme, toggleTheme, isDark } = useTheme();

  const handleOpenSoc = () => {
    const url = 'http://localhost:5173';
    if (typeof window !== 'undefined' && window.sentinelUserApi?.openExternal) {
      window.sentinelUserApi.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const currentEndpoint = getApiBaseUrl();

  return (
    <header className="h-14 bg-white dark:bg-graphite-900 border-b border-slate-200 dark:border-graphite-800 flex items-center justify-between px-6 select-none shrink-0 z-10 transition-colors">
      {/* Active Area Title */}
      <div className="flex items-center space-x-3">
        <h1 className="text-sm font-bold capitalize text-slate-800 dark:text-slate-100">
          {activeTab === 'socbrowser' ? 'Central SOC Integration' : activeTab}
        </h1>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate max-w-[200px]">{currentEndpoint}</span>
        </div>
      </div>

      {/* Center Scan Status / Progress */}
      {isScanning && (
        <div className="hidden md:flex items-center space-x-3 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Deep Scan in Progress: {scanProgress}%</span>
          <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center space-x-2">
        {/* Quick Scan Button */}
        <button
          onClick={startScan}
          disabled={isScanning}
          title="Run quick behavioral scan"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/20 disabled:opacity-60 transition active:scale-95"
        >
          <Zap className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning...' : 'Quick Scan'}</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          className="p-2 rounded-xl bg-slate-100 dark:bg-graphite-800 hover:bg-slate-200 dark:hover:bg-graphite-700 border border-slate-200 dark:border-graphite-700 text-slate-600 dark:text-slate-300 transition"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
        </button>

        {/* SOC Web Link */}
        <button
          onClick={handleOpenSoc}
          title="Open Central SOC Console in browser"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-graphite-800 hover:bg-slate-200 dark:hover:bg-graphite-700 border border-slate-200 dark:border-graphite-700 text-slate-700 dark:text-slate-300 transition"
        >
          <span>SOC Web</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
