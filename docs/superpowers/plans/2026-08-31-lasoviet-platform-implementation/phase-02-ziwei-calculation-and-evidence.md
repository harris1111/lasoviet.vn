# Phase 02 Zi Wei Calculation and Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`.

**Goal:** Produce reproducible `NormalizedZiweiChartV1` results and
deterministic evidence from eligible BirthProfiles.

**Architecture:** Only `IztroAdapter` imports iztro. Calculation runs preserve
engine/config/input provenance and immutable normalized output.

**Tech Stack:** iztro 2.6.0, Zod, Drizzle, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P02-T0N` in
`task-contracts-and-test-vectors.md`.

## Global Constraints

- Use iztro `default`; no public school selector.
- Do not claim true-solar-time correction.
- Mingyu Zi Wei is not independent validation.
- Calculation and evidence are deterministic and AI-free.
- Every dependency import passes the production first-use gate.

---

### Task 1 [P02-T01]: Define engine and normalized Zi Wei contracts

**Files:**
- Create: `packages/contracts/src/engine.ts`
- Create: `packages/contracts/src/normalized-ziwei-chart-v1.ts`
- Create: `packages/contracts/src/calculation-provenance.ts`
- Create: `packages/engine-adapters/package.json`
- Create: `packages/engine-adapters/src/ziwei/ziwei-engine.ts`
- Test: `packages/contracts/src/normalized-ziwei-chart-v1.test.ts`

**Interfaces:**
- Produces `CalculationEngine<Input, Output>`.
- Produces `NormalizedZiweiChartV1Schema`.
- Produces `CalculationProvenanceV1Schema`.

- [x] **Step 1: Write failing normalized-schema tests**

Require 12 unique palaces, language-neutral palace/star IDs, transformations,
brightness, body/soul metadata, horoscope capability metadata, warnings, and
provenance.

- [x] **Step 2: Run contract tests**

Run: `pnpm vitest run packages/contracts/src/normalized-ziwei-chart-v1.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement schemas and stable IDs**

Do not store vendor-localized strings as canonical IDs.

- [x] **Step 4: Run tests and typecheck**

Run: `pnpm vitest run packages/contracts && pnpm typecheck`
Expected: PASS.

- [x] **Step 5: Update traceability and commit**

```bash
git add packages/contracts packages/engine-adapters docs/superpowers/plans
git commit -m "feat: define Zi Wei engine contracts"
```

**P02-T01 Evidence (2026-09-02):**

- Focused RED confirmed the normalized chart module was absent before
  implementation.
- The contract suite passed: 2 files, 22 tests.
- `@lasoviet/contracts` and `@lasoviet/engine-adapters` typechecks passed.
- Root `pnpm typecheck` and `pnpm build` passed with the new adapter package.
- The contract defines exactly 12 unique canonical palaces, canonical English
  palace/star/transformation/brightness IDs, body and soul palace metadata,
  horoscope capability metadata, warnings, provenance hashes, and generic
  engine error/result semantics.
- No iztro dependency or import, UI, AI behavior, migration, or external side
  effect was added. Docs impact: minor. Rule candidate: none. Open questions:
  none.

### Task 2 [P02-T02]: Implement IztroAdapter and immutable calculation runs

**Files:**
- Create: `packages/engine-adapters/src/ziwei/iztro-adapter.ts`
- Create: `packages/engine-adapters/src/ziwei/iztro-config.ts`
- Create: `packages/engine-adapters/src/ziwei/iztro-mapping.ts`
- Create: `packages/backend/src/ziwei/ziwei.service.ts`
- Create: `packages/backend/src/ziwei/ziwei.repository.ts`
- Create: `apps/api/src/ziwei/ziwei.controller.ts`
- Modify: `packages/database/src/schema/birth-profile.ts`
- Test: `packages/engine-adapters/src/ziwei/iztro-adapter.test.ts`

**Interfaces:**
- Produces `IztroAdapter.calculate(profile, config)`.
- Produces idempotency key
  `inputHash + engineVersion + adapterVersion + configHash`.
