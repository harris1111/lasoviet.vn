# SePay Payment Gateway Contract

Verified: 2026-09-03. Scope: Payment Gateway Sandbox, hosted checkout and IPN.
Credentials are intentionally not recorded here.

## Environment selection

- `SEPAY_ENV` is exactly `sandbox` or `production`.
- `SEPAY_MERCHANT_ID` and `SEPAY_SECRET_KEY` are server-only required values.
- Sandbox checkout form action: `https://pay-sandbox.sepay.vn/v1/checkout/init`.
- Production checkout form action: `https://pay.sepay.vn/v1/checkout/init`.
- The application derives both URLs from `SEPAY_ENV`; no provider URL is accepted
  from the environment.
- Sandbox credentials and data are isolated from Production.

## In-page VietQR payment instructions

The application supports an in-page VietQR checkout flow alongside legacy hosted
IPN compatibility. The server resolves payment configuration and provides safe
instructions for the authenticated owner without exposing provider secrets.

- Server-only configuration keys: `SEPAY_BANK_CODE`, `SEPAY_ACCOUNT_NUMBER`,
  `SEPAY_ACCOUNT_HOLDER`, `SEPAY_ORDER_TTL_SECONDS`, `SEPAY_WEBHOOK_SECRET`.
- Bank code, account number, and account holder values are intentionally
  projected to the authenticated owner on checkout to render bank transfer
  instructions. Only secrets (`SEPAY_SECRET_KEY`, `SEPAY_WEBHOOK_SECRET`) and
  internal tokens remain strictly unexposed to the client.
- Initial order time-to-live (TTL) is 900 seconds (15 minutes). Overdue pending
  orders transition deterministically to `expired`, and late incoming webhooks
  are rejected with `PAYMENT_STATE_CONFLICT`.
- Status projection: the same-origin endpoint
  `GET /api/commerce/orders/[orderId]/status` is restricted to the authenticated
  order owner and returns `cache-control: no-store`.
- The checkout client polls order status every 2500ms while visible and pending,
  pauses on document hide, refreshes immediately on visibility, and terminates
  polling on `expired`, `failed`, or `refunded`.
- Paid navigation: upon reaching `paid` status with a valid `reportId`, checkout
  redirects to `/bao-cao/<encoded reportId>` (Vietnamese) or
  `/en/bao-cao/<encoded reportId>` (English).
- Bank webhook authentication: incoming bank notifications to
  `/api/webhooks/sepay` require:
  - `X-SePay-Signature: sha256=<hex>`
  - `X-SePay-Timestamp: <unix-seconds>`
  - Canonical signing string: `<unix-seconds>.<raw-body>`
  - Timing-safe HMAC-SHA256 comparison against `SEPAY_WEBHOOK_SECRET`
  - Maximum timestamp drift: 300 seconds
- Hosted IPN compatibility: requests presenting `X-Secret-Key` continue to be
  authenticated via constant-time comparison against `SEPAY_SECRET_KEY`. Modes
  are mutually exclusive and fail closed.
- Both webhook flows hand off to `recordPaid`, which performs atomic payment
  event persistence, entitlement creation, report reservation, and outbox event
  dispatch (`report.generation.requested.v1`).
- Reopening expired or failed orders retains the stable order ID but issues a
  fresh transfer description/invoice (`LSV-<uuid>`). Stale attempt references
  cannot confirm the reopened order.
- Public webhook bodies at `/api/webhooks/sepay` are capped at 64 KiB (65,536
  bytes) before private API forwarding; oversized or malformed declared content
  lengths fail closed with 413 or 400 without calling the private API.

## Hosted checkout form

The server POSTs an HTML form to the derived hosted checkout action. Required
form fields are `merchant`, `currency` (`VND`), `order_amount`, `operation`
(`PURCHASE`), `order_description`, and unique `order_invoice_number`.
Optional fields are `customer_id`, `payment_method`, `success_url`, `error_url`,
and `cancel_url`.

The payment-method field is omitted for this product. SePay then displays the
methods enabled for the merchant, including supported VietQR/cards. The
signature order remains:

`order_amount,merchant,currency,operation,order_description,order_invoice_number,customer_id,payment_method,success_url,error_url,cancel_url`

Include only supplied fields in that order, join as `field=value` with commas,
then calculate Base64 of raw HMAC-SHA256 bytes using the secret key. The form
input order follows the same documented ordering. `success_url`, `error_url`,
and `cancel_url` are navigation-only and never confirm payment.

## IPN

The public route is exactly `/api/webhooks/sepay`. It forwards the unmodified
raw request body and the bounded `X-Secret-Key` header to the private API. The
private API verifies `X-Secret-Key` with a timing-safe comparison before parsing
or mutating business state.

A paid notification has `notification_type: ORDER_PAID`; its immutable invoice
is `order.order_invoice_number`, order currency is `order.order_currency`, and
amount is decimal string `order.order_amount`. The provider event identity is
`transaction.transaction_id`; the transaction must be `APPROVED`, have the
same decimal amount, and use VND. The success acknowledgement is returned only
after matching this to a pending order. A matching replay
returns the same success acknowledgement without another entitlement, report
reservation, or outbox event. Unknown, conflicting, malformed, amount-mismatch,
or unauthenticated requests fail closed. Provider test/non-paid notifications
use the documented `TRANSACTION_VOID` non-paid notification path only after
authentication and without business mutation.

The Sandbox onboarding `Send test` probe was observed on 2026-09-03 before
provider-side `SECRET_KEY` authentication was configured. It omitted
`X-Secret-Key` and correctly received `401`; it must not receive a special
unauthenticated acknowledgement. After the provider-side secret was configured,
a real Sandbox card transaction delivered an authenticated `ORDER_PAID`
notification, received `200`, and created exactly one payment event,
entitlement, report reservation, and processed outbox event.

No request body, provider headers, secrets, birth data, chart data, or report
content is logged.

## Sources

- SePay, [API tạo đơn hàng thanh toán](https://developer.sepay.vn/vi/cong-thanh-toan/API/don-hang/form-thanh-toan), verified 2026-09-03.
- SePay, [IPN](https://developer.sepay.vn/vi/cong-thanh-toan/IPN), verified 2026-09-03.
- SePay, [Sandbox Cổng thanh toán](https://developer.sepay.vn/vi/cong-thanh-toan/sandbox), verified 2026-09-03.
