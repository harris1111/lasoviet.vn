# Flash Report: Production AI Activation Wiring

Date: 2026-09-06
Branch: feat/production-ai-activation
Base: d830e52cdc47ec67da8067432699419e49e4c6ff

## Objective
Implement bounded production AI activation wiring with strict TDD. Add `AI_PRODUCTION_ENABLED` control, validate JSON schema requirement on activation, derive runtime gate in worker, and wire `createOpenAiCompatibleAdapter` while preserving no-op fallback, test overrides, and secret redaction.

## Files Changed
- `packages/config/src/environment-schema.ts`: Added `productionEnabled: boolean` to `AiEnvironment` and `AiEnvironmentSchema`; added `superRefine` rule failing against `AI_FEATURE_JSON_SCHEMA` when `productionEnabled` true but `featureJsonSchema` false.
- `packages/config/src/load-environment.ts`: Added `AI_PRODUCTION_ENABLED` to `AI_VARIABLES`, `NORMALIZED_FIELD_VARIABLES`, and `loadAi` boolean parsing.
- `packages/config/src/environment-schema.test.ts`: Added test cases for `AI_PRODUCTION_ENABLED` validation, partial group fail-close, normalization, and mutual requirement with `AI_FEATURE_JSON_SCHEMA`.
- `apps/worker/src/worker.module.ts`: Derived production gate from validated AI config in `createReportGenerateRunner`; wired `createOpenAiCompatibleAdapter`; preserved no-op runner when queue absent or AI inactive; preserved injected `gate` and `provider` test overrides; fails closed with `WORKER_CONFIG_INVALID` on invalid config or missing database.
- `apps/worker/src/worker.module.test.ts`: Created focused unit test suite verifying queue gating, disabled AI no-op, false flag no-op, denied gate no-op, invalid schema fail-closed, missing database fail-closed, error redaction, and approved initialization.

## RED Phase Evidence
- `pnpm vitest run packages/config/src/environment-schema.test.ts`: 6 failed tests (unrecognized `AI_PRODUCTION_ENABLED`, missing partial check, unrecognized key in Zod schema, missing invalid schema rejection).
- `pnpm vitest run apps/worker/src/worker.module.test.ts`: 3 failed tests (runner did not throw `WORKER_CONFIG_INVALID` on invalid AI schema or missing database URL, error redaction check failed).

## GREEN Phase Evidence
- `pnpm vitest run packages/config/src/environment-schema.test.ts`: 57 passed (57).
- `pnpm vitest run apps/worker/src/worker.module.test.ts`: 9 passed (9).
- `pnpm vitest run apps/worker`: 3 files, 25 passed (25).
- `pnpm vitest run packages/config`: 3 files, 68 passed (68).

## Verification Checks
- `@lasoviet/config` build & typecheck: clean.
- `@lasoviet/backend` build & typecheck: clean.
- `@lasoviet/worker` typecheck: clean.
- `git diff --check`: clean (0 whitespace/syntax issues).
- Zero secrets or config values exposed in errors.

## Unresolved Questions
None.

## Correction Note (2026-09-06)
- Addressed Terra milestone review finding regarding environment migration template gap.
- Added commented optional AI configuration block to `.env.example` documenting all 8 required AI group variables (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT`, `AI_MAX_RETRIES`, `AI_FEATURE_JSON_SCHEMA`, `AI_FEATURE_TOOL_CALLING`, and `AI_PRODUCTION_ENABLED=false` fail-closed default).
- Documented that production report generation requires changing `AI_PRODUCTION_ENABLED` to true only after provider capability approval.
- Verified zero real endpoints, models, keys, or secrets committed; SePay disabled configuration unchanged.
- Verified `git diff --check` passed cleanly.

## CI Correction: Disabled AI No-Op Startup (2026-09-06)
- Root cause: `createReportGenerateRunner` previously invoked `loadEnvironment(process.env)` before establishing whether any AI variables were configured. In environments where no AI configuration is supplied and `SEPAY_ENV` is absent (such as no-op worker integration tests), `loadEnvironment` threw `WORKER_CONFIG_INVALID` instead of returning the historical default `{ processed: 0 }` no-op runner.
- Required invariant: When none of the eight AI group variables (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT`, `AI_MAX_RETRIES`, `AI_FEATURE_JSON_SCHEMA`, `AI_FEATURE_TOOL_CALLING`, `AI_PRODUCTION_ENABLED`) are present in `process.env`, short-circuit to the no-op runner prior to `loadEnvironment()`. If any AI variable is present, continue through `loadEnvironment()` and fail closed on invalid or partial configuration. Queue and injected gate denial short-circuits remain preserved.
- RED evidence:
  - Integration: `corepack pnpm@11.25.0 vitest run tests/jobs/report-generation.integration.test.ts -t "pending default runtime returns zero without claiming a job or calling a provider"` failed with `Error: WORKER_CONFIG_INVALID` at `apps/worker/src/worker.module.ts:105`.
  - Unit: `corepack pnpm@11.25.0 vitest run apps/worker/src/worker.module.test.ts` failed on test `returns no-op runner when queue is present and AI variables are omitted even if SEPAY_ENV is missing` with `Error: WORKER_CONFIG_INVALID`.
- GREEN evidence:
  - Integration: `corepack pnpm@11.25.0 vitest run tests/jobs/report-generation.integration.test.ts -t "pending default runtime returns zero without claiming a job or calling a provider"` passed (1 passed, 24 skipped).
  - Unit: `corepack pnpm@11.25.0 vitest run apps/worker/src/worker.module.test.ts` passed (10 passed).
  - Config: `corepack pnpm@11.25.0 vitest run packages/config/src/environment-schema.test.ts` passed (57 passed).
  - Typecheck: `corepack pnpm@11.25.0 --filter @lasoviet/worker run typecheck` passed clean.
  - Diff check: `git diff --check` passed clean with zero whitespace or syntax errors.
