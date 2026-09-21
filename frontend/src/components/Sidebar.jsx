import React, { useState } from 'react'
import {
  LayoutDashboard,
  Network,
  Share2,
  Dna,
  Activity,
  BellRing,
  ShieldAlert,
  Gauge,
  Laptop,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    title: 'CORE',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    title: 'MONITOR',
    items: [
      { id: 'devices', label: 'Devices', icon: Laptop },
      { id: 'events', label: 'Events', icon: Activity },
      { id: 'alerts', label: 'Alerts', icon: BellRing, badgeKey: 'alerts' },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { id: 'cyberdna', label: 'CyberDNA', icon: Dna },
      { id: 'risk', label: 'Risk Analysis', icon: Gauge },
      { id: 'incidents', label: 'Incidents', icon: ShieldAlert, badgeKey: 'incidents' },
    ],
  },
  {
    title: 'DIGITAL TWIN',
    items: [
      { id: 'network', label: 'Network', icon: Network },
      { id: 'cybertwin', label: 'Digital Twin & Sims', icon: Share2 },
    ],
  },
]

export function Sidebar({ active, onNav, alertCount = 0, incidentCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false)

  const getBadgeCount = (key) => {
    if (key === 'alerts') return alertCount
    if (key === 'incidents') return incidentCount
    return 0
  }

  return (
    <aside
      className={`relative shrink-0 bg-white dark:bg-[#0c1018] border-r border-slate-200 dark:border-[#1e2738] flex flex-col justify-between py-3 transition-all duration-300 select-none z-20 theme-transition ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Navigation Sections */}
      <div className="space-y-4 overflow-y-auto px-2.5">
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 pb-1 text-[9px] font-mono font-bold tracking-widest text-slate-400 dark:text-slate-400 uppercase">
                {group.title}
              </div>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id
                const count = getBadgeCount(item.badgeKey)

                return (
                  <button
                    key={item.id}
                    onClick={() => onNav(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full group relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold border border-slate-300 dark:border-slate-700 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/60 border border-transparent'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    {/* Active Accent Pill */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    )}

                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                      }`}
                    />

                    {!collapsed && (
                      <span className="truncate tracking-wide text-[11px] font-medium">
                        {item.label}
                      </span>
                    )}

                    {/* Counter Badge */}
                    {!collapsed && count > 0 && (
                      <span
                        className={`ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                          item.badgeKey === 'alerts'
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800/80'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80'
                        }`}
                      >
                        {count}
                      </span>
                    )}

                    {/* Collapsed Dot Badge */}
                    {collapsed && count > 0 && (
                      <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Collapse Toggle */}
      <div className="pt-2 px-2.5 border-t border-slate-200 dark:border-[#1e2738]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 p-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Collapse Nav</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
