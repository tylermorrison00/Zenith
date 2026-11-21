import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { readStorage, writeStorage } from '../lib/storage';
import { getCurrentAccount } from '../lib/auth';
import { fetchUserDashboard, saveUserDashboard, subscribeUserDashboard } from '../lib/firestore';
import { HABIT_HISTORY_DAYS, habitHistory, ritualsSeed, seedHabits, seedNotes, seedProjectFiles, seedProjects, seedTaskLists, seedTasks, streakFromHistory, weekRulesSeed, type FocusPlanAddition, type Habit, type Note, type Project, type ProjectFile, type Task, type TaskList } from '../data/seed';

export type ToggleItem = { id: string; title: string; detail: string; on: boolean };
export type Ritual = ToggleItem;
type StoredTimer = { seconds: number; running: boolean; changedAt: number; sessions: number; progress: number };
export type DashboardState = {
  tasks: Task[];
  taskLists: TaskList[];
  notes: Note[];
  habits: Habit[];
  projects: Project[];
  rituals: ToggleItem[];
  weekRules: ToggleItem[];
  appliedWeekRules: ToggleItem[];
  focusPlanAdditions: FocusPlanAddition[];
  projectFiles: ProjectFile[];
  heldBlock: boolean;
  appliedPlan: boolean;
  timer: StoredTimer;
  lastHabitDate?: string;
};

type DashboardContextValue = DashboardState & {
  addTask: (title: string, project?: string, priority?: Task['priority']) => void;
  updateTask: (id: string, title: string, project?: string, priority?: Task['priority']) => void;
  deleteTask: (id: string) => void;
  addTaskList: (name: string) => void;
  deleteTaskList: (id: string) => void;
  addNote: (title: string, body: string) => void;
  updateNote: (id: string, title: string, body: string) => void;
  deleteNote: (id: string) => void;
  addProject: (name: string) => void;
  updateProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  addFocusPlanBlock: (block: FocusPlanAddition) => void;
  addProjectFile: (file: { name: string; size: number; type: string }) => void;
  toggleTask: (id: string) => void;
  addHabit: (title: string, detail: string) => void;
  updateHabit: (id: string, title: string, detail: string) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string) => void;
  addRitual: (title: string, detail: string) => void;
  updateRitual: (id: string, title: string, detail: string) => void;
  deleteRitual: (id: string) => void;
  toggleRitual: (id: string) => void;
  toggleWeekRule: (id: string) => void;
  toggleHeldBlock: () => void;
  applyWeekPlan: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  endTimer: () => void;
  notify: (message: string) => void;
  toast: string;
};

const stateKey = 'zenith-dashboard-v2';
const timerKey = 'zenith-focus-timer-v2';
// A fresh install starts with a clean 60-minute block, paused, with no
// sessions logged yet. (v2 keys replace the v1 keys so any demo data saved
// by an earlier build is ignored and the app truly starts empty.)
const initialTimer: StoredTimer = { seconds: 60 * 60, running: false, changedAt: Date.now(), sessions: 0, progress: 0 };
const initialState: DashboardState = {
  tasks: seedTasks,
  taskLists: seedTaskLists,
  notes: seedNotes,
  habits: seedHabits,
  projects: seedProjects,
  rituals: ritualsSeed,
  weekRules: weekRulesSeed,
  appliedWeekRules: [],
  focusPlanAdditions: [],
  projectFiles: seedProjectFiles,
  heldBlock: false,
  appliedPlan: false,
  timer: initialTimer,
};

/** Every habit carries a 28-day check history (oldest first, last entry is
 *  today). Habits saved without one get a history derived from their streak,
 *  so the card grid, the daily tick and the streak always agree. */
function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rollHabit(habit: Habit, days: number): Habit {
  if (days <= 0) return normalizeHabit(habit);
  const old = Array.isArray(habit.history) && habit.history.length === HABIT_HISTORY_DAYS
    ? habit.history.map(Boolean)
    : habitHistory(habit.streak, habit.done);
  const next = days >= HABIT_HISTORY_DAYS ? Array(HABIT_HISTORY_DAYS).fill(false) : [...old.slice(days), ...Array(days).fill(false)];
  return { ...habit, history: next, streak: streakFromHistory(next), done: false };
}

