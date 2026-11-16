import { useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, Pause, Play, RotateCcw, Sparkles, Timer, X } from 'lucide-react';
import { CardHeading, PageEyebrow, Panel, TinyPill } from '../components/Shared';
import { FocusVolumeChart, FlowGauge, TimerRing, focusVolumeSeries } from '../components/Charts';
import { useDashboard } from '../state/DashboardContext';

const timeline = [
  { time: '09:00', title: 'Deep work', subtitle: 'Wireframes', state: 'done' },
  { time: '10:00', title: 'Deep work', subtitle: 'Copy pass', state: 'done' },
  { time: '11:00', title: 'Standup', subtitle: 'Studio sync', state: 'done' },
  { time: '12:00', title: 'Onboarding spec', subtitle: 'Current block', state: 'active' },
  { time: '13:00', title: 'Inbox', subtitle: 'Clear the small things', state: 'next' },
  { time: '14:00', title: 'Brand refresh review', subtitle: 'With Mia', state: 'next' },
];

type CalendarBlock = { top: string; height: string; title: string; sub: string; amber?: boolean; quiet?: boolean; dashed?: boolean; morning?: boolean; after16?: boolean };
type CalendarColumn = { day: string; blocks: CalendarBlock[] };

const calendarPlan: CalendarColumn[] = [
  { day: 'Mon 27', blocks: [{ top: '4%', height: '28%', title: 'Deep work', sub: 'Zenith v2 spec', morning: true }, { top: '62%', height: '18%', title: 'Review', sub: 'Brand refresh', amber: true }] },
  { day: 'Tue 28', blocks: [{ top: '12%', height: '27%', title: 'Deep work', sub: 'Research synthesis', morning: true }, { top: '39%', height: '12%', title: 'Standup', sub: 'Studio sync', quiet: true }] },
  { day: 'Wed 29', blocks: [{ top: '4%', height: '23%', title: 'Deep work', sub: 'Essay draft', morning: true }, { top: '72%', height: '18%', title: 'Deep work', sub: 'Zenith v2 spec' }] },
  { day: 'Thu 30', blocks: [{ top: '29%', height: '26%', title: 'Deep work', sub: 'Brand refresh' }, { top: '39%', height: '12%', title: 'Standup', sub: 'Studio sync', quiet: true }] },
  { day: 'Fri 31', blocks: [{ top: '5%', height: '26%', title: 'Deep work', sub: 'Handoff prep', morning: true }, { top: '57%', height: '23%', title: 'Free time', sub: 'Kept open', dashed: true }, { top: '91%', height: '8%', title: 'Admin wrap', sub: 'Studio tasks', quiet: true, after16: true }] },
];

