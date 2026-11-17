/**
 * Zenith auth service — simple email/password user accounts.
 *
 * TWO MODES, ONE API
 * ------------------
 * - Firebase mode: once Zenith's own Firebase project is configured (see
 *   `firebase.ts` and FIREBASE_SETUP.md), sign-up / sign-in / sign-out use
 *   Firebase Auth (`createUserWithEmailAndPassword`,
 *   `signInWithEmailAndPassword`, `signOut`, `onAuthStateChanged`).
 * - Local mode (the app's behaviour TODAY): while Firebase is not configured,
 *   every function delegates to the existing onboarding account store in
 *   `./account` — one account per device in localStorage
 *   (`zenith-account-v1`, session flag `zenith-session-v1`), exactly the
 *   same store the Onboarding page already uses. Nothing about the existing
 *   onboarding behaviour changes.
 *
 * The switch is automatic: every function checks `isFirebaseConfigured()`
 * first and takes the Firebase path only when it is true. No page or
 * component needs to know which mode is active.
 *
 * THE FLOW IS SIMPLE, exactly as confirmed: creating an account
 * (`createUserWithEmailAndPassword` in Firebase mode, `saveAccount` in local
 * mode) creates the account, and afterwards the user signs in with the same
 * email and password (`signInWithEmailAndPassword` / the stored local
 * account). No extra steps, no email verification, no password reset here.
 *
 * ACCOUNTS ARE SIMPLE — there is intentionally NO admin account, NO Pro
 * account, NO role and NO tier/plan anywhere in this login system. Do not
 * add an admin ID, Pro ID, `is_admin` flag or plan field. Every account is
 * just a person with a name, an email and a password.
 *
 * NOTE (local mode only): the existing onboarding store keeps the password
 * as-is in this browser's localStorage, and local accounts never leave this
 * device — that is the pre-existing onboarding behaviour and it is left
 * untouched. Once Firebase is configured, real authentication is handled by
 * Firebase and the local store is no longer used for sign-in.
 */

import { getFirebaseAuthTools, getFirebaseAuthToolsSync, isFirebaseConfigured, type FirebaseUserLike } from './firebase';
import { endSession, hasSession, readAccount, saveAccount, startSession, type ZenithAccount } from './account';

/** A signed-in Zenith user. No roles, no tiers — just a person. */
export interface Account {
  /** Firebase mode: the Firebase uid. Local mode: the account email. */
  id: string;
  name: string;
  email: string;
  /** 'firebase' once the Zenith Firebase project is configured, else 'local'. */
  provider: 'firebase' | 'local';
  /** Firebase mode: the account's creation time. Local mode: not stored by
   * the onboarding store, so this is the time the account was read. */
  createdAt: number;
}

/** Friendly messages for the Firebase errors a user can actually hit. */
function friendlyFirebaseError(error: unknown): Error {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return new Error('An account with this email already exists. Try signing in instead.');
    case 'auth/invalid-email':
      return new Error('That email address does not look valid.');
    case 'auth/weak-password':
      return new Error('Password must be at least 6 characters long.');
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return new Error('Email or password is incorrect.');
    case 'auth/too-many-requests':
      return new Error('Too many sign-in attempts. Please wait a few minutes, then try once.');
    case 'auth/network-request-failed':
      return new Error('No internet connection. Check your connection and try again.');
    default:
      return new Error('Something went wrong with sign-in. Please try again.');
  }
}

/**
 * Validation mirrors the Onboarding page's own checks, so both paths accept
 * and reject exactly the same input.
 */
function validateEmailAndPassword(email: string, password: string): void {
  if (!email.includes('@') || !email.includes('.')) {
    throw new Error('Enter a valid email address to continue.');
  }
  if (password.length < 6) {
    throw new Error('Your password needs at least 6 characters.');
  }
}

function validateName(name: string): void {
  if (name.trim().length < 2) {
    throw new Error('Enter your name so your workspace feels like yours.');
  }
}

function toAccountFromFirebase(user: FirebaseUserLike): Account {
  return {
    id: user.uid,
    name: user.displayName ?? '',
    email: user.email ?? '',
    provider: 'firebase',
    createdAt: Date.now(),
  };
}

function toAccountFromLocal(account: ZenithAccount): Account {
  return {
    id: account.email,
    name: account.name,
    email: account.email,
    provider: 'local',
    createdAt: Date.now(),
  };
}

/** Loads the Firebase tools, or throws a clear error if the SDK is missing. */
async function requireFirebaseTools() {
  const tools = await getFirebaseAuthTools();
  if (!tools) {
    throw new Error(
      'Firebase is configured but the "firebase" package is not installed yet. Run "pnpm install" and try again.',
    );
  }
  return tools;
}

/**
 * Creates a new account and signs the user in.
 * Firebase mode: creates a Firebase Auth user (and sets the display name).
 * Local mode: saves the account with the existing onboarding store
 * (`saveAccount` + `startSession`), exactly like the Onboarding page does.
 */
