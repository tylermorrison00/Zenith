import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock3, FileText, Headphones, ListChecks, Pause, Play, Plus, Sparkles, SquareArrowOutUpRight, Timer, X } from 'lucide-react';
import { CardHeading, FolderGlyph, MiniBars, PageEyebrow, Panel, ProgressBar, StatusChip, TinyPill, Toggle } from '../components/Shared';
import { QuickAddModal } from '../components/QuickAddModal';
import { startAmbientSound, stopAmbientSound } from '../lib/audio';
import { useDashboard } from '../state/DashboardContext';
import { completedTasksBeforeVisibleList } from '../data/seed';

const folderData = [
  { name: 'Zenith v2 spec', detail: '12 files · active', active: true, target: '/focus' },
  { name: 'Research', detail: '8 files', active: false, target: '/projects' },
  { name: 'Writing', detail: '5 drafts', active: false, target: '/projects' },
  { name: 'Admin', detail: '3 items', active: false, target: '/projects' },
];

type AddType = 'task' | 'note' | null;

function FolderTile({ name, detail, active, target }: (typeof folderData)[number]) {
  const navigate = useNavigate();
  return <button className={`folder-tile ${active ? 'folder-tile--active' : ''}`} onClick={() => navigate(target)}>
    <div className={`folder-art ${active ? 'folder-art--amber' : ''}`}><span /><span /><b><FolderGlyph active={active} /></b></div>
    <strong>{name}</strong><small>{detail}</small>
  </button>;
}

function MetricCard({ title, value, unit, foot, points }: { title: string; value: string; unit: string; foot: string; points: number[] }) {
  const navigate = useNavigate();
  return <button className="overview-metric" onClick={() => navigate(title.includes('Deep') ? '/focus' : '/review')}>
    <div className="metric-label-row"><span>{title}</span><span className="metric-arrow"><ArrowUpRight size={13} /></span></div>
    <div className="metric-number">{value}<em>{unit}</em></div>
    <MiniBars values={points} />
    <div className="metric-footer"><span>{foot}</span><TinyPill tone="amber">{title.includes('Deep') ? '+18%' : '+6 pts'}</TinyPill></div>
  </button>;
}

