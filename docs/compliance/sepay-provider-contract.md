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
