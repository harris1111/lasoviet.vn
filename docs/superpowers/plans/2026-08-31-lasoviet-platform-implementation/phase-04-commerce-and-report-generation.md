# Phase 04 Commerce and Report Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`.

**Goal:** Deliver SePay checkout through immutable evidence-backed identity
report generation and private HTML viewing.

**Architecture:** Payment confirmation commits order, entitlement, and outbox
atomically. Worker jobs use IDs and frozen versions. The AI adapter operates
only on approved facts, evidence, and knowledge.

**Tech Stack:** SePay HTTP/webhook, PostgreSQL, BullMQ, Redis, Zod, OpenAI-
compatible HTTP API.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P04-T0N` in
`task-contracts-and-test-vectors.md`. Asynchronous edges are normative in
`workflow-event-contracts.md`.

## Task 1-2 Evidence (2026-09-03)

- Provider contract, server-only SePay environment validation, catalog/order
  policy, hosted checkout signature adapter, raw public ingress, private
  controller, and checkout action/page are reviewed complete with focused
  RED/GREEN coverage.
- Atomic order/payment-event/entitlement/report-reservation/outbox insertion
  and an outbox lease/dispatch boundary are implemented. Report worker
  consumption remains Task 3.
- Test-only correction commit
  `200b85222a8b6eedb4692a76f31aed27c73bd214` aligned migration `0010`
  actor/key/fingerprint receipts and fixed the outbox-claim fixture to derive
  time from persisted `availableAt`, isolate rows, and bind dispatch
  assertions to the target event. Sol's scoped re-review returned
  `SAFE_TO_PUSH_AND_RERUN_VPS_GATE` with no open findings.
- Focused verification passed 52 tests, scoped ESLint, i18n parity, affected
  typechecks and builds, a Next production build, and `git diff --check`.
  The local controller also reran the three changed test files: 13 tests
  passed.
- The Docker VPS gate passed: the workspace producer build passed; the focused
  gate ran four test files with 18 tests and zero failures; and Compose
  deployment completed with migrations exiting `0`, healthy PostgreSQL, Redis,
  API, and web services, and a running worker.
- The deployed database reports 12 applied migrations, the requested
  commerce/report tables, and both report outbox indexes. Loopback and public
  HTTPS health checks returned `200`; the sandbox endpoint is deployed.
- Public synthetic SePay IPN probes returned `401` for a wrong secret and the
  exact HTTP `200` success acknowledgement for an authenticated non-paid
  `TRANSACTION_VOID`, without changing commerce aggregate counts. No real
  order, paid notification, real-money payment, production payment activation,
  Nginx/DNS change, or credential output occurred.
- Browser smoke rendered live VI/EN home pages and preserved locale-specific
  checkout login callbacks. Existing live Playwright specs remain
  local-runtime-oriented because their locale cookie domain is `127.0.0.1`;
  direct production execution failed before the tested form flow. This is a
  harness limitation, not passing evidence or a production defect.
- The remaining external step is the founder clicking SePay dashboard `Send
  test`; production payment activation remains a separate founder-controlled
  gate.
- Correction pass 1 maps IPN domain failures to bounded non-2xx HTTP outcomes,
  uses a conditional pending-to-paid transition, persists the complete
  report-request payload, and runs the durable queue-job dispatch boundary in
  the worker.
- FD-029 requires a live authenticated, non-anonymous, email-verified account
  before any checkout order lookup or write. Immutable financial provenance
  keeps opaque chart/version identifiers without foreign keys that could block
  FD-020 anonymous lifecycle purge.
- Correction pass 2 consolidates the undeployed commerce/report queue/retention
  baseline into `0011_commerce_payment_gateway.sql`, normalizes integer VND
  IPN values, persists the selected `vi|en` locale, filters report-only outbox
  claims, and schedules dispatch without overlap or unhandled failures.
- Replan Cycle 1 adds event-type-aware outbox claim indexes to the clean
  `0011` baseline and carries the persisted locale through hosted callback
  paths and canonical private checkout rendering.

## Global Constraints

- `ZIWEI-IDENTITY-P0` is the only first paid SKU.
- Price baseline is VND 79,000.
- Return URLs do not confirm payment.
- No double entitlement or report from webhook replay.
- AI endpoint details are requested only when this phase begins.
- No draft or critic-failed content is shown as complete.
- Phase 04 exposes stable, redacted admin-operable domain interfaces and
  versioned workflow state only; it does not implement an admin UI. Phase 05A
  consumes these interfaces after its Phase 03 access foundation exists.
- Support recovery must reserve a new immutable report version or create a
  policy-checked compensating command. It must never edit a paid report,
  directly requeue BullMQ, or bypass the outbox.

---

## Admin-Operable Domain Contract

Phase 04 services provide private API projections for order/payment state,
entitlement state, immutable report lineage, generation attempts, bounded
failure codes, and outbox correlation. They accept only domain commands with
an actor, reason code, request/trace ID, idempotency key, and expected version
where applicable.

The only Phase 04 recovery effects available to Phase 05A are:

- `requestReportRegeneration`, which applies policy, reserves a new report
  version, records a support/recovery decision, and emits
  `report.generation.requested.v1` through the transactional outbox;
- `requestWorkflowRetry`, which applies policy and emits a versioned retry
  request through the transactional outbox; and
- `recordRefundReview` or `recordRefundOutcome`, which changes only approved
  internal commerce state and does not call a payment provider directly.

Controllers, BFFs, and console components do not access commerce/report tables
or BullMQ directly. Full payloads, report bodies, provider secrets, and raw
payment payloads are not admin projections.

### Task 1 [P04-T01]: Implement orders, SePay adapter, and checkout

**Files:**
- Create: `docs/compliance/sepay-provider-contract.md`
- Create: `packages/contracts/src/commerce.ts`
- Create: `packages/backend/src/commerce/product-catalog.ts`
- Create: `packages/backend/src/commerce/order.service.ts`
- Create: `packages/backend/src/commerce/payment-provider.ts`
- Create: `packages/backend/src/commerce/sepay-adapter.ts`
- Modify: `config/route-registry.yml`
- Modify: `packages/config/src/environment-schema.ts`
- Create: `packages/database/src/schema/commerce.ts`
- Create: `apps/api/src/commerce/commerce.controller.ts`
- Create: `apps/web/src/app/[locale]/thanh-toan/[orderId]/page.tsx`
- Test: `packages/backend/src/commerce/order.service.test.ts`
- Test: `packages/config/src/environment-schema.test.ts`
- Create: `tests/seo/private-route-state.test.ts`

**Interfaces:**
- Produces `PaymentProvider.createPayment(order)`.
- Produces `createOrder(actor, chartId, sku)`.
- Produces a server-authoritative catalog containing
  `ZIWEI-IDENTITY-P0` at the approved VND 79,000 baseline.
- Produces typed checkout states `pending`, `paid`, `expired`, `failed`,
  `refunded`.
- Produces a dated, source-linked SePay contract record and complete server-only
  environment-variable group before adapter implementation.
- Promotes `/thanh-toan/{order_id}` to `live_noindex` only with the implemented
  checkout flow and keeps it absent from every sitemap.

- [x] **Step 1: Complete the SePay implementation preflight**

Sol requests the founder's non-secret environment selection, merchant/account
identifiers, webhook registration inputs, and approved secret-delivery path.
Inspect the current provider contract and record exact request fields,
authentication/signature behavior, required webhook headers, replay semantics,
acknowledgement response, and environment-variable names. Do not record secret
values. Any unresolved provider behavior returns through Terra to Sol before
Luna receives an implementation instruction.

- [x] **Step 2: Write failing order-policy and environment tests**

Assert SKU/price server authority, chart ownership, entitlement reuse rules,
unknown-time rejection, no order for an unsupported SKU, and startup rejection
when any verified SePay server variable is missing. Assert the checkout route
is `live_noindex`, server-authorized where state requires it, noindex, and
absent from navigation and sitemaps.

- [x] **Step 3: Run tests**

Run:
`pnpm vitest run packages/backend/src/commerce/order.service.test.ts packages/config/src/environment-schema.test.ts tests/seo/private-route-state.test.ts`
Expected: FAIL.

- [x] **Step 4: Implement provider adapter and checkout**

Implement only the verified provider contract. Use server-side SePay
credentials and persist provider reference without logging secrets.

- [x] **Step 5: Run tests**

Run:
`pnpm vitest run packages/backend/src/commerce packages/config/src/environment-schema.test.ts tests/seo/private-route-state.test.ts`
Expected: PASS.

- [x] **Step 6: Update trackers and commit**

```bash
git add docs/compliance/sepay-provider-contract.md config/route-registry.yml packages/contracts packages/config/src/environment-schema.ts packages/config/src/environment-schema.test.ts packages/backend/src/commerce packages/database apps/api/src/commerce apps/web/src/app tests/seo/private-route-state.test.ts docs/superpowers/plans
git commit -m "feat: add SePay checkout"
```

### Task 2 [P04-T02]: Implement signed webhook, entitlement transaction, and outbox

**Files:**
- Create: `apps/web/src/app/api/webhooks/sepay/route.ts`
- Create: `packages/backend/src/commerce/sepay-webhook.service.ts`
- Create: `packages/backend/src/commerce/entitlement.service.ts`
- Create: `packages/backend/src/outbox/outbox.dispatcher.ts`
- Test: `tests/payments/sepay-webhook.integration.test.ts`

**Interfaces:**
- Consumes raw body and headers.
- Produces one payment event, paid order, entitlement, reserved report
  version, and `report.generation.requested.v1` outbox event in one
  transaction.
- The outbox dispatcher maps that event to `report.generate.v1` exactly as
  defined in `workflow-event-contracts.md`.

- [x] **Step 1: Write failing webhook tests**

Cover valid signature, invalid signature, wrong amount, unknown order, replay,
out-of-order events, concurrent delivery, and database rollback.

- [x] **Step 2: Run integration test**

Run: `pnpm vitest run tests/payments/sepay-webhook.integration.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement raw ingress and transactional handler**

