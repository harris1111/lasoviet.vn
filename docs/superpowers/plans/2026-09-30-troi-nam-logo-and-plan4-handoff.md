# Trời Nam — Handoff: opening logo draw-in + Plan 4 (3D world)

Session that wrote this did Plan 3 (7 motion slices) plus a reduced-motion hardening pass and the closing lantern scene, then ran low on quota. Read this file first; it's the whole cold-start.

## State right now

- Branch `feat/troi-nam-homepage`. Latest commit `1321ee5`.
- PR #239 (`fix+feat(troi-nam): reduced-motion hardening + closing lantern scene`) is **open, not merged** — check `gh pr view 239` before doing anything else; merge it first if it's still sitting there, or reconcile if someone else merged/changed it.
- Preview: `/troi-nam` (noindex), both locales work.
- **Done:** Plan 1 (assets, hero), Plan 2 (all 10 sections re-skinned, live v3 components unchanged), Plan 3 (8 motion slices, CSS/IntersectionObserver only, zero new dependencies):
  1. Hero dawn→dusk/night scroll crossfade (desktop only; L03 has no phone crop)
  2. Explore: decorative 12-dot ring resolves into the real palace grid on scroll-in
  3. Need cards stagger-reveal on scroll-in
  4. Selected-palace relation rays glide instead of snapping
  5. Discipline links reveal via their own pre-existing (previously inert) `data-reveal` markup
  6. Two gold leaves fall inside the "unlock with Lá" step (Value)
  7. FAQ rows stagger-reveal on scroll-in
  8. Two hoa đăng lanterns float on the closing CTA
  - Plus a defense-in-depth `troi-nam-reduced-motion-guards.css` (imported after `troi-nam.css` in `global.css`) that forces every motion target to its static state under `prefers-reduced-motion`, closing a gap where a live OS-level toggle mid-session could leave something stuck mid-transition.
- **Not started:** opening logo draw-in, Plan 4 (3D world), Plan 5 (readiness + switchover to `/`). No Three.js/GSAP/Lenis dependency installed.

## A ChatGPT package landed mid-session — read before trusting it again

`/Users/admin/Downloads/troi-nam-max-assets-claude-package-2026-09-30.zip` (also unzipped under this session's scratchpad, now gone). It was accurate — it read the real merged commits correctly, not guesses — and useful for the one thing that survived review (the reduced-motion guard above). Its content-reconciliation doc (`docs/superpowers/plans/2026-09-30-troi-nam-content-reconciliation.md` — not copied into the repo, was package-only) argued several trust/privacy copy claims need softening. **Not applied.** It's arguing for a stricter honesty standard than FD-108 already settled with the founder (revenue-max, VN-law-only boundary). If a similar package shows up again, keep doing exactly this: verify its code claims against the real repo before importing anything, and route any content/policy suggestions to the founder instead of applying them.

## Opening logo draw-in

Founder's vision: "opening logo draw-in" at the start of the Trời Nam experience.

**The constraint that will trip you up:** the site header's logo is `next/image` pointing at static files (`/brand/lasoviet-logo-ngang-vang-son.svg` etc.) in `apps/web/src/components/site-header.tsx` — a shared component used on the **live homepage too**. It is not inline SVG markup, so you can't stroke-dasharray-animate it in place, and editing that component risks changing the live site, which every other slice this session deliberately avoided.

**Before building anything:** check memory/founder for "Colophon v5" — a separate, already-finalized logomark was pushed to a branch called `product/bg-texture-consistency` and, as of this session, was **not yet merged**. Building a detailed draw-in animation around the current header SVG could be wasted work if that's about to be replaced. Ask the founder, or check that branch, first.

**Suggested approach, not a decision:** don't touch `SiteHeader`. Build a Trời-Nam-scoped intro instead — an inline SVG copy of the logomark rendered directly in `TroiNamHero` (or a new small wrapper), that draws in (stroke animation or mask-reveal) once on load and then gets out of the way, matching the pattern every other slice used: scoped under `.tn`, safe static fallback with no JS, `prefers-reduced-motion` just shows it solid instantly. Screenshot it before deciding it's right — this is exactly the kind of "does this look good" call that shouldn't be delegated to ChatGPT.

## Plan 4 (3D world)

Full spec already written: `docs/superpowers/plans/2026-09-30-troi-nam-plan-4-world.md` (5-task breakdown: harness, terrain/water/rays/mist, day→night→stars, 12-palace crossfade handoff, quality/fallback tiers) and `docs/superpowers/specs/2026-09-30-troi-nam-effects-contract.md`. Both were drafted by ChatGPT without being able to render the page — treat exact timing/FPS/quality numbers as proposed defaults, not approved results, same as every other ChatGPT doc this project has used. Read them for structure, verify everything visually yourself.

**The one fact that will break things if missed:** `TroiNamHero` (`apps/web/src/features/troi-nam/troi-nam-hero.tsx`) already creates and disposes the `.tn` root's only `createTroiNamProgress` owner (`troi-nam-scroll-progress.ts`) — `createTroiNamProgress` throws if called twice on the same root. `TroiNamExplore` already listens passively via the `troi-nam:progress` `CustomEvent` the owner dispatches, rather than creating a second owner. A new world/motion controller must do one of:
- keep Hero as the owner and have the world controller also listen via the event (cheap, no refactor), or
- move ownership into a new shared controller in one bounded commit, and delete Hero's `createTroiNamProgress` call in that same commit (don't leave two competing creators mid-refactor).

`scenePhases()` and `smoothstep()` (`troi-nam-motion-math.ts`) are already built, tested, and used by two of the 8 slices — reuse them for the world's phase weights rather than re-deriving the math.

**Suggested first slice, matching how the other 8 went:** don't start with the full task list. Pick the smallest visible piece — e.g. task 1's harness (bare Three.js canvas mounted behind the existing static hero plate, doing nothing but rendering a flat plane) — get it on screen, screenshot it, confirm the render/dispose lifecycle is clean (mount, scroll, unmount, remount in dev Strict Mode shouldn't leak canvases or RAF loops), *then* move to actual terrain. Building the whole world end-to-end before the first screenshot is exactly the failure mode the original Plan 3 handoff warned about.

## How to work this (carried over, still true)

1. Don't delegate 3D/motion "does this look right" calls to ChatGPT. Fine for: math/logic with tests, static asset prep, reviewing an already-pushed diff (see above — that's what actually worked this session).
2. Build one small effect at a time, screenshot it, then move on. Playwright + local Chrome pattern used all session: `playwright-core` in `node_modules/.pnpm`, `executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`, headless. Kill stale `next dev` on port 3000 first (`lsof -i :3000 -sTCP:LISTEN -t`, then `kill`) — don't kill unrelated processes that also show up in a plain `lsof -i :3000` (browser tabs with an open connection show up too).
3. Test `prefers-reduced-motion: reduce` for every new effect (Playwright: `newPage({ reducedMotion: "reduce" })`, or `page.emulateMedia({ reducedMotion: "reduce" })` mid-session to catch the live-toggle case the guards CSS fixes).
4. Commit each slice separately with a real message. PR per batch into `master`, not a direct push — and note: this session found that `gh pr merge` is blocked by an auto-mode permission classifier here. Push, open/update the PR, run/wait on `gh pr checks`, then hand the PR link to the founder to click merge themselves.
5. Founder's standing rule: minimal review rounds, one sign-off per plan not per task. A lean checklist per effect is enough; this doc is intentionally short for the same reason.
