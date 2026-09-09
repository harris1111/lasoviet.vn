# WP-08 Entitlement Scope And Tier-1 Read Projection

## Executor

Implement only this bounded WP-08 slice. Do not commit, push, merge, deploy,
activate payment, or modify production/external state.

## Owned Files

The implementation may modify only:

- `packages/database/src/schema/commerce.ts`
- `packages/database/drizzle/`
- `packages/contracts/src/commerce.ts`
- `packages/contracts/src/identity-report-v1.ts`
- `packages/contracts/src/index.ts`
- `packages/config/src/product-catalog.ts`
- `config/product-catalog.json`
- `packages/backend/src/commerce/commerce.repository.ts`
- `packages/backend/src/commerce/order.service.ts`
- `packages/backend/src/reports/report-query.repository.ts`
- `packages/backend/src/reports/report-query.service.ts`
- focused tests adjacent to the changed modules
- this WP-08 brief/report only if needed for execution evidence

Do not modify UI, payment provider configuration, upgrade-credit fields, WP-09
pricing/credit behavior, report generation prompts/writers, worker behavior, or
unrelated catalog products.

## Required Behavior

1. Add non-null `scope jsonb` to `commerce_entitlements`, typed as a JSON
   object containing a non-empty list of approved comprehensive report section
   identifiers. Add a migration that backfills every existing entitlement for
   `ZIWEI-IDENTITY-P0` to the complete Tier-2 scope before enforcing non-null.
   Preserve entitlement immutability: no update path may change an existing
   entitlement scope.

2. Define one shared contract-level scope vocabulary:

   - Tier 1: `overview`, `coreAxis`, `strengthsAndTensions`,
     `practicalDirection`
   - Tier 2: Tier 1 plus `keyConfigurations`, `palaceReadings`,
     `thematicSynthesis`

   The vocabulary must be reused by the database type, entitlement creation,
   report projection, and tests. Do not expose SKU identifiers in browser-facing
   data.

3. Existing paid `ZIWEI-IDENTITY-P0` fulfillment must create complete Tier-2
   scope in both payment-confirmation and customer-self-claim entitlement
   insertion paths. The scope must be inserted atomically with entitlement,
   reservation, and generation outbox creation. Do not add a second generation
   call or regenerate reports for scope reads.

4. Activate `ZIWEI-NATAL-EXCERPT-P0` as the only additional selectable offer at
   exactly 19,000 VND, with Tier-1 scope and the same comprehensive report
   generation lineage. Activation is allowed only after the runtime catalog,
   contract, entitlement creation, and report read projection all support the
   offer atomically. It must not activate any other reserved SKU.

5. A comprehensive V3 report is generated once as complete content. The report
   query service must calculate effective scope as the union of all
   non-refunded entitlements for the same owner and chart. It must return:

   - Tier 2: the existing complete public V3 projection.
   - Tier 1 only: `overview`, `coreAxis`, `strengthsAndTensions`, and
     `practicalDirection` content only. It may include a small typed
     `lockedSections` metadata list, but must never include locked titles,
     narratives, palace readings, key configurations, or thematic synthesis
     prose in the serialized response.

   The query path must remain owner-scoped and fail closed on invalid scope,
   invalid lineage, invalid SKU/locale family, or malformed stored content.
   Existing V1/V2 reports remain immutable and readable exactly as before.

6. Keep report generation contract compatibility: both tiers consume the same
   V3 comprehensive stored content and exactly one normal AI generation call.
   Do not add critic/rewrite loops, methodology/disclaimer/confidence UI, new
   vector stores, or fine-tuning.

7. Ensure account/library or other server projections that expose entitlement
   records remain schema-valid after the scope column is added. Do not expose
   internal scope details unless the existing public contract needs the
   typed locked-state metadata.

## Acceptance Tests

Add focused tests proving:

1. Migration/schema contains non-null entitlement scope and complete backfill.
2. Shared scope constants contain exactly the approved Tier-1/Tier-2 IDs.
3. Existing full-price payment confirmation creates Tier-2 scope.
4. Self-claim creates Tier-2 scope.
5. The 19k offer is selectable and creates Tier-1 scope; all other reserved
   offers remain rejected before database access.
6. A Tier-1 report response contains the four unlocked sections and no locked
   prose, titles, palace IDs, or hidden full-content fields.
7. A Tier-2 response contains all 12 palace readings, all four thematic
   synthesis entries, key configurations, and practical direction.
8. Two non-refunded entitlements for one chart union their scopes; a refunded
   entitlement contributes nothing.
9. Upgrade/unlock reads do not create a second report version or generation
   request.
10. Existing legacy V1/V2 report tests remain green.

Use focused tests only. Use existing test helpers and real PostgreSQL
integration where the repository already uses it. Run producer builds before
dependent typechecks.

## Completion Evidence

Return changed file paths, focused test commands and counts, build/typecheck
commands, and any blocker. If an ambiguity or failure exceeds one direct local
correction, stop with `BLOCKED` or `NEEDS_CONTEXT`; do not broaden the task.