The Next.js route forwards the raw body and exact headers named by the verified
SePay contract record. The API verifies provider authenticity and business
invariants.

- [x] **Step 4: Implement outbox claiming and dispatch**

Use lease/attempt fields and an idempotent event key. Redis failure leaves the
outbox event available for retry.

- [x] **Step 5: Run payment tests**

Run: `pnpm vitest run tests/payments`
Expected: PASS, including concurrency.

- [x] **Step 6: Update risk/rule trackers and commit**

```bash
git add apps/web/src/app/api/webhooks packages/backend/src/commerce packages/backend/src/outbox tests/payments docs/superpowers/plans
git commit -m "feat: process idempotent SePay webhooks"
```

### Task 3 [P04-T03]: Build the worker and report state machine

**Files:**
- Create: `packages/contracts/src/jobs.ts`
- Create: `packages/backend/src/jobs/queue.registry.ts`
- Create: `packages/backend/src/reports/report.service.ts`
- Create: `packages/backend/src/reports/report-state.ts`
- Create: `packages/database/src/schema/reports.ts`
- Create: `apps/worker/src/processors/report-generate.processor.ts`
- Test: `packages/backend/src/reports/report-state.test.ts`
- Test: `tests/jobs/report-worker-state.integration.test.ts`

**Interfaces:**
- Produces `ReportStatus` transitions.
- Consumes `report.generate.v1` with `ReportGenerationRequestedV1`.
- Produces `report.fulfillment.failed.v1` only on a terminal generation or
  worker-state failure.
