// Zenith — Electron main process.
//
// Frameless desktop window (custom dark title bar rendered by the React app)
// that loads the built React app from local files (dist/index.html over file://).
// Update logic: the Zenith repo's package.json on GitHub raw is the version
// source, and a newer version is applied in-app by downloading the published
// installer (Zenith.Setup.<version>.exe) from the GitHub release and running
// it silently — no GitHub website visit, no manual download, and NO Node.js
// on the user's machine (the old zip + `npm install` + `npm run build` flow
// could never run there, so updates silently did nothing). The Zenith repo is
// public, so no token is needed.
const { app, BrowserWindow, ipcMain, nativeImage, screen, shell, clipboard } = require('electron');
app.setAppUserModelId('com.zenith.app');
const { spawn, execFile, exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const { buildUpdateScript } = require('./update-script.cjs');

const UPDATE_RAW = 'https://raw.githubusercontent.com/tylermorrison00/Zenith/main/package.json';
const UPDATE_CHECK_TIMEOUT_MS = 10000; // version check must never hang the app
const UPDATE_DOWNLOAD_STALL_MS = 30000; // no data for 30s = stalled download, abort
// Release installer asset (GitHub renames the spaced file name to dots):
// https://github.com/tylermorrison00/Zenith/releases/download/v<version>/Zenith.Setup.<version>.exe

// App root: project root in dev, resources/app in the packaged app.
const APP_ROOT = path.join(__dirname, '..');

// --- In-app updater (rewritten in v1.0.3, install step rewritten in v1.0.5) ---
// The old updater had two fatal flaws, both seen live by the user on v1.0.1:
//   1. fetchText/downloadFile had NO timeout — a stalled request hung the
//      IPC call forever, so the Update button sat on "Checking for
//      updates…" for ~5 minutes until the app was force-closed.
//   2. No progress events — the renderer learned nothing until the whole
//      download finished (or never did).
// v1.0.5: the v1.0.3 install step failed live twice on v1.0.3 — download
// ran, app closed, nothing relaunched, still v1.0.3. Cause: the inline
// PowerShell slept a fixed 2s (Zenith.exe still locked when the NSIS
// installer ran, and silent /S skips locked files with no error) and
// checked nothing. See update-install below and update-script.cjs.
// The new flow is three small IPC calls the renderer drives step by step,
// each with a hard timeout, and the download streams progress events:
//   update-check    -> { ok, updateAvailable, currentVersion, latestVersion, message }
//   update-download -> starts the download and returns at once; progress
//                      arrives as 'update-download-progress' events and
//                      completion as 'update-download-done' /
//                      'update-download-error'
//   update-install  -> runs the downloaded installer silently and relaunches
//                      the app from its installed location

function fetchText(url, timeoutMs = UPDATE_CHECK_TIMEOUT_MS, hops = 0) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let req = null;
    // Wall-clock timer, NOT just req.setTimeout: a connect-phase stall
    // (server never answers TCP) does not trip the socket timeout on its
    // own — proven live: a black-hole address took 17.5s to reject with
    // only req.setTimeout(5000). This timer fires no matter what phase
    // the request is stuck in, so the check can never hang the app.
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { if (req) req.destroy(); } catch {}
        reject(new Error('Request timed out after ' + Math.round(timeoutMs / 1000) + 's'));
      }
    }, timeoutMs);
    if (timer.unref) timer.unref();
    const done = (value) => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
    const fail = (err) => { if (!settled) { settled = true; clearTimeout(timer); reject(err); } };
    req = https.get(url, { headers: { 'User-Agent': 'Zenith-Updater', Accept: 'application/vnd.github+json' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && hops < 5) {
        res.resume();
        fetchText(res.headers.location, timeoutMs, hops + 1).then(done, fail);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); fail(new Error('HTTP ' + res.statusCode)); return; }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => done(data));
    });
    req.on('error', fail);
  });
}

function downloadFile(url, dest, onProgress, hops = 0) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let req = null;
    // Connect-phase wall-clock timer (same reason as fetchText): if the
    // server never answers, abort within 10s instead of hanging. Once the
    // response starts, the stall timer below takes over.
    const connectTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { if (req) req.destroy(); } catch {}
        reject(new Error('Download timed out while connecting (10s)'));
      }
    }, UPDATE_CHECK_TIMEOUT_MS);
    if (connectTimer.unref) connectTimer.unref();
    const done = (value) => { if (!settled) { settled = true; clearTimeout(connectTimer); resolve(value); } };
    const fail = (err) => { if (!settled) { settled = true; clearTimeout(connectTimer); reject(err); } };
    req = https.get(url, { headers: { 'User-Agent': 'Zenith-Updater', Accept: 'application/vnd.github+json' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && hops < 5) {
        res.resume();
        clearTimeout(connectTimer);
        downloadFile(res.headers.location, dest, onProgress, hops + 1).then(done, fail);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); fail(new Error('HTTP ' + res.statusCode)); return; }
      clearTimeout(connectTimer);
      const total = parseInt(res.headers['content-length'] || '0', 10) || 0;
      let received = 0;
      let stallTimer = null;
      const armStallTimer = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          fail(new Error('Download stalled — no data for 30s'));
          try { if (req) req.destroy(); } catch {}
        }, UPDATE_DOWNLOAD_STALL_MS);
        if (stallTimer.unref) stallTimer.unref();
      };
      armStallTimer();
      const file = fs.createWriteStream(dest);
      res.on('data', (chunk) => {
        received += chunk.length;
        armStallTimer();
        if (onProgress) onProgress(received, total);
      });
      res.on('end', () => { if (stallTimer) clearTimeout(stallTimer); });
      file.on('finish', () => { file.close(); done({ received, total }); });
      file.on('error', (err) => { if (stallTimer) clearTimeout(stallTimer); fail(err); });
      res.pipe(file);
    });
    req.on('error', fail);
  });
}

