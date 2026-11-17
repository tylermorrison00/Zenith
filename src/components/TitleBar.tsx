import { useEffect, useState } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';
import { themeLogo, type ThemeName } from '../lib/theme';

// Custom dark title bar for the frameless Electron window (frame: false in
// electron/main.cjs). The standard Windows (turquoise) title bar and border
// are gone; this bar is the app's own, in the Zenith dark theme, with the
// Zenith logo + name and working minimize / maximize / close buttons wired
// through the window.zenith bridge. The whole bar drags the window; the
// buttons do not. Double-clicking the bar toggles maximize, like a normal
// Windows title bar. In the browser / dev preview there is no desktop bridge,
// so the buttons are hidden and only the brand shows.
export function TitleBar({ theme = 'amber' }: { theme?: ThemeName }) {
  const [maximized, setMaximized] = useState(false);
  const isDesktop = typeof window !== 'undefined' && !!window.zenith;

  useEffect(() => {
    if (!window.zenith) return;
    window.zenith.isMaximized().then(setMaximized).catch(() => {});
    const cleanup = window.zenith.onMaximizedChanged(setMaximized);
    return () => { cleanup?.(); };
  }, []);

  return (
    <div
      className="titlebar"
      onDoubleClick={() => { if (isDesktop) void window.zenith?.toggleMaximize(); }}
    >
      <div className="titlebar-brand">
        <img src={themeLogo(theme)} alt="" className="titlebar-mark" />
        <span className="titlebar-name">Zenith</span>
        <span className="titlebar-divider">/</span>
        <span className="titlebar-workspace">Studio workspace</span>
      </div>
      <div className="titlebar-spacer" />
      {isDesktop && (
        <div className="titlebar-controls">
          <button type="button" className="titlebar-btn" aria-label="Minimize" onClick={() => void window.zenith?.minimizeWindow()}>
            <Minus size={14} />
          </button>
          <button type="button" className="titlebar-btn" aria-label={maximized ? 'Restore' : 'Maximize'} onClick={() => void window.zenith?.toggleMaximize()}>
            {maximized ? <Copy size={13} /> : <Square size={13} />}
          </button>
          <button type="button" className="titlebar-btn titlebar-btn--close" aria-label="Close" onClick={() => void window.zenith?.closeWindow()}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