- Produces `WORKER_QUEUES` selection.

- [ ] **Step 1: Write failing state and job tests**

Cover duplicate jobs, crash after claim, retry, terminal worker-state failure,
and invalid state transitions. Assert the exact event-to-job mapping and
payload from `workflow-event-contracts.md` without invoking a report writer
that is not created until P04-T05.

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run packages/backend/src/reports tests/jobs`
Expected: FAIL.

- [ ] **Step 3: Implement queue registry and persisted state**

Worker restart must resume from database state. Queue state is not the only
record of progress.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run packages/backend/src/reports tests/jobs`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add packages/contracts packages/backend/src/jobs packages/backend/src/reports packages/database apps/worker tests/jobs docs/superpowers/plans
git commit -m "feat: add durable report workflow"
```

### Task 4 [P04-T04]: Implement approved knowledge ingestion and retrieval

**Files:**
- Create: `content/knowledge/vi/ziwei/`
- Create: `content/knowledge/en/ziwei/`
- Create: `packages/backend/src/knowledge/knowledge-ingestion.service.ts`
- Create: `packages/backend/src/knowledge/knowledge-retrieval.service.ts`
- Create: `packages/database/src/schema/knowledge.ts`
- Create: `apps/worker/src/processors/knowledge-embed.processor.ts`
- Test: `packages/backend/src/knowledge/knowledge-retrieval.service.test.ts`

**Interfaces:**
- Produces versioned approved `KnowledgePassageV1`.
- Produces metadata-filtered full-text retrieval.
- Adds vector retrieval only when enabled and indexed.

- [ ] **Step 1: Write failing ingestion/retrieval tests**

Reject unapproved documents, missing source/license metadata, wrong locale,
wrong discipline, stale version, and excessive context.

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run packages/backend/src/knowledge`
Expected: FAIL.