// Numeric x.y.z compare. Returns 1 if a > b, -1 if a < b, 0 if equal.
// No version numbers are invented here — both sides come from package.json.
function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    center: true,
    // Frameless: the standard Windows (turquoise) title bar and border are
    // gone — the React app renders its own dark title bar (TitleBar.tsx)
    // with working minimize / maximize / close buttons via IPC below.
    frame: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    title: 'Zenith',
    backgroundColor: '#040303',
    autoHideMenuBar: true,
    // .ico is the Windows installer/window icon; Linux cannot load .ico, so
    // use the PNG twin there (Windows behaviour unchanged).
    icon: path.join(APP_ROOT, 'build', process.platform === 'win32' ? 'icon-green.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(APP_ROOT, 'dist', 'index.html'));
  win.on('closed', () => { win = null; });
  // Keep the renderer's maximize/restore button in sync (e.g. double-click
  // on the custom title bar, Win+arrow, taskbar).
  const sendMaximized = () => { if (win) win.webContents.send('window-maximized-changed', win.isMaximized()); };
  win.on('maximize', sendMaximized);
  win.on('unmaximize', sendMaximized);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { try { win.show(); win.focus(); } catch {} }
    else { try { createWindow(); } catch {} }
  });
}
app.whenReady().then(() => {
  createWindow();
  setTimeout(() => {
    createSideDockWindow();
  }, 1000);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!win) createWindow(); });

// Custom title bar controls (TitleBar.tsx) — a frameless window has no OS buttons.
ipcMain.handle('window-minimize', () => { if (win) win.minimize(); });
ipcMain.handle('window-maximize-toggle', () => {
  if (!win) return false;
  if (win.isMaximized()) win.unmaximize(); else win.maximize();
  return win.isMaximized();
});
ipcMain.handle('window-close', () => { if (win) win.close(); });
ipcMain.handle('window-is-maximized', () => (win ? win.isMaximized() : false));

function getThemeIconPath(themeName) {
  const icoFile = `icon-${themeName}.ico`;
  const p = path.join(APP_ROOT, 'build', icoFile);
  if (fs.existsSync(p)) return p;
  return path.join(APP_ROOT, 'build', 'icon.ico');
}

function updateShortcutsIcon(icoPath) {
  if (process.platform !== 'win32') return;
  const escaped = icoPath.replace(/\\/g, '\\\\');
  const script = `
    $ws = New-Object -ComObject WScript.Shell
    $paths = @(
      Join-Path ([Environment]::GetFolderPath("Desktop")) "Zenith.lnk",
      Join-Path ([Environment]::GetFolderPath("CommonDesktop")) "Zenith.lnk",
      Join-Path ([Environment]::GetFolderPath("Programs")) "Zenith\\Zenith.lnk"
    )
    foreach ($p in $paths) {
      if (Test-Path $p) {
        try {
          $s = $ws.CreateShortcut($p)
          $s.IconLocation = "${escaped},0"
          $s.Save()
        } catch { }
      }
    }
  `;
  const psExe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try {
    spawn(psExe, ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, stdio: 'ignore' }).unref();
  } catch {}
}

ipcMain.handle('set-theme-icon', (event, themeName) => {
  if (!win || !themeName) return false;
  try {
    const icoPath = getThemeIconPath(themeName);
    if (fs.existsSync(icoPath)) {
      win.setIcon(icoPath);
      updateShortcutsIcon(icoPath);
      return true;
    }
  } catch {}
  return false;
});

ipcMain.handle('get-app-version', () => {
  try { return JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf8')).version || app.getVersion(); }
  catch { return app.getVersion(); }
});

function readLocalVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf8')).version || ''; } catch { return ''; }
}

// Step 1 — version check (10s hard timeout, never hangs).
// Primary source is the GitHub Releases API (fresh, and it hands us the
// installer asset URL directly); fallback is the raw package.json.
ipcMain.handle('update-check', async () => {
  if (process.platform !== 'win32') return { ok: false, message: 'Update is only available on the Windows version.' };
  const currentVersion = readLocalVersion() || app.getVersion();
  let latestVersion = '';
  let assetUrl = '';
  try {
    let release = null;
    try {
      const releases = JSON.parse(await fetchText('https://api.github.com/repos/tylermorrison00/Zenith/releases'));
      if (Array.isArray(releases)) {
        release = releases.find((r) => (r.assets || []).some((a) => /^Zenith\.Setup\..*\.exe$/.test(String(a.name || '')))) || releases[0];
      }
    } catch {
      release = JSON.parse(await fetchText('https://api.github.com/repos/tylermorrison00/Zenith/releases/latest'));
    }
    if (release) {
      latestVersion = String(release.tag_name || '').replace(/^[a-zA-Z\-_]+/, '');
      const asset = (release.assets || []).find((a) => /^Zenith\.Setup\..*\.exe$/.test(String(a.name || '')));
      if (asset && asset.browser_download_url) assetUrl = asset.browser_download_url;
    }
  } catch {
    // API failed (rate limit / network) — fall back to raw package.json.
    try {
      const remote = JSON.parse(await fetchText(UPDATE_RAW + '?t=' + Date.now()));
      latestVersion = remote.version || '';
    } catch (e) {
      return { ok: false, message: 'Could not reach GitHub to check for updates. Check your internet and try again.' };
    }
  }
  if (!latestVersion) return { ok: false, message: 'Could not read the latest version from GitHub. Try again later.' };
  if (!assetUrl) assetUrl = `https://github.com/tylermorrison00/Zenith/releases/download/v${latestVersion}/Zenith.Setup.${latestVersion}.exe`;
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
  return {
    ok: true,
    updateAvailable,
    currentVersion,
    latestVersion,
    assetUrl,
    message: updateAvailable ? `Zenith ${latestVersion} is available` : "You're on the latest version",
  };
});

