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
  Shield,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    title: 'COMMAND & TOPOLOGY',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'network', label: 'Network', icon: Network },
      { id: 'cybertwin', label: 'Cyber Twin', icon: Share2 },
    ],
  },
  {
    title: 'THREAT DETECTION & BEHAVIOR',
    items: [
      { id: 'cyberdna', label: 'CyberDNA', icon: Dna },
      { id: 'events', label: 'Events', icon: Activity },
      { id: 'alerts', label: 'Alerts', icon: BellRing, badgeKey: 'alerts' },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { id: 'incidents', label: 'Incidents', icon: ShieldAlert, badgeKey: 'incidents' },
      { id: 'risk', label: 'Risk Intel', icon: Gauge },
    ],
  },
  {
    title: 'SYSTEM & ASSETS',
    items: [
      { id: 'devices', label: 'Devices', icon: Laptop },
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
      className={`relative shrink-0 bg-slate-950/80 backdrop-blur-md border-r border-slate-800/80 flex flex-col justify-between py-3 transition-all duration-300 select-none z-20 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Navigation Sections */}
      <div className="space-y-5 overflow-y-auto px-2">
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
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
                    className={`w-full group relative flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-all duration-150 ${
                      isActive
                        ? 'bg-cyan-950/70 text-cyan-300 font-semibold border border-cyan-800/70 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    {/* Active Accent Pill */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                    )}

                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-300'
                      }`}
                    />

                    {!collapsed && (
                      <span className="truncate uppercase tracking-wider text-[11px]">
                        {item.label}
                      </span>
                    )}

                    {/* Counter Badge */}
                    {!collapsed && count > 0 && (
                      <span
                        className={`ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                          item.badgeKey === 'alerts'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/80 shadow-[0_0_6px_rgba(244,63,94,0.3)]'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/80'
                        }`}
                      >
                        {count}
                      </span>
                    )}

                    {/* Collapsed Dot Badge */}
                    {collapsed && count > 0 && (
                      <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Collapse Toggle */}
      <div className="pt-2 px-2 border-t border-slate-800/80">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 p-1.5 text-xs font-mono text-slate-500 hover:text-slate-300 hover:bg-slate-900/60 rounded border border-transparent hover:border-slate-800 transition"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider">Collapse View</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
