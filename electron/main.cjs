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
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const UPDATE_RAW = 'https://raw.githubusercontent.com/tylermorrison00/Zenith/main/package.json';
// Release installer asset (GitHub renames the spaced file name to dots):
// https://github.com/tylermorrison00/Zenith/releases/download/v<version>/Zenith.Setup.<version>.exe

// App root: project root in dev, resources/app in the packaged app.
const APP_ROOT = path.join(__dirname, '..');

function fetchText(url, hops = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Zenith-Updater', Accept: 'application/vnd.github+json' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && hops < 5) {
        res.resume();
        fetchText(res.headers.location, hops + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return; }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadFile(url, dest, hops = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Zenith-Updater', Accept: 'application/vnd.github+json' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && hops < 5) {
        res.resume();
        downloadFile(res.headers.location, dest, hops + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return; }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    }).on('error', reject);
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
    icon: path.join(APP_ROOT, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
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

ipcMain.handle('get-app-version', () => {
  try { return JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf8')).version || app.getVersion(); }
  catch { return app.getVersion(); }
});

ipcMain.handle('do-update', async () => {
  // In-app update, Windows-only. No Node.js is needed on the user's machine:
  // the published installer for the new version is downloaded from the
  // GitHub release and run silently, then Zenith relaunches from its
  // installed location. The user never reinstalls by hand.
  if (process.platform !== 'win32') return { ok: false, message: 'Update is only available on the Windows version.' };
  try {
    let localVersion = '';
    try { localVersion = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf8')).version || ''; } catch {}
    // Raw file can lag a few minutes behind a push; the API answers fresh,
    // so try it first and fall back to raw (Side Dock does the same).
    let remote;
    try {
      const api = JSON.parse(await fetchText('https://api.github.com/repos/tylermorrison00/Zenith/contents/package.json'));
      remote = JSON.parse(Buffer.from(String(api.content || '').replace(/\n/g, ''), 'base64').toString('utf8'));
    } catch {
      remote = JSON.parse(await fetchText(UPDATE_RAW + '?t=' + Date.now()));
    }
    const remoteVersion = remote.version || '';
    if (compareVersions(remoteVersion, localVersion) <= 0) {
      return { ok: true, updated: false, version: remoteVersion, message: "You're on the latest version" };
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zenith-update-'));
    const assetName = `Zenith.Setup.${remoteVersion}.exe`;
    const installerPath = path.join(tmpDir, assetName);
    const assetUrl = `https://github.com/tylermorrison00/Zenith/releases/download/v${remoteVersion}/${assetName}`;
    try {
      await downloadFile(assetUrl, installerPath);
    } catch {
      // Fall back to the spaced file name, URL-encoded.
      await downloadFile(`https://github.com/tylermorrison00/Zenith/releases/download/v${remoteVersion}/${encodeURIComponent(`Zenith Setup ${remoteVersion}.exe`)}`, installerPath);
    }
    // Run the installer silently after the app quits (a 2s delay lets the
    // app exit so no files are locked), then relaunch Zenith from its
    // installed location. Unblock-File clears the download mark so
    // SmartScreen does not block the silent install.
    const ps = [
      'Start-Sleep -Seconds 2',
      `$exe = '${installerPath.replace(/'/g, "''")}'`,
      'Unblock-File -Path $exe',
      `Start-Process -FilePath $exe -ArgumentList '/S' -Wait`,
      'Remove-Item -Path $exe -Force -ErrorAction SilentlyContinue',
      `$dir = (Get-ItemProperty -Path 'HKCU:\\Software\\Zenith' -Name InstallDir -ErrorAction SilentlyContinue).InstallDir`,
      `if (-not $dir) { $dir = "$env:LOCALAPPDATA\\Programs\\Zenith" }`,
      `Start-Process -FilePath (Join-Path $dir 'Zenith.exe')`,
    ].join('; ');
    spawn('powershell', ['-NoProfile', '-Command', ps], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    setTimeout(() => { app.quit(); }, 500);
    return { ok: true, updated: true, version: remoteVersion, message: 'Update downloaded — installing, the app will restart.' };
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes('401') || msg.includes('403') || msg.includes('404')) {
      return { ok: false, message: 'Cannot reach the repo, please try Update again later.' };
    }
    return { ok: false, message: 'Update failed: ' + msg };
  }
});
