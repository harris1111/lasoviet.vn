# SDD ledger — plan: docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/phase-04-commerce-and-report-generation.md

Branch: `feature/paid-flow-admin-operations`
Started: 2026-09-03
Base: `8b73035`

## Execution Boundary

- Founder approved SePay Payment Gateway Sandbox credentials on 2026-09-03.
- Credentials remain only in external environment files and must never appear
  in Git, reports, test fixtures, command output, or logs.
- Implement the Gateway checkout and IPN milestone through Phase 04 Tasks 1-2.
- Production credential activation, real-money payment, PR, merge, and DNS
  changes remain out of scope.
- Deploying the Sandbox endpoint to the existing founder-managed VPS is
  authorized only to enable SePay's `Send test` handshake and a controlled
  Sandbox checkout smoke.

## Preflight Interface Scan

| Producer task | Consumer task | Shared interface | Finding |
|---|---|---|---|
| Task 1 | Task 2 | order, payment-provider reference, SePay environment, checkout identifiers | Task 2 must consume immutable server-issued order state and must not trust return URLs. |
| Task 2 | Task 3 | paid order, entitlement, report reservation, outbox event | Implement the transaction boundary now; worker consumption remains Task 3. |
| Task 1 | Existing free preview UI | selected chart, paid SKU, checkout route | Replace the deferred purchase action only after a real server-authoritative order and signed Gateway form exist. |
| Task 2 | Existing Next.js BFF/API topology | public IPN route, private API, raw provider body | The public route must forward the unmodified body and bounded auth header to the private API. |

## Rulings

- Ruling: use SePay Payment Gateway, not generic bank-transaction Webhooks,
  because the founder requires VietQR and international card methods through
  one checkout. Cost if wrong: a later provider adapter can replace the
  Gateway form/IPN implementation without changing the order contract.
- Founder decision 2026-09-03: use SePay Payment Gateway Sandbox with
  merchant-enabled VietQR and card methods through the hosted checkout. No
  merchant identifiers or credentials are recorded in repository artifacts.
- Ruling: omit `payment_method` from the signed checkout form so SePay displays
  the methods enabled for the merchant. Cost if wrong: add a server-validated
  method selector later without changing credential shape.
- Ruling: use Sandbox form endpoint
  `https://pay-sandbox.sepay.vn/v1/checkout/init`, HMAC-SHA256 checkout
  signature, and `X-Secret-Key` IPN verification. Cost if wrong: the provider
  contract preflight must stop implementation before deployment.
- Ruling: SePay's onboarding `Send test` may receive a success acknowledgement
  only after credential verification; it must never create an order,
  entitlement, or outbox event without a matching pending order and valid paid
  event. Cost if wrong: onboarding may require a separate no-op health probe.

## Progress

- Tasks 1-2 Gateway milestone: in progress.
