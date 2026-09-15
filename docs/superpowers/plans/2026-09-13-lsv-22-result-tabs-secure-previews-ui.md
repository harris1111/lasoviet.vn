# LSV-22 Result Tabs and Secure Preview UI Implementation Plan

**Date:** 2026-09-13
**Status:** Planning complete; UI shell is blocked by LSV-19 and LSV-8; secure
preview integration is additionally blocked by LSV-18/FD-068 contracts,
LSV-12 analytics, the shared UI artifact, and explicit founder plan approval
**Queue position:** 5 of 5

## Goal

Turn the private chart result into a five-tab, URL-addressable reading
experience with clear chart actions, readable overview, twelve-palace reading
states, evidence matrix, real reading progress, and secure locked previews that
never ship protected plaintext to unauthorized clients.

## Next.js 16.3.4 Contract

Local Next.js documentation was verified for this plan:

- page `searchParams` is a `Promise` and must be awaited;
- `useSearchParams` is read-only and belongs in a Client Component;
- native `pushState`/`replaceState` integrates with the App Router;
- `router.push`/`replace` supports `scroll: false`;
- URL-derived client state must use a `Suspense` boundary when required by the
  rendering mode.

Stable query values are:

- `tab=chart|overview|palaces|topics|evidence`
- `section=<server-approved-section-id>` only when the value exists in the
  authorized projection.

Unknown values fall back to `chart` and are never trusted for authorization or
used to construct arbitrary URLs.

## Data and Security Gates

- LSV-18 owns the new preview contract, wallet/entitlement source, and
  server-clipped `generated_locked_preview` data.
- FD-068 section count, per-chart AI cost cap, and fallback policy must be
  approved in the LSV-18 implementation plan before secure previews ship.
- The client may receive title, role, safe metadata, and the server-clipped
  excerpt only. Full locked text must be absent from HTML, RSC payloads, JSON,
  metadata, print output, and accessibility trees.
- If the new projection is unavailable, show existing free content and a
  non-purchasing unavailable state. Never fake a locked preview.

## Flash Executor Slices

### Slice 22-A: URL-Backed Tab Shell

**Owned files**

- Modify: `apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`
- Modify: `apps/web/src/app/[locale]/la-so/[chartId]/page.test.tsx`
- Create: `apps/web/src/features/reports/result-tabs.tsx`
- Create: `apps/web/src/features/reports/result-tabs.test.tsx`
- Create: `apps/web/src/styles/ziwei-result-tabs.css`
- Modify: `apps/web/src/styles/global.css` only to import the new stylesheet and
  remove superseded result-shell selectors

**Behavior**

- Await and allowlist page search parameters.
- Render `Lá số | Tổng quan | 12 cung | Chủ đề | Căn cứ`.
- Use URL history for tab/section state so refresh, back, forward, and
  authentication return preserve context.
- Keep scroll position on tab changes and expose selected tab/panel semantics.
- Mobile tabs scroll within their own bar with an artifact-approved edge fade;
  the document itself does not scroll horizontally.

**Acceptance**

- Invalid/multiple query values fail to the safe default.
- Back/forward restores the prior tab and section.
- Existing private/noindex/access-control behavior is unchanged.
- Focused page/tab tests and web typecheck pass.

### Slice 22-B: Chart, Overview, Palace, and Evidence Tabs

**Owned files**

- Create: `apps/web/src/features/reports/result-chart-tab.tsx`
- Create: `apps/web/src/features/reports/result-overview-tab.tsx`
- Create: `apps/web/src/features/reports/result-palace-list.tsx`
- Create: `apps/web/src/features/reports/result-evidence-matrix.tsx`
- Modify: `apps/web/src/features/reports/free-identity-preview.tsx`
- Modify: `apps/web/src/features/ziwei/ziwei-result-summary.tsx`
- Create: `apps/web/src/features/reports/result-tab-content.test.tsx`

**Behavior**

- Chart tab composes the completed LSV-8 chart, legend, real exploration
  counts, and three artifact-approved actions.
- Overview uses a 720px reading surface at 17px/1.7.
- Star definitions are accessible on hover, focus, and tap and come from an
  approved local glossary, never generated ad hoc.
- Palace list shows all 12 names, main stars, and only authoritative read/
  preview/locked states.
- Evidence matrix uses real counts/categories and text labels, never scores.

**Acceptance**

- No radar, fortune percentage, compatibility score, or predictive trend.
- Every displayed count is traceable to current chart, evidence, report, or
  entitlement state.
- The chart itself remains open and unblurred.
- If an action lacks an approved destination/behavior, render it disabled with
  truthful copy; do not invent a route.

### Slice 22-C: Secure Topic Accordion and Preview Sheet

**Dispatch status:** blocked until the LSV-18 implementation plan is approved
and its preview projection is present in the latest fetched `origin/master`.
This slice never edits LSV-18 contract, schema, wallet, entitlement, or
generation files.

**Owned files after the gate**

- Modify: `apps/web/src/features/reports/load-free-identity-preview.ts`
- Modify: `apps/web/src/features/reports/load-free-identity-preview.test.ts`
- Create: `apps/web/src/features/reports/result-topic-accordion.tsx`
- Create: `apps/web/src/features/reports/secure-preview-panel.tsx`
- Create: `apps/web/src/features/reports/secure-preview-panel.test.tsx`
- Modify: `apps/web/messages/vi/reports.json`
- Modify: `apps/web/messages/en/reports.json`

