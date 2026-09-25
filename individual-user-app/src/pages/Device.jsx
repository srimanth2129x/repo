import React, { useState } from 'react'
import {
  Laptop,
  Cpu,
  HardDrive,
  Wifi,
  Activity,
  CheckCircle,
  RefreshCw,
  Shield,
  Clock,
  Terminal,
  Server,
  Zap
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import { fetchSystemStatus } from '../api/client'

export default function Device() {
  const { deviceInfo, startScan, isScanning, scanProgress } = useApp()
  const [refreshing, setRefreshing] = useState(false)
  const [lastCheck, setLastCheck] = useState('Just now')

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchSystemStatus()
      setLastCheck('Just now')
    } finally {
      setTimeout(() => setRefreshing(false), 400)
    }
  }

  return (
    <div className="space-y-6 animate-page pb-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex-shrink-0 shadow-lg shadow-cyan-500/20">
            <Laptop className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {deviceInfo.hostname}
              </h2>
              <Badge variant="shield" size="sm" dot>
                Monitored Endpoint
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Hardware and system telemetry for this personal device. The local SentinelTwin sensor runs with zero cloud dependency.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Updating...' : 'Refresh Telemetry'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Zap}
            onClick={startScan}
            disabled={isScanning}
          >
            {isScanning ? `Testing (${scanProgress}%)` : 'Run Diagnostics'}
          </Button>
        </div>
      </div>

      {/* Hardware Telemetry Progress Meters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <span>CPU Utilization</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              {deviceInfo.cpuPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${deviceInfo.cpuPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Low background overhead. Sensor takes &lt; 0.5% CPU.
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span>Memory (RAM)</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              {deviceInfo.memoryPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${deviceInfo.memoryPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {deviceInfo.memoryFreeGb} GB free of 16 GB available RAM.
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <span>Local Storage</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              34% Used
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: '34%' }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            NVMe SSD healthy. 382 GB free on C: drive.
          </p>
        </Card>
      </div>

      {/* Specifications & Sensor Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Specifications */}
        <Card
          title="Device Specifications"
          subtitle="Operating system and network interfaces"
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {[
              { label: 'Device Name', val: deviceInfo.hostname },
              { label: 'Operating System', val: deviceInfo.os },
              { label: 'Local IP Address', val: deviceInfo.ip },
              { label: 'MAC Hardware Address', val: deviceInfo.mac },
              { label: 'Network Adapter', val: 'Wi-Fi 6 (Intel AX201)' },
              { label: 'System Uptime', val: '4 days, 6 hours' },
            ].map((spec, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">{spec.label}</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {spec.val}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Local Sensor Architecture */}
        <Card
          title="SentinelTwin Sensor Agent"
          subtitle="Local monitoring daemon specifications"
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {[
              { label: 'Sensor Version', val: deviceInfo.sensorVersion },
              { label: 'Heartbeat Status', val: 'Online (Continuous)', badge: 'shield' },
              { label: 'Ingestion Engine', val: 'Windows Event Log / Sysmon' },
              { label: 'Data Encryption', val: 'AES-256 (Local SQLite)' },
              { label: 'Cloud Exfiltration', val: 'Disabled (Air-gapped by design)' },
              { label: 'Last Calibrated', val: deviceInfo.lastHeartbeat },
            ].map((s, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">{s.label}</span>
                {s.badge ? (
                  <Badge variant={s.badge} size="sm" dot>
                    {s.val}
                  </Badge>
                ) : (
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {s.val}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
