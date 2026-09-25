/**
 * SentinelTwin Individual User App — Electron Main Process
 * =======================================================
 * Manages native application lifecycle, secure BrowserWindow creation,
 * configuration persistence, and inter-process communication (IPC).
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// Enforce single application instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;

// Determine config file location (next to EXE in production, or in project in dev)
function getConfigPath() {
  if (app.isPackaged) {
    return path.join(path.dirname(process.execPath), 'sentinel_user_config.json');
  }
  return path.join(__dirname, '..', 'sentinel_user_config.json');
}

const DEFAULT_CONFIG = {
  serverUrl: 'http://127.0.0.1:5000',
  socWebUrl: 'http://localhost:5173',
  refreshInterval: 5000,
  theme: 'dark',
  autoConnect: true,
};

function loadConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('[Config] Failed to load config:', err);
  }
  return DEFAULT_CONFIG;
}

function saveConfig(newConfig) {
  try {
    const configPath = getConfigPath();
    const merged = { ...loadConfig(), ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
    return { success: true, config: merged };
  } catch (err) {
    console.error('[Config] Failed to save config:', err);
    return { success: false, error: err.message };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'SentinelTwin — Individual User Security',
    backgroundColor: '#070a0f',
    show: false, // Prevent white flash before ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.setTitle('SentinelTwin — Individual User Security');
    mainWindow.show();
  });

  // Fallback to ensure window is displayed promptly
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.setTitle('SentinelTwin — Individual User Security');
      mainWindow.show();
    }
  }, 1000);

  // Open external links in default system browser, not in Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174').catch(() => {
      // Fallback to static dist if dev server not running
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Handle second instance activation
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// -----------------------------------------------------------------------------
// IPC Handlers
// -----------------------------------------------------------------------------

ipcMain.handle('get-config', () => {
  return loadConfig();
});

ipcMain.handle('save-config', (event, newConfig) => {
  return saveConfig(newConfig);
});

ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    configPath: getConfigPath(),
  };
});

ipcMain.handle('open-external-url', async (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// Direct backend probe from Main process (bypasses browser CORS / mixed-content limitations)
ipcMain.handle('test-connection', async (event, targetUrl) => {
  const urlToTest = (targetUrl || loadConfig().serverUrl).replace(/\/+$/, '');
  const probeEndpoint = `${urlToTest}/api/health`;
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      const urlObj = new URL(probeEndpoint);
      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.get(
        probeEndpoint,
        { timeout: 3500 },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => {
            const latencyMs = Date.now() - startTime;
            if (res.statusCode >= 200 && res.statusCode < 400) {
              resolve({
                connected: true,
                statusCode: res.statusCode,
                latencyMs,
                url: probeEndpoint,
                data: rawData ? JSON.parse(rawData).catch?.(() => null) || rawData : null
              });
            } else {
              resolve({
                connected: false,
                statusCode: res.statusCode,
                latencyMs,
                url: probeEndpoint,
                error: `HTTP ${res.statusCode}`
              });
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ connected: false, error: 'Connection timed out', latencyMs: Date.now() - startTime });
      });

      req.on('error', (err) => {
        resolve({ connected: false, error: err.message, latencyMs: Date.now() - startTime });
      });
    } catch (e) {
      resolve({ connected: false, error: e.message, latencyMs: 0 });
    }
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
