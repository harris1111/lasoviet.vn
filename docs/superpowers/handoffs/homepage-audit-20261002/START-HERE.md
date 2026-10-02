# Claude handoff: verify and merge homepage audit execution

## Owner authorization

On 2026-10-02 the owner explicitly requested pushing this execution branch and preparing a handoff for Claude to check and proceed with merging. Claude is authorized to repair defects in this implementation and merge the reviewed PR into `master` after the gates below pass. This instruction does not authorize bypassing required CI, weakening tests, unrelated changes or manual production infrastructure changes.

Repository: `harris1111/lasoviet.vn`.
Branch: `feature/homepage-audit-execution-20261002`.
Implementation commit: `27f0267`.
Original base: `ee1cdb4`.
Target: `master` (never commit or push directly to master).
Canonical website: `https://lasoviet.net`.

## Read before making changes

1. Root and `apps/web` AGENTS.md/CLAUDE.md; current owner decisions and active brand references.
2. This file and `docs/superpowers/reports/2026-10-02-homepage-audit-implementation.md`.
3. `execution-plan.md` in this directory, then the relevant portions of `original-audit.md`.
4. Actual diff against current master and `tasks/verification.md`.

These two original planning documents are preserved sources. Their claims that no implementation has happened describe the planning date, not this branch. Their old comparison disclosure/static testimonial proposals are overridden by the owner rules below. Do not replay their patches over this implementation.

## Binding product rules

- Only comparison evidence must be permanently visible. Ordinary wrapper, no details/summary/toggle, including an initially-open disclosure.
- Other disclosures remain allowed. Mobile birth form can start closed, but its original hook and subtree remain mounted. Secondary methods can start closed.
- FAQ opens the first question initially, with normal toggles for every question.
- Testimonials autoplay physically right to left every six seconds when eligible. Preserve all 15 original excerpts/full quotes/names/attributions unchanged. Settled windows: two mounted records on phone/tablet, three desktop; at most three/four during movement. Phone shows one full card and a 32px preview. Preview/incoming clipped cards must not receive keyboard focus.
- Pause while hovered, focused, manually paused, offscreen, tab hidden, modal open, expanded or reduced motion active. Pointer leave cannot resume while focus stays within. Cancel an in-flight transition safely on focus, modal, resize or preference changes. Keep full quote dialog, focus return, filtering and all-reader expansion.
- Keep birth fields, validation, draft persistence, concern context and wizard route intact; one form and one Trời Nam CTA focus authority. Test initial hash, repeated header click at the same hash, section CTA, resize and modifier clicks.
- Nine chapters, original art/world-as-stage narrative, gold/lacquer brand and exact compatible bilingual audit copy. Do not invent new content or imagery to fill space.
- Preserve saved/global theme preference. No new theme exception is approved by this handoff. Resolve any temporary lacquer proposal separately; it must not silently replace the earlier both-theme decision.

## Current evidence — do not overstate it

Passed: i18n parity, full workspace typecheck, production Next.js Turbopack build, VI/EN SSR HTTP 200, focused 148 tests (one skipped), lint with zero errors/five warnings, protected quotation checksum and a read-only independent review.

Full test run: 3252 passed, five failed, 419 skipped; 39 failing files. Docker/PostgreSQL Testcontainers were unavailable. Exact failures are in the report. Re-run in your environment; do not assume a new failure is environmental merely because this run had environmental failures.

Chromium download failed. Three Playwright tests were collected but failed before application execution because the browser executable was unavailable. Browser behavior, screenshots, actual layout budgets, composite contrast, zoom, and GPU performance ARE NOT VERIFIED. Static markup and scheduler tests do not prove them.

Review repairs already made: mobile preview inertness, heading reflow, carousel padding specificity, single Story scrim. These still need browser evidence.

## Sequential execution checklist

### 1. Bind and inspect the branch

Fetch, checkout this branch in an isolated worktree, and fetch current master. Record head/base. Inspect `git diff origin/master...HEAD`, retaining any newer upstream fixes. Resolve merge conflicts semantically; do not restore the audit snapshot wholesale. Verify testimonial data remains byte-for-byte unchanged from `ee1cdb4`:

