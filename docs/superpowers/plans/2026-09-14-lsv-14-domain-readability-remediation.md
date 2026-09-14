# LSV-14 Domain and Readability Remediation Plan

Date: 2026-09-14

Status: planning only; implementation approval required

Evidence: `docs/reports/2026-09-14-lsv-14-domain-readability-audit.md`

## Goal

Close the verified domain and readability gaps without duplicating work owned
by active UI, analytics, support, or V4 report tickets.

## Scope Boundaries

This plan does not authorize product source, CSS, copy, dependency, runtime,
fixture, migration, deployment, DNS, or mail changes. Implementation requires
An's explicit technical approval. Any changed customer wording requires the
applicable founder approval already defined by the owning ticket.

## Proposed Work Packages

### 1. Domain and Support Boundary

Owner: An, coordinated with LSV-26.

- Preserve `lasoviet.vn` only in the closed redirect reserve allowlist, route
  tests, supersession records, repository paths, and read-only prototypes.
- Keep generated backend output clean after every report-package build.
- Replace the temporary Gmail-address support projection only through the
  approved LSV-26 support configuration and external `@lasoviet.net` mailbox
  readiness.
- Verify robots, sitemap, structured data, OG metadata, auth action URLs, report
  failure links, checkout links, and environment samples after implementation.

Acceptance:

- No customer-facing `.vn` literal.
- All public canonical URLs use `https://lasoviet.net`.
- The support address is deliverable and consistent with FD-057/LSV-26.

### 2. Verified Contrast Correction

Owner: An, coordinated with LSV-19.

- Raise `.wizard-privacy` to at least 4.5:1 against its rendered background.
- Meet the planned minimum secondary-text size from LSV-19 unless an approved
  legal-caption exception applies.
- Preserve information hierarchy and avoid introducing a new color token.
- Re-run axe and record the exact computed foreground, background, ratio, size,
  and weight.

Acceptance:

- `.wizard-privacy` is at least 4.5:1 for normal text.
- No new definite WCAG AA contrast violation appears on ticket routes.
- An supplies image/texture evidence and Harris provides the exclusive visual
  sign-off under FD-056.

### 3. 320 px and 200% Reflow

Owners: An with LSV-20 for homepage; An for account navigation.

- Let LSV-20 replace the homepage comparison table with the approved responsive
  card treatment. Do not create an LSV-14-specific competing design.
- Resolve account navigation so the strict LSV-14 no-horizontal-scroll
  requirement is met. Only Lãm may explicitly reopen that UI requirement.
- Preserve the ticket #8 exclusion for the 12-palace chart board.
- Verify fixed/sticky controls, keyboard focus, and content visibility at
  320 x 720. Use the 200%-equivalent viewport only as a preliminary proxy, then
  verify native 200% browser zoom in the approved target browser.

Acceptance:

- No unapproved horizontal scroll container remains at 320 px.
- No content or function is lost at native 200% browser zoom.
- The chart-board result is reported separately under LSV-8.

### 4. Reading Typography

Owners: An with LSV-25 for paid reader and LSV-24 for sample report.

- Keep knowledge article reading text at 17-18 px and approximately 1.65-1.75.
- Align the paid reader with the LSV-25 target of 17-18 px / 1.7.
- Distinguish reading prose from labels, metadata, captions, and controls when
  evaluating the sample report.
- Re-run measurements on a schema-valid ready paid report.

Acceptance:

- Every designated reading-prose selector measures 17-18 px with a ratio in the
  approved range.
- Non-reading labels are documented separately and remain at least the LSV-19
  minimum size.

### 5. Fixture and Browser Evidence Reliability

Owner: An, coordinated with LSV-15.

- Update the WP-13 seed only after LSV-15 stabilizes the active V4 contract.
- Generate valid normalized chart output through the current engine boundary.
- Seed a schema-valid ready V4 report with the complete required section set.
- Derive pending/expiry values from an injected or captured test clock.
- Fix the ambiguous `free-chart-flow.spec.ts` text locator with an exact or
  semantic selector.
- Keep fixture data synthetic, isolated, and protected by the exact local
  database guard.

Acceptance:

- Chart, topic-selection, pending-report, failed-report, and ready-report routes
  render through the real local API.
- Re-running the suite on a later calendar date does not change fixture state.
- No production credential or external provider is required.

## Verification Sequence

1. Rebuild changed producer packages before dependent API/web checks.
2. Run focused unit or contract tests owned by each implementation ticket.
3. Run web typecheck and production build.
4. Start an isolated local PostgreSQL/Redis/API/web runtime.
5. Run existing typography and WP-13 suites with current fixtures.
6. Run one-off or approved persistent accessibility evidence tooling.
7. Capture 320 px and native 200% browser-zoom evidence for every LSV-14 route;
   keep equivalent-viewport captures labeled as proxy evidence only.
8. Record exact contrast, font loading, fallback stacks, and reading metrics.
9. Obtain Terra high review.
10. An supplies final evidence and Harris provides exclusive visual sign-off
    under FD-056 before release closure.

## Concurrency Rules

- LSV-10 owns business aggregates; LSV-14 must not edit its projections.
- LSV-12 owns tracking and consent changes; refresh wizard evidence after it
  lands, without changing its wording in LSV-14.
- LSV-15 owns V4 report generation and contract evolution; fixture
  modernization must follow its accepted contract, not race it.
- LSV-19, LSV-20, LSV-24, LSV-25, and LSV-26 should receive the applicable
  visual, typography, sample-report, reader, and support findings rather than
  receiving duplicate implementation from LSV-14.

## Release and Task State

- Do not merge or deploy from this planning milestone.
- After approved implementation, keep LSV-14 in progress or review until target
  deployment smoke and Harris's FD-056 visual sign-off are recorded.
- A local build or screenshot set is not release evidence.

## Unresolved Questions

1. Which approved automated method will be used to validate contrast over
   photographic and lacquer texture backgrounds.
2. When LSV-15's V4 contract is stable enough to refresh the shared WP-13
   ready-report fixture.
