# Terra Review: Production AI Activation

## Scope

- Range: `d830e52cdc47ec67da8067432699419e49e4c6ff..eb59a5ce71e3844904dd680c7ffb80108563a452`
- Files: 6 changed, 301 added / 12 removed
- Scout: manual dependency and boundary trace; no subagents, no endpoint request.

## SPEC Verdict: PASS

The default worker derives approval only from a valid enabled AI group,
`AI_PRODUCTION_ENABLED=true`, and JSON Schema capability
([worker.module.ts:103](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/apps/worker/src/worker.module.ts:103),
[worker.module.ts:108](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/apps/worker/src/worker.module.ts:108)).
It constructs the existing OpenAI-compatible adapter from normalized
environment values with no hardcoded endpoint, model, or key
([worker.module.ts:137](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/apps/worker/src/worker.module.ts:137)).
Queue-disabled and activation-disabled paths remain no-ops. The injected
gate/provider seam remains available, and no report state, idempotency, or
SePay path changed.

## QUALITY Verdict: NEEDS CORRECTION

### Critical

None.

### Important

- [packages/config/src/load-environment.ts:41](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/packages/config/src/load-environment.ts:41)
  makes `AI_PRODUCTION_ENABLED` mandatory whenever the previously complete AI
  group is present. That is an intentional fail-closed contract change, but
  the tracked deployment template contains no AI section
  ([.env.example:19](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/.env.example:19))
  and the architecture environment inventory ends at the former seven fields
  ([2026-08-31-lasoviet-platform-architecture-design.md:610](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md:610)).
  A deployment retaining a valid legacy AI group will now fail all
  `loadEnvironment` consumers, including worker bootstrap
  ([main.ts:13](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/apps/worker/src/main.ts:13)),
  until its external environment gains the new value. Add a non-secret
  `AI_PRODUCTION_ENABLED=false` migration/template entry and update the
  environment inventory before deployment.

### Minor

- [apps/worker/src/worker.module.test.ts:139](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/apps/worker/src/worker.module.test.ts:139)
  claims to verify default OpenAI adapter wiring, but only asserts that a
  runner object exists ([worker.module.test.ts:151](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/apps/worker/src/worker.module.test.ts:151)).
  It would pass if the default provider regressed to a no-op. Add a focused
  factory spy or a single seeded-job test that observes the adapter request;
  no external call is needed.

## Verification

- Focused Vitest: 66/66 passed.
- `@lasoviet/config` build: passed.
- `@lasoviet/worker` typecheck: passed.
- `git diff --check`: passed.
- Default runtime adapter use is verified by source inspection; external
  capability testing was intentionally not repeated.

## Status Contract

**Status:** DONE_WITH_CONCERNS
**Summary:** Spec behavior is correct and fail-closed. Resolve the versioned
environment migration gap before deployment; strengthen the default-adapter
assertion when practical.
**Concerns/Blockers:** Important migration issue above.

## Scoped Terra High Re-review (2026-09-06)

**Verdict: ADDRESSED**

The correction documents the complete optional AI group and the fail-closed
legacy migration value at [.env.example:31](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/.env.example:31)
through [.env.example:41](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/.env.example:41).
This covers the field that makes a former seven-variable AI environment
partial ([load-environment.ts:33](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/packages/config/src/load-environment.ts:33),
[load-environment.ts:197](G:/Dev/Repos-Windows/tuvi-a-lam/lasoviet-admin-operations-plan/packages/config/src/load-environment.ts:197)).
The correction diff adds only `api.example.com` and explicit replacement
placeholders; no real provider endpoint, model, key, or secret was added.

The deferred default-adapter test-strength concern remains Minor; no new
Important or Critical issue is in this scope.

## Status Contract

**Status:** DONE
**Summary:** Important environment migration/template finding is addressed.
**Concerns/Blockers:** None in scope.
