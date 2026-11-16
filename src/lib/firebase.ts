/**
 * Firebase setup for Zenith.
 *
 * Zenith will use its OWN Firebase project (named "Zenith") for email/password
 * sign-in. It is a SEPARATE project from ClickCart (clickcart-4e444), from
 * Creators Automation (Supabase) and from Prism Tools (Supabase) — never mix
 * them up.
 *
 * HOW THIS FILE WORKS
 * -------------------
 * 1. Until the Firebase project is created and its config is pasted below,
 *    `isFirebaseConfigured()` returns false and the app keeps working exactly
 *    as today, with local accounts stored in localStorage (see `auth.ts`).
 * 2. Once real config values are pasted in, `isFirebaseConfigured()` returns
 *    true and `auth.ts` switches sign-up / sign-in / sign-out over to
 *    Firebase Auth automatically. No other code has to change.
 * 3. There are NO admin accounts, NO Pro accounts and NO roles in this login
 *    system — just simple email/password user accounts. Do not add any
 *    admin ID, Pro ID, `is_admin` flag or tier/plan field here.
 *
 * The Firebase JS SDK (v11, modular API) is imported STATICALLY from the
 * installed `firebase` package, so Vite bundles it into the app's JS. That
 * matters for the installed Electron app: the window runs with
 * nodeIntegration off, contextIsolation on, over file://, so a dynamic
 * `import()` of a bare "firebase/..." specifier at runtime throws and
 * sign-up / sign-in would fail before ever reaching Firebase. Static
 * imports are resolved and bundled at build time, so there is nothing left
 * to resolve at runtime. The SDK code ships in the bundle either way; the
 * `isFirebaseConfigured()` guard still decides whether it is ever USED, so
 * an unconfigured app still falls back to localStorage auth.
 *
 * Config is now filled in from the user's own Zenith Firebase project
 * (projectId zenith-3f361, Email/Password only — no Google sign-in).
 * See FIREBASE_SETUP.md at the repo root for the setup steps.
 */

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * PASTE YOUR ZENITH FIREBASE PROJECT CONFIG HERE.
 *
 * Config is now filled in from the Zenith Firebase project
 * (projectId zenith-3f361). Email/Password is the ONLY sign-in method
 * enabled in that project — no Google sign-in, no other provider.
 */
export const FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: 'AIzaSyDejb3QEmT-NqXCBAqCOwDcI-W21lUPGzM',
  authDomain: 'zenith-3f361.firebaseapp.com',
  projectId: 'zenith-3f361',
  storageBucket: 'zenith-3f361.firebasestorage.app',
  messagingSenderId: '854072204313',
  appId: '1:854072204313:web:a753ee9462e40f270d1e88',
};

/** True only once real Zenith Firebase config values have been pasted above. */
export function isFirebaseConfigured(): boolean {
  return (
    FIREBASE_CONFIG.apiKey.trim() !== '' &&
    FIREBASE_CONFIG.authDomain.trim() !== '' &&
    FIREBASE_CONFIG.projectId.trim() !== '' &&
    FIREBASE_CONFIG.appId.trim() !== ''
  );
}

/**
 * Aliases for the real Firebase SDK types, kept under the old local names so
 * existing callers (`auth.ts`) do not change.
 */
export type FirebaseUserLike = User;
export type FirebaseAuthLike = Auth;

export interface FirebaseAuthFunctions {
  createUserWithEmailAndPassword: typeof createUserWithEmailAndPassword;
  signInWithEmailAndPassword: typeof signInWithEmailAndPassword;
  signOut: typeof signOut;
  updateProfile: typeof updateProfile;
  onAuthStateChanged: typeof onAuthStateChanged;
}

export interface FirebaseAuthTools extends FirebaseAuthFunctions {
  auth: FirebaseAuthLike;
}

let cachedTools: FirebaseAuthTools | null = null;

/**
 * Initialises (once) and returns the Auth instance plus the Firebase Auth
 * functions, or `null` when Firebase is not configured. Purely synchronous:
 * the SDK is bundled statically, so there is nothing left to load at
 * runtime — the `isFirebaseConfigured()` guard is the only gate.
 */
export function getFirebaseAuthToolsSync(): FirebaseAuthTools | null {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (!cachedTools) {
    const existingApps: FirebaseApp[] = getApps();
    const app = existingApps.length > 0 ? existingApps[0] : initializeApp(FIREBASE_CONFIG);
    cachedTools = {
      auth: getAuth(app),
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      signOut,
      updateProfile,
      onAuthStateChanged,
    };
  }
  return cachedTools;
}

/**
 * Returns the Firebase Auth instance when Zenith's Firebase project is
 * configured, or `null` when it is not (so callers can safely fall back to
 * localStorage auth). The result is cached after the first call.
 */
export function getFirebaseAuth(): Promise<FirebaseAuthLike | null> {
  return getFirebaseAuthTools().then((tools) => (tools ? tools.auth : null));
}

/**
 * Returns the Auth instance plus the Firebase Auth functions, or `null` when
 * Firebase is not configured. Used by `auth.ts` so all Firebase SDK access
 * stays behind the `isFirebaseConfigured()` guard.
 */
export function getFirebaseAuthTools(): Promise<FirebaseAuthTools | null> {
  return Promise.resolve(getFirebaseAuthToolsSync());
}
