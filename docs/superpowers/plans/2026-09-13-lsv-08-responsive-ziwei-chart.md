# LSV-8 Responsive Twelve-Palace Chart Implementation Plan

**Date:** 2026-09-13
**Status:** Planning complete; blocked by LSV-19, the shared UI artifact, and
explicit founder plan approval
**Queue position:** 2 of 5

## Goal

Make the twelve-palace chart fully usable from 320px through 430px portrait
without document-level horizontal scrolling, while preserving the desktop 4x4
board, all calculated palace facts, relationship selection, and the detail
inspector.

## Verified Baseline

- `global.css` gives `.ziwei-traditional-board` a hard `min-width: 820px`.
- `.ziwei-board-wrapper` converts the defect into horizontal scrolling.
- `ZiweiChartList` returns `null`.
- Legacy `.ziwei-chart-grid`, `.ziwei-chart-list`, and `.ziwei-view-toggle`
  rules target markup no longer rendered.
- `ZiweiChart` is currently consumed only by the private chart result page.
- The approved older result artifact contains diagram/list controls, but it is
  not a binding design for the new 2026-09-13 queue.

## Artifact Decision

The shared artifact must approve the exact mobile composition. Recommended
baseline for approval:

- desktop and tablet at or above `768px`: current 4x4 perimeter board and 2x2
  center, with readability updates from LSV-19;
- mobile below `768px`: semantic palace list is the default;
- an optional diagram mode is contained inside a fixed-width viewport with
  explicit zoom/reset controls and pan behavior that never expands the document;
- selecting either representation updates the same detail inspector;
- every palace exposes major stars, minor stars, transformations,
  brightness/state, role, and relationship labels.

This satisfies the progressive-reveal requirement for a semantic list
alternative without making a scaled-down unreadable board the default.

## Flash Executor Slices

### Slice 8-A: Shared Selection Model and Semantic List

**Owned files**

- Modify: `apps/web/src/features/ziwei/ziwei-chart.tsx`
- Modify: `apps/web/src/features/ziwei/ziwei-chart-list.tsx`
- Modify: `apps/web/src/features/ziwei/ziwei-palace.tsx`
- Create: `apps/web/src/features/ziwei/ziwei-chart-responsive.test.tsx`

**Behavior**

- Keep one selected-palace state shared by diagram, list, and inspector.
- Render all 12 palaces in the mobile list with semantic buttons and one
  expanded selected detail summary.
- Preserve deterministic relation labels from `ziwei-chart-relations.ts`.
- Keep chart facts open; do not introduce entitlement or locked-content logic.
- Do not duplicate or infer chart facts in the UI.

**Acceptance**

- Both representations contain exactly 12 palaces.
- Selecting a list row and a board cell produces the same selected ID,
  relationship labels, and inspector facts.
- Keyboard activation and `aria-pressed` work.
- Focused component tests and web typecheck pass.

### Slice 8-B: Responsive Layout and Dead-Code Removal

**Owned files**

- Modify: `apps/web/src/styles/global.css` only within Zi Wei chart,
  relationship, and inspector selectors
- Modify: `apps/web/messages/vi/ziwei.json`
- Modify: `apps/web/messages/en/ziwei.json`
- Delete: `apps/web/src/features/ziwei/ziwei-chart-list.tsx` only if the
  founder-approved artifact rejects list mode; otherwise keep the implemented
  file from Slice 8-A

**Behavior**

- Apply the approved 768px and 480px layouts.
- Remove the dead duplicate chart selectors after confirming no live consumer.
- Ensure the diagram viewport clips/pans internally and the document never
  scrolls horizontally.
- Raise customer-facing chart text to the approved minimum while retaining
  dense but legible palace information.
- Stack inspector relationship and star groups on mobile without hiding data.

**Acceptance**

- `document.documentElement.scrollWidth <= clientWidth` at 320, 375, 390, 430,
  768, 1024, and 1440.
- Mobile list requires no zoom and no horizontal pan.
- Desktop 4x4 placement, center panel, and selection remain unchanged in
  behavior.
- No obsolete selector or unused stub remains without an English reason.

### Slice 8-C: Browser and Screenshot Evidence

**Owned files**

- Modify: `tests/e2e/free-chart-flow.spec.ts`
- Create: `tests/e2e/ziwei-chart-responsive.spec.ts`
- Write generated evidence only under:
  `.superpowers/sdd/2026-09-13-lsv-8-responsive-ziwei-chart/artifacts/`

**Behavior**

- Create an anonymous chart through the existing helper.
- Exercise list/diagram switching, palace selection, inspector updates,
  keyboard focus, zoom reset, and orientation widths.
- Capture 320, 375, 390, 430, 768, 1024, and 1440 screenshots.
- Record overflow, minimum font, touch-target, and selected-palace metrics.

**Acceptance**

- No document-level horizontal scroll at every width.
- Every visible mobile control is at least 44px.
- Screenshot and metric manifest paths are deterministic.
- Focused Playwright, component tests, web typecheck, and `git diff --check`
  pass.

## Focused Check Commands

```bash
corepack pnpm@11.25.0 vitest run \
  apps/web/src/features/ziwei/ziwei-chart-responsive.test.tsx \
  apps/web/src/features/ziwei/ziwei-chart-relations.test.ts \
  apps/web/src/features/ziwei/ziwei-presentation.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 run i18n:check
corepack pnpm@11.25.0 run content:check
PLAYWRIGHT_BASE_URL=http://127.0.0.1:$WEB_HOST_PORT \
  corepack pnpm@11.25.0 playwright test \
  tests/e2e/free-chart-flow.spec.ts \
  tests/e2e/ziwei-chart-responsive.spec.ts
git diff --check
```

## Sequencing and Terra Review

1. LSV-19 must already be present in the latest fetched `origin/master`;
   this agent does not merge LSV-19.
2. Create the LSV-8 UI branch from the latest `origin/master`.
3. Run slices 8-A through 8-C.
4. Terra high reviews the complete responsive-chart milestone against the
   artifact, chart facts, accessibility, mobile screenshots, and desktop
   regression evidence.
5. Push and open a PR directly to `master`; never merge.

## Conflict Map

- LSV-22 owns the result-page tab shell and separate entitlement/read-state
  lists. It must not rewrite chart internals or the selectors owned here.
- LSV-22 may compose `ZiweiChart`, but any new chart prop requires a narrowed
  cross-ticket contract agreed before implementation.
- LSV-29 and LSV-18 affect report/preview data, not the base chart.

## Explicit Exclusions

- Result tabs, paid state markers, secure preview sheets, report generation,
  analytics transport, chart calculation changes, deployment, and production
  smoke.

## Founder Approval Required

1. Approve the mobile default and optional diagram behavior in the artifact.
2. Approve this plan and authorize the LSV-8 implementation branch.
