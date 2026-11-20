export type Task = {
  id: string;
  title: string;
  project: string;
  due: string;
  done: boolean;
  priority: 'high' | 'normal' | 'low';
};

export type Note = {
  id: string;
  title: string;
  excerpt: string;
  project: string;
  updated: string;
};

export type Habit = {
  id: string;
  title: string;
  detail: string;
  streak: number;
  done: boolean;
  /** Last 28 days, oldest first; the final entry is today. */
  history: boolean[];
};

export const HABIT_HISTORY_DAYS = 28;

/** Builds a 28-day history whose filled tail matches a streak: when today is
 *  already checked the streak ends today, otherwise it ends yesterday. */
export function habitHistory(streak: number, done: boolean): boolean[] {
  const days = Array.from({ length: HABIT_HISTORY_DAYS }, () => false);
  const end = done ? HABIT_HISTORY_DAYS : HABIT_HISTORY_DAYS - 1;
  for (let i = Math.max(0, end - streak); i < end; i += 1) days[i] = true;
  return days;
}

/** Current streak: consecutive filled days ending today, or yesterday when
 *  today is still unchecked. */
export function streakFromHistory(history: boolean[]): number {
  let index = history.length - 1;
  if (index >= 0 && !history[index]) index -= 1;
  let streak = 0;
  while (index >= 0 && history[index]) { streak += 1; index -= 1; }
  return streak;
}

export type Project = {
  id: string;
  name: string;
  sublabel: string;
  nextBlock: string;
  hours: number;
  progress: number;
  files: string;
  due: string;
  status: 'On track' | 'In review' | 'Needs time' | 'Done';
};

export type TaskList = {
  id: string;
  name: string;
};

export type ProjectFile = {
  name: string;
  detail: string;
  type: string;
};

export type FocusPlanAddition = {
  id: string;
  title: string;
  day: string;
  time: string;
  project: string;
};

// The app ships with no demo content: every list starts empty and fills up
// only with what the user adds. The types above are the shape of that data.
export const seedTasks: Task[] = [
  {
    id: 'task-1795084365677',
    title: 'create clayfied master prompt',
    project: 'Work',
    due: 'Today · just added',
    done: false,
    priority: 'normal',
  },
];

export const seedTaskLists: TaskList[] = [
  { id: 'list-1795084324967', name: 'Work' },
];

export const completedTasksBeforeVisibleList = 0;

export const seedNotes: Note[] = [
  { id: 'note-1794977695725', title: 'yyyyy', excerpt: 'hhhhh', project: 'General', updated: 'Just now' },
  { id: 'note-1794977666495', title: 'ggggg', excerpt: 'ggggg', project: 'General', updated: 'Just now' },
];

export const seedHabits: Habit[] = [
  {
    id: 'habit-1795110131340',
    title: 'Juicy Crunch FB',
    detail: 'Daily video upload',
    streak: 1,
    done: false,
    history: [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,false],
  },
  {
    id: 'habit-1795016065962',
    title: 'Improve Zenith',
    detail: 'make improvement',
    streak: 2,
    done: false,
    history: [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,false],
  },
  {
    id: 'habit-1794901553473',
    title: 'Juicy Drama World',
    detail: 'Daily video create',
    streak: 2,
    done: false,
    history: [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,false],
  },
  {
    id: 'habit-1794901517603',
    title: 'Muscle Mesh',
    detail: 'Daily video create',
    streak: 3,
    done: false,
    history: [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true,false],
  },
];

export const seedProjects: Project[] = [
  {
    id: 'p-o-1794982124816',
    name: 'Vertex',
    sublabel: '0 files',
    nextBlock: 'Plan a first block',
    hours: 0,
    progress: 0,
    files: '0 of 0 files',
    due: 'Not set',
    status: 'Needs time',
  },
  {
    id: 'hhhh-1794982122019',
    name: 'TikTok',
    sublabel: '0 files',
    nextBlock: 'Plan a first block',
    hours: 0,
    progress: 0,
    files: '0 of 0 files',
    due: 'Not set',
    status: 'Needs time',
  },
  {
    id: 'work-1794981910869',
    name: 'Important',
    sublabel: '0 files',
    nextBlock: 'Plan a first block',
    hours: 0,
    progress: 0,
    files: '0 of 0 files',
    due: 'Not set',
    status: 'Needs time',
  },
];

export const seedProjectFiles: ProjectFile[] = [];

export const ritualsSeed = [];

export const weekRulesSeed = [];

export const weekDays = [
  { day: 'Mon', value: 0, parts: [0, 0, 0] },
  { day: 'Tue', value: 0, parts: [0, 0, 0] },
  { day: 'Wed', value: 0, parts: [0, 0, 0] },
  { day: 'Thu', value: 0, parts: [0, 0, 0] },
  { day: 'Fri', value: 0, parts: [0, 0, 0] },
  { day: 'Sat', value: 0, parts: [0, 0] },
  { day: 'Sun', value: 0, parts: [0, 0] },
];

export const focusVolumeBars: number[] = [];
