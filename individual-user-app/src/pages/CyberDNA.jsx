import React from 'react'
import {
  Fingerprint,
  Clock,
  Activity,
  Layers,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Cpu,
  Shield,
  Zap,
  Info
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { useApp } from '../context/AppContext'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'

export default function CyberDNA() {
  const { openExplainer } = useApp()

  const hourlyData = [
    { hour: '06:00', activity: 2 },
    { hour: '08:00', activity: 15 },
    { hour: '10:00', activity: 85 },
    { hour: '12:00', activity: 65 },
    { hour: '14:00', activity: 92 },
    { hour: '16:00', activity: 78 },
    { hour: '18:00', activity: 45 },
    { hour: '20:00', activity: 22 },
    { hour: '22:00', activity: 8 },
    { hour: '00:00', activity: 1 },
  ]

  const topProcesses = [
    { name: 'Google Chrome', exe: 'chrome.exe', share: '38%', events: '8,420', status: 'Core Baseline' },
    { name: 'Visual Studio Code', exe: 'code.exe', share: '29%', events: '6,104', status: 'Core Baseline' },
    { name: 'Slack Desktop', exe: 'slack.exe', share: '14%', events: '3,020', status: 'Core Baseline' },
    { name: 'Node.js Runtime', exe: 'node.exe', share: '11%', events: '2,410', status: 'Developer DNA' },
    { name: 'Windows Terminal', exe: 'windowsterminal.exe', share: '8%', events: '1,850', status: 'Developer DNA' },
  ]

  const handleDnaExplain = () => {
    openExplainer(
      'CyberDNA Behavioral Modeling',
      'How does CyberDNA understand you?',
      'CyberDNA creates a unique behavioral fingerprint for your device using continuous statistical learning (Welford’s algorithm). Rather than relying on static antivirus signatures that can easily be bypassed, CyberDNA tracks: (1) what applications you normally run, (2) your typical working hours, and (3) your expected outbound network connections. If malware or an unauthorized user takes over, their behavior deviates from your DNA, triggering an immediate alert.',
      'You do not need to train CyberDNA manually. It adapts naturally as you use your computer.'
    )
  }

  return (
    <div className="space-y-6 animate-page pb-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex-shrink-0 shadow-lg shadow-emerald-500/20">
            <Fingerprint className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Personal CyberDNA Profile
              </h2>
              <Badge variant="shield" size="sm" dot>
                Calibrated (14-day history)
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Your unique behavioral baseline. SentinelTwin continuously compares real-time endpoint execution against your established personal patterns.
            </p>
          </div>
        </div>

        <button
          onClick={handleDnaExplain}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex-shrink-0"
        >
          <HelpCircle className="w-4 h-4 text-emerald-500" />
          <span>How CyberDNA learns</span>
        </button>
      </div>

      {/* CyberDNA Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Baseline Harmony
            </span>
            <Badge variant="shield" size="sm">Optimal</Badge>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              95.2%
            </span>
            <span className="text-xs text-emerald-500 font-semibold">Normal</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Current system execution matches your established profile.
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Observed Drift Variance
            </span>
            <Badge variant="shield" size="sm">Minimal</Badge>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              0.04
            </span>
            <span className="text-xs text-slate-400">σ² variance</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Standard deviation within safe statistical bounds.
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Active Profile Type
            </span>
            <Badge variant="indigo" size="sm">Developer</Badge>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Workstation
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Includes compiler, git, and local dev server tolerances.
          </p>
        </Card>
      </div>

      {/* Typical Activity Hours Chart */}
      <Card
        title="Your Working Hours Pattern"
        subtitle="Learned daily distribution of keyboard & process activity across 24 hours"
      >
        <div className="h-64 w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px'
                }}
                formatter={(val) => [`${val}% activity`, 'Expected Volume']}
              />
              <Bar dataKey="activity" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-3 mt-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>
            <strong>Learned Peak Window:</strong> 09:30 AM – 06:30 PM. Outbound connections initiated after midnight trigger automatic secondary verification.
          </span>
        </div>
      </Card>

      {/* Top Trusted Applications in CyberDNA */}
      <Card
        title="Trusted Application Fingerprints"
        subtitle="Applications that form your primary behavioral footprint"
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {topProcesses.map((proc, i) => (
            <div key={i} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">
                  <Cpu className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {proc.name}
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    {proc.exe}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {proc.share}
                  </span>
                  <p className="text-[11px] text-slate-400">{proc.events} events</p>
                </div>
                <Badge variant="shield" size="sm">
                  {proc.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
