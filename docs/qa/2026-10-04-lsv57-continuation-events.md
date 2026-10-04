# LSV57 continuation measurement acceptance

Automatic fulfillment of a customer's previously confirmed top-up purchase intent now durably produces `la_spent` and `unlock_confirmed`. Credit remains committed if the separately confirmed unlock fails; successful debit, entitlement, completed continuation and outbox creation share one savepoint. A receipt/outbox-proven private marker prevents the BFF replay producer from duplicating a continuation event.

## Verified candidate evidence

- Required i18n parity, lint, producer-rebuilding typecheck and full build passed. Lint retains four existing warnings.
- Top-up PostgreSQL suite: 40/40 passed, including both worker/BFF replay orders, original balance after subsequent credit, failed enqueue rollback, atomic two-event retry, crashed lease, malformed/foreign authority, purge and request-after-delivery fencing, claim/webhook lock concurrency, advancing ordinary/daily clocks, zero-price receipt and historical post-refund proof. A stricter three-case historical lineage rerun also passed.
- Event, ingress, return-visit and financial privacy contracts: 68/68 passed. The earlier combined financial/API/BFF suite passed 171/171 before the final historical-lineage additions; this is not an additional disjoint case count.
- Actual network candidate goldens: 14/14 passed at widths 390 and 1440. Actual signed-in HTTP ingress and compiled financial dispatch persisted all eleven required names: `topup_view`, `pack_selected`, `la_spent`, `upgrade_view`, `upgrade_purchased`, `return_visit`, `unlock_confirm_view`, `unlock_confirmed`, `part_feedback`, `guarantee_claimed`, `welcome_grant`.
- Each 120-La automatic continuation produced exactly one of each required financial event across repeated dispatch. Actual upgrade/feedback/refund flows remained intact. The privacy property probe passed and provider-attempt count stayed zero.
- Candidate artifacts and credentials lived outside Git. The owned isolated containers, internal network and credentials were removed after acceptance.

These are synthetic funding and stored-prose fixtures, not SePay revenue or writer-quality acceptance. Product/provider availability and operator configuration remain unchanged. Independent exact-head review, CI and published-image deployment/runtime acceptance remain required before Kaneo Done; the task records retain the immutable release evidence.