// Download state, shared by the download + install steps.
let pendingUpdate = null; // { version, installerPath, size }
let downloadRunning = false;

// Step 2 — start the installer download. Returns at once; progress arrives
// as 'update-download-progress' events, completion as 'update-download-done'
// or 'update-download-error' on the window's webContents.
ipcMain.handle('update-download', async (event) => {
  if (process.platform !== 'win32') return { ok: false, message: 'Update is only available on the Windows version.' };
  if (downloadRunning) return { ok: false, message: 'A download is already running.' };
  const sender = event.sender;
  const send = (channel, payload) => { try { sender.send(channel, payload); } catch {} };
  let version = '';
  let assetUrl = '';
  try {
    const check = await (async () => {
      // Reuse the same sources as update-check so the download always
      // matches the newest release, even if the popup was left open.
      try {
        const release = JSON.parse(await fetchText('https://api.github.com/repos/tylermorrison00/Zenith/releases/latest'));
        const v = String(release.tag_name || '').replace(/^v/, '');
        const asset = (release.assets || []).find((a) => /^Zenith\.Setup\..*\.exe$/.test(String(a.name || '')));
        return { version: v, assetUrl: asset && asset.browser_download_url ? asset.browser_download_url : '' };
      } catch {
        const remote = JSON.parse(await fetchText(UPDATE_RAW + '?t=' + Date.now()));
        return { version: remote.version || '', assetUrl: '' };
      }
    })();
    version = check.version;
    assetUrl = check.assetUrl || `https://github.com/tylermorrison00/Zenith/releases/download/v${version}/Zenith.Setup.${version}.exe`;
    if (!version) throw new Error('Could not read the latest version from GitHub.');
    const currentVersion = readLocalVersion() || app.getVersion();
    if (compareVersions(version, currentVersion) <= 0) {
      return { ok: true, started: false, message: "You're on the latest version" };
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zenith-update-'));
    const assetName = `Zenith.Setup.${version}.exe`;
    const installerPath = path.join(tmpDir, assetName);
    downloadRunning = true;
    const onProgress = (received, total) => {
      send('update-download-progress', { received, total, percent: total > 0 ? Math.round((received / total) * 100) : 0 });
    };
    let result;
    try {
      result = await downloadFile(assetUrl, installerPath, onProgress);
    } catch {
      // Fall back to the spaced file name, URL-encoded.
      result = await downloadFile(
        `https://github.com/tylermorrison00/Zenith/releases/download/v${version}/${encodeURIComponent(`Zenith Setup ${version}.exe`)}`,
        installerPath,
        onProgress,
      );
    }
    downloadRunning = false;
    const size = fs.existsSync(installerPath) ? fs.statSync(installerPath).size : 0;
    if (result.total > 0 && result.received !== result.total) {
      // Short download (connection cut mid-stream): the file looks big
      // enough to pass the 50MB check but the installer would be corrupt.
      try { fs.unlinkSync(installerPath); } catch {}
      const msg = 'Downloaded installer looks incomplete. Try again.';
      send('update-download-error', { message: msg });
      return { ok: false, started: false, message: msg };
    }
    if (size < 50 * 1024 * 1024) {
      try { fs.unlinkSync(installerPath); } catch {}
      const msg = 'Downloaded installer looks incomplete. Try again.';
      send('update-download-error', { message: msg });
      return { ok: false, started: false, message: msg };
    }
    pendingUpdate = { version, installerPath, size: result.received || size, expectedSize: result.total || 0 };
    send('update-download-done', { version, size: pendingUpdate.size });
    return { ok: true, started: true, version };
  } catch (e) {
    downloadRunning = false;
    const msg = 'Download failed: ' + String(e.message || e);
    send('update-download-error', { message: msg });
    return { ok: false, started: false, message: msg };
  }
});

// Step 3 — run the downloaded installer silently, then relaunch Zenith.
//
// Rewritten in v1.0.5. The v1.0.3 version spawned an INLINE PowerShell
// `-Command` string that slept a FIXED 2 seconds and then ran the NSIS
// installer. Electron often takes longer than that to fully quit, so the
// still-running Zenith.exe stayed file-locked; the NSIS installer in
// silent /S mode silently skips locked files and exits 0, and the script
// checked NOTHING (no exit code, no verification, no log) — the user
// pressed Update twice on v1.0.3, the download ran, the app closed, and
// nothing relaunched: still v1.0.3. The new flow writes a real .ps1 file
// (see electron/update-script.cjs) that waits for the Zenith process to
// FULLY exit (poll, up to 60s), runs the installer, checks its exit code,
// VERIFIES the installed version (registry + Zenith.exe file version),
// relaunches the new version, and logs every step to
// %TEMP%\zenith-update-<version>.log — failures show a real error dialog
// instead of failing silently. userData (%APPDATA%\Zenith — account login
// + workspace data) is never touched by the installer, so the user stays
// signed in after the update.
ipcMain.handle('update-install', async () => {
  if (process.platform !== 'win32') return { ok: false, message: 'Update is only available on the Windows version.' };
  if (!pendingUpdate || !fs.existsSync(pendingUpdate.installerPath)) {
    return { ok: false, message: 'No downloaded update is ready. Download it first.' };
  }
  const installerPath = pendingUpdate.installerPath;
  const version = pendingUpdate.version;
  const size = fs.statSync(installerPath).size;
  if (size < 50 * 1024 * 1024) {
    return { ok: false, message: 'Downloaded installer looks incomplete. Download it again.' };
  }
  if (pendingUpdate.expectedSize > 0 && size !== pendingUpdate.expectedSize) {
    return { ok: false, message: 'Downloaded installer looks incomplete. Download it again.' };
  }
  // The real install location: the folder this running exe lives in
  // (fallback for the script if the registry key is ever missing).
  const installDirHint = path.dirname(app.getPath('exe'));
  const scriptPath = path.join(os.tmpdir(), `zenith-update-${version}.ps1`);
  const logPath = path.join(os.tmpdir(), `zenith-update-${version}.log`);
  try {
    fs.writeFileSync(scriptPath, buildUpdateScript({ installerPath, version, installDirHint, logPath }), 'utf8');
  } catch (e) {
    return { ok: false, message: 'Could not prepare the update: ' + String(e.message || e) };
  }
  const psExe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try {
    const child = spawn(psExe, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
  } catch (e) {
    return { ok: false, message: 'Could not start the installer: ' + String(e.message || e) };
  }
  setTimeout(() => { app.quit(); }, 500);
  return { ok: true, message: 'Installing — the app will restart.' };
});

// =============================================================================
// ZENITH SIDE DOCK — Edge sidebar for Windows with synced Tasks, Notes, Habits
// =============================================================================

let sideDockWin = null;
let sideDockPanelOpen = false;
let sideDockAutoHide = false;
let sideDockHidden = false;
let sideDockAutoStart = true;
let sideDockEnabled = true;
let sideDockSettingsPath = '';
let sideDockToolsPath = '';
let dashboardCachePath = '';
let sideDockHideTimeout = null;
let sideDockMouseTimer = null;
let sideDockOutsideCount = 0;
let sideDockLaunchAt = Date.now();

let dashboardCache = {
  tasks: [],
  notes: [],
  habits: [],
  theme: 'amber',
};

function initSideDockPaths() {
  if (!sideDockSettingsPath) {
    sideDockSettingsPath = path.join(app.getPath('userData'), 'sidedock-settings.json');
    sideDockToolsPath = path.join(app.getPath('userData'), 'sidedock-tools.json');
    dashboardCachePath = path.join(app.getPath('userData'), 'dashboard-cache.json');
  }
}

function loadSideDockSettings() {
  initSideDockPaths();
  try {
    const raw = fs.readFileSync(sideDockSettingsPath, 'utf8');
    const data = JSON.parse(raw);
    if (typeof data.enabled === 'boolean') sideDockEnabled = data.enabled;
    if (typeof data.autoHide === 'boolean') sideDockAutoHide = data.autoHide;
    if (typeof data.autoStart === 'boolean') sideDockAutoStart = data.autoStart;
  } catch {}
}

function saveSideDockSettings() {
  initSideDockPaths();
  try {
    fs.writeFileSync(
      sideDockSettingsPath,
      JSON.stringify(
        {
          enabled: sideDockEnabled,
          autoHide: sideDockAutoHide,
          autoStart: sideDockAutoStart,
        },
        null,
        2
      )
    );
  } catch {}
}

function loadSideDockTools() {
  initSideDockPaths();
  let defaults = [];
  try {
    defaults = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'sidedock', 'tools.json'), 'utf8'));
  } catch {}
  try {
    const existing = JSON.parse(fs.readFileSync(sideDockToolsPath, 'utf8'));
    let changed = false;
    for (const d of defaults) {
      const ex = existing.find((x) => x.id === d.id);
      if (!ex) {
        existing.push(d);
        changed = true;
      }
    }
    if (changed) {
      try {
        fs.writeFileSync(sideDockToolsPath, JSON.stringify(existing, null, 2));
      } catch {}
    }
    return existing;
  } catch {}
  try {
    fs.writeFileSync(sideDockToolsPath, JSON.stringify(defaults, null, 2));
  } catch {}
  return defaults;
}