export function OverviewPage() {
  const navigate = useNavigate();
  const { rituals, toggleRitual, habits, toggleHabit, tasks, toggleTask, projects, startTimer, notify } = useDashboard();
  const [week, setWeek] = useState(43);
  const [folderQuery, setFolderQuery] = useState('');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [addType, setAddType] = useState<AddType>(null);
  const [showTasks, setShowTasks] = useState(false);
  const [suggested, setSuggested] = useState(false);

  useEffect(() => () => stopAmbientSound(), []);

  const folders = useMemo(() => folderData.filter((folder) => `${folder.name} ${folder.detail}`.toLowerCase().includes(folderQuery.toLowerCase())), [folderQuery]);
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
          <div className="library-search"><span>⌕</span><input aria-label="Search folders" placeholder="Search folders, notes, rituals" value={folderQuery} onChange={(event) => setFolderQuery(event.target.value)} /><kbd>⌘K</kbd></div>
          <div className="subsection-head"><span>Focus folders</span><button onClick={() => navigate('/projects')}>See all</button></div>
          <div className="folder-grid">{folders.map((folder) => <FolderTile key={folder.name} {...folder} />)}</div>
          {!folders.length && <div className="library-no-results">No folder matches that search.</div>}
          <div className="sidebar-section-heading"><span>Rituals</span><span className="section-label">3 routines</span></div>
          <div className="ritual-list">{rituals.map((ritual, index) => <div className="ritual-row" key={ritual.id}><span className={`ritual-icon ${index === 0 ? 'ritual-icon--amber' : ''}`}>{index === 0 ? '◷' : index === 1 ? '◌' : '⌁'}</span><div className="ritual-copy"><strong>{ritual.title}</strong><small>{ritual.detail}</small></div><Toggle checked={ritual.on} onChange={() => toggleRitual(ritual.id)} label={`${ritual.title} toggle`} /></div>)}</div>
          <div id="habit-list" className="habit-list-wrap">
            <div className="sidebar-section-heading"><span>Small rhythms</span><span className="section-label">6 habits</span></div>
            <div className="habit-list">{habits.map((habit) => <button className="habit-row" key={habit.id} onClick={() => toggleHabit(habit.id)} aria-pressed={habit.done}><span className={`habit-check ${habit.done ? 'is-done' : ''}`}>{habit.done && <Check size={11} />}</span><span className="habit-copy"><strong>{habit.title}</strong><small>{habit.detail}</small></span><span className="habit-streak"><span>↗</span>{habit.streak}</span></button>)}</div>
          </div>
          <button className="tasks-expand" onClick={() => setShowTasks((value) => !value)}><span><ListChecks size={14} /> Today’s tasks</span><span>{tasks.filter((task) => !task.done).length} open {showTasks ? '−' : '+'}</span></button>
          {showTasks && <div className="overview-task-list">{tasks.map((task) => <button className="overview-task-row" key={task.id} onClick={() => toggleTask(task.id)}><span className={`task-check ${task.done ? 'is-done' : ''}`}>{task.done && <Check size={10} />}</span><span className={task.done ? 'task-title is-done-text' : 'task-title'}>{task.title}</span></button>)}</div>}
        </Panel>
        <Panel className={`sound-card ${audioPlaying ? 'sound-card--playing' : ''}`}>
          <div className="sound-card-top"><span className="sound-icon"><Headphones size={15} /></span><div><strong>Soft rain, brown noise</strong><small>{audioPlaying ? 'Playing · looped ambience' : 'A quiet room for focus'}</small></div><button className="audio-toggle" aria-label={audioPlaying ? 'Pause ambient sound' : 'Play ambient sound'} onClick={toggleAudio}>{audioPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button></div>
          <div className="waveform" aria-hidden="true">{[5, 9, 13, 8, 17, 11, 20, 8, 15, 23, 12, 18, 8, 21, 12, 16, 6, 12, 18, 8, 13, 5].map((height, index) => <i key={index} style={{ height: `${height}px`, animationDelay: `${index * 35}ms` }} />)}</div>
        </Panel>
      </aside>

      <section className="overview-focus-column">
        <div className="overview-heading-row">
          <div><PageEyebrow>Monday, 20 October</PageEyebrow><h1 className="display-title display-title--italic">Today's focus</h1></div>
          <div className="week-pill"><button aria-label="Previous week" onClick={() => setWeek((value) => value - 1)}><ChevronLeft size={13} /></button><span>Week {week}</span><button aria-label="Next week" onClick={() => setWeek((value) => value + 1)}><ChevronRight size={13} /></button></div>
        </div>
        <div className="quick-add-row">
          <button className="quick-chip quick-chip--selected" onClick={() => { startTimer(); navigate('/focus'); }}><Timer size={13} /> Focus block</button>
          <button className="quick-chip" onClick={() => setAddType('task')}><ListChecks size={13} /> Task</button>
          <button className="quick-chip" onClick={() => setAddType('note')}><FileText size={13} /> Note</button>
          <button className="quick-chip" onClick={() => { notify('Break added · 15 minutes'); }}><Clock3 size={13} /> Break</button>
          <button className="quick-chip quick-chip--add" aria-label="Add a task" onClick={() => setAddType('task')}><Plus size={17} /></button>
        </div>
        <div className="overview-metrics">
          <MetricCard title="Deep work today" value="4.2" unit="h" foot="This week · last week" points={[26, 35, 31, 43, 38, 52, 46, 61, 57, 72, 63, 89]} />
          <MetricCard title="Focus score" value="86" unit="/100" foot="This week · last week" points={[23, 30, 27, 44, 38, 50, 48, 63, 57, 71, 66, 91]} />
        </div>
      </section>

      <aside className="overview-insights-column">
        <Panel className="insight-card">
          <div className="insight-card-top"><span>Insight</span><button aria-label="Open insight details" className="insight-arrow" onClick={() => navigate('/review')}><ArrowUpRight size={14} /></button></div>
          <div className="insight-text">You go 38% deeper before 11am.</div>
          <small>Based on your last 30 days</small>
        </Panel>
        <button className="next-block-card" onClick={() => { startTimer(); navigate('/focus'); }}>
          <div className="next-block-top"><span>Next block</span><span className="icon-circle"><ArrowUpRight size={14} /></span></div>
          <div className="next-block-copy">Next deep block<br />in 18 min.</div>
          <div className="next-block-meta"><span className="next-play"><Play size={12} fill="currentColor" /></span><span>Zenith v2 spec · 2 hours</span></div>
        </button>
      </aside>
    </div>

      <Panel className="flow-panel">
        <div className="flow-panel-header"><CardHeading title="Today's flow" detail="6 blocks · 1 done · 1 in progress" /><div className="flow-header-actions"><span className="flow-legend"><i className="legend-dot legend-dot--amber" />Focus <i className="legend-dot" />Meeting <i className="legend-dot legend-dot--break" />Break</span><button className="button-outline" onClick={() => navigate('/focus')}>Open planner <ArrowRight size={12} /></button></div></div>
        <div className="flow-chain">{[
          { title: 'Morning plan', time: '08:30 – 08:45', status: 'done' },
          { title: 'Deep work · Zenith v2 spec', time: '09:00 – 11:00', status: 'active' },
          { title: 'Design review', time: '11:15 – 12:00', status: 'normal' },
          { title: 'Lunch reset', time: '12:00 – 13:00', status: 'break' },
          { title: 'Research block', time: '14:00 – 15:30', status: 'normal' },
          { title: 'Shutdown review', time: '17:15 – 17:30', status: 'normal' },
        ].map((block, index) => <div className={`flow-node flow-node--${block.status}`} key={block.title}>
          <span className="flow-node-connector"><i /></span><div className="flow-node-card"><span className="flow-node-dot" /><strong>{block.title}</strong><small>{block.time}</small>{block.status === 'active' && <><ProgressBar value={58} /><span className="flow-remaining">2.5 hrs left</span></>}</div>
          {index < 5 && <span className={`flow-connector flow-connector--${block.status}`} />}
        </div>)}</div>
      </Panel>

      <div className="overview-stats-row">
        <button className="overview-stat" onClick={() => setShowTasks((value) => !value)}><span>Tasks done</span><strong>{completedTasksBeforeVisibleList + tasks.filter((task) => task.done).length}</strong><small>+2 vs yesterday</small><span className="overview-stat-icon"><Check size={13} /></span></button>
        <button className="overview-stat" onClick={() => navigate('/focus')}><span>Focus sessions</span><strong>12</strong><small>+3</small><span className="overview-stat-icon"><Timer size={13} /></span></button>
        <button className="overview-stat" onClick={() => navigate('/review')}><span>Interruptions</span><strong>3</strong><small>−5</small><span className="overview-stat-icon"><X size={13} /></span></button>
        <button className="overview-stat" onClick={() => notify('Two meetings · 15:00 and 16:30')}><span>Meetings</span><strong>2h</strong><small>−30m</small><span className="overview-stat-icon"><Clock3 size={13} /></span></button>
      </div>

      <Panel className="ask-zenith-card">
        <div className="ask-zenith-mark"><Sparkles size={16} /></div>
        <div className="ask-zenith-body"><div className="ask-zenith-eyebrow">Ask Zenith <span>· a little schedule care</span></div><div className="ask-zenith-copy">Move my 15:00 call so Research gets two full hours</div>{suggested && <div className="ask-suggestion"><span>Suggested</span> Shift the call to 16:30 and keep Research open from 14:00–16:00.</div>}</div>
        <button className="button-light ask-button" onClick={() => suggested ? (notify('Suggestion applied · Research has two clear hours'), setSuggested(false)) : setSuggested(true)}>{suggested ? 'Apply suggestion' : 'Suggest a move'} <ArrowRight size={12} /></button>
      </Panel>

      <Panel className="projects-table-panel">
        <div className="projects-table-heading"><div><CardHeading title="Projects" detail="Sorted by who needs it most" /></div><button className="button-quiet" onClick={() => navigate('/projects')}>View all projects <SquareArrowOutUpRight size={12} /></button></div>
        <div className="table-wrap"><table className="overview-project-table"><thead><tr><th>Project</th><th>Next block</th><th>This week</th><th>Progress</th><th>Files</th><th>Due</th><th>Status</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id} className="clickable-row" onClick={() => navigate(project.id === 'brand-refresh' ? '/projects/brand-refresh' : '/projects')}>
          <td><span className="table-project"><FolderGlyph active={project.id === 'zenith'} /><span><strong>{project.name}</strong><small>{project.sublabel}</small></span></span></td>
          <td>{project.nextBlock}</td><td>{project.hours.toFixed(1)}h</td><td><span className="table-progress-cell"><ProgressBar value={project.progress} /><small>{project.progress}%</small></span></td><td>{project.files}</td><td>{project.due}</td><td><StatusChip status={project.status} /></td>
        </tr>)}</tbody></table></div>
      </Panel>

      <QuickAddModal type={addType} onClose={() => setAddType(null)} />
    </div>;
}
