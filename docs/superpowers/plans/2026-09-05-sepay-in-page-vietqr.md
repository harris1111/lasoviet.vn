# SePay In-Page VietQR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hosted SePay checkout navigation with a secure, owner-only
in-page VietQR payment flow that expires after fifteen minutes and redirects to
the generated report after idempotent webhook confirmation.

**Architecture:** A server-only payment-instruction builder projects bank
metadata and a VietQR URL. The commerce repository owns deterministic order
expiry, reopen behavior, payment confirmation, and report lookup. The webhook
boundary accepts both the existing hosted IPN and SePay's raw-body HMAC bank
transaction format. A same-origin authenticated BFF endpoint feeds a focused
client checkout component that polls every 2500 milliseconds.

**Tech Stack:** TypeScript, NestJS, Next.js App Router, React, Drizzle ORM,
PostgreSQL, Vitest, Playwright, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-05-sepay-in-page-vietqr-design.md`

## Global Constraints

- `SEPAY_ORDER_TTL_SECONDS` is exactly `900` in initial local and documented
  configuration.
- Bank configuration and both SePay secrets remain server-only.
- HMAC input is exactly `<unix-seconds>.<raw-body>` and the accepted timestamp
  drift is at most `300` seconds.
- Poll interval is exactly `2500` milliseconds while pending and visible.
- Only a verified account owner can read an order or its report ID.
- The existing hosted-IPN parser remains supported.
- `recordPaid` remains the single atomic entitlement, report reservation, and
  `report.generation.requested.v1` handoff.
- Local validation uses synthetic bank metadata and never triggers an external
  payment.
- No production activation, push, PR, merge, deployment, DNS, AI, PDF, or
  storage work.
- Gemini Flash high writes code from bounded Sol briefs. Terra high performs
  independent milestone review.

---

### Task 1: Server-Only Configuration And VietQR Instructions

**Files:**
- Modify: `packages/config/src/environment-schema.ts`
- Modify: `packages/config/src/load-environment.ts`
- Modify: `packages/config/src/environment-schema.test.ts`
- Modify: `.env.example`
- Create: `packages/backend/src/commerce/payment-instructions.ts`
- Create: `packages/backend/src/commerce/payment-instructions.test.ts`
- Modify: `packages/backend/src/index.ts`

**Interfaces:**
- Produces:

```ts
type SePayEnvironment = {
  environment: "sandbox" | "production";
  merchantId: string;
  secretKey: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  orderTtlSeconds: number;
  webhookSecret: string;
};

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

function createPaymentInstructions(input: {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  currency: "VND";
  invoiceNumber: string;
  createdAt: Date;
  orderTtlSeconds: number;
}): PaymentInstructions;
```

- [ ] **Step 1: Write failing configuration and instruction tests**

Assert that all five new variables are required, TTL rejects non-positive or
non-integer values, the loaded environment contains the normalized fields, and
the returned QR URL has origin `https://vietqr.app`, pathname `/img`, and exact
query fields `acc`, `bank`, `amount`, `des`, `template=compact`.

```ts
expect(createPaymentInstructions({
  bankCode: "VCB",
  accountNumber: "123456789",
  accountHolder: "LA SO VIET",
  amount: 79_000,
  currency: "VND",
  invoiceNumber: "LSV-order-1",
  createdAt: new Date("2026-09-05T00:00:00.000Z"),
  orderTtlSeconds: 900,
})).toMatchObject({
  transferDescription: "LSV-order-1",
  expiresAt: "2026-09-05T00:15:00.000Z",
});
```

- [ ] **Step 2: Run RED**

```powershell
corepack pnpm@11.25.0 --filter @lasoviet/config test -- environment-schema.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/backend test -- payment-instructions.test.ts
```

Expected: tests fail because the five fields and instruction builder do not
exist.

- [ ] **Step 3: Implement minimal configuration and builder**

Use bounded trimmed strings, positive safe integer TTL, `URL`, and
`URLSearchParams`. Do not expose `secretKey` or `webhookSecret` from the
instruction result.

- [ ] **Step 4: Run GREEN and package checks**

```powershell
corepack pnpm@11.25.0 --filter @lasoviet/config test -- environment-schema.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/backend test -- payment-instructions.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/config run typecheck
corepack pnpm@11.25.0 --filter @lasoviet/backend run typecheck
```

- [ ] **Step 5: Sol stages the reviewed task**

```powershell
git add -- packages/config/src/environment-schema.ts packages/config/src/load-environment.ts packages/config/src/environment-schema.test.ts .env.example packages/backend/src/commerce/payment-instructions.ts packages/backend/src/commerce/payment-instructions.test.ts packages/backend/src/index.ts
git commit -m "feat: add server-side VietQR payment instructions"
```

