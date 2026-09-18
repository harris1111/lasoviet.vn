# FD-082 V4.1.2 Acceptance Reliability Correction Plan

Date: 2026-09-18

## Decision Context

Production release `963c98c121b3fe67ec30f06effcbae1de5793cc7` is safe and
Claude-only, but two fresh campaigns failed at different section quality gates
after the single allowed rewrite:

- `prod-20260918-05`: `keyConfigurations` terminal
  `EVIDENCE_ANCHORS`.
- `prod-20260918-06`: `coreAxis` terminal `DISCOURAGED_TERM`; the initial
  finding was `khí chất` and the rewrite introduced `an nhàn`.

All provider calls were HTTP 200 with the approved
`9router-an` / `ag/claude-sonnet-4-6` -> `claude-sonnet-4-6` lineage. Neither
campaign created an immutable report/PDF. The audited restoration returned the
wallet to `0 purchased / 100000 promotional`.

Terra high classified the repeated acceptance reliability gap as a
`must-fix`. It rejected threshold reduction, token-cap increase, extra rewrite
attempts, provider/model changes, Gemini, and blind retry.

## Approved Scope Requested

Create an additive V4.1.2 prompt/rewrite tuple for the sectioned sensitivity
runtime:

1. Add a new immutable prompt version while preserving V4.1.1 behavior for
   historical reports.
2. Add one shared, bounded, section/item-addressed acceptance contract to
   initial section generation and guided rewrites. The contract must require:
   - correction of every supplied finding;
   - avoidance of all configured discouraged terms;
   - compliance with configured proper-name density;
   - preservation of evidence-backed chart facts and required evidence keys;
   - no new quality violation after correction.
3. Preserve the existing exact `keyConfigurations` title, item-order, and
   `evidenceKeys` identity contract.
4. Update runtime tuple resolution and FD-082 expected lineage to accept only
   the new tuple for fresh campaigns, without invalidating historical reports.
5. Add deterministic focused tests for:
   - generic-section rewrite acceptance instructions;
   - `EVIDENCE_ANCHORS`;
   - `khí chất`;
   - `an nhàn`;
   - key-configuration identity preservation;
   - prompt tuple routing and rejection of unknown/mismatched tuples.

## Explicit Exclusions

- No change to numerical quality thresholds.
- No change to output token caps, concurrency, or rewrite/generation caps.
- No change to provider, model, allowlist, pricing, or payment behavior.
- No new migration or customer contract.
- No top-up, provider, webhook, invoice, public paid-resolver, or Gemini
  activation.
- No production run until implementation and independent Terra high review
  both approve the correction.

## Owned Files

Terra medium may edit only:

- `packages/backend/src/reports/identity-report-config.ts`
- `packages/backend/src/reports/comprehensive-report-section-writer-v4.ts`
- `packages/backend/src/reports/report-generation.service.ts`
- `packages/backend/src/reports/report-query.service.ts`
- `packages/backend/src/reports/identity-report-version-family.ts`
- `packages/backend/src/index.ts`
- `apps/api/src/operations/fd082-v41-gate.ts`
- the matching focused tests for those modules.

The barrel, version-family, and query files are compatibility owners for the
new tuple. They are included only to export and validate the approved
V4.1.2 lineage and to preserve historical V4.1/V4.1.1 reports. This
clarification does not change product scope, quality numbers, provider
behavior, or the customer contract.

Terra medium must stop and return `NEEDS_CONTEXT` if compatibility requires
files outside this list or changes any excluded behavior.

## Verification And Release Gates

1. Terra medium runs focused backend/API tests, typecheck/build as required by
   the changed packages, and `git diff --check`.
2. Terra high independently reviews the complete correction and test evidence.
3. Only verified `must-fix` findings receive one narrowed correction pass and
   scoped Terra high re-review.
4. After approval, merge through the integration PR, release PR, deployment,
   and production smoke flow.
5. Start a fresh campaign ID only after deployment. A failed run still stops
   immediately, restores through the audited ledger command, and counts as
   `0/20`.
