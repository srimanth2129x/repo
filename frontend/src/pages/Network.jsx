import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  getNetworkInterfaces,
  getDiscoveredDevices,
  triggerDiscovery,
  startMonitoring,
  stopMonitoring,
  clearDiscoveredDevices,
} from '../api/client'
import { Card, SectionHeader, Spinner, StatusBadge, RiskBadge, EmptyState } from '../components/ui/Card'

const AUTH_STORAGE_KEY = 'sentinel_network_discovery_consent'

// Helper function to check if an IP belongs to an interface's subnet/network
function isIpInSubnet(deviceIp, iface) {
  if (!deviceIp || !iface || !iface.ip) return false
  if (deviceIp === iface.ip) return true

  // Compare first 3 octets for standard /24 subnets (e.g. 192.168.0.x)
  const ifaceParts = iface.ip.split('.')
  const devParts = deviceIp.split('.')
  if (ifaceParts.length === 4 && devParts.length === 4) {
    if (ifaceParts[0] === devParts[0] && ifaceParts[1] === devParts[1] && ifaceParts[2] === devParts[2]) {
      return true
    }
  }

  // Fallback: Match prefix blocks
  const ifacePrefix = iface.ip.split('.').slice(0, 2).join('.')
  const devPrefix = deviceIp.split('.').slice(0, 2).join('.')
  return ifacePrefix === devPrefix
}

