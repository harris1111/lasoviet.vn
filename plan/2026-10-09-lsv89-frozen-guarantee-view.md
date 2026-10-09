# LSV89 purchase-bound guarantee reader projection

Bounded brief: extend the existing authorized ready-report DTO with an optional
redacted guarantee promise from validated frozen purchase terms and the actual
spend timestamp. This is display data, not current account eligibility or claim
authority. Preserve legacy NULL/v1 rights and FD119/v2 terms, including discounts,
rollover and Combo; never infer rights from today's catalog. Expose charged La,
frozen policy version, full/half/none, maximum restoration La, exclusive 24-hour
claim deadline (or null for no promise), once-per-account condition and the
all-paid-components-ready condition for half promises. The claim service still
checks ownership, feedback, account history, readiness, original allocations and
its own injected clock. Do not expose purchase/spend/owner IDs or credit proofs.

Dedicated branch inherits held PR335 and reconciles current master. Allowed scope:
one shared DTO/export, one private pure projection/test, authorized repository and
ready service mapping, focused real PostgreSQL/reader acceptance, this receipt.
No new route, FE, visual copy, payment/provider, financial mutation, schema or
activation changes. Direct-master PR remains draft until PR335 and matching FE
release are ready. Invalid frozen terms or spend bindings fail closed.

Validation: old NULL/v1 and new v2 purchases, full/half/none and zero-charge,
actual spent-at deadline independent of read time, discount/rollover/Combo,
malformed/cross-purchase projections, no private fields, all ready branches,
order/pending/unauthorized omission, actual PostgreSQL repository flow, required
prepush checks, independent review and fresh CI. No whole-ticket Done inference.

Local receipt (2026-10-09): 113 focused tests passed across six suites, including
real PostgreSQL new-v2 and historical NULL/v1 completed-purchase projections,
existing actual guarantee/refund flows and annual generation/read rollover.
Three annual-year ready DTOs retain the same spent-at deadline when read in2029;
wrong maximum projections fail closed. Pending reports omit the promise. Required
i18n/lint/producer-dependent typechecks passed; four existing lint warnings, no
errors. Independent working-diff review found no financial/privacy blocker and
separately ran79 tests successfully. The imprecise pending test title was corrected.
Exact committed-head review and fresh CI remain required. Draft inherits PR335's
atomic FE release hold; no live provider/customer/financial operation occurred.
