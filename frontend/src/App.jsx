import React, { useEffect, useState, useCallback } from 'react'
import { getStatus } from './api/client'
import { StatusBar } from './components/StatusBar'
import { Sidebar } from './components/Sidebar'
import Overview from './pages/Overview'
import Network from './pages/Network'
import CyberTwin from './pages/CyberTwin'
import Events from './pages/Events'
import Alerts from './pages/Alerts'
import { Incidents, RiskIntel, CyberDNA, Devices } from './pages/OtherPages'

export default function App() {
  const [page, setPage] = useState('network')
  const [status, setStatus] = useState({
    status: 'operational',
    online_devices: 0,
    total_devices: 0,
    active_sensors: 0,
    open_alerts: 0,
    total_events: 0,
    discovery_active: false,
    is_monitoring: false,
  })

  const loadStatus = useCallback(async () => {
    try {
      const res = await getStatus()
      if (res?.data) {
        const d = res.data
        const online = d.online_devices ?? d.devices_online ?? d.devices?.online ?? 0
        const rawTotal = d.total_devices ?? d.devices_total ?? d.devices?.total ?? 0
        const total = rawTotal >= online && rawTotal > 0 ? rawTotal : online

        setStatus({
          status: d.status || 'operational',
          online_devices: online,
          total_devices: total,
          devices_online: online,
          devices_total: total,
          active_sensors: d.active_sensors ?? d.sensors_connected ?? d.sensors?.connected ?? 0,
          open_alerts: d.open_alerts ?? d.active_alerts ?? d.alerts_count ?? d.alerts?.open ?? 0,
          total_events: d.total_events ?? d.events_count ?? d.events?.total ?? 0,
          discovery_active: Boolean(d.discovery_active || d.is_monitoring || d.network?.discovery_active),
          is_monitoring: Boolean(d.is_monitoring || d.discovery_active || d.network?.discovery_active),
        })
      }
    } catch (err) {
      console.debug('Status polling error:', err)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 3000)
    return () => clearInterval(interval)
  }, [loadStatus])

  const alertCount = status.open_alerts ?? 0

  const pages = {
    overview: <Overview onNav={setPage} />,
    network: <Network onDiscoveryChange={loadStatus} />,
    cybertwin: <CyberTwin />,
    cyberdna: <CyberDNA />,
    events: <Events />,
    alerts: <Alerts onAlertChange={loadStatus} />,
    incidents: <Incidents />,
    risk: <RiskIntel />,
    devices: <Devices />,
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#070b14] text-slate-200">
      <StatusBar status={status} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={page} onNav={setPage} alertCount={alertCount} />
        <main className="flex-1 overflow-y-auto p-6 bg-[#070b14]">
          {pages[page] || <div className="p-6 text-slate-500 font-mono">Page not found</div>}
        </main>
      </div>
    </div>
  )
}