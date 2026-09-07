# Flash Report: Zi Wei Localized Result Data and Deterministic Value Summary

Date: 2026-09-07
Branch: fix/ziwei-result-and-report-clarity
Task: Task 1 - Localized result data and deterministic value summary

## Objective
Implement Task 1 of the approved Zi Wei Phase 04 clarity milestone:
- Extend `ZiweiChartViewV1` with a strict minimal `birthSummary` projected from `NormalizedBirthProfileV1` joined via `birthProfileRevisions.id === ziweiCharts.profileRevisionId`.
- Require and project `interpretationBoundCodes` on every free-preview evidence reference.
- Add comprehensive localized presentation functions in `ziweiPresentation` for evidence bounds, brightness, transformations, gender, calendar kind, and time precision, ensuring unknown values use localized generic fallback text without exposing raw IDs.
- Create `ZiweiResultSummary` component presenting birth date/calendar, time, timezone, gender, Life Palace branch/stars, Body Palace placement, and Four Transformations.
- Replace raw interpretation-bound rendering in free preview, evidence drawer, and report reader with code-based localized presentation.
- Replace generic free-preview body text with chart-specific deterministic summaries while retaining evidence buttons.
- Add compact lacquer/gold responsive styles without redesigning the page.

## Files Changed
- `packages/contracts/src/ziwei-view-v1.ts`: Added `ZiweiBirthSummaryV1Schema` and `ZiweiBirthSummaryV1` type; added required `birthSummary` to `ZiweiChartViewV1` and `ZiweiChartViewV1Schema`.
- `packages/contracts/src/free-identity-preview-v1.ts`: Added `interpretationBoundCodes` to `evidenceReferenceSchema` in `FreeIdentityPreviewV1Schema`.
- `packages/contracts/src/index.ts`: Exported `ZiweiBirthSummaryV1Schema` and `ZiweiBirthSummaryV1`.
- `packages/contracts/src/free-identity-preview-v1.test.ts`: Added contract tests verifying `ZiweiChartViewV1Schema` requires `birthSummary` and `FreeIdentityPreviewV1Schema` preserves `interpretationBoundCodes`.
- `packages/backend/src/reports/free-identity-preview.ts`: Projected `interpretationBoundCodes` from evidence items into evidence references.
- `packages/backend/src/ziwei/ziwei-query.repository.ts`: Joined `birthProfileRevisions` on `birthProfileRevisions.id === ziweiCharts.profileRevisionId` to select `originalInput` and `normalizedInput`.
- `packages/backend/src/ziwei/ziwei-query.service.ts`: Parsed `NormalizedBirthProfileV1` and built minimal `birthSummary` (`normalizedCalendar`, `normalizedTime`, `timezoneProvenance`, optional `gender`) for `chartView`.
- `packages/backend/src/ziwei/ziwei-query.service.test.ts`: Added tests verifying `birthSummary` is projected strictly without leaking consent or coordinates, and `interpretationBoundCodes` is returned in free preview.
- `apps/web/src/features/ziwei/ziwei-presentation.ts`: Added localized mappings for `interpretationBound`, `brightness`, `transformation`, `gender`, `calendarKind`, and `timePrecision` with localized generic fallbacks for unknown values.
- `apps/web/src/features/ziwei/ziwei-presentation.test.ts`: Added tests for all new localization functions in VI and EN.
- `apps/web/src/features/ziwei/ziwei-result-summary.tsx`: Created responsive summary component presenting birth input details, Life Palace, Body Palace, and Four Transformations.
- `apps/web/src/features/ziwei/ziwei-result-summary.test.tsx`: Created unit tests verifying localized presentation in VI and EN without exposing raw IDs or private data.
- `apps/web/src/features/reports/free-identity-preview.tsx`: Replaced generic English body text with chart-specific deterministic summaries for Life, Body, and Transformations; replaced raw interpretation bounds with code-based localized presentation.
- `apps/web/src/features/evidence/evidence-drawer.tsx`: Replaced raw interpretation bounds rendering with code-based localized presentation.
- `apps/web/src/features/reports/report-reader.tsx`: Replaced raw interpretation bounds rendering in popover and side rail with code-based localized presentation.
- `apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`: Embedded `ZiweiResultSummary` and passed `chart` to `FreeIdentityPreview`.
- `apps/web/messages/vi/ziwei.json`: Added `summary` translations in Vietnamese.
- `apps/web/messages/en/ziwei.json`: Added `summary` translations in English.
- `apps/web/src/styles/global.css`: Added compact lacquer/gold styles and responsive mobile styles for `.ziwei-result-summary`, `.result-summary-card`, `.transformation-tag`, and insight summaries.

