# WP-06 Report And Payment Recovery UI Brief

## Role And Boundary

- Executor: Flash Executor using `ag/gemini-3.8-flash-high` with `high`
  reasoning.
- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp06-report-recovery-ui-20260909`
- Base: `1baf26c8b082db8542567034cf30721ea4bf36ff`
- Implement only the remaining customer-facing WP-06 recovery states.
- Reuse the existing checkout status contract, report failed projection,
  self-claim form, account library, and order-history routes.
- Do not change contracts, API, backend, database, notification delivery,
  report generation/retry behavior, prices, SKU availability, payment
  activation, Telegram configuration, or route registry.
- Do not commit, push, merge, deploy, access production, or trigger external
  effects.

## Binding Sources

- `AGENTS.md`
- `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`
- `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
- `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`
- Terra-approved WP-06 server commits `b7613f5` and `3809a7d`
- Terra-approved WP-02B recovery UI commit `6c370b7`

## Owned Files

- `apps/web/src/features/reports/report-progress.tsx`
- `apps/web/src/features/reports/report-progress.test.tsx`
- `apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx`
- `apps/web/src/features/commerce/vietqr-checkout.tsx`
- `apps/web/src/features/commerce/vietqr-checkout.test.tsx`
- `apps/web/src/app/[locale]/thanh-toan/[orderId]/page.tsx`
- `apps/web/src/app/[locale]/thanh-toan/[orderId]/page.test.tsx`
- `apps/web/messages/vi/reports.json`
- `apps/web/messages/en/reports.json`
- `apps/web/src/styles/vietqr-checkout.css`
- `apps/web/src/styles/global.css`

Stop before editing any other file.

## Report Progress States

- Keep one report-generation screen for `requested`, `generating`,
  `validating`, and `retryable_failure`.
- Preserve bounded refresh using the server-provided `refreshAfterMs`.
- Do not show a percentage, estimated completion time, fake progress bar, raw
  fulfillment status, provider/model error, or retry control.
- Make it explicit that payment has already been received and the report is
  being prepared.
- Give the customer a plain path back to the locale-correct report library so
  they may leave and return later.
- For `terminal_failure`, render all required BE-5 facts from
  `ReportFailedViewV1`:
  - payment received confirmation;
  - customer-facing invoice number;
  - payment-received timestamp;
  - report-status updated timestamp;
  - support reference;
  - next step.
- Format timestamps in `Asia/Ho_Chi_Minh`, localized for Vietnamese and
  English.
- Build the support `mailto:` from the server-projected `supportEmail`,
  `supportSubject`, and `supportReference`. Prefill a bounded body containing
  the invoice number, support reference, and the two displayed timestamps.
  Encode query values and do not include internal report/version IDs.

## Checkout States

- `pending`: retain the same immutable VietQR instructions and order while
  polling. Add direct copy stating that a customer who already transferred
  must not transfer again and should use the existing self-claim form.
- Render the self-claim form only where payment is still pending.
- `paid` without a report ID: render a dedicated payment-received screen,
  distinct in heading and layout from report generation, and keep bounded
  polling until a report ID appears. Do not show stale QR instructions.
- `paid` with a report ID: preserve locale-correct navigation to the report.
- `expired`: render a dedicated expired screen, do not render QR or self-claim,
  state that the old order remains in order history, and provide:
  - a locale-correct action to create a new chart/request;
  - a locale-correct action to view order history.
- `failed`: render a dedicated payment-failed screen with a locale-correct
  order-history path and a generic support email path. Do not invite a second
  transfer from the failed order.
- `refunded`: render a dedicated refunded screen, do not render QR,
  self-claim, or a purchase-as-new button, and provide only the
  locale-correct order-history path.
- Terminal checkout states must render correctly whether the API projection
  contains stale non-null payment instructions or null instructions.
- A valid non-pending status with null instructions must not become a 404.
- Do not expose SKU IDs, internal error codes, Telegram state, payment
  candidates, or provider details.

## Presentation

- Follow the existing lacquer/gold/pearl UI and current checkout/report
  patterns.
- Use compact full-width status surfaces; do not nest cards or introduce
  marketing-style heroes, gradients, or decorative assets.
- Keep actions readable and non-overlapping at 375px and desktop widths.
- Keep visible copy direct, short, and customer-facing.
- Do not render AI disclosure, methodology, confidence, limitation, or
  defensive report language.

## Required Tests

1. Report generation renders payment-received and preparation copy, no fake
   percentage/time promise, and a locale-correct library path.
2. Terminal report failure renders invoice, both localized timestamps,
   support reference, next step, and an encoded prefilled support URL without
   internal report/version IDs.
3. Pending checkout renders one VietQR screen, the no-second-transfer warning,
   and the self-claim form below it.
4. Paid checkout without report ID renders a distinct payment-received screen,
   no QR, and continues bounded polling.
5. Paid checkout with report ID preserves one locale-correct navigation.
6. Expired checkout renders no QR/self-claim, explains the old order remains
   traceable, and exposes new-request plus order-history actions.
7. Failed checkout renders no QR/self-claim or transfer-again guidance and
   exposes order-history/support paths.
8. Refunded checkout renders no QR/self-claim or purchase-as-new action and
   exposes only order history.
9. Non-pending null instructions render a recovery screen rather than 404.
10. No state renders a client-side report unlock control, raw SKU, raw
    fulfillment status, or internal error/provider detail.

## Focused Checks

```bash
corepack pnpm@11.25.0 --filter @lasoviet/contracts run build
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 exec vitest run \
  apps/web/src/features/reports/report-progress.test.tsx \
  apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx \
  apps/web/src/features/commerce/vietqr-checkout.test.tsx \
  apps/web/src/features/commerce/payment-self-claim-form.test.tsx \
  apps/web/src/app/[locale]/thanh-toan/[orderId]/page.test.tsx
corepack pnpm@11.25.0 --filter @lasoviet/web run build
git diff --check
```

## Return

- Exact changed files.
- State-by-state customer flow implemented.
- Focused check results.
- Blockers or residual risks.
- Confirmation that contracts/API/backend/database, notification delivery,
  report generation, payment activation, Telegram, route registry,
  production, push, merge, and deploy remained untouched.
