import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Archive, Check, ChevronLeft, ChevronRight, FileText, FolderOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { GripDiagonal } from '../lib/icons';
import { CardHeading, FolderGlyph, PageEyebrow, Panel, ProgressBar, StatusChip, TinyPill } from '../components/Shared';
import { useDashboard } from '../state/DashboardContext';
import { currentWeekNumber } from '../lib/dates';
import type { Project, Task, Note } from '../data/seed';

type ProjectFilter = 'All' | 'Active' | 'Done';

// Project milestones mapping

const projectMilestonesMap: Record<string, { day: string; month: string; title: string; project: string; status: string }[]> = {
  home: [
    { day: '20', month: 'Nov', title: 'Pantry & supplies restock', project: 'Home', status: 'On track' },
    { day: '24', month: 'Nov', title: 'Living room setup & plants', project: 'Home', status: 'Planned' },
    { day: '02', month: 'Dec', title: 'Winter wardrobe organize', project: 'Home', status: 'Review' },
  ],
  personal: [
    { day: '21', month: 'Nov', title: 'Weekly workout targets', project: 'Personal', status: 'On track' },
    { day: '26', month: 'Nov', title: 'Finish reading Chapter 4', project: 'Personal', status: 'Planned' },
    { day: '05', month: 'Dec', title: 'Monthly savings check-in', project: 'Personal', status: 'Planned' },
  ],
  work: [
    { day: '22', month: 'Nov', title: 'Sprint backlog review', project: 'Work', status: 'Review' },
    { day: '24', month: 'Nov', title: 'Design spec handoff', project: 'Work', status: 'On track' },
    { day: '29', month: 'Nov', title: 'Client presentation deck', project: 'Work', status: 'Planned' },
    { day: '04', month: 'Dec', title: 'Q4 deliverables signoff', project: 'Work', status: 'Planned' },
  ],
};

function WeekBars({ planned, projectKey = 'home' }: { planned: boolean; projectKey?: string }) {
  const uMap: Record<string, number[]> = {
    home: [35, 52, 48, 65, 42, 0, 0],
    personal: [25, 45, 70, 35, 62, 0, 0],
    work: [80, 92, 85, 95, 78, 0, 0],
  };
  const gMap: Record<string, number[]> = {
    home: [45, 60, 55, 70, 50, 25, 20],
    personal: [30, 55, 75, 45, 68, 35, 25],
    work: [85, 96, 90, 98, 85, 45, 30],
  };
  const key = (projectKey || 'home').toLowerCase();
  const doneValues = uMap[key] || [40, 60, 50, 70, 55, 0, 0];
  const planValues = gMap[key] || [50, 70, 65, 80, 65, 30, 20];
  const values = planned ? planValues : doneValues;
  return <div className="project-week-chart" aria-label={`${planned ? 'Planned' : 'Done'} focus hours by day`}>
    {values.map((height, index) => <div className={`project-week-column ${index === 4 ? 'is-today' : ''}`} key={index}>
      <div className="project-week-track">{height > 0 ? <span style={{ height: `${height}%` }} /> : <span className="track-empty-placeholder" />}</div>
      <small>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</small>
    </div>)}
  </div>;
}

function NewProjectDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    onCreate(value);
  }
  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="modal-card" onSubmit={submit}>
      <div className="modal-head"><h2>Start a project</h2><button type="button" className="icon-circle" aria-label="Close dialog" onClick={onClose}><X size={14} /></button></div>
      <p>Give the work a name. You can add a plan and deliverables as you go.</p>
      <label className="form-label">Project name<input autoFocus className="form-control" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Studio launch" /></label>
      <div className="modal-actions"><button type="button" className="button-quiet" onClick={onClose}>Cancel</button><button className="button-light" type="submit">Create project <ArrowRight size={13} /></button></div>
    </form>
  </div>;
}