function saveSideDockTools(tools) {
  initSideDockPaths();
  try {
    fs.writeFileSync(sideDockToolsPath, JSON.stringify(tools, null, 2));
  } catch {}
}

function loadDashboardCache() {
  initSideDockPaths();
  try {
    const raw = fs.readFileSync(dashboardCachePath, 'utf8');
    const data = JSON.parse(raw);
    if (data) dashboardCache = { ...dashboardCache, ...data };
  } catch {}
}

function saveDashboardCache() {
  initSideDockPaths();
  try {
    fs.writeFileSync(dashboardCachePath, JSON.stringify(dashboardCache, null, 2));
  } catch {}
}

function sideDockCardSize(panelOpen) {
  try {
    const primary = screen.getPrimaryDisplay();
    const area = primary ? primary.workArea : { x: 0, y: 0, width: 1920, height: 1080 };
    const width = panelOpen ? 372 : 220;
    return {
      width,
      height: Math.max(400, area.height - 16),
      x: area.x + area.width - width - 4,
      y: area.y + 8,
    };
  } catch {
    return { width: 220, height: 800, x: 1700, y: 8 };
  }
}

function createSideDockWindow() {
  if (sideDockWin && !sideDockWin.isDestroyed()) {
    try {
      sideDockWin.show();
      sideDockWin.setAlwaysOnTop(true, 'screen-saver');
      sideDockWin.moveTop();
    } catch {}
    return;
  }
  loadSideDockSettings();
  loadDashboardCache();
  if (!sideDockEnabled) return;

  const s = sideDockCardSize(sideDockPanelOpen);
  sideDockWin = new BrowserWindow({
    width: s.width,
    height: s.height,
    x: s.x,
    y: s.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: 'Zenith Side Dock',
    icon: path.join(APP_ROOT, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(APP_ROOT, 'sidedock', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  sideDockWin.loadFile(path.join(APP_ROOT, 'sidedock', 'index.html'));
  sideDockWin.webContents.once('did-finish-load', () => {
    try {
      sideDockWin.show();
      sideDockWin.setAlwaysOnTop(true, 'screen-saver');
      sideDockWin.moveTop();
    } catch {}
  });
  sideDockWin.on('closed', () => {
    sideDockWin = null;
  });
  sideDockLaunchAt = Date.now();
  startSideDockMousePoll();
}

function slideSideDockToHidden(next) {
  if (!sideDockWin || sideDockWin.isDestroyed()) return;
  sideDockHidden = !!next;
  const area = screen.getPrimaryDisplay().workArea;
  const s = sideDockCardSize(sideDockPanelOpen);
  if (sideDockHideTimeout) {
    clearInterval(sideDockHideTimeout);
    sideDockHideTimeout = null;
  }
  if (sideDockHidden) {
    try { sideDockWin.webContents.send('sidedock-auto-hide-hide'); } catch {}
    const startX = sideDockWin.getBounds().x;
    const targetX = area.x + area.width - 28;
    const steps = 12;
    let i = 0;
    sideDockHideTimeout = setInterval(() => {
      i++;
      try {
        const x = Math.round(startX + (targetX - startX) * (i / steps));
        sideDockWin.setBounds({ x, y: s.y, width: s.width, height: s.height }, false);
        if (i >= steps) {
          clearInterval(sideDockHideTimeout);
          sideDockHideTimeout = null;
          try { sideDockWin.setIgnoreMouseEvents(true, { forward: true }); } catch {}
          try { sideDockWin.webContents.send('sidedock-auto-hide-arrow-only'); } catch {}
        }
      } catch {
        clearInterval(sideDockHideTimeout);
        sideDockHideTimeout = null;
      }
    }, 25);
  } else {
    try { sideDockWin.webContents.send('sidedock-auto-hide-show'); } catch {}
    const startX = sideDockWin.getBounds().x;
    const targetX = s.x;
    const steps = 12;
    let i = 0;
    sideDockHideTimeout = setInterval(() => {
      i++;
      try {
        const x = Math.round(startX + (targetX - startX) * (i / steps));
        sideDockWin.setBounds({ x, y: s.y, width: s.width, height: s.height }, false);
        if (i >= steps) {
          clearInterval(sideDockHideTimeout);
          sideDockHideTimeout = null;
        }
      } catch {
        clearInterval(sideDockHideTimeout);
        sideDockHideTimeout = null;
      }
    }, 25);
    try { sideDockWin.setIgnoreMouseEvents(false, { forward: true }); } catch {}
  }
}

function startSideDockMousePoll() {
  if (sideDockMouseTimer) return;
  sideDockLaunchAt = Date.now();
  sideDockMouseTimer = setInterval(() => {
    try {
      if (!sideDockWin || sideDockWin.isDestroyed()) return;
      if (!sideDockAutoHide || sideDockHidden || sideDockPanelOpen) {
        sideDockOutsideCount = 0;
        return;
      }
      if (Date.now() - sideDockLaunchAt < 8000) return;
      const pt = screen.getCursorScreenPoint();
      const b = sideDockWin.getBounds();
      const inside = pt.x >= b.x && pt.x <= b.x + b.width && pt.y >= b.y && pt.y <= b.y + b.height;
      if (!inside) {
        sideDockOutsideCount++;
        if (sideDockOutsideCount >= 2) {
          sideDockOutsideCount = 0;
          slideSideDockToHidden(true);
        }
      } else {
        sideDockOutsideCount = 0;
      }
    } catch {}
  }, 500);
}

// Extra Dim display overlay
let extraDimWin = null;
let extraDimLevel = 0;
function applyExtraDim(lvl) {
  extraDimLevel = Math.max(0, Math.min(80, parseInt(lvl, 10) || 0));
  if (extraDimLevel <= 0) {
    try {
      if (extraDimWin && !extraDimWin.isDestroyed()) extraDimWin.close();
    } catch {}
    extraDimWin = null;
    return;
  }
  if (!extraDimWin || extraDimWin.isDestroyed()) {
    extraDimWin = new BrowserWindow({
      fullscreen: true,
      frame: false,
      transparent: false,
      backgroundColor: '#000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      show: false,
    });
    try { extraDimWin.setIgnoreMouseEvents(true, { forward: true }); } catch {}
    try { extraDimWin.setAlwaysOnTop(true, 'screen-saver'); } catch {}
    extraDimWin.on('closed', () => { extraDimWin = null; });
  }
  try { extraDimWin.setOpacity(extraDimLevel / 100); } catch {}
  try { if (!extraDimWin.isVisible()) extraDimWin.showInactive(); } catch {}
}

let warmLevel = 0;
let warmProc = null;
let warmPending = null;
function applyWarm(lvl) {
  warmLevel = Math.max(0, Math.min(100, parseInt(lvl, 10) || 0));
  if (warmProc) {
    warmPending = warmLevel;
    return;
  }
  const runWarm = (level) => {
    const src = path.join(APP_ROOT, 'sidedock', 'scripts', 'warm.ps1');
    const tmp = path.join(os.tmpdir(), 'zenith-sidedock-warm.ps1');
    try { fs.copyFileSync(src, tmp); } catch {}
    const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmp}" -WarmPercent ${level}`;
    warmProc = exec(cmd, () => {
      warmProc = null;
      if (warmPending !== null && warmPending !== level) {
        const next = warmPending;
        warmPending = null;
        runWarm(next);
      } else {
        warmPending = null;
      }
    });
  };
  runWarm(warmLevel);
}

function runPowerShellScript(scriptName, args = '') {
  return new Promise((resolve) => {
    const src = path.join(APP_ROOT, 'sidedock', 'scripts', scriptName);
    const tmp = path.join(os.tmpdir(), `zenith-${scriptName}`);
    try { fs.copyFileSync(src, tmp); } catch {}
    const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmp}" ${args}`;
    exec(cmd, (err, stdout) => {
      resolve({ err, stdout: String(stdout || '').trim() });
    });
  });
}

// Side Dock IPC Handlers
ipcMain.handle('sidedock-get-state', () => {
  loadSideDockSettings();
  loadDashboardCache();
  return {
    panelOpen: sideDockPanelOpen,
    autoHide: sideDockAutoHide,
    autoStart: sideDockAutoStart,
    theme: dashboardCache.theme || 'amber',
    tools: loadSideDockTools(),
  };
});

ipcMain.handle('sidedock-set-panel', (_e, next) => {
  sideDockPanelOpen = !!next;
  try {
    if (sideDockWin && !sideDockWin.isDestroyed()) {
      const s = sideDockCardSize(sideDockPanelOpen);
      sideDockWin.setBounds({ x: s.x, y: s.y, width: s.width, height: s.height }, true);
    }
  } catch {}
  return sideDockPanelOpen;
});

ipcMain.handle('sidedock-set-hidden', (_e, next) => {
  if (!sideDockAutoHide) {
    sideDockHidden = false;
    return sideDockHidden;
  }
  slideSideDockToHidden(next);
  return sideDockHidden;
});

ipcMain.handle('sidedock-set-autohide', (_e, next) => {
  sideDockAutoHide = !!next;
  saveSideDockSettings();
  if (!sideDockAutoHide) slideSideDockToHidden(false);
  return sideDockAutoHide;
});

ipcMain.handle('sidedock-show-from-arrow', () => {
  slideSideDockToHidden(false);
  return sideDockHidden;
});

ipcMain.handle('sidedock-set-autostart', (_e, next) => {
  sideDockAutoStart = !!next;
  saveSideDockSettings();
  return sideDockAutoStart;
});

ipcMain.handle('sidedock-set-theme', (_e, next) => {
  dashboardCache.theme = next;
  saveDashboardCache();
  return dashboardCache.theme;
});

ipcMain.handle('sidedock-set-mouse-events', (_e, ignore) => {
  try {
    if (sideDockWin && !sideDockWin.isDestroyed()) {
      sideDockWin.setIgnoreMouseEvents(!!ignore, { forward: true });
    }
  } catch {}
  return true;
});

ipcMain.handle('sidedock-add-tool', (_e, tool) => {
  const tools = loadSideDockTools();
  tools.push({
    id: Date.now().toString(),
    name: String(tool.name || 'Tool').slice(0, 40),
    icon: String(tool.icon || '◆').slice(0, 4),
    target: String(tool.target || ''),
    kind: tool.kind === 'app' ? 'app' : 'url',
  });
  saveSideDockTools(tools);
  return tools;
});

ipcMain.handle('sidedock-remove-tool', (_e, id) => {
  const tools = loadSideDockTools().filter((t) => t.id !== id);
  saveSideDockTools(tools);
  return tools;
});

ipcMain.handle('sidedock-launch-tool', (_e, tool) => {
  if (!tool || !tool.target) return;
  if (tool.kind === 'url') {
    shell.openExternal(tool.target);
    return;
  }
  if (fs.existsSync(tool.target)) {
    shell.openPath(tool.target);
    return;
  }
  exec(tool.target, (err) => {
    if (err) console.error('launch tool err:', err.message);
  });
});

ipcMain.handle('sidedock-window-min', () => sideDockWin && sideDockWin.minimize());
ipcMain.handle('sidedock-window-close', () => sideDockWin && sideDockWin.close());
ipcMain.handle('sidedock-open-external', (_e, url) => {
  try { shell.openExternal(String(url)); } catch {}
});

// Tasks (Synced with Zenith)
ipcMain.handle('sidedock-get-todos', () => {
  return (dashboardCache.tasks || []).map((t) => ({ id: t.id, text: t.title, done: t.done }));
});

ipcMain.handle('sidedock-add-todo', (_e, text) => {
  const title = String(text || '').trim().slice(0, 200);
  if (!title) return (dashboardCache.tasks || []).map((t) => ({ id: t.id, text: t.title, done: t.done }));
  const newTask = {
    id: Date.now().toString(),
    title,
    project: 'Work',
    priority: 'normal',
    done: false,
  };
  dashboardCache.tasks = [newTask, ...(dashboardCache.tasks || [])];
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'ADD_TASK', task: newTask }); } catch {}
  }
  return dashboardCache.tasks.map((t) => ({ id: t.id, text: t.title, done: t.done }));
});