- Produces immutable calculation run and chart IDs.

- [x] **Step 1: Write a failing known-chart adapter test**

Use a reviewed fixture and assert palace count, principal star locations,
transformations, and provenance.

- [x] **Step 2: Run the adapter test**

Run: `pnpm vitest run packages/engine-adapters/src/ziwei/iztro-adapter.test.ts`
Expected: FAIL.

- [x] **Step 3: Pass the first-use dependency gate**

Record the resolved iztro tree, license evidence, SBOM, integrity, and contract
baseline in `dependency-integration-matrix.md`.

- [x] **Step 4: Implement mapping and persistence**

Set `algorithm: "default"` explicitly. Preserve raw private vendor output for
adapter audit but expose only normalized output.

- [x] **Step 5: Verify idempotency**

Run the same command twice and assert one calculation result is reused without
rewriting history.

- [x] **Step 6: Run focused and integration tests**

Run: `pnpm vitest run packages/engine-adapters packages/backend/src/ziwei`
Expected: PASS.

- [x] **Step 7: Update trackers and commit**

```bash
git add packages/engine-adapters packages/backend/src/ziwei packages/database apps/api/src/ziwei docs/superpowers/plans
git commit -m "feat: add reproducible Zi Wei calculation"
```

**P02-T02 Evidence (2026-09-02):**

- The initial adapter RED failed because the production adapter/config modules
  did not exist. The initial service/controller REDs failed because their
  modules did not exist.
- `iztro` is pinned exactly to `2.6.0` in
  `@lasoviet/engine-adapters`; lockfile and independently packed tarball
  integrity agree. The resolved runtime tree is MIT-only and recorded in the
  dependency matrix plus `sbom/iztro-2.6.0.cdx.json`.
- `IztroAdapter` is the sole `iztro` import owner. It uses explicit
  `algorithm: "default"`, emits language-neutral normalized IDs/provenance,
  preserves the private raw vendor snapshot only for persistence, and records
  no native location, timezone, or true-solar-time correction claim.
- Owner-authorized calculation reads a specific immutable BirthProfile revision.
  Unknown or multi-branch time returns `ZIWEI_TIME_INELIGIBLE` before any run
  is created. The exact idempotency key is scoped to its profile revision so
  identical private input never returns another profile's chart identifier.
- Focused adapter/backend/API verification passed: 4 files, 7 tests.
  Migration acceptance passed: 1 file, 5 tests. Root typecheck and build
  passed. No UI, AI, public school selector, live vendor call, or other
  external side effect occurred. Docs impact: minor. Rule candidate: none.
  Open questions: none.

### Task 3 [P02-T03]: Build the approved P0 fixture and cross-check suite

**Files:**
- Create: `packages/test-fixtures/ziwei/p0-fixtures.json`
- Create: `packages/test-fixtures/ziwei/trusted-sources.md`
- Create: `packages/test-fixtures/ziwei/run-iztro-fixtures.ts`
- Create: `packages/test-fixtures/ziwei/run-tianji-reference.ts`
- Test: `tests/calculation/ziwei-p0-fixtures.test.ts`

**Interfaces:**
- Produces a versioned fixture manifest with source, expected values, rule set,
  precision, and review status.

- [x] **Step 1: Add failing core fixtures**

Include solar/lunar conversion, leap month, solar-term boundary, early/late
Tý hour, branch boundary, timezone difference, historical timezone, unknown
time rejection, and branch-only precision.

- [x] **Step 2: Run fixtures**

Run: `pnpm vitest run tests/calculation/ziwei-p0-fixtures.test.ts`
Expected: FAIL until the adapter and expected records agree.

- [x] **Step 3: Cross-check important fixtures**

Use Tianji only where methods overlap. For school differences, record the
difference and compare against a trusted worked example instead of majority
voting.

- [x] **Step 4: Resolve every unexplained mismatch**