## RED Phase Evidence
1. `packages/contracts/src/free-identity-preview-v1.test.ts`:
   - `requires birthSummary in ZiweiChartViewV1Schema`: failed with `expected true to be false` because `birthSummary` was not yet in schema.
   - `requires interpretationBoundCodes on every evidence reference`: failed with missing property on evidence reference.
2. `packages/backend/src/ziwei/ziwei-query.service.test.ts`:
   - `returns only a strict chart, minimal birth summary, and three evidence IDs`: failed because `birthSummary` was missing from query result.
   - `returns the deterministic preview`: failed because `interpretationBoundCodes` was missing from preview evidence references.
3. `apps/web/src/features/ziwei/ziwei-presentation.test.ts`:
   - `TypeError: en.interpretationBound is not a function`
   - `TypeError: en.brightness is not a function`
   - `TypeError: en.transformation is not a function`
   - `TypeError: en.gender is not a function`
4. `apps/web/src/features/ziwei/ziwei-result-summary.test.tsx`:
   - `Cannot find module './ziwei-result-summary'`

## GREEN Phase Evidence
- `pnpm vitest run packages/contracts/src/free-identity-preview-v1.test.ts`: 4 passed (4).
- `pnpm vitest run packages/backend/src/reports/free-identity-preview.test.ts`: 4 passed (4).
- `pnpm vitest run packages/backend/src/ziwei/ziwei-query.service.test.ts`: 7 passed (7).
- `apps/web/src/features/ziwei/ziwei-presentation.test.ts`: 5 passed (5).
- `apps/web/src/features/ziwei/ziwei-result-summary.test.tsx`: 2 passed (2).
- `apps/web/src/features/ziwei/load-ziwei-chart.test.ts`: 3 passed (3).
- `apps/web/src/features/reports/load-free-identity-preview.test.ts`: 3 passed (3).
- Combined focused tests run: 7 test files, 28 tests passed (0 failed).

## Verification Checks
- Contracts build & typecheck: clean (`tsc -p tsconfig.json`, `tsc -p tsconfig.json --noEmit`).
- Backend build & typecheck: clean (`tsc -p tsconfig.json`, `tsc -p tsconfig.typecheck.json --noEmit`).
- Web typecheck: clean (`tsc -p tsconfig.typecheck.json --noEmit`).
- Web production build: clean (`next build` succeeded, all static/dynamic routes compiled).
- i18n parity check: passed (`node scripts/check-i18n-parity.mjs`).
- `git diff --check`: clean (0 whitespace/formatting errors).

## Privacy Notes
- `birthSummary` strictly projects only `normalizedCalendar`, `normalizedTime`, `timezoneProvenance`, and optional original-input `gender`.
- Excluded fields: consent version, user ID, anonymous actor ID, whole original input, coordinates (latitude/longitude), and unrelated profile revisions.
- Repository query performs an exact immutable join: `birthProfileRevisions.id === ziweiCharts.profileRevisionId`, preventing latest-mutable revision drift.
- `ZiweiResultSummary` only renders derived human-friendly strings; never renders coordinates or consent information.

## Unresolved Questions / Remaining Concerns
None. Task 1 is completely implemented, tested, and verified.