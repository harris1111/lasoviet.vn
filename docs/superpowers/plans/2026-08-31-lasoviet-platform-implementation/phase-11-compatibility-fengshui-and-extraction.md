# Phase 11 Compatibility, Feng Shui, and Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Luna implements only Terra-approved tasks.

**Goal:** Add approved later-wave relationship synthesis and understandable
Feng Shui utilities only after their source systems are stable, while keeping
the modular monolith as the default.

**Architecture:** Compatibility consumes two authorized `BirthProfileV1`
records and stable per-system evidence. Feng Shui uses a narrow Mingyu adapter.
Service extraction is a separate evidence-and-approval process, not an
automatic implementation task.

**Tech Stack:** Existing adapters and report pipeline, Mingyu 0.2.0 Feng Shui
capabilities, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P11-T0N` in
`task-contracts-and-test-vectors.md`.

## Entry Gate

- Phase 10 public launch gate passes before Phase 11 public features launch.
- Each compatibility source system passes its own fixture, evidence, privacy,
  and support stability gate.
- OD-005 blocks compatibility contract finalization and implementation.
- OD-006 blocks Feng Shui contract finalization and implementation.
- Extraction requires measured evidence and a separate founder-approved plan.

---

### Task 1 [P11-T01]: Establish compatibility source-system and product gates

**Files:**
- Create: `docs/architecture/compatibility-readiness.md`
- Modify: `packages/backend/src/capabilities/capability.registry.ts`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/open-decisions.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/risk-register.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`

**Interfaces:**
- Produces a pass/fail readiness record for each candidate source system.
- Produces the founder-approved system set, SKU scope, and price after OD-005
  closes.

- [ ] **Step 1: Define measurable source-system readiness**

Require approved fixtures, stable normalized contracts, evidence coverage,
known limitations, support ownership, and no unresolved severity-1 defects for
every included system.

- [ ] **Step 2: Define two-profile authorization and consent**

Record owner, invited participant, consent version, revocation, report access,
deletion, and support behavior. One user may not silently create a private
report about another identifiable person.

- [ ] **Step 3: Define per-system compatibility evidence**

Each source system must expose relationship evidence independently before any
cross-system synthesis is permitted.

- [ ] **Step 4: Resolve OD-005**

Sol presents the stable candidate systems, recommended first SKU, scope, and
price. Record the founder decision before contracts or checkout are finalized.

- [ ] **Step 5: Obtain Terra review and commit**

```bash
git add docs/architecture/compatibility-readiness.md packages/backend/src/capabilities docs/superpowers/plans
git commit -m "docs: define compatibility readiness gates"
```

### Task 2 [P11-T02]: Implement compatibility without hiding source evidence

**Files:**
- Create: `packages/contracts/src/compatibility-evidence-v1.ts`
- Create: `packages/contracts/src/compatibility-report-v1.ts`
- Create: `packages/backend/src/compatibility/compatibility.service.ts`
- Create: `packages/backend/src/compatibility/compatibility.repository.ts`
- Create: `packages/backend/src/reports/compatibility-report-outline.ts`
- Create: `packages/backend/src/reports/compatibility-report-validator.ts`
- Create: `apps/api/src/compatibility/compatibility.controller.ts`
- Create: `apps/web/src/app/[locale]/tuong-hop/page.tsx`
- Create: `apps/web/src/features/compatibility/compatibility-form.tsx`
- Create: `apps/web/src/features/compatibility/source-evidence.tsx`
- Create: `apps/web/messages/vi/compatibility.json`
- Create: `apps/web/messages/en/compatibility.json`
- Modify: `packages/backend/src/commerce/product-catalog.ts`
- Modify: `apps/web/src/routes/route-registry.ts`
- Test: `packages/backend/src/reports/compatibility-report-validator.test.ts`
- Test: `tests/e2e/compatibility-flow.spec.ts`

**Interfaces:**
- Consumes two authorized profile revisions and the exact founder-approved
  source-system evidence versions.
- Produces source-separated agreement, tension, limitation, and synthesis.

- [ ] **Step 1: Write failing authorization, consent, and evidence tests**

Cover same-owner profiles, invited participant consent, revoked consent,
deleted profile, stale revision, unsupported source system, missing evidence,
and cross-system contradiction.

- [ ] **Step 2: Run focused tests**

Run:
`pnpm vitest run packages/backend/src/reports/compatibility-report-validator.test.ts && pnpm playwright test tests/e2e/compatibility-flow.spec.ts`
Expected: FAIL because compatibility contracts and services are absent.

- [ ] **Step 3: Implement source-separated evidence aggregation**

Preserve system identity, method, version, confidence, and limitations. Do not
flatten disagreement into one unsupported compatibility score.

- [ ] **Step 4: Implement bounded synthesis and private UX**

Show source evidence before synthesis. Use owner/participant authorization,
private noindex pages, immutable report versions, and common safety rules.

- [ ] **Step 5: Run privacy, evidence, report, and delivery E2E**

