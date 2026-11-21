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

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), detail.trim());
  }

  return (
    <div
      className="modal-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="ritual-dialog-title" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Focus routines & anchors</div>
            <h2 id="ritual-dialog-title">{ritual ? 'Edit ritual' : 'Add ritual'}</h2>
          </div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <label className="form-label">
          Ritual name
          <input
            className="form-control"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Morning Startup"
          />
        </label>

        <label className="form-label">
          Detail / Routine steps
          <input
            className="form-control"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="e.g. Clear desk, review top 3 blocks, brew coffee"
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-light" disabled={!title.trim()}>
            {ritual ? 'Save ritual' : 'Add ritual'}
          </button>
        </div>
      </form>
    </div>
  );
}
