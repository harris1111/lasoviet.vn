# LSV57/78 durable upgrade event milestone

## Change and scope

New qualifying unlocks enqueue `wallet.upgrade.committed.v1` atomically with their financial receipt, including top-up continuations and zero-charge credited upgrades. The existing worker outbox schedule reconstructs immutable spend lineage, records one account business event and acknowledges delivery in one transaction. Browser attribution and consent are never invented. Exact older browser events are preserved during rolling deployment; conflicting values fail closed. The web proxy retains the upgrade projection and `la_spent`, while its duplicate best-effort upgrade producer is removed. Historical receipts are not backfilled.

Official account purge and delivery share the established coordination lock before account/outbox locks. Purge deletes these analytics outbox records. The initially absent deletion-marker race has a deterministic PostgreSQL lock barrier: the counterfactual without coordination fails with one resurrected event; the corrected implementation passes.

## Local evidence

- Full production build passed.
- Full Vitest suite passed: 450 files, 4,110 tests; three existing skips, four concurrent workers, unchanged assertions/timeouts.
- Six focused files passed: 148 tests, including actual PostgreSQL financial commit/replay/rollback, continuation settlement, lease/retry, legacy-event compatibility and purge races.
- i18n parity, lint and typecheck passed. Lint reports four existing warnings and no errors.
- `git diff --check` passed.

The first full-suite attempt ran before web artifacts existed and alongside other checks; its public-artifact assertion and five-second migration/knowledge checks failed. A complete build and bounded-concurrency full rerun passed without changing tests or timeouts. Script checks, exact-head independent review, CI and deployed-image smoke are release gates; their final results are recorded in the PR and Kaneo rather than assumed here.

## Remaining ticket scope

This closes only durable committed upgrade delivery. SePay acceptance remains owner-deferred; no bank or paid AI calls were made. LSV78 terminal compensation/recovery and remaining full-flow acceptance are separate work. Full tickets stay open until all acceptance criteria and target deployment evidence pass. Production flags, host Nginx, Garage and operator configuration are preserved.
