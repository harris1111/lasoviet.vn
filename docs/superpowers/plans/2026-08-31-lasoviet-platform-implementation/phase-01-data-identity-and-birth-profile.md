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

- [ ] **Step 1: Write failing Testcontainers schema tests**

Test unique email/account constraints, consent-version records, profile owner
foreign keys, deletion state, and outbox lease fields.

- [ ] **Step 2: Run the integration test**

Run: `pnpm vitest run packages/database/src/schema/schema.integration.test.ts`
Expected: FAIL before migrations exist.

- [ ] **Step 3: Implement schema and generate reviewed SQL**

Create append-safe tables and indexes. Keep original BirthProfile input and
normalized fields separate.

- [ ] **Step 4: Apply migrations to an empty and previously migrated database**

Run: `pnpm --filter @lasoviet/database migrate:test`
Expected: both paths PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add packages/database docs/superpowers/plans
git commit -m "feat: add PostgreSQL schema and migration runner"
```

### Task 2 [P01-T02]: Integrate Better Auth and internal actor tokens

**Files:**
- Create: `apps/web/src/auth/auth.ts`
- Create: `apps/web/src/app/api/auth/[...all]/route.ts`
- Create: `apps/web/src/auth/create-internal-actor-token.ts`
- Create: `apps/api/src/auth/internal-actor.guard.ts`
- Create: `apps/api/src/auth/current-actor.decorator.ts`
- Create: `packages/backend/src/identity/identity.module.ts`
- Test: `tests/auth/session-and-actor.spec.ts`

**Interfaces:**
- Produces verified email/password and Google OAuth session flows.
- Produces `createInternalActorToken(actor, requestId): Promise<string>`.
- Produces `CurrentActor { userId, sessionId, requestId }`.

- [ ] **Step 1: Write failing auth E2E tests**

Cover unverified email rejection, verified login, password reset token use,
session revocation, Google account linking with verified email, expired actor
token, wrong audience, and actor tampering.

- [ ] **Step 2: Run auth E2E**

Run: `pnpm playwright test tests/auth/session-and-actor.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Configure Better Auth and database sessions**

Keep auth secrets server-only. Do not expose API credentials or internal actor
secrets to Client Components.

- [ ] **Step 4: Implement actor-token verification in API**

Use short expiry, explicit audience, stable algorithm selection, and constant
time verification from a reviewed library.

- [ ] **Step 5: Run auth tests and security checks**

Run: `pnpm playwright test tests/auth/session-and-actor.spec.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Update trackers and commit**

```bash
git add apps/web/src/auth apps/web/src/app/api/auth apps/api/src/auth packages/backend/src/identity tests/auth docs/superpowers/plans
git commit -m "feat: add database-backed authentication"
```

### Task 3 [P01-T03]: Implement consent and account deletion policies

**Files:**
- Create: `packages/backend/src/consent/consent.service.ts`
- Create: `packages/backend/src/consent/consent.repository.ts`
- Create: `packages/backend/src/privacy/deletion.service.ts`
- Create: `packages/backend/src/privacy/deletion.repository.ts`
- Create: `apps/api/src/privacy/privacy.controller.ts`
- Test: `packages/backend/src/privacy/deletion.service.test.ts`
- Test: `tests/privacy/account-deletion.integration.test.ts`

**Interfaces:**
- Produces `recordConsent(userId, documentVersion, purpose)`.
- Produces `requestAccountDeletion(userId, requestedAt)`.
- Produces `cancelAccountDeletion(userId, now)`.
- Produces `purgeExpiredDeletionRequests(now)`.

- [ ] **Step 1: Write failing policy tests**

Assert immediate session revocation, a 30-day recovery deadline, cancellation
before deadline, purge eligibility after deadline, and exclusion of legally
retained transaction fields from the profile purge contract.

- [ ] **Step 2: Run privacy tests**

Run: `pnpm vitest run packages/backend/src/privacy tests/privacy`
Expected: FAIL.

- [ ] **Step 3: Implement consent and deletion state machines**

Every admin or support action writes an audit record. Purge orchestration emits
versioned outbox events for later object deletion.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run packages/backend/src/privacy tests/privacy`
Expected: PASS.

- [ ] **Step 5: Update risk/rule trackers and commit**

```bash
git add packages/backend/src/consent packages/backend/src/privacy apps/api/src/privacy tests/privacy docs/superpowers/plans
git commit -m "feat: add consent and account deletion workflows"
```

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

- [ ] **Step 1: Write failing precision fixtures**

Cover exact minute, known traditional branch, a range within one branch, a
range crossing branches, unknown time, timezone offset, IANA zone, historical
DST, solar input, and lunar input.

- [ ] **Step 2: Run focused tests**

Run: `pnpm vitest run packages/backend/src/birth-profile`
Expected: FAIL.

- [ ] **Step 3: Implement normalization without false precision**

Preserve original input, normalized input, timezone provenance, warnings, and
limitations. Do not convert a branch-only time into an invented minute.

- [ ] **Step 4: Implement owner-authorized API commands**

Create, read, update, and archive profiles. A calculation-relevant update must
create a new normalized revision rather than rewriting calculation history.

- [ ] **Step 5: Run tests and migration checks**

Run: `pnpm vitest run packages/backend/src/birth-profile && pnpm --filter @lasoviet/database migrate:test`
Expected: PASS.

- [ ] **Step 6: Update trackers and commit**

```bash
git add packages/contracts packages/backend/src/birth-profile apps/api/src/birth-profile tests/fixtures/birth-profile docs/superpowers/plans
git commit -m "feat: add canonical birth profile"
```

## Phase Exit Criteria

- Empty and upgrade migrations pass.
- Email/password, Google OAuth, verification, reset, and revocation pass.
- API rejects invalid internal actor tokens.
- Consent is versioned.
- Account deletion follows the approved 30-day state machine.
- BirthProfile preserves uncertainty and timezone provenance.
- Unknown/multi-branch profiles return a typed Zi Wei eligibility error.
- Terra has no unresolved `must-fix`.
