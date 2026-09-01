# Phase 01 Data, Identity, and Birth Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`.

**Goal:** Establish PostgreSQL persistence, Better Auth, consent, deletion, and
the canonical BirthProfile without adding astrology calculations.

**Architecture:** Drizzle owns explicit SQL migrations. Better Auth runs at the
web BFF. The API verifies short-lived internal actor tokens and owns profile,
consent, and deletion policies.

**Tech Stack:** PostgreSQL, Drizzle, Better Auth, Zod, Vitest, Testcontainers.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P01-T0N` in
`task-contracts-and-test-vectors.md`.

## Global Constraints

- Production never uses schema push.
- Auth tables and business tables share PostgreSQL but have distinct ownership.
- Browser-provided user IDs are never trusted.
- Birth-time uncertainty is preserved.
- Account deletion immediately revokes access and purges after 30 days.
- Unlinked anonymous actor data expires and purges within 24 hours.

---

### Task 1 [P01-T01]: Create the Drizzle schema and migration runner

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/src/client.ts`
- Create: `packages/database/src/schema/auth.ts`
- Create: `packages/database/src/schema/privacy.ts`
- Create: `packages/database/src/schema/birth-profile.ts`
- Create: `packages/database/src/schema/outbox.ts`
- Create: `packages/database/src/schema/audit.ts`
- Create: `packages/database/src/migrate.ts`
- Create: `packages/database/drizzle.config.ts`
- Test: `packages/database/src/schema/schema.integration.test.ts`

**Interfaces:**
- Produces `Database`.
- Produces `runMigrations(databaseUrl)`.
- Produces `enqueueOutbox(tx, event)`.

- [x] **Step 1: Write failing Testcontainers schema tests**

Test unique email/account constraints, consent-version records, account or
anonymous profile ownership, anonymous expiry, deletion state, and outbox lease
fields.

- [x] **Step 2: Run the integration test**

Run: `pnpm vitest run packages/database/src/schema/schema.integration.test.ts`
Expected: FAIL before migrations exist.

- [x] **Step 3: Implement schema and generate reviewed SQL**

Create append-safe tables and indexes. Keep original BirthProfile input and
normalized fields separate.

- [x] **Step 4: Apply migrations to an empty and previously migrated database**

Run: `pnpm --filter @lasoviet/database migrate:test`
Expected: both paths PASS.

- [x] **Step 5: Update trackers and commit**

```bash
git add packages/database docs/superpowers/plans
git commit -m "feat: add PostgreSQL schema and migration runner"
```

**P01-T01 Evidence (2026-09-01):**

- Focused `corepack pnpm@11.25.0 --filter @lasoviet/database migrate:test`
  passed: 1 file, 2 tests.
- The Testcontainers acceptance applied the reviewed migration to an empty
  PostgreSQL container and verified repeat migration convergence.
- Schema-integrity assertions passed for unique email/account constraints,
  consent and deletion records, account/anonymous profile ownership and
  expiry, separate original/normalized profile revision fields, audit rows,
  and outbox idempotency plus lease defaults.
- `corepack pnpm@11.25.0 --filter @lasoviet/database typecheck` passed.
- `corepack pnpm@11.25.0 --filter @lasoviet/database build` passed.
- The generated SQL migration contains 11 tables, the reviewed enums,
  foreign keys, owner checks, unique constraints, indexes, and outbox lease
  fields. Drizzle schema discovery uses the explicit five production files.
- Terra's exact pnpm 11 build-policy remediation was applied and the exact
  install completed without an unreviewed policy, peer, release-age, or
  lifecycle error.
- Docs impact: minor. Rule candidate: none. Open questions: none.
- Commit: `feat: add PostgreSQL schema and migration runner`.

### Task 2 [P01-T02]: Integrate Better Auth and internal actor tokens

