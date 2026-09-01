# Phase 03 Non-Visual Slice 3 Report

## Status

DONE

## Delivered

- Added strict `ZiweiChartViewV1` and `ZiweiEvidenceViewV1` contracts.
- Ensured successful Zi Wei calculations persist identity evidence before returning success.
- Added actor-authorized latest-version chart and selected-evidence queries.
- Added private chart/evidence API endpoints using verified bearer-token actors.
- Added server-only web loaders with strict response validation and typed public errors.

## Changed Files

- `packages/contracts/src/ziwei-view-v1.ts`
- `packages/contracts/src/index.ts`
- `packages/backend/src/ziwei/ziwei.service.ts`
- `packages/backend/src/ziwei/ziwei.service.test.ts`
- `packages/backend/src/ziwei/ziwei-query.repository.ts`
- `packages/backend/src/ziwei/ziwei-query.service.ts`
- `packages/backend/src/ziwei/ziwei-query.service.test.ts`
- `packages/backend/src/index.ts`
- `apps/api/src/ziwei/ziwei.controller.ts`
- `apps/api/src/ziwei/ziwei.controller.test.ts`
- `apps/api/src/api.module.ts`
- `apps/web/src/features/ziwei/load-ziwei-chart.ts`
- `apps/web/src/features/ziwei/load-ziwei-chart.test.ts`

## RED/GREEN Evidence

- RED: focused suite failed because evidence persistence was not invoked, query service and loader modules were absent, and the new private endpoints returned 404.
- GREEN: `pnpm vitest run packages/backend/src/ziwei/ziwei.service.test.ts packages/backend/src/ziwei/ziwei-query.service.test.ts apps/api/src/ziwei/ziwei.controller.test.ts apps/web/src/features/ziwei/load-ziwei-chart.test.ts` passed: 4 files, 17 tests.
- Typechecks/build passed:
  - `pnpm --filter @lasoviet/contracts typecheck`
  - `pnpm --filter @lasoviet/backend typecheck`
  - `pnpm --filter @lasoviet/backend build`
  - `pnpm --filter @lasoviet/api typecheck`
  - `pnpm --filter @lasoviet/web typecheck`
- The contracts package build was regenerated once because the backend build consumes generated workspace declarations that predated the new exports.

## Self-Review

- Chart authorization joins chart ownership through profile ownership and preserves anonymous/profile expiry and deletion checks.
- Cross-owner and missing charts both map to `CHART_NOT_FOUND`; owned missing evidence maps to `EVIDENCE_NOT_FOUND`.
- The repository selects the newest chart version before resolving its exact P0 evidence set, so it cannot fall back to an older version.
- Stored chart and evidence payloads are strict-schema parsed. Query data failures use `ZIWEI_QUERY_DATA_INVALID`.
- No chart JSON, evidence text, birth data, or owner identifiers are logged.

## Docs Impact

None. This slice is implementation-only; the required task report is this file.

## Rule Candidate

Any durable calculation success response must be gated on persistence of the evidence set required by its consuming query contract.

## Unresolved Questions

None.

## Fix Round 1 Evidence (2026-09-02)

- Aligned the Zi Wei loader's strict `AppError` parser with the shared envelope:
  safe code, nonempty message key, retryable, optional nonempty field, and
  optional primitive-valued details.
- Preserved strict rejection of unmodeled response fields and provider text.
- Added chart and evidence error-envelope tests with `field` and `details`;
  both map to their typed domain results.
- Repaired the extra-data projection test with an otherwise valid normalized
  chart fixture, making `leakedEvidence` the only invalid field.
- RED: the two optional-metadata loader tests failed with
  `PRIVATE_API_RESPONSE_INVALID`.
- GREEN: the four focused files passed, 17 tests total:
  `pnpm vitest run packages/backend/src/ziwei/ziwei.service.test.ts packages/backend/src/ziwei/ziwei-query.service.test.ts apps/api/src/ziwei/ziwei.controller.test.ts apps/web/src/features/ziwei/load-ziwei-chart.test.ts`.
- Passed `@lasoviet/contracts`, `@lasoviet/backend`, `@lasoviet/api`, and
  `@lasoviet/web` typechecks plus `@lasoviet/backend` build.
