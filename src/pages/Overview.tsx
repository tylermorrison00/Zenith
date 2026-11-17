import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock3, Headphones, Pause, Play, Plus, SquareArrowOutUpRight, Timer, X } from 'lucide-react';
import { ListChecks } from '../lib/icons';
import { CardHeading, FolderGlyph, MiniBars, PageEyebrow, Panel, ProgressBar, StatusChip, TinyPill, Toggle } from '../components/Shared';
import { QuickAddModal } from '../components/QuickAddModal';
import { startAmbientSound, stopAmbientSound } from '../lib/audio';
import { currentWeekNumber, todayLabel } from '../lib/dates';
import { useDashboard } from '../state/DashboardContext';
import { completedTasksBeforeVisibleList } from '../data/seed';

function FolderTile({ name, detail, active, target }: { name: string; detail: string; active: boolean; target: string }) {
  const navigate = useNavigate();
  return <button className={`folder-tile ${active ? 'folder-tile--active' : ''}`} onClick={() => navigate(target)}>
    <div className={`folder-art ${active ? 'folder-art--amber' : ''}`}><span /><span /><b><FolderGlyph active={active} /></b></div>
    <strong>{name}</strong><small>{detail}</small>
  </button>;
}

function MetricCard({ title, value, unit, foot, points, delta }: { title: string; value: string; unit: string; foot: string; points: number[]; delta?: string }) {
  const navigate = useNavigate();
  return <button className="overview-metric" onClick={() => navigate(title.includes('Deep') ? '/focus' : '/review')}>
    <div className="metric-label-row"><span>{title}</span><span className="metric-arrow"><ArrowUpRight size={13} /></span></div>
    <div className="metric-number">{value}<em>{unit}</em></div>
    <MiniBars values={points} />
    <div className="metric-footer"><span>{foot}</span>{delta && <TinyPill tone="amber">{delta}</TinyPill>}</div>
  </button>;
}

