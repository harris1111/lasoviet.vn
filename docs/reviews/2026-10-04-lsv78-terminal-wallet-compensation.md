# LSV78 terminal wallet compensation review

## Scope and behavior

Consume only durable generation/validation terminal failures on the existing worker schedule, without provider calls. Validate the failure producer, current terminal state/job and original wallet receipt/reservation lineage. Atomically restore each linked regular wallet spend to its original purchased/promotional allocations, revoke purchased access, persist a unique compensation marker, append null-actor system audit and acknowledge the fenced delivery lease. Prior guarantee restoration is validated and reused; zero-charge access revocation creates no extra money. Transient delivery failures roll back all shared spends and retry.

A private token-authorized financial command preserves verified non-anonymous owner invariants and never impersonates a customer session. Recovery cannot reuse refunded funding. Publication, guarantee, compensation and purge preserve the established lock order. A later legitimate purchase creates a new generation; subsequent purchases share it. A historical owner-only failure projection exposes committed refund status without active access, paid prose, birth data or wallet identities. Pending failures do not claim a refund.

All reserved combos and membership remain excluded/held; complete-combo compensation acceptance remains open. Bank refunds/SePay and paid-provider/device acceptance remain deferred. This is a bounded milestone, not full LSV78/LSV57 closure.

## Verification

- Actual PostgreSQL: 18 focused money/privacy tests passed, including mixed original buckets, 120+120+720 shared debits, eight palaces plus zero-charge lifetime, guarantee reuse, transaction rollback, foreign reservation lineage, stale/corrupt failure identity, current-version restart, reclaimed lease, fresh purchase, delivered/PDF exclusion, and purge.
- Concurrency tests wait for PostgreSQL `pg_stat_activity` lock evidence before releasing barriers: compensation versus guarantee/recovery/purge; publication versus a real guarantee refund.
- Failed-view rendering: 12 tests passed; committed amount/zero-charge copy remains distinct from pending support copy, with no private identity in rendered text.
- Independent draft review: initial NO GO for missing receipt/reservation bindings corrected; subsequent draft GO. Exact committed-head release review remains required.
- Required i18n/lint/typecheck, full production build and full suite are release gates; CI/deployed image smoke follow after exact-head GO. Evidence is kept outside Git at `/home/debian/projects/lasoviet-lsv78-compensation-evidence-20261004` and task comments.

## Migration note

Migration 0056 adds only `report_wallet_compensations` and its foreign keys, uniqueness/index, financial-proof check and append-only trigger. Historical checkpoint tests remove this new table only in their isolated rewind fixture. The existing generator reports an unrelated historical snapshot-parent collision and omits three existing schema modules. Generated this one-table delta in an isolated output directory against the unchanged 0055 snapshot, with all existing schema modules included there; asserted all prior table definitions were unchanged. No historical migration/snapshot repair or unrelated schema change is included. Actual migrations and historical checkpoint replay pass on PostgreSQL; updated rewind fixtures preserve all existing assertions.

## Acceptance still open

Record exact merge/deployment SHA, worker-image restoration smoke and public health evidence in Kaneo before accepting this milestone. Full tickets retain their remaining analytics/funnel, provider and deferred payment/device criteria.