Run:
`pnpm i18n:check && pnpm vitest run packages/backend/src/reports/compatibility-report-validator.test.ts && pnpm playwright test tests/e2e/compatibility-flow.spec.ts`
Expected: PASS through checkout, report, PDF, Garage, and email for the
founder-approved SKU.

- [ ] **Step 6: Update catalog, registries, trackers, and commit**

```bash
git add packages/contracts packages/backend/src/compatibility packages/backend/src/reports packages/backend/src/commerce apps/api/src/compatibility apps/web/src apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add evidence-backed compatibility"
```

### Task 3 [P11-T03]: Add the approved Feng Shui utility

**Files:**
- Create: `docs/architecture/fengshui-method-record.md`
- Create: `docs/dependencies/mingyu-fengshui-first-use.md`
- Create: `packages/contracts/src/normalized-fengshui-result-v1.ts`
- Create: `packages/engine-adapters/src/fengshui/fengshui-engine.ts`
- Create: `packages/engine-adapters/src/fengshui/mingyu-fengshui-adapter.ts`
- Create: `packages/backend/src/fengshui/fengshui.service.ts`
- Create: `apps/api/src/fengshui/fengshui.controller.ts`
- Create: `apps/web/src/app/[locale]/phong-thuy/page.tsx`
- Create: `apps/web/src/features/fengshui/fengshui-form.tsx`
- Create: `apps/web/messages/vi/fengshui.json`
- Create: `apps/web/messages/en/fengshui.json`
- Modify: `packages/backend/src/capabilities/capability.registry.ts`
- Modify: `apps/web/src/routes/route-registry.ts`
- Test: `tests/calculation/fengshui-utilities.test.ts`
- Test: `tests/e2e/fengshui-utility.spec.ts`

**Interfaces:**
- Produces only the utility selected in OD-006, with stable inputs, normalized
  outputs, method/version, evidence, and limitations.

- [ ] **Step 1: Resolve OD-006**

Record the first utility and exact input/output scope before finalizing the
contract. Do not implement house, desk, kitchen, and color guidance together.

- [ ] **Step 2: Write the method record and complete first-use review**

Record the exact Mingyu export, school/method, required direction/location
inputs, excluded jargon, known limitations, license/SBOM evidence, fixtures,
and replacement boundary.

- [ ] **Step 3: Write failing deterministic fixtures**

Cover representative valid inputs, boundary directions, invalid or
insufficient input, locale-independent IDs, and method limitations.

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest run tests/calculation/fengshui-utilities.test.ts`
Expected: FAIL because the contract and adapter are absent.

- [ ] **Step 5: Implement the narrow adapter, service, and localized UI**

Exclude physical-product commerce, guaranteed outcomes, unapproved schools,
and raw vendor jargon.

- [ ] **Step 6: Run fixture, accessibility, safety, and E2E verification**

Run:
`pnpm i18n:check && pnpm vitest run tests/calculation/fengshui-utilities.test.ts && pnpm playwright test tests/e2e/fengshui-utility.spec.ts`
Expected: PASS.

- [ ] **Step 7: Update registries, trackers, and commit**

```bash
git add docs/architecture/fengshui-method-record.md docs/dependencies/mingyu-fengshui-first-use.md packages/contracts packages/engine-adapters/src/fengshui packages/backend/src/fengshui packages/backend/src/capabilities apps/api/src/fengshui apps/web/src apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add approved Feng Shui utility"
```

### Task 4 [P11-T04]: Evaluate extraction from measured evidence

**Files:**
- Create: `docs/architecture/workload-extraction-review.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/risk-register.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`

**Interfaces:**
- Produces a founder decision packet for one measured extraction candidate.
- Produces no service, network contract, deployment file, or data migration.

- [ ] **Step 1: Collect operational evidence**

Record latency, CPU, memory, queue depth, failure isolation, security
boundary, runtime incompatibility, scaling profile, and deployment lifecycle
for AI, PDF, embedding, replication, and future image processing.

- [ ] **Step 2: Reject unsupported candidates**

Keep identity, profiles, commerce, and normal calculators in the modular
monolith unless measured evidence proves a concrete operational problem.

- [ ] **Step 3: Write one candidate extraction packet**

Document current module, proposed private service, contract, data ownership,
benefit, operational cost, migration sequence, rollback, and failure mode.

- [ ] **Step 4: Obtain Terra review and founder approval**

No extraction implementation begins from this phase file. An approved
candidate receives a separate architecture amendment and executable plan.

- [ ] **Step 5: Update trackers and commit**

```bash
git add docs/architecture/workload-extraction-review.md docs/superpowers/plans
git commit -m "docs: evaluate workload extraction"
```

## Phase Exit Criteria

- Compatibility uses stable source systems and explicit two-profile consent.
- Source-system evidence remains visible before synthesis.
- Feng Shui contains one founder-approved utility and no physical commerce.
- No microservice is created for theoretical scalability.
- Future biometric work still requires a separate design and approval cycle.
- Terra records no unresolved `must-fix`.
