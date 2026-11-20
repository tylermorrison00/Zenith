import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { GripDiagonal } from '../lib/icons';
import { CardHeading, Panel } from '../components/Shared';
import { QuickAddModal } from '../components/QuickAddModal';
import { useDashboard } from '../state/DashboardContext';
import type { Note } from '../data/seed';

export function NotesPage() {
  const { notes, updateNote, deleteNote } = useDashboard();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const projectCount = useMemo(() => new Set(notes.map((n) => n.project)).size, [notes]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((note) => `${note.title} ${note.excerpt} ${note.project}`.toLowerCase().includes(q));
  }, [notes, query]);

  const selected = notes.find((n) => n.id === selectedId) ?? visible[0] ?? notes[0];

  return (
    <div className="notes-page">
      <div className="page-title-row">
        <div>
          <h1 className="display-title">Notes</h1>
          <p className="page-detail">Thoughts, handoffs and research — kept with the work they belong to. Same notes you search from the header.</p>
        </div>
        <div className="page-title-side">
          <button className="button-light" onClick={() => setAddOpen(true)}><Plus size={14} /> New note</button>
        </div>
      </div>

      <div className="tasks-stats-row">
        <div className="stat-tile"><div className="stat-tile-head"><span>Total notes</span><span className="stat-icon"><FileText size={12} /></span></div><div className="stat-value">{notes.length}</div><div className="stat-change">In your library</div></div>
        <div className="stat-tile"><div className="stat-tile-head"><span>Projects</span></div><div className="stat-value">{projectCount}</div><div className="stat-change">With notes attached</div></div>
        <div className="stat-tile"><div className="stat-tile-head"><span>Latest</span></div><div className="stat-value" style={{ fontSize: 18, letterSpacing: '-0.02em', paddingTop: 6 }}>{notes[0]?.updated ?? '—'}</div><div className="stat-change">{notes[0]?.title ?? 'No notes yet'}</div></div>
        <div className="stat-tile"><div className="stat-tile-head"><span>Showing</span></div><div className="stat-value">{visible.length}</div><div className="stat-change">{query ? 'Matching your search' : 'All notes'}</div></div>
      </div>

      <div className="notes-layout">
        <Panel className="notes-list-panel">
          <CardHeading title="All notes" />
          <div className="notes-search">
            <Search size={14} className="search-icon" />
            <input aria-label="Search notes" placeholder="Search notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="notes-list">
            {visible.map((note) => (
              <NoteRowItem
                key={note.id}
                note={note}
                isSelected={selected?.id === note.id}
                onSelect={() => setSelectedId(note.id)}
                onEdit={() => setEditingNote(note)}
                onDelete={() => deleteNote(note.id)}
              />
            ))}
            {!visible.length && <div className="tasks-empty">No notes match that search.</div>}
          </div>
        </Panel>

        <Panel className="notes-preview-panel">
          {selected ? (
            <>
              <div className="notes-preview-top" style={{ justifyContent: 'flex-end' }}>
                <span className="notes-preview-updated">{selected.updated}</span>
              </div>
              <h2 className="notes-preview-title">{selected.title}</h2>
              <p className="notes-preview-body">{selected.excerpt}</p>
            </>
          ) : (
            <div className="tasks-empty">Select a note to preview it here, or add a new one.</div>
          )}
        </Panel>
      </div>

      {editingNote && (
        <EditNoteDialog
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSubmit={(title, body) => {
            updateNote(editingNote.id, title, body);
            setEditingNote(null);
          }}
        />
      )}

      <QuickAddModal type={addOpen ? 'note' : null} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function NoteRowItem({
  note,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <button
        className={`notes-row ${isSelected ? 'is-selected' : ''}`}
        onClick={onSelect}
        style={{ width: '100%', paddingRight: 48 }}
      >
        <span className="notes-row-icon"><FileText size={15} /></span>
        <span className="notes-row-copy">
          <strong>{note.title}</strong>
          <small>{note.excerpt}</small>
        </span>
      </button>
      <div className="habit-card-menu-wrap" ref={menuRef} style={{ position: 'absolute', top: 6, right: 8 }}>
        <button
          type="button"
          className="habit-card-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((open) => !open); }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Actions for ${note.title}`}
        >
          <GripDiagonal size={14} />
        </button>
        {menuOpen && (
          <div className="habit-card-menu" role="menu" aria-label={`Actions for ${note.title}`}>
            <button
              className="habit-action"
              role="menuitem"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              className="habit-action"
              role="menuitem"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditNoteDialog({
  note,
  onClose,
  onSubmit,
}: {
  note: Note;
  onClose: () => void;
  onSubmit: (title: string, body: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.excerpt);

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onSubmit(t, body);
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" onSubmit={submit}>
        <div className="modal-head">
          <div><div className="eyebrow">Note details</div><h2>Edit note</h2></div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '14px 0' }}>
          <label className="form-label">Note title
            <input className="form-control" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" />
          </label>
          <label className="form-label">Content
            <textarea
              className="form-control"
              style={{ minHeight: 120, resize: 'vertical' }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your note…"
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="button-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="button-light" disabled={!title.trim()}>Save changes</button>
        </div>
      </form>
    </div>
  );
}
