import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, RefreshCw, X } from 'lucide-react';

// Update popup — opens in the CENTER OF THE APP WINDOW (the modal scrim is
// position:fixed inside the app's own window, not the laptop screen), and
// walks the user through every step with a real downloading progress bar:
//   checking -> up to date | update available -> downloading (%, MB) ->
//   installing (app restarts itself) | error (shown in the popup, the app
//   is never silently closed and the login is never touched).
//
// Why this exists (v1.0.3): the old Update button awaited ONE ipc call with
// no timeout and no progress — live on v1.0.1 it sat on "Checking for
// updates…" for ~5 minutes, then the app closed and nothing had updated.
// The new flow has a 10s timeout in main, a 12s safety timeout here, and
// progress events for the whole download.

type Phase =
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'error';

function formatMB(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpdateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [progress, setProgress] = useState(0);
  const [received, setReceived] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const phaseRef = useRef<Phase>('checking');
  phaseRef.current = phase;

  const runCheck = useCallback(async () => {
    setPhase('checking');
    setError('');
    setProgress(0);
    setReceived(0);
    setTotal(0);
    if (!window.zenith) {
      // Browser / dev server: no desktop bridge, nothing real to check.
      setPhase('up-to-date');
      return;
    }
    try {
      // Renderer-side safety net: even if main ever stalls, the popup
      // answers within 12s instead of hanging forever.
      const result = await Promise.race([
        window.zenith.checkUpdate(),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 12000)),
      ]);
      if (result === null) {
        setError('Checking timed out. Check your internet and try again.');
        setPhase('error');
        return;
      }
      if (!result.ok) {
        setError(result.message || 'Could not check for updates. Try again later.');
        setPhase('error');
        return;
      }
      setCurrentVersion(result.currentVersion ?? '');
      setLatestVersion(result.latestVersion ?? '');
      setPhase(result.updateAvailable ? 'available' : 'up-to-date');
    } catch {
      setError('Could not check for updates. Try again later.');
      setPhase('error');
    }
  }, []);

  // Run the check every time the popup opens.
  useEffect(() => {
    if (!open) return;
    runCheck();
  }, [open, runCheck]);

  // Subscribe to download progress / completion while the popup is open.
  useEffect(() => {
    if (!open || !window.zenith) return;
    const offProgress = window.zenith.onUpdateProgress((payload) => {
      setProgress(payload.percent);
      setReceived(payload.received);
      setTotal(payload.total);
    });
    const offDone = window.zenith.onUpdateDownloaded((payload) => {
      setProgress(100);
      setReceived(payload.size);
      setTotal(payload.size);
      // Download finished — install silently and let the app restart itself.
      setPhase('installing');
      window.zenith?.installUpdate().then((result) => {
        if (!result.ok) {
          setError(result.message || 'Could not start the installer. Try again.');
          setPhase('error');
        }
        // On success the main process quits the app within ~500ms and the
        // installer relaunches the new version — nothing left to do here.
      }).catch(() => {
        setError('Could not start the installer. Try again.');
        setPhase('error');
      });
    });
    const offError = window.zenith.onUpdateDownloadError((payload) => {
      setError(payload.message || 'Download failed. Try again.');
      setPhase('error');
    });
    return () => {
      offProgress();
      offDone();
      offError();
    };
  }, [open ]);

  async function startDownload() {
    if (!window.zenith) return;
    setPhase('downloading');
    setProgress(0);
    setReceived(0);
    setTotal(0);
    setError('');
    try {
      const result = await window.zenith.startUpdateDownload();
      if (!result.ok) {
        setError(result.message || 'Download could not start. Try again.');
        setPhase('error');
      }
      // On success the download runs in main and reports back via the
      // progress / done / error events subscribed above.
    } catch {
      setError('Download could not start. Try again.');
      setPhase('error');
    }
  }

  if (!open) return null;

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="Update Zenith">
      <div className="modal-card update-modal">
        <div className="modal-head">
          <h2>Update Zenith</h2>
          {(phase === 'up-to-date' || phase === 'error') && (
            <button className="icon-button" aria-label="Close" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>

        {phase === 'checking' && (
          <div className="update-body">
            <p><RefreshCw size={16} className="update-spin" /> Checking for updates…</p>
            <p className="update-sub">This takes a few seconds at most.</p>
          </div>
        )}

        {phase === 'up-to-date' && (
          <div className="update-body">
            <p><Check size={16} /> You are up to date{currentVersion ? ` — Zenith ${currentVersion}` : ''}.</p>
            <div className="modal-actions">
              <button className="auth-submit" type="button" onClick={onClose}>Done</button>
            </div>
          </div>
        )}

        {phase === 'available' && (
          <div className="update-body">
            <p>Zenith {latestVersion} is available{currentVersion ? ` (you have ${currentVersion})` : ''}.</p>
            <div className="modal-actions">
              <button className="auth-submit" type="button" onClick={startDownload}>
                <Download size={15} /> Download &amp; install
              </button>
            </div>
          </div>
        )}

        {phase === 'downloading' && (
          <div className="update-body">
            <p>Updating to Zenith {latestVersion}…</p>
            <div className="update-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="update-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="update-sub">
              {progress}%{total > 0 ? ` · ${formatMB(received)} of ${formatMB(total)}` : received > 0 ? ` · ${formatMB(received)} downloaded` : ''}
            </p>
          </div>
        )}

        {phase === 'installing' && (
          <div className="update-body">
            <p><RefreshCw size={16} className="update-spin" /> Installing… the app will close and reopen on the new version.</p>
            <p className="update-sub">Your account stays signed in — nothing to do.</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="update-body">
            <p className="auth-error" role="alert">{error}</p>
            <div className="modal-actions">
              <button className="auth-submit" type="button" onClick={runCheck}>Try again</button>
              <button className="auth-submit auth-submit--ghost" type="button" onClick={onClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
