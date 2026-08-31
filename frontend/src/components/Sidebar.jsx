const NAV = [
  { id: 'overview', label: 'Overview', icon: '⬡' },
  { id: 'network', label: 'Network', icon: '⬡' },
  { id: 'cybertwin', label: 'Cyber Twin', icon: '⬡' },
  { id: 'cyberdna', label: 'CyberDNA', icon: '⬡' },
  { id: 'events', label: 'Events', icon: '⬡' },
  { id: 'alerts', label: 'Alerts', icon: '⬡' },
  { id: 'incidents', label: 'Incidents', icon: '⬡' },
  { id: 'risk', label: 'Risk Intel', icon: '⬡' },
  { id: 'devices', label: 'Devices', icon: '⬡' },
]

export function Sidebar({ active, onNav, alertCount }) {
  return (
    <nav className="w-52 shrink-0 bg-[#0a1628] border-r border-[#1e3a5f] flex flex-col py-4">
      {NAV.map(({ id, label }) => {
        const isActive = active === id
        const badge = id === 'alerts' && alertCount > 0
        return (
          <button
            key={id}
            onClick={() => onNav(id)}
            className={`text-left px-5 py-2.5 text-xs font-mono flex items-center justify-between transition-colors
              ${isActive
                ? 'bg-cyan-950 text-cyan-400 border-r-2 border-cyan-400'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-[#0d1f3c]'
              }`}
          >
            <span className="uppercase tracking-widest">{label}</span>
            {badge && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {alertCount}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
