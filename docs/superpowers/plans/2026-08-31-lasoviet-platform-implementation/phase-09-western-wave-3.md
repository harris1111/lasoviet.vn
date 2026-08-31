# Phase 09 Western Astrology Wave 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Luna implements only Terra-approved tasks.

**Goal:** Launch a tropical Western natal chart, evidence layer, free
experience, and one evidence-backed paid interpretation using Celestine.

**Architecture:** `CelestineAdapter` owns the vendor boundary and maps precise
location/time input into `NormalizedWesternChartV1`. Predictive techniques
remain outside the natal contract and require their own approval packet.

**Tech Stack:** Celestine 0.2.1, existing report pipeline, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P09-T0N` in
`task-contracts-and-test-vectors.md`.

## Entry Gate

- Phase 06 platform release gates pass.
- Western engineering may begin after Phase 06 if it does not delay preceding
  public waves.
- Public launch follows the Phase 08 launch gate unless the founder explicitly
  changes public launch order.
- Paid checkout remains disabled until OD-003 is resolved.

---

### Task 1 [P09-T01]: Lock the Western natal calculation profile

**Files:**
- Create: `docs/architecture/western-method-record.md`
- Create: `docs/dependencies/celestine-natal-first-use.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/dependency-integration-matrix.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`
- Test: `tests/evidence/western-method-record.test.ts`

**Interfaces:**
- Produces the exact natal method configuration used by fixtures and the
  adapter.
- Produces an explicit supported/deferred capability record.

- [ ] **Step 1: Write the failing method-record validator**

Assert the planet/point set, house system, aspect/orb rules, coordinate and
timezone requirements, polar behavior, supported/deferred capabilities,
dependency integrity, license evidence, and reviewer disposition.

- [ ] **Step 2: Run the focused validator**

Run: `pnpm vitest run tests/evidence/western-method-record.test.ts`
Expected: FAIL before both evidence records exist.

- [ ] **Step 3: Inspect Celestine's exact natal exports**

Record tropical/geocentric assumptions, planet and point set, node mode,
Placidus default, available house systems, aspect definitions/orbs,
retrograde behavior, required coordinates/timezone, and polar limitations.

- [ ] **Step 4: Write the method record**

Define the P0 planet/point set, house system, aspects, warning behavior, stable
IDs, display terminology, and intentionally excluded capabilities. Record
Solar Return as unsupported.

- [ ] **Step 5: Complete the Celestine first-use gate**

Record resolved package integrity, license/SBOM evidence, transitive runtime
tree, replacement boundary, and baseline contract snapshot.

- [ ] **Step 6: Run the validator and obtain Terra method review**

Run: `pnpm vitest run tests/evidence/western-method-record.test.ts`

Expected: the record has no unsupported capability claim, hidden location
default, or unresolved polar/time behavior.

- [ ] **Step 7: Update trackers and commit**

```bash
git add docs/architecture/western-method-record.md docs/dependencies/celestine-natal-first-use.md tests/evidence/western-method-record.test.ts docs/superpowers/plans
git commit -m "docs: define Western natal calculation profile"
```

### Task 2 [P09-T02]: Implement normalized natal calculation and fixtures

**Files:**
- Create: `packages/contracts/src/normalized-western-chart-v1.ts`
- Create: `packages/engine-adapters/src/western/western-engine.ts`
- Create: `packages/engine-adapters/src/western/celestine-adapter.ts`
- Create: `packages/engine-adapters/src/western/celestine-mapping.ts`
- Create: `packages/backend/src/western/western.service.ts`
- Create: `packages/backend/src/western/western.repository.ts`
- Create: `apps/api/src/western/western.controller.ts`
- Create: `packages/test-fixtures/western/natal-fixtures.json`
- Create: `packages/test-fixtures/western/trusted-sources.md`
- Test: `packages/contracts/src/normalized-western-chart-v1.test.ts`
- Test: `tests/calculation/western-natal-fixtures.test.ts`

**Interfaces:**
- Produces neutral IDs for planets, ASC/MC, houses, aspects, retrogrades,
  nodes, warnings, and provenance.
- Produces immutable natal runs keyed by normalized input and method versions.

- [ ] **Step 1: Write failing contract and natal fixtures**

Cover timezone and DST differences, coordinates, ASC/MC, house cusps, aspects,
retrogrades, nodes, invalid locations, and polar-latitude behavior.

- [ ] **Step 2: Run calculation tests**

Run:
`pnpm vitest run tests/calculation/western-natal-fixtures.test.ts`
Expected: FAIL because the normalized contract and adapter are absent.

- [ ] **Step 3: Implement adapter mapping and immutable runs**

Only the adapter imports Celestine. Store raw vendor output privately for
mapping audit and expose only normalized contracts.

- [ ] **Step 4: Compare trusted references**

Use independent published cases or separately executed reference tools
without importing AGPL code. Record method differences instead of averaging
results.

- [ ] **Step 5: Run contract, fixture, and idempotency tests**

Run:
`pnpm vitest run packages/contracts/src/normalized-western-chart-v1.test.ts tests/calculation/western-natal-fixtures.test.ts`
Expected: 100% of the approved natal fixtures PASS.

- [ ] **Step 6: Update trackers and commit**

```bash
git add packages/contracts packages/engine-adapters/src/western packages/backend/src/western apps/api/src/western packages/test-fixtures/western tests/calculation docs/superpowers/plans
git commit -m "feat: add normalized Western natal calculation"
```

### Task 3 [P09-T03]: Add Western chart, evidence, and paid report

**Files:**
- Create: `packages/backend/src/evidence/western-natal-rules.ts`
- Create: `packages/contracts/src/western-natal-report-v1.ts`
- Create: `packages/backend/src/reports/western-natal-report-outline.ts`
- Create: `packages/backend/src/reports/western-natal-report-validator.ts`
- Create: `apps/web/src/app/[locale]/ban-do-sao/page.tsx`
- Create: `apps/web/src/features/western/western-form.tsx`
- Create: `apps/web/src/features/western/western-chart.tsx`
- Create: `apps/web/messages/vi/western.json`
- Create: `apps/web/messages/en/western.json`
- Modify: `packages/backend/src/commerce/product-catalog.ts`
- Modify: `packages/backend/src/capabilities/capability.registry.ts`
- Modify: `config/route-registry.yml`
- Test: `packages/backend/src/evidence/western-natal-rules.test.ts`
- Test: `tests/e2e/western-natal-flow.spec.ts`

**Interfaces:**
- Produces free Sun/Moon/Rising and core chart evidence.
- Produces one immutable paid `WesternNatalReportV1` after OD-003 closes.

- [ ] **Step 1: Write failing evidence, UI, and safety tests**

Assert evidence links, location/time limitations, responsive visualization,
VI/EN terminology, no Vedic substitution, no Solar Return claim, private
report authorization, and common safety rules.

- [ ] **Step 2: Run focused tests**

Run:
`pnpm vitest run packages/backend/src/evidence/western-natal-rules.test.ts && pnpm playwright test tests/e2e/western-natal-flow.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the free natal experience**

