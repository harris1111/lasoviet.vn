# LSV57/78 durable committed upgrade events

## Bounded brief

The owner authorized clearing actionable To Do/In Review work, starting durable upgrade measurement. Base this dedicated branch on master e6d1e55b. Enqueue one closed `wallet.upgrade.committed.v1` outbox record atomically with a new qualifying wallet unlock, including zero-charge credit and the shared top-up settlement continuation. Preserve the existing immutable receipt key, original commit time and applied credit proof. Replays and aborted transactions must not create events. Do not backfill historical receipts.

A dedicated consumer on the existing worker outbox schedule validates immutable financial receipt lineage, records the first-party event and acknowledges its outbox lease in one transaction. Use a server-owned account business visitor with no fabricated consent, birth profile, cookie, IP, user agent, route or campaign attribution. Preserve analytics lock ordering and original event identity. Remove only the web proxy's best-effort upgrade producer; retain the customer projection and other event paths. Accept an exact pre-existing financial event without changing its visitor/profile/history, for safe rolling deployment. Reject conflicting prior values.

Serialize delivery against official purge using its existing coordination lock before the account purge marker (including an initially absent marker), prevent recreation after purge, and delete these account analytics outbox records during official purge. Keep retries bounded per worker tick, use injected clocks and fencing for recovered leases. No migration or separate queue is needed.

Allowed files: wallet upgrade proof/event helper, wallet unlock service, dedicated analytics outbox consumer and exports, worker outbox wiring, official account purge, proxy and focused regression tests, this brief and concise runbook/review evidence. Preserve catalog, prices, refunds, notifications, providers, free generation OFF and host configuration. SePay is deferred. No paid AI or bank calls.

## Verification and closure

Use actual disposable PostgreSQL for spend/continuation commit, rollback, zero/partial credit, concurrent replay/duplicate settlement, retry/lease recovery, one financial event, corrupt/foreign proof, exact legacy transition and purge before/during delivery. Preserve browser forgery rejection and successful wallet responses when delivery is unavailable. Run i18n, lint, typecheck (rebuild producers), focused checks and required CI. Independent exact-head review, production deployment, worker/health/public smoke and redacted task evidence precede Done. This milestone does not close deferred payment/device acceptance or other unfinished LSV78 recovery work.
