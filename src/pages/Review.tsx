import { useState } from 'react';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { CardHeading, PageEyebrow, Panel, Toggle } from '../components/Shared';
import { PeakHoursChart, WeeklyBars } from '../components/Charts';
import { currentWeekNumber, weekRangeLabel } from '../lib/dates';
import { weekDays } from '../data/seed';
import { useDashboard } from '../state/DashboardContext';

type ReviewDay = { day: string; value: number; parts: number[] };
type ReviewWorkItem = { title: string; project: string; hours: string };
type ReviewWeek = {
  hours: number;
  lastWeekHours: number;
  change: string;
  sessions: number;
  sessionChange: string;
  averageLength: number;
  averageChange: string;
  interruptions: number;
  interruptionChange: string;
  interruptionsDeclined: number;
  bestDay: string;
  bestDayHours: number;
  bestDayDetail: string;
  morningShare: number;
  takePointOne: string;
  takePointTwo: string;
  summary: string;
  days: ReviewDay[];
  workItems: ReviewWorkItem[];
};

// Weekly review numbers start at zero. There is no session history yet, so
// nothing is invented here — the page shows honest zeros until real weekly
// tracking exists.
const emptyWeek: ReviewWeek = {
  hours: 0, lastWeekHours: 0, change: '—', sessions: 0, sessionChange: '—',
  averageLength: 0, averageChange: '—', interruptions: 0, interruptionChange: '—',
  interruptionsDeclined: 0, bestDay: '—', bestDayHours: 0, bestDayDetail: 'No sessions yet',
  morningShare: 0, takePointOne: '', takePointTwo: '',
  summary: 'No deep work logged yet.',
  days: weekDays, workItems: [],
};

export function ReviewPage() {
  const { weekRules, toggleWeekRule, applyWeekPlan, appliedPlan, notify, timer } = useDashboard();
  const [weekOffset, setWeekOffset] = useState(0);
  const [fullReview, setFullReview] = useState(false);
  const week = currentWeekNumber() + weekOffset;
  const range = weekRangeLabel(weekOffset);
  const data = emptyWeek;
  const changes = weekRules.filter((rule) => rule.on).length;
  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;
  const hasSessions = timer.sessions > 0;

  return <div className="review-page">
    <div className="review-page-heading"><div><PageEyebrow>Week {week} · {range}</PageEyebrow><h1 className="display-title">Your week in review</h1></div></div>
    <div className="review-grid">
      <section className="review-summary">
        <div className="review-week-nav"><button aria-label="Previous week" disabled={weekOffset === -1} onClick={() => setWeekOffset((value) => Math.max(-1, value - 1))}><ChevronLeft size={13} /></button><span>Week {week} · {range}</span><button aria-label="Next week" disabled={weekOffset === 1} onClick={() => setWeekOffset((value) => Math.min(1, value + 1))}><ChevronRight size={13} /></button></div>
        <div className="review-big-hours">{data.hours.toFixed(1)}<small>h</small></div>
        <p className="review-summary-copy">{data.summary}</p>
        <div className="review-stats-list">
          <div><span>Sessions</span><b>{data.sessions} <small>{data.sessionChange}</small></b></div>
          <div><span>Average length</span><b>{data.averageLength} min <small>{data.averageChange}</small></b></div>
          <div><span>Interruptions</span><b>{data.interruptions} <small>{data.interruptionChange}</small></b></div>
        </div>
      </section>

      <Panel className="deep-work-by-day-panel">
        <CardHeading title="Deep work by day" detail="Each block is one session" action={<button className="icon-circle" aria-label="Open weekly focus detail" onClick={() => notify(`You focused for ${formatHours(data.hours)} this week`)}><ArrowUpRight size={13} /></button>} />
        <div className="weekly-chart-layout"><WeeklyBars days={data.days} /><div className="weekly-summary-lines"><div><span className="summary-dot summary-dot--amber" />This week<strong>{formatHours(data.hours)} <small>{data.change}</small></strong></div><div><span className="summary-dot" />Last week<strong>{formatHours(data.lastWeekHours)}</strong></div><div>Best day<strong>{data.bestDay} <small>{formatHours(data.bestDayHours)} · {data.bestDayDetail}</small></strong></div></div></div>
      </Panel>

      <Panel className="zenith-take-panel">
        <div className="zenith-take-label"><span><Sparkles size={13} /></span>Zenith's take</div>
        <h2>No take yet — your first review will appear after a week of focus.</h2>
        <div className="morning-share">{data.morningShare}% <small>of deep work landed<br />before noon this week</small></div>
        <div className="take-points">{data.takePointOne && <div><small>01</small><span>{data.takePointOne}</span></div>}{data.takePointTwo && <div><small>02</small><span>{data.takePointTwo}</span></div>}{!data.takePointOne && !data.takePointTwo && <div><small>—</small><span>Complete a few focus sessions and Zenith will spot your pattern.</span></div>}{fullReview && data.takePointOne && <div><small>03</small><span>Your 09:00–11:00 block is your most reliable stretch</span></div>}</div>
        <button className="button-outline full-review-button" onClick={() => setFullReview((value) => !value)}>{fullReview ? 'Close the full review' : 'Read the full review'} <ArrowUpRight size={12} /></button>
      </Panel>

      <Panel className="peak-hours-panel">
        <CardHeading title="Peak hours" detail="Average focused minutes per half hour, Mon to Fri" action={<button className="icon-circle" aria-label="Peak hours details" onClick={() => notify(hasSessions ? 'Your best work is between 09:00 and 11:00' : 'No peak hours yet — complete a session first')}><ArrowUpRight size={13} /></button>} />
        <PeakHoursChart hasData={hasSessions} />
      </Panel>

      <Panel className="paid-for-panel">
        <div className="paid-for-top"><div className="paid-for-kicker">ZENITH · WEEK {week}</div><span>{range}</span></div>
        <CardHeading title="What the week paid for" />
        {data.workItems.length > 0
          ? <div className="paid-work-list">{data.workItems.map((item) => <div key={item.title}><span><strong>{item.title}</strong><small>{item.project}</small></span><b>{item.hours}</b></div>)}</div>
          : <div className="library-no-results">No work logged this week.</div>}
        <div className="paid-total"><div><span>Total deep work</span><small>{data.interruptionsDeclined} interruptions declined</small></div><strong>{formatHours(data.hours)}</strong></div>
        <div className="segmented-work-bar" aria-label="Deep work by project"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      </Panel>

      <Panel className="next-week-rules-panel">
        <CardHeading title="Next week" detail="Suggested from this review" />
        {weekRules.length > 0
          ? <div className="week-rules-list">{weekRules.map((rule) => <div className="week-rule-row" key={rule.id}><div><strong>{rule.title}</strong><small>{rule.detail}</small></div><Toggle checked={rule.on} onChange={() => toggleWeekRule(rule.id)} label={rule.title} /></div>)}</div>
          : <div className="library-no-results">No suggestions yet.</div>}
        {weekRules.length > 0 && <>
          <button className={`button-quiet apply-plan-button ${appliedPlan ? 'is-applied' : ''}`} onClick={() => applyWeekPlan()}>{appliedPlan ? <><Check size={13} /> Changes applied</> : `Apply ${changes} changes`}</button>
        </>}
      </Panel>
    </div>
  </div>;
}
