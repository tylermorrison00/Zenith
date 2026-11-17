// Real calendar helpers. Week numbers and ranges are always derived from
// today's date, never from hardcoded demo values.

export function currentWeekNumber(date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

// Monday–Sunday label for the week `offsetWeeks` away from the current week,
// e.g. "13–19 Oct" or "27 Oct – 2 Nov".
export function weekRangeLabel(offsetWeeks = 0, date = new Date()): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const monthName = (x: Date) => x.toLocaleString('en-US', { month: 'short' });
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${monthName(sunday)}`;
  }
  return `${monday.getDate()} ${monthName(monday)} – ${sunday.getDate()} ${monthName(sunday)}`;
}

export function todayLabel(date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}
