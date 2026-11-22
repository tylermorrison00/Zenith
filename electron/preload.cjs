// Zenith — contextBridge preload. Exposes only the desktop API the renderer
// needs (version + in-app update + frameless window controls) on window.zenith.
// No Node access in the page.
//
// Update flow (v1.0.3): three steps the renderer drives through the update
// popup — check (10s timeout) -> download (progress events) -> install
// (silent install + auto-relaunch). The old single do-update call could hang
// forever with no progress; it is gone.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zenith', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  // Step 1: check the latest release (never hangs — 10s timeout in main).
  checkUpdate: () => ipcRenderer.invoke('update-check'),
  // Step 2: start the installer download; returns at once, progress arrives
  // via onUpdateProgress / onUpdateDownloaded / onUpdateDownloadError.
  startUpdateDownload: () => ipcRenderer.invoke('update-download'),
  // Step 3: silently install the downloaded update and relaunch the app.
  installUpdate: () => ipcRenderer.invoke('update-install'),
  // Download progress events: { received, total, percent }.
  onUpdateProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('update-download-progress', listener);
    return () => ipcRenderer.removeListener('update-download-progress', listener);
  },
  // Fired when the installer finished downloading: { version, size }.
  onUpdateDownloaded: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('update-download-done', listener);
    return () => ipcRenderer.removeListener('update-download-done', listener);
  },
  // Fired when the download fails: { message }.
  onUpdateDownloadError: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('update-download-error', listener);
    return () => ipcRenderer.removeListener('update-download-error', listener);
  },
  // Custom dark title bar (frameless window) controls.
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window-maximize-toggle'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChanged: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('window-maximized-changed', listener);
    return () => ipcRenderer.removeListener('window-maximized-changed', listener);
  },
  setThemeIcon: (theme) => ipcRenderer.invoke('set-theme-icon', theme),
  // Side Dock desktop integration
  getSideDockEnabled: () => ipcRenderer.invoke('sidedock-get-enabled'),
  setSideDockEnabled: (enabled) => ipcRenderer.invoke('sidedock-set-enabled', enabled),
  syncToSideDock: (payload) => ipcRenderer.invoke('sidedock-sync-from-zenith', payload),
  onSideDockAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('sidedock-action', listener);
    return () => ipcRenderer.removeListener('sidedock-action', listener);
  },
});
