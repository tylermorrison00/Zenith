import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { DashboardProvider } from './state/DashboardContext';
import { Header, Toast } from './components/Shared';
import { TitleBar } from './components/TitleBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OverviewPage } from './pages/Overview';
import { TasksPage } from './pages/Tasks';
import { HabitsPage } from './pages/Habits';
import { NotesPage } from './pages/Notes';
import { FocusPage } from './pages/Focus';
import { ProjectsPage, BrandRefreshPage } from './pages/Projects';
import { ReviewPage } from './pages/Review';
import { OnboardingPage } from './pages/Onboarding';
import { hasSession } from './lib/account';
import { isFirebaseConfigured } from './lib/firebase';
import { signOut as signOutOfAuth, waitForAuthRestore } from './lib/auth';
import { applyTheme, nextTheme, readTheme, themeLogo, type ThemeName } from './lib/theme';

function AppFrame({ onSignOut, theme, onToggleTheme }: { onSignOut: () => void; theme: ThemeName; onToggleTheme: () => void }) {
  return (
    <div className="app-shell">
      <Header onSignOut={onSignOut} theme={theme} onToggleTheme={onToggleTheme} />
      <main className="page-wrapper">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<BrandRefreshPage />} />
          <Route path="/projects/brand-refresh" element={<BrandRefreshPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="*" element={<OverviewPage />} />
        </Routes>
      </main>
      <Toast />
    </div>
  );
}

export function App() {
  // Auth gate — THREE states, never two. The old code read only the
  // localStorage flag `zenith-session-v1` on first render, which Firebase
  // sign-in never set, so the app showed the login screen on EVERY restart
  // and forced the user to log in again and again (v1.0.3 fix).
  //   'loading'    — Firebase Auth is still restoring the saved session
  //                   (onAuthStateChanged); show a splash, NEVER onboarding
  //                   on this half-restored state.
  //   'signed-in'  — session restored (or local session exists).
  //   'signed-out' — no session; only then show onboarding.
  // Sign-out is the ONLY way back to onboarding — closing and reopening
  // the app, or updating it, keeps the user signed in.
  const [authState, setAuthState] = useState<'loading' | 'signed-in' | 'signed-out'>(() =>
    isFirebaseConfigured() ? 'loading' : hasSession() ? 'signed-in' : 'signed-out',
  );
  // Accent theme (amber / green / yellow / blue / purple) chosen from the profile
  // dropdown's Theme color button, which cycles through all five; persisted on this
  // device and applied to the whole app, onboarding included.
  const [theme, setTheme] = useState<ThemeName>(() => readTheme());

  useEffect(() => {
    let cancelled = false;
    if (isFirebaseConfigured()) {
      waitForAuthRestore().then((account) => {
        if (!cancelled) setAuthState(account ? 'signed-in' : 'signed-out');
      }).catch(() => {
        if (!cancelled) setAuthState('signed-out');
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => nextTheme(current));
  }

  async function signOut() {
    try {
      await signOutOfAuth();
    } finally {
      setAuthState('signed-out');
    }
  }

  return (
    <ErrorBoundary>
      <DashboardProvider>
        <HashRouter>
          <TitleBar theme={theme} />
          {authState === 'loading' ? (
            <div className="auth-loading" aria-label="Loading Zenith">
              <img src={themeLogo(theme)} alt="Zenith" />
              <p>Loading your workspace…</p>
            </div>
          ) : authState === 'signed-in' ? (
            <AppFrame onSignOut={signOut} theme={theme} onToggleTheme={toggleTheme} />
          ) : (
            <>
              <OnboardingPage onComplete={() => setAuthState('signed-in')} theme={theme} />
              <Toast />
            </>
          )}
        </HashRouter>
      </DashboardProvider>
    </ErrorBoundary>
  );
}