**Files:**
- Create: `apps/web/src/auth/auth.ts`
- Create: `apps/web/src/app/api/auth/[...all]/route.ts`
- Create: `apps/web/src/auth/create-internal-actor-token.ts`
- Create: `apps/api/src/auth/internal-actor.guard.ts`
- Create: `apps/api/src/auth/current-actor.decorator.ts`
- Create: `apps/api/src/auth/auth-email.controller.ts`
- Create: `apps/web/src/auth/auth-email-client.ts`
- Create: `packages/backend/src/identity/identity.module.ts`
- Create: `packages/backend/src/notifications/email-provider.ts`
- Create: `packages/backend/src/notifications/smtp-email-adapter.ts`
- Create: `packages/backend/src/notifications/auth-email.ts`
- Create: `apps/web/messages/vi/auth.json`
- Create: `apps/web/messages/en/auth.json`
- Test: `packages/backend/src/notifications/smtp-email-adapter.test.ts`
- Test: `tests/auth/session-and-actor.spec.ts`

**Interfaces:**
- Produces verified email/password and Google OAuth session flows.
- Produces `createInternalActorToken(actor, requestId): Promise<string>`.
- Produces `CurrentActor` as a discriminated account-or-anonymous actor resolved
  entirely from the Better Auth session.
- Produces `EmailProvider.send(message, idempotencyKey)` and localized
  verification/reset delivery through an internal API command.

- [ ] **Step 1: Write failing auth E2E tests**

Cover anonymous session creation, anonymous-to-account linking, ownership
continuity, verification-email delivery, unverified email rejection, verified
login, password-reset delivery and token use, session revocation, Google
account linking with verified email, expired actor token, wrong audience,
actor tampering, retryable SMTP failure, and duplicate-email idempotency.

- [ ] **Step 2: Run auth E2E**

Run:

```bash
pnpm vitest run packages/backend/src/notifications/smtp-email-adapter.test.ts
pnpm playwright test tests/auth/session-and-actor.spec.ts
```

Expected: FAIL.

- [x] **Step 3: Configure Better Auth and database sessions**

Configure Better Auth's Anonymous plugin and database-backed account linking.
Keep auth secrets server-only. Do not expose API credentials or internal actor
secrets to Client Components. Better Auth calls a server-only web client that
sends a signed internal command to the private API; the browser never receives
SMTP credentials.

- [x] **Step 4: Implement actor-token verification in API**

Use short expiry, explicit audience, stable algorithm selection, and constant
time verification from a reviewed library.

- [x] **Step 5: Implement SMTP verification and reset delivery**

Use the founder-provided SMTP connection when Phase 01 starts. CI exercises the
real SMTP protocol against a controlled integration service. Never mark an
email verified, expose a reset token, or silently disable verification to make
tests pass.

- [ ] **Step 6: Run auth tests and security checks**

Run:

```bash
pnpm vitest run packages/backend/src/notifications
pnpm playwright test tests/auth/session-and-actor.spec.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Update trackers and commit**

```bash
git add apps/web/src/auth apps/web/src/app/api/auth apps/web/messages apps/api/src/auth packages/backend/src/identity packages/backend/src/notifications tests/auth docs/superpowers/plans
git commit -m "feat: add database-backed authentication"
```

**P01-T02 Evidence (2026-09-01):**

- Implemented Better Auth database sessions, anonymous identity persistence,
  email/password verification and reset callbacks, Google account-linking
  policy, and server-only internal auth-email delivery.
- Implemented signed actor verification and a body-bound service command with
  strict token-domain separation.
- Implemented durable notification idempotency with a 45-second lease,
  conditional terminal updates, and a three-attempt retry cap.
- `corepack pnpm@11.25.0 --filter @lasoviet/database migrate:test` passed:
  1 file, 3 tests.
- Focused auth/config/backend checks passed: 6 files, 44 tests. Full
  repository tests passed: 16 files, 83 tests.
- Root typecheck and build passed after the required producer declaration
  rebuild. The web auth route is dynamic and does not bundle migration or Nest
  runtime modules.
- The exact Playwright command was executed but did not pass because no
  controlled Next/PostgreSQL runtime is configured: all three checks reached
  `net::ERR_CONNECTION_REFUSED` at `http://127.0.0.1:3000/`. This is not
  represented as an E2E pass. No real SMTP or Google call occurred.
- Docs impact: minor. Rule candidate: none. Open questions: a later
  authorized controlled runtime must make the browser flow green.

### Task 3 [P01-T03]: Implement consent and account deletion policies

