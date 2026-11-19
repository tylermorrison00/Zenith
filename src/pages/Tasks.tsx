import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Folder, GripDiagonal, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ListChecks } from '../lib/icons';
import { CardHeading, Panel, TinyPill } from '../components/Shared';
import { useDashboard } from '../state/DashboardContext';
import type { Task } from '../data/seed';

type TaskFilter = 'All' | 'Open' | 'Done';
type Priority = Task['priority'];

const ALL_LISTS = 'all';

export function TasksPage() {
  const { tasks, taskLists, toggleTask, addTask, updateTask, deleteTask, addTaskList, deleteTaskList, notify } = useDashboard();
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [selectedList, setSelectedList] = useState<string>(ALL_LISTS);
  const [addOpen, setAddOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('normal');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const openCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const highCount = tasks.filter((t) => t.priority === 'high' && !t.done).length;

  const selectedListName = selectedList === ALL_LISTS
    ? null
    : taskLists.find((list) => list.id === selectedList)?.name ?? null;

  // If the selected list was deleted, fall back to All tasks.
  useEffect(() => {
    if (selectedList !== ALL_LISTS && !taskLists.some((list) => list.id === selectedList)) {
      setSelectedList(ALL_LISTS);
    }
  }, [selectedList, taskLists]);

  const visible = useMemo(() => tasks.filter((task) => {
    if (selectedListName && task.project !== selectedListName) return false;
    if (filter === 'Open') return !task.done;
    if (filter === 'Done') return task.done;
    return true;
  }), [filter, tasks, selectedListName]);

  function countForList(name: string) {
    const inList = tasks.filter((t) => t.project === name);
    return { total: inList.length, open: inList.filter((t) => !t.done).length };
  }

  function submitQuickAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    addTask(title, selectedListName ?? taskLists[0]?.name ?? 'Personal', quickPriority);
    setQuickTitle('');
  }

  return (
    <div className="tasks-page">
      <div className="page-title-row">
        <div>
          <h1 className="display-title">Tasks</h1>
          <p className="page-detail">Everything on your plate, in one place. Add a task, or create a new list to keep things separate — it all stays in sync with Overview.</p>
        </div>
        <div className="page-title-side tasks-actions">
          <button className="button-outline tasks-create-list-btn" onClick={() => setListOpen(true)}><Folder size={14} /> Create list</button>
          <button className="button-light tasks-add-btn" onClick={() => setAddOpen(true)}><Plus size={14} /> Add task</button>
        </div>
      </div>

      <div className="tasks-stats-row">
        <div className="stat-tile"><div className="stat-tile-head"><span>Open</span><span className="stat-icon"><ListChecks size={12} /></span></div><div className="stat-value">{openCount}</div><div className="stat-change">Still to do</div></div>
        <div className="stat-tile"><div className="stat-tile-head"><span>Done</span><span className="stat-icon"><Check size={12} /></span></div><div className="stat-value">{doneCount}</div><div className="stat-change">Completed</div></div>
        <div className="stat-tile"><div className="stat-tile-head"><span>High priority</span></div><div className="stat-value">{highCount}</div><div className="stat-change">Needs attention first</div></div>
        <div className="stat-tile"><div className="stat-tile-head"><span>Lists</span><span className="stat-icon"><Folder size={12} /></span></div><div className="stat-value">{taskLists.length}</div><div className="stat-change">Task lists</div></div>
      </div>

      <div className="tasks-layout">
        <Panel className="tasks-sidebar">
          <div className="tasks-sidebar-head">
            <CardHeading title="Task lists" detail="Pick a list to see its tasks" />
          </div>
          <div className="task-lists" role="listbox" aria-label="Task lists">
            <button
              className={`task-list-row ${selectedList === ALL_LISTS ? 'is-selected' : ''}`}
              onClick={() => setSelectedList(ALL_LISTS)}
              aria-selected={selectedList === ALL_LISTS}
            >
              <span className="task-list-icon"><ListChecks size={14} /></span>
              <span className="task-list-copy"><strong>All tasks</strong><small>{openCount} open · {tasks.length} total</small></span>
              <span className="task-list-count">{tasks.length}</span>
            </button>
            {taskLists.map((list) => {
              const counts = countForList(list.name);
              return (
                <div key={list.id} className={`task-list-row-wrap ${selectedList === list.id ? 'is-selected' : ''}`}>
                  <button
                    className="task-list-row"
                    onClick={() => setSelectedList(list.id)}
                    aria-selected={selectedList === list.id}
                  >
                    <span className="task-list-icon"><Folder size={14} /></span>
                    <span className="task-list-copy"><strong>{list.name}</strong><small>{counts.open} open · {counts.total} total</small></span>
                    <span className="task-list-count">{counts.total}</span>
                  </button>
                  <button
                    className="task-list-delete"
                    aria-label={`Remove list ${list.name}`}
                    onClick={() => { deleteTaskList(list.id); if (selectedList === list.id) setSelectedList(ALL_LISTS); }}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
          <button className="tasks-new-list" onClick={() => setListOpen(true)}><Plus size={13} /> New list</button>
        </Panel>

        <Panel className="tasks-panel">
          <div className="tasks-panel-head">
            <CardHeading title={selectedListName ?? 'All tasks'} />
            <div className="projects-filter-tabs" aria-label="Task filters">
              {(['All', 'Done'] as const).map((item) => (
                <button key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>
              ))}
            </div>
          </div>

          <form className="tasks-quick-add" onSubmit={submitQuickAdd}>
            <input
              aria-label="Quick add a task"
              placeholder={selectedListName ? `Add a task to ${selectedListName}…` : 'Add a task…'}
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
            />
            <div className="tasks-quick-priority" role="group" aria-label="Task priority">
              {(['low', 'normal', 'high'] as Priority[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={quickPriority === item ? 'is-active' : ''}
                  onClick={() => setQuickPriority(item)}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
            <button type="submit" className="button-light tasks-quick-add-btn" disabled={!quickTitle.trim()}><Plus size={13} /> Add task</button>
          </form>

          <div className="tasks-list">
            {visible.map((task) => (
              <TaskRowItem
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onEdit={() => setEditingTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
            {!visible.length && (
              <div className="tasks-empty">
                <p>{filter !== 'All' ? `No ${filter.toLowerCase()} tasks here yet.` : selectedListName ? `No tasks in ${selectedListName} yet.` : 'No tasks yet.'}</p>
                <button className="button-light" onClick={() => setAddOpen(true)}><Plus size={13} /> Add your first task</button>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          taskLists={taskLists}
          onClose={() => setEditingTask(null)}
          onSubmit={(title, project, priority) => {
            updateTask(editingTask.id, title, project, priority);
            setEditingTask(null);
          }}
        />
      )}

      {addOpen && (
        <AddTaskDialog
          lists={taskLists.map((list) => list.name)}
          initialList={selectedListName}
          onClose={() => setAddOpen(false)}
          onSubmit={(title, listName, priority) => { addTask(title, listName, priority); setAddOpen(false); }}
        />
      )}
      {listOpen && (
        <CreateListDialog
          existing={taskLists.map((list) => list.name)}
          onClose={() => setListOpen(false)}
          onSubmit={(name) => {
            if (taskLists.some((list) => list.name.toLowerCase() === name.toLowerCase())) { notify('A list with that name already exists'); return; }
            addTaskList(name);
            setListOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AddTaskDialog({ lists, initialList, onClose, onSubmit }: {
  lists: string[];
  initialList: string | null;
  onClose: () => void;
  onSubmit: (title: string, listName: string, priority: Priority) => void;
}) {
  const [title, setTitle] = useState('');
  const [listName, setListName] = useState(initialList ?? lists[0] ?? 'Personal');
  const [priority, setPriority] = useState<Priority>('normal');

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), listName, priority);
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-task-title" onSubmit={submit}>
        <div className="modal-head">
          <div><div className="eyebrow">A little more clarity</div><h2 id="add-task-title">Add a task</h2></div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </div>
        <label className="form-label">Task name
          <input className="form-control" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs your attention?" />
        </label>
        <label className="form-label">List
          <select className="form-control" aria-label="Task list" value={listName} onChange={(event) => setListName(event.target.value)}>
            {lists.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <div className="form-label">Priority
          <div className="projects-filter-tabs tasks-priority-tabs" aria-label="Task priority">
            {(['low', 'normal', 'high'] as const).map((item) => (
              <button type="button" key={item} className={priority === item ? 'is-active' : ''} onClick={() => setPriority(item)}>{item.charAt(0).toUpperCase() + item.slice(1)}</button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="button-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="button-light">Save task</button>
        </div>
      </form>
    </div>
  );
}

function TaskRowItem({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
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
    <div
      className="task-card-wrap"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        marginBottom: 6,
        background: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(226, 217, 208, 0.08)',
        borderRadius: 10,
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      <button
        className="tasks-row"
        onClick={onToggle}
        aria-pressed={task.done}
        style={{
          width: '100%',
          padding: '11px 48px 11px 12px',
          border: 0,
          background: 'transparent',
          borderRadius: 10,
          minHeight: 52,
        }}
      >
        <span className={`task-check task-check--lg ${task.done ? 'is-done' : ''}`}>{task.done && <Check size={12} />}</span>
        <span className="tasks-row-copy">
          <strong className={task.done ? 'is-done-text' : ''}>{task.title}</strong>
          <small>{task.project} · {task.due}</small>
        </span>
        {task.priority === 'high' && !task.done && <TinyPill tone="amber">High</TinyPill>}
        {task.done && <TinyPill>Done</TinyPill>}
      </button>
      <div className="habit-card-menu-wrap" ref={menuRef} style={{ position: 'absolute', top: 6, right: 8 }}>
        <button
          type="button"
          className="habit-card-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Actions for ${task.title}`}
        >
          <GripDiagonal size={14} />
        </button>
        {menuOpen && (
          <div className="habit-card-menu" role="menu" aria-label={`Actions for ${task.title}`}>
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

function EditTaskDialog({
  task,
  taskLists,
  onClose,
  onSubmit,
}: {
  task: Task;
  taskLists: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (title: string, project: string, priority: Task['priority']) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [project, setProject] = useState(task.project);
  const [priority, setPriority] = useState<Task['priority']>(task.priority);

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onSubmit(t, project, priority);
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" onSubmit={submit}>
        <div className="modal-head">
          <div><div className="eyebrow">Task details</div><h2>Edit task</h2></div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '14px 0' }}>
          <label className="form-label">Task title
            <input className="form-control" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="form-label">List
              <select className="form-control" value={project} onChange={(e) => setProject(e.target.value)}>
                {taskLists.map((l) => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
            </label>
            <label className="form-label">Priority
              <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
                <option value="normal">Normal</option>
                <option value="high">High priority</option>
              </select>
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="button-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="button-light" disabled={!title.trim()}>Save changes</button>
        </div>
      </form>
    </div>
  );
}

function CreateListDialog({ existing, onClose, onSubmit }: {
  existing: string[];
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-list-title" onSubmit={submit}>
        <div className="modal-head">
          <div><div className="eyebrow">Keep things separate</div><h2 id="create-list-title">Create a task list</h2></div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </div>
        <p>Give the list a name — for a project, an area of life, anything. New tasks you add can go straight into it.</p>
        <label className="form-label">List name
          <input className="form-control" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Shopping, Home, Side project" />
        </label>
        {existing.length > 0 && <p className="tasks-dialog-hint">Your lists now: {existing.join(' · ')}</p>}
        <div className="modal-actions">
          <button type="button" className="button-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="button-light">Create list</button>
        </div>
      </form>
    </div>
  );
}
