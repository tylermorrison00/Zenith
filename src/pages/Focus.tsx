import { useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, Pause, Play, RotateCcw, Sparkles, Timer, X } from 'lucide-react';
import { CardHeading, PageEyebrow, Panel, TinyPill } from '../components/Shared';
import { FocusVolumeChart, FlowGauge, TimerRing, focusVolumeSeries } from '../components/Charts';
import { useDashboard } from '../state/DashboardContext';

type CalendarBlock = { top: string; height: string; title: string; sub: string; amber?: boolean; quiet?: boolean; dashed?: boolean; morning?: boolean; after16?: boolean };
type CalendarColumn = { day: string; blocks: CalendarBlock[] };

// No blocks are planned until the user adds work. The calendar renders an
// empty state when there is nothing to show.
const calendarPlan: CalendarColumn[] = [];

function formatTime(seconds: number) {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function TimelinePanel() {
  const { notify } = useDashboard();
  return <div className="timeline-panel">
    <div className="timeline-line" />
    <div className="library-no-results">No blocks on the timeline yet — add a task to plan your day.</div>
    <button className="button-quiet" onClick={() => notify('Add a task to plan your day')}>Plan your day</button>
  </div>;
}

function FocusPlanCalendar({ additions, appliedPlan, appliedWeekRules }: { additions: { id: string; title: string; day: string; time: string; project: string }[]; appliedPlan: boolean; appliedWeekRules: { id: string; on: boolean }[] }) {
  const protectMornings = appliedPlan && Boolean(appliedWeekRules.find((rule) => rule.id === 'mornings')?.on);
  const moveStandup = appliedPlan && Boolean(appliedWeekRules.find((rule) => rule.id === 'standup')?.on);
  const dropLateBlocks = appliedPlan && Boolean(appliedWeekRules.find((rule) => rule.id === 'afternoons')?.on);
  if (!calendarPlan.length && !additions.length) {
    return <div className="library-no-results">No blocks planned for next week yet.</div>;
  }
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
  const { timer, pauseTimer, startTimer, resetTimer, endTimer, heldBlock, toggleHeldBlock, focusPlanAdditions, appliedPlan, appliedWeekRules, tasks, notify } = useDashboard();
  const [volumeTab, setVolumeTab] = useState<'Deep' | 'Shallow'>('Deep');
  const [period, setPeriod] = useState<'7D' | '14D' | '30D'>('14D');
  const progress = Math.round(timer.progress);
  const selectedHours = focusVolumeSeries(volumeTab, period).reduce((sum, value) => sum + value, 0);
  const focusTask = tasks.find((task) => !task.done);
  const sessionStarted = timer.running || timer.seconds < 60 * 60;
  const elapsedSeconds = 60 * 60 - timer.seconds;
  const startedAt = new Date(timer.changedAt - elapsedSeconds * 1000);
  const endsAt = new Date(startedAt.getTime() + 60 * 60 * 1000);

  return <div className="focus-page">
    <div className="focus-hero-grid">
      <div className="focus-title-block">
        <PageEyebrow>Deep work <span className="eyebrow-separator">·</span> Session {timer.sessions + 1} of 4 in flow <TinyPill tone="amber"><i className="inline-dot" /> In flow</TinyPill></PageEyebrow>
        <h1 className="display-title">{focusTask ? focusTask.title : 'Focus session'}</h1>
        <p className="focus-description">{focusTask ? `${focusTask.project} · ${focusTask.due}` : 'Start a block and stay with one thing.'}</p>
        <div className="focus-stat-chips">
          <div className="focus-stat-chip"><span>Focused today</span><strong>0h 0m</strong><small>No sessions yet</small></div>
          <div className="focus-stat-chip"><span>Sessions</span><strong>{timer.sessions}<span>/4</span></strong><small>{timer.running ? '1 in progress' : 'No session in progress'}</small></div>
          <div className="focus-stat-chip"><span>Interruptions</span><strong>0</strong><small>Today</small></div>
          <div className="focus-stat-chip"><span>Streak</span><strong>0<span> days</span></strong><small>No streak yet</small></div>
        </div>
      </div>
      <TimelinePanel />
      <Panel className="timer-panel">
        <div className="timer-panel-head"><span>Time left</span><button className="icon-circle" aria-label="Reset timer" onClick={resetTimer}><RotateCcw size={13} /></button></div>
        <div className="timer-main-row"><div className="timer-value-wrap"><div className="timer-value">{formatTime(timer.seconds)}<small> / 60 min</small></div><div className="timer-details"><span>Started<strong>{sessionStarted ? formatClock(startedAt) : 'Not started'}</strong></span><span>Ends<strong>{sessionStarted ? formatClock(endsAt) : '—'}</strong></span><span>Sessions<strong>{timer.sessions}</strong></span></div></div><TimerRing progress={progress} /></div>
        <div className="timer-controls"><button className="timer-control timer-control--primary" onClick={timer.running ? pauseTimer : startTimer}>{timer.running ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}{timer.running ? 'Pause' : 'Resume'}</button><button className="timer-control" onClick={endTimer}><X size={13} /> End session</button></div>
      </Panel>
    </div>

    <div className="focus-analytics-grid">
      <Panel className="focus-volume-panel">
        <div className="focus-chart-heading"><div><div className="focus-volume-title">Focus volume</div><div className="chart-controls"><button className={volumeTab === 'Deep' ? 'chart-tab is-active' : 'chart-tab'} onClick={() => setVolumeTab('Deep')}><span className="tab-dot" />Deep</button><button className={volumeTab === 'Shallow' ? 'chart-tab is-active' : 'chart-tab'} onClick={() => setVolumeTab('Shallow')}><span className="tab-dot tab-dot--muted" />Shallow</button><span className="chart-summary"><b>{selectedHours.toFixed(1)}h {volumeTab.toLowerCase()} focus</b>{selectedHours > 0 ? ' · 81% of plan' : ' · No data yet'}</span></div></div><div className="period-tabs">{(['7D', '14D', '30D'] as const).map((item) => <button key={item} className={period === item ? 'is-active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div></div>
        <FocusVolumeChart mode={volumeTab} period={period} />
      </Panel>
      <Panel className="flow-score-panel">
        <div className="flow-score-head"><div><h2>Flow score</h2><p>How deep today’s sessions went</p></div></div>
        <div className="flow-score-value">0 <small>/ 100</small></div>
        <FlowGauge score={0} caption={timer.sessions === 0 ? 'No sessions yet' : `${timer.sessions} of 4 sessions`} />
      </Panel>
    </div>

    <div className="next-week-section">
      <div className="next-week-calendar-panel">
        <div className="next-week-head"><CardHeading title="Next week's focus plan" detail={appliedPlan ? 'Updated from your weekly review' : 'No blocks placed yet'} /><button className="icon-circle" aria-label="Open next week planner" onClick={() => notify(calendarPlan.length || focusPlanAdditions.length ? 'Next week planner' : 'No focus blocks placed yet')}><ArrowUpRight size={13} /></button></div>
        <FocusPlanCalendar additions={focusPlanAdditions} appliedPlan={appliedPlan} appliedWeekRules={appliedWeekRules} />
      </div>
      {focusTask && <Panel className="next-review-card">
        <div className="next-review-tags"><TinyPill icon={<span className="mini-folder-dot" />}>{focusTask.project}</TinyPill><span>Next up</span></div>
        <h2>{focusTask.title}</h2>
        <div className="review-card-meta"><span><CalendarDays size={14} /> {focusTask.due}</span><span><Timer size={14} /> 60 min block</span><span><Sparkles size={14} /> {focusTask.project}</span></div>
        <button className={`button-light hold-block-button ${heldBlock ? 'is-held' : ''}`} onClick={() => { toggleHeldBlock(); notify(heldBlock ? 'Block released' : 'Block held for Monday'); }}>{heldBlock ? <><Check size={13} /> Block held</> : 'Hold this block'}</button>
      </Panel>}
    </div>
  </div>;
}
