# Trời Nam world — dev harness

Standalone Vite page for locally reviewing `apps/web/src/features/troi-nam/world/troi-nam-world-scene.ts`
outside the Next app, before it's wired into the real `/troi-nam` page (Task 4 of
`docs/superpowers/plans/2026-09-30-troi-nam-plan-4-world.md`). Never shipped in product —
this folder isn't part of any workspace build.

## Run it

```bash
pnpm exec vite prototype/revamp-2026-09/troi-nam-world
```

Opens on `http://localhost:5173` (or the next free port). `main.ts` imports the factory
by relative path straight from `apps/web/src/...`, so `three` resolves from
`apps/web/node_modules` — no separate install needed here, and no duplicated scene code.

## What Task 1 proves

Right now the scene is a placeholder (a lit ground plane, no karst yet) — this harness
exists to verify the factory's lifecycle, not the art direction:

- **Progress slider + phase-capture buttons** (`p=0/.375/.625/1`) drive `setProgress`.
- **Pause/Resume** exercises `setActive`, including RAF loop stop/restart.
- **Dispose + recreate** exercises idempotent `dispose()` and the race where a *new*
  init starts (or a dispose happens) while a previous `createTroiNamWorld(...)` promise
  is still pending — the stale handle must never leak in after the fact. Click it
  repeatedly while watching the browser's dev tools GPU/context counters: they should
  never climb.

## Status

Task 1 only. Real karst/water/rays/mist land in Task 2, dusk/night/stars in Task 3,
Next integration in Task 4, quality tiers/degradation in Task 5.
