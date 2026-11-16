// Type of the desktop bridge exposed by electron/preload.cjs on window.zenith.
// Undefined in the browser / vite dev server, where the app runs without Electron.
export interface ZenithUpdateResult {
  ok: boolean;
  updated?: boolean;
  version?: string;
  message?: string;
}

export interface ZenithBridge {
  getVersion: () => Promise<string>;
  doUpdate: () => Promise<ZenithUpdateResult>;
}

declare global {
  interface Window {
    zenith?: ZenithBridge;
  }
}

export {};
