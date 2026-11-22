import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronDown, ChevronUp, Clock3, Flame, Headphones, Pause, Play, SkipBack, SkipForward, SlidersHorizontal, Target, Timer, X } from 'lucide-react';
import { ListChecks } from '../lib/icons';
import { CardHeading, FolderGlyph, Panel, TinyPill } from '../components/Shared';
import { QuickAddModal } from '../components/QuickAddModal';
import { startAmbientSound, stopAmbientSound } from '../lib/audio';
import { useDashboard } from '../state/DashboardContext';
import { completedTasksBeforeVisibleList } from '../data/seed';

const TRACKS = [
  {
    title: 'Soft rain, brown noise',
    desc: 'Deep block mix · loops until 11:00',
    eq: 'Warm Ambient',
  },
  {
    title: 'Binaural beats, 40Hz',
    desc: 'Gamma focus flow · continuous loop',
    eq: 'Clarity Boost',
  },
  {
    title: 'Lo-fi night rain',
    desc: 'Subtle keys & rainfall · deep work',
    eq: 'Balanced Chill',
  },
  {
    title: 'Forest stream, quiet wind',
    desc: 'Organic nature mix · uninterrupted',
    eq: 'Deep Bass',
  },
];

function FolderTile({
  name,
  detail,
  active,
  onClick,
  onDoubleClick,
}: {
  name: string;
  detail: string;
  active: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`folder-tile ${active ? 'folder-tile--active' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className={`folder-art ${active ? 'folder-art--amber' : ''}`}>
        <span />
        <span />
        <b>
          <FolderGlyph active={active} />
        </b>
      </div>
      <strong>{name}</strong>
      <small>{detail}</small>
    </button>
  );
}

function VolumeVisualizer({
  lastWeek,
  thisWeek,
  delta,
}: {
  lastWeek: number[];
  thisWeek: number[];
  delta: string;
}) {
  const TOTAL_SEGMENTS = 8;

  return (
    <div className="volume-visualizer" aria-hidden="true">
      <div className="volume-bars-row">
        <div className="volume-bars-group volume-bars-group--last">
          {lastWeek.map((val, colIdx) => (
            <div className="volume-column" key={`last-${colIdx}`}>
              {Array.from({ length: TOTAL_SEGMENTS }, (_, segIdx) => {
                const isFilled = segIdx < val;
                return (
                  <span
                    key={segIdx}
                    className={`volume-segment ${isFilled ? 'is-last-week' : 'is-empty'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="volume-bars-divider" />

        <div className="volume-bars-group volume-bars-group--this">
          {thisWeek.map((val, colIdx) => {
            const isToday = colIdx === thisWeek.length - 1;
            return (
              <div
                className={`volume-column ${isToday ? 'volume-column--today' : ''}`}
                key={`this-${colIdx}`}
              >
                {Array.from({ length: TOTAL_SEGMENTS }, (_, segIdx) => {
                  const isFilled = segIdx < val;
                  return (
                    <span
                      key={segIdx}
                      className={`volume-segment ${
                        isFilled
                          ? isToday
                            ? 'is-today'
                            : 'is-this-week'
                          : 'is-empty'
                      }`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="volume-footer">
        <span className="volume-footer-label">Last week</span>
        <div className="volume-footer-right">
          <span className="volume-footer-label">This week</span>
          <TinyPill tone="amber">{delta}</TinyPill>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  unit,
  lastWeek,
  thisWeek,
  delta,
}: {
  title: string;
  value: string;
  unit: string;
  lastWeek: number[];
  thisWeek: number[];
  delta: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      className="overview-metric"
      onClick={() => navigate(title.includes('Deep') ? '/focus' : '/review')}
      type="button"
    >
      <div className="metric-label-row">
        <span>{title}</span>
      </div>
      <div className="metric-number">
        {value}
        <em>{unit}</em>
      </div>
      <VolumeVisualizer lastWeek={lastWeek} thisWeek={thisWeek} delta={delta} />
    </button>
  );
}

export function OverviewPage() {
  const navigate = useNavigate();
  const { rituals, toggleRitual, habits, toggleHabit, tasks, toggleTask, projects, notes, projectFiles, timer, notify } = useDashboard();
  const [folderQuery, setFolderQuery] = useState('');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [trackSeconds, setTrackSeconds] = useState(0);
  const totalSeconds = 60 * 60;

  useEffect(() => {
    if (!audioPlaying) return;
    const interval = setInterval(() => {
      setTrackSeconds((prev) => (prev >= totalSeconds ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [audioPlaying, totalSeconds]);

  const handlePrevTrack = () => {
    setTrackIndex((prev) => (prev === 0 ? TRACKS.length - 1 : prev - 1));
    if (audioPlaying) {
      startAmbientSound().catch(() => {});
    }
  };

  const handleNextTrack = () => {
    setTrackIndex((prev) => (prev === TRACKS.length - 1 ? 0 : prev + 1));
    if (audioPlaying) {
      startAmbientSound().catch(() => {});
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    setTrackSeconds(Math.floor(pct * totalSeconds));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentTrack = TRACKS[trackIndex];
  const progressPct = Math.min(100, Math.max(0, (trackSeconds / totalSeconds) * 100));
  const currentTimeStr = formatTime(trackSeconds);
  const remainingTimeStr = `${formatTime(totalSeconds - trackSeconds)} left`;

  const [addType, setAddType] = useState<'task' | 'note' | null>(null);
  const [showTasks, setShowTasks] = useState(true);
  const [showHabits, setShowHabits] = useState(true);
  const [showRituals, setShowRituals] = useState(true);
  const [foldersExpanded, setFoldersExpanded] = useState(false);
  const lastCheckClickTimeRef = useRef<number>(0);

  useEffect(() => () => stopAmbientSound(), []);

  const [selectedFolderId, setSelectedFolderId] = useState<string>('todays-focus');

  const [projectStore, setProjectStore] = useState<{
    tasks?: Record<string, any[]>;
    notes?: Record<string, any[]>;
  }>(() => {
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
        setProjectStore(raw ? JSON.parse(raw) : { tasks: {}, notes: {} });
      } catch {}
    };
    window.addEventListener('zenith-project-store-changed', handleStoreChange);
    return () => window.removeEventListener('zenith-project-store-changed', handleStoreChange);
  }, []);

  const allFolders = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      detail: string;
      active: boolean;
      target?: string;
    }> = [];

    // Total for Today's Focus: tasks + habits + rituals + notes + projectFiles
    const todaysTotal = (tasks?.length || 0) + (habits?.length || 0) + (rituals?.length || 0) + (notes?.length || 0) + (projectFiles?.length || 0);

    list.push({
      id: 'todays-focus',
      name: "Today's Focus",
      detail: `${todaysTotal} ${todaysTotal === 1 ? 'file' : 'files'}`,
      active: selectedFolderId === 'todays-focus',
    });

    projects.forEach((project) => {
      const pName = (project.name || '').toLowerCase();
      const pId = (project.id || '').toLowerCase();

      // Tasks
      const ctxTasks = (tasks || []).filter(
        (t) => t.project && (t.project.toLowerCase() === pName || t.project.toLowerCase() === pId)
      );
      const storeTasks: any[] = (projectStore.tasks && (projectStore.tasks[pName] || projectStore.tasks[pId])) || [];
      const taskIds = new Set(ctxTasks.map((t) => t.id));
      let pTaskCount = ctxTasks.length;
      storeTasks.forEach((st) => {
        if (st.id && !taskIds.has(st.id)) {
          taskIds.add(st.id);
          pTaskCount += 1;
        }
      });

      // Notes
      const ctxNotes = (notes || []).filter(
        (n) => n.project && (n.project.toLowerCase() === pName || n.project.toLowerCase() === pId)
      );
      const storeNotes: any[] = (projectStore.notes && (projectStore.notes[pName] || projectStore.notes[pId])) || [];
      const noteIds = new Set(ctxNotes.map((n) => n.id));
      let pNoteCount = ctxNotes.length;
      storeNotes.forEach((sn) => {
        if (sn.id && !noteIds.has(sn.id)) {
          noteIds.add(sn.id);
          pNoteCount += 1;
        }
      });

      // Files / Attachments
      const pFiles = (projectFiles || []).filter(
        (f: any) => f.project && (f.project.toLowerCase() === pName || f.project.toLowerCase() === pId)
      );

      // Habits / Rituals tied to project (if any)
      const pHabits = (habits || []).filter(
        (h: any) => (h as any).project && ((h as any).project.toLowerCase() === pName || (h as any).project.toLowerCase() === pId)
      );
      const pRituals = (rituals || []).filter(
        (r: any) => (r as any).project && ((r as any).project.toLowerCase() === pName || (r as any).project.toLowerCase() === pId)
      );

      const pTotal = pTaskCount + pNoteCount + pFiles.length + pHabits.length + pRituals.length;

      list.push({
        id: project.id,
        name: project.name,
        detail: `${pTotal} ${pTotal === 1 ? 'file' : 'files'}`,
        active: selectedFolderId === project.id,
        target: `/projects/${project.id}`,
      });
    });

    return list;
  }, [projects, selectedFolderId, tasks, habits, rituals, notes, projectFiles, projectStore]);

  const filteredFolders = useMemo(() => {
    if (!folderQuery.trim()) return allFolders;
    const q = folderQuery.toLowerCase();
    return allFolders.filter((f) => f.name.toLowerCase().includes(q) || f.detail.toLowerCase().includes(q));
  }, [allFolders, folderQuery]);

  const displayedFolders = useMemo(() => {
    if (foldersExpanded) return filteredFolders;
    return filteredFolders.slice(0, 4);
  }, [filteredFolders, foldersExpanded]);

  const handleFolderClick = (folder: { id: string }) => {
    setSelectedFolderId(folder.id);
  };

  const handleFolderDoubleClick = (folder: { id: string; target?: string }) => {
    if (folder.target) {
      navigate(folder.target);
    }
  };

  const doneTasks = tasks.filter((task) => task.done);
  const hasData = tasks.length > 0 || projects.length > 0 || habits.length > 0 || timer.sessions > 0;

  const [orderKeys, setOrderKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zenith-flow-order');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [flowFilter, setFlowFilter] = useState<'all' | 'habits' | 'tasks'>('all');
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [reconnectedKey, setReconnectedKey] = useState<string | null>(null);

  const dragRef = useRef<{
    key: string;
    isDone: boolean;
    originIndex: number;
    startX: number;
    startY: number;
    cardEl: HTMLElement;
    hasMoved: boolean;
    currentHoverIndex: number;
    staticSlotCenters: number[];
  } | null>(null);

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

    if (selectedFolderId === 'todays-focus') {
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
    } else {
      // Specific project selected!
      const activeProject = projects.find((p) => p.id === selectedFolderId);
      const projName = activeProject ? activeProject.name.toLowerCase() : '';
      const projId = activeProject ? activeProject.id.toLowerCase() : '';

      const projectTasks = (tasks || []).filter(
        (t) =>
          (t.project && (t.project.toLowerCase() === projName || t.project.toLowerCase() === projId)) ||
          t.project === selectedFolderId
      );

      const storeTasks: any[] = (projectStore.tasks && (projectStore.tasks[projName] || projectStore.tasks[projId])) || [];
      const existingIds = new Set(projectTasks.map((t) => t.id));

      projectTasks.forEach((t, i) => {
        const types = ['focus', 'meeting', 'break'];
        list.push({
          id: t.id,
          kind: 'task',
          title: t.title,
          subtitle: t.project || activeProject?.name || 'Task',
          done: t.done,
          category: types[i % types.length],
          key: `task:${t.id}`,
        });
      });

      storeTasks.forEach((st, i) => {
        if (!existingIds.has(st.id)) {
          const types = ['focus', 'meeting', 'break'];
          list.push({
            id: st.id,
            kind: 'task',
            title: st.title,
            subtitle: activeProject?.name || 'Task',
            done: !!st.done,
            category: types[(projectTasks.length + i) % types.length],
            key: `task:${st.id}`,
          });
        }
      });
    }

    return list;
  }, [habits, tasks, selectedFolderId, projects, projectStore]);

  const flowItems = useMemo(() => {
    const itemMap = new Map<string, typeof rawItems[0]>();
    rawItems.forEach((i) => itemMap.set(i.key, i));

    const allKeys = orderKeys.filter((k) => itemMap.has(k));
    rawItems.forEach((i) => {
      if (!allKeys.includes(i.key)) {
        if (i.kind === 'habit') {
          const firstTaskIdx = allKeys.findIndex((k) => k.startsWith('task:'));
          if (firstTaskIdx !== -1) {
            allKeys.splice(firstTaskIdx, 0, i.key);
          } else {
            allKeys.push(i.key);
          }
        } else {
          allKeys.push(i.key);
        }
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

  const visibleFlowItems = useMemo(() => {
    if (flowFilter === 'habits') {
      return flowItems.filter((i) => i.kind === 'habit');
    }
    if (flowFilter === 'tasks') {
      return flowItems.filter((i) => i.kind === 'task');
    }
    return flowItems;
  }, [flowItems, flowFilter]);

  useEffect(() => {
    const itemMap = new Map<string, typeof rawItems[0]>();
    rawItems.forEach((i) => itemMap.set(i.key, i));

    const currentKeys = orderKeys.filter((k) => itemMap.has(k));
    let changed = currentKeys.length !== orderKeys.length;

    rawItems.forEach((i) => {
      if (!currentKeys.includes(i.key)) {
        changed = true;
        if (i.kind === 'habit') {
          const firstTaskIdx = currentKeys.findIndex((k) => k.startsWith('task:'));
          if (firstTaskIdx !== -1) {
            currentKeys.splice(firstTaskIdx, 0, i.key);
          } else {
            currentKeys.push(i.key);
          }
        } else {
          currentKeys.push(i.key);
        }
      }
    });

    if (changed || (!orderKeys.length && rawItems.length > 0)) {
      setOrderKeys(currentKeys);
      try {
        localStorage.setItem('zenith-flow-order', JSON.stringify(currentKeys));
      } catch {}
    }
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

  const applyReorder = (sourceKey: string, targetIndex: number, isDone: boolean) => {
    setOrderKeys((prev) => {
      const itemMap = new Map<string, typeof rawItems[0]>();
      rawItems.forEach((i) => itemMap.set(i.key, i));

      const allKeys = prev.filter((k) => itemMap.has(k));
      rawItems.forEach((i) => {
        if (!allKeys.includes(i.key)) {
          if (i.kind === 'habit') {
            const firstTaskIdx = allKeys.findIndex((k) => k.startsWith('task:'));
            if (firstTaskIdx !== -1) {
              allKeys.splice(firstTaskIdx, 0, i.key);
            } else {
              allKeys.push(i.key);
            }
          } else {
            allKeys.push(i.key);
          }
        }
      });

      const currentDoneKeys: string[] = [];
      const currentPendingKeys: string[] = [];
      allKeys.forEach((k) => {
        const it = itemMap.get(k);
        if (it?.done) currentDoneKeys.push(k);
        else if (it) currentPendingKeys.push(k);
      });

      if (isDone) {
        const visDoneKeys = visibleFlowItems.filter((i) => i.done).map((i) => i.key);
        const fromIdx = visDoneKeys.indexOf(sourceKey);
        if (fromIdx !== -1) {
          visDoneKeys.splice(fromIdx, 1);
          visDoneKeys.splice(Math.max(0, Math.min(targetIndex, visDoneKeys.length)), 0, sourceKey);

          let visPtr = 0;
          for (let i = 0; i < currentDoneKeys.length; i++) {
            if (visDoneKeys.includes(currentDoneKeys[i])) {
              currentDoneKeys[i] = visDoneKeys[visPtr++];
            }
          }
        }
      } else {
        const visDoneCount = visibleFlowItems.filter((i) => i.done).length;
        const visPendingKeys = visibleFlowItems.filter((i) => !i.done).map((i) => i.key);
        const targetPendingIdx = targetIndex - visDoneCount;
        const fromIdx = visPendingKeys.indexOf(sourceKey);
        if (fromIdx !== -1) {
          visPendingKeys.splice(fromIdx, 1);
          visPendingKeys.splice(Math.max(0, Math.min(targetPendingIdx, visPendingKeys.length)), 0, sourceKey);

          let visPtr = 0;
          for (let i = 0; i < currentPendingKeys.length; i++) {
            if (visPendingKeys.includes(currentPendingKeys[i])) {
              currentPendingKeys[i] = visPendingKeys[visPtr++];
            }
          }
        }
      }

      const newOrder = [...currentDoneKeys, ...currentPendingKeys];
      try {
        localStorage.setItem('zenith-flow-order', JSON.stringify(newOrder));
      } catch {}
      return newOrder;
    });
  };

  const handlePointerDown = (item: typeof rawItems[0], index: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    const cardEl = e.currentTarget;
    try {
      cardEl.setPointerCapture(e.pointerId);
    } catch {}

    const wrapEl = cardEl.closest('.flow-chain-wrap');
    const nodeEls = wrapEl ? (Array.from(wrapEl.querySelectorAll('.flow-node-step')) as HTMLElement[]) : [];
    const staticSlotCenters = nodeEls.map((el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    });

    dragRef.current = {
      key: item.key,
      isDone: item.done,
      originIndex: index,
      startX: e.clientX,
      startY: e.clientY,
      cardEl,
      hasMoved: false,
      currentHoverIndex: index,
      staticSlotCenters,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const cur = dragRef.current;
    if (!cur) return;

    const dx = e.clientX - cur.startX;
    const dy = e.clientY - cur.startY;

    if (!cur.hasMoved) {
      if (Math.hypot(dx, dy) > 4) {
        cur.hasMoved = true;
        setDraggingKey(cur.key);
        setHoverIndex(cur.originIndex);
      } else {
        return;
      }
    }

    cur.cardEl.style.setProperty('transform', `translate3d(${dx}px, ${dy}px, 0) scale(1.06)`, 'important');

    const doneCount = visibleFlowItems.filter((i) => i.done).length;
    const minIdx = cur.isDone ? 0 : doneCount;
    const maxIdx = cur.isDone ? doneCount - 1 : visibleFlowItems.length - 1;

    let bestIdx = cur.currentHoverIndex;
    let minDist = Infinity;

    for (let i = minIdx; i <= maxIdx; i++) {
      const centerX = cur.staticSlotCenters[i];
      if (centerX === undefined) continue;
      const dist = Math.abs(e.clientX - centerX);
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx !== cur.currentHoverIndex) {
      cur.currentHoverIndex = bestIdx;
      setHoverIndex(bestIdx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const cur = dragRef.current;
    if (!cur) return;

    try {
      cur.cardEl.releasePointerCapture(e.pointerId);
    } catch {}

    cur.cardEl.style.removeProperty('transform');
    cur.cardEl.style.removeProperty('transition');

    if (cur.hasMoved && cur.currentHoverIndex !== cur.originIndex) {
      applyReorder(cur.key, cur.currentHoverIndex, cur.isDone);
      setReconnectedKey(cur.key);
      setTimeout(() => setReconnectedKey(null), 500);
    }

    dragRef.current = null;
    setDraggingKey(null);
    setHoverIndex(null);
  };




  const flowDetail = useMemo(() => {
    if (!visibleFlowItems.length) {
      return '';
    }
    const doneCount = visibleFlowItems.filter((i) => i.done).length;
    if (selectedFolderId !== 'todays-focus') {
      return `${visibleFlowItems.length} tasks (${doneCount} done)`;
    }
    if (flowFilter === 'habits') {
      return `${visibleFlowItems.length} habits (${doneCount} done)`;
    }
    if (flowFilter === 'tasks') {
      return `${visibleFlowItems.length} tasks (${doneCount} done)`;
    }
    if (habits.length > 0 && tasks.length > 0) {
      return `${habits.length} habits · ${tasks.length} tasks (${doneCount} done)`;
    }
    if (habits.length > 0) {
      return `${habits.length} habits (${doneCount} done)`;
    }
    return `${tasks.length} tasks (${doneCount} done)`;
  }, [visibleFlowItems, flowFilter, habits.length, tasks.length, selectedFolderId]);

  const emptyFlowMessage = useMemo(() => {
    if (selectedFolderId !== 'todays-focus') {
      if (flowFilter === 'habits') return 'No habits in this project';
      if (flowFilter === 'tasks') return 'No tasks in this project';
      return 'No tasks and habits in this project';
    }
    if (flowFilter === 'habits') return 'No habits on the flow yet.';
    if (flowFilter === 'tasks') return 'No tasks on the flow yet.';
    return 'No tasks and habits in this project';
  }, [selectedFolderId, flowFilter]);
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
          <CardHeading title="Library" />
          <div className="library-search"><span>⌕</span><input aria-label="Search folders" placeholder="Search folders, notes..." value={folderQuery} onChange={(event) => setFolderQuery(event.target.value)} /></div>
          <div className="subsection-head">
            <span>Focus folders</span>
            <button onClick={() => setFoldersExpanded((value) => !value)}>
              {projects.length} projects {foldersExpanded ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
            </button>
          </div>
          {displayedFolders.length > 0 ? (
            <div className="folder-grid">
              {displayedFolders.map((folder) => (
                <FolderTile
                  key={folder.id}
                  name={folder.name}
                  detail={folder.detail}
                  active={folder.active}
                  onClick={() => handleFolderClick(folder)}
                  onDoubleClick={() => handleFolderDoubleClick(folder)}
                />
              ))}
            </div>
          ) : (
            <div className="library-no-results">
              {folderQuery ? 'No folder matches that search.' : 'No folders yet — create a project to see it here.'}
            </div>
          )}
          <button className="tasks-expand" onClick={() => setShowTasks((value) => !value)}>
            <span><ListChecks size={14} /> Tasks</span>
            <span>{tasks.length} tasks {showTasks ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}</span>
          </button>
          {showTasks && (tasks.length > 0
            ? <div className="overview-task-list">
                {tasks.map((task) => (
                  <button className="overview-task-row" key={task.id} onClick={() => toggleTask(task.id)} type="button">
                    <span className="overview-item-dot" />
                    <span className={task.done ? 'task-title is-done-text' : 'task-title'}>{task.title}</span>
                    <span className={`library-toggle ${task.done ? 'is-on' : ''}`} aria-hidden="true">
                      <span className="library-toggle-thumb" />
                    </span>
                  </button>
                ))}
              </div>
            : <div className="library-no-results">No tasks yet — add your first one.</div>)}

          <button className="tasks-expand" onClick={() => setShowHabits((value) => !value)}>
            <span><Target size={14} /> Habits</span>
            <span>{habits.length} habits {showHabits ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}</span>
          </button>
          {showHabits && (habits.length > 0
            ? <div className="overview-task-list">
                {habits.map((habit) => (
                  <button className="overview-task-row" key={habit.id} onClick={() => toggleHabit(habit.id)} type="button">
                    <span className="overview-item-dot" />
                    <span className={habit.done ? 'task-title is-on-text' : 'task-title'}>{habit.title}</span>
                    <span className={`library-toggle ${habit.done ? 'is-on' : ''}`} aria-hidden="true">
                      <span className="library-toggle-thumb" />
                    </span>
                  </button>
                ))}
              </div>
            : <div className="library-no-results">No habits yet — add one on Habits page.</div>)}

          <button className="tasks-expand" onClick={() => setShowRituals((value) => !value)}>
            <span><Flame size={14} /> Rituals</span>
            <span>{rituals.length} rituals {showRituals ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}</span>
          </button>
          {showRituals && (rituals.length > 0
            ? <div className="overview-task-list">
                {rituals.map((ritual) => (
                  <button className="overview-task-row" key={ritual.id} onClick={() => toggleRitual(ritual.id)} type="button">
                    <span className="overview-item-dot" />
                    <span className={ritual.on ? 'task-title is-on-text' : 'task-title'}>{ritual.title}</span>
                    <span className={`library-toggle ${ritual.on ? 'is-on' : ''}`} aria-hidden="true">
                      <span className="library-toggle-thumb" />
                    </span>
                  </button>
                ))}
              </div>
            : <div className="library-no-results">No rituals yet — add one on Rituals page.</div>)}
        </Panel>
      </aside>

      <section className="overview-focus-column">
        <div className="overview-heading-row">
          <h1 className="display-title display-title--italic">Today's focus</h1>
        </div>
        <div className="overview-metrics">
          <MetricCard
            title="Deep work today"
            value="4.2"
            unit="h"
            lastWeek={[2, 3, 4, 3, 5, 4, 3]}
            thisWeek={[5, 7, 6, 6, 7, 6, 5]}
            delta="+18%"
          />
          <MetricCard
            title="Focus score"
            value="86"
            unit="/100"
            lastWeek={[3, 3, 4, 3, 4, 3, 2]}
            thisWeek={[6, 7, 7, 8, 8, 8, 7]}
            delta="+6 pts"
          />
        </div>
      </section>

      <aside className="overview-insights-column">
        <Panel className="insight-card">
          <div className="insight-card-top"><span>Insight</span><button aria-label="Open insight details" className="insight-arrow" onClick={() => navigate('/review')}><ArrowUpRight size={14} /></button></div>
          <div className="insight-text">{hasData ? 'Your pattern will appear here.' : 'No insight yet.'}</div>
          <small>{hasData ? 'Based on your sessions so far' : 'Complete a few focus sessions and Zenith will spot your pattern'}</small>
        </Panel>
        <div className={`music-player-card ${audioPlaying ? 'is-playing' : ''}`}>
          <div className="music-player-top">
            <div className="music-player-art">
              <div className="music-player-orb" />
            </div>
            <div className="music-player-info">
              <span className="music-player-label">NOW PLAYING</span>
              <strong className="music-player-title">{currentTrack.title}</strong>
              <span className="music-player-desc">{currentTrack.desc}</span>
            </div>
          </div>

          <div className="music-player-progress-wrap">
            <div
              className="music-player-progress-bar"
              onClick={handleProgressClick}
              title="Click to seek"
            >
              <div
                className="music-player-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="music-player-times">
              <span>{currentTimeStr}</span>
              <span>{remainingTimeStr}</span>
            </div>
          </div>

          <div className="music-player-controls">
            <button
              type="button"
              className="music-btn-circle"
              title="Equalizer presets"
              aria-label="Equalizer presets"
              onClick={() => notify(`Sound profile: ${currentTrack.eq}`)}
            >
              <SlidersHorizontal size={13} strokeWidth={2} />
            </button>

            <div className="music-player-mid-controls">
              <button
                type="button"
                className="music-btn-skip"
                title="Previous sound"
                aria-label="Previous sound"
                onClick={handlePrevTrack}
              >
                <SkipBack size={15} strokeWidth={2.2} fill="currentColor" />
              </button>

              <button
                type="button"
                className="music-btn-play"
                title={audioPlaying ? 'Pause sound' : 'Play sound'}
                aria-label={audioPlaying ? 'Pause sound' : 'Play sound'}
                onClick={toggleAudio}
              >
                {audioPlaying ? (
                  <Pause size={15} strokeWidth={2.4} fill="currentColor" />
                ) : (
                  <Play size={15} strokeWidth={2.4} fill="currentColor" style={{ marginLeft: 2 }} />
                )}
              </button>

              <button
                type="button"
                className="music-btn-skip"
                title="Next sound"
                aria-label="Next sound"
                onClick={handleNextTrack}
              >
                <SkipForward size={15} strokeWidth={2.2} fill="currentColor" />
              </button>
            </div>

            <button
              type="button"
              className="music-btn-circle music-btn-headphones"
              title="Headphones mode"
              aria-label="Headphones mode"
              onClick={() => notify('Headphones mode active')}
            >
              <Headphones size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>
    </div>

      <Panel className="flow-panel">
        <div className="flow-panel-header">
          <CardHeading title="Today's flow" detail={flowDetail} />
          <div className="projects-filter-tabs flow-filter-tabs" aria-label="Flow filters">
            {(['All', 'Habits', 'Tasks'] as const).map((tab) => {
              const val = tab.toLowerCase() as 'all' | 'habits' | 'tasks';
              return (
                <button
                  key={tab}
                  type="button"
                  className={flowFilter === val ? 'is-active' : ''}
                  onClick={() => setFlowFilter(val)}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
        {visibleFlowItems.length > 0
          ? <div className="flow-chain-wrap">
              {visibleFlowItems.slice(0, 12).map((item, index) => {
                const isDone = item.done;
                const activeIdx = visibleFlowItems.findIndex((t) => !t.done);
                const isActive = !isDone && (index === activeIdx || (activeIdx === -1 && index === 0));
                const isTop = (index % 2 === 0);
                const cat = isDone ? "done" : "focus";

                const isItemDragged = draggingKey === item.key;
                const draggingOriginIndex = dragRef.current?.originIndex ?? -1;
                const isDraggingActive = Boolean(draggingKey);

                let shiftX = 0;
                let shiftY = 0;
                if (draggingKey && !isItemDragged && hoverIndex !== null && draggingOriginIndex !== -1) {
                  let deltaSlots = 0;
                  if (draggingOriginIndex < hoverIndex) {
                    if (index > draggingOriginIndex && index <= hoverIndex) {
                      deltaSlots = -1;
                    }
                  } else if (draggingOriginIndex > hoverIndex) {
                    if (index >= hoverIndex && index < draggingOriginIndex) {
                      deltaSlots = 1;
                    }
                  }

                  if (deltaSlots !== 0) {
                    const newSlot = index + deltaSlots;
                    shiftX = deltaSlots * 246;
                    const currentY = (index % 2 === 0) ? 6 : 66;
                    const targetY = (newSlot % 2 === 0) ? 6 : 66;
                    shiftY = targetY - currentY;
                  }
                }

                const isReconnecting = Boolean(reconnectedKey && (visibleFlowItems[index]?.key === reconnectedKey || visibleFlowItems[index + 1]?.key === reconnectedKey));

                return (
                  <Fragment key={item.key}>
                    <div
                      className={`flow-node-step ${isTop ? 'flow-node-step--top' : 'flow-node-step--bottom'} ${isDone ? 'flow-node-step--done' : isActive ? 'flow-node-step--active' : 'flow-node-step--normal'} ${isItemDragged ? 'is-dragged-source' : ''}`}
                      style={{
                        transform: !isItemDragged && (shiftX !== 0 || shiftY !== 0)
                          ? `translate3d(${shiftX}px, ${shiftY}px, 0)`
                          : 'translate3d(0px, 0px, 0)',
                        transition: isDraggingActive && !isItemDragged ? 'transform 0.28s cubic-bezier(0.2, 0, 0, 1)' : 'none',
                        zIndex: isItemDragged ? 100 : 1,
                      }}
                    >
                      <div
                        className={`flow-card ${isDone ? 'flow-card--done' : isActive ? 'flow-card--active' : ''} ${isItemDragged ? 'is-pointer-dragging' : ''}`}
                        onPointerDown={(e) => handlePointerDown(item, index, e)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                      >
                        {index > 0 && <span className={`flow-pin flow-pin--left ${isDraggingActive ? 'flow-pin--faded' : ''}`} />}
                        {index < Math.min(visibleFlowItems.length, 12) - 1 && <span className={`flow-pin flow-pin--right ${isDraggingActive ? 'flow-pin--faded' : ''}`} />}
                        <div className="flow-card-head">
                          <span className={`flow-type-dot flow-type-dot--${cat}`} />
                          <span className="flow-card-title">{item.title}</span>
                          {isDone ? (
                            <button
                              type="button"
                              className="flow-check-badge is-done"
                              title="Click to uncheck"
                              aria-label={`Uncheck ${item.title}`}
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
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
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
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
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
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
                    {index < Math.min(visibleFlowItems.length, 12) - 1 && (
                      <div className="flow-connector-wrap">
                        <svg className="flow-connector-svg" viewBox="0 0 46 150">
                          <path
                            d={isTop ? "M 0 45 C 23 45, 23 105, 46 105" : "M 0 105 C 23 105, 23 45, 46 45"}
                            className={`flow-curve-line ${isDone ? 'flow-curve-line--done' : isActive ? 'flow-curve-line--active' : 'flow-curve-line--future'} ${isDraggingActive ? 'flow-curve-line--faded' : ''} ${isReconnecting ? 'flow-curve-line--reconnecting' : ''}`}
                          />
                        </svg>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          : <div className="flow-empty-wrap">
              <span className="flow-empty-msg">{emptyFlowMessage}</span>
            </div>}
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