**Behavior**

- Render numbered topic rows with three-line server-provided teasers.
- Desktop opens the selected preview inline; mobile opens the LSV-19 bottom
  sheet.
- Show real section title, clipped excerpt, evidence/scope metadata, state,
  current Lá price when authorized, and permanent-ownership wording.
- Progress text is authoritative, for example `x/12 sections opened/read`.
- Sheet traps focus and restores the triggering row on close.
- Do not render blurred copies of hidden text. Any visual fade is generated
  from safe placeholder lines after the clipped excerpt.

**Acceptance**

- Contract tests serialize the response and scan HTML/RSC/API fixtures for
  protected locked sentences and internal IDs.
- View source, copy/select, print, metadata, and accessibility-tree checks
  reveal no protected plaintext.
- Preview failure leaves free content usable and removes dead purchase actions.
- This slice is `BLOCKED` until LSV-18 supplies the approved projection and
  Sol records the exact response/export path in the Flash brief.

### Slice 22-D: Analytics Adoption After LSV-12

**Dispatch status:** blocked handoff; no Flash implementation slice may be
dispatched until LSV-12 lands an exact web dispatcher path and contract.

**Reserved ownership after the gate**

- Modify only the exact dispatcher path named by the merged LSV-12 contract.
- Modify only call sites in 22-A through 22-C files.
- Create: `tests/analytics/result-ui-events.test.ts`

**Behavior**

- Emit approved events for tab change, accordion open, locked-preview view with
  safe section ID, preview dismissal, CTA activation, and reading progress.
- Never emit chart ID, birth data, excerpt/report/evidence content, or free
  text to third parties.
- Do not create a parallel registry or legacy aliases.

**Acceptance**

- One event per user action with allowlisted properties.
- If LSV-12 is absent, stop rather than using the legacy registry. Sol must
  issue a new exact-file brief after inspecting the merged LSV-12 path.

### Slice 22-E: Browser Security, Accessibility, and Screenshots

**Owned files**

- Modify: `tests/e2e/free-chart-flow.spec.ts`
- Modify: `tests/e2e/chart-sign-in-return.spec.ts`
- Create: `tests/e2e/result-tabs-secure-preview.spec.ts`
- Write generated evidence only under:
  `.superpowers/sdd/2026-09-13-lsv-22-result-tabs/artifacts/`

**Acceptance**

- Screenshots: 320, 375, 390, 768, 1024, and 1440 for all five tabs; locked
  preview desktop and mobile states included.
- No horizontal document scroll at any width.
- Refresh/back/forward and sign-in return preserve tab and selected section.
- Bottom sheet focus trap, Escape/backdrop close, trigger-focus restoration,
  200% zoom, 44px targets, reduced motion, and reader width pass.
- Network/HTML checks prove no locked plaintext leak.
- Focused Vitest, Playwright, i18n, content check, typecheck, and
  `git diff --check` pass.

## Focused Check Commands

```bash
corepack pnpm@11.25.0 vitest run \
  'apps/web/src/app/[locale]/la-so/[chartId]/page.test.tsx' \
  apps/web/src/features/reports/result-tabs.test.tsx \
  apps/web/src/features/reports/result-tab-content.test.tsx \
  apps/web/src/features/reports/secure-preview-panel.test.tsx \
  apps/web/src/features/reports/load-free-identity-preview.test.ts \
  tests/analytics/result-ui-events.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 run i18n:check
corepack pnpm@11.25.0 run content:check
PLAYWRIGHT_BASE_URL=http://127.0.0.1:$WEB_HOST_PORT \
  corepack pnpm@11.25.0 playwright test \
  tests/e2e/free-chart-flow.spec.ts \
  tests/e2e/chart-sign-in-return.spec.ts \
  tests/e2e/result-tabs-secure-preview.spec.ts
git diff --check
```

## Sequencing and Terra Review

1. LSV-19, LSV-8, and LSV-12 must already be present in the latest fetched
   `origin/master`; this agent does not merge prerequisite branches.
2. LSV-18 must deliver its founder-approved preview projection before 22-C.
3. Create the LSV-22 UI branch from the latest fetched `origin/master`.
4. Run 22-A and 22-B, then 22-C and 22-D when dependencies are present, then
   22-E.
5. Terra high reviews one complete result milestone, with security/privacy as
   release-blocking.
6. Harris signs off on screenshots under FD-056.
7. Push and open the LSV-22 PR directly to `master`; never merge it.

## Conflict Map

- LSV-8 owns `ZiweiChart`, `ZiweiPalace`, `ZiweiChartList`, and their chart CSS.
  LSV-22 composes them and owns the surrounding tab/result styles.
- LSV-18 owns contracts, backend clipping, entitlements, Lá prices, and
  FD-068 generation policy.
- LSV-29 owns paid-report generation reliability; LSV-22 must not expose
  generated-preview readiness unless the authoritative state says it is ready.
- LSV-12 owns analytics transport and event registry.
- The three action buttons have no complete live behavior today. Their exact
  destinations must be approved before Slice 22-B enables them.

## Founder Approval Required

1. Approve the five-tab and locked-preview artifact.
2. Approve exact behavior/destinations for `Sửa thông tin`, `Tra cứu sao`, and
   `Tải ảnh lá số`.
3. Approve or reference the LSV-18 decision for FD-068 section count, AI cost
   cap, and fallback.
4. Approve this plan and authorize the LSV-22 implementation branch.
