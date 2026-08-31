# Phase 10 I Ching and Liu Yao Wave 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Luna implements only Terra-approved tasks.

**Goal:** Launch replayable Liu Yao/I Ching casting with evidence-backed,
non-compulsive interpretation.

**Architecture:** Mingyu performs deterministic casting behind an owned
adapter. Every result stores question context, method, input/time, random seed
or manual lines, moving lines, changed hexagram, and provenance.

**Tech Stack:** mingyu-core 0.2.0, existing worker/report pipeline, Vitest,
Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P10-T0N` in
`task-contracts-and-test-vectors.md`.

## Entry Gate

- Phase 06 platform release gates pass.
- I Ching engineering may begin after Phase 06 and the Mingyu Liu Yao
  first-use gate.
- Public launch follows the Phase 09 launch gate unless the founder explicitly
  changes public launch order.
- Public casting remains disabled until OD-004 is resolved.

---

### Task 1 [P10-T01]: Define casting, replay, and anti-repeat policy

**Files:**
- Create: `docs/architecture/liuyao-method-and-safety.md`
- Create: `docs/dependencies/mingyu-liuyao-first-use.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/open-decisions.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`

**Interfaces:**
- Produces the approved casting-method and replay contract.
- Produces the founder-approved cooldown state machine after OD-004 closes.

- [ ] **Step 1: Inspect exact Mingyu casting capabilities**

Record supported manual and seeded methods, line encoding, moving-line
behavior, changed-hexagram output, calendar/time dependencies, and replay
inputs.

- [ ] **Step 2: Write the method and safety record**

Define normalized-question handling, stored replay data, prior-cast history,
health/legal/financial/crisis boundaries, and the behavior for unavailable
interpretation services.

- [ ] **Step 3: Complete the Liu Yao first-use gate**

Record package integrity, license/SBOM evidence, exact import path, transitive
runtime tree, reference cases, and replacement boundary.

- [ ] **Step 4: Resolve OD-004**

Sol presents cooldown options and recommendation to the founder. Record the
selected duration, normalized-question match rule, user-facing behavior, and
admin/support exceptions.

- [ ] **Step 5: Obtain Terra review and commit**

```bash
git add docs/architecture/liuyao-method-and-safety.md docs/dependencies/mingyu-liuyao-first-use.md docs/superpowers/plans
git commit -m "docs: define Liu Yao casting policy"
```

### Task 2 [P10-T02]: Implement normalized casting and replay fixtures

**Files:**
- Create: `packages/contracts/src/normalized-hexagram-v1.ts`
- Create: `packages/engine-adapters/src/iching/iching-engine.ts`
- Create: `packages/engine-adapters/src/iching/mingyu-liuyao-adapter.ts`
- Create: `packages/engine-adapters/src/iching/mingyu-liuyao-mapping.ts`
- Create: `packages/backend/src/iching/casting.service.ts`
- Create: `packages/backend/src/iching/casting.repository.ts`
- Create: `apps/api/src/iching/iching.controller.ts`
- Create: `packages/test-fixtures/iching/replay-fixtures.json`
- Create: `packages/test-fixtures/iching/trusted-sources.md`
- Test: `packages/contracts/src/normalized-hexagram-v1.test.ts`
- Test: `tests/calculation/iching-replay.test.ts`

**Interfaces:**
- Produces original hexagram, moving lines, changed hexagram, method, seed or
  manual lines, timestamps, warnings, and provenance as neutral IDs.
- Produces an immutable cast that can be reproduced exactly.

- [ ] **Step 1: Write failing replay fixtures**

Cover manual lines, seeded random input, no moving line, multiple moving
lines, changed hexagram, invalid line encoding, duplicate submission, and
exact replay.

- [ ] **Step 2: Run calculation tests**

Run: `pnpm vitest run tests/calculation/iching-replay.test.ts`
Expected: FAIL because the normalized contract and adapter are absent.

- [ ] **Step 3: Implement adapter mapping and immutable cast persistence**

Only the adapter imports Mingyu. Store vendor output privately, persist the
complete replay input, and return only normalized IDs.

- [ ] **Step 4: Cross-check selected casts**

Use reviewed worked examples and independent methodology references. Record
school/method differences instead of changing expected values by majority.

- [ ] **Step 5: Run contract, replay, and idempotency tests**

Run:
`pnpm vitest run packages/contracts/src/normalized-hexagram-v1.test.ts tests/calculation/iching-replay.test.ts`
Expected: every approved replay fixture PASS.

- [ ] **Step 6: Update trackers and commit**

```bash
git add packages/contracts packages/engine-adapters/src/iching packages/backend/src/iching apps/api/src/iching packages/test-fixtures/iching tests/calculation docs/superpowers/plans
git commit -m "feat: add replayable Liu Yao casting"
```

### Task 3 [P10-T03]: Add question UX, evidence, cooldown, and interpretation

**Files:**
- Create: `packages/backend/src/evidence/iching-rules.ts`
- Create: `packages/backend/src/iching/cooldown-policy.ts`
- Create: `packages/contracts/src/iching-reading-v1.ts`
- Create: `packages/backend/src/reports/iching-reading-outline.ts`
- Create: `packages/backend/src/reports/iching-reading-validator.ts`
- Create: `apps/web/src/app/[locale]/kinh-dich/page.tsx`
- Create: `apps/web/src/features/iching/casting-flow.tsx`
- Create: `apps/web/src/features/iching/hexagram-result.tsx`
- Create: `apps/web/messages/vi/iching.json`
- Create: `apps/web/messages/en/iching.json`
- Modify: `packages/backend/src/capabilities/capability.registry.ts`
- Modify: `apps/web/src/routes/route-registry.ts`
- Test: `packages/backend/src/iching/cooldown-policy.test.ts`
- Test: `packages/backend/src/reports/iching-reading-validator.test.ts`
- Test: `tests/e2e/iching-flow.spec.ts`

**Interfaces:**
- Produces one-question casting, prior-cast reuse, and the founder-approved
  cooldown behavior.
- Produces evidence-backed `IChingReadingV1`.

- [ ] **Step 1: Write failing question, cooldown, and safety tests**

Cover empty/oversized question, same normalized question inside cooldown,
different question, prior-cast display, manual and seeded input, replay,
evidence IDs, crisis language, and prohibited certainty.

- [ ] **Step 2: Run focused tests**

Run:
`pnpm vitest run packages/backend/src/iching packages/backend/src/reports/iching-reading-validator.test.ts && pnpm playwright test tests/e2e/iching-flow.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the approved cooldown state machine**

