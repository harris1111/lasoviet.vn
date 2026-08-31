# Phase 08 BaZi Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Luna implements only Terra-approved tasks.

**Goal:** Launch a deterministic BaZi chart, evidence layer, free experience,
and one comprehensive paid report without copying Zi Wei product structure.

**Architecture:** `MingyuBaziAdapter` maps `BirthProfileV1` into
`NormalizedBaziChartV1`. The BaZi module owns its method record, evidence,
report contract, and UI while reusing common commerce and delivery services.

**Tech Stack:** mingyu-core 0.2.0, existing report pipeline, Vitest,
Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P08-T0N` in
`task-contracts-and-test-vectors.md`.

## Entry Gate

- Phase 06 platform release gates pass.
- Phase 07 public launch gate passes before BaZi is publicly enabled.
- BaZi engineering may begin after Phase 06 when it does not consume capacity
  needed for P0 reliability.
- Paid checkout remains disabled until OD-002 is resolved.

---

### Task 1 [P08-T01]: Audit and lock the BaZi capability boundary

**Files:**
- Create: `docs/architecture/bazi-method-record.md`
- Create: `docs/dependencies/mingyu-bazi-first-use.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/dependency-integration-matrix.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`

**Interfaces:**
- Produces the approved BaZi method profile consumed by adapter fixtures.
- Produces an exact list of used and intentionally excluded Mingyu exports.

- [ ] **Step 1: Inspect the exact Mingyu BaZi exports**

Record import paths, accepted calendar/time/location inputs, timezone and
true-solar behavior, output fields, luck-cycle behavior, warnings, and rule
limitations.

- [ ] **Step 2: Write the method record**

Define language-neutral canonical fields, public limitations, excluded
capabilities, fixture sources, and the adapter replacement boundary.

- [ ] **Step 3: Complete the production first-use gate**

Record the resolved package tree, integrity, package-level license evidence,
SBOM result, and duplicate calendar/astronomy dependencies in
`mingyu-bazi-first-use.md`.

- [ ] **Step 4: Obtain Terra method review**

Expected: no unresolved method ambiguity, production-license blocker, or
unsupported public claim.

- [ ] **Step 5: Update trackers and commit**

```bash
git add docs/architecture/bazi-method-record.md docs/dependencies/mingyu-bazi-first-use.md docs/superpowers/plans
git commit -m "docs: define BaZi calculation boundary"
```

### Task 2 [P08-T02]: Implement normalized BaZi calculation and fixtures

**Files:**
- Create: `packages/contracts/src/normalized-bazi-chart-v1.ts`
- Create: `packages/engine-adapters/src/bazi/bazi-engine.ts`
- Create: `packages/engine-adapters/src/bazi/mingyu-bazi-adapter.ts`
- Create: `packages/engine-adapters/src/bazi/mingyu-bazi-mapping.ts`
- Create: `packages/backend/src/bazi/bazi.service.ts`
- Create: `packages/backend/src/bazi/bazi.repository.ts`
- Create: `apps/api/src/bazi/bazi.controller.ts`
- Create: `packages/test-fixtures/bazi/p0-fixtures.json`
- Create: `packages/test-fixtures/bazi/trusted-sources.md`
- Test: `packages/contracts/src/normalized-bazi-chart-v1.test.ts`
- Test: `tests/calculation/bazi-fixtures.test.ts`

**Interfaces:**
- Produces pillars, elements, ten-god/relationship IDs, cycles, warnings, and
  provenance without exposing Mingyu payload types.
- Produces immutable runs keyed by normalized input, engine, adapter, and
  method configuration hashes.

- [ ] **Step 1: Write failing contract and boundary fixtures**

Cover solar-term boundaries, timezone differences, historical DST, hour
boundaries, lunar input, any supported location correction, and explicit
unsupported true-solar behavior.

- [ ] **Step 2: Run calculation tests**

Run: `pnpm vitest run tests/calculation/bazi-fixtures.test.ts`
Expected: FAIL because the normalized contract and adapter are absent.

- [ ] **Step 3: Implement the adapter and immutable persistence**

Only the adapter imports Mingyu. Preserve private raw output for mapping audit
and return owned normalized IDs to application code.

- [ ] **Step 4: Cross-check trusted cases**

Use an independent engine or worked source only where method assumptions
overlap. Luna stops on unexplained mismatches; Terra classifies each mismatch
before code or expectations change.

- [ ] **Step 5: Run contract, fixture, and idempotency tests**

Run:
`pnpm vitest run packages/contracts/src/normalized-bazi-chart-v1.test.ts tests/calculation/bazi-fixtures.test.ts`
Expected: 100% of the approved BaZi fixtures PASS.

- [ ] **Step 6: Update trackers and commit**

```bash
git add packages/contracts packages/engine-adapters/src/bazi packages/backend/src/bazi apps/api/src/bazi packages/test-fixtures/bazi tests/calculation docs/superpowers/plans
git commit -m "feat: add normalized BaZi calculation"
```

### Task 3 [P08-T03]: Add BaZi evidence, chart UI, and free experience

**Files:**
- Create: `packages/backend/src/evidence/bazi-rules.ts`
- Create: `apps/web/src/app/[locale]/bat-tu/page.tsx`
- Create: `apps/web/src/features/bazi/bazi-form.tsx`
- Create: `apps/web/src/features/bazi/bazi-chart.tsx`
- Create: `apps/web/messages/vi/bazi.json`
- Create: `apps/web/messages/en/bazi.json`
- Modify: `packages/backend/src/capabilities/capability.registry.ts`
- Modify: `apps/web/src/routes/route-registry.ts`
- Test: `packages/backend/src/evidence/bazi-rules.test.ts`
- Test: `tests/e2e/bazi-free-flow.spec.ts`

**Interfaces:**
- Produces deterministic BaZi evidence with method, confidence, limitations,
  and source references.
- Produces a localized free chart and evidence flow.

- [ ] **Step 1: Write failing evidence and UI tests**

Assert evidence-to-fact links, canonical IDs, responsive chart rendering,
method disclosure, limitation display, VI/EN parity, authorization, and
privacy-safe analytics.

- [ ] **Step 2: Run focused tests**

Run:
`pnpm vitest run packages/backend/src/evidence/bazi-rules.test.ts && pnpm playwright test tests/e2e/bazi-free-flow.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the minimum approved evidence set**