Luna stops on mismatch. Terra reviews whether it is an adapter bug, source
error, or school difference before Luna changes code or fixture expectations.

- [x] **Step 5: Run the complete fixture suite**

Run: `pnpm vitest run tests/calculation/ziwei-p0-fixtures.test.ts`
Expected: 100% PASS.

- [x] **Step 6: Update risk/rule trackers and commit**

```bash
git add packages/test-fixtures tests/calculation docs/superpowers/plans
git commit -m "test: add trusted Zi Wei fixtures"
```

**P02-T03 Evidence (2026-09-02):**

- The fixture RED showed that the adapter collapsed `23:30` late Zi into the
  same vendor input as `00:30` early Zi. The adapter now sends iztro
  `timeIndex: 12` for `23:00-23:59`; its approved current-day division may
  still produce the same chart facts, so the fixture asserts the real vendor
  input boundary rather than inventing a chart difference.
- Manifest v1 covers 11 fixtures across solar/lunar input, leap lunar month,
  solar-term boundary, early/late Zi, branch boundary, IANA and historical
  timezone provenance, unknown-time rejection, and branch-only precision.
  Reused Phase 01 inputs preserve original calendar/time/timezone provenance.
- The real `IztroAdapter` passed every eligible fixture and the unknown-time
  fixture returned `ZIWEI_TIME_INELIGIBLE` before an adapter run.
- Read-only Tianji overlap comparison for lunar `1988-01-15`, early Zi,
  returned life palace Tiger, agreeing with normalized iztro
  `ziwei.branch.tiger`. Tianji's late-Zi, timezone, solar-term, leap-month,
  and complete-star behavior is not comparable and is recorded in the source
  notes; Mingyu is excluded.
- Focused fixture and adapter tests, root typecheck, and root build passed.
  No UI, AI, production reference import, external call, or durable rule was
  added. Docs impact: minor. Rule
  candidate: none. Open questions: none.

### Task 4 [P02-T04]: Implement capability registry and deterministic evidence

**Files:**
- Create: `packages/contracts/src/capability.ts`
- Create: `packages/contracts/src/evidence.ts`
- Create: `packages/backend/src/capabilities/capability.registry.ts`
- Create: `packages/backend/src/evidence/evidence.service.ts`
- Create: `packages/backend/src/evidence/ziwei-identity-rules.ts`
- Create: `packages/database/src/schema/evidence.ts`
- Test: `packages/backend/src/evidence/ziwei-identity-rules.test.ts`

**Interfaces:**
- Produces `CapabilityDefinitionV1`.
- Produces `EvidenceItemV1` and `EvidenceSetV1`.
- Produces `buildZiweiIdentityEvidence(chart): EvidenceSetV1`.

- [ ] **Step 1: Write failing rule tests**

Each test identifies normalized facts, evidence key, confidence, limitations,
interpretation bounds, and allowed action categories.

- [ ] **Step 2: Run evidence tests**

Run: `pnpm vitest run packages/backend/src/evidence`
Expected: FAIL.

- [ ] **Step 3: Implement the minimum identity-report evidence set**

Cover only evidence required by the free experience and first paid SKU. Do not
encode all possible Zi Wei schools or topics.

- [ ] **Step 4: Persist immutable evidence sets**

Evidence versions link to chart version and rule version.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run packages/backend/src/evidence packages/contracts`
Expected: PASS.

- [ ] **Step 6: Update docs/rules and commit**

```bash
git add packages/contracts packages/backend/src/capabilities packages/backend/src/evidence packages/database docs/superpowers/plans
git commit -m "feat: add Zi Wei capabilities and evidence"
```

## Phase Exit Criteria

- iztro is imported only inside the adapter package.
- Every result records input/config/engine/adapter/schema provenance.
- All approved P0 fixtures pass.
- Independent/reference disagreements are explained, not averaged.
- Evidence is deterministic and versioned.
- Unknown-time eligibility remains enforced.
- Terra has no unresolved `must-fix`.
