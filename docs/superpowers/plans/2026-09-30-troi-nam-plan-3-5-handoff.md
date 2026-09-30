# Trời Nam — Handoff to start Plan 3–5

Session that wrote this ran out of quota right after finishing Plan 1–2. Read this file first; it's the whole cold-start.

## State right now

- Branch: `feat/troi-nam-homepage`, pushed, clean. Preview: `/troi-nam` (noindex), both locales work.
- **Done:** Plan 1 (asset pipeline, hero) + Plan 2 (all 10 sections re-skinned, re-using live v3 components unchanged — no new interaction logic). Full page is static; zero motion, zero 3D.
- **Also done, uncommitted-to-behavior:** `troi-nam-motion-math.ts` + `troi-nam-scroll-progress.ts` — pure scroll-progress math and a native-scroll measurement bridge. Nothing mounts or reads them yet. Read `docs/superpowers/plans/2026-09-30-troi-nam-claude-integration-contract.md` for their exact API before using them — it also lists real bugs already found (one already fixed: `SiteHeader` needed `currentPath`).
- **Not started:** Plan 3 (motion), Plan 4 (3D world), Plan 5 (readiness + switchover to `/`). No GSAP/Lenis/Three dependency installed yet.

## What's already in the repo as reference (read, don't treat as final)

- `docs/superpowers/plans/2026-09-30-troi-nam-plan-3-motion.md`
- `docs/superpowers/plans/2026-09-30-troi-nam-plan-4-world.md`
- `docs/superpowers/plans/2026-09-30-troi-nam-plan-5-readiness.md`
- `docs/superpowers/specs/2026-09-30-troi-nam-effects-contract.md`
- `docs/superpowers/plans/2026-09-30-troi-nam-claude-integration-contract.md` (real findings, corrections, ownership split)
- `docs/superpowers/plans/2026-09-30-troi-nam-final-acceptance-checklist.md`

ChatGPT drafted these without being able to render the page — its own contract says the timing/FPS/phase numbers are "proposed defaults, not approved render results." Use them for structure and the two real bugs they flag, not for exact values. Don't ask ChatGPT to make them more detailed — the missing detail (does this camera move feel right, does this run at 60fps on the test device) only resolves by building it and looking, which is this session's job alone.

## Founder's original vision (for what "done" looks like)

Founder shared a table titled "Hướng B chi tiết, từng khối trang" describing the full cinematic experience: opening logo draw-in, 3D Tràng An hero with parallax, scroll-driven dawn→night→stars-into-12-palace-grid, animated palace rays on selection, stacked scroll-triggered need cards, gold leaf falling at the "unlock with Lá" step, closing lantern scene. That's the actual target — Plan 1–2 were deliberately just the safe foundation, not a watered-down attempt at it.

## How to work this (learned the hard way this session)

1. **Do not delegate 3D/motion implementation to ChatGPT.** Every previous attempt to delegate anything needing a rendered/visual judgment call cost more round-trips than doing it directly. ChatGPT is fine for: pure math/logic with tests, static asset generation, code review of a pushed diff. Not fine for: "does this look right."
2. **Build one small effect at a time, screenshot it, then move on** — not a big upfront plan executed end to end. Reuse the Playwright screenshot pattern already used throughout this branch's history (`playwright-core` is in `node_modules/.pnpm`, launch with the local Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`).
3. Before writing any Next.js/React code, skim `apps/web/AGENTS.md` — this Next.js fork has undocumented-upstream breaking changes; its own internal docs are at `apps/web/node_modules/next/dist/docs/` (gitignored, only visible locally).
4. Kill any stale `next dev` on port 3000 before starting a new one (`lsof -i :3000`, then `kill <pid>`) — this bit a previous session.
5. Founder's standing rule: minimal review rounds. Don't write a full TDD-style plan doc for this — it's exploratory/visual work; a lean checklist per effect is enough. Merge still needs a PR + An/Lãm's sign-off per FD-097 (CLAUDE.md), not a direct push to master.

## Suggested first slice

Pick ONE thing from Plan 3/4 and ship it screenshot-verified before touching anything else — e.g. the hero's day→night scroll transition using the already-built `scenePhases()` math, applied to the existing static plate via crossfade/opacity first (cheap, no Three.js yet), before attempting the 3D karst scene itself.
