import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Server, Globe, RefreshCw, CheckCircle2, XCircle, Save, Info, Terminal } from 'lucide-react';
import { testServerConnectivity, persistAppConfig, loadAppConfig } from '../api/config';
import { setApiBaseUrl } from '../api/client';

export function Settings({ config, onConfigSaved }) {
  const [serverUrl, setServerUrl] = useState(config?.serverUrl || 'http://127.0.0.1:5000');
  const [socWebUrl, setSocWebUrl] = useState(config?.socWebUrl || 'http://localhost:5173');
  const [refreshInterval, setRefreshInterval] = useState(config?.refreshInterval || 5000);
  
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [appInfo, setAppInfo] = useState(null);

  useEffect(() => {
    if (!config) {
      loadAppConfig().then(cfg => {
        if (cfg) {
          setServerUrl(cfg.serverUrl || 'http://127.0.0.1:5000');
          setSocWebUrl(cfg.socWebUrl || 'http://localhost:5173');
          setRefreshInterval(cfg.refreshInterval || 5000);
        }
      }).catch(() => {});
    }
    if (window.sentinelUserApi?.getAppInfo) {
      window.sentinelUserApi.getAppInfo().then(setAppInfo).catch(() => {});
    }
  }, [config]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testServerConnectivity(serverUrl);
      setTestResult(res);
    } catch (err) {
      setTestResult({ connected: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    const updated = {
      ...config,
      serverUrl: serverUrl.trim(),
      socWebUrl: socWebUrl.trim(),
      refreshInterval: Number(refreshInterval) || 5000,
    };

    setApiBaseUrl(updated.serverUrl);
    const saved = await persistAppConfig(updated);
    onConfigSaved?.(saved);

    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono uppercase text-emerald-400">Environment & Connectivity</span>
          <span className="text-slate-500">•</span>
          <span className="text-xs text-slate-400">Zero Hardcoded Paths</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-emerald-400" />
          <span>Application Settings & Configuration</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Adjust central backend endpoints, test network latency, and inspect runtime desktop metadata.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5">
          <div className="rounded-xl bg-graphite-900 border border-graphite-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>SentinelTwin Backend API Target</span>
            </h2>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">REST API Server URL</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://127.0.0.1:5000"
                  className="flex-1 px-3 py-2 rounded-lg bg-graphite-950 border border-graphite-800 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  required
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-graphite-800 hover:bg-graphite-700 text-slate-200 border border-graphite-700 text-xs font-medium transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Test Link</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Points to Central Flask service (`backend/app.py`). Default is local: http://127.0.0.1:5000
              </p>
            </div>

            {/* Test Connection Feedback */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start space-x-2.5 border ${
                  testResult.connected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {testResult.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {testResult.connected ? 'Connection Succeeded' : 'Connection Failed'}
                  </div>
                  <div className="text-[11px] font-mono mt-0.5">
                    {testResult.connected
                      ? `HTTP ${testResult.statusCode} OK — Latency: ${testResult.latencyMs}ms`
                      : `Error: ${testResult.error || 'Server unreachable'}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-graphite-900 border border-graphite-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Main System Web Console Link</span>
            </h2>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">SOC Console Web Address</label>
              <input
                type="text"
                value={socWebUrl}
                onChange={(e) => setSocWebUrl(e.target.value)}
                placeholder="http://localhost:5173"
                className="w-full px-3 py-2 rounded-lg bg-graphite-950 border border-graphite-800 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500/50"
                required
              />
              <p className="text-[11px] text-slate-500 font-mono">
                Existing website URL for the main demo/presentation SOC console.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Telemetry Refresh Interval (ms)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-graphite-950 border border-graphite-800 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-100 text-sm font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>

            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Configuration persisted successfully</span>
              </span>
            )}
          </div>
        </form>

        {/* Runtime Diagnostics & Metadata */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl bg-graphite-900 border border-graphite-800 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Desktop Runtime Information</span>
            </h3>

            <div className="divide-y divide-graphite-800 font-mono text-[11px]">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">APPLICATION</span>
                <span className="text-slate-300">SentinelTwin-User</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">VERSION</span>
                <span className="text-slate-300">{appInfo?.version || '1.0.0'}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">ENVIRONMENT</span>
                <span className="text-slate-300">{appInfo?.isPackaged ? 'Production Standalone' : 'Development'}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">PLATFORM / ARCH</span>
                <span className="text-slate-300">{appInfo?.platform || 'win32'} ({appInfo?.arch || 'x64'})</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">ELECTRON RUNTIME</span>
                <span className="text-slate-300">{appInfo?.electronVersion || '34.x'}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">CHROMIUM CORE</span>
                <span className="text-slate-300">{appInfo?.chromeVersion || '132.x'}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">CONFIG PATH</span>
                <span className="text-slate-400 truncate max-w-[200px]" title={appInfo?.configPath}>
                  {appInfo?.configPath || 'sentinel_user_config.json'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-graphite-900/60 border border-graphite-800 p-4 flex items-start space-x-3 text-xs text-slate-400 leading-relaxed">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Portability Ready: </strong>
              The configuration is stored in <code className="font-mono text-cyan-300">sentinel_user_config.json</code> next to the standalone executable. Moving this folder to another Windows PC preserves settings without requiring reinstallation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