Render Sun, Moon, Rising, planets, houses, aspects, retrogrades, and method
metadata from the normalized contract. Do not make the chart dependent on
vendor-localized strings.

- [ ] **Step 4: Resolve OD-003 before enabling paid checkout**

Record the founder-approved SKU, scope, and price. Until resolution, the
catalog entry remains non-public and non-purchasable.

- [ ] **Step 5: Implement and validate the paid report**

Reuse the common report, payment, PDF, Garage, replication, email, and support
pipelines. Complete the twenty-report rubric using controlled profiles.

- [ ] **Step 6: Run full verification**

Run:
`pnpm i18n:check && pnpm vitest run tests/calculation/western-natal-fixtures.test.ts packages/backend/src/evidence/western-natal-rules.test.ts && pnpm playwright test tests/e2e/western-natal-flow.spec.ts`
Expected: PASS.

- [ ] **Step 7: Update registries, trackers, and commit**

```bash
git add packages/contracts packages/backend/src/evidence packages/backend/src/reports packages/backend/src/commerce packages/backend/src/capabilities apps/web/src apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add Western natal experience"
```

### Task 4 [P09-T04]: Prepare the predictive-capability approval packet

**Files:**
- Create: `docs/architecture/western-predictive-capability-review.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/risk-register.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`
- Test: `tests/evidence/western-predictive-capability-review.test.ts`

**Interfaces:**
- Produces a founder decision packet for transits, secondary progressions, and
  solar arc.
- Produces no predictive production code or public capability.

- [ ] **Step 1: Write the failing decision-packet validator**

Require measured natal evidence, per-technique support/contracts/fixtures,
product value, runtime cost, risks, explicit Solar Return exclusion, Terra
disposition, and founder decision status.

- [ ] **Step 2: Run the focused validator**

Run:
`pnpm vitest run tests/evidence/western-predictive-capability-review.test.ts`
Expected: FAIL before the packet exists.

- [ ] **Step 3: Collect natal stability evidence**

Record fixture pass rate, support defects, conversion, report QA, latency, and
location/time failure patterns after natal launch.

- [ ] **Step 4: Audit each candidate technique**

For transits, secondary progressions, and solar arc, record exact Celestine
support, input/output contract, fixtures, product value, runtime cost, and
release risk.

- [ ] **Step 5: Keep Solar Return explicitly excluded**

Record that it requires a compatible reviewed implementation and a separate
founder decision because audited Celestine 0.2.1 does not expose it.

- [ ] **Step 6: Run validation, then obtain Terra review and founder decision**

Run:
`pnpm vitest run tests/evidence/western-predictive-capability-review.test.ts`

No code file, capability flag, or public route is created by this task.
Approved predictive work receives a separate spec and executable plan.

- [ ] **Step 7: Update trackers and commit the review**

```bash
git add docs/architecture/western-predictive-capability-review.md tests/evidence/western-predictive-capability-review.test.ts docs/superpowers/plans
git commit -m "docs: evaluate Western predictive capabilities"
```

## Phase Exit Criteria

- Location/time-sensitive natal fixtures pass.
- UI and reports use tropical Western terminology, not Vedic substitution.
- Solar Return is absent from public capabilities.
- The founder-approved paid interpretation passes common evidence, safety,
  support, and release gates.
- Predictive work remains blocked behind a separate reviewed decision packet.
- Terra records no unresolved `must-fix`.