### Task 2: Deterministic Order Expiry And Status Projection

**Files:**
- Modify: `packages/backend/src/commerce/commerce.repository.ts`
- Modify: `tests/payments/sepay-webhook.integration.test.ts`

**Interfaces:**
- Consumes: `orderTtlSeconds` from Task 1.
- Produces:

```ts
type CommerceRepositoryOptions = {
  now?: () => Date;
  orderTtlSeconds: number;
  beforePaymentCommit?: () => Promise<void>;
};

type OwnedOrderProjection = {
  order: typeof commerceOrders.$inferSelect;
  reportId: string | null;
};

readOrder(
  actor: CurrentActor,
  orderId: string,
): Promise<OwnedOrderProjection | null>;
```

- [ ] **Step 1: Write failing integration tests**

Cover these database-visible outcomes with an injected clock:

```ts
// pending at 14:59 remains pending
// pending at 15:00 atomically becomes expired
// recordPaid after 15:00 returns PAYMENT_STATE_CONFLICT and creates no side effects
// createOrder reopens expired/failed but not paid/refunded
// paid owner projection returns its report reservation ID
// another owner receives null
```

- [ ] **Step 2: Run RED**

```powershell
corepack pnpm@11.25.0 vitest run tests/payments/sepay-webhook.integration.test.ts
```

Expected: expiry, reopen, and report projection assertions fail.

- [ ] **Step 3: Implement repository transitions**

Use transaction-scoped compare-and-set predicates. Calculate the cutoff from
the injected `now()` and `orderTtlSeconds`. A late payment must fail before
inserting `commerce_payment_events`. Join
`commerce_entitlements.orderId -> report_reservations.entitlementId` for the
owner-only `reportId`.

- [ ] **Step 4: Run GREEN**

```powershell
corepack pnpm@11.25.0 vitest run tests/payments/sepay-webhook.integration.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/backend run typecheck
```

- [ ] **Step 5: Sol stages the reviewed task**

```powershell
git add -- packages/backend/src/commerce/commerce.repository.ts tests/payments/sepay-webhook.integration.test.ts
git commit -m "feat: enforce payment order expiry"
```

### Task 3: Dual SePay Webhook Boundary

**Files:**
- Modify: `packages/backend/src/commerce/sepay-webhook.service.ts`
- Modify: `packages/backend/src/commerce/sepay-webhook.service.test.ts`
- Modify: `apps/api/src/commerce/commerce.controller.ts`
- Modify: `apps/api/src/commerce/commerce.controller.test.ts`
- Modify: `apps/api/src/api.module.ts`
- Modify: `apps/web/src/app/api/webhooks/sepay/route.ts`
- Modify: `apps/web/src/app/api/webhooks/sepay/route.test.ts`

**Interfaces:**
- Consumes: `SePayEnvironment.webhookSecret` and repository TTL options.
- Produces:

```ts
handle(input: {
  rawBody: string;
  secretHeader?: string;
  signatureHeader?: string;
  timestampHeader?: string;
  traceId: string;
}): Promise<
  | { ok: true; value: { acknowledged: true; replayed?: boolean } }
  | { ok: false; error: { code: string } }
>;
```

- [ ] **Step 1: Write failing service and ingress tests**

Use exact fixtures for:

```ts
const bankTransfer = {
  id: 92704,
  gateway: "Vietcombank",
  transactionDate: "2026-09-05 10:00:00",
  accountNumber: "123456789",
  subAccount: "",
  code: "LSV-order-1",
  content: "LSV-order-1 chuyen tien",
  transferType: "in",
  description: "NGUYEN VAN A chuyen tien",
  transferAmount: 79_000,
  accumulated: 1_000_000,
  referenceCode: "FT24012345678",
};
```

Assert valid HMAC succeeds; invalid, malformed, future, and older-than-300
second timestamps fail; `transferType: "out"` fails; amount mismatch remains a
repository conflict; `id` becomes provider event ID `"92704"`; hosted IPN tests
remain green; public ingress forwards raw bytes and both HMAC headers.

- [ ] **Step 2: Run RED**

```powershell
corepack pnpm@11.25.0 --filter @lasoviet/backend test -- sepay-webhook.service.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/api test -- commerce.controller.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web test -- route.test.ts
```

- [ ] **Step 3: Implement authentication and bank parser**

Authenticate one complete mode only: valid hosted `x-secret-key`, or valid
HMAC headers. For HMAC, compute SHA-256 over
`<timestamp>.<rawBody>` with `webhookSecret` and compare hex bytes
timing-safely. Normalize the bank payment code as:

