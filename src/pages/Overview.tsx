import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock3, Headphones, Pause, Play, Plus, Timer, X } from 'lucide-react';
import { ListChecks } from '../lib/icons';
import { CardHeading, FolderGlyph, MiniBars, PageEyebrow, Panel, TinyPill, Toggle } from '../components/Shared';
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
  const lastCheckClickTimeRef = useRef<number>(0);

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
  const doneHabits = habits.filter((h) => h.done);
  const hasData = tasks.length > 0 || projects.length > 0 || habits.length > 0 || timer.sessions > 0;

  const [orderKeys, setOrderKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zenith-flow-order');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const rawItems = useMemo(() => {
    const list: Array<{
      id: string;
      kind: 'habit' | 'task';
      title: string;
      subtitle: string;
      done: boolean;
      streak?: number;
      category: string;
      key: string;
    }> = [];

    // 1. Sab se pehle habits
    (habits || []).forEach((h) => {
      list.push({
        id: h.id,
        kind: 'habit',
        title: h.title,
        subtitle: h.streak > 0 ? `${h.streak} day streak` : 'Daily habit',
        done: h.done,
        streak: h.streak,
        category: 'focus',
        key: `habit:${h.id}`,
      });
    });

    // 2. Uske baad tasks
    (tasks || []).forEach((t, i) => {
      const types = ['focus', 'meeting', 'break'];
      list.push({
        id: t.id,
        kind: 'task',
        title: t.title,
        subtitle: t.project || 'Task',
        done: t.done,
        category: types[i % types.length],
        key: `task:${t.id}`,
      });
    });

    return list;
  }, [habits, tasks]);

  const flowItems = useMemo(() => {
    const itemMap = new Map<string, typeof rawItems[0]>();
    rawItems.forEach((i) => itemMap.set(i.key, i));

    const allKeys = orderKeys.filter((k) => itemMap.has(k));
    rawItems.forEach((i) => {
      if (!allKeys.includes(i.key)) {
        allKeys.push(i.key);
      }
    });

    const doneItems: typeof rawItems[0][] = [];
    const pendingItems: typeof rawItems[0][] = [];

    allKeys.forEach((k) => {
      const item = itemMap.get(k);
      if (!item) return;
      if (item.done) {
        doneItems.push(item);
      } else {
        pendingItems.push(item);
      }
    });

    return [...doneItems, ...pendingItems];
  }, [rawItems, orderKeys]);

  const handleCompleteItem = (item: { id: string; kind: 'habit' | 'task'; key: string }) => {
    if (item.kind === 'habit') toggleHabit(item.id);
    else toggleTask(item.id);

    setOrderKeys((prev) => {
      const currentKeys = prev.length ? prev.filter((k) => rawItems.some((r) => r.key === k)) : rawItems.map((i) => i.key);
      const withoutItem = currentKeys.filter((k) => k !== item.key);
      const doneKeys = withoutItem.filter((k) => {
        const it = rawItems.find((r) => r.key === k);
        return it && it.done;
      });
      withoutItem.splice(doneKeys.length, 0, item.key);
      try { localStorage.setItem('zenith-flow-order', JSON.stringify(withoutItem)); } catch {}
      return withoutItem;
    });
  };

  const handleUncheckItem = (item: { id: string; kind: 'habit' | 'task'; key: string }) => {
    if (item.kind === 'habit') toggleHabit(item.id);
    else toggleTask(item.id);

    setOrderKeys((prev) => {
      const currentKeys = prev.length ? prev.filter((k) => rawItems.some((r) => r.key === k)) : rawItems.map((i) => i.key);
      const withoutItem = currentKeys.filter((k) => k !== item.key);
      const doneKeys = withoutItem.filter((k) => {
        const it = rawItems.find((r) => r.key === k);
        return it && it.done;
      });
      const insertIdx = Math.min(withoutItem.length, doneKeys.length + 1);
      withoutItem.splice(insertIdx, 0, item.key);
      try { localStorage.setItem('zenith-flow-order', JSON.stringify(withoutItem)); } catch {}
      return withoutItem;
    });
  };

  const flowDetail = useMemo(() => {
    if (!flowItems.length) return 'No blocks planned';
    const doneCount = flowItems.filter((i) => i.done).length;
    if (habits.length > 0 && tasks.length > 0) {
      return `${habits.length} habits · ${tasks.length} tasks (${doneCount} done)`;
    }
    if (habits.length > 0) {
      return `${habits.length} habits · ${doneHabits.length} done`;
    }
    return `${tasks.length} tasks · ${doneTasks.length} done`;
  }, [flowItems, habits.length, tasks.length, doneHabits.length, doneTasks.length]);
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
        <div className="flow-panel-header"><CardHeading title="Today's flow" detail={flowDetail} /></div>
        {flowItems.length > 0
          ? <div className="flow-chain-wrap">{flowItems.slice(0, 12).map((item, index) => {
            const isDone = item.done;
            const activeIdx = flowItems.findIndex((t) => !t.done);
            const isActive = !isDone && (index === activeIdx || (activeIdx === -1 && index === 0));
            const isTop = (index % 2 === 0);
            const cat = isDone ? "done" : "focus";
            return (
              <Fragment key={item.id}>
                <div className={`flow-node-step ${isTop ? 'flow-node-step--top' : 'flow-node-step--bottom'} ${isDone ? 'flow-node-step--done' : isActive ? 'flow-node-step--active' : 'flow-node-step--normal'}`}>
                  <div
                    className={`flow-card ${isDone ? 'flow-card--done' : isActive ? 'flow-card--active' : ''}`}
                    onClick={() => {
                      if (item.kind === 'task') {
                        navigate('/focus');
                      }
                    }}
                  >
                    {index > 0 && <span className="flow-pin flow-pin--left" />}
                    {index < Math.min(flowItems.length, 12) - 1 && <span className="flow-pin flow-pin--right" />}
                    <div className="flow-card-head">
                      <span className={`flow-type-dot flow-type-dot--${cat}`} />
                      <span className="flow-card-title">{item.title}</span>
                      {isDone ? (
                        <button
                          type="button"
                          className="flow-check-badge is-done"
                          title="Click to uncheck"
                          aria-label={`Uncheck ${item.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const now = Date.now();
                            if (now - lastCheckClickTimeRef.current < 600) return;
                            lastCheckClickTimeRef.current = now;
                            handleUncheckItem(item);
                          }}
                        >
                          <Check size={11} strokeWidth={2.8} />
                        </button>
                      ) : isActive ? (
                        <button
                          type="button"
                          className="flow-active-checkbox"
                          aria-label={`Complete ${item.title}`}
                          title="Click to complete"
                          onClick={(e) => {
                            e.stopPropagation();
                            const now = Date.now();
                            if (now - lastCheckClickTimeRef.current < 600) return;
                            lastCheckClickTimeRef.current = now;
                            handleCompleteItem(item);
                          }}
                        >
                          <Check size={11} strokeWidth={2.5} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flow-next-corner-target"
                          aria-label={`Complete ${item.title}`}
                          title="Click corner to complete"
                          onClick={(e) => {
                            e.stopPropagation();
                            const now = Date.now();
                            if (now - lastCheckClickTimeRef.current < 600) return;
                            lastCheckClickTimeRef.current = now;
                            handleCompleteItem(item);
                          }}
                        />
                      )}
                    </div>
                    {isActive && (
                      <div className="flow-card-footer">
                        <span className="flow-time-left">{item.kind === 'habit' ? 'Habit in progress' : 'Task in progress'}</span>
                      </div>
                    )}
                  </div>
                </div>
                {index < Math.min(flowItems.length, 12) - 1 && (
                  <div className="flow-connector-wrap">
                    <svg className="flow-connector-svg" viewBox="0 0 46 150">
                      <path
                        d={isTop ? "M 0 45 C 23 45, 23 105, 46 105" : "M 0 105 C 23 105, 23 45, 46 45"}
                        className={`flow-curve-line ${isDone ? 'flow-curve-line--done' : isActive ? 'flow-curve-line--active' : 'flow-curve-line--future'}`}
                      />
                    </svg>
                  </div>
                )}
              </Fragment>
            );
          })}</div>
          : <div className="library-no-results">Nothing on the flow yet — add a habit or task to plan your day.</div>}
      </Panel>

      <div className="overview-stats-row">
        <button className="overview-stat" onClick={() => setShowTasks((value) => !value)}><span>Tasks done</span><strong>{completedTasksBeforeVisibleList + doneTasks.length}</strong><small>—</small><span className="overview-stat-icon"><Check size={13} /></span></button>
        <button className="overview-stat" onClick={() => navigate('/focus')}><span>Focus sessions</span><strong>{timer.sessions}</strong><small>—</small><span className="overview-stat-icon"><Timer size={13} /></span></button>
        <button className="overview-stat" onClick={() => navigate('/review')}><span>Interruptions</span><strong>0</strong><small>—</small><span className="overview-stat-icon"><X size={13} /></span></button>
        <button className="overview-stat" onClick={() => notify('No meetings scheduled')}><span>Meetings</span><strong>0h</strong><small>—</small><span className="overview-stat-icon"><Clock3 size={13} /></span></button>
      </div>

      

      <QuickAddModal type={addType} onClose={() => setAddType(null)} />
    </div>;
}
