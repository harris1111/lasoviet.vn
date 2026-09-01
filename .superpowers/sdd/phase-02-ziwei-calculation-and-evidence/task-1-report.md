# P02-T01 Report

Date: 2026-09-02

## Delivered

- Added generic `CalculationEngine<Input, Output>` contracts with typed
  engine failures and provenance-bearing results.
- Added `CalculationProvenanceV1Schema` for engine, adapter, schema, rule-set,
  hash, timestamp, limitation, and raw-snapshot audit provenance.
- Added `NormalizedZiweiChartV1Schema` with exactly 12 unique canonical
  palaces; canonical English star, transformation, brightness, branch,
  horoscope capability, warning, body, and soul metadata.
- Added the `@lasoviet/engine-adapters` package skeleton and `ZiweiEngine`
  interface. It depends only on `@lasoviet/contracts`.

## Verification

- Focused RED: expected missing-module failure.
- Contract suite: 2 files, 22 tests passed.
- Contracts and engine-adapters package typechecks passed.
- Root typecheck passed.
- Root build passed.

## Scope Controls

No iztro dependency/import, vendor mapping, calculation behavior, UI, AI,
migration, live service, or external side effect was introduced.

## Docs Impact

Minor: updated the Phase 02 plan and SDD ledger.

## Rule Candidate

None.

## Unresolved Questions

None.