- [ ] **Step 3: Implement file ingestion and PostgreSQL full-text retrieval**

Open-web retrieval is absent. Preserve content hash and approval record.

- [ ] **Step 4: Add optional pgvector path**

Disabled mode must pass all non-vector tests.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run packages/backend/src/knowledge`
Expected: PASS with vectors disabled and, when configured, enabled.

- [ ] **Step 6: Update trackers and commit**

```bash
git add content/knowledge packages/backend/src/knowledge packages/database apps/worker docs/superpowers/plans
git commit -m "feat: add approved knowledge retrieval"
```

### Task 5 [P04-T05]: Implement AI capability probe, report writer, and critic

**Files:**
- Create: `docs/compliance/ai-provider-due-diligence.md`
- Create: `packages/backend/src/ai/ai-provider.ts`
- Create: `packages/backend/src/ai/openai-compatible-adapter.ts`
- Create: `packages/backend/src/ai/capability-probe.ts`
- Create: `packages/backend/src/reports/identity-report-outline.ts`
- Create: `packages/backend/src/reports/identity-report-writer.ts`
- Create: `packages/backend/src/reports/report-validator.ts`
- Create: `packages/backend/src/reports/report-critic.ts`
- Create: `packages/backend/src/reports/report-version.repository.ts`
- Test: `packages/backend/src/ai/capability-probe.test.ts`
- Test: `packages/backend/src/reports/report-validator.test.ts`
- Test: `tests/compliance/ai-provider-gate.test.ts`
- Test: `tests/jobs/report-generation.integration.test.ts`

**Interfaces:**
- Produces `AiProvider.generateStructured(request)`.
- Produces `IdentityReportV1`.
- Produces validator results with evidence and prohibited-category findings.
- Commits an immutable validated HTML report version and emits
  `report.pdf.requested.v1` exactly once.
- Production AI calls require a complete approved provider due-diligence
  record.

- [ ] **Step 1: Obtain phase-specific founder inputs**

Sol asks for base URL and model. API key is placed in the approved secret
environment, not committed or copied into docs.

- [ ] **Step 2: Record provider privacy and operational due diligence**

Record provider/controller identity, data-processing purpose, retention,
training use, storage/processing regions, subprocessors, access controls,
deletion behavior, incident-notification terms, contract/policy source and
date, reviewer, decision, and required mitigations. Do not record credentials.
Terra verifies completeness against approved privacy requirements. Missing,
unsuitable, or materially changed terms stop the phase and return through
Terra to Sol for a founder decision; Terra does not approve provider privacy
trade-offs.

- [ ] **Step 3: Write failing capability, provider-gate, and validator tests**

Cover schema support, malformed output, timeout, evidence fabrication, missing
evidence, absolute accident/death/disease/legal/financial claims, diagnosis,
fear upsell, unsupported language, an incomplete/unapproved due-diligence
record, duplicate generation jobs, and no PDF event before validated immutable
HTML commits.

- [ ] **Step 4: Run tests**

Run:
`pnpm vitest run packages/backend/src/ai packages/backend/src/reports tests/compliance/ai-provider-gate.test.ts tests/jobs/report-generation.integration.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implement the capability probe**

If the endpoint cannot satisfy the approved contract, Luna stops. Terra
reviews evidence and returns it to Sol for founder escalation.

- [ ] **Step 6: Implement deterministic outline and bounded section generation**

Freeze chart, evidence, knowledge, prompt, locale, and model versions before
generation.

- [ ] **Step 7: Implement deterministic validation, persistence, and critic**

Reject unsafe or unsupported reports. Do not expose failed drafts. Commit the
validated immutable HTML version before emitting one idempotent
`report.pdf.requested.v1`; retry must not create a second version or event.

