const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sideDock', {
  getState: () => ipcRenderer.invoke('sidedock-get-state'),
  setMode: (mode) => ipcRenderer.invoke('sidedock-set-mode', mode),
  setPanel: (open) => ipcRenderer.invoke('sidedock-set-panel', open),
  setHidden: (hidden) => ipcRenderer.invoke('sidedock-set-hidden', hidden),
  setAutohide: (on) => ipcRenderer.invoke('sidedock-set-autohide', on),
  showFromArrow: () => ipcRenderer.invoke('sidedock-show-from-arrow'),
  onAutoHideShow: (cb) => ipcRenderer.on('sidedock-auto-hide-show', cb),
  onAutoHideHide: (cb) => ipcRenderer.on('sidedock-auto-hide-hide', cb),
  onAutoHideArrowOnly: (cb) => ipcRenderer.on('sidedock-auto-hide-arrow-only', cb),
  onDataUpdated: (cb) => ipcRenderer.on('sidedock-data-updated', (_e, data) => cb(data)),
  onThemeChanged: (cb) => ipcRenderer.on('sidedock-theme-changed', (_e, theme) => cb(theme)),
  setTheme: (theme) => ipcRenderer.invoke('sidedock-set-theme', theme),
  setAutostart: (on) => ipcRenderer.invoke('sidedock-set-autostart', on),
  openExternal: (url) => ipcRenderer.invoke('sidedock-open-external', url),
  addTool: (tool) => ipcRenderer.invoke('sidedock-add-tool', tool),
  removeTool: (id) => ipcRenderer.invoke('sidedock-remove-tool', id),
  launchTool: (tool) => ipcRenderer.invoke('sidedock-launch-tool', tool),
  minimize: () => ipcRenderer.invoke('sidedock-window-min'),
  close: () => ipcRenderer.invoke('sidedock-window-close'),
  setMouseEvents: (ignore) => ipcRenderer.invoke('sidedock-set-mouse-events', ignore),

  // Tasks (synced with Zenith)
  getTodos: () => ipcRenderer.invoke('sidedock-get-todos'),
  addTodo: (text) => ipcRenderer.invoke('sidedock-add-todo', text),
  toggleTodo: (id) => ipcRenderer.invoke('sidedock-toggle-todo', id),
  deleteTodo: (id) => ipcRenderer.invoke('sidedock-delete-todo', id),
  editTodo: (id, text) => ipcRenderer.invoke('sidedock-edit-todo', id, text),
  restoreTodo: (item) => ipcRenderer.invoke('sidedock-restore-todo', item),

  // Notes (synced with Zenith)
  getNotes: () => ipcRenderer.invoke('sidedock-get-notes'),
  addNote: (data) => ipcRenderer.invoke('sidedock-add-note', data),
  copyNote: (text) => ipcRenderer.invoke('sidedock-copy-note', text),
  deleteNote: (id) => ipcRenderer.invoke('sidedock-delete-note', id),
  editNote: (id, data) => ipcRenderer.invoke('sidedock-edit-note', id, data),
  restoreNote: (item) => ipcRenderer.invoke('sidedock-restore-note', item),

  // Habits (synced with Zenith)
  getHabits: () => ipcRenderer.invoke('sidedock-get-habits'),
  addHabit: (name) => ipcRenderer.invoke('sidedock-add-habit', name),
  deleteHabit: (id) => ipcRenderer.invoke('sidedock-delete-habit', id),
  toggleHabit: (id) => ipcRenderer.invoke('sidedock-toggle-habit', id),
  editHabit: (id, name) => ipcRenderer.invoke('sidedock-edit-habit', id, name),
  restoreHabit: (item) => ipcRenderer.invoke('sidedock-restore-habit', item),

  // Display & Brightness controls
  getBrightness: () => ipcRenderer.invoke('sidedock-get-brightness'),
  setBrightness: (level) => ipcRenderer.invoke('sidedock-set-brightness', level),
  getExtraDim: () => ipcRenderer.invoke('sidedock-get-extra-dim'),
  setExtraDim: (level) => ipcRenderer.invoke('sidedock-set-extra-dim', level),
  getWarm: () => ipcRenderer.invoke('sidedock-get-warm'),
  setWarm: (level) => ipcRenderer.invoke('sidedock-set-warm', level),
  getNightLight: () => ipcRenderer.invoke('sidedock-get-nightlight'),
  toggleNightLight: () => ipcRenderer.invoke('sidedock-toggle-nightlight'),
  getNightLightStrength: () => ipcRenderer.invoke('sidedock-get-nightlight-strength'),
  setNightLightStrength: (level) => ipcRenderer.invoke('sidedock-set-nightlight-strength', level),
});
