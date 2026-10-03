# LSV-71: Atomic Engagement Recording and Deletion Coordination

## Bounded implementation brief

Fix the remaining engagement/deletion race identified in LSV-71's 2026-10-03 OFF-only release review. A previously authorized engagement must not recreate an actor/chart marker after privacy deletion, and concurrent repeats must not create duplicate markers.

Owned scope:
- `packages/backend/src/ziwei/free-palace-engagement.service.ts`: acquire the existing shared free-AI coordination lock, authorize on the same transaction, deduplicate, insert and count atomically; release the transaction before invoking the separately coordinated request path.
- `packages/backend/src/ziwei/ziwei-query.repository.ts`: allow the authorized source read to use the caller's transaction and reject purged accounts while their physical profile deletion is still queued. Existing callers keep their normal connection; cancelled/recoverable deletion requests retain existing semantics.
- `tests/free-ai/engagement.integration.test.ts`: real PostgreSQL regressions for engagement-first and deletion-first order, repeat concurrency, and expiry after a lock wait, with explicit/injected clocks.
- This evidence document.

Use the existing lock key and privacy purge behavior; no migration, route, UI, token-bound proof, provider integration, tariff, generation-flag or deployment configuration change. PR197/231 stay untouched. Product activation and actual provider spend remain outside this brief.

## Acceptance

1. Reproduce the orphan marker on the original service with a controlled engagement-first/deletion overlap.
2. Both concurrency orders for guests and accounts finish without surviving engagement markers or unauthorized requests, including the account purge-to-outbox interval.
3. Authorization samples its time after the coordination lock; a guest expiring while queued cannot insert a marker.
4. Concurrent same-tab submissions persist one marker; different tabs still reach the existing threshold without duplicate gift admission.
5. Existing OFF, localization, retention, accounting, and source-ownership tests remain passing. Required i18n/lint/typecheck and focused integration checks pass before PR.

## Ticket and release state

LSV-71 moves to In Progress for this bounded correction, then In Review when the correction PR is ready. It must not become Done: independent review, full deployed/private/member/A17 smoke, production token-bound/cost/quality acceptance and enabled provider/kill-switch validation remain separate gates. Generation remains OFF.

## Evidence

- Reproduced the original guest engagement-first race on real PostgreSQL: deletion completed during the paused authorized read, then recording persisted one orphan engagement marker (expected zero).
- After coordinating engagement, reproduced the account deletion-first gap: purge had committed and queued physical deletion, but the captured account actor could still record a marker. The source query now rejects `purged` deletion state while profile rows remain; recoverable/cancelled requests keep their existing behavior.
- Both guest/account orderings, six concurrent repeats, and expiry during the lock wait are covered with controlled gates and injected timestamps. Every authorized source read uses the same transaction as marker queries. Admission runs after that transaction commits and retains its existing source/tombstone checks.
- Focused regression command: `pnpm exec vitest run tests/free-ai tests/privacy/account-deletion.integration.test.ts packages/backend/src/ziwei/ziwei-query.service.test.ts apps/api/src/free-palace-composition.test.ts --maxWorkers=2`. Result: 17 files / 188 tests passed on 2026-10-03; all 18 engagement tests passed.
- `pnpm i18n:check && pnpm lint && pnpm typecheck` passed. Lint has four existing web warnings and no errors. Producer packages were rebuilt before dependent typechecks. `git diff --check` passed.
- No enabled provider call, deployed correction smoke, or independent reviewer approval is claimed by these local checks. The bounded correction is ready for PR review; full LSV-71 release gates remain open.
