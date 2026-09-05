# Phase 00 Milestone Fix Wave Report

**Date:** 2026-09-01
**Scope:** Three Important findings from the Phase 00 milestone review.
**Worktree:** `G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet.vn/.worktrees/phases-00-03-foundation`
**Base:** `2008a3b feat: establish public experience contracts`

## RED Evidence

- `corepack pnpm@11.25.0 vitest run tests/i18n/runtime-routing.test.ts tests/health/health-contract.test.ts tests/content/public-content-contract.test.ts`
- Expected RED observed:
  - `[locale]/layout` module was absent.
  - `config/public-content.json` was absent.
  - `createTcpConnectionProbe` was not exported.

## GREEN Evidence

- Focused runtime, health, and content regressions passed: `3` files, `7` tests.
- `corepack pnpm@11.25.0 content:check` passed: `Validated 52 public content records for 26 public routes.`
- `corepack pnpm@11.25.0 i18n:check` passed: `i18n parity passed`.

## Root Gate Blocker

- Command: `corepack pnpm@11.25.0 check`
- Lint passed.
- Workspace typecheck stopped with:
  - `apps/web/.next/types/validator.ts(53,39): error TS2307: Cannot find module ...`
  - `apps/web/.next/types/validator.ts(84,39): error TS2307: Cannot find module ...`
- The command exited with status `2` before the root test and build stages completed.
- This is an unexpected web typecheck failure. No diagnostic rerun or workaround was attempted.

## Changed Files

- `apps/api/src/health/health.controller.ts`
- `apps/web/next.config.ts`
- `apps/web/src/app/[locale]/layout.tsx`
- `apps/web/src/app/[locale]/page.tsx`
- `apps/web/src/app/layout.tsx` (removed)
- `apps/web/src/app/page.tsx` (removed)
- `config/public-content.json`
- `scripts/check-public-content.mjs`
- `tests/content/public-content-contract.test.ts`
- `tests/health/health-contract.test.ts`
- `tests/i18n/runtime-routing.test.ts`

## Safety and Scope

- No `.env`, `.env.*`, or `.env.local` files were read.
- No push, PR, merge, amend, or external action was performed.
- No files were staged.
- No commit was created because the required root gate did not complete.

## Docs and Rule Impact

- Phase evidence was not updated because the required root gate is blocked.
- No repository rule change was made.

## Commit

None. Required commit `fix: complete Phase 00 runtime acceptance` was not created.

## Open Questions

- Terra disposition is required for the unresolved generated Next route-validator typecheck failure.

## Recovery and Final Gates

Sol authorized regeneration of stale generated Next artifacts without source
changes. The following gates then passed:

- `corepack pnpm@11.25.0 --filter @lasoviet/web build`
- `corepack pnpm@11.25.0 --filter @lasoviet/web typecheck`
- `corepack pnpm@11.25.0 check`

The regenerated web build exposed `/[locale]`, `/health/live`, and
`/health/ready`. The fresh root check passed lint, workspace typechecks, `10`
test files with `69` tests, and all workspace builds.

The prior open question is resolved by the authorized generated-artifact
recovery. No `.next` or `dist` output was edited or staged.

## Final Commit

Required exact commit: `fix: complete Phase 00 runtime acceptance`.
