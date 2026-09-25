import React from 'react';
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Laptop,
  Globe,
  Settings,
  Cpu
} from 'lucide-react';

export function Sidebar({ currentTab, onSelectTab, alertCount = 0, isConnected }) {
  const navItems = [
    { id: 'protection', label: 'Protection Overview', icon: ShieldCheck },
    { id: 'cyberdna', label: 'Personal CyberDNA', icon: Activity },
    { id: 'alerts', label: 'Security Alerts', icon: AlertTriangle, badge: alertCount },
    { id: 'devices', label: 'My Devices & Network', icon: Laptop },
    { id: 'browser', label: 'SOC Dashboard Browser', icon: Globe },
    { id: 'settings', label: 'Settings & Connectivity', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-graphite-900/90 border-r border-graphite-800 flex flex-col justify-between select-none shrink-0">
      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-slate-500">
          User Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-graphite-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Posture Footer */}
      <div className="p-3 border-t border-graphite-800/80 bg-graphite-950/40">
        <div className="flex items-center space-x-3 px-2 py-2">
          <div className="w-8 h-8 rounded bg-graphite-800 border border-graphite-700 flex items-center justify-center text-slate-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-slate-200 truncate">Workstation Client</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {isConnected ? 'Telemetry Synced' : 'Offline / Standalone'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
