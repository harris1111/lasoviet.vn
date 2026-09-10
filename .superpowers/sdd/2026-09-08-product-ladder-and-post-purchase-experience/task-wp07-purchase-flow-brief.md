# WP-07 Purchase Selection And Ownership Flow Brief

## Role And Boundary

- Executor: Flash Executor using `ag/gemini-3.8-flash-high` with `high`
  reasoning.
- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp07-purchase-flow-20260909`
- Base: `a8bcbbfec0cd8aa22da2e95d4e765087e6fce6c0`
- Implement only WP-07 purchase selection, ownership-aware actions, and
  purchase-intent continuity.
- Do not activate the reserved 19,000 VND offer. Do not change catalog
  availability, contracts, API, database schema, prices, entitlement scope,
  report generation, payment activation, Telegram, auth provider behavior, or
  route registry.
- Do not commit, push, merge, deploy, access production, or trigger external
  effects.

## Binding Sources

- `AGENTS.md`
- FD-042 and FD-043 in
  `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`
- B-1, B-2, B-3, B-5, and B-9 in
  `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
- WP-07 in
  `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`
- Terra-approved WP-03 account library, WP-04 catalog, WP-05 offer promise,
  and WP-06 recovery flows

## Recorded Drift

- The backlog says live order creation returns `ENTITLEMENT_EXISTS`, but the
  current database commerce repository reuses the existing paid order.
  Preserve this safer behavior and add compatibility handling for an older or
  alternate API response that still returns `ENTITLEMENT_EXISTS`.
- The backlog says to pass `sku` through the UI. FD-042 is newer and higher
  priority: no SKU or internal identifier may be exposed to customers in any
  form. Use a customer-safe public offer key in the browser and map it to the
  active SKU only inside the server action.
- The contract currently exposes exactly one active offer because the 19,000
  VND offer remains reserved until WP-08. Prepare the selector to render at
  most two safe offer presentations, but do not widen the active commerce
  contract or make a second offer purchasable in this task.

## Owned Files

- `apps/web/src/features/commerce/checkout-offer.ts`
- `apps/web/src/features/commerce/checkout-offer.test.ts`
- `apps/web/src/features/commerce/create-checkout-order.ts`
- `apps/web/src/features/commerce/create-checkout-order.test.ts`
- `apps/web/src/features/commerce/checkout-purchase-form.tsx`
- `apps/web/src/features/commerce/checkout-purchase-form.test.tsx`
- `apps/web/src/features/reports/purchase-offer-presentation.ts`
- `apps/web/src/features/reports/purchase-offer-presentation.test.ts`
- `apps/web/src/features/reports/paid-topic-selector.tsx`
- `apps/web/src/features/reports/paid-topic-selector.test.tsx`
- `apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.tsx`
- `apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.test.tsx`
- `apps/web/messages/vi/reports.json`
- `apps/web/messages/en/reports.json`
- `apps/web/src/styles/global.css`
- `packages/backend/src/commerce/commerce.repository.integration.test.ts`

Create a missing owned file only when the brief requires it. Stop before
editing any other file.

## Public Offer Boundary

- Define one current public offer key with a customer-safe value such as
  `ziwei-comprehensive`.
- Map that key to `ZIWEI-IDENTITY-P0` only in a `server-only` module used by
  the server action and server presentation adapter.
- Unknown public offer keys fail closed before authentication or API calls.
- The client form, visible markup, callback URL, hash, form state, browser
  error, and customer support path must never contain `ZIWEI-*`.
- Keep the server-internal POST body using the active SKU required by the
  private commerce API.

## Safe Offer Presentation

- Convert the private `PaidTopicSelectionViewV1.offers` into a customer-safe
  presentation before rendering.
- Deduplicate by public offer key and render at most two offers in source
  order.
- Current production data renders exactly the active comprehensive offer.
- Keep the WP-05 delivery promise and price exactly unchanged.
- Do not render the reserved natal excerpt, annual forecast, or any other
  reserved offer.
- Each rendered offer has a stable public anchor using its offer key so login
  can return to the exact selected offer.
- Continue to expose the sample-report link for each active offer.

## Ownership-Aware Selection

- On the topic-selection server page, attempt verified-account resolution
  without forcing anonymous or unverified visitors to sign in.
- For a verified account, load the existing owner-scoped account library and
  derive ownership only for the current chart and active offer.
- Do not accept owner, chart, SKU, entitlement, order, or report identity from
  browser input for this ownership decision.
