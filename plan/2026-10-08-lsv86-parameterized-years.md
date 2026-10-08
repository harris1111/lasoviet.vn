# LSV86: parameterized annual purchases

## Bounded brief

Owner authorized executable backend work on 2026-10-08. Base master: 49639331.
Implement current/next lunar-year selection with a generic annual and combo SKU,
immutable year period keys, target-year source/reservation lineage, and a new
migration preserving historical 2026 purchases. Calendar year rolls at Tet.
Keep every editorial-held product reserved; do not change frontend, SePay,
outbound, account balances, or FD119 prices/refund policy in this ticket.

## Compatibility and verification

Keep legacy SKU/receipt parsing for historical ownership and replay. New generic
SKU intent responses identify their target year. Reject out-of-window purchase
years and reject changed pending terms; completed receipts retain frozen year
authority. Annual sources and combo children must match their exact intent year.
Migration changes constraints/trigger in a new file; never edit deployed SQL.
Test frozen 2027 Tet boundaries, current/next year purchase/read/refund and combo
atomicity in isolated PostgreSQL. Required workspace gates, independent review,
CI, deployment and smoke precede release. Owner manual acceptance is bundled.

## Record freshness

Use dated LSV86/89 owner decisions. FD118 is an identifier collision with the
master backlog-closure record; reconcile documentation separately. Already
approved model, pricing and round-2 decisions are not new owner questions.

## Local validation

Full build and required i18n/lint/typecheck passed; lint has four existing
warnings. Full Vitest regression: 4,514 passed, 3 existing skips. Focused writer,
recovery and commerce checks: 112 passed; PostgreSQL checkpoint rewind: 25 passed.
New source/job/engine checks exercise pre-Tet and selected-next-year metadata at
the provider schema boundary. Legacy 2026 ownership aliases prevent another debit;
next-year rights remain separate. New migration replay is also verified.

Generic annual/combo catalog entries remain reserved. No sale, provider flags,
SePay, customer email or production wallet mutation has been activated. Owner
2–3 manual sample acceptance, exact-head CI, merge/deployment and smoke remain pending.