```ts
const paymentCode =
  payload.code?.trim() ||
  payload.content.trim().split(/\s+/, 1)[0] ||
  "";
```

Require the normalized code to match the bounded invoice format before calling
`recordPaid`.

- [ ] **Step 4: Run GREEN**

```powershell
corepack pnpm@11.25.0 --filter @lasoviet/backend test -- sepay-webhook.service.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/api test -- commerce.controller.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web test -- route.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/api run typecheck
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
```

- [ ] **Step 5: Terra high reviews Tasks 1-3 as one payment-integrity milestone**

Review configuration secrecy, deterministic expiry, reopen semantics, raw-body
HMAC, replay protection, exact code/amount matching, hosted compatibility, and
transactional idempotency.

- [ ] **Step 6: Sol stages the reviewed task**

```powershell
git add -- packages/backend/src/commerce/sepay-webhook.service.ts packages/backend/src/commerce/sepay-webhook.service.test.ts apps/api/src/commerce/commerce.controller.ts apps/api/src/commerce/commerce.controller.test.ts apps/api/src/api.module.ts apps/web/src/app/api/webhooks/sepay/route.ts apps/web/src/app/api/webhooks/sepay/route.test.ts
git commit -m "feat: accept authenticated SePay bank webhooks"
```

### Task 4: Owner-Only Checkout Projection And BFF Status Route

**Files:**
- Modify: `apps/api/src/commerce/commerce.controller.ts`
- Modify: `apps/api/src/commerce/commerce.controller.test.ts`
- Modify: `apps/web/src/features/commerce/create-checkout-order.ts`
- Modify: `apps/web/src/features/commerce/create-checkout-order.test.ts`
- Create: `apps/web/src/features/commerce/checkout-status.ts`
- Create: `apps/web/src/features/commerce/checkout-status.test.ts`
- Create: `apps/web/src/app/api/commerce/orders/[orderId]/status/route.ts`
- Create: `apps/web/src/app/api/commerce/orders/[orderId]/status/route.test.ts`

**Interfaces:**
- Consumes: `createPaymentInstructions` and `OwnedOrderProjection`.
- Produces the exact `CheckoutStatus` contract from the spec.

- [ ] **Step 1: Write failing controller, client parser, and route tests**

Assert create/read return `paymentInstructions` and `reportId`; the client
parser rejects unknown statuses, non-VND currency, invalid QR origins, malformed
dates, and extra secret-like fields; the BFF resolves a verified account,
encodes `orderId`, uses the private API, returns `cache-control: no-store`, and
maps unauthorized/cross-owner cases without enumeration.

- [ ] **Step 2: Run RED**

```powershell
corepack pnpm@11.25.0 --filter @lasoviet/api test -- commerce.controller.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web test -- create-checkout-order.test.ts checkout-status.test.ts route.test.ts
```

- [ ] **Step 3: Implement minimal projection and BFF**

Inject the full `SePayEnvironment` fields through explicit Nest tokens. Build
instructions only on the server. Reuse `resolveVerifiedAccountActor` and
`privateApiClient`; do not add a public unauthenticated private-API endpoint.

- [ ] **Step 4: Run GREEN**

```powershell
corepack pnpm@11.25.0 --filter @lasoviet/api test -- commerce.controller.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web test -- create-checkout-order.test.ts checkout-status.test.ts route.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/api run typecheck
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
```

- [ ] **Step 5: Sol stages the reviewed task**

```powershell
git add -- apps/api/src/commerce/commerce.controller.ts apps/api/src/commerce/commerce.controller.test.ts apps/web/src/features/commerce/create-checkout-order.ts apps/web/src/features/commerce/create-checkout-order.test.ts apps/web/src/features/commerce/checkout-status.ts apps/web/src/features/commerce/checkout-status.test.ts 'apps/web/src/app/api/commerce/orders/[orderId]/status/route.ts' 'apps/web/src/app/api/commerce/orders/[orderId]/status/route.test.ts'
git commit -m "feat: expose owner-only checkout status"
```

### Task 5: In-Page VietQR Checkout Experience

**Files:**
- Modify: `apps/web/src/app/[locale]/thanh-toan/[orderId]/page.tsx`
- Modify: `apps/web/src/app/[locale]/thanh-toan/[orderId]/page.test.tsx`
- Create: `apps/web/src/features/commerce/vietqr-checkout.tsx`
- Create: `apps/web/src/features/commerce/vietqr-checkout.test.tsx`
- Create: `apps/web/src/styles/vietqr-checkout.css`
- Modify: `apps/web/src/styles/global.css`
- Modify: `apps/web/messages/vi/reports.json`
- Modify: `apps/web/messages/en/reports.json`

