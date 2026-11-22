import { useEffect } from 'react';
import { PanelLeft, Settings, X } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sidebarVisible, toggleSidebar, notify } = useDashboard();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-card settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-head">
          <div className="settings-modal-title-wrap">
            <span className="settings-modal-icon">
              <Settings size={16} />
            </span>
            <div>
              <div className="eyebrow">Preferences</div>
              <h2 id="settings-title">Settings</h2>
            </div>
          </div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Layout &amp; Navigation</div>
          <div
            className="settings-item-row"
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
            <div className="settings-item-icon">
              <PanelLeft size={16} />
            </div>
            <div className="settings-item-info">
              <div className="settings-item-label-wrap">
                <strong>Sidebar</strong>
                <span className="settings-tag">Side dock</span>
              </div>
              <small>Show or hide the Library panel on the Overview page</small>
            </div>
            <span className={`library-toggle ${sidebarVisible ? 'is-on' : ''}`} aria-hidden="true">
              <span className="library-toggle-thumb" />
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="button-light" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
