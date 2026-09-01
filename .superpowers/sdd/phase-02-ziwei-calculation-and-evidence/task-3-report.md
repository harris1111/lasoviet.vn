# P02-T03 Report

Completion date: 2026-09-02

## Delivered

- Added versioned manifest v1 with 11 approved P0 Zi Wei fixtures.
- Reused Phase 01 solar, lunar, IANA timezone, historical timezone,
  branch-only, and unknown-time inputs where applicable.
- Added real-adapter fixture evaluation, source/review/difference records, and
  a read-only Tianji reference runner boundary.
- Fixed iztro late-Zi input mapping: exact `23:00-23:59` sends vendor
  `timeIndex: 12`; early Zi remains index `0`.
- Preserved `dayDivide: "current"`. The fixture no longer invents a chart
  difference when the vendor returns equivalent normalized facts.

## Fixture Coverage

| Class | Fixtures | Result |
|---|---:|---|
| Solar/lunar input | 2 | Passed |
| Leap lunar month | 1 | Passed |
| Solar-term boundary | 1 | Passed |
| Early/late Zi | 2 | Passed |
| Branch boundary | 1 | Passed |
| Timezone and historical timezone | 2 | Passed |
| Unknown-time rejection | 1 | Passed |
| Branch-only precision | 1 | Passed |

All 11 manifest fixtures passed. Eligible records produced 12 unique canonical
palaces with pinned iztro provenance. Unknown time returned
`ZIWEI_TIME_INELIGIBLE` before adapter calculation.

## Cross-Check

Read-only Tianji comparison used only the common lunar/hour/life-palace facts
for lunar `1988-01-15`, early Zi. Tianji returned Tiger and normalized iztro
returned `ziwei.branch.tiger`.

Tianji is not comparable for late-Zi split, timezone handling, solar-term
selection, leap-month conversion, true solar time, or full star placement.
Mingyu Zi Wei was not used because it is not independent validation. No
unexplained mismatch remains.

## Verification

- RED: `corepack pnpm@11.25.0 exec vitest run tests/calculation/ziwei-p0-fixtures.test.ts`
  failed before the late-Zi correction.
- Focused: `corepack pnpm@11.25.0 exec vitest run tests/calculation/ziwei-p0-fixtures.test.ts packages/engine-adapters/src/ziwei/iztro-adapter.test.ts`
  passed: 2 files, 2 tests.
- Root typecheck and build passed.

Docs impact: minor.
Rule candidate: none.
AGENTS.md action: none.

Open questions: none.
