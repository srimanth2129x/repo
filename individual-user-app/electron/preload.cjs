/**
 * SentinelTwin Individual User App — Secure Preload Bridge
 * ========================================================
 * Safely exposes specific Electron capabilities to the renderer
 * with contextIsolation enabled. Node integration remains strictly disabled.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sentinelUserApi', {
  isElectron: true,
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (newConfig) => ipcRenderer.invoke('save-config', newConfig),
  testConnection: (url) => ipcRenderer.invoke('test-connection', url),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
});