export async function signUpWithEmail(name: string, email: string, password: string): Promise<Account> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  validateName(cleanName);
  validateEmailAndPassword(cleanEmail, password);

  if (isFirebaseConfigured()) {
    try {
      const tools = await requireFirebaseTools();
      const { user } = await tools.createUserWithEmailAndPassword(tools.auth, cleanEmail, password);
      await tools.updateProfile(user, { displayName: cleanName });
      // Mirror the Firebase session in the local flag too, so the app's
      // startup gate sees a signed-in user even before Firebase finishes
      // restoring its own session.
      startSession();
      return { ...toAccountFromFirebase(user), name: cleanName };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Firebase is configured')) throw error;
      throw friendlyFirebaseError(error);
    }
  }

  // Local mode — the existing onboarding behaviour, unchanged.
  saveAccount({ name: cleanName, email: cleanEmail, password });
  startSession();
  return toAccountFromLocal({ name: cleanName, email: cleanEmail, password });
}

/**
 * Signs in with email and password.
 * Firebase mode: Firebase Auth sign-in with the same credentials the account
 * was created with. Local mode: checks the account stored on this device by
 * the Onboarding page, using its exact checks and messages.
 */
export async function signInWithEmail(email: string, password: string): Promise<Account> {
  const cleanEmail = email.trim().toLowerCase();
  validateEmailAndPassword(cleanEmail, password);

  if (isFirebaseConfigured()) {
    try {
      const tools = await requireFirebaseTools();
      const { user } = await tools.signInWithEmailAndPassword(tools.auth, cleanEmail, password);
      // Mirror the Firebase session in the local flag too (see signUp).
      startSession();
      return toAccountFromFirebase(user);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Firebase is configured')) throw error;
      throw friendlyFirebaseError(error);
    }
  }

  // Local mode — the existing onboarding behaviour, unchanged.
  const account = readAccount();
  if (!account) {
    throw new Error('No account on this device yet — create one first.');
  }
  if (account.email !== cleanEmail || account.password !== password) {
    throw new Error('That email and password don’t match the account on this device.');
  }
  startSession();
  return toAccountFromLocal(account);
}

/**
 * Signs out. Firebase mode: signs out of Firebase Auth (and ends the local
 * session too). Local mode: ends the local session (`endSession`), exactly
 * like the app's existing sign-out does.
 */
export async function signOut(): Promise<void> {
  if (isFirebaseConfigured()) {
    const tools = await getFirebaseAuthTools();
    if (tools) {
      await tools.signOut(tools.auth);
    }
  }
  endSession();
}

/**
 * Waits for Firebase Auth to finish restoring the saved session on app
 * start (onAuthStateChanged first emission) and returns the signed-in
 * account, or null. THE startup gate (App.tsx) must use this in Firebase
 * mode — the old gate read only the localStorage flag `zenith-session-v1`,
 * which Firebase sign-in never set, so the app showed the login screen on
 * EVERY restart and forced the user to log in again and again (which also
 * pushed Firebase into its too-many-requests rate limit). Local mode
 * returns the onboarding account when a session exists on this device.
 */
export async function waitForAuthRestore(): Promise<Account | null> {
  return getCurrentAccount();
}

/**
 * Returns the currently signed-in account, or null if nobody is signed in.
 * Firebase mode: waits for Firebase Auth to restore the session
 * (`onAuthStateChanged`) and returns the Firebase user. Local mode: returns
 * the onboarding account when a session exists on this device.
 */
export async function getCurrentAccount(): Promise<Account | null> {
  if (isFirebaseConfigured()) {
    const tools = await getFirebaseAuthTools();
    if (!tools) return null;
    const user = await new Promise<FirebaseUserLike | null>((resolve) => {
      const unsubscribe = tools.onAuthStateChanged(tools.auth, (currentUser) => {
        unsubscribe();
        resolve(currentUser);
      });
    });
    return user ? toAccountFromFirebase(user) : null;
  }

  // Local mode — the existing onboarding behaviour, unchanged.
  if (!hasSession()) return null;
  const account = readAccount();
  return account ? toAccountFromLocal(account) : null;
}

/**
 * Synchronous version of `getCurrentAccount()`, for components (e.g. the
 * Header) that need the profile on first render without flashing the
 * placeholder for a signed-in user.
 * - Local mode: fully synchronous — the session + account live in
 *   localStorage, so this returns the signed-in account immediately.
 * - Firebase mode: returns the Firebase user only if Auth is already
 *   initialised and its session already restored (`auth.currentUser`);
 *   otherwise null, and the caller should refresh with the async
 *   `getCurrentAccount()` (which waits for `onAuthStateChanged`).
 */
export function getCurrentAccountSync(): Account | null {
  if (isFirebaseConfigured()) {
    const tools = getFirebaseAuthToolsSync();
    const user = tools?.auth.currentUser ?? null;
    return user ? toAccountFromFirebase(user) : null;
  }

  // Local mode — the existing onboarding behaviour, unchanged.
  if (!hasSession()) return null;
  const account = readAccount();
  return account ? toAccountFromLocal(account) : null;
}
