import { useMemo, useState } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import { CardHeading, Panel, TinyPill } from '../components/Shared';
import { QuickAddModal } from '../components/QuickAddModal';
import { useDashboard } from '../state/DashboardContext';

export function NotesPage() {
  const { notes, notify } = useDashboard();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
          <CardHeading title="All notes" detail="Newest first · tap to preview" />
          <div className="notes-search">
            <Search size={14} className="search-icon" />
            <input aria-label="Search notes" placeholder="Search notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="notes-list">
            {visible.map((note) => (
              <button
                key={note.id}
                className={`notes-row ${selected?.id === note.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(note.id)}
              >
                <span className="notes-row-icon"><FileText size={15} /></span>
                <span className="notes-row-copy">
                  <strong>{note.title}</strong>
                  <small>{note.excerpt}</small>
                  <span className="notes-row-meta">{note.project} · {note.updated}</span>
                </span>
              </button>
            ))}
            {!visible.length && <div className="tasks-empty">No notes match that search.</div>}
          </div>
        </Panel>

        <Panel className="notes-preview-panel">
          {selected ? (
            <>
              <div className="notes-preview-top">
                <TinyPill tone="amber">{selected.project}</TinyPill>
                <span className="notes-preview-updated">{selected.updated}</span>
              </div>
              <h2 className="notes-preview-title">{selected.title}</h2>
              <p className="notes-preview-body">{selected.excerpt}</p>
              <p className="notes-preview-hint">This is the same note stored in your workspace library — new notes you add here appear in search and on Overview too.</p>
              <button className="button-outline" onClick={() => notify(`${selected.title} · ${selected.project}`)}>Open in project</button>
            </>
          ) : (
            <div className="tasks-empty">Select a note to preview it here, or add a new one.</div>
          )}
        </Panel>
      </div>

      <QuickAddModal type={addOpen ? 'note' : null} onClose={() => setAddOpen(false)} />
    </div>
  );
}
