import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { GripDiagonal } from '../lib/icons';
import { Panel } from '../components/Shared';
import { useDashboard } from '../state/DashboardContext';
import type { Habit } from '../data/seed';

export function HabitsPage() {
  const { habits, toggleHabit, addHabit, updateHabit, deleteHabit } = useDashboard();
  const [dialog, setDialog] = useState<{ mode: 'add' } | { mode: 'edit'; habit: Habit } | null>(null);

  const doneCount = habits.filter((h) => h.done).length;
  const bestStreak = habits.length ? Math.max(...habits.map((h) => h.streak)) : 0;
  const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0);

  return (
    <div className="habits-page">
      <div className="page-title-row">
        <div>
          <h1 className="display-title">Habits</h1>
          <p className="page-detail">The things you do every single day. Tap the tick on a card to check in for today — the grid fills up and your streak grows. One-off jobs belong in Tasks, not here.</p>
        </div>
        <div className="page-title-side tasks-actions">
          <button className="button-light tasks-add-btn" onClick={() => setDialog({ mode: 'add' })}><Plus size={14} /> Add habit</button>
        </div>
      </div>

      <div className="tasks-stats-row">
        <div className="stat-tile"><div className="stat-tile-head"><span>Done today</span><span className="stat-icon"><Check size={12} /></span></div><div className="stat-value">{doneCount}<small style={{ fontSize: 14, color: 'var(--muted)' }}> / {habits.length}</small></div><div className="stat-change">Keep the chain going</div></div>
        <div className="stat-tile"><div className="stat-tile-head"><span>Best streak</span><span className="stat-icon"><Target size={12} /></span></div><div className="stat-value">{bestStreak}<small style={{ fontSize: 14, color: 'var(--muted)' }}> days</small></div><div className="stat-change">Your longest run</div></div>
        <div className="stat-tile"><div className="stat-tile-head"><span>Total streak days</span></div><div className="stat-value">{totalStreak}</div><div className="stat-change">Across all habits</div></div>
        <div className="stat-tile"><div className="stat-tile-head"><span>Habits</span></div><div className="stat-value">{habits.length}</div><div className="stat-change">Daily cards</div></div>
      </div>

      {habits.length ? (
        <div className="habit-cards">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggle={() => toggleHabit(habit.id)}
              onEdit={() => setDialog({ mode: 'edit', habit })}
              onDelete={() => deleteHabit(habit.id)}
            />
          ))}
        </div>
      ) : (
        <Panel className="habits-panel">
          <div className="tasks-empty">
            <p>No habits yet. Add your first daily habit card.</p>
            <button className="button-light" onClick={() => setDialog({ mode: 'add' })}><Plus size={13} /> Add habit</button>
          </div>
        </Panel>
      )}

      {dialog && (
        <HabitDialog
          habit={dialog.mode === 'edit' ? dialog.habit : null}
          onClose={() => setDialog(null)}
          onSubmit={(title, detail) => {
            if (dialog.mode === 'edit') updateHabit(dialog.habit.id, title, detail);
            else addHabit(title, detail);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function HabitCard({ habit, onToggle, onEdit, onDelete }: {
  habit: Habit;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const filled = habit.history.filter(Boolean).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
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
    <Panel className="habit-card">
      <div className="habit-card-head">
        <button
          className={`habit-card-check ${habit.done ? 'is-done' : ''}`}
          onClick={onToggle}
          aria-pressed={habit.done}
          aria-label={habit.done ? `Uncheck ${habit.title} for today` : `Check ${habit.title} for today`}
        >
          {habit.done && <Check size={11} />}
        </button>
        <div className="habit-card-copy">
          <strong>{habit.title}</strong>
          <small>{habit.detail}</small>
        </div>
        <span className="habit-card-streak">{habit.streak} day streak</span>
        <div className="habit-card-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="habit-card-menu-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More actions for ${habit.title}`}
          >
            <GripDiagonal size={14} />
          </button>
          {menuOpen && (
            <div className="habit-card-menu" role="menu" aria-label={`Actions for ${habit.title}`}>
              <button className="habit-action" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }} aria-label={`Edit ${habit.title}`}><Pencil size={13} /> Edit</button>
              <button className="habit-action" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(); }} aria-label={`Delete ${habit.title}`}><Trash2 size={13} /> Delete</button>
            </div>
          )}
        </div>
      </div>

      <div className="habit-card-grid" role="img" aria-label={`${habit.title}: ${filled} of the last 28 days done`}>
        {habit.history.map((dayDone, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`habit-cell ${dayDone ? 'is-filled' : ''} ${index === habit.history.length - 1 ? 'is-today' : ''}`}
          />
        ))}
      </div>
    </Panel>
  );
}

function HabitDialog({ habit, onClose, onSubmit }: {
  habit: Habit | null;
  onClose: () => void;
  onSubmit: (title: string, detail: string) => void;
}) {
  const [title, setTitle] = useState(habit?.title ?? '');
  const [detail, setDetail] = useState(habit?.detail ?? '');

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), detail.trim());
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="habit-dialog-title" onSubmit={submit}>
        <div className="modal-head">
          <div><div className="eyebrow">Every day, one tick</div><h2 id="habit-dialog-title">{habit ? 'Edit habit' : 'Add habit'}</h2></div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </div>
        <label className="form-label">Habit name
          <input className="form-control" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Muscle Mesh" />
        </label>
        <label className="form-label">Detail
          <input className="form-control" value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="e.g. Daily video upload" />
        </label>
        <div className="modal-actions">
          <button type="button" className="button-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="button-light">{habit ? 'Save habit' : 'Add habit'}</button>
        </div>
      </form>
    </div>
  );
}
