# Trời Nam Plan 5: Readiness and Switchover Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task-by-task; follow repository release rules.

**Goal:** Make the full animated preview accessible, performant and bilingual, then prepare a reviewable homepage switchover PR.

**Architecture:** Retain progressive enhancement and original functional components. Fix measured bottlenecks and accessibility regressions before route/SEO integration. Keep the old homepage recoverable through version control.

**Tech Stack:** Existing Next/next-intl/Playwright/vitest and repository route registry; verified motion/world libraries from Plans 3/4.

**Spec:** effects contract, original roadmap, root `AGENTS.md`, route registry and founder decisions.

## Global constraints

Canonical public domain is `https://lasoviet.net`. Route registry is the sole route catalog. Preserve preview noindex until a deliberate switchover; never publish preview as indexable accidentally. Quotes stay verbatim in Vietnamese with lang annotations even in EN. No price packs or invented claims. Direct owner instructions control release authorization.

## Review focus

- Slow/no-JS/low GPU: functional static page (Task 1).
- Both themes and keyboard/dialog/reduced states: legibility/focus (Task 2).
- EN expansion and quote language: overflow/i18n parity (Task 3).
- Root vs preview canonicals/robots/sitemap: no duplicate indexable homepage (Task 4).
- Rollback/deployment smoke: recoverable previous root (Task 4).

### Task 1: Measured performance and payload fixes

**Files:** change only measured affected Trời Nam modules, presentation inputs, scoped CSS or assets; no broad v3 rewrites.

- [ ] Collect comparable static and enhanced traces at 390/1440 on named devices. Record LCP/CLS, lazy chunk compressed size, image requests and active world frame times against proposed contract targets.
- [ ] Inspect hidden original photo downloads caused by wrapper restyling. If significant, introduce only opt-in presentation inputs to shared components with original defaults intact, as with portraits; verify live homepage regression. Prefer responsive/lazy image fixes and reduced overdraw before new optimization dependencies.
- [ ] Confirm fallback-tier zero Three allocation and offscreen zero render work. Re-measure once after fixes; record remaining limits honestly.

### Task 2: Accessibility and functional flow closure

**Files:** focused fixes and existing E2E coverage after inspecting the actual harness.

- [ ] Keyboard test header, birth form, every CTA, Explore, Needs, FAQ, testimonial filters/pause/dialog and final CTA focus return. Preserve labels, aria states, visible focus, native hidden, modal focus trap/restore and nested scrolling.
- [ ] Verify 320/390/879/880/1440 with normal/reduced motion, both themes and zoom. Ensure no horizontal page overflow and controls meet existing 44px touch policy; canvas has no focus/input roles. Fix measured contrast issues using existing tokens.
- [ ] Verify main homepage happy path to chart creation and back, preserving existing privacy/anonymous retention behavior; no birth values or personal content sent to animation/telemetry. Run affected regression tests.

### Task 3: EN and content parity

**Files:** `apps/web/messages/{vi,en}/troi-nam.json` only when required; reuse existing `homepage-v3` keys. Locale metadata work remains within actual page conventions.

- [ ] Audit EN/VI key and semantic parity without rewriting approved Vietnamese copy or reader quotes. Longer English text must fit every mobile card and CTA. No new English key without its matching Vietnamese key.
- [ ] Run `pnpm i18n:check`; review VI/EN rendered page including quote lang annotations and localized links. Preserve Value `showPacks=false` and FD-089 forbidden-content constraints.

### Task 4: Reviewable switchover and release evidence

**Files:** `apps/web/src/app/[locale]/page.tsx`, preview page as required, `config/route-registry.yml`, existing SEO/robots/sitemap tests and relevant metadata modules found by inspection.

- [ ] Compare current root routing/metadata/registry behavior before editing; prepare Trời Nam root composition with verified existing route conventions. Specify exactly whether preview remains noindex or redirects; do not create a second hand-maintained route catalog. Add matching registry/robots/canonical/sitemap regression checks for the selected transition.
- [ ] Retain previous root via preceding git revision and document rollback commit/redeploy command appropriate to actual deployment workflow; no live server/nginx changes in a source-only task.
- [ ] Run required pre-push `pnpm i18n:check`, `pnpm lint`, `pnpm typecheck`; run production build, relevant E2E and regressions. Record complete command exits, browser console errors and screenshots. Fix failures before opening PR.
- [ ] Prepare dedicated feature-branch PR to master with final behavior, actual validation, performance evidence and rollback. Never push directly to master. Merge/deploy only under owner authorization already present or request it for the concrete verified result.
- [ ] After authorized deployment smoke root VI/EN, metadata, static fallback and birth-form happy path. Record deployment evidence before marking an external task Done; do not update Kaneo/send messages unless independently authorized.

## Immediate local continuation order

D+E and portraits are already committed at the baseline. Do not reapply old Plan 2 ZIPs. Integrate the additive support package, verify `/vi/troi-nam`, then finish Plan 3, Plan 4 prototype, Plan 4 integration, Plan 5. The founder gets a usable local static homepage before waiting for 3D completion.