function formatTime(seconds: number) {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function TimelinePanel() {
  const { notify } = useDashboard();
  const [selected, setSelected] = useState('Onboarding spec');
  return <div className="timeline-panel">
    <div className="timeline-line" />
    {timeline.map((item) => <button className={`timeline-row timeline-row--${item.state} ${selected === item.title ? 'is-selected' : ''}`} key={`${item.time}-${item.title}`} onClick={() => { setSelected(item.title); notify(`${item.title} · ${item.time}`); }}>
      <span className="timeline-dot" /><span className="timeline-time">{item.time}</span><span className="timeline-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span><span className={`timeline-state timeline-state--${item.state}`}>{item.state === 'done' ? 'Done' : item.state === 'active' ? 'Active' : 'Next'}</span>
    </button>)}
  </div>;
}

function FocusPlanCalendar({ additions, appliedPlan, appliedWeekRules }: { additions: { id: string; title: string; day: string; time: string; project: string }[]; appliedPlan: boolean; appliedWeekRules: { id: string; on: boolean }[] }) {
  const protectMornings = appliedPlan && Boolean(appliedWeekRules.find((rule) => rule.id === 'mornings')?.on);
  const moveStandup = appliedPlan && Boolean(appliedWeekRules.find((rule) => rule.id === 'standup')?.on);
  const dropLateBlocks = appliedPlan && Boolean(appliedWeekRules.find((rule) => rule.id === 'afternoons')?.on);
  return <>
    {additions.length > 0 && <div className="plan-additions-list" aria-label="Added focus plan blocks">{additions.map((item) => <div className="plan-addition-chip" key={item.id}><span className="legend-dot legend-dot--amber" /><span><strong>{item.title}</strong><small>{item.project} · {item.day} · {item.time}</small></span></div>)}</div>}
    <div className="plan-calendar">
    <div className="calendar-time-column"><span>09:00</span><span>11:00</span><span>13:00</span><span>15:00</span><span>17:00</span></div>
    {calendarPlan.map((column) => <div className="calendar-day" key={column.day}><div className="calendar-day-label">{column.day}</div><div className="calendar-track">{column.blocks.filter((block) => !(dropLateBlocks && block.after16)).map((block) => {
      const top = block.morning && protectMornings ? '0%' : block.title === 'Standup' && moveStandup ? '28%' : block.top;
      const height = block.morning && protectMornings ? '30%' : block.height;
      return <div key={block.title + block.top} className={`calendar-block ${block.amber ? 'calendar-block--amber' : ''} ${block.quiet ? 'calendar-block--quiet' : ''} ${block.dashed ? 'calendar-block--dashed' : ''}`} style={{ top, height }}><strong>{block.title}</strong><small>{block.sub}</small></div>;
    })}</div></div>)}
    </div>
  </>;
}

export function FocusPage() {
  const { timer, pauseTimer, startTimer, resetTimer, endTimer, heldBlock, toggleHeldBlock, focusPlanAdditions, appliedPlan, appliedWeekRules, notify } = useDashboard();
  const [volumeTab, setVolumeTab] = useState<'Deep' | 'Shallow'>('Deep');
  const [period, setPeriod] = useState<'7D' | '14D' | '30D'>('14D');
  const progress = Math.round(timer.progress);
  const selectedHours = focusVolumeSeries(volumeTab, period).reduce((sum, value) => sum + value, 0);
  const summaryHours = period === '14D' && volumeTab === 'Deep' ? 48.8 : period === '14D' && volumeTab === 'Shallow' ? 13.2 : selectedHours;

  return <div className="focus-page">
    <div className="focus-hero-grid">
      <div className="focus-title-block">
        <PageEyebrow>Deep work <span className="eyebrow-separator">·</span> Session 3 of 4 in flow <TinyPill tone="amber"><i className="inline-dot" /> In flow</TinyPill></PageEyebrow>
        <h1 className="display-title">Onboarding spec</h1>
        <p className="focus-description">Finish the flow and hand it to Lena before 3 pm.</p>
        <div className="focus-stat-chips">
          <div className="focus-stat-chip"><span>Focused today</span><strong>3h 45m</strong><small>+40m vs Thu</small></div>
          <div className="focus-stat-chip"><span>Sessions</span><strong>2<span>/4</span></strong><small>1 in progress</small></div>
          <div className="focus-stat-chip"><span>Interruptions</span><strong>0</strong><small>Since 13:30</small></div>
          <div className="focus-stat-chip"><span>Streak</span><strong>6<span> days</span></strong><small>Best this month</small></div>
        </div>
      </div>
      <TimelinePanel />
      <Panel className="timer-panel">
        <div className="timer-panel-head"><span>Time left</span><button className="icon-circle" aria-label="Reset timer" onClick={resetTimer}><RotateCcw size={13} /></button></div>
        <div className="timer-main-row"><div className="timer-value-wrap"><div className="timer-value">{formatTime(timer.seconds)}<small> / 60 min</small></div><div className="timer-details"><span>Started<strong>13:20</strong></span><span>Ends<strong>15:00</strong></span><span>Sessions<strong>{timer.sessions}</strong></span></div></div><TimerRing progress={progress} /></div>
        <div className="timer-controls"><button className="timer-control timer-control--primary" onClick={timer.running ? pauseTimer : startTimer}>{timer.running ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}{timer.running ? 'Pause' : 'Resume'}</button><button className="timer-control" onClick={endTimer}><X size={13} /> End session</button></div>
      </Panel>
    </div>

    <div className="focus-analytics-grid">
      <Panel className="focus-volume-panel">
        <div className="focus-chart-heading"><div><div className="focus-volume-title">Focus volume</div><div className="chart-controls"><button className={volumeTab === 'Deep' ? 'chart-tab is-active' : 'chart-tab'} onClick={() => setVolumeTab('Deep')}><span className="tab-dot" />Deep</button><button className={volumeTab === 'Shallow' ? 'chart-tab is-active' : 'chart-tab'} onClick={() => setVolumeTab('Shallow')}><span className="tab-dot tab-dot--muted" />Shallow</button><span className="chart-summary"><b>{summaryHours.toFixed(1)}h {volumeTab.toLowerCase()} focus</b> · 81% of plan</span></div></div><div className="period-tabs">{(['7D', '14D', '30D'] as const).map((item) => <button key={item} className={period === item ? 'is-active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div></div>
        <FocusVolumeChart mode={volumeTab} period={period} />
      </Panel>
      <Panel className="flow-score-panel">
        <div className="flow-score-head"><div><h2>Flow score</h2><p>How deep today’s sessions went</p></div><TinyPill tone="amber">+8 vs weekly avg</TinyPill></div>
        <div className="flow-score-value">86 <small>/ 100</small></div>
        <div className="gauge-scores"><div><span><i />Wireframes</span><b>82</b></div><div><span><i />Copy pass</span><b>88</b></div><div><span><i />Onboarding spec</span><b>86</b></div></div>
        <FlowGauge score={86} />
      </Panel>
    </div>

    <div className="next-week-section">
      <div className="next-week-calendar-panel">
        <div className="next-week-head"><CardHeading title="Next week's focus plan" detail={appliedPlan ? 'Updated from your weekly review' : 'Zenith placed 9 blocks around your meetings'} /><button className="icon-circle" aria-label="Open next week planner" onClick={() => notify('Next week planner · 9 focus blocks placed')}><ArrowUpRight size={13} /></button></div>
        <FocusPlanCalendar additions={focusPlanAdditions} appliedPlan={appliedPlan} appliedWeekRules={appliedWeekRules} />
      </div>
      <Panel className="next-review-card">
        <div className="next-review-tags"><TinyPill icon={<span className="mini-folder-dot" />}>Brand refresh</TinyPill><span>Next up</span></div>
        <h2>Review the moodboard with Mia</h2>
        <div className="review-card-meta"><span><CalendarDays size={14} /> Mon 27 Oct</span><span><Timer size={14} /> 14:00 – 15:00 · 60 min</span><span><Sparkles size={14} /> 3 files prepared by Zenith</span></div>
        <button className={`button-light hold-block-button ${heldBlock ? 'is-held' : ''}`} onClick={() => { toggleHeldBlock(); notify(heldBlock ? 'Block released' : 'Block held for Monday'); }}>{heldBlock ? <><Check size={13} /> Block held</> : 'Hold this block'}</button>
      </Panel>
    </div>
  </div>;
}
