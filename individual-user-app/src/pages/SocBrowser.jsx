import React, { useState, useEffect } from 'react';
import {
  Globe,
  ExternalLink,
  Server,
  ShieldCheck,
  Radio,
  CheckCircle2,
  RefreshCw,
  Info,
  ArrowUpRight,
  Laptop
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import StatusIndicator from '../components/common/StatusIndicator';
import { testServerConnectivity, DEFAULT_CONFIG } from '../api/config';

export function SocBrowser() {
  const [socUrl, setSocUrl] = useState(DEFAULT_CONFIG.socWebUrl);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_CONFIG.serverUrl);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const checkConnection = async () => {
    setTesting(true);
    try {
      const res = await testServerConnectivity(backendUrl);
      setConnectionStatus(res);
    } catch (e) {
      setConnectionStatus({ connected: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    checkConnection().catch(() => {});
  }, []);

  const handleLaunchBrowser = () => {
    if (typeof window !== 'undefined' && window.sentinelUserApi?.openExternal) {
      window.sentinelUserApi.openExternal(socUrl);
    } else {
      window.open(socUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6 animate-page pb-8">
      {/* Hero Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider">
                Enterprise SOC Gateway
              </span>
              <StatusIndicator
                status={connectionStatus?.connected ? 'healthy' : 'warning'}
                label={connectionStatus?.connected ? 'SOC Server Online' : 'Local / Standalone'}
              />
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              SentinelTwin Central SOC Dashboard
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              This desktop application monitors your individual workstation telemetry. The central
              SOC web console correlates telemetry across all endpoints, visualizes multi-device attack
              graphs, and coordinates enterprise security operations.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={ArrowUpRight}
              iconPosition="right"
              onClick={handleLaunchBrowser}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500"
            >
              Open SOC Console
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={RefreshCw}
              disabled={testing}
              onClick={checkConnection}
              className="w-full sm:w-auto"
            >
              {testing ? 'Probing...' : 'Check Server'}
            </Button>
          </div>
        </div>
      </div>

      {/* Connectivity & Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="SOC Console Endpoint"
          subtitle="Enterprise React Frontend Target"
          icon={Globe}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Target Web URL</span>
              <div className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 select-all">
                {socUrl}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              When started locally via <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">start_frontend.bat</code>, the main enterprise dashboard runs on port 5173.
            </p>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                icon={ExternalLink}
                onClick={handleLaunchBrowser}
                className="w-full"
              >
                Launch in Default Browser
              </Button>
            </div>
          </div>
        </Card>

        <Card
          title="Central API Server Health"
          subtitle="Flask Backend / Telemetry Ingestion"
          icon={Server}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Backend Endpoint</span>
                <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {backendUrl}
                </div>
              </div>
              <Badge
                variant={connectionStatus?.connected ? 'shield' : 'warning'}
                size="sm"
                dot
              >
                {connectionStatus?.connected ? 'Connected' : 'Offline'}
              </Badge>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 font-mono">
              <div>Latency: {connectionStatus?.latencyMs !== undefined ? `${connectionStatus.latencyMs}ms` : '—'}</div>
              <div>Probe Target: {backendUrl}/api/health</div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                disabled={testing}
                onClick={checkConnection}
                className="w-full"
              >
                {testing ? 'Testing...' : 'Retest Server Health'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Architecture Guidance Card */}
      <Card
        title="Desktop Client vs Central SOC Architecture"
        subtitle="Operational role separation in the SentinelTwin ecosystem"
        icon={Laptop}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">This Individual Desktop App</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-700 dark:text-slate-300">
              <li>Designed for individual workstation employees and users.</li>
              <li>Monitors local endpoint health and personal CyberDNA baseline.</li>
              <li>Runs entirely inside an Electron desktop window.</li>
              <li>Requires no web browser or developer servers to operate.</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold">
              <Globe className="w-4 h-4" />
              <span className="text-sm">Central SOC Console</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-700 dark:text-slate-300">
              <li>Used by security operations engineers and incident responders.</li>
              <li>Aggregates fleet-wide telemetry from all connected sensors.</li>
              <li>Computes graph topologies and enterprise blast radii.</li>
              <li>Manages endpoint quarantine and autonomous defenses.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SocBrowser;
