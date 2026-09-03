# Tasks 1-2 Gateway milestone report

Date: 2026-09-03

## Provider evidence

- Official form contract verified from the three URLs recorded in
  `docs/compliance/sepay-provider-contract.md`.
- Hosted sandbox form endpoint: `https://pay-sandbox.sepay.vn/v1/checkout/init`.
- Signed field order, Base64 raw HMAC-SHA256 construction, optional
  `payment_method`, callback-only return URLs, and `X-Secret-Key` IPN handling
  are recorded without credential values.

## TDD evidence

- RED: `pnpm vitest run packages/backend/src/commerce/order.service.test.ts packages/backend/src/commerce/sepay-adapter.test.ts packages/backend/src/commerce/sepay-webhook.service.test.ts packages/config/src/environment-schema.test.ts tests/seo/private-route-state.test.ts`
  failed as expected: missing commerce modules and SePay fail-closed
  environment validation.
- GREEN: same command passed: 5 files, 44 tests.
- Producer build: contracts, config, backend builds passed after correcting a
  type-only export.

## Changed files

- Contracts/environment: `packages/contracts/src/commerce.ts`,
  `packages/config/src/environment-schema.ts`, loader, exports, and tests.
- Commerce: server-authoritative P0 catalog/order policy, hosted-form SePay
  adapter, timing-safe IPN service, and focused tests.
- Web: `/api/webhooks/sepay` forwards raw text plus bounded `X-Secret-Key`.
- Compliance/deployment: provider contract, `.env.example`, and Phase 04 SDD
  ledger decision record.

## Environmental blockers and remaining work

- The database migration, private API controller, durable payment event,
  entitlement, report reservation, atomic outbox insertion, outbox dispatcher,
  checkout page/action, and Testcontainers transaction test remain unimplemented.
- Therefore this is not a complete Tasks 1-2 milestone and must not be sent
  for Sol completion review. No Docker/Testcontainers attempt was run because
  the transactional schema/controller does not yet exist.

## Durable rule candidates

- Provider checkout URLs must derive only from a closed environment enum; never
  accept a provider host from deployment configuration.
- Hosted checkout navigation URLs are never payment confirmation evidence.
