# Phase 01 Correction Wave Report

Date: 2026-09-01

## Scope

Closed verified milestone findings M-01 through M-12 only. No visual UI,
Playwright page work, Phase 02 work, Google OAuth call, SMTP delivery, push,
or other external side effect occurred.

## Corrections

- M-01: internal actor resolution now verifies live PostgreSQL sessions,
  anonymous lifecycle state, and active deletion requests. Cancellation alone
  uses the recovery authorization path.
- M-02: Better Auth and its Next handler are singleton/lazy per web process;
  the route no longer creates a database client per request or during build.
- M-03/M-04: coordinated anonymous retention deletes the domain actor and
  Better Auth identity/session path together. The vendor delete endpoint is
  disabled. Linking atomically requires unlinked, undeleted, unexpired state.
- M-05: the existing worker runs bounded account deletion, anonymous retention,
  and retryable auth-email maintenance once at startup and every 15 minutes.
- M-06/M-07: migration `0003_phase_one_lifecycle_guards.sql` enforces
  account/anonymous expiry ownership and owner-specific partial consent
  uniqueness.
- M-08/M-09: profile reads/mutations are owner-qualified at the query boundary;
  update locks the profile row before reading/allocating the next immutable
  revision, so concurrent updates receive distinct revisions.
- M-10: cancellation atomically requires `recover_until > now`; purge wins at
  the exact 30-day boundary and audit follows a successful transition only.
- M-11: same-date birth-time ranges reject inverted endpoints.
- M-12: the web client accepts only a `sent` delivery outcome; retryable
  requests persist their canonical payload and the bounded worker retry path
  reuses it without live SMTP in tests.

## Verification

- Focused core/privacy/security/data-integrity suite:
  `pnpm exec vitest run --pool=forks --maxWorkers=1 --no-file-parallelism ...`
  passed: 12 files, 39 tests.
- Migration acceptance:
  `pnpm --filter @lasoviet/database migrate:test` passed: 1 file, 4 tests.
- Root typecheck: passed.
- Root build: passed.
- Root tests: `pnpm test` passed: 25 files, 114 tests.
- I18n parity: passed.

## Documentation

Updated the Phase 01 plan and SDD ledger with fresh correction-wave evidence.
P01-T02 implementation checkboxes now reflect completed configuration,
actor-token, and SMTP work. The browser/Playwright and Google OAuth
limitations remain explicitly unpassed.

## Rule Candidate

None. Existing rules already require live authorization checks, privacy
retention, exact-version package verification, and no unsupported lifecycle
assumptions.

## Unresolved Questions

None. Google OAuth credentials and the FD-024 browser/UI artifact gate remain
known limitations, not Phase 01 correction blockers.

## Pass 2 — 2026-09-02

Closed the final scoped re-review items only.

- M-01: anonymous actor tokens now require a matching live, unexpired
  Better Auth session owned by the anonymous actor. Revoked and expired
  anonymous-session replay regressions pass.
- M-05: account deletion and anonymous retention now accept the same
  maintenance batch limit as auth-email retry. The runner shares one active
  promise to prevent interval overlap, and the worker catches maintenance
  rejection at its scheduling boundary.
- M-07: consent insertion uses `ON CONFLICT DO NOTHING`, then reuses the
  committed owner-specific record. Concurrent PostgreSQL requests return one
  consent ID without a uniqueness exception.
- Link regression A: linking an anonymous actor with no profile is valid.
- Link regression B: successful linking preserves the linked domain actor,
  audit history, and transferred profiles, while deleting the prior anonymous
  Better Auth user and cascading its old sessions. The public vendor deletion
  endpoint remains disabled.

Verification:

- Focused command covering the five items passed: 4 files, 14 tests.
- `pnpm --filter @lasoviet/database migrate:test` passed: 1 file, 5 tests.
- Root `pnpm typecheck` passed.
- Root `pnpm build` passed.

No live SMTP, Google, browser, Playwright, push, or other external side effect
occurred. Rule candidate: none.