- If an active entitlement exists:
  - readable report: show `Đọc lại` / `Read again` linking to the authoritative
    `readUrl`;
  - report exists but is processing or terminal: show
    `Xem tiến trình` / `View progress` linking to the locale-correct existing
    report route;
  - no report reference: show an owned state linking to the locale-correct
    report library.
- Never render a purchase submit button for an owned offer.
- If owner-library projection fails for a verified account, fail closed in the
  purchase card with bounded localized unavailable copy and preserve the
  sample-report link. Do not claim the customer is unowned and do not start a
  purchase.
- Anonymous or unverified visitors continue to see the purchase CTA and enter
  the existing verified-account sign-in flow on submit.

## Checkout Action And Intent Continuity

- Change checkout actions to accept the public offer key, never browser SKU.
- Map the key server-side and POST the mapped active SKU to
  `/commerce/orders`.
- Preserve `CHECKOUT_PAYMENTS_PAUSED` inline handling.
- Strictly parse the success projection:
  - paid with report ID: redirect directly to the locale-correct report;
  - otherwise: redirect to the locale-correct existing checkout order.
- If a valid API error envelope returns `ENTITLEMENT_EXISTS`, redirect to the
  locale-correct report library instead of throwing a white generic error.
- Other malformed or unexpected error envelopes remain bounded failures.
- For anonymous, unverified, email verification, and Google sign-in flows,
  preserve the selected public offer intent in the same-site callback URL
  using a public query value and stable offer hash.
- Encode chart IDs and query values. The callback must never contain raw SKU.

## B-9 Order Reuse

- Do not create an order from page render or refresh.
- Add real PostgreSQL integration coverage proving ten consecutive
  `createOrder` calls for the same owner, chart, active offer, and unexpired
  window return the same pending order and persist exactly one commerce order.
- Preserve the immutable invoice number, payment code, amount, and creation
  timestamp across all ten calls.

## Presentation

- Keep the existing quiet topic-selector layout and lacquer/gold/pearl tokens.
- Repeated offers may be individual cards; do not nest cards or add a catalog
  grid beyond two offers.
- Use concise ownership and unavailable states. No raw status codes,
  internal IDs, AI/methodology/confidence/limitation prose, or fear copy.
- Keep buttons and long labels non-overlapping at 375px and desktop widths.
- New letter spacing must be exactly `0`.

## Required Tests

1. Public offer mapping accepts only the current public key and resolves the
   active SKU server-side.
2. Unknown offer key fails before auth/private API.
3. Auth callback preserves chart plus public offer query/hash in VI and EN and
   contains no SKU.
4. Private API receives the mapped active SKU only in its server POST body.
5. Successful paid ownership redirects directly to the existing report;
   pending/generating reuse redirects to the same checkout order.
6. `ENTITLEMENT_EXISTS` compatibility response redirects to report library,
   with no generic white error.
7. Selector renders at most two safe offer presentations, stable anchors,
   final VND price, distinct output copy, and no raw SKU.
8. Owned readable offer renders `Đọc lại` with zero purchase buttons.
9. Owned processing/terminal offer renders progress/library action with zero
   purchase buttons.
10. Verified-account library failure renders bounded unavailable state with
    no purchase button; anonymous/unverified state still presents login-gated
    purchase.
11. Page refresh performs only reads and never order creation.
12. Ten real repository create calls persist and return exactly one unchanged
    pending order.
13. Existing paused-payment and sample-report behavior remains green.

## Focused Checks

```bash
corepack pnpm@11.25.0 --filter @lasoviet/contracts run build
corepack pnpm@11.25.0 --filter @lasoviet/backend run build
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 exec vitest run \
  apps/web/src/features/commerce/checkout-offer.test.ts \
  apps/web/src/features/commerce/create-checkout-order.test.ts \
  apps/web/src/features/commerce/checkout-purchase-form.test.tsx \
  apps/web/src/features/reports/purchase-offer-presentation.test.ts \
  apps/web/src/features/reports/paid-topic-selector.test.tsx \
  apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.test.tsx \
  packages/backend/src/commerce/commerce.repository.integration.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web run build
git diff --check
```

## Return

- Exact changed files.
- Public-offer, ownership, auth-return, and order-reuse behavior.
- Focused check results.
- Blockers or residual risks.
- Confirmation that reserved offer availability, contracts/API/database
  schema, price, entitlement scope, report generation, payment activation,
  Telegram, route registry, auth provider, production, push, merge, and deploy
  remained untouched.