ipcMain.handle('sidedock-toggle-todo', (_e, id) => {
  dashboardCache.tasks = (dashboardCache.tasks || []).map((t) =>
    t.id === id ? { ...t, done: !t.done } : t
  );
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'TOGGLE_TASK', id }); } catch {}
  }
  return dashboardCache.tasks.map((t) => ({ id: t.id, text: t.title, done: t.done }));
});

ipcMain.handle('sidedock-delete-todo', (_e, id) => {
  dashboardCache.tasks = (dashboardCache.tasks || []).filter((t) => t.id !== id);
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'DELETE_TASK', id }); } catch {}
  }
  return dashboardCache.tasks.map((t) => ({ id: t.id, text: t.title, done: t.done }));
});

ipcMain.handle('sidedock-edit-todo', (_e, id, text) => {
  const title = String(text || '').trim().slice(0, 200);
  dashboardCache.tasks = (dashboardCache.tasks || []).map((t) =>
    t.id === id ? { ...t, title } : t
  );
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'EDIT_TASK', id, title }); } catch {}
  }
  return dashboardCache.tasks.map((t) => ({ id: t.id, text: t.title, done: t.done }));
});

ipcMain.handle('sidedock-restore-todo', (_e, item) => {
  if (!item) return (dashboardCache.tasks || []).map((t) => ({ id: t.id, text: t.title, done: t.done }));
  const restored = {
    id: item.id || Date.now().toString(),
    title: item.text || item.title || 'Task',
    project: 'Work',
    priority: 'normal',
    done: !!item.done,
  };
  dashboardCache.tasks = [restored, ...(dashboardCache.tasks || [])];
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'ADD_TASK', task: restored }); } catch {}
  }
  return dashboardCache.tasks.map((t) => ({ id: t.id, text: t.title, done: t.done }));
});

