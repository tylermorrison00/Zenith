import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readStorage, writeStorage } from '../lib/storage';
import { HABIT_HISTORY_DAYS, habitHistory, ritualsSeed, seedHabits, seedNotes, seedProjectFiles, seedProjects, seedTaskLists, seedTasks, streakFromHistory, weekRulesSeed, type FocusPlanAddition, type Habit, type Note, type Project, type ProjectFile, type Task, type TaskList } from '../data/seed';

type ToggleItem = { id: string; title: string; detail: string; on: boolean };
type StoredTimer = { seconds: number; running: boolean; changedAt: number; sessions: number; progress: number };
type DashboardState = {
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

function calcDaysPassed(lastDate: string | undefined, todayDate: string, habits?: Habit[]): number {
  if (!lastDate) {
    return (habits || []).some((h) => h.done) ? 1 : 0;
  }
  const [y1, m1, d1] = lastDate.split('-').map(Number);
  const [y2, m2, d2] = todayDate.split('-').map(Number);
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
  const days = calcDaysPassed(saved.lastHabitDate, today, saved.habits);
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
    rituals: saved.rituals ?? ritualsSeed,
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

  useEffect(() => {
    writeStorage(stateKey, { ...state, timer: undefined });
    writeStorage(timerKey, state.timer);
  }, [state]);

  useEffect(() => {
    function checkDayRollover() {
      const today = getTodayDateString();
      setState((current) => {
        if (current.lastHabitDate === today) return current;
        const days = calcDaysPassed(current.lastHabitDate, today, current.habits);
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
  const addTask = useCallback((title: string, project = 'General', priority: Task['priority'] = 'normal') => {
    const task: Task = { id: `task-${Date.now()}`, title, project, due: 'Today · just added', done: false, priority };
    setState((current) => ({ ...current, tasks: [task, ...current.tasks] }));
    setToast('Task added to your day');
  }, []);
  const updateTask = useCallback((id: string, title: string, project?: string, priority?: Task['priority']) => {
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
  }, []);
  const deleteTask = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    }));
    setToast('Task deleted');
  }, []);
  const addTaskList = useCallback((name: string) => {
    const list: TaskList = { id: `list-${Date.now()}`, name };
    setState((current) => current.taskLists.some((item) => item.name.toLowerCase() === name.toLowerCase())
      ? current
      : { ...current, taskLists: [...current.taskLists, list] });
    setToast(`"${name}" list created`);
  }, []);
  const deleteTaskList = useCallback((id: string) => {
    setState((current) => ({ ...current, taskLists: current.taskLists.filter((item) => item.id !== id) }));
    setToast('List removed · its tasks stay in All tasks');
  }, []);
  const addNote = useCallback((title: string, body: string) => {
    const note: Note = { id: `note-${Date.now()}`, title, excerpt: body || 'A new note for this block.', project: 'General', updated: 'Just now' };
    setState((current) => ({ ...current, notes: [note, ...current.notes] }));
    setToast('Note saved to your library');
  }, []);
  const updateNote = useCallback((id: string, title: string, body: string) => {
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
  }, []);
  const deleteNote = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      notes: current.notes.filter((note) => note.id !== id),
    }));
    setToast('Note deleted');
  }, []);
  const addProject = useCallback((name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `project-${Date.now()}`;
    const project: Project = { id: `${slug}-${Date.now()}`, name, sublabel: '0 files', nextBlock: 'Plan a first block', hours: 0, progress: 0, files: '0 of 0 files', due: 'Not set', status: 'Needs time' };
    setState((current) => ({ ...current, projects: [project, ...current.projects] }));
    setToast(`${name} added to projects`);
  }, []);
  const updateProject = useCallback((id: string, name: string) => {
    setState((current) => ({
      ...current,
      projects: current.projects.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
    setToast('Project updated');
  }, []);
  const deleteProject = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      projects: current.projects.filter((p) => p.id !== id),
    }));
    setToast('Project deleted');
  }, []);
  const addFocusPlanBlock = useCallback((block: FocusPlanAddition) => {
    setState((current) => current.focusPlanAdditions.some((item) => item.id === block.id)
      ? current
      : { ...current, focusPlanAdditions: [...current.focusPlanAdditions, block] });
  }, []);
  const addProjectFile = useCallback((file: { name: string; size: number; type: string }) => {
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
  }, []);
  const toggleTask = useCallback((id: string) => {
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) }));
  }, []);
  const toggleHabit = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      lastHabitDate: getTodayDateString(),
      habits: current.habits.map((habit) => {
        if (habit.id !== id) return habit;
        const history = habit.history.slice();
        history[history.length - 1] = !history[history.length - 1];
        return { ...habit, history, done: Boolean(history[history.length - 1]), streak: streakFromHistory(history) };
      }),
    }));
  }, []);
  const addHabit = useCallback((title: string, detail: string) => {
    const habit: Habit = { id: `habit-${Date.now()}`, title, detail: detail || 'Every day', streak: 0, done: false, history: habitHistory(0, false) };
    setState((current) => ({ ...current, habits: [habit, ...current.habits] }));
    setToast('Habit card added');
  }, []);
  const updateHabit = useCallback((id: string, title: string, detail: string) => {
    setState((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, title, detail: detail || habit.detail } : habit) }));
    setToast('Habit updated');
  }, []);
  const deleteHabit = useCallback((id: string) => {
    setState((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== id) }));
    setToast('Habit removed');
  }, []);
  const toggleRitual = useCallback((id: string) => {
    setState((current) => ({ ...current, rituals: current.rituals.map((item) => item.id === id ? { ...item, on: !item.on } : item) }));
  }, []);
  const toggleWeekRule = useCallback((id: string) => {
    setState((current) => ({ ...current, weekRules: current.weekRules.map((item) => item.id === id ? { ...item, on: !item.on } : item), appliedPlan: false }));
  }, []);
  const toggleHeldBlock = useCallback(() => setState((current) => ({ ...current, heldBlock: !current.heldBlock })), []);
  const applyWeekPlan = useCallback(() => {
    setState((current) => ({ ...current, appliedPlan: true, appliedWeekRules: current.weekRules.map((rule) => ({ ...rule })) }));
    setToast('Next week’s focus plan is updated');
  }, []);
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
    ...state, addTask, updateTask, deleteTask, addTaskList, deleteTaskList, addNote, updateNote, deleteNote, addProject, updateProject, deleteProject, addFocusPlanBlock, addProjectFile, toggleTask, addHabit, updateHabit, deleteHabit, toggleHabit, toggleRitual, toggleWeekRule,
    toggleHeldBlock, applyWeekPlan, startTimer, pauseTimer, resetTimer, endTimer, notify, toast,
  }), [state, addTask, updateTask, deleteTask, addTaskList, deleteTaskList, addNote, updateNote, deleteNote, addProject, updateProject, deleteProject, addFocusPlanBlock, addProjectFile, toggleTask, addHabit, updateHabit, deleteHabit, toggleHabit, toggleRitual, toggleWeekRule, toggleHeldBlock, applyWeekPlan, startTimer, pauseTimer, resetTimer, endTimer, notify, toast]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used inside DashboardProvider');
  return context;
}