**Files:**
- Create: `packages/backend/src/consent/consent.service.ts`
- Create: `packages/backend/src/consent/consent.repository.ts`
- Create: `packages/backend/src/privacy/deletion.service.ts`
- Create: `packages/backend/src/privacy/deletion.repository.ts`
- Create: `packages/backend/src/privacy/anonymous-retention.service.ts`
- Create: `apps/api/src/privacy/privacy.controller.ts`
- Test: `packages/backend/src/privacy/deletion.service.test.ts`
- Test: `packages/backend/src/privacy/anonymous-retention.service.test.ts`
- Test: `tests/privacy/account-deletion.integration.test.ts`

**Interfaces:**
- Produces `recordConsent(userId, documentVersion, purpose)`.
- Produces `requestAccountDeletion(userId, requestedAt)`.
- Produces `cancelAccountDeletion(userId, now)`.
- Produces `purgeExpiredDeletionRequests(now)`.
- Produces `purgeExpiredAnonymousActors(now)` and immediate anonymous deletion.

- [x] **Step 1: Write failing policy tests**

Assert immediate session revocation, a 30-day recovery deadline, cancellation
before deadline, purge eligibility after deadline, and exclusion of legally
retained transaction fields from the profile purge contract.

- [x] **Step 2: Run privacy tests**

Run: `pnpm vitest run packages/backend/src/privacy tests/privacy`
Expected: FAIL.

- [x] **Step 3: Implement consent and deletion state machines**

Every admin or support action writes an audit record. Purge orchestration emits
versioned outbox events for later object deletion. Anonymous profile/chart data
expires 24 hours after creation unless ownership was transactionally linked to
a verified account; linking clears anonymous expiry without duplicating rows.

- [x] **Step 4: Run tests**

Run: `pnpm vitest run packages/backend/src/privacy tests/privacy`
Expected: PASS.

- [x] **Step 5: Update risk/rule trackers and commit**

```bash
git add packages/backend/src/consent packages/backend/src/privacy apps/api/src/privacy tests/privacy docs/superpowers/plans
git commit -m "feat: add consent and account deletion workflows"
```

**P01-T03 Evidence (2026-09-01):**

- Focused RED ran before the consent and privacy modules existed.
- Consent records are version-gated, owner-bound to the verified actor, and
  audited. The private controller rejects unrecognized contract payloads.
- Account deletion revokes database sessions in the request transaction,
  creates a 30-day recovery window, permits timely cancellation, and emits an
  opaque versioned outbox request only after expiry.
- Unlinked anonymous actors support immediate deletion, purge after expiry,
  and reject deletion after account linking. Cascading ownership removes
  temporary profile data without a duplicate account profile.
- Focused migration, API, and privacy gates passed: 4 files, 9 tests; the
  migration acceptance passed 1 file, 3 tests.
- Root verification passed: 20 files, 92 tests; root typecheck, root build,
  and i18n parity all passed.
- No real SMTP, Google, database-production, or other external side effect
  occurred. No UI files were added.
- Docs impact: minor. Rule candidate: none. Open questions: none.
- Commit: `feat: add consent and account deletion workflows`.

### Task 4 [P01-T04]: Implement canonical BirthProfile normalization

**Files:**
- Create: `packages/contracts/src/birth-profile-v1.ts`
- Create: `packages/backend/src/birth-profile/birth-profile.service.ts`
- Create: `packages/backend/src/birth-profile/birth-profile.repository.ts`
- Create: `packages/backend/src/birth-profile/time-precision.ts`
- Create: `apps/api/src/birth-profile/birth-profile.controller.ts`
- Test: `packages/backend/src/birth-profile/birth-profile.service.test.ts`
- Test: `tests/fixtures/birth-profile/*.json`

**Interfaces:**
- Produces `BirthProfileV1`.
- Produces `normalizeBirthProfile(input): NormalizedBirthProfileV1`.
- Produces `resolveZiweiTimeIndex(profile): Result<number, TimePrecisionError>`.

- [x] **Step 1: Write failing precision fixtures**

Cover exact minute, known traditional branch, a range within one branch, a
range crossing branches, unknown time, timezone offset, IANA zone, historical
DST, solar input, and lunar input.

- [x] **Step 2: Run focused tests**

Run: `pnpm vitest run packages/backend/src/birth-profile`
Expected: FAIL.

