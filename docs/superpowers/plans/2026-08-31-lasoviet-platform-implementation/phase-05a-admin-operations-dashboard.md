# Phase 05A Admin and Operations Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a private, auditable Operations Dashboard V1 that safely
operates approved account, commerce, report, delivery, privacy, support, and
readiness workflows without becoming a CMS or direct infrastructure console.

**Architecture:** `/admin/**` is a server-authorized `live_noindex` BFF
surface over a private API. The API resolves database-backed RBAC capabilities,
returns redacted projections, and sends every state-changing operation to an
existing domain service with command context, audit persistence, optimistic
version checks, idempotency, and outbox mediation.

**Tech Stack:** Next.js 16, Better Auth, NestJS/Fastify, PostgreSQL, Drizzle,
Zod, BullMQ, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-02-admin-operations-dashboard-design.md`

**Task Contracts:** Task N maps to `P05A-T0N` in
`docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/task-contracts-and-test-vectors.md`.
Asynchronous edges are normative in
`docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/workflow-event-contracts.md`.

## Global Constraints

- Foundation work may begin after Phase 03. Closure requires the Phase 04 and
  Phase 05 workflows that the console observes and operates.
- Phase 06 paid-release readiness depends on this phase.
- `/admin/**` routes are `live_noindex`, server-authorized, excluded from all
  public navigation and sitemaps, excluded from the public indexable-route
  inventory, and included in private-route security/indexing evidence.
- Use verified Better Auth sessions plus database-backed role assignments and
  capabilities. Browser-supplied role/capability values are untrusted.
- Every privileged read is API-authorized and audit-recorded. Every command
  requires actor, reason code, request/trace ID, idempotency key, expected
  version where applicable, and an append-only audit record.
- Controllers and UI call domain services only. No direct database edits,
  immutable record mutation, arbitrary SQL, direct BullMQ requeue, arbitrary
  queue/job execution, secrets display, payment-provider mutation, CMS
  editing, or chart/report content editing.
- Default projections redact PII and never include credentials, environment
  maps, secrets, password hashes, sessions, signed URLs, full report bodies,
  or raw birth/chart payloads.
- Admin V1 has no unredacted sensitive-detail capability, endpoint, or UI.
- Planned source files stay below 200 LOC by feature decomposition. File names
  and code comments describe domain behavior, never task or finding labels.
- SePay, production AI, Google OAuth, DNS, external deployment, and full CMS
  remain disabled or deferred unless their separate founder gates close.

---

### Task 1 [P05A-T01]: Establish private routes, verified admin sessions, RBAC, and audit primitives

**Files:**
- Create: `packages/contracts/src/admin-auth.ts`
- Create: `packages/database/src/schema/admin-access.ts`
- Create: `packages/backend/src/admin-access/capability.service.ts`
- Create: `packages/backend/src/admin-access/audit.service.ts`
- Create: `apps/api/src/admin-access/admin-access.controller.ts`
- Create: `apps/web/src/app/[locale]/admin/layout.tsx`
- Create: `apps/web/src/app/[locale]/admin/page.tsx`
- Modify: `config/route-registry.yml`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/backend/src/admin-access/capability.service.test.ts`
- Test: `packages/backend/src/admin-access/audit.service.test.ts`
- Test: `tests/security/admin-route-boundary.integration.test.ts`
- Test: `tests/seo/private-route-state.test.ts`

**Interfaces:**
- Consumes `CurrentActor` resolved from a verified Better Auth database session.
- Produces `resolveAdminAccess(actor): Result<AdminAccessV1, "ADMIN_AUTH_REQUIRED" | "ADMIN_FORBIDDEN" | "ROLE_ASSIGNMENT_INACTIVE">`.
- Produces `authorizeAdminRead(context, capability, target): Result<void, "ADMIN_FORBIDDEN">`.
- Produces `appendAdminAudit(entry): Promise<AdminAuditId>`.
- Produces roles `super_admin`, `operations`, `support`, and `read_only`, and
  the capability matrix defined by the Phase 05A spec.

- [x] **Step 1: Write failing role, route, and audit tests**

Write tests proving an anonymous session, an unverified account session, and a
verified account without an active assignment cannot render or call
`/admin/**`. Cover the complete role/capability matrix, role-assignment
revocation, public-navigation absence, every-sitemap exclusion, `noindex`, and
an audit row for an authorized privileged read.

- [x] **Step 2: Run the RED tests**

Run:
`pnpm vitest run packages/backend/src/admin-access/capability.service.test.ts packages/backend/src/admin-access/audit.service.test.ts tests/security/admin-route-boundary.integration.test.ts tests/seo/private-route-state.test.ts`

Expected: FAIL because admin access contracts, schema, API authorization, and
route entries do not exist.

- [x] **Step 3: Implement database-backed access and append-only audit**

Add role-assignment, capability-policy, and audit schemas. Resolve active role
assignments only from PostgreSQL after Better Auth session verification. Make
role assignment/revocation require `admin.roles.manage`, a reason code,
request/trace ID, idempotency key, expected assignment version, and an audit
row. Keep audit payloads redacted and append-only.

- [x] **Step 4: Implement private route enforcement**

Add only the implemented `/admin` overview route as `live_noindex`. Resolve
the session on the server, authorize it through the private API, and return
not-found-equivalent safe denial for unauthorized routes. Do not add public
navigation, sitemap, or client role checks as an authority.

- [x] **Step 5: Run the GREEN tests**

Run:
`pnpm vitest run packages/backend/src/admin-access packages/contracts/src/admin-auth.ts tests/security/admin-route-boundary.integration.test.ts tests/seo/private-route-state.test.ts`

Expected: PASS. Every authorization outcome has a redacted audit record and
no `/admin/**` route enters a sitemap.

- [x] **Step 6: Update trackers and commit**

Record implementation evidence, any new access-control risk, and completion
state in the plan package. Commit only after phase-authorized implementation:

```bash
git add config/route-registry.yml packages/contracts packages/database packages/backend/src/admin-access apps/api/src/admin-access apps/web/src/app tests/security tests/seo docs/superpowers/plans
git commit -m "feat: add private admin access controls"
```

**Completion evidence (2026-09-03):** Added fail-closed verified-session
authorization, database-backed active-role and active-policy resolution, the
approved V1 capability matrix, one-active-assignment enforcement, redacted
append-only audit storage, and the first server-authorized `/admin` route.
Trusted preflight denial auditing covers missing, anonymous, and unverified
sessions without creating anonymous sessions or exposing a public audit-write
endpoint. The private route is `live_noindex`, absent from public navigation
and every sitemap. Final focused correction coverage passed 38 tests and Sol
closed both correction passes with no Critical or Important finding. The
post-correction migration/full-suite run remains host-blocked at Testcontainers
startup; all 272 non-container tests in that attempt passed.

### Task 2 [P05A-T02]: Add redacted operational projections and overview health

**Files:**
- Create: `packages/contracts/src/admin-projections.ts`
- Create: `packages/backend/src/admin-overview/admin-overview.service.ts`
- Create: `packages/backend/src/admin-overview/admin-health.service.ts`
- Create: `apps/api/src/admin-overview/admin-overview.controller.ts`
- Create: `apps/web/src/features/admin-overview/admin-overview-loader.ts`
- Create: `apps/web/src/features/admin-overview/admin-overview-table.tsx`
- Modify: `apps/web/src/app/[locale]/admin/page.tsx`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/backend/src/admin-overview/admin-overview.service.test.ts`
- Test: `tests/security/admin-projection-redaction.integration.test.ts`
- Test: `tests/e2e/admin-overview.spec.ts`

**Interfaces:**
- Consumes authorized `AdminReadContext` and bounded filters.
- Produces `AdminOverviewV1`, `AdminHealthV1`, and pagination-safe
  `AdminListPageV1<T>`.
- Produces safe summaries for account/verification/retention, order/payment/
  entitlement, report/generation/outbox, asset/delivery, support, privacy, and
  readiness state.
- Returns `ADMIN_FORBIDDEN`, `ADMIN_FILTER_INVALID`, or
  `ADMIN_PROJECTION_UNAVAILABLE`; never exposes source rows on error.

- [x] **Step 1: Write failing projection and redaction tests**

Assert overview metrics derive from authoritative PostgreSQL state, health
uses approved dependency/workflow probes, filters enforce bounded page size,
and every role sees only permitted modules. Assert serialized list/detail
projections omit credentials, environment maps, tokens, signed URLs, raw
birth/chart payloads, report bodies, password hashes, and unbounded provider
errors.

- [x] **Step 2: Run the RED tests**

Run:
`pnpm vitest run packages/backend/src/admin-overview/admin-overview.service.test.ts tests/security/admin-projection-redaction.integration.test.ts && pnpm playwright test tests/e2e/admin-overview.spec.ts`

Expected: FAIL because no redacted projections or operational overview exists.

- [x] **Step 3: Implement feature-scoped read services**

Implement query services that request only the fields used by each projection.
Use opaque IDs, masked account references, timestamps, state, bounded error
codes, and aggregate counts. Record the authorized projection type, target
aggregate IDs, capability, request/trace ID, and redaction level in the audit
service without persisting returned private values.

- [x] **Step 4: Implement compact operational UI**

Render compact navigation, status text plus accessible color, stable table
columns, filters, pagination, empty/error states, and responsive overflow.
Keep the overview operational and unframed; do not create marketing cards,
content editors, or query consoles.

- [x] **Step 5: Run the GREEN tests**

Run:
`pnpm vitest run packages/backend/src/admin-overview tests/security/admin-projection-redaction.integration.test.ts && pnpm playwright test tests/e2e/admin-overview.spec.ts`

Expected: PASS with authorized, redacted data only.

- [x] **Step 6: Update trackers and commit**

```bash
git add packages/contracts packages/backend/src/admin-overview apps/api/src/admin-overview apps/web/src/features/admin-overview apps/web/src/app tests/security tests/e2e docs/superpowers/plans
git commit -m "feat: add redacted operations overview"
```

**Implementation evidence (2026-09-03):** Added contract-validated,
capability-limited redacted overview projections from PostgreSQL account,
privacy, and outbox state. The feature selects no email, names, credentials,
sessions, report bodies, raw birth/chart data, signed URLs, environment maps,
or provider errors. Missing Phase 04/05 commerce, report-generation, asset,
delivery, support, and privacy-workflow inputs are explicit `unavailable`
states rather than zero/healthy substitutions. Focused coverage passed 7
Vitest tests across backend/security/web access paths; producer builds and
consumer typechecks passed. The focused Playwright overview spec was skipped
because no approved verified-admin fixture or private API topology exists, and
the test refuses to fabricate one. Task status remains in progress pending Sol
review.

**Correction pass 1 evidence (2026-09-03):** Corrected trusted request
correlation, error-path audit completeness, explicit role-scoped projection
visibility, degraded health semantics, bounded/complete redacted contracts,
deterministic account ordering, and a single server/web filter parser.
Focused Task 2 coverage passed 15 tests across backend, security, web page,
and server-rendered overview states. Contracts/backend builds and API/web
typechecks passed in dependency order. The fixture-gated Playwright spec
exited successfully with its one approved skip; no production admin identity
or topology was invented. Task status remains in progress pending Sol review.

**Correction pass 2 evidence (2026-09-03):** Module visibility now requires
both the approved role-to-module read policy and the active matching read
capability; command capabilities add no overview visibility. Exact role module
sets and capability-removal narrowing are executable, including operations'
redacted privacy deletion/retention counts. Typed health probes now make
ready, degraded, unready, and all-unavailable aggregates executable. Focused
Task 2 coverage passed 6 files / 28 tests, contracts/backend builds and API/web
typechecks passed in producer-consumer order, and the fixture-gated Playwright
spec exited successfully with its one approved skip. Task status remains in
progress pending Sol re-review.

**Replan cycle 1 evidence (2026-09-03):** Replaced the controller-wide
`admin.overview.read` gate with explicit overview-entry authorization that
chooses the actual active role-allowed projection-read capability, preserving
the approved capability matrix and allowing support's approved subset without
that aggregate capability. Every module remains role-visible and
capability-active. Health is nullable and not queried, returned, summarized,
or rendered when readiness access is absent. Focused database-backed
repository/resolver-to-overview, controller/security, service, repository,
and web rendering coverage passed 9 files / 49 tests. The `/admin/access`
preflight uses the same entry authorization, so it cannot reject support
before the authorized overview request. Contracts/backend
builds and API/web typechecks passed in producer-consumer order. The existing
fixture-gated Playwright spec exited successfully with its one approved skip;
`git diff --check` passed. Sol approved Replan Cycle 1 on 2026-09-03 with no
Critical, Important, or must-fix findings. Task 2 is complete.

### Task 3 [P05A-T03]: Expose account, commerce, report, delivery, support, privacy, audit, and readiness inspections

**Files:**
- Create: `packages/backend/src/admin-inspection/account-inspection.service.ts`
- Create: `packages/backend/src/admin-inspection/commerce-inspection.service.ts`
- Create: `packages/backend/src/admin-inspection/report-inspection.service.ts`
- Create: `packages/backend/src/admin-inspection/delivery-inspection.service.ts`
- Create: `packages/backend/src/admin-inspection/privacy-audit-inspection.service.ts`
- Create: `apps/api/src/admin-inspection/admin-inspection.controller.ts`
- Create: `apps/web/src/app/[locale]/admin/accounts/page.tsx`
- Create: `apps/web/src/app/[locale]/admin/commerce/page.tsx`
- Create: `apps/web/src/app/[locale]/admin/reports/page.tsx`
- Create: `apps/web/src/app/[locale]/admin/delivery/page.tsx`
- Create: `apps/web/src/app/[locale]/admin/support/page.tsx`
- Create: `apps/web/src/app/[locale]/admin/privacy/page.tsx`
- Create: `apps/web/src/app/[locale]/admin/audit/page.tsx`
- Create: `apps/web/src/app/[locale]/admin/readiness/page.tsx`
- Modify: `config/route-registry.yml`
- Test: `tests/security/admin-inspection-authorization.integration.test.ts`
- Test: `tests/e2e/admin-inspection.spec.ts`
- Test: `tests/seo/private-route-state.test.ts`

**Interfaces:**
- Consumes aggregate IDs and bounded filters after `authorizeAdminRead`.
- Produces safe account, profile/chart summary, commerce, report lineage,
  generation attempt, outbox, delivery, support, privacy, audit, and readiness
  projections.
- Produces `ADMIN_RESOURCE_NOT_FOUND` and `ADMIN_FORBIDDEN` without identifier
  enumeration.

- [ ] **Step 1: Write failing inspection tests**

Cover all four roles across each module, cross-account lookup denial,
immutable-report lineage visibility, generation/outbox state visibility,
delivery and storage state visibility, privacy export/delete status, audit
search, and route/content/indexing readiness. Assert account/profile/chart
details are redacted by default and list views never carry report bodies.

- [ ] **Step 2: Run the RED tests**

Run:
`pnpm vitest run tests/security/admin-inspection-authorization.integration.test.ts tests/seo/private-route-state.test.ts && pnpm playwright test tests/e2e/admin-inspection.spec.ts`

Expected: FAIL because module routes and authorized inspection services do not
exist.

- [ ] **Step 3: Implement immutable, redacted inspections**

Read records through feature-specific services only. Show report/version
lineage, attempts, state transitions, outbox correlation, and delivery state
without reusing an owner report reader or returning report HTML. Render route,
content, metadata, and indexing readiness from the canonical route registry
and verified release evidence as read-only projections.

- [ ] **Step 4: Enforce the V1 no-reveal boundary**

Assert there is no unredacted sensitive-detail capability, endpoint, or UI.
Never return secrets, tokens, signed URLs, raw payloads, or a full report body.
Treat any future reveal proposal as a separate founder-approved privacy scope.

- [ ] **Step 5: Run the GREEN tests**

Run:
`pnpm vitest run tests/security/admin-inspection-authorization.integration.test.ts tests/seo/private-route-state.test.ts && pnpm playwright test tests/e2e/admin-inspection.spec.ts`

Expected: PASS. Unauthorized callers receive no private projection or
enumerable distinction.

- [ ] **Step 6: Update trackers and commit**

```bash
git add config/route-registry.yml packages/backend/src/admin-inspection apps/api/src/admin-inspection apps/web/src/app tests/security tests/e2e tests/seo docs/superpowers/plans
git commit -m "feat: add private operations inspections"
```

### Task 4 [P05A-T04]: Implement audited compensating commands through domain services and outbox contracts

**Files:**
- Create: `packages/contracts/src/admin-commands.ts`
- Create: `packages/backend/src/admin-commands/admin-command-context.ts`
- Create: `packages/backend/src/admin-commands/report-recovery.service.ts`
- Create: `packages/backend/src/admin-commands/storage-recovery.service.ts`
- Create: `packages/backend/src/admin-commands/support-case.service.ts`
- Create: `packages/backend/src/admin-commands/privacy-workflow.service.ts`
- Create: `apps/api/src/admin-commands/admin-commands.controller.ts`
- Create: `apps/web/src/features/admin-commands/command-confirmation-dialog.tsx`
- Create: `apps/web/src/features/admin-commands/command-form.tsx`
- Modify: `packages/backend/src/birth-profile/birth-profile.service.ts`
- Modify: `packages/backend/src/commerce/entitlement.service.ts`
- Modify: `packages/backend/src/reports/report.service.ts`
- Modify: `packages/backend/src/outbox/outbox.dispatcher.ts`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/workflow-event-contracts.md`
- Test: `packages/backend/src/admin-commands/report-recovery.service.test.ts`
- Test: `packages/backend/src/admin-commands/storage-recovery.service.test.ts`
- Test: `tests/security/admin-command-boundary.integration.test.ts`
- Test: `tests/workflow/admin-command-outbox.integration.test.ts`

**Interfaces:**
- Consumes `AdminCommandContextV1` plus a typed command:
  `requestReportRegeneration`, `requestWorkflowRetry`, `requestStorageReconcile`,
  `recordRefundReview`, `recordRefundOutcome`, `createSupportCase`,
  `requestSamePersonCorrection`, `requestPrivacyExport`, or
  `requestPrivacyDeletion`.
- Produces safe `AdminCommandReceiptV1` or exact errors
  `ADMIN_FORBIDDEN`, `ADMIN_REASON_CODE_REQUIRED`,
  `ADMIN_IDEMPOTENCY_CONFLICT`, `ADMIN_EXPECTED_VERSION_CONFLICT`,
  `REGENERATION_POLICY_DENIED`, `RETRY_POLICY_DENIED`,
  `REFUND_STATE_INVALID`, `CORRECTION_POLICY_DENIED`,
  `CORRECTION_WINDOW_EXPIRED`, `PRIVACY_WORKFLOW_INVALID`, or
  `SUPPORT_CASE_REQUIRED`.
- Produces append-only command, aggregate/audit, and outbox records in one
  transaction. Retry/reconciliation events are versioned in
  `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/workflow-event-contracts.md`;
  no direct BullMQ operation is available.

- [ ] **Step 1: Write failing command-boundary tests**

Cover missing actor/reason/request/trace/idempotency context, duplicate keys,
expected-version mismatch, unauthorized role, absent support case when policy
requires one, immutable report mutation attempt, direct table-write attempt,
direct queue requeue attempt, and forbidden provider-refund execution. Cover
safe regeneration creating a new report version and
`report.generation.requested.v1`, retry creating a policy-checked request and
outbox event, storage reconciliation creating `storage.reconcile.v1`, and one
same-person correction within 24 hours referencing a proposed birth-profile
revision and creating new chart/report lineage.

- [ ] **Step 2: Run the RED tests**

Run:
`pnpm vitest run packages/backend/src/admin-commands/report-recovery.service.test.ts packages/backend/src/admin-commands/storage-recovery.service.test.ts tests/security/admin-command-boundary.integration.test.ts tests/workflow/admin-command-outbox.integration.test.ts`

Expected: FAIL because typed command context, policy services, and mediated
event contracts do not exist.

- [ ] **Step 3: Implement command context and domain-service boundaries**

Validate command context in the private API and repeat capability/policy
validation inside each domain service. Use expected-version compare-and-set
where an aggregate state changes. Persist a redacted audit record and
idempotency record in the same transaction as the command result and outbox
event. Return the original receipt for a matching replay; reject a key reused
for a different command payload.

- [ ] **Step 4: Implement only compensating actions**

Regeneration reserves a new immutable report version; it never overwrites a
report/chart/evidence version. Retry creates a new command/request that the
outbox dispatcher maps to `report.generate.v1` only when the target is in
`retryable_failure`, using
`report-generate-retry:{reportVersionId}:{retryRequestId}`; it never calls
BullMQ directly. Terminal failures require regeneration into a new immutable
report version.
Refund work records an approved review/outcome through the commerce service and
does not call a provider API. Privacy work calls the existing privacy state
machine. Storage work requests a bounded reconciliation scan. Same-person
correction requires a support case, enforces the one-use 24-hour policy, and
references a newly persisted birth-profile revision; it never edits prior
profile, chart, evidence, or report versions.

- [ ] **Step 5: Add explicit confirmation UI**

Require a reason code, display target and expected effect, require a stable
confirmation action, and disable repeated submission after receipt creation.
Do not add hidden keyboard shortcuts or bulk mutation controls.

- [ ] **Step 6: Run the GREEN tests**

Run:
`pnpm vitest run packages/backend/src/admin-commands tests/security/admin-command-boundary.integration.test.ts tests/workflow/admin-command-outbox.integration.test.ts`

Expected: PASS. Every accepted command has a complete audit/outbox trail and
every prohibited direct control remains unavailable.

- [ ] **Step 7: Update trackers and commit**

```bash
git add packages/contracts packages/backend/src/admin-commands packages/backend/src/birth-profile packages/backend/src/commerce packages/backend/src/reports packages/backend/src/outbox apps/api/src/admin-commands apps/web/src/features/admin-commands docs/superpowers/plans tests/security tests/workflow
git commit -m "feat: add audited operations recovery commands"
```

### Task 5 [P05A-T05]: Add role administration, audit completeness, and policy-safe support workflows

**Files:**
- Create: `packages/backend/src/admin-access/role-assignment.service.ts`
- Create: `packages/backend/src/admin-access/audit-query.service.ts`
- Create: `apps/web/src/features/admin-access/role-assignment-form.tsx`
- Create: `apps/web/src/features/admin-access/audit-log-table.tsx`
- Modify: `apps/api/src/admin-access/admin-access.controller.ts`
- Modify: `apps/web/src/app/[locale]/admin/audit/page.tsx`
- Test: `packages/backend/src/admin-access/role-assignment.service.test.ts`
- Test: `tests/security/admin-audit-completeness.integration.test.ts`
- Test: `tests/e2e/admin-role-and-audit.spec.ts`

**Interfaces:**
- Consumes `assignRole(context, subjectAccountId, role, expectedVersion)` and
  `revokeRole(context, assignmentId, expectedVersion)`.
- Produces `ROLE_ASSIGNMENT_FORBIDDEN`, `ROLE_ASSIGNMENT_CONFLICT`,
  `ROLE_ASSIGNMENT_SELF_ESCALATION_DENIED`, and
  `AUDIT_RECORD_INCOMPLETE`.
- Produces append-only role-assignment history, capability-policy reference,
  and audit-search projections.

- [x] **Step 1: Write failing role and audit tests**

Assert only `super_admin` with `admin.roles.manage` can assign/revoke a role;
the actor cannot self-escalate; revoked assignments deny subsequent reads;
each privileged read and command includes actor, role assignment, capability,
request/trace ID, target, result, redaction level, and command context where
applicable. Assert audit search never returns secret or raw payload fields.

- [x] **Step 2: Run the RED tests**

Run:
`pnpm vitest run packages/backend/src/admin-access/role-assignment.service.test.ts tests/security/admin-audit-completeness.integration.test.ts && pnpm playwright test tests/e2e/admin-role-and-audit.spec.ts`

Expected: FAIL because role management and full audit evidence are absent.

- [x] **Step 3: Implement privileged role administration**

Use a dedicated role-assignment service, optimistic version checks, immutable
assignment history, exact reason taxonomy, and two independent audit records:
the authorization decision and the resulting assignment event. Reject
self-escalation and any role/capability value outside the server policy.

- [x] **Step 4: Implement audit inspection**

Provide read-only, capability-gated audit filtering by date, actor, operation,
aggregate, trace ID, and result. Keep filter values bounded and export absent
from V1. Display redacted summaries only.

- [x] **Step 5: Run the GREEN tests**

Run:
`pnpm vitest run packages/backend/src/admin-access tests/security/admin-audit-completeness.integration.test.ts && pnpm playwright test tests/e2e/admin-role-and-audit.spec.ts`

Expected: PASS with complete, append-only audit coverage.

- [ ] **Step 6: Update trackers and commit**

```bash
git add packages/backend/src/admin-access apps/api/src/admin-access apps/web/src/features/admin-access apps/web/src/app tests/security tests/e2e docs/superpowers/plans
git commit -m "feat: add audited role administration"
```

**Implementation evidence (2026-09-03):** Added a private role-mutation
service that accepts only a resolved active `super_admin` carrying the active
`admin.roles.manage` capability, rejects actor self-escalation, bounds every
target, and validates all roles/reasons server-side. The PostgreSQL repository
serializes target mutations with a transaction advisory lock; it revokes the
active assignment before creating a replacement row, persists a per-actor
idempotency receipt, and writes authorization plus resulting-event audit rows
in the same transaction. Audit search is capability-gated, bounded, redacted,
and exposed only through `/admin/audit`, a private `live_noindex` route.
Focused Vitest coverage passed 27 tests; the fixture-gated Playwright spec
exited successfully with its sole approved skip. Contract/database/backend/API
builds and web typecheck passed. The migration integration test is
host-blocked because Testcontainers cannot find a container runtime; Task 5
remains in progress pending Sol review.

**Correction pass 1/2 evidence (2026-09-03):** Role mutation now acquires
stable actor/target transaction locks, revalidates the actor's verified active
`super_admin` assignment and active `admin.roles.manage` policy inside the
mutation transaction, and checks the idempotency receipt after locking.
Historical assignment versions are monotonic and unique per account. Success
persists receipt plus authorization/result audits atomically with a policy
reference; replays append no duplicate success evidence. Focused correction
coverage passed 26 tests, producer builds and web typecheck passed, the
fixture-gated Playwright test retained its approved skip, and `git diff
--check` passed. The container-backed migration test remains host-blocked.
Task 5 remains in progress pending Sol re-review.

**Replan Cycle 1 evidence (2026-09-03):** Post-authentication role-command
outcomes now reach the transactional repository, including self-escalation
denial. Trusted malformed commands append one controller-owned redacted
denial, while repository-owned command results are not duplicated by the
controller. Audit data loads only after `/admin/audit/access` confirms
`canReadAudit`; role controls remain conditional on `canManageRoles`. Audit
pagination validates its keyset cursor defensively and renders a filter-
preserving next link. Focused Task 5 coverage passed 9 files / 23 tests;
contracts, database, backend, and API builds plus web typecheck passed, as did
`git diff --check`. Docker Desktop was unavailable, so container-backed
migration runtime verification remains host-blocked. Task 5 remains in
progress pending Sol re-review.

### Task 6 [P05A-T06]: Prove production-like operational incident workflows and release evidence

**Files:**
- Create: `tests/e2e/admin-incident-workflow.spec.ts`
- Create: `tests/e2e/admin-non-admin-denial.spec.ts`
- Create: `tests/release/admin-operations-evidence-gate.test.ts`
- Create: `docs/runbooks/admin-operations-incidents.md`
- Create: `docs/release/admin-operations-evidence.md`
- Modify: `phase-06-production-readiness-and-launch.md`
- Modify: `requirements-traceability.md`
- Modify: `risk-register.md`
- Modify: `rules-and-decisions-tracker.md`

**Interfaces:**
- Consumes production-like Compose stack, controlled fixtures, redacted admin
  accounts for each role, and completed Phase 04/05 workflow contracts.
- Produces machine-readable incident evidence with request/trace IDs, safe
  command receipts, redacted audit proofs, and release verdict.
- Returns `RELEASE_EVIDENCE_INCOMPLETE` when any required access, noindex,
  redaction, audit, idempotency, immutability, or mediated-workflow proof is
  missing.

- [ ] **Step 1: Write failing release evidence and incident E2E**

Model a terminal report failure, support-case creation, authorized
regeneration request, outbox-mediated workflow completion, delivery-state
inspection, storage reconciliation request, audit-trail inspection, and
non-admin denial. Assert no console response exposes PII, secrets, raw
payloads, report bodies, or signed URLs. Assert every `/admin/**` route is
noindex and excluded from all sitemaps.

- [ ] **Step 2: Run the RED tests**

Run:
`pnpm vitest run tests/release/admin-operations-evidence-gate.test.ts && pnpm playwright test tests/e2e/admin-incident-workflow.spec.ts tests/e2e/admin-non-admin-denial.spec.ts`

Expected: FAIL until all Phase 05A requirements produce evidence.

- [ ] **Step 3: Write operator runbook and evidence format**

Document safe triage, role escalation, case creation, regeneration/retry
selection, privacy escalation, audit lookup, storage-reconciliation request,
and stop conditions. The runbook must direct operators to the dashboard and
approved provider/founder processes, never to SQL, credentials, raw queues, or
manual database changes.

- [ ] **Step 4: Run the GREEN tests on production-like topology**

Run:
`pnpm vitest run tests/release/admin-operations-evidence-gate.test.ts && pnpm playwright test tests/e2e/admin-incident-workflow.spec.ts tests/e2e/admin-non-admin-denial.spec.ts`

Expected: PASS with an auditable, idempotent, non-CMS operational recovery
flow. This is required before Phase 06 paid-release closure.

- [ ] **Step 5: Update trackers and commit**

```bash
git add tests/e2e tests/release docs/runbooks docs/release docs/superpowers/plans
git commit -m "test: verify admin operations release evidence"
```

## Phase Exit Criteria

- Every `/admin/**` route is server-authorized, `live_noindex`, and excluded
  from all public navigation and sitemap outputs.
- Verified Better Auth sessions and database-backed role/capability tests pass
  for `super_admin`, `operations`, `support`, and `read_only`.
- Privileged reads and commands are authorized by the private API and have
  complete redacted audit evidence.
- Commands require actor, reason code, request/trace ID, idempotency key, and
  expected version where applicable; duplicate and conflict cases are proven.
- No UI/API path enables CMS editing, arbitrary SQL, direct DB mutation,
  direct queue/job execution, provider secrets, signed URLs, direct payment
  mutation, or in-place immutable-record mutation.
- Regeneration, retry, reconciliation, refund-record, and privacy commands
  are policy-checked, compensating domain commands mediated by outbox/workflow
  contracts.
- Production-like admin incident E2E and release evidence pass.
- Phase 06 paid-release work may begin only after this phase closes; free-MVP
  deployment evidence alone is insufficient.
