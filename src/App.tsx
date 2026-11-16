import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DashboardProvider } from './state/DashboardContext';
import { Header, Toast } from './components/Shared';
import { OverviewPage } from './pages/Overview';
import { FocusPage } from './pages/Focus';
import { ProjectsPage, BrandRefreshPage } from './pages/Projects';
import { ReviewPage } from './pages/Review';

function AppFrame() {
  return (
    <div className="app-shell">
      <Header />
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
  return (
    <DashboardProvider>
      <BrowserRouter>
        <AppFrame />
      </BrowserRouter>
    </DashboardProvider>
  );
}
