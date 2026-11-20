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
const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
app.setAppUserModelId('com.zenith.app');
const { spawn } = require('child_process');
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
app.whenReady().then(createWindow);
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
