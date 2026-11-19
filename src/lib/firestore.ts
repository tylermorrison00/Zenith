import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseApp, isFirebaseConfigured } from './firebase';
import type { DashboardState } from '../state/DashboardContext';

let dbInstance: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.warn('Could not initialize Firestore:', err);
    return null;
  }
}

export async function fetchUserDashboard(uid: string): Promise<Partial<DashboardState> | null> {
  const db = getFirestoreDb();
  if (!db || !uid) return null;
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data?.dashboard as Partial<DashboardState>) || null;
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch user dashboard from Firestore:', err);
    return null;
  }
}

export async function saveUserDashboard(uid: string, state: Partial<DashboardState>): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !uid) return false;
  try {
    const docRef = doc(db, 'users', uid);
    // Exclude timer state from cloud sync
    const { timer, ...rest } = state;
    await setDoc(docRef, { dashboard: rest, lastUpdated: Date.now() }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Could not save user dashboard to Firestore:', err);
    return false;
  }
}

export function subscribeUserDashboard(
  uid: string,
  onUpdate: (data: Partial<DashboardState>) => void
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db || !uid) return null;
  try {
    const docRef = doc(db, 'users', uid);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.dashboard) {
            onUpdate(data.dashboard);
          }
        }
      },
      (err) => {
        console.warn('Firestore subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to Firestore:', err);
    return null;
  }
}
