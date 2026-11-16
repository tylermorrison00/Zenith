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
};

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

export const seedTasks: Task[] = [
  { id: 'task-1', title: 'Finish the onboarding flow', project: 'Zenith v2 spec', due: 'Today · 14:20', done: false, priority: 'high' },
  { id: 'task-2', title: 'Review empty states', project: 'Zenith v2 spec', due: 'Today · 15:00', done: false, priority: 'high' },
  { id: 'task-3', title: 'Check CTA copy with Lena', project: 'Zenith v2 spec', due: 'Today · 15:45', done: false, priority: 'normal' },
  { id: 'task-4', title: 'Review the moodboard with Mia', project: 'Brand refresh', due: 'Mon 27 Oct', done: false, priority: 'normal' },
  { id: 'task-5', title: 'Send the research synthesis', project: 'Research', due: 'Tue · 09:00', done: true, priority: 'normal' },
  { id: 'task-6', title: 'Draft the founder story', project: 'Writing', due: 'Wed · 10:30', done: true, priority: 'low' },
  { id: 'task-7', title: 'Update the studio admin tracker', project: 'Admin', due: 'Done · 11:12', done: true, priority: 'low' },
];

// Four earlier completions are archived outside the seven-item current task list.
// The Overview KPI combines these with checked tasks so its seeded total is 7.
export const completedTasksBeforeVisibleList = 4;

export const seedNotes: Note[] = [
  { id: 'note-1', title: 'Onboarding flow — handoff', excerpt: 'Keep the first screen quiet. Ask for one decision at a time.', project: 'Zenith v2 spec', updated: 'Today, 12:48' },
  { id: 'note-2', title: 'Brand voice', excerpt: 'Lighter, more confident, and built to travel across print and product.', project: 'Brand refresh', updated: 'Yesterday' },
  { id: 'note-3', title: 'Research synthesis', excerpt: 'The strongest signal is still the first deep block of the day.', project: 'Research', updated: 'Mon, 10:24' },
];

export const seedHabits: Habit[] = [
  { id: 'habit-1', title: 'Morning pages', detail: 'Before opening the inbox', streak: 12, done: true },
  { id: 'habit-2', title: 'First block before inbox', detail: 'Protect 09:00–11:00', streak: 6, done: true },
  { id: 'habit-3', title: 'A glass of water', detail: 'At the start of the day', streak: 9, done: false },
  { id: 'habit-4', title: 'Walk between blocks', detail: 'A short reset outside', streak: 4, done: false },
  { id: 'habit-5', title: 'Clear the desk', detail: 'Make space for the next thing', streak: 8, done: true },
  { id: 'habit-6', title: 'Shutdown note', detail: 'Leave a kind handoff for tomorrow', streak: 5, done: false },
];

export const seedProjects: Project[] = [
  { id: 'zenith', name: 'Zenith v2 spec', sublabel: '12 files', nextBlock: 'Today, 14:00 · 2h', hours: 18.5, progress: 68, files: '8 of 12 files', due: 'Fri 24 Oct', status: 'On track' },
  { id: 'brand-refresh', name: 'Brand refresh', sublabel: '9 files', nextBlock: 'Today, 16:30 · 50m', hours: 4.0, progress: 68, files: '8 of 9 files', due: 'Fri 14 Nov', status: 'On track' },
  { id: 'research', name: 'Research', sublabel: '8 files', nextBlock: 'Tue, 09:00 · 90m', hours: 9.0, progress: 42, files: '3 of 8 files', due: 'Fri 31 Oct', status: 'On track' },
  { id: 'writing', name: 'Writing', sublabel: '5 drafts', nextBlock: 'Wed, 10:30 · 90m', hours: 6.5, progress: 30, files: '1 of 5 drafts', due: 'Fri 7 Nov', status: 'Needs time' },
  { id: 'admin', name: 'Admin', sublabel: '3 items', nextBlock: 'Thu, 17:00 · 25m', hours: 2.0, progress: 100, files: '3 of 3 items', due: 'Done', status: 'Done' },
];

export const seedProjectFiles: ProjectFile[] = [
  { name: 'Brand guidelines v2.pdf', detail: 'Updated today · 4.8 MB', type: 'PDF' },
  { name: 'Social templates.fig', detail: 'Updated yesterday · 2.1 MB', type: 'FIG' },
  { name: 'Presentation deck.key', detail: 'Updated Oct 18 · 6.2 MB', type: 'KEY' },
  { name: 'Logo files.zip', detail: 'Updated Oct 16 · 1.4 MB', type: 'ZIP' },
  { name: 'Brand voice.txt', detail: 'Updated Oct 15 · 18 KB', type: 'TXT' },
  { name: 'Campaign mockups.fig', detail: 'Updated Oct 15 · 3.6 MB', type: 'FIG' },
  { name: 'Logo lockups.svg', detail: 'Updated Oct 14 · 246 KB', type: 'SVG' },
  { name: 'Photography direction.pdf', detail: 'Updated Oct 13 · 2.3 MB', type: 'PDF' },
  { name: 'Project brief.docx', detail: 'Updated Oct 12 · 84 KB', type: 'DOCX' },
];

export const ritualsSeed = [
  { id: 'morning-plan', title: 'Morning plan', detail: '08:30 – 08:45', on: true },
  { id: 'deep-block', title: 'Deep block', detail: '2 hrs · Zenith v2 spec', on: true },
  { id: 'shutdown-review', title: 'Shutdown review', detail: '17:15 · 10 min', on: false },
];

export const weekRulesSeed = [
  { id: 'mornings', title: 'Block 09:00–11:00 daily', detail: 'Mornings stay meeting-free', on: true },
  { id: 'standup', title: 'Move standup to 11:15', detail: 'Keeps the first block whole', on: true },
  { id: 'afternoons', title: 'Drop blocks after 16:00', detail: 'Use them for admin instead', on: false },
];

export const weekDays = [
  { day: 'Mon', value: 3.4, parts: [1.2, 1.1, 1.1] },
  { day: 'Tue', value: 4.1, parts: [1.4, 1.5, 1.2] },
  { day: 'Wed', value: 3.0, parts: [1.1, 1.0, 0.9] },
  { day: 'Thu', value: 4.8, parts: [1.6, 1.7, 1.5] },
  { day: 'Fri', value: 5.2, parts: [1.8, 1.8, 1.6] },
  { day: 'Sat', value: 0.2, parts: [0.1, 0.1] },
  { day: 'Sun', value: 0.9, parts: [0.5, 0.4] },
];

export const focusVolumeBars = [3.2, 3.7, 2.7, 4.1, 3.6, 0.7, 0.2, 3.2, 4.3, 2.9, 4.7, 3.8, 0.5, 4.2];