function EditProjectDialog({ project, onClose, onSave }: { project: Project; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(project.name);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    onSave(value);
  }
  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="modal-card" onSubmit={submit}>
      <div className="modal-head"><h2>Edit project</h2><button type="button" className="icon-circle" aria-label="Close dialog" onClick={onClose}><X size={14} /></button></div>
      <p>Update the name of this project.</p>
      <label className="form-label">Project name<input autoFocus className="form-control" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Studio launch" /></label>
      <div className="modal-actions"><button type="button" className="button-quiet" onClick={onClose}>Cancel</button><button className="button-light" type="submit">Save changes</button></div>
    </form>
  </div>;
}

function ProjectRow({
  project,
  onOpen,
  onEdit,
  onDelete,
  tasks,
  notes,
}: {
  project: Project;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  tasks: Task[];
  notes: Note[];
}) {
  const pTasks = (tasks || []).filter((t) => t.project && (t.project.toLowerCase() === (project.name || '').toLowerCase() || t.project.toLowerCase() === (project.id || '').toLowerCase()));
  const pNotes = (notes || []).filter((n) => n.project && (n.project.toLowerCase() === (project.name || '').toLowerCase() || n.project.toLowerCase() === (project.id || '').toLowerCase()));
  const pTotalFiles = pTasks.length + pNotes.length;
  const pDone = pTasks.filter((t) => t.done).length;
  const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : (project.progress || 0);

  return (
    <tr className="project-list-row" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <td>
        <button className="project-name-button" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          <FolderGlyph active={project.id === 'zenith'} />
          <span>
            <strong>{project.name}</strong>
            <small>{`${pTotalFiles} ${pTotalFiles === 1 ? 'file' : 'files'}`}</small>
          </span>
        </button>
      </td>
      <td>{pTasks.length} ({pDone} done)</td>
      <td>{pNotes.length}</td>
      <td>
        <div className="project-progress-cell">
          <strong>{pPct}%</strong>
          <ProgressBar value={pPct} />
        </div>
      </td>
      <td><StatusChip status={project.status || 'Needs time'} /></td>
      <td style={{ textAlign: 'right' }}>
        <button
          className="icon-circle"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          aria-label={`Edit ${project.name}`}
          style={{ marginRight: 6 }}
        >
          <Pencil size={12} />
        </button>
        <button
          className="icon-circle"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label={`Delete ${project.name}`}
        >
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  );
}