export function OverviewPage() {
  const navigate = useNavigate();
  const { rituals, toggleRitual, habits, toggleHabit, tasks, toggleTask, projects, timer, startTimer, notify } = useDashboard();
  const [week, setWeek] = useState(() => currentWeekNumber());
  const [folderQuery, setFolderQuery] = useState('');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [addType, setAddType] = useState<'task' | 'note' | null>(null);
  const [showTasks, setShowTasks] = useState(false);

  useEffect(() => () => stopAmbientSound(), []);

  const folders = useMemo(() => projects
    .map((project, index) => ({
      name: project.name,
      detail: project.sublabel,
      active: index === 0,
      target: project.id === 'brand-refresh' ? '/projects/brand-refresh' : project.id === 'zenith' ? '/focus' : '/projects',
    }))
    .filter((folder) => `${folder.name} ${folder.detail}`.toLowerCase().includes(folderQuery.toLowerCase())), [folderQuery, projects]);
  const openTasks = tasks.filter((task) => !task.done);
  const doneTasks = tasks.filter((task) => task.done);
  const hasData = tasks.length > 0 || projects.length > 0 || habits.length > 0 || timer.sessions > 0;
  async function toggleAudio() {
    if (audioPlaying) {
      stopAmbientSound();
      setAudioPlaying(false);
      return;
    }
    try {
      await startAmbientSound();
      setAudioPlaying(true);
    } catch {
      notify('Audio could not start in this browser');
    }
  }

  return <div className="overview-page">
    <div className="overview-top-grid">
      <aside className="overview-sidebar">
        <Panel className="library-panel">
          <CardHeading title="Library" detail="Everything you need for today’s blocks" action={<button className="icon-circle" aria-label="Add a task" onClick={() => setAddType('task')}><Plus size={15} /></button>} />
          <div className="library-search"><span>⌕</span><input aria-label="Search folders" placeholder="Search folders, notes, rituals" value={folderQuery} onChange={(event) => setFolderQuery(event.target.value)} /></div>
          <div className="subsection-head"><span>Focus folders</span><button onClick={() => navigate('/projects')}>See all</button></div>
          {folders.length > 0
            ? <div className="folder-grid">{folders.map((folder) => <FolderTile key={folder.name} {...folder} />)}</div>
            : <div className="library-no-results">{folderQuery ? 'No folder matches that search.' : 'No folders yet — create a project to see it here.'}</div>}
          <div className="sidebar-section-heading"><span>Rituals</span><span className="section-label">{rituals.length} routines</span></div>
          {rituals.length > 0
            ? <div className="ritual-list">{rituals.map((ritual, index) => <div className="ritual-row" key={ritual.id}><span className={`ritual-icon ${index === 0 ? 'ritual-icon--amber' : ''}`}>{index === 0 ? '◷' : index === 1 ? '◌' : '⌁'}</span><div className="ritual-copy"><strong>{ritual.title}</strong><small>{ritual.detail}</small></div><Toggle checked={ritual.on} onChange={() => toggleRitual(ritual.id)} label={`${ritual.title} toggle`} /></div>)}</div>
            : <div className="library-no-results">No rituals yet.</div>}
          <div id="habit-list" className="habit-list-wrap">
            <div className="sidebar-section-heading"><span>Small rhythms</span><span className="section-label">{habits.length} habits</span></div>
            {habits.length > 0
              ? <div className="habit-list">{habits.map((habit) => <button className="habit-row" key={habit.id} onClick={() => toggleHabit(habit.id)} aria-pressed={habit.done}><span className={`habit-check ${habit.done ? 'is-done' : ''}`}>{habit.done && <Check size={11} />}</span><span className="habit-copy"><strong>{habit.title}</strong><small>{habit.detail}</small></span><span className="habit-streak"><span>↗</span>{habit.streak}</span></button>)}</div>
              : <div className="library-no-results">No habits yet.</div>}
          </div>
          <button className="tasks-expand" onClick={() => setShowTasks((value) => !value)}><span><ListChecks size={14} /> Today’s tasks</span><span>{openTasks.length} open {showTasks ? '−' : '+'}</span></button>
          {showTasks && (tasks.length > 0
            ? <div className="overview-task-list">{tasks.map((task) => <button className="overview-task-row" key={task.id} onClick={() => toggleTask(task.id)}><span className={`task-check ${task.done ? 'is-done' : ''}`}>{task.done && <Check size={10} />}</span><span className={task.done ? 'task-title is-done-text' : 'task-title'}>{task.title}</span></button>)}</div>
            : <div className="library-no-results">No tasks yet — add your first one.</div>)}
        </Panel>
        <Panel className={`sound-card ${audioPlaying ? 'sound-card--playing' : ''}`}>
          <div className="sound-card-top"><span className="sound-icon"><Headphones size={15} /></span><div><strong>Soft rain, brown noise</strong><small>{audioPlaying ? 'Playing · looped ambience' : 'A quiet room for focus'}</small></div><button className="audio-toggle" aria-label={audioPlaying ? 'Pause ambient sound' : 'Play ambient sound'} onClick={toggleAudio}>{audioPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button></div>
          <div className="waveform" aria-hidden="true">{[5, 9, 13, 8, 17, 11, 20, 8, 15, 23, 12, 18, 8, 21, 12, 16, 6, 12, 18, 8, 13, 5].map((height, index) => <i key={index} style={{ height: `${height}px`, animationDelay: `${index * 35}ms` }} />)}</div>
        </Panel>
      </aside>

      <section className="overview-focus-column">
        <div className="overview-heading-row">
          <div><PageEyebrow>{todayLabel()}</PageEyebrow><h1 className="display-title display-title--italic">Today's focus</h1></div>
          <div className="week-pill"><button aria-label="Previous week" onClick={() => setWeek((value) => value - 1)}><ChevronLeft size={13} /></button><span>Week {week}</span><button aria-label="Next week" onClick={() => setWeek((value) => value + 1)}><ChevronRight size={13} /></button></div>
        </div>
        <div className="overview-metrics">
          <MetricCard title="Deep work today" value="0.0" unit="h" foot="No sessions yet" points={[]} />
          <MetricCard title="Focus score" value="0" unit="/100" foot="No sessions yet" points={[]} />
        </div>
      </section>

      <aside className="overview-insights-column">
        <Panel className="insight-card">
          <div className="insight-card-top"><span>Insight</span><button aria-label="Open insight details" className="insight-arrow" onClick={() => navigate('/review')}><ArrowUpRight size={14} /></button></div>
          <div className="insight-text">{hasData ? 'Your pattern will appear here.' : 'No insight yet.'}</div>
          <small>{hasData ? 'Based on your sessions so far' : 'Complete a few focus sessions and Zenith will spot your pattern'}</small>
        </Panel>
        <button className="next-block-card" onClick={() => { startTimer(); navigate('/focus'); }}>
          <div className="next-block-top"><span>Next block</span><span className="icon-circle"><ArrowUpRight size={14} /></span></div>
          <div className="next-block-copy">No deep block<br />scheduled yet.</div>
          <div className="next-block-meta"><span className="next-play"><Play size={12} fill="currentColor" /></span><span>Add a project to plan your first block</span></div>
        </button>
      </aside>
    </div>

      <Panel className="flow-panel">
        <div className="flow-panel-header"><CardHeading title="Today's flow" detail={hasData ? `${tasks.length} tasks · ${doneTasks.length} done` : 'No blocks planned'} /><div className="flow-header-actions"><span className="flow-legend"><i className="legend-dot legend-dot--amber" />Focus <i className="legend-dot" />Meeting <i className="legend-dot legend-dot--break" />Break</span><button className="button-outline" onClick={() => navigate('/focus')}>Open planner <ArrowRight size={12} /></button></div></div>
        {tasks.length > 0
          ? <div className="flow-chain">{tasks.slice(0, 6).map((task, index) => <div className={`flow-node flow-node--${task.done ? 'done' : index === 0 ? 'active' : 'normal'}`} key={task.id}>
            <span className="flow-node-connector"><i /></span><div className="flow-node-card"><span className="flow-node-dot" /><strong>{task.title}</strong><small>{task.due}</small>{!task.done && index === 0 && <><ProgressBar value={0} /><span className="flow-remaining">Not started</span></>}</div>
            {index < Math.min(tasks.length, 6) - 1 && <span className={`flow-connector flow-connector--${task.done ? 'done' : 'normal'}`} />}
          </div>)}</div>
          : <div className="library-no-results">Nothing on the flow yet — add a task to plan your day.</div>}
      </Panel>

      <div className="overview-stats-row">
        <button className="overview-stat" onClick={() => setShowTasks((value) => !value)}><span>Tasks done</span><strong>{completedTasksBeforeVisibleList + doneTasks.length}</strong><small>—</small><span className="overview-stat-icon"><Check size={13} /></span></button>
        <button className="overview-stat" onClick={() => navigate('/focus')}><span>Focus sessions</span><strong>{timer.sessions}</strong><small>—</small><span className="overview-stat-icon"><Timer size={13} /></span></button>
        <button className="overview-stat" onClick={() => navigate('/review')}><span>Interruptions</span><strong>0</strong><small>—</small><span className="overview-stat-icon"><X size={13} /></span></button>
        <button className="overview-stat" onClick={() => notify('No meetings scheduled')}><span>Meetings</span><strong>0h</strong><small>—</small><span className="overview-stat-icon"><Clock3 size={13} /></span></button>
      </div>

      <Panel className="projects-table-panel">
        <div className="projects-table-heading"><div><CardHeading title="Projects" detail="Sorted by who needs it most" /></div><button className="button-quiet" onClick={() => navigate('/projects')}>View all projects <SquareArrowOutUpRight size={12} /></button></div>
        <div className="table-wrap"><table className="overview-project-table"><thead><tr><th>Project</th><th>Next block</th><th>This week</th><th>Progress</th><th>Files</th><th>Due</th><th>Status</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id} className="clickable-row" onClick={() => navigate(project.id === 'brand-refresh' ? '/projects/brand-refresh' : '/projects')}>
          <td><span className="table-project"><FolderGlyph active={project.id === 'zenith'} /><span><strong>{project.name}</strong><small>{project.sublabel}</small></span></span></td>
          <td>{project.nextBlock}</td><td>{project.hours.toFixed(1)}h</td><td><span className="table-progress-cell"><ProgressBar value={project.progress} /><small>{project.progress}%</small></span></td><td>{project.files}</td><td>{project.due}</td><td><StatusChip status={project.status} /></td>
        </tr>)}</tbody></table></div>
        {!projects.length && <p className="projects-empty-filter">No projects yet — create your first project.</p>}
      </Panel>

      <QuickAddModal type={addType} onClose={() => setAddType(null)} />
    </div>;
}