- [x] **Step 3: Implement normalization without false precision**

Preserve original input, normalized input, timezone provenance, warnings, and
limitations. Do not convert a branch-only time into an invented minute.

- [x] **Step 4: Implement owner-authorized API commands**

Create, read, update, and archive profiles for the server-resolved account or
anonymous owner. A calculation-relevant update must create a new normalized
revision rather than rewriting calculation history.

- [x] **Step 5: Run tests and migration checks**

Run: `pnpm vitest run packages/backend/src/birth-profile && pnpm --filter @lasoviet/database migrate:test`
Expected: PASS.

- [x] **Step 6: Update trackers and commit**

```bash
git add packages/contracts packages/backend/src/birth-profile apps/api/src/birth-profile tests/fixtures/birth-profile docs/superpowers/plans
git commit -m "feat: add canonical birth profile"
```

## Phase Exit Criteria

- Empty and upgrade migrations pass.
- Email/password, Google OAuth, verification, reset, and revocation pass.
- Verification and reset email use the reviewed SMTP adapter through the
  private API boundary.
- Anonymous sessions can create temporary profiles, link ownership to a
  verified account, delete immediately, and purge automatically after 24 hours.
- API rejects invalid internal actor tokens.
- Consent is versioned.
- Account deletion follows the approved 30-day state machine.
- BirthProfile preserves uncertainty and timezone provenance.
- Unknown/multi-branch profiles return a typed Zi Wei eligibility error.
- Terra has no unresolved `must-fix`.

## Phase Exit Verification (2026-09-01)

- Headless auth-email/internal-actor, privacy/deletion/anonymous-retention, and
  BirthProfile precision/ownership/revision smoke passed: 12 files, 33 tests.
- Empty and repeat migration acceptance passed: 1 file, 3 tests.
- Root repository verification passed: 23 files, 105 tests; root typecheck,
  root build, and i18n parity also passed.
- One authorized adapter-mediated SMTP smoke used `node --env-file=.env.local`
  with strict STARTTLS and the fixed idempotency key
  `phase-01-live-smoke-2026-09-01`. It returned success with provider message
  ID `<13e55cd6-c231-8595-6b55-8ba559115788@0err.com>`.
- No live Google OAuth call occurred because credentials are unavailable.
- Browser/Playwright E2E is not represented as passing. The approved non-visual
  artifact deferral remains binding; a later authorized browser/runtime gate
  must cover the visual flow.

## Phase 01 Correction Wave (2026-09-01)

- Closed M-01 through M-12 from the milestone review without expanding into
  deferred Phase 02 or UI work.
- Fresh focused verification passed: 12 files, 39 tests. It covers live
  PostgreSQL session/deletion-state actor authorization, anonymous expiry and
  coordinated deletion, constraints, exact cancellation boundary, immutable
  revision allocation, precision validation, auth-email failure outcomes, and
  the bounded worker runner.
- Fresh migration acceptance passed: 1 file, 4 tests. Root verification passed:
  25 files, 114 tests; root typecheck, root build, and i18n parity passed.
- Better Auth is instantiated lazily once per web process; its anonymous
  vendor-delete endpoint is disabled so the private coordinated deletion path
  owns domain and identity cleanup.
- The worker executes bounded account-deletion, anonymous-retention, and
  retryable-auth-email maintenance every 15 minutes. No scheduler platform or
  deployment configuration was added.
- Google OAuth remains unexecuted because credentials are unavailable.
  Browser/Playwright UI verification remains deferred by FD-024 and is not
  claimed as passed.

## Phase 01 Correction Pass 2 (2026-09-02)

- Closed the final Sol re-review findings: anonymous actor tokens validate
  live Better Auth sessions; deletion and retention queries share the bounded
  maintenance batch; the runner prevents overlap and catches scheduled
  rejections; duplicate consent requests reuse one record; anonymous linking
  permits no-profile actors and removes obsolete anonymous identity/sessions.
- Focused correction verification passed: 4 files, 14 tests. Migration
  acceptance passed: 1 file, 5 tests. Root typecheck and build passed.
- No browser/Playwright, Google OAuth, live SMTP, UI work, or external side
  effect occurred. No durable rule is warranted.
