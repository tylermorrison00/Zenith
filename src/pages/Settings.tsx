import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, PanelLeft, ShieldCheck } from 'lucide-react';
import { Panel } from '../components/Shared';
import { useDashboard } from '../state/DashboardContext';
import { getCurrentAccountSync, getCurrentAccount, type Account } from '../lib/auth';
import type { ThemeName } from '../lib/theme';

interface SettingsPageProps {
  theme: ThemeName;
  onSelectTheme: (theme: ThemeName) => void;
}

const THEME_OPTIONS: { id: ThemeName; name: string; color: string; desc: string }[] = [
  { id: 'green', name: 'Emerald Green', color: '#22E33E', desc: 'Focus & vitality' },
  { id: 'amber', name: 'Warm Amber', color: '#D69B51', desc: 'Original warmth' },
  { id: 'yellow', name: 'Solar Yellow', color: '#E3C021', desc: 'Bright clarity' },
  { id: 'blue', name: 'Deep Blue', color: '#216AE2', desc: 'Calm depth' },
  { id: 'purple', name: 'Royal Purple', color: '#8521E2', desc: 'Creative flow' },
];

export function SettingsPage({ theme, onSelectTheme }: SettingsPageProps) {
  const { sidebarVisible, toggleSidebar, notify } = useDashboard();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null | undefined>(() => getCurrentAccountSync());

  useEffect(() => {
    let cancelled = false;
    getCurrentAccount().then((acc) => {
      if (!cancelled) setAccount(acc);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const profileName = account?.name ?? 'Zenith user';
  const profileEmail = account?.email ?? 'Studio workspace';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'M';

  return (
    <div className="settings-page">
      <div className="page-title-row">
        <div>
          <h1 className="display-title">Settings</h1>
          <p className="page-detail">Manage your workspace preferences, navigation docking, and visual theme.</p>
        </div>
        <div className="page-title-side">
          <button type="button" className="button-light" onClick={() => navigate('/')}>
            <ArrowLeft size={13} /> Back to Overview
          </button>
        </div>
      </div>

      <div className="settings-layout">
        {/* Section 1: Navigation & Docking */}
        <Panel className="settings-panel">
          <div className="settings-panel-head">
            <div>
              <h2 className="settings-panel-title">Layout &amp; Navigation</h2>
              <p className="settings-panel-desc">Customize which panels are docked on your main dashboard.</p>
            </div>
          </div>

          <div className="settings-rows-group">
            <div
              className="settings-card-row"
              onClick={() => {
                toggleSidebar();
                notify(!sidebarVisible ? 'Sidebar enabled' : 'Sidebar hidden');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSidebar();
                  notify(!sidebarVisible ? 'Sidebar enabled' : 'Sidebar hidden');
                }
              }}
            >
              <div className="settings-card-icon">
                <PanelLeft size={18} />
              </div>
              <div className="settings-card-info">
                <div className="settings-card-title-wrap">
                  <strong>Overview Sidebar</strong>
                  <span className="settings-tag">Side dock</span>
                  <span className={`settings-status-pill ${sidebarVisible ? 'is-active' : ''}`}>
                    {sidebarVisible ? 'Docked' : 'Hidden'}
                  </span>
                </div>
                <p className="settings-card-subtitle">
                  Show or hide the Library panel on the Overview page.
                </p>
                <div className="settings-card-hint">
                  {sidebarVisible
                    ? 'The Library panel is docked on the left, displaying daily rituals and today’s focus flow.'
                    : 'Library panel is hidden. Focus and Insights columns stretch to fill full workspace width.'}
                </div>
              </div>
              <div className="settings-card-action">
                <span className={`library-toggle ${sidebarVisible ? 'is-on' : ''}`} aria-hidden="true">
                  <span className="library-toggle-thumb" />
                </span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Section 2: Appearance & Theme */}
        <Panel className="settings-panel">
          <div className="settings-panel-head">
            <div>
              <h2 className="settings-panel-title">Appearance &amp; Theme</h2>
              <p className="settings-panel-desc">Select an accent color for your buttons, indicators, and glow highlights.</p>
            </div>
          </div>

          <div className="settings-theme-grid">
            {THEME_OPTIONS.map((opt) => {
              const isCurrent = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`settings-theme-card ${isCurrent ? 'is-selected' : ''}`}
                  onClick={() => {
                    onSelectTheme(opt.id);
                    notify(`${opt.name} theme activated`);
                  }}
                >
                  <div
                    className="settings-theme-swatch"
                    style={{
                      background: opt.color,
                      boxShadow: isCurrent ? `0 0 12px ${opt.color}` : 'none',
                    }}
                  >
                    {isCurrent && <Check size={12} color="#000" strokeWidth={3} />}
                  </div>
                  <div className="settings-theme-text">
                    <span className="settings-theme-name">{opt.name}</span>
                    <span className="settings-theme-desc">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Section 3: Workspace Account & Information */}
        <Panel className="settings-panel">
          <div className="settings-panel-head">
            <div>
              <h2 className="settings-panel-title">Workspace &amp; System</h2>
              <p className="settings-panel-desc">Account identity and application build version.</p>
            </div>
          </div>

          <div className="settings-account-card">
            <div className="settings-account-avatar">{profileInitial}</div>
            <div className="settings-account-details">
              <strong>{profileName}</strong>
              <small>{profileEmail}</small>
            </div>
            <div className="settings-app-badge">
              <ShieldCheck size={13} />
              <span>Zenith v1.0.28</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
