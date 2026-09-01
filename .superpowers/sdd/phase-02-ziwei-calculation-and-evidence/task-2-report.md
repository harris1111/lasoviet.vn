# P02-T02 Report: Reproducible Zi Wei Calculation

Date: 2026-09-02

## Delivered

- Pinned `iztro` exactly to `2.6.0` in `@lasoviet/engine-adapters`.
- Passed the first-use gate: registry metadata, packed archive integrity,
  package/license evidence, resolved runtime tree, and CycloneDX SBOM.
- Implemented `IztroAdapter` with explicit `algorithm: "default"`, canonical
  palace/star/transformation/brightness IDs, provenance, warnings, and
  private raw snapshot output.
- Added immutable calculation runs, charts, and chart versions with a
  revision-scoped exact idempotency key.
- Added owner-authorized revision calculation service and private API command.
- Rejected unknown and multi-branch time before run persistence.

## Dependency Evidence

- `iztro@2.6.0` integrity:
  `sha512-0zN7j+z2UX642yEbraFNILRU+hA5hl1SdTHvyopq0CK68hS1wSxL2zLkStCh6EeEwR+NO0j18amDmpB6bwortg==`.
- Resolved runtime packages: `iztro`, `dayjs`, `i18next`,
  `@babel/runtime`, `lunar-lite`, and `lunar-typescript`; each has MIT
  evidence. No unknown, GPL, AGPL, or incompatible runtime license found.
- SBOM: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/sbom/iztro-2.6.0.cdx.json`.

## Verification

- Focused core flow: 4 files, 7 tests passed.
- Database migration acceptance: 1 file, 5 tests passed.
- Root typecheck: 9 workspace projects passed.
- Root build: 9 workspace projects passed.

## Boundaries

- Only `packages/engine-adapters` imports `iztro`.
- No true-solar-time, native location, or native timezone correction is
  claimed.
- No UI, AI, public school selector, live vendor call, or external side effect
  was added.
- T02 deliberately does not start the P02-T03 comprehensive fixture suite.

Docs impact: minor.

Rule candidate: none.

AGENTS.md action: none.

Open questions: none.
