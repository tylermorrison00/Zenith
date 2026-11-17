import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { DashboardProvider } from './state/DashboardContext';
import { Header, Toast } from './components/Shared';
import { TitleBar } from './components/TitleBar';
import { OverviewPage } from './pages/Overview';
import { FocusPage } from './pages/Focus';
import { ProjectsPage, BrandRefreshPage } from './pages/Projects';
import { ReviewPage } from './pages/Review';
import { OnboardingPage } from './pages/Onboarding';
import { hasSession } from './lib/account';
import { signOut as signOutOfAuth } from './lib/auth';
import { applyTheme, nextTheme, readTheme, type ThemeName } from './lib/theme';

function AppFrame({ onSignOut, theme, onToggleTheme }: { onSignOut: () => void; theme: ThemeName; onToggleTheme: () => void }) {
  return (
    <div className="app-shell">
      <Header onSignOut={onSignOut} theme={theme} onToggleTheme={onToggleTheme} />
      <main className="page-wrapper">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
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
  // First open shows the Zenith onboarding screen (welcome → create account /
  // log in). Once an account session exists on this device, the app opens
  // straight into the workspace; signing out returns to onboarding.
  const [signedIn, setSignedIn] = useState<boolean>(() => hasSession());
  // Accent theme (amber / green / yellow / blue / purple) chosen from the profile
  // dropdown's Theme color button, which cycles through all five; persisted on this
  // device and applied to the whole app, onboarding included.
  const [theme, setTheme] = useState<ThemeName>(() => readTheme());

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
      setSignedIn(false);
    }
  }

  return (
    <DashboardProvider>
      <HashRouter>
        <TitleBar theme={theme} />
        {signedIn ? (
          <AppFrame onSignOut={signOut} theme={theme} onToggleTheme={toggleTheme} />
        ) : (
          <>
            <OnboardingPage onComplete={() => setSignedIn(true)} theme={theme} />
            <Toast />
          </>
        )}
      </HashRouter>
    </DashboardProvider>
  );
}