export function ProjectsPage() {
  const { projects, tasks, notes, addProject, updateProject, deleteProject, notify } = useDashboard();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ProjectFilter>('All');
  const [planned, setPlanned] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [week, setWeek] = useState(() => currentWeekNumber());
  const [selectedId, setSelectedId] = useState<string>(() => {
    const hp = projects.find((p) => p.name && p.name.toLowerCase() === 'home');
    return hp ? hp.id : (projects[0]?.id || '');
  });
  const activeProjects = projects.filter((project) => project.status !== 'Done').length;

  const featured = (selectedId && projects.find((p) => p.id === selectedId))
    || projects.find((p) => p.name && p.name.toLowerCase() === 'home')
    || projects[0];

  const pKey = featured ? featured.name.toLowerCase() : 'home';
  const pTasks = featured ? tasks.filter((task) => task.project && (task.project.toLowerCase() === featured.name.toLowerCase() || task.project.toLowerCase() === featured.id.toLowerCase())) : [];
  const pNotes = featured ? notes.filter((n) => n.project && (n.project.toLowerCase() === featured.name.toLowerCase() || n.project.toLowerCase() === featured.id.toLowerCase())) : [];
  const pPending = pTasks.filter((task) => !task.done);
  const pDone = pTasks.filter((task) => task.done).length;
  const pTotal = pTasks.length;
  const pTotalFiles = pTasks.length + pNotes.length;
  const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : (featured?.progress || 0);

  const hoursMap: Record<string, number> = { home: 4.0, personal: 3.5, work: 12.5 };
  const currentHours = (featured && featured.hours > 0) ? featured.hours : (hoursMap[pKey] || 0);
  const currentDueCount = pPending.length || (pTotal > 0 ? 0 : 1);
  const currentMilestones = projectMilestonesMap[pKey] || (featured ? [
    { day: '24', month: 'Nov', title: `${featured.name} roadmap phase 1`, project: featured.name, status: 'On track' },
    { day: '02', month: 'Dec', title: `${featured.name} review & deliver`, project: featured.name, status: 'Planned' },
  ] : []);

  const visibleProjects = useMemo(() => projects.filter((project) => {
    if (filter === 'Done') return project.status === 'Done';
    if (filter === 'Active') return project.status !== 'Done';
    return true;
  }), [filter, projects]);

  return <div className="projects-page">
    <div className="projects-overview-top">
      <div className="projects-overview-title">
        <div className="projects-title-copy"><div className="projects-week-nav"><button aria-label="Previous week" onClick={() => setWeek((value) => value - 1)}><ChevronLeft size={12} /></button><PageEyebrow>Week {week} · {activeProjects} active</PageEyebrow><button aria-label="Next week" onClick={() => setWeek((value) => value + 1)}><ChevronRight size={12} /></button></div><h1 className="display-title">Projects</h1></div>
        <div className="projects-title-actions"><button className="button-light new-project-button" onClick={() => setDialogOpen(true)}><Plus size={14} /> New project</button><button className="button-quiet" onClick={() => { setFilter(filter === 'Done' ? 'All' : 'Done'); notify(filter === 'Done' ? 'All projects shown' : 'Completed projects shown'); }}><Archive size={12} /> Archive</button></div>
      </div>
      <div className="projects-summary-metrics">
        <button className="projects-summary-metric" onClick={() => setFilter('Active')}><span>Focus hours</span><strong>{currentHours.toFixed(1)}<small>h</small></strong><small className="metric-change">{currentHours > 0 ? 'This week' : 'No hours logged yet'}</small></button>
        
        <button className="projects-summary-metric" onClick={() => notify(`${currentDueCount} tasks due for ${featured ? featured.name : 'project'}`)}><span>Due this week</span><strong>{currentDueCount}</strong><small>{currentDueCount > 0 ? `${currentDueCount} ${currentDueCount === 1 ? 'task' : 'tasks'} due` : 'No projects due'}</small></button>
        
      </div>
      <div className="projects-week-panel">
        <div className="projects-week-head"><span>Planned vs done</span><div className="projects-week-legend"><button className={planned ? 'is-active' : ''} onClick={() => setPlanned(true)}><i /> Planned</button><button className={!planned ? 'is-active' : ''} onClick={() => setPlanned(false)}><i /> Done</button></div></div>
        <WeekBars planned={planned} projectKey={pKey} />
      </div>
    </div>

    <div className="projects-feature-grid">
      {featured ? <button className="featured-project-card" onClick={() => navigate('/focus')}>
        <div className="featured-project-meta"><span className="start-focus featured-focus-btn"><span className="plus-small">+</span> In focus</span></div>
        <div className="featured-project-title">{featured.name}</div>
        <div className="featured-project-subline">{`${pTotalFiles} ${pTotalFiles === 1 ? 'file' : 'files'}`}</div>
        <div className="featured-project-bottom"><div className="featured-progress"><strong>{pPct}<small>%</small></strong><span>{pTotal > 0 ? `${pDone} of ${pTotal} tasks done` : `${featured.files} done`}</span></div><div className="folder-art-large"><span className="folder-paper folder-paper--one" /><span className="folder-paper folder-paper--two" /><span className="folder-paper folder-paper--amber" /><div className="folder-pocket"><FolderOpen size={50} strokeWidth={1.05} /></div></div></div>
      </button> : <Panel className="featured-project-card"><div className="library-no-results">No project in focus yet — create your first project.</div></Panel>}
      <Panel className="project-milestone-panel">
        <CardHeading
          title="Milestones"
          detail="Next 14 days"
          action={
            <button
              className="icon-circle"
              onClick={() => navigate('/projects/brand-refresh')}
              aria-label="View milestones"
            >
              <ArrowUpRight size={13} />
            </button>
          }
        />
        {currentMilestones.length > 0
          ? <div className="project-milestone-list">{currentMilestones.map((item) => <button className="project-milestone-row" key={item.title} onClick={() => notify(`${item.title} · ${item.project}`)}><span className="milestone-date"><b>{item.day}</b><small>{item.month}</small></span><span className="milestone-copy"><strong>{item.title}</strong><small>{item.project}</small></span><TinyPill tone="neutral"><i className={`mini-status-dot ${item.status === 'Review' ? 'is-amber' : ''}`} />{item.status}</TinyPill></button>)}</div>
          : <div className="library-no-results">No milestones in the next 14 days.</div>}
      </Panel>
    </div>

    <Panel className="all-projects-panel">
      <div className="all-projects-heading"><div><CardHeading title="All projects" detail="Sorted by next focus block" /></div><div className="projects-filter-tabs" aria-label="Project filters">{(['All', 'Active', 'Done'] as const).map((item) => <button key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      {visibleProjects.length > 0 ? (
        <div className="table-wrap">
          <table className="projects-overview-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Tasks</th>
                <th>Notes</th>
                <th>Progress</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onOpen={() => setSelectedId(project.id)}
                  onEdit={() => setEditingProject(project)}
                  onDelete={() => deleteProject(project.id)}
                  tasks={tasks}
                  notes={notes}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="projects-empty-filter">{projects.length ? 'No projects in this view.' : 'No projects yet — create your first project.'}</p>
      )}
    </Panel>
    {dialogOpen && <NewProjectDialog onClose={() => setDialogOpen(false)} onCreate={(name) => { addProject(name); setDialogOpen(false); notify(`${name} added to projects`); }} />}
    {editingProject && <EditProjectDialog project={editingProject} onClose={() => setEditingProject(null)} onSave={(name) => { updateProject(editingProject.id, name); setEditingProject(null); }} />}
  </div>;
}

function ProjectEditTaskModal({ task, onClose, onSave }: { task: { id: string; title: string; priority: string }; onClose: () => void; onSave: (title: string, priority: string) => void }) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority || 'normal');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) onSave(title.trim(), priority);
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-task-title" onSubmit={handleSubmit}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Task details</div>
            <h2 id="edit-task-title">Edit task</h2>
          </div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <label className="form-label">
          Task name
          <input className="form-control" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs your attention?" />
        </label>
        <div className="form-label">
          Priority
          <div className="projects-filter-tabs tasks-priority-tabs" aria-label="Task priority">
            {(['low', 'normal', 'high'] as const).map((pr) => (
              <button type="button" key={pr} className={priority === pr ? 'is-active' : ''} onClick={() => setPriority(pr)}>
                {pr.charAt(0).toUpperCase() + pr.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-light">
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function ProjectEditNoteModal({ note, onClose, onSave }: { note: { id: string; title: string; excerpt?: string; body?: string }; onClose: () => void; onSave: (title: string, body: string) => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.excerpt || note.body || '');

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) onSave(title.trim(), body.trim());
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" onSubmit={handleSubmit}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Note details</div>
            <h2>Edit note</h2>
          </div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <label className="form-label">
          Title
          <input className="form-control" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title…" />
        </label>
        <label className="form-label">
          Content
          <textarea className="form-control" style={{ minHeight: 110, resize: 'vertical', fontFamily: 'inherit' }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write thoughts or notes…" />
        </label>
        <div className="modal-actions">
          <button type="button" className="button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-light">
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function ProjectAddNoteModal({ onClose, onSave }: { onClose: () => void; onSave: (title: string, body: string) => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) onSave(title.trim(), body.trim());
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" onSubmit={handleSubmit}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">New note</div>
            <h2>Add a note</h2>
          </div>
          <button type="button" className="icon-circle" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <label className="form-label">
          Title
          <input className="form-control" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title…" />
        </label>
        <label className="form-label">
          Content
          <textarea className="form-control" style={{ minHeight: 110, resize: 'vertical', fontFamily: 'inherit' }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write thoughts or notes…" />
        </label>
        <div className="modal-actions">
          <button type="button" className="button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-light">
            Save note
          </button>
        </div>
      </form>
    </div>
  );
}

const defaultSeedProjectNotes = [
  {
    id: 'pn-1',
    title: 'Finance Cashbook',
    excerpt: "You ran yesterday. Today, stairs feel impossible. Flat ground feels fine. But one step down and your quads scream. That's not an injury. That's your muscles learning. Here's where runners argue. Half of them say stay on the couch. The other half say walk it off. Both sound right. Only one is. Your muscles got tiny tears yesterday. Stairs hurt most because your quads brake your whole body weight on every step down. That's why down feels worse than up. Resting all day sounds kind, but it slows repair. Gentle movement pushes fresh blood into those muscles, and that blood does the repair. So today, do this. Walk ten minutes, slow and easy. Then sit, stand up slowly, sit again, ten times. That tiny squat wakes your quads up without more damage. Drink water all day, sleep a full night, don't run hard again until the stairs feel normal. Next time, don't jump from zero to three miles. Add half a mile at a time, and your legs stop punishing you. Turkey Trot training does this to thousands of new runners every November. You know a runner who said \"I can't walk today\" after their first run? Send this to them. Save this for the morning after your next run.",
    updated: 'Just now',
    createdAt: Date.now() - 1000,
  },
  {
    id: 'pn-2',
    title: 'Muscle Mesh',
    excerpt: "Nose or mouth? Runners fight over this. Some swear you should only breathe through your nose. Others say your mouth is there for a reason. Here's the truth nobody tells you. Your nose warms and filters the air, but it moves less of it. Your mouth moves more air, but it's cold and dry. At an easy pace, either one works fine. At a hard pace, your body needs more air than your nose can give. That's when your mouth opens on its own. That panic you feel at mile two isn't weakness. Fighting it doesn't make you tougher. It starves your legs. So stop forcing one way. Use both, on purpose. Easy runs, breathe in through your nose, out through your mouth. If you can't talk in full sentences, slow down until you can. That's your real pace test, not a breathing rule. Hard efforts, just let your mouth open and take what you need. Winter mornings in Boston, the cold air burns your throat. A thin buff over your mouth warms it before it hits your lungs. That's the only gear trick that actually matters here. You know a runner who tapes their mouth shut to train? Send this to them. Save this for your next hard run.",
    updated: 'Just now',
    createdAt: Date.now() - 2000,
  },
];

export function BrandRefreshPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify, projects, addProjectFile } = useDashboard();
  const [filter, setFilter] = useState<'All' | 'Done'>('All');
  const [quickPriority, setQuickPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<{ id: string; title: string; priority: string } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notes state
  const [noteQuery, setNoteQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [openNoteMenuId, setOpenNoteMenuId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; title: string; excerpt?: string; body?: string } | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Load project-store tasks & notes
  const [store, setStore] = useState(() => {
    try {
      const raw = localStorage.getItem('zenith-project-store-v2');
      return raw ? JSON.parse(raw) : { tasks: {}, notes: {} };
    } catch {
      return { tasks: {}, notes: {} };
    }
  });

  useEffect(() => {
    const handleStoreChange = () => {
      try {
        const raw = localStorage.getItem('zenith-project-store-v2');
        setStore(raw ? JSON.parse(raw) : { tasks: {}, notes: {} });
      } catch {
        // ignore
      }
    };
    window.addEventListener('zenith-project-store-changed', handleStoreChange);
    return () => window.removeEventListener('zenith-project-store-changed', handleStoreChange);
  }, []);

  useEffect(() => {
    if (!openMenuId && !openNoteMenuId) return;
    const close = () => {
      setOpenMenuId(null);
      setOpenNoteMenuId(null);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenuId, openNoteMenuId]);

  const pathParts = (location.pathname || '').split('/');
  const routeParam = pathParts[pathParts.length - 1] || '';
  const decodedParam = decodeURIComponent(routeParam).toLowerCase();
  const project = projects.find((k) => k.id === routeParam || k.name.toLowerCase() === decodedParam) || projects.find((k) => k.name.toLowerCase() === 'home') || projects[0];
  const pKey = project ? project.name.toLowerCase() : 'home';
  const projTasks: { id: string; title: string; done: boolean; priority: string; createdAt: number }[] = (store.tasks && store.tasks[pKey]) || [];
  const doneTasks = projTasks.filter((t) => t.done);
  const pPct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : (project ? project.progress || 0 : 0);
  const visibleTasks = projTasks.filter((t) => (filter === 'Done' ? t.done : true));

  // Notes data
  const rawProjNotes: { id: string; title: string; excerpt?: string; body?: string; updated?: string; createdAt?: number }[] =
    store.notes && store.notes[pKey] && store.notes[pKey].length > 0 ? store.notes[pKey] : defaultSeedProjectNotes;
  const selectedNote = rawProjNotes.find((n) => n.id === selectedNoteId) || rawProjNotes[0] || null;
  const visibleNotes = rawProjNotes.filter((n) => {
    if (!noteQuery.trim()) return true;
    const q = noteQuery.toLowerCase();
    return (n.title && n.title.toLowerCase().includes(q)) || (n.excerpt && n.excerpt.toLowerCase().includes(q));
  });

  function saveStore(nextStore: typeof store) {
    try {
      localStorage.setItem('zenith-project-store-v1', JSON.stringify(nextStore));
      window.dispatchEvent(new Event('zenith-project-store-changed'));
      setStore(nextStore);
    } catch {
      // ignore
    }
  }

  function handleAddTask(e?: FormEvent) {
    e?.preventDefault();
    const t = newTaskTitle.trim();
    if (!t || !project) return;
    const newTask = { id: `pt-${Date.now()}`, title: t, done: false, priority: quickPriority, createdAt: Date.now() };
    const nextTasks = [newTask, ...projTasks];
    const nextStore = { ...store, tasks: { ...store.tasks, [pKey]: nextTasks } };
    saveStore(nextStore);
    setNewTaskTitle('');
    notify(`Task added to ${project.name}`);
  }

  function handleToggleTask(taskId: string) {
    const nextTasks = projTasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
    const nextStore = { ...store, tasks: { ...store.tasks, [pKey]: nextTasks } };
    saveStore(nextStore);
  }

  function handleDeleteTask(taskId: string) {
    const nextTasks = projTasks.filter((t) => t.id !== taskId);
    const nextStore = { ...store, tasks: { ...store.tasks, [pKey]: nextTasks } };
    saveStore(nextStore);
    notify('Task removed');
  }

  function handleEditTask(taskId: string, newTitle: string, newPriority: string) {
    const nextTasks = projTasks.map((t) => (t.id === taskId ? { ...t, title: newTitle, priority: newPriority || t.priority } : t));
    const nextStore = { ...store, tasks: { ...store.tasks, [pKey]: nextTasks } };
    saveStore(nextStore);
    notify('Task updated');
    setEditingTask(null);
  }

  function saveNotes(nextNotes: typeof rawProjNotes) {
    const nextStore = { ...store, notes: { ...store.notes, [pKey]: nextNotes } };
    saveStore(nextStore);
  }

  function handleAddNote(title: string, body: string) {
    const newN = { id: `pn-${Date.now()}`, title, excerpt: body || title, updated: 'Just now', createdAt: Date.now() };
    const nextNotes = [newN, ...rawProjNotes];
    saveNotes(nextNotes);
    setSelectedNoteId(newN.id);
    setIsAddingNote(false);
    notify(`Note added to ${project.name}`);
  }

  function handleEditNote(noteId: string, title: string, body: string) {
    const nextNotes = rawProjNotes.map((n) => (n.id === noteId ? { ...n, title, excerpt: body || title, updated: 'Just now' } : n));
    saveNotes(nextNotes);
    setEditingNote(null);
    notify('Note updated');
  }

  function handleDeleteNote(noteId: string) {
    const nextNotes = rawProjNotes.filter((n) => n.id !== noteId);
    saveNotes(nextNotes);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(nextNotes[0]?.id || null);
    }
    notify('Note removed');
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) addProjectFile({ name: file.name, size: file.size, type: file.type });
    event.currentTarget.value = '';
  }

  if (!project) {
    return (
      <div className="brand-project-page">
        <button className="button-light tasks-add-btn" onClick={() => navigate('/projects')} style={{ alignSelf: 'flex-start', marginBottom: '20px' }}>
          <ChevronLeft size={14} /> All projects
        </button>
        <Panel className="detail-content-card">
          <CardHeading title="Project not found" detail="This project does not exist." />
          <p className="library-no-results">Return to the Projects page to select a project.</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="brand-project-page">
      <input ref={fileInputRef} className="visually-hidden-file-input" type="file" aria-label="Choose a project file" onChange={handleFileChange} />
      <button className="button-light tasks-add-btn" onClick={() => navigate('/projects')} style={{ alignSelf: 'flex-start', marginBottom: '20px' }}>
        <ChevronLeft size={14} /> All projects
      </button>
      <div className="brand-detail-heading">
        <div>
          <div className="brand-title-line">
            <h1 className="display-title">{project.name}</h1>
            <TinyPill tone="amber">
              <i className="inline-dot" />
              {pPct}% complete
            </TinyPill>
          </div>
        </div>
      </div>
      <div className="project-detail-layout" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', width: '100%', marginTop: '18px', flexWrap: 'wrap' }}>
        {/* LEFT COLUMN: Tasks */}
        <div style={{ flex: '1 1 420px', maxWidth: '480px', minWidth: '280px', width: '100%' }}>
          <Panel className="tasks-panel" style={{ width: '100%' }}>
            <div className="tasks-panel-head">
              <CardHeading title="All tasks" />
              <div className="projects-filter-tabs" aria-label="Task filters">
                {(['All', 'Done'] as const).map((tabItem) => (
                  <button key={tabItem} className={filter === tabItem ? 'is-active' : ''} onClick={() => setFilter(tabItem)}>
                    {tabItem}
                  </button>
                ))}
              </div>
            </div>
            <form className="tasks-quick-add" onSubmit={handleAddTask}>
              <input aria-label="Quick add a task" placeholder="Add a task…" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
              <div className="tasks-quick-priority" role="group" aria-label="Task priority">
                {(['low', 'normal', 'high'] as const).map((pr) => (
                  <button type="button" key={pr} className={quickPriority === pr ? 'is-active' : ''} onClick={() => setQuickPriority(pr)}>
                    {pr.charAt(0).toUpperCase() + pr.slice(1)}
                  </button>
                ))}
              </div>
              <button type="submit" className="button-light tasks-quick-add-btn" disabled={!newTaskTitle.trim()}>
                <Plus size={13} /> Add task
              </button>
            </form>
            <div className="tasks-list" style={{ marginTop: '12px' }}>
              {visibleTasks.map((t) => (
                <div key={t.id} style={{ position: 'relative', width: '100%', marginBottom: 6, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(226,217,208,0.08)', borderRadius: 10, transition: 'background .15s, border-color .15s' }}>
                  <button className="tasks-row" onClick={() => handleToggleTask(t.id)} aria-pressed={t.done} style={{ width: '100%', padding: '11px 48px 11px 12px', border: 0, background: 'transparent', borderRadius: 10, minHeight: 52 }}>
                    <span className={`task-check task-check--lg ${t.done ? 'is-done' : ''}`}>
                      {t.done && <Check size={12} />}
                    </span>
                    <span className="tasks-row-copy">
                      <strong className={t.done ? 'is-done-text' : ''}>{t.title}</strong>
                      <small>{project.name} · Today · just added</small>
                    </span>
                    {t.priority === 'high' && !t.done && <TinyPill tone="amber">High</TinyPill>}
                    {t.done && <TinyPill>Done</TinyPill>}
                  </button>
                  <div className="habit-card-menu-wrap" style={{ position: 'absolute', top: 6, right: 8 }}>
                    <button type="button" className="habit-card-menu-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); }} aria-label={`Actions for ${t.title}`}>
                      <GripDiagonal size={14} />
                    </button>
                    {openMenuId === t.id && (
                      <div className="habit-card-menu" role="menu">
                        <button className="habit-action" role="menuitem" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setEditingTask(t); }}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button className="habit-action" role="menuitem" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleDeleteTask(t.id); }}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!visibleTasks.length && (
                <p style={{ padding: '30px 0', textAlign: 'center', color: '#777', fontSize: '12px', margin: 0 }}>
                  {filter === 'Done' ? 'No completed tasks yet.' : 'No tasks yet. Add a task above.'}
                </p>
              )}
            </div>
          </Panel>
        </div>

        {/* RIGHT COLUMN: Notes (width kam karke) */}
        <div className="project-notes-layout" style={{ flex: '1 1 540px', minWidth: '300px', display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* 1. All notes list panel */}
          <Panel className="notes-list-panel" style={{ flex: '1 1 240px', minWidth: '220px', maxWidth: '290px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <CardHeading title="All notes" />
              <button type="button" className="button-light" style={{ padding: '4px 8px', fontSize: '11px', gap: '4px', height: '26px' }} onClick={() => setIsAddingNote(true)}>
                <Plus size={11} /> Note
              </button>
            </div>
            <div className="notes-search">
              <Search size={14} className="search-icon" />
              <input aria-label="Search notes" placeholder="Search notes…" value={noteQuery} onChange={(e) => setNoteQuery(e.target.value)} />
            </div>
            <div className="notes-list">
              {visibleNotes.map((n) => {
                const isSel = selectedNote && selectedNote.id === n.id;
                return (
                  <div key={n.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <button className={`notes-row ${isSel ? 'is-selected' : ''}`} onClick={() => setSelectedNoteId(n.id)} style={{ width: '100%', paddingRight: '40px' }}>
                      <span className="notes-row-icon">
                        <FileText size={16} />
                      </span>
                      <span className="notes-row-copy">
                        <strong>{n.title}</strong>
                        <small>{n.excerpt}</small>
                      </span>
                    </button>
                    <div className="habit-card-menu-wrap" style={{ position: 'absolute', top: 6, right: 8 }}>
                      <button type="button" className="habit-card-menu-btn" onClick={(e) => { e.stopPropagation(); setOpenNoteMenuId(openNoteMenuId === n.id ? null : n.id); }} aria-label={`Actions for ${n.title}`}>
                        <GripDiagonal size={14} />
                      </button>
                      {openNoteMenuId === n.id && (
                        <div className="habit-card-menu" role="menu">
                          <button className="habit-action" role="menuitem" onClick={(e) => { e.stopPropagation(); setOpenNoteMenuId(null); setEditingNote(n); }}>
                            <Pencil size={13} /> Edit
                          </button>
                          <button className="habit-action" role="menuitem" onClick={(e) => { e.stopPropagation(); setOpenNoteMenuId(null); handleDeleteNote(n.id); }}>
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!visibleNotes.length && (
                <div className="tasks-empty" style={{ padding: '24px 0', fontSize: '11px', textAlign: 'center', color: '#777' }}>
                  No notes found.
                </div>
              )}
            </div>
          </Panel>

          {/* 2. Note preview panel */}
          <Panel className="notes-preview-panel" style={{ flex: '1 1 240px', minWidth: '220px', alignSelf: 'flex-start' }}>
            {selectedNote ? (
              <>
                <div className="notes-preview-top" style={{ justifyContent: 'flex-end' }}>
                  <span className="notes-preview-updated">{selectedNote.updated || 'Just now'}</span>
                </div>
                <h2 className="notes-preview-title" style={{ fontSize: '22px', margin: '10px 0 8px' }}>
                  {selectedNote.title}
                </h2>
                <p className="notes-preview-body" style={{ fontSize: '11px', lineHeight: '1.6', color: '#b0aaa3' }}>
                  {selectedNote.excerpt || selectedNote.body}
                </p>
              </>
            ) : (
              <div className="tasks-empty" style={{ padding: '30px 0', fontSize: '11px', textAlign: 'center', color: '#777' }}>
                Select a note to preview it here, or add a new one.
              </div>
            )}
          </Panel>
        </div>
      </div>
      {editingTask && (
        <ProjectEditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(newTitle, newPriority) => handleEditTask(editingTask.id, newTitle, newPriority)}
        />
      )}
      {editingNote && (
        <ProjectEditNoteModal
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSave={(newTitle, newBody) => handleEditNote(editingNote.id, newTitle, newBody)}
        />
      )}
      {isAddingNote && (
        <ProjectAddNoteModal
          onClose={() => setIsAddingNote(false)}
          onSave={(newTitle, newBody) => handleAddNote(newTitle, newBody)}
        />
      )}
    </div>
  );
}
