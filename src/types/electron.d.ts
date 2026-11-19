// Type of the desktop bridge exposed by electron/preload.cjs on window.zenith.
// Undefined in the browser / vite dev server, where the app runs without Electron.
//
// Update flow (v1.0.3): check -> download (progress events) -> install.
// The old single do-update call is gone — it could hang forever with no
// progress, which is exactly what happened live on v1.0.1.
export interface ZenithUpdateCheck {
  ok: boolean;
  updateAvailable?: boolean;
  currentVersion?: string;
  latestVersion?: string;
  assetUrl?: string;
  message?: string;
}

export interface ZenithUpdateStart {
  ok: boolean;
  started?: boolean;
  version?: string;
  message?: string;
}

export interface ZenithUpdateProgress {
  received: number;
  total: number;
  percent: number;
}

export interface ZenithUpdateDownloaded {
  version: string;
  size: number;
}

export interface ZenithUpdateResult {
  ok: boolean;
  message?: string;
}

export interface ZenithBridge {
  getVersion: () => Promise<string>;
  checkUpdate: () => Promise<ZenithUpdateCheck>;
  startUpdateDownload: () => Promise<ZenithUpdateStart>;
  installUpdate: () => Promise<ZenithUpdateResult>;
  onUpdateProgress: (callback: (payload: ZenithUpdateProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (payload: ZenithUpdateDownloaded) => void) => () => void;
  onUpdateDownloadError: (callback: (payload: { message: string }) => void) => () => void;
  // Custom dark title bar (frameless window) controls.
  minimizeWindow: () => Promise<void>;
  toggleMaximize: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizedChanged: (callback: (maximized: boolean) => void) => () => void;
  setThemeIcon?: (theme: string) => Promise<boolean>;
}

declare global {
  interface Window {
    zenith?: ZenithBridge;
  }
}

export {};