SHA256: `3b2ae337b8be52f7521c4c33aeb60a6cc732c32510e34887f78301ead447b00f`.

### 2. Install and run required checks

Use the exact Node/pnpm versions in package.json. Install using the frozen lockfile, build consumed workspace packages, then run:

```sh
pnpm install --frozen-lockfile
pnpm i18n:check
pnpm lint
pnpm typecheck
pnpm --filter @lasoviet/web build
pnpm test
pnpm exec playwright install chromium
```

Use repo scripts rather than inventing stubs. Docker must be available for the integration/deployment suite. Record command exits, failing names and CI links. Do not disable Docker tests or skip required checks to merge.

### 3. Browser verification and bounded repairs

Start the actual branch app using the repo's environment and dev/start command. Provide its URL to:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/homepage-audit.spec.ts
```

Inspect the tests themselves against real DOM and clock behavior; fix a demonstrably incorrect harness rather than treating it as a product defect. Then supplement them with actual browser checks:

- VI and EN at 360/390/430/768/1024/1440; no horizontal page overflow and no clipped controls. At 200% text zoom, preserve reflow, names and reachable controls.
- Form: open, type date/time, change concern, resize and submit; preserved draft, validation/error linkage and wizard payload. Initial hash/repeated header hash and modifier navigation work. No-JavaScript fallback remains usable.
- Carousel: observe actual negative horizontal transform, each of the 15 IDs, last-to-first loop, settled/incoming mounted counts, longest excerpts/names. Verify hover/focus separately, manual pause, hidden tab/offscreen, dialog open/close/Escape/Tab/Shift+Tab, expansion/filter, preference change and resize during transition. No focused read button disappears.
- Comparison: permanently visible at all widths, all competitor selections and complete evidence retained. FAQ q1 starts open; opening other questions does not unexpectedly close it.
- Art: continuous stage, one readable Story/Explore scrim, stable card heights and intended gold/control treatment in supported theme/fallback states. Measure actual composite contrast; do not substitute token ratios.
- World: dirty pose renders, idle stays idle, resume/progress/resize/debug changes update, active sustained slow frames still degrade, context loss/unmount clean up, reduced motion gives readable static content.

Fix only evidenced problems within these contracts. Add meaningful regressions for behavior defects. Re-run affected tests and the required suite. Do not shrink body text below 16px, clip content, change quotation data or introduce extra collapse to force budgets.

### 4. Measure the approved budget

At 390×844, default page height ceiling is 10128px; expanded form ceiling 10950px. Count settled main whitespace units <=1250 and in-transition <=1350. Longest alternative comparison allows <=1350 settled/1450 transition. Other deliberate method/all-reader/FAQ expansions may increase height. Audit Part E and execution-plan section 4 give chapter ceilings.

Measure all 15 settled/incoming windows, not only the shortest quote. Save total/chapter heights, inner/outer padding, word units, overflow and screenshots for both locales. Do not count hidden disclosures in the default state, but do count mounted clamped excerpts and incoming cards. Record measurements in an English report under `docs/superpowers/reports/`.

If a budget fails, inspect double spacing/unused wrappers/layout first; retain complete comparison and the approved interaction model. Make a scoped correction and measure again.

### 5. PR, merge and closure

Create or update a PR from this branch directly to master. Describe final behavior, validation and any remaining external device/field gate; link this handoff and the verification report. Push fixes to this branch, never directly to master.

Merge only after required CI succeeds, browser interactions and responsive budgets are verified, and no critical/important review issue remains. Do not label untested browser work complete. If a genuine product/brand conflict requires an owner decision, stop only that dependent change and state the exact conflict.

Real-device GPU/accessibility and post-release field INP must be recorded honestly. A post-release metric cannot be manufactured as a pre-merge result. If repo release policy makes a device gate blocking, satisfy it before merge; otherwise document the limitation and follow the existing policy. Merge may trigger normal repository deployment automation; do not bypass it or change host infrastructure.

After merge, record PR URL, merge SHA and available deployment smoke evidence. Do not move a tracker task to Done before the repository's deployment/smoke rule is satisfied. Update tasks/verification.md with the exact next step if any gate remains blocked.
