# SDD ledger — plan: docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/phase-02-ziwei-calculation-and-evidence.md

## Preflight — 2026-09-01

| Scope | Producer / consumer check | Result |
|---|---|---|
| P02-T01 self | Generic engine contract, normalized Zi Wei schema, stable IDs, provenance, warnings, and normalization failures agree. | Clean; vendor-localized canonical IDs are forbidden. |
| P02-T02 self | Iztro `default`, eligibility, immutable runs, hashes, raw snapshots, and idempotency agree. | Clean; unknown or multi-branch time creates no run. |
| P02-T03 self | Versioned fixtures, trusted sources, review status, independent validation, and mismatch policy agree. | Clean; Mingyu Zi Wei cannot count as independent of iztro. |
| P02-T04 self | Capability registry and deterministic evidence require normalized fact linkage, limitations, risk tags, and immutable versions. | Clean; unsupported rules create no evidence version. |
| P02-T01 -> P02-T02 | T01 produces adapter and normalized contracts consumed by Iztro implementation. | Sequential dependency is explicit. |
| P02-T01 -> P02-T03 | Fixture expectations consume normalized schemas and stable IDs. | Fixture changes cannot weaken normalization. |
| P02-T01 -> P02-T04 | Evidence consumes normalized facts and stable identity keys. | Every evidence item must resolve to T01 facts. |
| P02-T02 -> P02-T03 | Fixture runner exercises the real adapter configuration and provenance. | Fixture suite must pin exact engine/config versions. |
| P02-T02 -> P02-T04 | Evidence versions link to immutable chart versions. | No evidence may be created from partial/failed runs. |
| P02-T03 -> P02-T04 | Trusted fixture evidence validates deterministic rules before public use. | Unexplained mismatches remain blocking. |

No plan/spec conflict blocks P02-T01.

## P02-T01 Implementation — 2026-09-01

| Gate | Exact command | Result |
|---|---|---|
| Focused RED | `pnpm exec vitest run packages/contracts/src/normalized-ziwei-chart-v1.test.ts` | Expected failure: normalized chart module absent. |
| Contract tests | `pnpm exec vitest run packages/contracts` | Passed: 2 files, 22 tests. |
| Package typechecks | `pnpm --filter @lasoviet/contracts typecheck`; `pnpm --filter @lasoviet/engine-adapters typecheck` | Passed. |
| Root typecheck | `pnpm typecheck` | Passed. |
| Root build | `pnpm build` | Passed. |

T01 provides generic engine contracts, calculation provenance, normalized
Zi Wei v1 contracts, and a dependency-free adapter interface. No vendor
dependency/import, calculation implementation, UI, AI behavior, or external
side effect occurred. No durable rule is warranted.
