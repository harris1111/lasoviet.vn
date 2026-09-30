# Trời Nam Plan 3: Motion Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task. Checkboxes record actual execution, not intent.

**Goal:** Enhance the complete static preview with scoped reveals and scroll choreography while preserving all original controls and fallback content.

**Architecture:** A client controller owns one `.tn` root, GSAP context, optional Lenis and a deterministic progress bridge. Delivered pure math and native measurement bridge are shared with Plan 4; do not implement a second producer. Progressive enhancement leaves server-rendered content visible by default.

**Tech Stack:** Existing Next/React/TypeScript; GSAP + ScrollTrigger and Lenis resolved by Claude's local version preflight.

**Spec:** `docs/superpowers/specs/2026-09-30-troi-nam-effects-contract.md` (proposed defaults); existing Plan 1 roadmap and Plan 2 constraints.

## Global constraints

Preview route only; keep live homepage untouched. No rewrite of birth form, Explore, FAQ or testimonial behavior. All selectors root-scoped. Native scroll and static content always available. No invented product copy/colors/fonts. Read root/app guidance and installed Next docs before integrations. Do not install or code external APIs from memory.

## Review focus

- Failed imports/no observer: content remains visible (Task 2).
- Reduced-motion changes while active: no orphan smooth-scroll loop or hidden content (Task 2).
- Wizard/dialog/swipe: input and nested scrolling remain native (Task 3).
- Deep links, fonts/resizes and restored scroll: correct deterministic p (Task 4).
- Strict Mode/remount: one ticker callback and full cleanup (Tasks 2–4).

### Task 1: Dependency preflight and shared motion math

**Files:** modify `apps/web/package.json`, lockfile after local preflight; integrate the supplied `troi-nam-motion-math.ts`, `.test.ts` and `troi-nam-scroll-progress.ts`. These files are already implemented in the completion package; run the supplied checks rather than rewriting them.

**Interfaces:** export `clampProgress` / `scenePhases` exactly as the spec; pure code, no window/GSAP/Three imports.

- [ ] Read local installed motion skills and relevant Next docs; inspect existing package/lockfile and library official docs. Record resolved versions/imports/cleanup APIs in execution evidence before adding workspace dependencies.
- [x] Standalone math contract tests supplied and verified RED→GREEN here; equivalent Vitest file supplied. Original assertions: clamp(-1)=0, clamp(2)=1, NaN/Infinity=0; p=0 phases=0; p=0.375 gives dusk=0.5; p=0.625 night=0.5; p=0.875 chart=0.5; p=1 all=1; dawn/dusk/night weights sum to 1. Claude must run the Vitest file in the repository.
- [x] Smoothstep phases implemented with exact intervals and standalone Node checks passing.
- [ ] Claude: run repository Vitest and TypeScript checks with full exit status; resolve actual local failures before integrating dependencies.
- [ ] Commit only bounded dependency/math changes using English conventional message.

### Task 2: Scoped reveal controller with reversible lifecycle

**Files:** create `troi-nam-motion.tsx`; modify Trời Nam CSS suffix and preview page only.

**Interfaces:** `TroiNamMotion()` is mounted once under `.tn`; its effect resolves that root and scopes every query/context to it. No shared `HomepageV3Motion` mounting.

- [ ] Implement lazy library initialization with catch/finally cleanup and reduced-motion subscription. Only set `data-troi-nam-motion-ready` after success. Reveal headings/cards (exclude form inputs and dialog contents) using proposed opacity 0→1, translateY 16→0, duration 0.18s matching the existing standard motion token, stagger 0.06s capped at 0.18s. Preserve no-JS SSR visibility and restore styles/attributes on failure, reduce and unmount.
- [ ] Add one scoped desktop decorative parallax pass capped at 16px; coarse pointers/reduced-motion use zero. Do not transform interactive chart hit targets or form containers.
- [ ] Verify browser cases: JS disabled, blocked motion import, reduced before load and toggled active; all headings/cards visible and all controls usable. Verify Strict Mode / route remounts yield one observer/ticker, then commit.

### Task 3: Lenis integration without input capture

**Files:** extend `troi-nam-motion.tsx`; CSS only for scoped supported state.

**Interfaces:** one scroll controller per root; integration uses actual installed Lenis APIs, driven by the single chosen animation clock and synchronized to ScrollTrigger. Do not use two simultaneous RAF clocks.

- [ ] Enable only non-reduced fine-pointer tier initially; touch remains native. Mark/exclude nested scrolling surfaces through documented library options observed locally. Suspend on modal focus/body scroll locking, and resume on close without changing focused element or scroll position.
- [ ] Verify mouse wheel, PageDown/Home/End, all anchor links, birth form inputs/selects, FAQ, testimonial swipe/dialog and final CTA focus return. Reduced-motion toggling destroys Lenis and restores native scrolling immediately.
- [ ] Check hide/resume/unmount removes ticker callback, listeners and controller once. Commit only after actual browser evidence.

### Task 4: Deterministic scene bridge

**Files:** extend motion controller; add focused progress browser coverage using existing repo harness after inspecting it.

**Interfaces:** consume the supplied root-local progress controller: immutable snapshot `{ progress, range, rangeValid, reducedMotion }`, `read/refresh/subscribe/dispose`, CustomEvent and latest `data-troi-nam-progress`. It already computes hero-top→Explore-top document offsets. Do not duplicate its listeners or producer event. Plan 4 subscribes without importing GSAP.

- [x] Native bridge implements synchronous initial geometry, font/size/viewport updates, frame batching and cleanup; deterministic platform checks pass.
- [ ] Integrate one bridge per root. Call refresh after ScrollTrigger pin/layout changes; if Lenis leaves window.scrollY as the documented real position, native progress remains valid. If it uses a virtual scroller, adapt one producer to its coordinate space, remove the native scroll producer and rerun equivalence tests. No duplicate clocks/events.
- [ ] Verify forward/reverse produces identical p at same offsets; anchors and resize update p; invalid/zero ranges do not divide by zero. Publish latest value on refresh so delayed world loading receives current state.
- [ ] Re-run focused math tests, local typecheck, one 390/1440 browser pass including reduce/failure/modal cases. Record real errors and captures; commit. Plan 3 is complete only after these checks, not merely after source delivery.
