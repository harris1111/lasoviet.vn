# SePay In-Page VietQR Payment Design

**Date:** 2026-09-05
**Status:** Founder-approved
**Scope:** Replace hosted checkout navigation with an authenticated in-page
VietQR flow while preserving payment integrity and the existing report
generation handoff.

## Goals

- Show bank transfer instructions and a dynamic VietQR image on the existing
  localized checkout route.
- Poll owner-authorized order status without exposing private API credentials.
- Redirect automatically to the private report route after an idempotently
  confirmed payment creates a report reservation.
- Accept SePay bank-transaction webhooks without removing the existing hosted
  checkout IPN parser.
- Enforce a fifteen-minute order validity window.

## Non-Goals

- Production payment activation or real-money local testing.
- Changes to report generation, AI activation, PDF, storage, deployment, DNS,
  or external infrastructure.
- Client access to server-only bank configuration, webhook secrets, internal
  actor tokens, or private API URLs beyond the explicit safe projection.

## Configuration

Keep the existing server-only SePay configuration and add:

- `SEPAY_BANK_CODE`
- `SEPAY_ACCOUNT_NUMBER`
- `SEPAY_ACCOUNT_HOLDER`
- `SEPAY_ORDER_TTL_SECONDS`
- `SEPAY_WEBHOOK_SECRET`

`SEPAY_ORDER_TTL_SECONDS` must be `900` in the initial local and documented
configuration. Bank account fields must be non-empty bounded strings.
The webhook secret must never be serialized to the web client.

Local Compose uses clearly synthetic bank metadata and secrets. Production
values remain an external founder-controlled configuration and activation gate.

## Payment Instruction Contract

Order creation and owner-authorized order reads return:

```ts
type PaymentInstructions = {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  currency: "VND";
  transferDescription: string;
  qrUrl: string;
  expiresAt: string;
};
```

The transfer description is the persisted `invoiceNumber`. The server builds
the VietQR URL with `URL` and `URLSearchParams`:

```text
https://vietqr.app/img
  ?acc=<accountNumber>
  &bank=<bankCode>
  &amount=<amount>
  &des=<invoiceNumber>
  &template=compact
```

Only the safe payment instruction projection is returned. Existing hosted
checkout action/field generation remains internal compatibility code and is no
longer rendered by the checkout page.

## Expiration

An order is valid for fifteen minutes from its active `createdAt`.

- An owner read atomically transitions an overdue pending order to `expired`.
- Payment confirmation requires both `status = pending` and an unexpired
  `createdAt`.
- A late webhook must not create a payment event, entitlement, report
  reservation, or outbox event.
- Calling create-order again for the same chart and SKU may reopen an existing
  `expired` or `failed` row by setting it back to `pending`, clearing `paidAt`,
  and refreshing `createdAt`. It retains the same stable order ID and invoice
  number, preserving the existing uniqueness model.
- Paid and refunded orders are never reopened.

Repository methods accept an injected clock and TTL where required so expiry
tests do not depend on wall-clock time.

## Webhook Compatibility And Authentication

The public Next.js ingress continues to forward the byte-identical raw body to
the private API.

It supports:

1. Existing hosted checkout IPN authentication through `x-secret-key`.
2. SePay bank webhook HMAC authentication through:
   - `X-SePay-Signature: sha256=<hex_hash>`
   - `X-SePay-Timestamp: <unix-seconds>`

For HMAC, the API computes:

```text
HMAC-SHA256(SEPAY_WEBHOOK_SECRET, "<timestamp>.<raw_body>")
```

The comparison is timing-safe. The timestamp must be within 300 seconds of an
injected current time. Missing, malformed, stale, or invalid HMAC headers are
rejected before payload processing.

The bank webhook parser accepts the documented incoming-transfer fields
needed by this application:

- transaction `id`;
- payment `code`, falling back to normalized `content` only when required;
- `transferType`;
- integer `transferAmount`.

Only incoming transfers are eligible. The normalized payment code must equal
the persisted invoice number exactly and the integer amount must equal the
persisted VND amount. The transaction `id` is the provider event ID.

Both webhook formats call the same existing transactional `recordPaid`
operation. Its payment-event uniqueness, pending-state compare-and-set,
entitlement creation, report reservation, and
`report.generation.requested.v1` outbox write remain atomic.

Successful webhook acknowledgement remains exactly:

```json
{"success":true}
```

## Status Projection

The private API owner read returns:

```ts
type CheckoutStatus = {
  order: {
    id: string;
    status: "pending" | "paid" | "expired" | "failed" | "refunded";
    amount: number;
    currency: "VND";
    locale: "vi" | "en";
  };
  paymentInstructions: PaymentInstructions;
  reportId: string | null;
};
```

`reportId` comes from the report reservation associated with the entitlement
for the paid order. It is never accepted from the client.

The web application exposes a same-origin route:

```text
GET /api/commerce/orders/:orderId/status
```

The route resolves the current verified account, calls the private API with an
internal actor token, returns only `CheckoutStatus`, and uses `no-store`.
Unauthorized and cross-owner requests do not reveal whether the order exists.

## Checkout UI

The server checkout page resolves the verified owner and initial projection,
then renders a focused client component.

The client component:

- uses the lacquer, gold, and pearl visual tokens;
- shows the VietQR image, bank, account number, account holder, amount, and
  transfer description;
- provides accessible copy buttons for account number, amount, and transfer
  description with brief localized success feedback;
- displays the remaining validity time and current state;
- polls the same-origin status endpoint every 2500 milliseconds while the
  order is pending and the document is visible;
- pauses while hidden and performs an immediate refresh when visible again;
- stops polling on `paid`, `expired`, `failed`, or `refunded`;
- redirects only when status is `paid` and `reportId` is present;
- redirects Vietnamese to `/bao-cao/<reportId>` and English to
  `/en/bao-cao/<reportId>`.

Network errors keep the current instructions visible, use bounded retry
behavior, and never display raw provider or server errors.

## Tests

Use test-driven development for each behavioral slice.

- Configuration parsing and secret non-serialization.
- VietQR URL construction and bounded metadata.
- Deterministic expiry, reopen rules, late-payment rejection, and concurrent
  webhook idempotency.
- Hosted-IPN compatibility plus valid, invalid, malformed, and stale HMAC bank
  webhook cases.
- Exact code/amount matching and outgoing-transfer rejection.
- Owner-only status projection and report ID lookup.
- Same-origin BFF status endpoint authorization and cache headers.
- Checkout UI rendering, copy behavior, polling pause/resume, terminal-state
  stop, and localized redirect.
- VI/EN message parity, workspace typecheck/build, focused integration tests,
  ESLint, and `git diff --check`.

After local Compose rebuild, run the wizard and checkout browser paths against
`http://127.0.0.1:55453` with synthetic payment metadata. Do not trigger an
external transaction.

## Exclusions And Release Gates

- No production SePay account values are added to Git.
- No production payment webhook, bank account, or provider setting is changed.
- No production AI call is enabled.
- No push, pull request, merge, external deployment, or production activation
  is part of this implementation.
- A real paid end-to-end test remains separately founder-authorized.
