// Zenith — contextBridge preload. Exposes only the desktop API the renderer
// needs (version + in-app update + frameless window controls) on window.zenith.
// No Node access in the page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zenith', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  doUpdate: () => ipcRenderer.invoke('do-update'),
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
});
