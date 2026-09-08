# Flash Report: Report Generation Evidence Provisioning Recovery

Date: 2026-09-06
Branch: fix/report-evidence-recovery
Base: 2392378e22dd3bac9b09e41ed0e2b56121cacd5e
Reviewed Base: 2d17e8f1f462bfcc2111c7cc3574503ea20ba614

## Objective
Implement a bounded, domain-safe recovery operation (`recoverEvidenceInvalidGeneration`) for terminal report generation failures caused by missing knowledge provisioning. Ensure recovery outbox IDs and queue job keys are report-scoped, deterministic, and durable against collisions and retries, preserving transactional rollback and immutable execution history.

## Durability Corrections & Architecture
1. **Report-Scoped Deterministic Outbox IDs**:
   - In `recoverEvidenceInvalidGeneration`, derived deterministic SHA-256 token from `${reservation.reportVersionId}::${trimmedRecoveryId}`.
   - Token formats: `eventId: evt-recovery-${token}`, `traceId: trace-recovery-${token}`, `idempotencyKey: report-recovery:${token}`.
   - Guarantees identical IDs for the same report and recoveryId; prevents cross-report collisions when different reports use the same human recoveryId.
2. **Transaction Atomicity Preservation**:
   - Removed duplicate error handling from inside the transaction callback.
   - Any duplicate key error during `enqueueOutbox` immediately aborts the transaction callback, triggering a database-level `ROLLBACK`.
   - Outside the transaction, duplicate outbox errors (`OutboxError` / `OUTBOX_DUPLICATE_KEY`) map to `{ ok: false, code: "WORKFLOW_STATE_CONFLICT" }`; all other errors re-throw.
   - Affected reservations remain `terminal_failure` with original `stateVersion` and `lastErrorCode`.
3. **Queue Job Idempotency and Old Job Preservation**:
   - In `createOutboxDispatcher`, normal event queue idempotency keys remain untouched (`report-generate:${payload.reportVersionId}`).
   - For recovery events (idempotency key starting with `report-recovery:`), queue job idempotency key is derived deterministically from the recovery event identity (`report-generate:${event.eventId}`).
   - Old terminal queue jobs and generation attempts remain intact, while recovery creates exactly one fresh waiting queue job. Retries by the dispatcher remain idempotent via database unique constraints.
4. **Integration Test Verification**:
   - Extended PostgreSQL integration test to prove:
     - Old terminal queue job/attempt remain unchanged.
     - Recovery succeeds and dispatch creates one distinct waiting queue job.
     - Dispatch retry does not duplicate queue jobs.
     - The same human recoveryId works across two different reports without collision.
     - Forced outbox collision causes `WORKFLOW_STATE_CONFLICT` and rolls back reservation state.

## Files Changed
- `packages/backend/src/reports/report.service.ts`: Report-scoped token derivation and transactional rollback on outbox collision.
- `packages/backend/src/outbox/outbox.dispatcher.ts`: Distinct queue job idempotency key for `report-recovery:` events.
- `tests/jobs/report-generation.integration.test.ts`: Extended integration test covering dispatch, retry idempotency, cross-report recovery IDs, and collision rollback.
- `plans/reports/flash-2026-09-06-report-evidence-recovery.md`: Updated documentation and verification record.

## Focused Verification Evidence
- Focused integration test:
  - Command: `pnpm vitest run tests/jobs/report-generation.integration.test.ts -t "recovers terminal failure caused by missing knowledge"`
  - Output: `Test Files 1 passed (1) | Tests 1 passed | 25 skipped (26) | Duration 4.31s`
- Backend unit tests:
  - Command: `pnpm vitest run packages/backend/src/outbox/outbox.dispatcher.test.ts`
  - Output: `Test Files 1 passed (1) | Tests 4 passed (4) | Duration 580ms`
- Backend build:
  - Command: `pnpm --filter @lasoviet/backend run build`
  - Output: `$ tsc -p tsconfig.json` (Clean exit code 0)
- Backend typecheck:
  - Command: `pnpm --filter @lasoviet/backend run typecheck`
  - Output: `$ tsc -p tsconfig.typecheck.json --noEmit` (Clean exit code 0)
- Whitespace and diff sanity:
  - Command: `git diff --check`
  - Output: Clean exit code 0, no whitespace or formatting issues.

## Unresolved Questions
None.

## Status Contract
**Status:** DONE
**Summary:** Implemented durable evidence recovery with report-scoped SHA-256 tokens, strict transaction rollback on outbox conflicts, distinct queue job idempotency keys for recovery events, and comprehensive PostgreSQL integration verification.
**Concerns/Blockers:** None