// Notes (Synced with Zenith)
ipcMain.handle('sidedock-get-notes', () => {
  return (dashboardCache.notes || []).map((n) => ({
    id: n.id,
    title: n.title,
    text: n.body || n.excerpt || '',
  }));
});

ipcMain.handle('sidedock-add-note', (_e, data) => {
  const title = typeof data === 'object' ? String(data.title || '').slice(0, 200) : '';
  const text = typeof data === 'object' ? String(data.text || '').slice(0, 5000) : String(data || '').slice(0, 5000);
  if (!text.trim() && !title.trim()) return (dashboardCache.notes || []).map((n) => ({ id: n.id, title: n.title, text: n.body || n.excerpt }));
  const newNote = {
    id: Date.now().toString(),
    title: title.trim() || text.split('\n')[0].slice(0, 50) || 'Untitled note',
    excerpt: text.slice(0, 120),
    body: text,
    project: 'Work',
    updated: 'Just now',
  };
  dashboardCache.notes = [newNote, ...(dashboardCache.notes || [])];
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'ADD_NOTE', note: newNote }); } catch {}
  }
  return dashboardCache.notes.map((n) => ({ id: n.id, title: n.title, text: n.body || n.excerpt }));
});

ipcMain.handle('sidedock-copy-note', (_e, text) => {
  try { clipboard.writeText(String(text || '')); } catch {}
  return true;
});

