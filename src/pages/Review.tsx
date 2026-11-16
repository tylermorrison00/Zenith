import { useState } from 'react';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { CardHeading, PageEyebrow, Panel, Toggle } from '../components/Shared';
import { PeakHoursChart, WeeklyBars } from '../components/Charts';
import { weekDays } from '../data/seed';
import { useDashboard } from '../state/DashboardContext';

type ReviewWeekNumber = 42 | 43 | 44;
type ReviewDay = { day: string; value: number; parts: number[] };
type ReviewWorkItem = { title: string; project: string; hours: string };
type ReviewWeek = {
  range: string;
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

const reviewWeeks: Record<ReviewWeekNumber, ReviewWeek> = {
  42: {
    range: '6–12 Oct', hours: 17.2, lastWeekHours: 15.0, change: '+2.2h', sessions: 12, sessionChange: '+2',
    averageLength: 66, averageChange: '+5 min', interruptions: 13, interruptionChange: '−19%', interruptionsDeclined: 8,
    bestDay: 'Friday', bestDayHours: 4.0, bestDayDetail: 'few meetings', morningShare: 74,
    takePointOne: 'Friday held your longest block with room to think', takePointTwo: 'Early starts helped most on Tuesday and Thursday',
    summary: 'of deep work. A steady week with room to grow.',
    days: [
      { day: 'Mon', value: 2.5, parts: [0.9, 0.8, 0.8] }, { day: 'Tue', value: 3.2, parts: [1.1, 1.1, 1.0] },
      { day: 'Wed', value: 2.1, parts: [0.7, 0.7, 0.7] }, { day: 'Thu', value: 3.6, parts: [1.2, 1.2, 1.2] },
      { day: 'Fri', value: 4.0, parts: [1.4, 1.3, 1.3] }, { day: 'Sat', value: 0.8, parts: [0.4, 0.4] },
      { day: 'Sun', value: 1.0, parts: [0.5, 0.5] },
    ],
    workItems: [
      { title: 'Spec sections 1 and 2', project: 'Zenith v2 spec', hours: '5.2h' },
      { title: 'Interview notes synthesised', project: 'Research', hours: '2.4h' },
      { title: 'Brand direction explored', project: 'Brand refresh', hours: '1.6h' },
      { title: 'Inbox at zero, once', project: 'Admin', hours: '0.6h' },
    ],
  },
  43: {
    range: '13–19 Oct', hours: 21.6, lastWeekHours: 17.2, change: '+4.4h', sessions: 14, sessionChange: '+3',
    averageLength: 72, averageChange: '+8 min', interruptions: 11, interruptionChange: '−31%', interruptionsDeclined: 11,
    bestDay: 'Friday', bestDayHours: 5.2, bestDayDetail: 'no meetings', morningShare: 78,
    takePointOne: 'Friday had no meetings and was your peak', takePointTwo: 'Short blocks after 16:00 rarely held',
    summary: 'of deep work. Your best week since August.', days: weekDays,
    workItems: [
      { title: 'Spec sections 1 and 2', project: 'Zenith v2 spec', hours: '6.5h' },
      { title: 'Interview notes synthesised', project: 'Research', hours: '3.0h' },
      { title: 'Brand moodboard approved', project: 'Brand refresh', hours: '2.0h' },
      { title: 'Inbox at zero, twice', project: 'Admin', hours: '0.8h' },
    ],
  },
  44: {
    range: '20–26 Oct', hours: 20.2, lastWeekHours: 21.6, change: '−1.4h', sessions: 13, sessionChange: '−1',
    averageLength: 70, averageChange: '−2 min', interruptions: 9, interruptionChange: '−18%', interruptionsDeclined: 9,
    bestDay: 'Friday', bestDayHours: 4.7, bestDayDetail: 'one short meeting', morningShare: 76,
    takePointOne: 'Friday was your strongest day for uninterrupted work', takePointTwo: 'The 09:00 block stayed the most reliable',
    summary: 'of deep work. Your most recent week is ready to review.',
    days: [
      { day: 'Mon', value: 3.1, parts: [1.0, 1.0, 1.1] }, { day: 'Tue', value: 3.5, parts: [1.2, 1.1, 1.2] },
      { day: 'Wed', value: 2.9, parts: [1.0, 0.9, 1.0] }, { day: 'Thu', value: 4.4, parts: [1.5, 1.4, 1.5] },
      { day: 'Fri', value: 4.7, parts: [1.6, 1.6, 1.5] }, { day: 'Sat', value: 0.8, parts: [0.4, 0.4] },
      { day: 'Sun', value: 0.8, parts: [0.4, 0.4] },
    ],
    workItems: [
      { title: 'Spec handoff and QA', project: 'Zenith v2 spec', hours: '4.9h' },
      { title: 'Research synthesis', project: 'Research', hours: '4.1h' },
      { title: 'Brand system drafts', project: 'Brand refresh', hours: '2.8h' },
      { title: 'Studio admin', project: 'Admin', hours: '1.2h' },
    ],
  },
};

export function ReviewPage() {
  const { weekRules, toggleWeekRule, applyWeekPlan, appliedPlan, notify } = useDashboard();
  const [week, setWeek] = useState<ReviewWeekNumber>(43);
  const [fullReview, setFullReview] = useState(false);
  const data = reviewWeeks[week];
  const changes = weekRules.filter((rule) => rule.on).length;
  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

  return <div className="review-page">
    <div className="review-page-heading"><div><PageEyebrow>Week {week} · {data.range}</PageEyebrow><h1 className="display-title">Your week in review</h1></div></div>
    <div className="review-grid">
      <section className="review-summary">
        <div className="review-week-nav"><button aria-label="Previous week" disabled={week === 42} onClick={() => setWeek((value) => Math.max(42, value - 1) as ReviewWeekNumber)}><ChevronLeft size={13} /></button><span>Week {week} · {data.range}</span><button aria-label="Next week" disabled={week === 44} onClick={() => setWeek((value) => Math.min(44, value + 1) as ReviewWeekNumber)}><ChevronRight size={13} /></button></div>
        <div className="review-big-hours">{data.hours.toFixed(1)}<small>h</small></div>
        <p className="review-summary-copy">{data.summary}</p>
        <div className="review-stats-list">
          <div><span>Sessions</span><b>{data.sessions} <small>{data.sessionChange}</small></b></div>
          <div><span>Average length</span><b>{data.averageLength} min <small>{data.averageChange}</small></b></div>
          <div><span>Interruptions</span><b>{data.interruptions} <small>{data.interruptionChange}</small></b></div>
        </div>
      </section>

      <Panel className="deep-work-by-day-panel">
        <CardHeading title="Deep work by day" detail="Each block is one session. Dots mark last week" action={<button className="icon-circle" aria-label="Open weekly focus detail" onClick={() => notify(`You focused for ${formatHours(data.hours)} this week`)}><ArrowUpRight size={13} /></button>} />
        <div className="weekly-chart-layout"><WeeklyBars days={data.days} /><div className="weekly-summary-lines"><div><span className="summary-dot summary-dot--amber" />This week<strong>{formatHours(data.hours)} <small>{data.change}</small></strong></div><div><span className="summary-dot" />Last week<strong>{formatHours(data.lastWeekHours)}</strong></div><div>Best day<strong>{data.bestDay} <small>{formatHours(data.bestDayHours)} · {data.bestDayDetail}</small></strong></div></div></div>
      </Panel>

      <Panel className="zenith-take-panel">
        <div className="zenith-take-label"><span><Sparkles size={13} /></span>Zenith's take</div>
        <h2>Protect your mornings. That is where your best work happens.</h2>
        <div className="morning-share">{data.morningShare}% <small>of deep work landed<br />before noon this week</small></div>
        <div className="take-points"><div><small>01</small><span>{data.takePointOne}</span></div><div><small>02</small><span>{data.takePointTwo}</span></div>{fullReview && <div><small>03</small><span>Your 09:00–11:00 block is your most reliable stretch</span></div>}</div>
        <button className="button-outline full-review-button" onClick={() => setFullReview((value) => !value)}>{fullReview ? 'Close the full review' : 'Read the full review'} <ArrowUpRight size={12} /></button>
      </Panel>

      <Panel className="peak-hours-panel">
        <CardHeading title="Peak hours" detail="Average focused minutes per half hour, Mon to Fri" action={<button className="icon-circle" aria-label="Peak hours details" onClick={() => notify('Your best work is between 09:00 and 11:00')}><ArrowUpRight size={13} /></button>} />
        <PeakHoursChart />
      </Panel>

      <Panel className="paid-for-panel">
        <div className="paid-for-top"><div className="paid-for-kicker">ZENITH · WEEK {week}</div><span>{data.range}</span></div>
        <CardHeading title="What the week paid for" />
        <div className="paid-work-list">{data.workItems.map((item) => <div key={item.title}><span><strong>{item.title}</strong><small>{item.project}</small></span><b>{item.hours}</b></div>)}</div>
        <div className="paid-total"><div><span>Total deep work</span><small>{data.interruptionsDeclined} interruptions declined</small></div><strong>{formatHours(data.hours)}</strong></div>
        <div className="segmented-work-bar" aria-label="Deep work by project"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      </Panel>

      <Panel className="next-week-rules-panel">
        <CardHeading title="Next week" detail="Suggested from this review" />
        <div className="week-rules-list">{weekRules.map((rule) => <div className="week-rule-row" key={rule.id}><div><strong>{rule.title}</strong><small>{rule.detail}</small></div><Toggle checked={rule.on} onChange={() => toggleWeekRule(rule.id)} label={rule.title} /></div>)}</div>
        <div className="plan-uplift"><span>If you apply these</span><strong>+2.4h <small>deep work next week</small></strong></div>
        <button className={`button-quiet apply-plan-button ${appliedPlan ? 'is-applied' : ''}`} onClick={() => applyWeekPlan()}>{appliedPlan ? <><Check size={13} /> Changes applied</> : `Apply ${changes} changes`}</button>
      </Panel>
    </div>
  </div>;
}
