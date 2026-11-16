import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';

export function QuickAddModal({ type, onClose }: { type: 'task' | 'note' | null; onClose: () => void }) {
  const { addTask, addNote } = useDashboard();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  useEffect(() => { setTitle(''); setBody(''); }, [type]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    if (type) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [type, onClose]);
  if (!type) return null;
  const isTask = type === 'task';
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    if (isTask) addTask(title.trim()); else addNote(title.trim(), body.trim());
    onClose();
  }
  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="quick-add-title" onSubmit={submit}>
        <div className="modal-head"><div><div className="eyebrow">A little more clarity</div><h2 id="quick-add-title">Add a {isTask ? 'task' : 'note'}</h2></div><button type="button" className="icon-circle" aria-label="Close" onClick={onClose}><X size={15} /></button></div>
        <label className="form-label">{isTask ? 'Task name' : 'Note title'}<input className="form-control" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={isTask ? 'What needs your attention?' : 'Give this note a name'} /></label>
        {!isTask && <label className="form-label">A few lines<textarea className="form-control" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Capture the thought while it’s here." /></label>}
        <div className="modal-actions"><button type="button" className="button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button-light">Save {isTask ? 'task' : 'note'}</button></div>
      </form>
    </div>
  );
}
