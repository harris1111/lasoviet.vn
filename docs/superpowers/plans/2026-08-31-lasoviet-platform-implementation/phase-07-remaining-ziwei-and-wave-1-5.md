# Phase 07 Remaining Zi Wei and Wave 1.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Luna implements only Terra-approved tasks.

**Goal:** Expand only after the first paid Zi Wei flow is stable by releasing
the remaining approved Zi Wei topics sequentially and adding focused
acquisition/retention tools.

**Architecture:** Reuse the report, commerce, evidence, and delivery
pipelines. New disciplines use owned normalized contracts and isolated
adapters or native deterministic modules; capability metadata controls public
availability.

**Tech Stack:** Existing platform, native TypeScript numerology, Mingyu 0.2.0
discipline adapters, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P07-T0N` in
`task-contracts-and-test-vectors.md`.

## Entry Gate

- Phase 06 release gates pass.
- Identity-report conversion, refund, regeneration, generation-failure, and
  support data have a documented baseline.
- P0 severity-1 fixes always take priority over later-wave work.
- Public checkout for a deferred offer remains disabled until its
  `open-decisions.md` item is resolved.

---

### Task 1 [P07-T01]: Add the remaining Zi Wei paid topics sequentially

**Files:**
- Create: `packages/contracts/src/ziwei-report-topic.ts`
- Create: `packages/backend/src/evidence/ziwei-relationship-rules.ts`
- Create: `packages/backend/src/evidence/ziwei-career-rules.ts`
- Create: `packages/backend/src/evidence/ziwei-year-rules.ts`
- Create: `packages/backend/src/reports/ziwei-relationship-outline.ts`
- Create: `packages/backend/src/reports/ziwei-career-outline.ts`
- Create: `packages/backend/src/reports/ziwei-year-outline.ts`
- Modify: `packages/backend/src/commerce/product-catalog.ts`
- Modify: `apps/web/messages/vi/reports.json`
- Modify: `apps/web/messages/en/reports.json`
- Test: `tests/reports/ziwei-topic-reports.test.ts`
- Test: `tests/e2e/ziwei-topic-checkout.spec.ts`

**Interfaces:**
- Produces `ZiweiReportTopic = "relationship" | "career" | "year"`.
- Adds `ZIWEI-RELATIONSHIP-P0`, `ZIWEI-CAREER-P0`, and
  `ZIWEI-YEAR-P0` without changing `IdentityReportV1`.
- Keeps each catalog item independently enabled, priced, and reviewable.

- [ ] **Step 1: Write failing relationship-report tests**

Assert evidence coverage, evidence-ID validity, relationship safety language,
immutable report lineage, and no diagnosis or deterministic compatibility
claim.

- [ ] **Step 2: Run the focused tests**

Run: `pnpm vitest run tests/reports/ziwei-topic-reports.test.ts`
Expected: FAIL because the relationship rules and outline do not exist.

- [ ] **Step 3: Implement and review the relationship topic**

Add only relationship evidence supported by normalized Zi Wei facts. Run the
report validator and a controlled internal sample before enabling another
topic.

- [ ] **Step 4: Add career and annual topics through separate review gates**

Career output enforces financial-advice boundaries. Annual output records
year, period, engine configuration, and evidence provenance.

- [ ] **Step 5: Resolve OD-001 before public checkout**

Keep every new catalog entry `public: false` and `purchasable: false` until the
founder confirms launch order and price in `open-decisions.md`.

- [ ] **Step 6: Run report and checkout verification**

Run:
`pnpm vitest run tests/reports/ziwei-topic-reports.test.ts && pnpm playwright test tests/e2e/ziwei-topic-checkout.spec.ts`
Expected: PASS for internal generation; checkout is enabled only for the
founder-approved topic.

- [ ] **Step 7: Complete per-topic QA and update trackers**

Record the internal report sample, conversion hypothesis, docs impact, risk
changes, and rule-candidate result before each topic is enabled.

- [ ] **Step 8: Commit each independently approved topic**

```bash
git commit -m "feat: add Zi Wei relationship report"
git commit -m "feat: add Zi Wei career report"
git commit -m "feat: add Zi Wei annual report"
```

### Task 2 [P07-T02]: Add native Pythagorean numerology

**Files:**
- Create: `packages/contracts/src/normalized-numerology-chart-v1.ts`
- Create: `packages/backend/src/numerology/numerology-engine.ts`
- Create: `packages/backend/src/numerology/numerology-evidence.ts`
- Create: `packages/backend/src/numerology/numerology.service.ts`
- Create: `apps/api/src/numerology/numerology.controller.ts`
- Create: `apps/web/src/app/[locale]/than-so-hoc/page.tsx`
- Create: `apps/web/src/features/numerology/numerology-form.tsx`
- Create: `apps/web/messages/vi/numerology.json`
- Create: `apps/web/messages/en/numerology.json`
- Test: `tests/calculation/numerology-fixtures.test.ts`
- Test: `tests/e2e/numerology-free-flow.spec.ts`

**Interfaces:**
- Produces `NormalizedNumerologyChartV1` with formula and normalization
  versions.
- Produces a free capability; paid packaging remains disabled.

- [ ] **Step 1: Write failing formula fixtures**

Cover Unicode name normalization, Vietnamese diacritics, date reduction,
master numbers 11/22/33, empty optional name parts, and locale-independent
canonical values.

- [ ] **Step 2: Run calculation tests**

Run: `pnpm vitest run tests/calculation/numerology-fixtures.test.ts`
Expected: FAIL because the native engine is absent.

- [ ] **Step 3: Implement reviewed native formulas**

Keep formula sources and version metadata with the normalized result. UI
labels must not become stored calculation identifiers.

- [ ] **Step 4: Add evidence and localized free UI**

The page exposes the calculator in the first viewport, displays method and
limitations, and emits privacy-safe funnel events.

- [ ] **Step 5: Run complete verification**

Run:
`pnpm i18n:check && pnpm vitest run tests/calculation/numerology-fixtures.test.ts && pnpm playwright test tests/e2e/numerology-free-flow.spec.ts`
Expected: PASS at approved mobile and desktop viewports.

- [ ] **Step 6: Update registries, trackers, and commit**

```bash
git add packages/contracts packages/backend/src/numerology apps/api/src/numerology apps/web/src/app apps/web/src/features/numerology apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add free numerology calculator"
```

### Task 3 [P07-T03]: Add Tarot daily-card and three-card tools

**Files:**
- Create: `packages/contracts/src/normalized-tarot-reading-v1.ts`
- Create: `packages/engine-adapters/src/tarot/mingyu-tarot-adapter.ts`
- Create: `packages/backend/src/tarot/tarot.service.ts`
- Create: `apps/api/src/tarot/tarot.controller.ts`
- Create: `apps/web/src/app/[locale]/tarot/page.tsx`
- Create: `apps/web/src/features/tarot/tarot-reading.tsx`
- Create: `apps/web/messages/vi/tarot.json`
- Create: `apps/web/messages/en/tarot.json`
- Test: `tests/calculation/tarot-replay.test.ts`
- Test: `tests/e2e/tarot-flow.spec.ts`

**Interfaces:**
- Produces seed, spread, card IDs, orientation, draw order, and replay
  provenance.
- Supports only daily-card and three-card question spreads.

- [ ] **Step 1: Complete the Mingyu Tarot first-use gate**

Record the exact import path, resolved dependency tree, capability boundary,
license/SBOM evidence, and replacement boundary.

- [ ] **Step 2: Write failing replay and anti-reroll tests**

The same stored seed and input reproduce the same reading. A daily draw cannot
silently reroll, and every prior reading remains visible to its owner.

- [ ] **Step 3: Run focused tests**

Run: `pnpm vitest run tests/calculation/tarot-replay.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement adapter, service, and non-compulsive UX**