**Interfaces:**
- Consumes: parsed initial `CheckoutStatus` and
  `GET /api/commerce/orders/:orderId/status`.
- Produces: localized report navigation after `paid + reportId`.

- [ ] **Step 1: Write failing page and client tests**

Use fake timers and a visibility-state seam to assert:

```ts
// initial QR and all transfer metadata render
// copy buttons copy account, amount, and description
// countdown reaches 00:00 from expiresAt
// pending polls every 2500 ms
// hidden document pauses polling and visible resumes immediately
// paid without reportId keeps waiting safely
// paid with reportId redirects to locale report route
// expired, failed, and refunded stop polling
```

- [ ] **Step 2: Run RED**

```powershell
corepack pnpm@11.25.0 --filter @lasoviet/web test -- page.test.tsx vietqr-checkout.test.tsx
```

- [ ] **Step 3: Implement the lacquer VietQR component**

Use `next/image` only if it supports the remote VietQR host in the existing
configuration; otherwise use a plain `<img>` with explicit width, height,
alt text, and the scoped ESLint exception required by Next.js. Use existing
icons through `Icon`. Keep card radius at or below 8px, stable QR dimensions,
responsive two-column desktop and single-column mobile layouts, visible focus,
copy status, and no nested cards.

- [ ] **Step 4: Run GREEN and localization checks**

```powershell
corepack pnpm@11.25.0 --filter @lasoviet/web test -- page.test.tsx vietqr-checkout.test.tsx
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 run i18n:check
```

- [ ] **Step 5: Terra high reviews the complete in-page payment milestone**

Review visual hierarchy, responsive behavior, copy controls, timer accuracy,
poll lifecycle, authorization boundaries, terminal states, report redirect,
and all explicit exclusions.

- [ ] **Step 6: Sol stages the reviewed task**

```powershell
git add -- 'apps/web/src/app/[locale]/thanh-toan/[orderId]/page.tsx' 'apps/web/src/app/[locale]/thanh-toan/[orderId]/page.test.tsx' apps/web/src/features/commerce/vietqr-checkout.tsx apps/web/src/features/commerce/vietqr-checkout.test.tsx apps/web/src/styles/vietqr-checkout.css apps/web/src/styles/global.css apps/web/messages/vi/reports.json apps/web/messages/en/reports.json
git commit -m "feat: add in-page VietQR checkout"
```

### Task 6: Documentation, Full Verification, And Local Compose

**Files:**
- Modify: `docs/compliance/sepay-provider-contract.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`
- Modify: `AGENT_HANDOFF.md`
- Modify: Compose environment documentation only if required by the new
  server-only variables.

**Interfaces:**
- Consumes the completed implementation and review evidence.
- Produces an English operational record without production credentials.

- [ ] **Step 1: Update repository documentation**

Record in-page VietQR, HMAC authentication, five new variables, enforced
fifteen-minute expiry, local synthetic-only validation, and the unchanged
production activation gate.

- [ ] **Step 2: Run full verification**

```powershell
corepack pnpm@11.25.0 --recursive run typecheck
corepack pnpm@11.25.0 --recursive run build
corepack pnpm@11.25.0 --recursive run test
corepack pnpm@11.25.0 run i18n:check
corepack pnpm@11.25.0 run lint
git diff --check
```

Run Docker-backed payment/report integration tests separately when the suite
requires `DATABASE_URL`.

- [ ] **Step 3: Rebuild local Compose on the existing project**

Reconstruct a temporary external env file from the running containers without
printing complete environment maps, add:

```dotenv
WEB_HOST_PORT=55453
SEPAY_BANK_CODE=SYNTHETIC_BANK
SEPAY_ACCOUNT_NUMBER=0000000000
SEPAY_ACCOUNT_HOLDER=LA SO VIET LOCAL TEST
SEPAY_ORDER_TTL_SECONDS=900
SEPAY_WEBHOOK_SECRET=synthetic-local-webhook-secret
```

Rebuild and restart the existing `lasoviet-mvp` Compose project, verify all
services become healthy, run focused browser checks against
`http://127.0.0.1:55453`, then remove the temporary env file. Do not send a
payment or call SePay.

- [ ] **Step 4: Final Terra high whole-branch review**

Give Terra the complete diff, all test evidence, the SDD ledger, deferred
findings, and the spec. One bounded Gemini fix wave and one scoped Terra
re-review are allowed.

- [ ] **Step 5: Sol stages the reviewed documentation**

```powershell
git add -- docs/compliance/sepay-provider-contract.md docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md AGENT_HANDOFF.md
git commit -m "docs: record in-page VietQR payment flow"
```
