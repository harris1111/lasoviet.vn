# Flash Report: Report Generation Evidence Provisioning Recovery

Date: 2026-09-06
Branch: fix/report-evidence-recovery
Base: 2392378e22dd3bac9b09e41ed0e2b56121cacd5e

## Objective
Implement a bounded, domain-safe recovery operation (`recoverEvidenceInvalidGeneration`) for terminal report generation failures caused by missing knowledge provisioning. The operation allows safe re-orchestration once knowledge is ingested, preserving immutable execution history and guaranteeing that duplicate recovery requests cannot produce duplicate queue jobs.

## Files Changed
- `packages/backend/src/reports/report.service.ts`:
  - Added `recoverEvidenceInvalidGeneration` method to `createReportService`.
  - Added fail-closed precondition checks: caller-provided non-empty `recoveryId`, reservation existence and row lock, status `terminal_failure`, lastErrorCode exactly `REPORT_EVIDENCE_INVALID`, stateVersion matching `expectedStateVersion`, and absence of any immutable `report_versions` row.
  - Atomically resets reservation status to `requested`, increments stateVersion by 1, clears activeJobId, lastErrorCode, and nextAttemptAt, while strictly preserving attemptCount and all source/identity fields.
  - Leaves historical `report_queue_jobs` and `report_generation_attempts` rows untouched as immutable audit records.
  - Atomically enqueues a fresh `report.generation.requested.v1` outbox event using exact payload fields from the reservation, aggregateType `report`, aggregateId `reportVersionId`, actorId `null`, and deterministic bounded eventId, traceId, and idempotencyKey derived from the recoveryId.
  - Guarantees fail-closed error handling: `REPORT_NOT_FOUND`, `WORKFLOW_STATE_CONFLICT`, `REPORT_VERSION_CONFLICT`, and `RECOVERY_ID_INVALID`.
- `tests/jobs/report-generation.integration.test.ts`:
  - Added focused integration test against PostgreSQL container verifying end-to-end recovery behavior:
    - Verifies reservation reset to `requested` with incremented stateVersion, null activeJobId/lastErrorCode/nextAttemptAt, and preserved attemptCount and identity fields.
    - Verifies old terminal queue job and generation attempt remain immutable with `REPORT_EVIDENCE_INVALID`.
    - Verifies exactly one pending outbox event enqueued with exact payload fields and deterministic recovery idempotency key.
    - Verifies repeat calls with stale expected state version fail closed with `WORKFLOW_STATE_CONFLICT` without duplicate outbox events.
    - Verifies repeat calls against already-requested state version fail closed with `WORKFLOW_STATE_CONFLICT` without duplicate outbox events.
    - Verifies fail-closed validation for whitespace recovery IDs (`RECOVERY_ID_INVALID`).
    - Verifies fail-closed validation for non-existent reports (`REPORT_NOT_FOUND`).
    - Verifies fail-closed validation when an immutable report version already exists (`REPORT_VERSION_CONFLICT`).

## RED Phase Evidence
- Command: `pnpm vitest run tests/jobs/report-generation.integration.test.ts -t "recovers terminal failure caused by missing knowledge"`
- Output:
```text
FAIL  tests/jobs/report-generation.integration.test.ts > report generation orchestration and worker integration (Slice B) > recovers terminal failure caused by missing knowledge, preserving history and enqueuing requested outbox event
TypeError: reportService.recoverEvidenceInvalidGeneration is not a function
 ❯ tests/jobs/report-generation.integration.test.ts:2332:57
    2330|     const reportService = createReportService(database);
    2331|     const recoveryResult = await (reportService as any).recoverEvidenceInvalidGeneration({
```
- Result: 1 failed | 25 skipped.

## GREEN Phase Evidence
- Focused test:
  - Command: `pnpm vitest run tests/jobs/report-generation.integration.test.ts -t "recovers terminal failure caused by missing knowledge"`
  - Output: `Test Files 1 passed (1) | Tests 1 passed | 25 skipped (26) | Duration 4.58s`
- Full test suite:
  - Command: `pnpm vitest run tests/jobs/report-generation.integration.test.ts`
  - Output: `Test Files 1 passed (1) | Tests 26 passed (26) | Duration 10.04s`

## Verification Checks
- `@lasoviet/backend` build: `pnpm --filter @lasoviet/backend run build` passed cleanly in 3.06s.
- Workspace typecheck: `pnpm run typecheck` passed cleanly across all 10 workspace projects.
- Whitespace and diff sanity: `git diff --check` returned 0 issues.
- Zero secrets, zero VPS access, zero scope broadening, zero mutation of queue/attempt history.

## Unresolved Questions
None.

## Status Contract
**Status:** DONE
**Summary:** Implemented bounded, domain-safe `recoverEvidenceInvalidGeneration` on `createReportService` with optimistic concurrency control, immutable failure history preservation, and atomic `report.generation.requested.v1` outbox re-dispatch.
**Concerns/Blockers:** None