function calcDaysPassed(lastDate: string | undefined, todayDate: string): number {
  if (!lastDate) {
    return 0;
  }
  const [y1, m1, d1] = lastDate.split('-').map(Number);
  const [y2, m2, d2] = todayDate.split('-').map(Number);
  if (y1 === y2 && m1 === m2 && d1 === d2) return 0;
  return Math.max(0, Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 864e5));
}

function normalizeHabit(habit: Habit): Habit {
  const history = Array.isArray(habit.history) && habit.history.length === HABIT_HISTORY_DAYS
    ? habit.history.map(Boolean)
    : habitHistory(habit.streak, habit.done);
  return { ...habit, history, streak: streakFromHistory(history), done: Boolean(history[history.length - 1]) };
}

function loadInitialState(): DashboardState {
  const saved = readStorage<Partial<DashboardState>>(stateKey, {});
  const storedTimer = readStorage<StoredTimer | null>(timerKey, null);
  let timer = storedTimer ? { ...initialTimer, ...storedTimer, progress: storedTimer.progress ?? (storedTimer.seconds >= 60 * 60 ? 0 : 54) } : initialTimer;
  if (timer.running) {
    const elapsed = Math.max(0, Math.floor((Date.now() - timer.changedAt) / 1000));
    timer = { ...timer, seconds: Math.max(0, timer.seconds - elapsed), progress: Math.min(100, timer.progress + elapsed / 36), changedAt: Date.now(), running: timer.seconds - elapsed > 0 };
  }
  const today = getTodayDateString();
  const days = calcDaysPassed(saved.lastHabitDate, today);
  const loadedHabits = (saved.habits ?? seedHabits).map((h) => rollHabit(h, days));

  return {
    ...initialState,
    ...saved,
    lastHabitDate: today,
    tasks: saved.tasks ?? seedTasks,
    taskLists: saved.taskLists ?? seedTaskLists,
    notes: saved.notes ?? seedNotes,
    habits: loadedHabits,
    projects: saved.projects ?? seedProjects,
    rituals: saved.rituals && saved.rituals.length > 0 ? saved.rituals : ritualsSeed,
    weekRules: saved.weekRules ?? weekRulesSeed,
    appliedWeekRules: saved.appliedWeekRules ?? [],
    focusPlanAdditions: saved.focusPlanAdditions ?? [],
    projectFiles: saved.projectFiles ?? seedProjectFiles,
    timer,
  };
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>(loadInitialState);
  const [toast, setToast] = useState('');
  const [userUid, setUserUid] = useState<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const isCloudLoadedRef = useRef<boolean>(false);
  const lastLocalEditRef = useRef<number>(0);

  // Sync with Firestore Cloud when signed in
  useEffect(() => {
    let unsubscribeSnap: (() => void) | null = null;
    let cancelled = false;

    async function initCloudSync() {
      const account = await getCurrentAccount();
      if (cancelled || !account || account.provider !== 'firebase') return;
      const uid = account.id;
      setUserUid(uid);

      // 1. Fetch cloud data for this user
      const cloudData = await fetchUserDashboard(uid);
      if (cancelled) return;

      if (cloudData && (cloudData.tasks?.length || cloudData.habits?.length || cloudData.notes?.length)) {
        // Cloud has existing data -> apply to local state
        setState((current) => ({
          ...current,
          ...cloudData,
          lastHabitDate: cloudData.lastHabitDate ?? current.lastHabitDate,
          tasks: cloudData.tasks ?? current.tasks,
          taskLists: cloudData.taskLists ?? current.taskLists,
          notes: cloudData.notes ?? current.notes,
          habits: cloudData.habits ?? current.habits,
          projects: cloudData.projects ?? current.projects,
          rituals: cloudData.rituals ?? current.rituals,
        }));
        writeStorage(stateKey, {
          ...cloudData,
          tasks: cloudData.tasks,
          taskLists: cloudData.taskLists,
          notes: cloudData.notes,
          habits: cloudData.habits,
          projects: cloudData.projects,
        });
      } else {
        // Cloud is empty for this user! Backup current local state into Firestore
        const local = readStorage<Partial<DashboardState>>(stateKey, {});
        if (local && (local.tasks?.length || local.habits?.length || local.notes?.length)) {
          void saveUserDashboard(uid, local);
        }
      }

      isCloudLoadedRef.current = true;

      // 2. Subscribe to real-time changes
      const unsub = subscribeUserDashboard(uid, (remote) => {
        if (cancelled) return;
        if (Date.now() - lastLocalEditRef.current < 2500) return;
        setState((current) => ({
          ...current,
          ...remote,
          lastHabitDate: remote.lastHabitDate ?? current.lastHabitDate,
          tasks: remote.tasks ?? current.tasks,
          taskLists: remote.taskLists ?? current.taskLists,
          notes: remote.notes ?? current.notes,
          habits: remote.habits ?? current.habits,
          projects: remote.projects ?? current.projects,
          rituals: remote.rituals ?? current.rituals,
        }));
      });
      if (unsub) unsubscribeSnap = unsub;
    }

    void initCloudSync();

    return () => {
      cancelled = true;
      if (unsubscribeSnap) unsubscribeSnap();
    };
  }, []);

  // Save to localStorage immediately, and debounced to Firestore Cloud only after cloud state loaded
  useEffect(() => {
    writeStorage(stateKey, { ...state, timer: undefined });
    writeStorage(timerKey, state.timer);

    if (userUid && isCloudLoadedRef.current) {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => {
        void saveUserDashboard(userUid, state);
      }, 300);
    }
  }, [state, userUid]);

  useEffect(() => {
    function checkDayRollover() {
      const today = getTodayDateString();
      setState((current) => {
        if (current.lastHabitDate === today) return current;
        const days = calcDaysPassed(current.lastHabitDate, today);
        return {
          ...current,
          lastHabitDate: today,
          habits: current.habits.map((h) => rollHabit(h, days)),
        };
      });
    }
    const interval = window.setInterval(checkDayRollover, 30000);
    window.addEventListener('focus', checkDayRollover);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkDayRollover);
    };
  }, []);

  useEffect(() => {
    if (!state.timer.running) return undefined;
    const interval = window.setInterval(() => {
      setState((current) => {
        if (!current.timer.running) return current;
        const seconds = Math.max(0, current.timer.seconds - 1);
        return { ...current, timer: { ...current.timer, seconds, progress: Math.min(100, current.timer.progress + 1 / 36), running: seconds > 0, changedAt: Date.now() } };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.timer.running]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const notify = useCallback((message: string) => setToast(message), []);
  const markLocalEdit = useCallback(() => {
    lastLocalEditRef.current = Date.now();
  }, []);
  const addTask = useCallback((title: string, project = 'General', priority: Task['priority'] = 'normal') => {
    markLocalEdit();
    const task: Task = { id: `task-${Date.now()}`, title, project, due: 'Today · just added', done: false, priority };
    setState((current) => ({ ...current, tasks: [task, ...current.tasks] }));
    setToast('Task added to your day');
  }, [markLocalEdit]);
  const updateTask = useCallback((id: string, title: string, project?: string, priority?: Task['priority']) => {
    markLocalEdit();
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              title: title.trim() || task.title,
              project: project ?? task.project,
              priority: priority ?? task.priority,
            }
          : task
      ),
    }));
    setToast('Task updated');
  }, [markLocalEdit]);
  const deleteTask = useCallback((id: string) => {
    markLocalEdit();
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    }));
    setToast('Task deleted');
  }, [markLocalEdit]);
  const addTaskList = useCallback((name: string) => {
    markLocalEdit();
    const list: TaskList = { id: `list-${Date.now()}`, name };
    setState((current) => current.taskLists.some((item) => item.name.toLowerCase() === name.toLowerCase())
      ? current
      : { ...current, taskLists: [...current.taskLists, list] });
    setToast(`"${name}" list created`);
  }, [markLocalEdit]);
  const deleteTaskList = useCallback((id: string) => {
    markLocalEdit();
    setState((current) => ({ ...current, taskLists: current.taskLists.filter((item) => item.id !== id) }));
    setToast('List removed · its tasks stay in All tasks');
  }, [markLocalEdit]);
  const addNote = useCallback((title: string, body: string) => {
    markLocalEdit();
    const note: Note = { id: `note-${Date.now()}`, title, excerpt: body || 'A new note for this block.', project: 'General', updated: 'Just now' };
    setState((current) => ({ ...current, notes: [note, ...current.notes] }));
    setToast('Note saved to your library');
  }, [markLocalEdit]);
  const updateNote = useCallback((id: string, title: string, body: string) => {
    markLocalEdit();
    setState((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === id
          ? {
              ...note,
              title: title.trim() || note.title,
              excerpt: body.trim() || note.excerpt,
              updated: 'Just now',
            }
          : note
      ),
    }));
    setToast('Note updated');
  }, [markLocalEdit]);
  const deleteNote = useCallback((id: string) => {
    markLocalEdit();
    setState((current) => ({
      ...current,
      notes: current.notes.filter((note) => note.id !== id),
    }));
    setToast('Note deleted');
  }, [markLocalEdit]);
  const addProject = useCallback((name: string) => {
    markLocalEdit();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `project-${Date.now()}`;
    const project: Project = { id: `${slug}-${Date.now()}`, name, sublabel: '0 files', nextBlock: 'Plan a first block', hours: 0, progress: 0, files: '0 of 0 files', due: 'Not set', status: 'Needs time' };
    setState((current) => ({ ...current, projects: [project, ...current.projects] }));
    setToast(`${name} added to projects`);
  }, [markLocalEdit]);
  const updateProject = useCallback((id: string, name: string) => {
    markLocalEdit();
    setState((current) => ({
      ...current,
      projects: current.projects.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
    setToast('Project updated');
  }, [markLocalEdit]);
  const deleteProject = useCallback((id: string) => {
    markLocalEdit();
    setState((current) => ({
      ...current,
      projects: current.projects.filter((p) => p.id !== id),
    }));
    setToast('Project deleted');
  }, [markLocalEdit]);
  const addFocusPlanBlock = useCallback((block: FocusPlanAddition) => {
    markLocalEdit();
    setState((current) => current.focusPlanAdditions.some((item) => item.id === block.id)
      ? current
      : { ...current, focusPlanAdditions: [...current.focusPlanAdditions, block] });
  }, [markLocalEdit]);
  const addProjectFile = useCallback((file: { name: string; size: number; type: string }) => {
    markLocalEdit();
    const extension = file.name.split('.').pop()?.toUpperCase();
    const type = extension && extension !== file.name.toUpperCase() ? extension : file.type.split('/').pop()?.toUpperCase() || 'FILE';
    const size = file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    const entry: ProjectFile = { name: file.name, detail: `Added just now · ${size}`, type };
    setState((current) => current.projectFiles.some((item) => item.name === entry.name)
      ? current
      : { ...current, projectFiles: [entry, ...current.projectFiles] });
    setToast(`${file.name} added to your files`);
  }, [markLocalEdit]);
  const toggleTask = useCallback((id: string) => {
    markLocalEdit();
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) }));
  }, [markLocalEdit]);
  const toggleHabit = useCallback((id: string) => {
    markLocalEdit();
    const today = getTodayDateString();
    setState((current) => ({
      ...current,
      lastHabitDate: today,
      habits: current.habits.map((habit) => {
        if (habit.id !== id) return habit;
        const history = Array.isArray(habit.history) && habit.history.length === HABIT_HISTORY_DAYS
          ? habit.history.slice()
          : habitHistory(habit.streak, habit.done);
        history[history.length - 1] = !history[history.length - 1];
        const done = Boolean(history[history.length - 1]);
        return { ...habit, history, done, streak: streakFromHistory(history) };
      }),
    }));
  }, [markLocalEdit]);
  const addHabit = useCallback((title: string, detail: string) => {
    markLocalEdit();
    const habit: Habit = { id: `habit-${Date.now()}`, title, detail: detail || 'Every day', streak: 0, done: false, history: habitHistory(0, false) };
    setState((current) => ({ ...current, habits: [habit, ...current.habits] }));
    setToast('Habit card added');
  }, [markLocalEdit]);
  const updateHabit = useCallback((id: string, title: string, detail: string) => {
    markLocalEdit();
    setState((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, title, detail: detail || habit.detail } : habit) }));
    setToast('Habit updated');
  }, [markLocalEdit]);
  const deleteHabit = useCallback((id: string) => {
    markLocalEdit();
    setState((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== id) }));
    setToast('Habit removed');
  }, [markLocalEdit]);
  const toggleRitual = useCallback((id: string) => {
    markLocalEdit();
    setState((current) => ({ ...current, rituals: current.rituals.map((item) => item.id === id ? { ...item, on: !item.on } : item) }));
  }, [markLocalEdit]);
  const addRitual = useCallback((title: string, detail: string) => {
    markLocalEdit();
    const item: ToggleItem = {
      id: `ritual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      detail: detail.trim(),
      on: false,
    };
    setState((current) => ({ ...current, rituals: [item, ...current.rituals] }));
    setToast('Ritual created');
  }, [markLocalEdit]);
  const updateRitual = useCallback((id: string, title: string, detail: string) => {
    markLocalEdit();
    setState((current) => ({
      ...current,
      rituals: current.rituals.map((item) => item.id === id ? { ...item, title: title.trim(), detail: detail.trim() } : item),
    }));
    setToast('Ritual updated');
  }, [markLocalEdit]);
  const deleteRitual = useCallback((id: string) => {
    markLocalEdit();
    setState((current) => ({
      ...current,
      rituals: current.rituals.filter((item) => item.id !== id),
    }));
    setToast('Ritual removed');
  }, [markLocalEdit]);
  const toggleWeekRule = useCallback((id: string) => {
    markLocalEdit();
    setState((current) => ({ ...current, weekRules: current.weekRules.map((item) => item.id === id ? { ...item, on: !item.on } : item), appliedPlan: false }));
  }, [markLocalEdit]);
  const toggleHeldBlock = useCallback(() => {
    markLocalEdit();
    setState((current) => ({ ...current, heldBlock: !current.heldBlock }));
  }, [markLocalEdit]);
  const applyWeekPlan = useCallback(() => {
    markLocalEdit();
    setState((current) => ({ ...current, appliedPlan: true, appliedWeekRules: current.weekRules.map((rule) => ({ ...rule })) }));
    setToast('Next week’s focus plan is updated');
  }, [markLocalEdit]);
  const startTimer = useCallback(() => {
    setState((current) => ({ ...current, timer: { ...current.timer, seconds: current.timer.seconds || 60 * 60, progress: current.timer.seconds ? current.timer.progress : 0, running: true, changedAt: Date.now() } }));
  }, []);
  const pauseTimer = useCallback(() => {
    setState((current) => ({ ...current, timer: { ...current.timer, running: false, changedAt: Date.now() } }));
  }, []);
  const resetTimer = useCallback(() => {
    setState((current) => ({ ...current, timer: { ...current.timer, seconds: 60 * 60, progress: 0, running: false, changedAt: Date.now() } }));
    setToast('Timer reset · ready for a fresh 60-minute block');
  }, []);
  const endTimer = useCallback(() => {
    setState((current) => ({ ...current, timer: { ...current.timer, seconds: 0, progress: 100, running: false, changedAt: Date.now(), sessions: current.timer.sessions + 1 } }));
    setToast('Session ended · your focus is logged');
  }, []);

  const value = useMemo<DashboardContextValue>(() => ({
    ...state, addTask, updateTask, deleteTask, addTaskList, deleteTaskList, addNote, updateNote, deleteNote, addProject, updateProject, deleteProject, addFocusPlanBlock, addProjectFile, toggleTask, addHabit, updateHabit, deleteHabit, toggleHabit, addRitual, updateRitual, deleteRitual, toggleRitual, toggleWeekRule,
    toggleHeldBlock, applyWeekPlan, startTimer, pauseTimer, resetTimer, endTimer, notify, toast,
  }), [state, addTask, updateTask, deleteTask, addTaskList, deleteTaskList, addNote, updateNote, deleteNote, addProject, updateProject, deleteProject, addFocusPlanBlock, addProjectFile, toggleTask, addHabit, updateHabit, deleteHabit, toggleHabit, addRitual, updateRitual, deleteRitual, toggleRitual, toggleWeekRule, toggleHeldBlock, applyWeekPlan, startTimer, pauseTimer, resetTimer, endTimer, notify, toast]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used inside DashboardProvider');
  return context;
}