ipcMain.handle('sidedock-delete-note', (_e, id) => {
  dashboardCache.notes = (dashboardCache.notes || []).filter((n) => n.id !== id);
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'DELETE_NOTE', id }); } catch {}
  }
  return dashboardCache.notes.map((n) => ({ id: n.id, title: n.title, text: n.body || n.excerpt }));
});

ipcMain.handle('sidedock-edit-note', (_e, id, data) => {
  const title = typeof data === 'object' ? String(data.title || '') : '';
  const text = typeof data === 'object' ? String(data.text || '') : String(data || '');
  dashboardCache.notes = (dashboardCache.notes || []).map((n) =>
    n.id === id ? { ...n, title: title || n.title, excerpt: text.slice(0, 120), body: text } : n
  );
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'EDIT_NOTE', id, title, text }); } catch {}
  }
  return dashboardCache.notes.map((n) => ({ id: n.id, title: n.title, text: n.body || n.excerpt }));
});

ipcMain.handle('sidedock-restore-note', (_e, item) => {
  if (!item) return (dashboardCache.notes || []).map((n) => ({ id: n.id, title: n.title, text: n.body || n.excerpt }));
  const restored = {
    id: item.id || Date.now().toString(),
    title: item.title || 'Note',
    excerpt: (item.text || '').slice(0, 120),
    body: item.text || '',
    project: 'Work',
    updated: 'Just now',
  };
  dashboardCache.notes = [restored, ...(dashboardCache.notes || [])];
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'ADD_NOTE', note: restored }); } catch {}
  }
  return dashboardCache.notes.map((n) => ({ id: n.id, title: n.title, text: n.body || n.excerpt }));
});

