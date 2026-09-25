import React from 'react'
import {
  ShieldCheck,
  Shield,
  Activity,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  AlertTriangle,
  Fingerprint,
  Share2
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import RiskGauge from '../components/common/RiskGauge'

export default function Overview() {
  const {
    deviceInfo,
    riskData,
    alerts,
    activeAlertsCount,
    startScan,
    isScanning,
    scanProgress,
    setActiveTab,
    openExplainer
  } = useApp()

  const handleDeviceStatusExplain = () => {
    openExplainer(
      'Device Health',
      'Is my device okay?',
      'Yes, your computer is completely healthy. SentinelTwin has detected 0 active high-priority threats. All background processes running on your system match verified signatures and fall within your normal daily usage patterns.',
      'No action is required. SentinelTwin runs quietly in the background without slowing down your computer.'
    )
  }

  const handleDnaExplain = () => {
    openExplainer(
      'CyberDNA Harmony',
      'What does "95% CyberDNA Match" mean?',
      'CyberDNA learns what applications you normally open, your typical hours of activity, and your regular network connections. Today, your activity matches 95% of your baseline, which means there is no anomalous or hijacked behavior happening on your computer.',
      'Continue using your system normally. The baseline dynamically updates as you work.'
    )
  }

  return (
    <div className="space-y-6 animate-page pb-8">
      {/* 1. Hero Protection Status Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-xl shadow-emerald-950/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-5">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner flex-shrink-0">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
                  Real-time Active
                </span>
                <span className="text-xs text-white/80">
                  {deviceInfo.hostname}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Your device is protected
              </h2>
              <p className="text-white/90 text-sm mt-1 max-w-xl leading-relaxed">
                SentinelTwin is monitoring your system against behavioral anomalies and unauthorized activity. All core security shields are operational.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleDeviceStatusExplain}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center justify-center space-x-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Is my device okay?</span>
            </button>
            <button
              onClick={startScan}
              disabled={isScanning}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-white/90 text-emerald-900 font-bold text-sm shadow-lg shadow-black/10 transition-all flex items-center justify-center space-x-2 disabled:opacity-75"
            >
              <Zap className="w-4 h-4 fill-emerald-700 text-emerald-700" />
              <span>{isScanning ? `Scanning (${scanProgress}%)` : 'Run Quick Scan'}</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Key Metrics Row: Risk Score Dial, CyberDNA Harmony, Active Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Score Dial Card */}
        <Card
          title="Overall Risk Score"
          subtitle="Point-based explainable risk index"
          action={
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('risk')}>
              View Details
            </Button>
          }
        >
          <RiskGauge score={riskData.score} />
        </Card>

        {/* CyberDNA Harmony Card */}
        <Card
          title="CyberDNA Harmony"
          subtitle="Behavioral drift & anomaly indicator"
          action={
            <button
              onClick={handleDnaExplain}
              className="text-xs text-slate-400 hover:text-emerald-500 transition-colors flex items-center space-x-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Explain</span>
            </button>
          }
        >
          <div className="flex flex-col items-center justify-center py-3 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <Fingerprint className="w-10 h-10" />
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  95%
                </span>
                <Badge variant="shield" size="sm">
                  Optimal Match
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Your computer’s current behavior closely aligns with your personal usage baseline. No anomalous drift detected.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => setActiveTab('cyberdna')}
              className="w-full"
            >
              Inspect CyberDNA Profile
            </Button>
          </div>
        </Card>

        {/* Needs Attention / Active Notifications Card */}
        <Card
          title="What Needs Attention"
          subtitle="Items requiring your review"
          action={
            <Badge variant={activeAlertsCount > 0 ? 'warning' : 'shield'} size="sm">
              {activeAlertsCount} {activeAlertsCount === 1 ? 'Item' : 'Items'}
            </Badge>
          }
        >
          <div className="space-y-3 py-1">
            {activeAlertsCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  All clear!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  No active security warnings or unresolved alerts on this workstation.
                </p>
              </div>
            ) : (
              alerts
                .filter(a => a.status === 'Active')
                .slice(0, 2)
                .map(alert => (
                  <div
                    key={alert.id}
                    onClick={() => setActiveTab('alerts')}
                    className="p-3.5 rounded-xl border border-amber-500/20 dark:border-amber-500/30 bg-slate-50/90 dark:bg-slate-950/70 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-sm cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {alert.title}
                      </span>
                      <Badge variant="warning" size="sm">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                ))
            )}

            <Button
              variant="secondary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => setActiveTab('alerts')}
              className="w-full mt-2"
            >
              Go to Alerts Center
            </Button>
          </div>
        </Card>
      </div>

      {/* 3. Active Protections Grid & Digital Twin Mini Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Protection Shields (2 Cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Core Protection Shields"
            subtitle="Real-time behavioral sensors active on this endpoint"
            action={
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('security')}>
                Manage Shields
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Process Behavioral Guard', desc: 'Detects unexpected process execution or privilege drift', status: 'Active' },
                { title: 'Network Outbound Sentinel', desc: 'Monitors external socket connections and port scans', status: 'Active' },
                { title: 'CyberDNA Anomaly Engine', desc: 'Compares active usage against your personal habits', status: 'Active' },
                { title: 'File Integrity & Ransomware Guard', desc: 'Protects critical system directories against encryption', status: 'Active' },
              ].map((shield, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 flex items-start space-x-3.5 transition-all hover:border-emerald-500/40 hover:dark:border-emerald-500/30"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {shield.title}
                      </h4>
                      <Badge variant="shield" size="sm">
                        {shield.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {shield.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Digital Twin Quick Glance (1 Col) */}
        <Card
          title="Digital Twin Snapshot"
          subtitle="Model of this device & active connections"
          action={
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('digitaltwin')}>
              Explore Map
            </Button>
          }
        >
          <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Share2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Topology is Isolated & Healthy
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Your device currently connects to 1 local router and 2 trusted cloud providers. No lateral attack propagation paths identified.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('digitaltwin')}
              className="w-full"
            >
              Open Interactive Graph
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
