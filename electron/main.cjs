// Zenith — Electron main process.
//
// Standard resizable desktop window (NOT an edge sidebar) that loads the
// built React app from local files (dist/index.html over file://).
// Update logic follows the Side Dock pattern (see ~/workspace/side-dock/main.js):
// the Zenith repo's package.json on GitHub raw is the version source, and a
// newer version is applied in-app by downloading the repo zip — no GitHub
// website visit, no manual download. The Zenith repo is public, so no token
// is needed (Side Dock's token machinery exists because that repo is private).
//
// NOTE on in-place updates: electron-builder is configured with "asar": false,
// so the installed app is a plain folder (resources/app) and new files can be
// copied over it, exactly like Side Dock. After copying, `npm install` +
// `npm run build` refresh the built renderer (dist/) before relaunch.
const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const UPDATE_RAW = 'https://raw.githubusercontent.com/tylermorrison00/Zenith/main/package.json';
const UPDATE_ZIP_API = 'https://api.github.com/repos/tylermorrison00/Zenith/zipball/main';

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

function runCmd(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd, windowsHide: true, timeout: 600000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message)); else resolve(stdout);
    });
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

ipcMain.handle('get-app-version', () => {
  try { return JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf8')).version || app.getVersion(); }
  catch { return app.getVersion(); }
});

ipcMain.handle('do-update', async () => {
  // The in-place update uses PowerShell (Expand-Archive), so it is Windows-only,
  // same as Side Dock.
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
    const zipPath = path.join(tmpDir, 'update.zip');
    const extractDir = path.join(tmpDir, 'extracted');
    await downloadFile(UPDATE_ZIP_API, zipPath);
    await runCmd(`powershell -NoProfile -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${extractDir}'"`, tmpDir);
    // Zipball folder name is owner-repo-sha, so find the folder holding package.json.
    let srcDir = '';
    for (const entry of fs.readdirSync(extractDir)) {
      const cand = path.join(extractDir, entry);
      try { if (fs.statSync(cand).isDirectory() && fs.existsSync(path.join(cand, 'package.json'))) { srcDir = cand; break; } } catch {}
    }
    if (!srcDir) throw new Error('Update zip me app files nahi mili.');
    // node_modules, .git and dist are left alone — the rest is replaced with
    // the new files. dist is rebuilt below instead of copied (the repo zip
    // only holds source, and the running app loads dist/index.html).
    for (const entry of fs.readdirSync(srcDir)) {
      if (['node_modules', '.git', 'dist'].includes(entry)) continue;
      fs.cpSync(path.join(srcDir, entry), path.join(APP_ROOT, entry), { recursive: true, force: true });
    }
    try { await runCmd('npm install --no-audit --no-fund', APP_ROOT); } catch (e) { console.error('npm install after update:', e.message); }
    try { await runCmd('npm run build', APP_ROOT); } catch (e) { console.error('npm run build after update:', e.message); }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    setTimeout(() => { app.relaunch(); app.quit(); }, 500);
    return { ok: true, updated: true, version: remoteVersion, message: 'Update done, app is restarting.' };
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes('401') || msg.includes('403') || msg.includes('404')) {
      return { ok: false, message: 'Cannot reach the repo, please try Update again later.' };
    }
    return { ok: false, message: 'Update failed: ' + msg };
  }
});
