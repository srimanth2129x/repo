import React, { createContext, useContext, useState, useEffect } from 'react'
import { fetchSystemStatus, fetchAlerts, fetchEvents, fetchRiskSummary } from '../api/client'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [lastScanTime, setLastScanTime] = useState('Just now')

  // Explainer Modal state ("What does this mean?")
  const [explainer, setExplainer] = useState({
    isOpen: false,
    term: '',
    title: '',
    explanation: '',
    recommendation: ''
  })

  // Evidence Modal state for Alert details
  const [evidenceModal, setEvidenceModal] = useState({
    isOpen: false,
    alert: null
  })

  // Search filter
  const [searchQuery, setSearchQuery] = useState('')

  // Core device and security telemetry
  const [deviceInfo, setDeviceInfo] = useState({
    hostname: 'DESKTOP-INDIVIDUAL',
    ip: '192.168.1.105',
    mac: '74:D4:35:E1:92:AA',
    os: 'Windows 11 Home (64-bit)',
    sensorConnected: true,
    sensorVersion: 'v1.4.2-indiv',
    cpuPercent: 18,
    memoryPercent: 42,
    memoryFreeGb: 9.2,
    status: 'Online',
    lastHeartbeat: new Date().toLocaleTimeString()
  })

  // Risk summary
  const [riskData, setRiskData] = useState({
    score: 12,
    level: 'Low',
    summary: 'Your device is operating normally within its learned behavioral baseline.',
    factors: [
      { name: 'Process Anomaly', score: 4, max: 35, status: 'Normal', desc: 'All active processes match signed binaries' },
      { name: 'Network Drift', score: 3, max: 25, status: 'Normal', desc: 'No unusual outbound external socket connections' },
      { name: 'CyberDNA Deviation', score: 5, max: 25, status: 'Healthy', desc: 'Current activity aligns 95% with learned baseline' },
      { name: 'Privilege Escalation', score: 0, max: 15, status: 'Clean', desc: 'No elevation attempts detected' }
    ],
    history: [
      { day: 'Mon', score: 10 },
      { day: 'Tue', score: 12 },
      { day: 'Wed', score: 15 },
      { day: 'Thu', score: 11 },
      { day: 'Fri', score: 18 },
      { day: 'Sat', score: 14 },
      { day: 'Sun', score: 12 }
    ]
  })

  // Alerts
  const [alerts, setAlerts] = useState([
    {
      id: 'alt-101',
      title: 'Unusual Outbound PowerShell Process',
      severity: 'Medium',
      category: 'Process Behavior',
      timestamp: '15 mins ago',
      source: 'powershell.exe',
      description: 'PowerShell executed with an encoded base64 argument. CyberDNA noted this is outside typical evening habits.',
      mitre: 'T1059.001 - Command and Scripting Interpreter',
      status: 'Active',
      recommendedAction: 'Verify if you executed an automated maintenance script, or isolate process.'
    },
    {
      id: 'alt-102',
      title: 'Unrecognized External IP Connection',
      severity: 'Low',
      category: 'Network Guard',
      timestamp: '2 hours ago',
      source: '185.199.108.153 (GitHub CDN)',
      description: 'Outbound HTTPS connection established to new host. Traffic volume normal (1.4 KB).',
      mitre: 'T1071.001 - Application Layer Protocol: Web Protocols',
      status: 'Active',
      recommendedAction: 'Legitimate developer traffic. No action required.'
    },
    {
      id: 'alt-103',
      title: 'Scheduled Task Registered',
      severity: 'Low',
      category: 'Persistence',
      timestamp: '5 hours ago',
      source: 'taskeng.exe',
      description: 'Google Update scheduled task refreshed update timer.',
      mitre: 'T1053.005 - Scheduled Task/Job',
      status: 'Resolved',
      recommendedAction: 'Signed Google updater binary verified.'
    }
  ])

  // Initial load from backend API if available
  useEffect(() => {
    async function loadData() {
      try {
        const sys = await fetchSystemStatus()
        if (sys && sys.status === 'online') {
          setDeviceInfo(prev => ({
            ...prev,
            cpuPercent: Math.round(sys.cpu_usage_percent || 15),
            memoryPercent: Math.round(sys.memory_usage_percent || 40),
            memoryFreeGb: sys.memory_free_gb || 8.5,
            sensorConnected: !!sys.sensor_connected
          }))
        }
      } catch (err) {
        // Backend optional fallback
      }
    }
    loadData()
  }, [])

  // Scan simulation
  const startScan = () => {
    if (isScanning) return
    setIsScanning(true)
    setScanProgress(0)
    
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsScanning(false)
          setLastScanTime('Just now')
          return 100
        }
        return prev + 10
      })
    }, 250)
  }

  // Explainer helper
  const openExplainer = (term, title, explanation, recommendation) => {
    setExplainer({
      isOpen: true,
      term,
      title,
      explanation,
      recommendation
    })
  }

  const closeExplainer = () => {
    setExplainer(prev => ({ ...prev, isOpen: false }))
  }

  // Evidence helper
  const openEvidence = (alert) => {
    setEvidenceModal({
      isOpen: true,
      alert
    })
  }

  const closeEvidence = () => {
    setEvidenceModal({ isOpen: false, alert: null })
  }

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  const resolveAlert = (alertId) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'Resolved' } : a))
  }

  const activeAlertsCount = alerts.filter(a => a.status === 'Active').length

  const value = {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    isScanning,
    scanProgress,
    startScan,
    lastScanTime,
    deviceInfo,
    riskData,
    setRiskData,
    alerts,
    activeAlertsCount,
    dismissAlert,
    resolveAlert,
    explainer,
    openExplainer,
    closeExplainer,
    evidenceModal,
    openEvidence,
    closeEvidence,
    searchQuery,
    setSearchQuery,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext
