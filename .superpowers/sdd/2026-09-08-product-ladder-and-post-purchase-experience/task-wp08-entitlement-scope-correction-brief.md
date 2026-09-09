# WP-08 Correction: Atomic Tier Activation And Reader Support

## Confirmed Findings

Terra found two Important issues in `462fafc..539b036`:

1. The web package does not typecheck because the comprehensive reader assumes
   Tier-2 fields exist on the new Tier-1/Tier-2 content union.
2. Activating the 19k offer is not atomic: the topic-selection contract still
   permits exactly one 79k offer, and the server-only public offer map and
   presentation layer omit the 19k offer.

The live audit also confirms the same WP-08 invariant must be enforced in the
payment paths: buying Tier 2 after Tier 1 must add scope without creating a
second report reservation, report version, or generation outbox event.

## Executor

Implement only this correction. Do not commit, push, merge, deploy, change
provider configuration, activate real payment, or implement WP-09 credit
pricing.

## Owned Files

- `packages/contracts/src/free-identity-preview-v1.ts`
- focused contract tests
- `packages/backend/src/ziwei/ziwei-query.service.ts`
- focused Zi Wei query tests
- `packages/backend/src/commerce/commerce.repository.ts`
- focused commerce repository integration tests
- `apps/web/src/features/commerce/checkout-offer.ts`
- `apps/web/src/features/commerce/checkout-offer.test.ts`
- `apps/web/src/features/reports/purchase-offer-presentation.ts`
- `apps/web/src/features/reports/purchase-offer-presentation.test.ts`
- `apps/web/src/features/reports/paid-topic-selector.tsx`
- focused paid-topic selector/page tests
- `apps/web/src/features/reports/comprehensive-report-reader.tsx`
- focused report reader/page tests
- `packages/database/src/schema/commerce-migration-layout.test.ts`
- files from the original WP-08 owned set only when an immediate correction
  requires them

## Required Corrections

1. Change the paid topic-selection contract from exactly one hard-coded 79k
   offer to exactly the two active offers:

   - `ZIWEI-NATAL-EXCERPT-P0`, 19,000 VND, Tier-1 sections.
   - `ZIWEI-IDENTITY-P0`, 79,000 VND, Tier-2 sections.

   Keep the array bounded to at most two and reject all other reserved SKUs.
   The selection request must accept only these two active SKUs.

2. Add a customer-safe server-only public key for the 19k offer. Keep all
   browser fields, URLs, forms, callbacks, and rendered HTML free of
   `ZIWEI-*`. Add concise Vietnamese/English display content that accurately
   distinguishes the four-section core reading from the complete 12-palace
   report. Do not add unsupported forecasting claims.

3. The Vietnamese selector must render both active offers. English new orders
   remain on report V2, so do not offer or accept the Vietnamese V3 19k excerpt
   for an English checkout. Preserve the 79k English path.

4. Make the comprehensive reader narrow the content union before reading
   Tier-2 fields. A Tier-1 response renders only overview, core axis, strengths
   and tensions, and practical direction. Its TOC and section numbering must
   contain only rendered sections. It must not reference, reconstruct, or
   render locked titles, narratives, palace IDs, key configurations, or
   thematic synthesis. Tier 2 remains unchanged with seven groups.

5. Prevent regeneration on Tier-1-to-Tier-2 unlock in both payment paths:

   - When the chart already has an owner-valid, non-refunded entitlement with
     a report reservation, a newly paid entitlement for the other active SKU
     reuses that existing report identity.
   - Insert the new entitlement atomically, but do not create another report
     reservation or `report.generation.requested.v1` outbox event.
   - `readOrderProjection` and customer self-claim success must return the
     existing chart report ID for the new Tier-2 order.
   - The report query's scope union then unlocks the complete content on that
     existing report.
   - Do not mutate the earlier entitlement, report reservation, report version,
     or stored structured content.

   A Tier-1 purchase after an existing Tier-2 entitlement must be rejected or
   represented as already owned before a new order is created. Enforce this in
   the live database repository path, not only the standalone order service.

6. Add a focused migration-layout assertion that the migration updates old
   `ZIWEI-IDENTITY-P0` rows to Tier-2 scope before `SET NOT NULL`. Do not build
   a broad migration harness for this correction.

## Required Checks

Add focused tests proving:

1. Topic selection returns exactly two valid offers in canonical order and
   rejects reserved/arbitrary SKUs.
2. The 19k public offer key resolves server-side and no rendered/UI serialized
   output leaks a technical SKU.
3. Vietnamese renders both offers; English renders only the 79k offer and
   cannot submit 19k checkout.
4. Tier-1 reader rendering has four sections and no locked content; Tier-2
   still has all seven groups.
5. Paying Tier 1 then Tier 2 creates two entitlement rows but exactly one
   reservation and one generation outbox event, and the Tier-2 order
   projection points to the existing report.
6. The equivalent self-claim upgrade path also creates no second generation
   request and returns the existing report ID.
7. Creating Tier 1 after owned Tier 2 creates no order.
8. Migration layout proves backfill ordering.

Run in dependency order:

- contracts build/typecheck and focused tests
- config/database/backend build/typecheck and focused tests
- API typecheck if affected
- web typecheck, focused tests, and production build
- `git diff --check`

Return changed paths and exact results. One direct correction is permitted only
for an immediate failure caused by this patch; otherwise stop with evidence.
