# LSV-65 atomic lifetime and annual combo

## Approved scope

FD-105 package 2.4: one 1,300 Lá spend creates lifetime and annual-2026 entitlements atomically. Membership uses its approved 20% price (1,040 Lá), without stacking rollover. Already-owned components are rejected before debit because prorated combo terms have not been approved. The content catalog remains reserved until the annual generation acceptance gate passes.

## Authority and fulfillment

The bundle intent has one ledger spend and exactly two child entitlements: `ZIWEI-IDENTITY-P0` with lifetime scope and `ZIWEI-YEAR-2026-P0` with the 2026 period. Owner, chart, chart version, locale, component periods, prices, spend allocations, and both report reservations must agree. Other SKU mismatches fail closed. The lifetime component reuses the shared natal report reservation; the annual component uses the dedicated computed-period writer. Ledger restoration revokes access to both children and restores the spend once. The 1,300/1,040 Lá bundle is ineligible for the under-500 consumer guarantee.

## Release boundary

No activation, merge, deployment, production mutation, or Done transition. PR targets master and depends on the shared natal, period delivery, and membership implementation.