- [ ] **Step 8: Run tests and a controlled endpoint smoke**

Run:
`pnpm vitest run packages/backend/src/ai packages/backend/src/reports tests/compliance/ai-provider-gate.test.ts tests/jobs/report-generation.integration.test.ts`
Expected: PASS. Endpoint smoke stores no real user PII.

- [ ] **Step 9: Update risk/rule trackers and commit**

```bash
git add docs/compliance packages/backend/src/ai packages/backend/src/reports tests/compliance docs/superpowers/plans
git commit -m "feat: generate evidence-backed identity reports"
```

#### AI-First Foundation Checkpoint (2026-09-02)

- Added the owned raw-`fetch` OpenAI-compatible adapter, strict structured
  output, synthetic capability probe, and pending-production due-diligence
  gate for founder-operated provider `9router-an`.
- Added the strict `IdentityReportV1` contract, deterministic outline,
  draft-only writer, evidence/safety validator, and threshold critic without
  introducing visual UI.
- Final focused evidence passed 10 AI/report files with 37 tests and 14
  dependent files with 52 tests, plus focused ESLint, contracts/config builds,
  backend typecheck, backend build, and one no-PII endpoint smoke.
- The configured routing alias may differ from the canonical returned model
  identity; the probe records the nonempty returned identity instead of
  requiring textual equality.
- Sol approved the completed checkpoint after the writer was bound to a
  production-shaped PII-free frozen fact snapshot, provenance and the
  professional-advice disclaimer became server-owned, evidence and rendered
  text validation became deterministic, the critic consumed the same source
  snapshot, timeout retries honored their budget, and valid report formatting
  remained allowed.
- This checkpoint does not complete P04-T05. Provider privacy approval,
  P04-T04 knowledge retrieval, P04-T03 worker state, immutable persistence,
  duplicate-job integration, and `report.pdf.requested.v1` remain required
  before the task or phase can close.

### Task 6 [P04-T06]: Persist immutable report versions and render private HTML

**Files:**
- Create: `packages/contracts/src/identity-report-v1.ts`
- Modify: `packages/backend/src/reports/report-version.repository.ts`
- Create: `apps/api/src/reports/reports.controller.ts`
- Create: `apps/web/src/app/[locale]/bao-cao/[reportId]/page.tsx`
- Create: `apps/web/src/features/reports/report-progress.tsx`
- Create: `apps/web/src/features/reports/identity-report.tsx`
- Modify: `config/route-registry.yml`
- Modify: `tests/seo/private-route-state.test.ts`
- Test: `tests/e2e/paid-report-html.spec.ts`

**Interfaces:**
- Produces immutable version lineage through `supersedesReportId`.
- Produces owner-authorized status and report queries.
- Promotes `/bao-cao/{opaque_id}` to `live_noindex` only with the private report
  flow and keeps it absent from navigation and sitemaps.

- [ ] **Step 1: Write failing report E2E**

Cover pending refresh, ready report, unauthorized access, noindex, evidence
drawer, locale, immutable old version, failed generation state, registry state,
and sitemap exclusion.

- [ ] **Step 2: Run E2E**

Run:
`pnpm vitest run tests/seo/private-route-state.test.ts && pnpm playwright test tests/e2e/paid-report-html.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement version persistence and private UI**

Do not overwrite a purchased version when prompts, engine, or model change.

- [ ] **Step 4: Run E2E**

Run:
`pnpm vitest run tests/seo/private-route-state.test.ts && pnpm playwright test tests/e2e/paid-report-html.spec.ts`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add config/route-registry.yml packages/contracts packages/backend/src/reports apps/api/src/reports apps/web/src/app apps/web/src/features/reports tests/seo/private-route-state.test.ts tests/e2e docs/superpowers/plans
git commit -m "feat: publish immutable private reports"
```

## Phase Exit Criteria

- Valid SePay payment creates one entitlement and one report lineage.
- Replay and concurrent webhook tests pass.
- Redis outage does not lose paid work.
- Knowledge is approved and versioned.
- AI capability probe passes with the founder endpoint.
- Every report claim is evidence-backed and safety-validated.
- Private HTML report works after refresh and is noindex.
- Terra has no unresolved `must-fix`.
