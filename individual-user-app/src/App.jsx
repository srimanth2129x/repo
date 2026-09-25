import React from 'react'
import { useApp } from './context/AppContext'
import DesktopShell from './components/layout/DesktopShell'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import StatusBar from './components/layout/StatusBar'
import ExplainerModal from './components/common/ExplainerModal'
import EvidenceModal from './components/common/EvidenceModal'

// Pages
import Overview from './pages/Overview'
import Security from './pages/Security'
import Risk from './pages/Risk'
import CyberDNA from './pages/CyberDNA'
import DigitalTwin from './pages/DigitalTwin'
import Events from './pages/Events'
import Alerts from './pages/Alerts'
import Device from './pages/Device'
import Settings from './pages/Settings'
import { SocBrowser } from './pages/SocBrowser'

export default function App() {
  const { activeTab } = useApp()

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />
      case 'security':
        return <Security />
      case 'risk':
        return <Risk />
      case 'cyberdna':
        return <CyberDNA />
      case 'digitaltwin':
        return <DigitalTwin />
      case 'events':
        return <Events />
      case 'alerts':
        return <Alerts />
      case 'device':
        return <Device />
      case 'settings':
        return <Settings />
      case 'browser':
      case 'socbrowser':
        return <SocBrowser />
      default:
        return <Overview />
    }
  }

  return (
    <DesktopShell>
      {/* Collapsible Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Workspace Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/60 dark:bg-slate-950/80">
        {/* Top App Header */}
        <Header />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {renderActiveScreen()}
          </div>
        </main>

        {/* Desktop Status Bar */}
        <StatusBar />
      </div>

      {/* Interactive Global Modals */}
      <ExplainerModal />
      <EvidenceModal />
    </DesktopShell>
  )
}
