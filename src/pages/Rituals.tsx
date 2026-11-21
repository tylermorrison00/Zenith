import { useEffect, useRef, useState } from 'react';
import { Check, Flame, Pencil, Plus, Trash2, X } from 'lucide-react';
import { GripDiagonal } from '../lib/icons';
import { Panel } from '../components/Shared';
import { useDashboard, type Ritual } from '../state/DashboardContext';

type FilterType = 'all' | 'active' | 'pending';

export function RitualsPage() {
  const { rituals, toggleRitual, addRitual, updateRitual, deleteRitual } = useDashboard();
  const [filter, setFilter] = useState<FilterType>('all');
  const [dialog, setDialog] = useState<{ mode: 'add' } | { mode: 'edit'; ritual: Ritual } | null>(null);

  const activeCount = rituals.filter((r) => r.on).length;
  const pendingCount = rituals.length - activeCount;

  const filteredRituals = rituals.filter((r) => {
    if (filter === 'active') return r.on;
    if (filter === 'pending') return !r.on;
    return true;
  });

  return (
    <div className="rituals-page">
      <div className="page-title-row">
        <div>
          <h1 className="display-title">Rituals</h1>
          <p className="page-detail">
            Intentional routines that frame your day and prime your focus. Switch on active rituals as you step into deep work.
          </p>
        </div>
        <div className="page-title-side tasks-actions">
          <button className="button-light tasks-add-btn" onClick={() => setDialog({ mode: 'add' })}>
            <Plus size={14} /> Add ritual
          </button>
        </div>
      </div>

      <div className="tasks-stats-row">
        <div className="stat-tile">
          <div className="stat-tile-head">
            <span>Active today</span>
            <span className="stat-icon"><Check size={12} /></span>
          </div>
          <div className="stat-value">
            {activeCount}<small style={{ fontSize: 14, color: 'var(--muted)' }}> / {rituals.length}</small>
          </div>
          <div className="stat-change">Routines completed</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-head">
            <span>Pending</span>
            <span className="stat-icon"><Flame size={12} /></span>
          </div>
          <div className="stat-value">
            {pendingCount}
          </div>
          <div className="stat-change">Ready to start</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-head">
            <span>Total rituals</span>
          </div>
          <div className="stat-value">{rituals.length}</div>
          <div className="stat-change">Daily focus anchors</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-head">
            <span>Status</span>
          </div>
          <div className="stat-value" style={{ fontSize: 18, paddingTop: 4 }}>
            {rituals.length === 0 ? 'No rituals' : activeCount === rituals.length ? 'All active' : `${activeCount} completed`}
          </div>
          <div className="stat-change">
            {activeCount === rituals.length && rituals.length > 0 ? 'Great rhythm' : 'Keep flow steady'}
          </div>
        </div>
      </div>

      <div className="rituals-controls-bar">
        <div className="rituals-filter-tabs">
          <button
            type="button"
            className={`rituals-tab-btn ${filter === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All <span>({rituals.length})</span>
          </button>
          <button
            type="button"
            className={`rituals-tab-btn ${filter === 'active' ? 'is-active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active <span>({activeCount})</span>
          </button>
          <button
            type="button"
            className={`rituals-tab-btn ${filter === 'pending' ? 'is-active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending <span>({pendingCount})</span>
          </button>
        </div>
      </div>

      {filteredRituals.length > 0 ? (
        <div className="rituals-grid">
          {filteredRituals.map((ritual) => (
            <RitualCard
              key={ritual.id}
              ritual={ritual}
              onToggle={() => toggleRitual(ritual.id)}
              onEdit={() => setDialog({ mode: 'edit', ritual })}
              onDelete={() => deleteRitual(ritual.id)}
            />
          ))}
        </div>
      ) : (
        <Panel className="rituals-empty-panel">
          <div className="tasks-empty">
            <p>
              {rituals.length === 0
                ? 'No rituals yet. Add your first routine to prime your focus.'
                : `No ${filter} rituals right now.`}
            </p>
            {rituals.length === 0 && (
              <button className="button-light" onClick={() => setDialog({ mode: 'add' })}>
                <Plus size={13} /> Add ritual
              </button>
            )}
          </div>
        </Panel>
      )}

      {dialog && (
        <RitualDialog
          ritual={dialog.mode === 'edit' ? dialog.ritual : null}
          onClose={() => setDialog(null)}
          onSubmit={(title, detail) => {
            if (dialog.mode === 'edit') {
              updateRitual(dialog.ritual.id, title, detail);
            } else {
              addRitual(title, detail);
            }
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function RitualCard({
  ritual,
  onToggle,
  onEdit,
  onDelete,
}: {
  ritual: Ritual;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <Panel className={`ritual-card ${ritual.on ? 'is-active' : ''}`}>
      <div className="ritual-card-head">
        <button
          type="button"
          className={`ritual-card-toggle ${ritual.on ? 'is-on' : ''}`}
          onClick={onToggle}
          aria-pressed={ritual.on}
          aria-label={ritual.on ? `Mark ${ritual.title} as pending` : `Mark ${ritual.title} as active`}
        >
          {ritual.on && <Check size={12} />}
        </button>

        <div className="ritual-card-copy">
          <div className="ritual-card-title-row">
            <strong>{ritual.title}</strong>
            <span className={`ritual-status-badge ${ritual.on ? 'is-active' : ''}`}>
              {ritual.on ? 'Active' : 'Pending'}
            </span>
          </div>
          {ritual.detail && <small>{ritual.detail}</small>}
        </div>

        <div className="habit-card-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="habit-card-menu-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Actions for ${ritual.title}`}
          >
            <GripDiagonal size={14} />
          </button>
          {menuOpen && (
            <div className="habit-card-menu" role="menu" aria-label={`Actions for ${ritual.title}`}>
              <button
                className="habit-action"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                className="habit-action"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function RitualDialog({
  ritual,
  onClose,
  onSubmit,
}: {
  ritual: Ritual | null;
  onClose: () => void;
  onSubmit: (title: string, detail: string) => void;
}) {
  const [title, setTitle] = useState(ritual?.title ?? '');
  const [detail, setDetail] = useState(ritual?.detail ?? '');

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div>
            <h3>{ritual ? 'Edit ritual' : 'New ritual'}</h3>
            <p className="dialog-subtitle">
              Rituals help prepare your environment and mind before or after deep focus.
            </p>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onSubmit(title, detail);
          }}
          className="dialog-form"
        >
          <label className="dialog-field">
            <span>Ritual Title</span>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Morning Startup, Deep Work Prep, Evening Reset"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="dialog-input"
            />
          </label>

          <label className="dialog-field">
            <span>Description / Routine Steps</span>
            <textarea
              placeholder="e.g. Clear physical desk, put phone on Do Not Disturb, review today's blocks..."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              className="dialog-textarea"
            />
          </label>

          <div className="dialog-actions">
            <button type="button" className="button-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={!title.trim()}>
              {ritual ? 'Save changes' : 'Create ritual'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
