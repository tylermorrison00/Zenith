import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readStorage, writeStorage } from '../lib/storage';
import { ritualsSeed, seedHabits, seedNotes, seedProjectFiles, seedProjects, seedTasks, weekRulesSeed, type FocusPlanAddition, type Habit, type Note, type Project, type ProjectFile, type Task } from '../data/seed';

type ToggleItem = { id: string; title: string; detail: string; on: boolean };
type StoredTimer = { seconds: number; running: boolean; changedAt: number; sessions: number; progress: number };
type DashboardState = {
  tasks: Task[];
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
};

type DashboardContextValue = DashboardState & {
  addTask: (title: string, project?: string) => void;
  addNote: (title: string, body: string) => void;
  addProject: (name: string) => void;
  addFocusPlanBlock: (block: FocusPlanAddition) => void;
  addProjectFile: (file: { name: string; size: number; type: string }) => void;
  toggleTask: (id: string) => void;
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

const stateKey = 'zenith-dashboard-v1';
const timerKey = 'zenith-focus-timer-v1';
const initialTimer: StoredTimer = { seconds: 41 * 60 + 42, running: true, changedAt: Date.now(), sessions: 0, progress: 54 };
const initialState: DashboardState = {
  tasks: seedTasks,
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

function loadInitialState(): DashboardState {
  const saved = readStorage<Partial<DashboardState>>(stateKey, {});
  const storedTimer = readStorage<StoredTimer | null>(timerKey, null);
  let timer = storedTimer ? { ...initialTimer, ...storedTimer, progress: storedTimer.progress ?? (storedTimer.seconds >= 60 * 60 ? 0 : 54) } : initialTimer;
  if (timer.running) {
    const elapsed = Math.max(0, Math.floor((Date.now() - timer.changedAt) / 1000));
    timer = { ...timer, seconds: Math.max(0, timer.seconds - elapsed), progress: Math.min(100, timer.progress + elapsed / 36), changedAt: Date.now(), running: timer.seconds - elapsed > 0 };
  }
  return {
    ...initialState,
    ...saved,
    tasks: saved.tasks ?? seedTasks,
    notes: saved.notes ?? seedNotes,
    habits: saved.habits ?? seedHabits,
    projects: (saved.projects ?? seedProjects).map((project) => project.id === 'brand-refresh'
      ? { ...project, progress: 68, due: 'Fri 14 Nov', status: 'On track' }
      : project),
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
  const addTask = useCallback((title: string, project = 'Zenith v2 spec') => {
    const task: Task = { id: `task-${Date.now()}`, title, project, due: 'Today · just added', done: false, priority: 'normal' };
    setState((current) => ({ ...current, tasks: [task, ...current.tasks] }));
    setToast('Task added to your day');
  }, []);
  const addNote = useCallback((title: string, body: string) => {
    const note: Note = { id: `note-${Date.now()}`, title, excerpt: body || 'A new note for this block.', project: 'Zenith v2 spec', updated: 'Just now' };
    setState((current) => ({ ...current, notes: [note, ...current.notes] }));
    setToast('Note saved to your library');
  }, []);
  const addProject = useCallback((name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `project-${Date.now()}`;
    const project: Project = { id: `${slug}-${Date.now()}`, name, sublabel: '0 files', nextBlock: 'Plan a first block', hours: 0, progress: 0, files: '0 of 0 files', due: 'Not set', status: 'Needs time' };
    setState((current) => ({ ...current, projects: [project, ...current.projects] }));
    setToast(`${name} added to projects`);
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
    setToast(`${file.name} added to Brand Refresh`);
  }, []);
  const toggleTask = useCallback((id: string) => {
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) }));
  }, []);
  const toggleHabit = useCallback((id: string) => {
    setState((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, done: !habit.done } : habit) }));
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
    ...state, addTask, addNote, addProject, addFocusPlanBlock, addProjectFile, toggleTask, toggleHabit, toggleRitual, toggleWeekRule,
    toggleHeldBlock, applyWeekPlan, startTimer, pauseTimer, resetTimer, endTimer, notify, toast,
  }), [state, addTask, addNote, addProject, addFocusPlanBlock, addProjectFile, toggleTask, toggleHabit, toggleRitual, toggleWeekRule, toggleHeldBlock, applyWeekPlan, startTimer, pauseTimer, resetTimer, endTimer, notify, toast]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used inside DashboardProvider');
  return context;
}
