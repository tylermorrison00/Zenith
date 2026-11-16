// Zenith — contextBridge preload. Exposes only the desktop API the renderer
// needs (version + in-app update) on window.zenith. No Node access in the page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zenith', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  doUpdate: () => ipcRenderer.invoke('do-update'),
});
