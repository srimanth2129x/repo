/**
 * SentinelTwin Individual User App — Configuration & Connectivity Manager
 * =======================================================================
 * Manages runtime endpoint resolution, local storage caching,
 * and IPC integration with Electron's main process.
 */

export const DEFAULT_CONFIG = {
  serverUrl: 'http://127.0.0.1:5000',
  socWebUrl: 'http://localhost:5173',
  refreshInterval: 5000,
  theme: 'dark',
  autoConnect: true,
};

const STORAGE_KEY = 'sentineltwin_user_config';

export async function loadAppConfig() {
  if (typeof window !== 'undefined' && window.sentinelUserApi?.getConfig) {
    try {
      const electronConfig = await window.sentinelUserApi.getConfig();
      if (electronConfig && typeof electronConfig === 'object') {
        return { ...DEFAULT_CONFIG, ...electronConfig };
      }
    } catch (err) {
      console.warn('[Config] Failed to load from Electron bridge, falling back:', err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('[Config] Failed to read from localStorage:', err);
  }

  return DEFAULT_CONFIG;
}

export async function persistAppConfig(newConfig) {
  const merged = { ...DEFAULT_CONFIG, ...newConfig };

  if (typeof window !== 'undefined' && window.sentinelUserApi?.saveConfig) {
    try {
      const result = await window.sentinelUserApi.saveConfig(merged);
      if (result?.success) {
        // Also mirror to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // Ignore localStorage errors
        }
        return merged;
      }
    } catch (err) {
      console.error('[Config] Failed to save via Electron bridge:', err);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('[Config] Failed to save to localStorage:', err);
  }

  return merged;
}

export async function testServerConnectivity(targetUrl) {
  const url = (targetUrl || DEFAULT_CONFIG.serverUrl).replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.sentinelUserApi?.testConnection) {
    try {
      return await window.sentinelUserApi.testConnection(url);
    } catch (err) {
      return { connected: false, error: err.message, url: `${url}/api/health` };
    }
  }

  // Fallback to fetch for dev or non-Electron environments
  const startTime = Date.now();
  const endpoint = `${url}/api/health`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json().catch(() => null);
      return { connected: true, statusCode: res.status, latencyMs, url: endpoint, data };
    }
    return { connected: false, statusCode: res.status, latencyMs, url: endpoint, error: `HTTP ${res.status}` };
  } catch (err) {
    return { connected: false, latencyMs: Date.now() - startTime, url: endpoint, error: err.message };
  }
}