Keep vendor payloads inside the adapter. Interpretation references normalized
card evidence and avoids certainty, crisis substitution, or fear upsell.

- [ ] **Step 5: Run calculation, i18n, and E2E tests**

Run:
`pnpm i18n:check && pnpm vitest run tests/calculation/tarot-replay.test.ts && pnpm playwright test tests/e2e/tarot-flow.spec.ts`
Expected: PASS.

- [ ] **Step 6: Update trackers and commit**

```bash
git add packages/contracts packages/engine-adapters/src/tarot packages/backend/src/tarot apps/api/src/tarot apps/web/src/app apps/web/src/features/tarot apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add replayable Tarot tools"
```

### Task 4 [P07-T04]: Add date-selection and zodiac utilities

**Files:**
- Create: `packages/contracts/src/normalized-date-selection-v1.ts`
- Create: `packages/contracts/src/normalized-zodiac-profile-v1.ts`
- Create: `packages/engine-adapters/src/date-selection/mingyu-date-selection-adapter.ts`
- Create: `packages/engine-adapters/src/zodiac/mingyu-zodiac-adapter.ts`
- Create: `packages/backend/src/date-selection/date-selection.service.ts`
- Create: `packages/backend/src/zodiac/zodiac.service.ts`
- Create: `apps/api/src/date-selection/date-selection.controller.ts`
- Create: `apps/api/src/zodiac/zodiac.controller.ts`
- Create: `apps/web/src/app/[locale]/xem-ngay-tot/page.tsx`
- Create: `apps/web/src/app/[locale]/12-con-giap/page.tsx`
- Create: `apps/web/messages/vi/date-selection.json`
- Create: `apps/web/messages/en/date-selection.json`
- Create: `apps/web/messages/vi/zodiac.json`
- Create: `apps/web/messages/en/zodiac.json`
- Modify: `config/route-registry.yml`
- Modify: `packages/backend/src/capabilities/capability.registry.ts`
- Test: `tests/calculation/date-selection-and-zodiac.test.ts`
- Test: `tests/e2e/date-selection-and-zodiac.spec.ts`

