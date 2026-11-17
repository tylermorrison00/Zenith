import { focusVolumeBars, weekDays } from '../data/seed';

const priorDeepFocusBars: number[] = [];
const shallowFocusBars: number[] = [];

export function focusVolumeSeries(mode: 'Deep' | 'Shallow', period: string) {
  const allValues = mode === 'Deep' ? [...priorDeepFocusBars, ...focusVolumeBars] : shallowFocusBars;
  return allValues.slice(-Number.parseInt(period, 10));
}

export function FocusVolumeChart({ mode, period }: { mode: 'Deep' | 'Shallow'; period: string }) {
  const values = focusVolumeSeries(mode, period);
  if (!values.length) {
    return <div className="chart-empty">No focus data yet — finish a session to see your volume here.</div>;
  }
  const max = mode === 'Deep' ? 6 : 3;
  const today = new Date();
  const labels = Array.from({ length: 30 }, (_, index) => {
    if (index === 29) return 'Today';
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (29 - index));
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
  }).slice(-values.length);
  const chartWidth = 760;
  const chartHeight = 185;
  const bottom = 154;
  const gap = 11;
  const barWidth = (chartWidth - gap * (values.length - 1)) / values.length;
  const average = mode === 'Deep' ? 3.2 : 0.9;
  const avgY = bottom - (average / max) * 124;
  return (
    <div className="focus-volume-chart">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${mode} focus volume over ${period.replace('D', '')} days`} preserveAspectRatio="none">
        <defs><linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: 'var(--accent-hi)' }} /><stop offset="100%" style={{ stopColor: 'var(--accent-cap)' }} /></linearGradient></defs>
        {[0, 1, 2, 3].map((tick) => {
          const y = bottom - (tick / max) * 124;
          return <g key={tick}><line x1="0" y1={y} x2={chartWidth} y2={y} className="chart-gridline" /><text x="0" y={y - 5} className="chart-axis-label">{tick}{mode === 'Deep' ? 'h' : 'h'}</text></g>;
        })}
        <line x1="0" y1={avgY} x2={chartWidth} y2={avgY} className="chart-average-line" />
        {values.map((value, index) => {
          const height = (value / max) * 124;
          const x = index * (barWidth + gap);
          const y = bottom - height;
          const active = index === values.length - 1;
          return <g key={labels[index]}>
            <rect x={x} y={y} width={barWidth} height={height} rx="5" className={active ? 'chart-bar chart-bar--amber' : 'chart-bar'} />
            <text x={x + barWidth / 2} y="176" textAnchor="middle" className={`chart-x-label ${active ? 'chart-x-label--active' : ''}`}>{labels[index]}</text>
          </g>;
        })}
      </svg>
      <div className="chart-average-tag">Avg {average.toFixed(1)}h</div>
      <div className="chart-today-tag">Today · {(values[values.length - 1] ?? 0).toFixed(2)}h {mode.toLowerCase()}</div>
    </div>
  );
}

export function FlowGauge({ score = 0, caption = 'No sessions yet' }: { score?: number; caption?: string }) {
  return (
    <div className="flow-gauge">
      <svg viewBox="0 0 320 190" role="img" aria-label={`Flow score ${score} out of 100`}>
        <defs><linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" style={{ stopColor: 'var(--accent-cap)' }} /><stop offset="100%" style={{ stopColor: 'var(--accent-hi)' }} /></linearGradient></defs>
        <path d="M30 165 A130 130 0 0 1 290 165" className="gauge-track gauge-track--outer" />
        <path d="M49 165 A111 111 0 0 1 271 165" className="gauge-track gauge-track--middle" />
        <path d="M68 165 A92 92 0 0 1 252 165" className="gauge-track gauge-track--inner" />
        <path d="M68 165 A92 92 0 0 1 252 165" className="gauge-progress" pathLength="100" strokeDasharray={`${score} 100`} />
        <circle cx="228" cy="107" r="4" className="gauge-marker" />
        <text x="160" y="138" textAnchor="middle" className="gauge-caption">{caption}</text>
      </svg>
    </div>
  );
}

export function TimerRing({ progress = 0 }: { progress?: number }) {
  const ticks = Array.from({ length: 60 }, (_, index) => {
    const active = index >= 29 && index < 29 + Math.round(progress * 0.6);
    return <line key={index} x1="120" y1="17" x2="120" y2={index % 5 === 0 ? '31' : '26'} transform={`rotate(${index * 6} 120 120)`} className={active ? 'timer-tick timer-tick--active' : 'timer-tick'} />;
  });
  return <svg className="timer-ring" viewBox="0 0 240 240" role="img" aria-label={`${progress}% of the focus session`}>
    {ticks}
    <circle cx="120" cy="120" r="77" className="timer-ring-inner" />
    <text x="120" y="115" textAnchor="middle" className="timer-ring-value">{progress}%</text>
    <text x="120" y="139" textAnchor="middle" className="timer-ring-caption">of session</text>
  </svg>;
}

export function WeeklyBars({ days = weekDays }: { days?: typeof weekDays }) {
  const max = 5.6;
  const weekdayNames: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
  const accessibleSummary = days.map(({ day, value }) => `${weekdayNames[day]} ${value.toFixed(1)}`).join(', ');
  return (
    <div className="weekly-bars" role="img" aria-label={`Deep work by day: ${accessibleSummary} hours`}>
      {days.map(({ day, value, parts }) => (
        <div className={`day-bar-column ${day === 'Fri' ? 'day-bar-column--best' : ''}`} key={day}>
          <span className="day-bar-value">{value.toFixed(1)}h</span>
          <div className="day-bar-stack" style={{ height: `${(value / max) * 178}px` }}>
            {parts.map((part, index) => <span key={index} style={{ height: `${value > 0 ? (part / value) * 100 : 0}%` }} />)}
          </div>
          <span className="day-bar-label">{day}</span>
        </div>
      ))}
    </div>
  );
}

export function PeakHoursChart({ hasData = false }: { hasData?: boolean }) {
  const values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const width = 660;
  const height = 230;
  const left = 24;
  const right = 638;
  const base = 196;
  const top = 34;
  const step = (right - left) / (values.length - 1);
  return (
    <svg className="peak-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Peak hours from 08:00 to 20:00, with a highlighted focus peak between 09:00 and 11:00">
      <rect x={left + step * 2} y="24" width={step * 4} height="174" rx="12" className="peak-zone" />
      <text x={left + step * 2 + 8} y="43" className="peak-zone-label">09:00 – 11:00{hasData ? ' · your peak' : ''}</text>
      {values.map((value, index) => {
        const x = left + step * index;
        const y = base - (value / 30) * (base - top);
        const highlighted = index >= 2 && index <= 5;
        return <g key={`${index}-${value}`}>
          <line x1={x} y1={y + 3} x2={x} y2={base} className={highlighted ? 'peak-stem peak-stem--active' : 'peak-stem'} />
          <circle cx={x} cy={y} r={highlighted ? 4 : 3} className={highlighted ? 'peak-dot peak-dot--active' : 'peak-dot'} />
        </g>;
      })}
      {[0, 4, 8, 12, 16, 20, 24].map((index, i) => <text key={index} x={left + step * index} y="220" textAnchor="middle" className="chart-x-label">{String(8 + i * 2).padStart(2, '0')}:00</text>)}
      <text x="645" y="40" textAnchor="end" className="chart-axis-label">30 min</text>
    </svg>
  );
}

export function PlannedVsDone() {
  const planned = [0, 0, 0, 0, 0, 0, 0];
  const done = [0, 0, 0, 0, 0, 0, 0];
  return <div className="planned-vs-done" aria-label="Planned versus done from Monday through Sunday">{planned.map((value, index) => <div className="planned-day" key={index}><span className="planned-track"><i style={{ height: `${value}%` }} /><b style={{ height: `${done[index]}%` }} /></span><small>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</small></div>)}</div>;
}