export function Network({ onDiscoveryChange }) {
  const [interfaces, setInterfaces] = useState([])
  const [selectedIface, setSelectedIface] = useState(null)
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [monitoring, setMonitoring] = useState(false)

  // Initialize authorization state from localStorage
  const [authorized, setAuthorized] = useState(() => {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true'
  })

  const handleAuthorize = () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true')
    setAuthorized(true)
  }

  const handleRevokeAuthorization = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuthorized(false)
  }

  const fetchData = useCallback(async () => {
    try {
      const [ifaceRes, devRes] = await Promise.all([
        getNetworkInterfaces().catch(() => ({ data: [] })),
        getDiscoveredDevices().catch(() => ({ data: [] })),
      ])
      const ifaceList = Array.isArray(ifaceRes.data) ? ifaceRes.data : []
      const devList = Array.isArray(devRes.data) ? devRes.data : []

      setInterfaces(ifaceList)
      setDevices(devList)

      if (ifaceList.length > 0 && !selectedIface) {
        // Prioritize Wi-Fi, Ethernet, or active private subnets over APIPA/loopback
        const preferred = ifaceList.find(
          (i) =>
            i?.ip &&
            !i.ip.startsWith('169.254.') &&
            !i.ip.startsWith('127.') &&
            (i?.name?.toLowerCase().includes('wi-fi') ||
              i?.name?.toLowerCase().includes('wireless') ||
              i?.name?.toLowerCase().includes('wlan') ||
              i?.ip.startsWith('192.168.') ||
              i?.ip.startsWith('10.'))
        ) || ifaceList.find(
          (i) => i?.ip && !i.ip.startsWith('169.254.') && !i.ip.startsWith('127.')
        )
        setSelectedIface(preferred || ifaceList[0])
      }
    } catch (err) {
      console.error('Failed to load network data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedIface])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const notifyChange = () => {
    if (typeof onDiscoveryChange === 'function') {
      onDiscoveryChange()
    }
  }

  // Filter devices belonging to the selected network card, or fallback to all devices if filtered set is empty
  const filteredDevices = useMemo(() => {
    if (!selectedIface) return devices
    const matched = devices.filter((dev) => isIpInSubnet(dev.ip_address, selectedIface))
    return matched.length > 0 ? matched : devices
  }, [devices, selectedIface])

  const handleRunDiscovery = async () => {
    if (!selectedIface) return
    setScanning(true)
    try {
      await triggerDiscovery({
        interface: selectedIface.name,
        interface_name: selectedIface.name,
        interface_ip: selectedIface.ip,
      })
      await fetchData()
      notifyChange()
    } catch (err) {
      console.error('Discovery error:', err)
    } finally {
      setScanning(false)
    }
  }

  const handleStartMonitoring = async () => {
    if (!selectedIface) return
    try {
      await startMonitoring({
        interface: selectedIface.name,
        interface_name: selectedIface.name,
        interval: 30,
      })
      setMonitoring(true)
      notifyChange()
    } catch (err) {
      console.error('Start monitoring error:', err)
    }
  }

  const handleStopMonitoring = async () => {
    try {
      await stopMonitoring()
      setMonitoring(false)
      notifyChange()
    } catch (err) {
      console.error('Stop monitoring error:', err)
    }
  }

  const handleClearDevices = async () => {
    if (!window.confirm('Clear all discovered network devices from the active views?')) return
    try {
      await clearDiscoveredDevices()
      setMonitoring(false)
      await fetchData()
      notifyChange()
    } catch (err) {
      console.error('Clear devices error:', err)
    }
  }

  const formatLastSeen = (ts) => {
    if (!ts) return '—'
    try {
      const d = new Date(ts)
      return isNaN(d.getTime()) ? String(ts) : d.toLocaleTimeString()
    } catch {
      return String(ts)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Authorization Banner */}
      {!authorized ? (
        <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-amber-300">
              NETWORK MONITORING AUTHORIZATION REQUIRED
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Confirm you have permission to discover and model endpoints on this local network.
            </div>
          </div>
          <button
            onClick={handleAuthorize}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-xs font-mono transition shadow"
          >
            I CONFIRM — I am authorized to monitor this network
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            Network Discovery Permission: <span className="text-emerald-300 font-semibold">Authorized</span>
          </span>
          <button
            onClick={handleRevokeAuthorization}
            className="text-slate-500 hover:text-rose-400 transition underline text-[10px]"
          >
            Revoke Permission
          </button>
        </div>
      )}

      {/* Network Status & Interface Selection */}
      <Card>
        <SectionHeader title="NETWORK STATUS" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {interfaces.map((iface) => {
            const isSelected = selectedIface?.name === iface.name
            const statusDisplay = iface.status || (iface.is_up ? 'up' : 'active')
            const countForCard = devices.filter((dev) => isIpInSubnet(dev.ip_address, iface)).length

            return (
              <div
                key={iface.name || Math.random()}
                onClick={() => setSelectedIface(iface)}
                className={`p-3.5 rounded border cursor-pointer transition ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800 bg-navy-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-200">{iface.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                      {countForCard} hosts
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
                      {statusDisplay}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 text-xs font-mono text-slate-400">
                  <div>
                    IP: <span className="text-slate-200">{iface.ip || '—'}</span>
                  </div>
                  <div>
                    Subnet: <span className="text-slate-200">{iface.subnet || iface.netmask || '255.255.255.0'}</span>
                  </div>
                  <div>
                    Gateway: <span className="text-slate-200">{iface.gateway || '—'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400">
            Selected Adapter: <span className="text-cyan-400 font-bold">{selectedIface?.name || 'None'}</span> ·{' '}
            Showing: <span className="text-cyan-400 font-bold">{filteredDevices.length}</span> devices (
            <span className="text-green-400 font-bold">
              {filteredDevices.filter((d) => (d.status || '').toLowerCase() === 'online').length}
            </span>{' '}
            online)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDiscovery}
              disabled={!authorized || scanning}
              className="px-3 py-1.5 bg-cyan-900/60 hover:bg-cyan-800 disabled:opacity-40 border border-cyan-700 text-cyan-300 rounded text-xs font-mono flex items-center gap-1.5 transition"
            >
              {scanning ? '⟳ Scanning...' : '⟳ Run Discovery'}
            </button>

            {!monitoring ? (
              <button
                onClick={handleStartMonitoring}
                disabled={!authorized}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-600 text-slate-300 rounded text-xs font-mono transition"
              >
                ▶ Start Monitoring
              </button>
            ) : (
              <button
                onClick={handleStopMonitoring}
                className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-300 rounded text-xs font-mono transition"
              >
                ■ Stop Monitoring
              </button>
            )}

            <button
              onClick={handleClearDevices}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-400 rounded text-xs font-mono transition"
            >
              🗑 Clear Active Devices
            </button>
          </div>
        </div>
      </Card>

      {/* Discovered Devices Table */}
      <Card>
        <SectionHeader title={`DISCOVERED DEVICES — ${selectedIface?.name || 'ACTIVE ADAPTER'} (${filteredDevices.length})`} />
        {filteredDevices.length === 0 ? (
          <EmptyState message={`No devices discovered on ${selectedIface?.name || 'this interface'}. Click 'Run Discovery' to sweep.`} />
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">IP</th>
                  <th className="py-2 px-3">Hostname</th>
                  <th className="py-2 px-3">MAC</th>
                  <th className="py-2 px-3">Vendor</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Sensor</th>
                  <th className="py-2 px-3">Risk</th>
                  <th className="py-2 px-3">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDevices.map((device) => (
                  <tr key={device.id || device.ip_address || Math.random()} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-cyan-400 font-semibold">{device.ip_address || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-200">{device.hostname || 'Unknown'}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{device.mac_address || 'Unknown'}</td>
                    <td className="py-2.5 px-3 text-slate-300">{device.vendor || 'Unknown'}</td>
                    <td className="py-2.5 px-3 text-slate-300">{device.device_type || 'Unknown'}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={device.status || 'Offline'} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {device.sensor_connected ? '✓ Connected' : '✗ None'}
                    </td>
                    <td className="py-2.5 px-3">
                      <RiskBadge level={device.trust_level || device.risk_level || 'ADAPTIVE'} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {formatLastSeen(device.last_seen || device.first_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Network