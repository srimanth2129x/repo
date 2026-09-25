import React from 'react';
import {
  ShieldCheck,
  Shield,
  Activity,
  Fingerprint,
  Share2,
  ListOrdered,
  AlertTriangle,
  Laptop,
  Settings as SettingsIcon,
  Globe,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    activeAlertsCount,
    deviceInfo
  } = useApp();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck, group: 'Protection' },
    { id: 'security', label: 'Security', icon: Shield, group: 'Protection' },
    { id: 'risk', label: 'Risk Assessment', icon: Activity, group: 'Protection' },
    { id: 'cyberdna', label: 'CyberDNA Baseline', icon: Fingerprint, group: 'Intelligence' },
    { id: 'digitaltwin', label: 'Digital Twin Graph', icon: Share2, group: 'Intelligence' },
    { id: 'events', label: 'Telemetry Events', icon: ListOrdered, group: 'Operations' },
    { id: 'alerts', label: 'Security Alerts', icon: AlertTriangle, badge: activeAlertsCount, group: 'Operations' },
    { id: 'device', label: 'Device & Hardware', icon: Laptop, group: 'System' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, group: 'System' },
    { id: 'socbrowser', label: 'Central SOC Web', icon: Globe, group: 'Integration' },
  ];

  return (
    <aside
      className={`h-full bg-white dark:bg-graphite-900 border-r border-slate-200 dark:border-graphite-800 flex flex-col justify-between select-none shrink-0 transition-all duration-200 z-20 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-graphite-800 flex items-center justify-between">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-900/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                  SentinelTwin
                </span>
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-graphite-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-graphite-700">
                  User
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">Workstation Client</p>
            </div>
          </div>
        )}

        {sidebarCollapsed && (
          <div className="mx-auto w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-800 transition ${
            sidebarCollapsed ? 'hidden' : ''
          }`}
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
              } rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400 scale-110' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  {item.badge}
                </span>
              )}

              {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer / Device Status */}
      <div className="p-3 border-t border-slate-200 dark:border-graphite-800 bg-slate-50/70 dark:bg-graphite-950/50">
        <div className="flex items-center space-x-3 px-2 py-1.5">
          <div className="w-8 h-8 rounded-lg bg-slate-200/80 dark:bg-graphite-800 border border-slate-300 dark:border-graphite-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {deviceInfo.hostname}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Protected</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