Do not permit silent rerolls. Return the prior cast and cooldown expiry for a
matching question, and preserve complete cast history.

- [ ] **Step 4: Implement evidence and interpretation**

Display original, moving, and changed hexagrams before interpretation. Every
claim references deterministic hexagram/line evidence and uses non-fatalistic
action language.

- [ ] **Step 5: Implement localized responsive UX**

Use one clear question flow, explicit casting method selection, method and
limitation disclosure, and owner-authorized history.

- [ ] **Step 6: Run full verification and internal review**

Run:
`pnpm i18n:check && pnpm vitest run tests/calculation/iching-replay.test.ts packages/backend/src/iching packages/backend/src/reports/iching-reading-validator.test.ts && pnpm playwright test tests/e2e/iching-flow.spec.ts`
Expected: PASS.

- [ ] **Step 7: Update registries, trackers, and commit**

```bash
git add packages/contracts packages/backend/src/evidence packages/backend/src/iching packages/backend/src/reports apps/web/src apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add responsible I Ching readings"
```

## Phase Exit Criteria

- Every cast is reproducible from stored input.
- Cooldown behavior is founder-approved and tested.
- Repeated casting is not encouraged or silently rerolled.
- Interpretation references deterministic hexagram and line evidence.
- Common safety, privacy, localization, and support gates pass.
- Terra records no unresolved `must-fix`.
