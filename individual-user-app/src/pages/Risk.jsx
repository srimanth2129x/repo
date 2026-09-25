import React from 'react'
import {
  Activity,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  ShieldCheck,
  Cpu,
  Globe,
  Fingerprint,
  Key,
  Info,
  Lightbulb
} from 'lucide-react'
import {
  AreaChart,
  Area,
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
import RiskGauge from '../components/common/RiskGauge'

export default function Risk() {
  const { riskData, openExplainer } = useApp()

  const handleScoreExplain = () => {
    openExplainer(
      'Point-based Risk Engine',
      'Why is my risk score 12/100?',
      'SentinelTwin uses a deterministic, explainable scoring engine. Instead of a black-box AI model making arbitrary guesses, points are assigned based on concrete observable signals (unusual parent-child process chains, suspicious command-line parameters, non-standard outbound ports, and baseline drift).',
      'A score below 25 is considered Low Risk and requires no action.'
    )
  }

  const factorIcons = {
    'Process Anomaly': Cpu,
    'Network Drift': Globe,
    'CyberDNA Deviation': Fingerprint,
    'Privilege Escalation': Key
  }

  return (
    <div className="space-y-6 animate-page pb-8">
      {/* Top Banner / Hero */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Personal Risk Assessment
            </h2>
            <Badge variant="shield" size="sm" dot>
              {riskData.level} Risk ({riskData.score}/100)
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {riskData.summary} Every component of this calculation is transparent and explainable.
          </p>
        </div>

        <button
          onClick={handleScoreExplain}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex-shrink-0"
        >
          <HelpCircle className="w-4 h-4 text-emerald-500" />
          <span>Why this score?</span>
        </button>
      </div>

      {/* Main Grid: Gauge + 7-Day History Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Risk Gauge */}
        <Card
          title="Current Device Score"
          subtitle="Point sum across 4 security vectors"
        >
          <RiskGauge score={riskData.score} />
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
            <span className="font-bold">Health Assessment:</span> Your system is 88% below the critical risk threshold.
          </div>
        </Card>

        {/* Right: 7-Day Risk History Chart (2 Cols) */}
        <div className="lg:col-span-2">
          <Card
            title="7-Day Risk Trend"
            subtitle="Historical risk score variation across the past week"
          >
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskData.history}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    domain={[0, 40]}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    formatter={(val) => [`${val} points`, 'Risk Score']}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#riskGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-2">
              <span>Stable historical baseline</span>
              <span className="flex items-center text-emerald-500 font-semibold">
                <TrendingDown className="w-3.5 h-3.5 mr-1" /> -2 pts vs last week
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Contributing Factors Breakdown */}
      <Card
        title="Score Breakdown & Contributing Factors"
        subtitle="Transparent breakdown of what generated your current 12 points"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskData.factors.map((factor, i) => {
            const Icon = factorIcons[factor.name] || Activity
            return (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant="shield" size="sm">
                      {factor.status}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    {factor.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {factor.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Contribution:</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    +{factor.score} / {factor.max} pts
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Practical Tips for the User */}
      <Card
        title="How to Keep Your Risk Score Low"
        subtitle="Actionable guidance for daily personal device security"
        icon={Lightbulb}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Stick to Verified Software',
              text: 'Only launch software from verified publishers. Unknown unsigned binaries trigger elevated process anomaly points.'
            },
            {
              title: 'Review New Network Outbounds',
              text: 'If an application prompts for external internet permissions to a brand-new IP, verify the developer destination.'
            },
            {
              title: 'Keep Baseline Intact',
              text: 'CyberDNA will adapt as you adopt new tools, but abrupt overnight spikes in background processes will raise warnings.'
            }
          ].map((tip, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
            >
              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                {tip.title}
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {tip.text}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