**Interfaces:**
- Produces free utility outputs with stable IDs, method, version, limitations,
  and locale mappings.

- [ ] **Step 1: Write failing deterministic fixtures**

Cover representative dates, timezone handling, zodiac year boundaries, and
the exact approved output fields.

- [ ] **Step 2: Run focused tests**

Run:
`pnpm vitest run tests/calculation/date-selection-and-zodiac.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the two narrow adapters and services**

Exclude unapproved schools, raw vendor jargon, and claims of guaranteed
auspicious outcomes.

- [ ] **Step 4: Add localized utility pages and analytics**

Each page has one clear input flow, method/limitation disclosure, canonical
SEO metadata, and privacy-safe events.

- [ ] **Step 5: Run fixture, accessibility, i18n, and SEO tests**

Run:
`pnpm i18n:check && pnpm vitest run tests/calculation/date-selection-and-zodiac.test.ts && pnpm playwright test tests/e2e/date-selection-and-zodiac.spec.ts`
Expected: PASS.

- [ ] **Step 6: Update capability and route registries, then commit**

```bash
git add packages/contracts packages/engine-adapters packages/backend apps/api apps/web tests docs/superpowers/plans
git commit -m "feat: add date selection and zodiac tools"
```

## Phase Exit Criteria

- Each new Zi Wei SKU passes its own evidence, safety, support, and commercial
  gate.
- Numerology remains free until willingness-to-pay evidence and a separate
  founder decision exist.
- Tarot randomization is replayable and discourages compulsive rerolls.
- Date/zodiac utilities expose only approved scope.
- Public capability metadata matches actual launch status.
- Terra records no unresolved `must-fix`.
