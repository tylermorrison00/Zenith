# Zenith — Implementation Plan

## Approved direction

Build a static, browser-only productivity dashboard named **Zenith**, faithfully styled after the supplied “Zenith — Productivity Analytics Dashboard” Dribbble shots. The user approved a hybrid Projects experience: the Projects route opens with the original Dribbble portfolio overview; selecting Brand Refresh opens the detail view specified in the pasted brief. The pasted brief is authoritative for exact copy and values where it differs from the screenshot. The explicit “do not use green” constraint is authoritative over small green accents visible in the reference. Preserve its 60-minute Focus timer text.

## Product and implementation approach

Use React, TypeScript, Vite, and React Router for five client routes: `/` (Overview), `/focus`, `/projects` (Projects overview), `/projects/brand-refresh` (Brand Refresh detail), and `/review`. Serve a static SPA on the configured port 3000; no backend, database, user accounts, or external API are required. Seed realistic sample data for seven tasks, six streak-bearing habits, notes, focus sessions, and multiple projects. Persist user changes in localStorage, including task completion, created tasks/notes, ritual/review toggles, selected tabs, and timer state.

Use custom CSS/SVG for all charts and rings to keep their shape and exact display deterministic. Implement the rain and brown-noise soundscape procedurally with looping Web Audio noise buffers and filter nodes, requiring no external audio file. The Focus timer is a live countdown with pause/resume/end behavior. Search filters seeded and user-created tasks, notes, and projects. Buttons that add, complete, select, toggle, start, pause, hold, apply, or navigate must update visible state and provide useful feedback.

Create the route manifest before starting the development server. Configure TypeScript diagnostics before the first application-code batch. Build with pinned pnpm and Vite; declare a static build and output directory in WebDev config. Set `app.config.ts` to a durable HTTPS URL for the custom Zenith project mark before checkpointing. Capture the rendered routes, compare screenshots to the user-supplied Dribbble screens, make a targeted visual correction pass, run the production build, package the source as a downloadable ZIP, and save the delivered version as a checkpoint. Do not enable Auto Publish or publicly publish unless separately requested.

## Project structure

- `index.html`, `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`: pinned toolchain, reviewed lifecycle-script permissions, and the Vite app entry point.
- `public/manus-routes.json`: declarations for the five client-side page routes; `public/zenith-mark.svg`: the dashboard’s small geometric brand mark.
- `src/main.tsx` and `src/App.tsx`: application bootstrap, shared shell, navigation, route declarations, and global demo-state provider.
- `src/components/`: reusable header/search, sidebar library/rituals/audio, cards, project rows, dialogs, chart primitives, and action feedback.
- `src/pages/`: Overview, Focus, Projects overview, Brand Refresh detail, and Review page compositions.
- `src/data/seed.ts`: realistic initial tasks, habits, notes, projects, sessions, and analytics values.
- `src/lib/storage.ts`, `src/lib/audio.ts`, and `src/lib/timer.ts`: local persistence, procedural Web Audio, and countdown behavior.
- `src/styles/tokens.css` and `src/styles/app.css`: exact palette, typography, component styling, responsive layout, and interactions.
- `app.config.ts`: durable project-logo metadata used by the WebDev checkpoint hook.

## Design system

**Design Movement:** reference-matched dark productivity dashboard, borrowing the quiet precision of a premium creative-studio analytics workspace. **Core Principles:** calm, high-contrast hierarchy; compact, data-rich surfaces; warm emphasis only for active focus and insight; consistent interactive affordances. **Color Philosophy:** near-black surfaces reduce glare; warm off-white keeps text legible; amber/burnt orange identify focus and important actions; deep brown and slate-teal are limited to supporting chart data. Use exactly `#040303`, `#E2D9D0`, `#717171`, `#D69B51`, `#AF5E1B`, `#5C2A0D`, and `#627C7B` as the palette anchors; never use green. Cards use a subtly lighter charcoal and restrained borders.

**Layout Paradigm:** a wide workspace with a compact top navigation, a narrow library/ritual sidebar on Overview, and content arranged in reference-matched asymmetric panels; on Focus and Review, preserve the original left-to-right metric, analysis, and utility-panel hierarchy. On narrow screens, stack panels in reading order and make nav and tables usable without horizontal page overflow. **Signature Elements:** subtle dotted work-surface texture; rounded charcoal cards with hairline borders; segmented amber focus charts and a tick-ring timer. **Interaction Philosophy:** direct, reversible, low-friction controls with clear active/paused/selected states, keeping data visible while actions happen. **Animation:** short, restrained opacity/color/transform transitions; a slow subdued sound-active pulse only while audio plays; no springy motion or distracting chart animation.

**Typography System:** DM Sans for navigation, labels, metrics, and tables; Instrument Serif, including italic display styling, for large page titles and selected editorial callouts. Preserve light, spacious display typography and small muted utility copy. **Brand Essence:** a composed productivity workspace for creative studios that makes deep work, project progress, and weekly patterns legible; **calm, precise, warm**. **Brand Voice:** concise and observant, with practical suggestions; examples: “You go 38% deeper before 11am.” and “Protect your mornings. That is where your best work happens.” **Wordmark & Logo:** pair the Zenith-style warm folder symbol used in the app shell with a bespoke geometric Zenith “Z” horizon mark for the platform project identity; do not render a default-font brand word as a substitute for the mark. **Signature Brand Color:** amber `#D69B51`.

## Page scope

Overview includes the Studio workspace header, nav, search, Start focus action, Library folders, Morning plan/Deep block/Shutdown review controls, procedural Soft rain/brown noise, date/title/week and quick-add controls, metrics and mini-bar charts, Insight and Next block cards, Today’s flow chain, daily stats, Ask Zenith suggestion, and a populated five-project table. Focus includes the session heading and task, focus metrics, six-event timeline, working timer/ring, Deep/Shallow chart tabs, Flow score gauge, next-week calendar, and Brand Refresh hold-block card. Projects includes the original project analytics overview and table plus the selectable Brand Refresh detail page with milestones, deliverables, tabs, and right rail. Review includes all requested weekly metrics, day bars, Zenith’s take, peak-hours plot, time allocation, and actionable next-week toggles.