// Habits (Synced with Zenith)
ipcMain.handle('sidedock-get-habits', () => {
  return dashboardCache.habits || [];
});

ipcMain.handle('sidedock-toggle-habit', (_e, id) => {
  dashboardCache.habits = (dashboardCache.habits || []).map((h) => {
    if (h.id !== id) return h;
    const nextDone = !h.done;
    return {
      ...h,
      done: nextDone,
      streak: nextDone ? h.streak + 1 : Math.max(0, h.streak - 1),
    };
  });
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'TOGGLE_HABIT', id }); } catch {}
  }
  return dashboardCache.habits;
});

ipcMain.handle('sidedock-add-habit', (_e, name) => {
  const title = String(name || '').trim().slice(0, 200);
  if (!title) return dashboardCache.habits;
  const newHabit = {
    id: Date.now().toString(),
    title,
    detail: '',
    streak: 0,
    done: false,
    history: Array(28).fill(false),
  };
  dashboardCache.habits = [...(dashboardCache.habits || []), newHabit];
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'ADD_HABIT', habit: newHabit }); } catch {}
  }
  return dashboardCache.habits;
});

ipcMain.handle('sidedock-delete-habit', (_e, id) => {
  dashboardCache.habits = (dashboardCache.habits || []).filter((h) => h.id !== id);
  saveDashboardCache();
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('sidedock-action', { type: 'DELETE_HABIT', id }); } catch {}
  }
  return dashboardCache.habits;
});

// Display Controls
ipcMain.handle('sidedock-get-extra-dim', () => ({ level: extraDimLevel }));
ipcMain.handle('sidedock-set-extra-dim', (_e, lvl) => {
  applyExtraDim(lvl);
  return { level: extraDimLevel };
});
ipcMain.handle('sidedock-get-warm', () => ({ level: warmLevel }));
ipcMain.handle('sidedock-set-warm', (_e, lvl) => {
  applyWarm(lvl);
  return { level: warmLevel };
});
ipcMain.handle('sidedock-get-nightlight', async () => {
  const res = await runPowerShellScript('nightlight-state.ps1');
  return { ok: true, on: res.stdout === 'ON' };
});
ipcMain.handle('sidedock-toggle-nightlight', async () => {
  const res = await runPowerShellScript('nightlight-silent.ps1');
  return { ok: res.stdout === 'OK', raw: res.stdout };
});
ipcMain.handle('sidedock-get-nightlight-strength', async () => {
  const res = await runPowerShellScript('nightlight-strength.ps1', '-Action get');
  const n = parseInt(res.stdout, 10);
  return { ok: !isNaN(n), level: isNaN(n) ? 50 : n };
});
ipcMain.handle('sidedock-set-nightlight-strength', async (_e, lvl) => {
  const val = Math.max(0, Math.min(100, parseInt(lvl, 10) || 0));
  await runPowerShellScript('nightlight-strength.ps1', `-Action set -Percent ${val}`);
  return { ok: true };
});

// Zenith Main Window Bridge
ipcMain.handle('sidedock-get-enabled', () => {
  loadSideDockSettings();
  return sideDockEnabled;
});

ipcMain.handle('sidedock-set-enabled', (_e, enabled) => {
  sideDockEnabled = !!enabled;
  saveSideDockSettings();
  if (sideDockEnabled) {
    if (!sideDockWin || sideDockWin.isDestroyed()) {
      createSideDockWindow();
    } else {
      try {
        sideDockWin.show();
        sideDockWin.setAlwaysOnTop(true, 'screen-saver');
        sideDockWin.moveTop();
      } catch {}
    }
  } else {
    if (sideDockWin && !sideDockWin.isDestroyed()) {
      sideDockWin.close();
      sideDockWin = null;
    }
  }
  return sideDockEnabled;
});

ipcMain.handle('sidedock-sync-from-zenith', (_e, payload) => {
  if (!payload) return false;
  dashboardCache = {
    ...dashboardCache,
    tasks: payload.tasks ?? dashboardCache.tasks,
    notes: payload.notes ?? dashboardCache.notes,
    habits: payload.habits ?? dashboardCache.habits,
    theme: payload.theme ?? dashboardCache.theme,
  };
  saveDashboardCache();
  if (sideDockWin && !sideDockWin.isDestroyed()) {
    try {
      sideDockWin.webContents.send('sidedock-data-updated', dashboardCache);
      if (payload.theme) {
        sideDockWin.webContents.send('sidedock-theme-changed', payload.theme);
      }
    } catch {}
  }
  return true;
});
