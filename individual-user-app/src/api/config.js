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

/**
 * Validates whether a given string is a safe, well-formed HTTP/HTTPS URL.
 * Rejects dangerous protocols (javascript:, data:, file:) and cloud metadata endpoints.
 */
export function isValidHttpUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // Disallow credentials in URL
    if (parsed.username || parsed.password) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    // Reject cloud metadata addresses (SSRF mitigation)
    if (
      hostname === '169.254.169.254' ||
      hostname.startsWith('169.254.') ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data'
    ) {
      return false;
    }
    return Boolean(hostname);
  } catch {
    return false;
  }
}

export function stripTrailingSlashes(str) {
  if (!str || typeof str !== 'string') return '';
  let end = str.length;
  while (end > 0 && str.charCodeAt(end - 1) === 47 /* '/' */) {
    end--;
  }
  return str.slice(0, end);
}

/**
 * Normalizes an HTTP/HTTPS URL to a canonical base URL.
 */
export function canonicalizeUrl(urlString, defaultFallback = DEFAULT_CONFIG.serverUrl) {
  if (!isValidHttpUrl(urlString)) {
    return defaultFallback;
  }
  const parsed = new URL(urlString.trim());
  const cleanPath = stripTrailingSlashes(parsed.pathname);
  return `${parsed.protocol}//${parsed.host}${cleanPath}`;
}

/**
 * Sanitizes and validates a configuration object before consumption or persistence.
 * Prevents Browser Storage Poisoning by enforcing expected types, schemas, and values.
 */
export function sanitizeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_CONFIG };
  }

  const clean = { ...DEFAULT_CONFIG };

  if (typeof raw.serverUrl === 'string' && isValidHttpUrl(raw.serverUrl)) {
    clean.serverUrl = canonicalizeUrl(raw.serverUrl);
  }

  if (typeof raw.socWebUrl === 'string' && isValidHttpUrl(raw.socWebUrl)) {
    clean.socWebUrl = canonicalizeUrl(raw.socWebUrl);
  }

  if (typeof raw.refreshInterval === 'number' && Number.isFinite(raw.refreshInterval)) {
    clean.refreshInterval = Math.min(Math.max(Math.floor(raw.refreshInterval), 1000), 300000);
  }

  if (typeof raw.theme === 'string' && (raw.theme === 'dark' || raw.theme === 'light')) {
    clean.theme = raw.theme;
  }

  if (typeof raw.autoConnect === 'boolean') {
    clean.autoConnect = raw.autoConnect;
  }

  return clean;
}

export async function loadAppConfig() {
  if (typeof window !== 'undefined' && window.sentinelUserApi?.getConfig) {
    try {
      const electronConfig = await window.sentinelUserApi.getConfig();
      if (electronConfig && typeof electronConfig === 'object') {
        return sanitizeConfig(electronConfig);
      }
    } catch (err) {
      console.warn('[Config] Failed to load from Electron bridge, falling back:', err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return sanitizeConfig(parsed);
    }
  } catch (err) {
    console.warn('[Config] Failed to read from localStorage:', err);
  }

  return { ...DEFAULT_CONFIG };
}

export async function persistAppConfig(newConfig) {
  const sanitized = sanitizeConfig(newConfig);

  if (typeof window !== 'undefined' && window.sentinelUserApi?.saveConfig) {
    try {
      const result = await window.sentinelUserApi.saveConfig(sanitized);
      if (result?.success) {
        // Also mirror to localStorage safely
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        } catch {
          // Ignore localStorage errors
        }
        return sanitized;
      }
    } catch (err) {
      console.error('[Config] Failed to save via Electron bridge:', err);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('[Config] Failed to save to localStorage:', err);
  }

  return sanitized;
}

export async function testServerConnectivity(targetUrl) {
  const candidate = targetUrl || DEFAULT_CONFIG.serverUrl;
  if (!isValidHttpUrl(candidate)) {
    return {
      connected: false,
      error: 'Invalid or prohibited URL. Only safe HTTP and HTTPS URLs are permitted.',
      url: String(candidate)
    };
  }

  const cleanBase = canonicalizeUrl(candidate);

  if (typeof window !== 'undefined' && window.sentinelUserApi?.testConnection) {
    try {
      return await window.sentinelUserApi.testConnection(cleanBase);
    } catch (err) {
      return { connected: false, error: err.message, url: `${cleanBase}/api/health` };
    }
  }

  // Fallback to fetch for dev or non-Electron environments
  const startTime = Date.now();
  const endpoint = `${cleanBase}/api/health`;
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
