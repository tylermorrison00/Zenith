import { readStorage, writeStorage } from './storage';

// Zenith is a browser-only app, so the onboarding account lives in this
// browser's localStorage alongside the dashboard state. Creating an account
// or logging in only gates entry to the workspace on this device.
export interface ZenithAccount {
  name: string;
  email: string;
  password: string;
}

const ACCOUNT_KEY = 'zenith-account-v1';
const SESSION_KEY = 'zenith-session-v1';

export function readAccount(): ZenithAccount | null {
  return readStorage<ZenithAccount | null>(ACCOUNT_KEY, null);
}

export function saveAccount(account: ZenithAccount): void {
  writeStorage(ACCOUNT_KEY, account);
}

export function hasSession(): boolean {
  return readStorage<boolean>(SESSION_KEY, false);
}

export function startSession(): void {
  writeStorage(SESSION_KEY, true);
}

export function endSession(): void {
  writeStorage(SESSION_KEY, false);
}
