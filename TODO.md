# Zenith delivery checklist

- [x] **Shared shell, navigation, visual system, and seeded data**
  - Build a web app called “Zenith” as a pixel-perfect replica of the “Zenith - Productivity Analytics Dashboard” design from Dribbble: https://dribbble.com/shots/27866303-Ordo-Productivity-Analytics-Dashboard. Use its Overview, Focus, Projects, and Review shots as visual references for layout, colors, typography, charts, and styling.
  - Use the exact palette: Background `#040303` (near-black); Primary text `#E2D9D0` (warm off-white); Muted labels `#717171` (grey); Accent `#D69B51` (amber/gold) and `#AF5E1B` (burnt orange), with amber gradient for the Insight card, buttons, active states, and chart highlights; Secondary chart tones `#5C2A0D` (deep brown) and `#627C7B` (slate-teal); Cards slightly lighter charcoal than `#040303`, with rounded corners. Do not use green anywhere.
  - Use clean sans-serif for UI labels, nav, numbers, and tables; large display serif / italic serif for page titles (“Today's focus”, “Onboarding spec”, “Brand Refresh”, “Your week in review”).
  - Build all four named pages, with working navigation between Overview, Focus, Projects, and Review. Header includes logo + “Studio workspace”, nav Overview/Focus/Projects/Review, search “Search tasks, notes, people”, amber “+ Start focus” pill, and avatar.
  - Pre-fill realistic demo data everywhere (7 tasks, 6 habits with streaks, notes, projects) so every chart and number shows — no empty states.

- [x] **Overview screen and usable Overview controls**
  - Left column: Library card with four folder tiles (Zenith v2 spec amber folder, Research, Writing, Admin); toggles Morning plan / Deep block / Shutdown review; sound card “Soft rain, brown noise” with waveform and play/pause that actually plays looping rain + brown noise audio using Web Audio, with no external file.
  - Centre: “Monday, 20 October”, large serif “Today's focus”, pill “Week 43”, sub-pills Focus block / Task / Note / Break +; metrics “Deep work today 4.2h” and “Focus score 86/100”, each with a small vertical mini bar chart (grey bars, amber last bars).
  - Right: amber-gradient Insight card “You go 38% deeper before 11am. Based on your last 30 days”; dark Next block card “Next deep block in 18 min. Zenith v2 spec · 2 hours” with play icon.
  - Middle: “Today's flow” horizontal node chain (Morning plan → Deep work · Zenith v2 spec amber highlighted “2.5 hrs left” → Design review → Lunch reset → Research block → Shutdown review) with “Open planner”.
  - Bottom stat row: Tasks done 7 (+2 vs yesterday), Focus sessions 12 (+3), Interruptions 3 (-5), Meetings 2h (-30m); Ask Zenith card “Move my 15:00 call so Research gets two full hours” with suggestion button.
  - Projects table: Zenith v2 spec / Brand refresh / Research / Writing / Admin with Next block, This week hours, Progress %, files, Due, Status (On track / In review / Needs time / Done), and “Sorted by who needs it most”.

- [x] **Focus screen, timer, chart, and next-week plan**
  - Show “Deep work · Session 3 of 4 in flow”, huge serif “Onboarding spec”, “Finish the flow and hand it to Lena before 3 pm”, and stat chips including “Focused today 3h 45m”.
  - Right vertical timeline: 09:00 Deep work Wireframes, 10:00 Deep work Copy pass, 11:00 Standup, 12:00 Onboarding spec (amber selected), 13:00 Inbox, 14:00 Brand refresh review.
  - Timer card: “Time left 41:42 / 60 min”, Started 13:20 · Ends 15:00 · Sessions 0, circular tick-ring progress 54%, Pause / End session buttons. Timer must actually count down and work; Reset returns to 60:00 paused with a 0% ring.
  - “Focus volume” bar chart with Deep/Shallow tabs, “48.8h deep focus”, “81% of plan”, tall grey bars, Today in amber “4.20h deep”, dashed “Avg 3.2h” line. The 7D / 14D / 30D selectors change chart data and date labels.
  - “Flow score 86/100”, “+8 vs weekly avg”, semi-circular amber gauge, “3 of 4 sessions”, sub-scores Wireframes 82, Copy pass 88, Onboarding spec 86.
  - “Next week's focus plan” calendar grid and Brand refresh card “Review the moodboard with Mia · Mon 27 Oct · 14:00–15:00 · 60 min · 3 files prepared by Zenith” with “Hold this block” button.

- [x] **Projects overview and selectable Brand Refresh detail**
  - Reproduce the original Dribbble Projects overview as the main Projects view, and make the requested Brand Refresh detail view available by selecting its row.
  - The detail view has heading “Project”, huge serif “Brand Refresh”, “68% complete” pill, description “A lighter, more confident identity for the studio — built to travel across print, product and pitch decks.”, and tabs Overview / Milestones / Files / Activity.
  - Milestone timeline: Concept approved (amber check), Moodboard (selected), First draft, Final handoff.
  - Deliverables table (Brand guidelines v2, Social templates, Presentation deck, Logo files) with status chips, owner, date, and mini progress bars.
  - Right rail: On track card (Due Nov 14, Progress 68%, Budget, Next milestone), Zenith's note card, and Files card.
  - Original Projects overview includes real project data for Zenith v2 spec / Brand refresh / Research / Writing / Admin, and working row selection to the Brand Refresh detail.
  - Overview counts derive from the shared project state: five total projects, four active, and three on track.

- [x] **Review screen and actionable weekly recommendations** (with the documented data reconciliation below)
  - “Your week in review”, “Week 43 · 13–19 Oct · 21.6h of deep work. Your best week since August.”
  - Stat cards: Sessions 14 (+3), Average length 72 min (+8 min), Interruptions 11 (-31%).
  - “Deep work by day” stacked bars Mon–Sun (Mon 3.4h, Tue 4.1h, Wed 3.0h, Thu 4.8h, Fri 5.2h amber tallest, Sat 0.8h, Sun 0.9h); summary This week 21.6h (+4.4h), Last week 17.2h, Best day Friday 5.2h.
  - Week arrows update the date range, metrics, work-item list, and daily chart together for sample weeks 42–44.
  - Data note: the requested daily bars (Mon 3.4h, Tue 4.1h, Wed 3.0h, Thu 4.8h, Fri 5.2h, Sat 0.8h, Sun 0.9h) sum to 22.2h, while the repeated weekly total is 21.6h. To preserve the repeated 21.6h weekly total, the app uses Saturday 0.2h instead of the requested 0.8h; this choice is visible in the chart and its accessible summary.
  - “Zenith's take — Protect your mornings. That is where your best work happens.” with points “78% of deep work landed before noon”, “01 Friday had no meetings and was your peak”, “02 Short blocks after 16:00 rarely held”, and a “Read the full review” button.
  - “Peak hours” dot/line chart 08:00–20:00, peak zone 09:00–11:00 amber.
  - “What the week paid for” list with hours; footer “Total deep work 21.6h · 11 interruptions declined” with segmented amber/brown bar.
  - “Next week” toggles (Block 09:00–11:00 daily on, Move standup to 11:15 on, Drop blocks after 16:00 off), “If you apply these +2.4h deep work next week”, “Apply 2 changes” button.

- [x] **Functional interactions, visual comparison, and handoff**
  - Every button must actually work (navigation, timer, play/pause sound, toggles, tabs, add/check tasks, search).
  - After building, screenshot the result, compare side-by-side with the original Dribbble shots, and fix visible differences (spacing, colors, fonts, sizes, alignment) until it matches as closely as possible; perform the comparison and fixing before delivery.
  - Deliver a working web app with a live link and/or downloadable code; package the runnable source as a downloadable ZIP.
