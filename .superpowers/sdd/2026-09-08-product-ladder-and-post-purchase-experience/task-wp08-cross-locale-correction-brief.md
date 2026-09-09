# WP-08 Correction: Cross-Locale Upgrade Boundary

## Confirmed Important Finding

After a Vietnamese Tier-1 purchase, an English Tier-2 checkout can currently
reuse the Vietnamese V3 reservation. This violates the binding rule that
English new orders remain on V2. Generating a separate English V2 report would
also violate WP-08's no-regeneration unlock rule.

## Required Correction

Fail closed on this cross-locale upgrade:

1. In the live database repository `createOrder` path, when a chart already
   has a non-refunded entitlement and report reservation in a different locale,
   reject creation of the other active SKU order before inserting a row.
2. Keep same-locale Vietnamese Tier-1-to-Tier-2 unlock behavior unchanged:
   two entitlements, one report reservation, one generation request.
3. Existing English 79k purchase with no prior entitlement remains V2.
4. The English selector must not offer checkout when the chart has an active
   Vietnamese Tier-1 entitlement. Represent it using the existing unavailable
   state; do not expose SKU or internal locale mechanics.
5. Defense in depth: the report-reuse queries in both payment paths must require
   the existing reservation locale to equal the newly paid order locale. Never
   silently reuse a cross-locale reservation.

## Owned Files

- `packages/backend/src/commerce/commerce.repository.ts`
- focused commerce integration tests
- `apps/web/src/features/reports/purchase-offer-presentation.ts`
- focused presentation/selector/page tests
- files from the prior correction only if an immediate type/test/test repair
  requires them

## Required Tests

1. Vietnamese Tier 1 then English Tier 2 order creation is rejected before a
   new order row, entitlement, reservation, or outbox event is created.
2. English 79k with no prior entitlement still creates a V2 reservation.
3. Vietnamese Tier 1 then Vietnamese Tier 2 still reuses one V3 report.
4. Re English selector shows no purchase form for full offer when the chart has
   an active Vietnamese Tier-1 entitlement.
5. Direct payment-path reuse queries cannot reuse a reservation with a
   different locale.

Run all correction-focused backend/API/web tests, build and typecheck affected
packages, run the web production build, and run `git diff --check`.

Do not commit, push, merge, deploy, activate payment, or trigger external side
effects. Return changed paths and exact verification results.