Do not copy Zi Wei vocabulary or SKU sections. Evidence derives only from the
normalized BaZi chart and approved method record.

- [ ] **Step 4: Implement the free chart and evidence UI**

The calculator is the first-viewport experience. Show method/version and any
time or location limitation next to the result.

- [ ] **Step 5: Run i18n, calculation, accessibility, and E2E verification**

Run:
`pnpm i18n:check && pnpm vitest run packages/backend/src/evidence/bazi-rules.test.ts tests/calculation/bazi-fixtures.test.ts && pnpm playwright test tests/e2e/bazi-free-flow.spec.ts`
Expected: PASS.

- [ ] **Step 6: Update registries, trackers, and commit**

```bash
git add packages/backend/src/evidence packages/backend/src/capabilities apps/web/src apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add free BaZi experience"
```

### Task 4 [P08-T04]: Add one comprehensive BaZi paid report

**Files:**
- Create: `packages/contracts/src/bazi-report-v1.ts`
- Create: `packages/backend/src/reports/bazi-report-outline.ts`
- Create: `packages/backend/src/reports/bazi-report-writer.ts`
- Create: `packages/backend/src/reports/bazi-report-validator.ts`
- Modify: `packages/backend/src/commerce/product-catalog.ts`
- Create: `apps/web/messages/vi/bazi-report.json`
- Create: `apps/web/messages/en/bazi-report.json`
- Test: `packages/backend/src/reports/bazi-report-validator.test.ts`
- Test: `tests/e2e/bazi-paid-report.spec.ts`

**Interfaces:**
- Produces one immutable evidence-backed `BaziReportV1`.
- Reuses payment, entitlement, worker, PDF, Garage, replication, email, and
  support contracts without discipline-specific forks.

- [ ] **Step 1: Resolve OD-002**

Sol records the founder-approved SKU name, report scope, and price. Until then,
the product catalog entry remains non-public and non-purchasable.

- [ ] **Step 2: Write failing report, evidence, and safety tests**

Cover unsupported claims, evidence fabrication, financial/health certainty,
wrong chart ownership, immutable regeneration, and full delivery.

- [ ] **Step 3: Run focused tests**

Run:
`pnpm vitest run packages/backend/src/reports/bazi-report-validator.test.ts && pnpm playwright test tests/e2e/bazi-paid-report.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the report through common pipelines**

Freeze chart, evidence, knowledge, prompt, locale, model, and validator
versions. Do not introduce BaZi-specific payment or storage workflows.

- [ ] **Step 5: Complete internal report QA and full E2E**

Run the twenty-report rubric and:
`pnpm playwright test tests/e2e/bazi-paid-report.spec.ts`
Expected: every report meets correctness/safety thresholds and E2E PASS.

- [ ] **Step 6: Update catalog, registries, trackers, and commit**

```bash
git add packages/contracts packages/backend/src/reports packages/backend/src/commerce apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add comprehensive BaZi report"
```

## Phase Exit Criteria

- BaZi fixtures pass across core calendar and time boundaries.
- The chart contract is independent of Mingyu payload shape.
- The free experience is localized and evidence-backed.
- One founder-approved paid offer passes report, safety, PDF, storage, email,
  support, and full-flow gates.
- No automatic four-SKU clone of Zi Wei exists.
- Terra records no unresolved `must-fix`.
