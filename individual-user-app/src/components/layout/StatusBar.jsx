import React from 'react';
import { Cpu, HardDrive, ShieldCheck, Wifi, Clock, Activity } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function StatusBar() {
  const { deviceInfo, lastScanTime } = useApp();

  return (
    <footer className="h-7 bg-white dark:bg-graphite-900 border-t border-slate-200 dark:border-graphite-800 px-4 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 select-none shrink-0 transition-colors">
      {/* Left Telemetry: Device & Network */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-slate-700 dark:text-slate-300 font-semibold">{deviceInfo.hostname}</span>
          <span className="text-slate-400 dark:text-slate-600">({deviceInfo.ip})</span>
        </div>

        <div className="hidden sm:flex items-center space-x-3 text-slate-400 dark:text-slate-500">
          <div className="flex items-center space-x-1">
            <Cpu className="w-3 h-3" />
            <span>CPU {deviceInfo.cpuPercent}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>RAM {deviceInfo.memoryPercent}%</span>
          </div>
        </div>
      </div>

      {/* Right Telemetry: Sensor Heartbeat & Version */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Endpoint Shield Active</span>
        </div>

        <div className="hidden md:flex items-center space-x-1 text-slate-400 dark:text-slate-500">
          <Clock className="w-3 h-3" />
          <span>Last scan: {lastScanTime}</span>
        </div>

        <div className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-graphite-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-graphite-700">
          Desktop v1.0.0
        </div>
      </div>
    </footer>
  );
}
