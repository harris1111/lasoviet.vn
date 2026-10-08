# LSV89 amount-aware restoration foundation

Base: PR333 c6b6a7e2af3d22ad128179b241b5b9a83f51c418. This milestone prepares
FD119 half-restoration accounting without changing active prices, guarantees or
sale/provider/outbound flags. Existing callers continue restoring the full spend.

Add nullable restored-La and reversed-revenue fields to append-only restoration
allocations. NULL/NULL explicitly retains historical full semantics; do not
backfill or rewrite existing events. New full restorations record actual amounts.
A pure private planner supports integer proportional restoration across original
allocations (largest remainder, stable original lot order); purchased revenue
reversal is floor(original revenue * returned La / original La), promotional zero.
No public command accepts a refund amount and no half-guarantee caller is activated.

Net consumption/revenue is original minus effective restoration. Future spends
recognize max(0, floor((net consumed + new La) * pack VND / granted La) - net revenue).
Carry is derived from immutable events, including old full restores, never a
client-supplied tolerance. SQL enforces each new spend delta, restoration formula,
lineage, ledger/bucket totals and pack caps; preserve historical NULL semantics.
Full terminal-failure compensation, idempotency and entitlement revocation remain.

Allowed files: this brief; private wallet restoration math/planner and focused
fixtures; wallet repository and its integration suite; database wallet schema,
new migration/journal and historical migration-rewind fixtures. SQL writers lock
wallet then lot before calculating deltas; an actual two-connection lock-wait
regression must reject stale recognition. Build consumed packages before dependents; run focused
PostgreSQL wallet/commerce/guarantee/terminal checks and required i18n/lint/typecheck,
independent review and exact-head CI. Merge only after PR333 and this head qualify;
record actual deployment smoke. This foundation does not complete LSV89: reviewed
post-FD119 frozen terms, partial-guarantee authority and atomic catalog release are
still required together before new promises apply.
