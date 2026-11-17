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
export const seedTasks: Task[] = [];

export const seedTaskLists: TaskList[] = [];

export const completedTasksBeforeVisibleList = 0;

export const seedNotes: Note[] = [];

export const seedHabits: Habit[] = [];

export const seedProjects: Project[] = [];

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
