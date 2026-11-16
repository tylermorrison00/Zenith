# Zenith

A browser-only productivity dashboard inspired by the Zenith creative-workspace reference. It includes Overview, Focus, Projects, Brand Refresh detail, and Review routes, with seeded demo data and working local interactions.

## Run locally

Requires Node.js 20 or newer and pnpm 11.25.0 (the exact package manager is pinned in `package.json`). From this directory:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local Vite URL printed by the command. For a production build, run `pnpm build`; the static output is written to `dist/`.

## Demo behavior

Tasks, notes, project creation, uploaded project-file metadata, focus-plan additions, habits, rituals, review rules and applied plan state, the held focus block, and timer state persist in browser local storage. Applying Review recommendations updates the shared Focus plan. The ambient rain and brown-noise soundscape is synthesized with Web Audio after selecting Play; it does not download an audio file. Project file selection stores metadata in this browser-only demo; no server or database is required.
