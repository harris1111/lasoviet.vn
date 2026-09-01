# Phase 03 Non-Visual Slice 2 Report

Date: 2026-09-02
Status: DONE

## Delivered

- Added `ZiweiEligibilityV1`: eligible values carry a `0..11` time index;
  ineligible values preserve `TIME_UNKNOWN` or
  `TIME_RANGE_MULTIPLE_BRANCHES`.
- BirthProfile create, read, and update now return authoritative eligibility
  derived by `resolveZiweiTimeIndex()`.
- Added server-only current-actor resolution. It reads Better Auth
  authoritatively, creates an anonymous session only when needed, and checks
  the matching live anonymous actor/session database row before returning an
  internal actor.
- Added the server-only BirthProfile submission orchestrator and thin server
  action. It validates explicit consent and `BirthProfileV1`, records privacy
  consent, then persists the profile through `privateApiClient()`.
- Kept the work non-visual: no page, component, TSX, locale-message, CSS,
  navigation, route-registry, Playwright, or visual-test files changed.

## Changed Files

- `apps/web/package.json`
- `apps/web/src/auth/auth.ts`
- `apps/web/src/auth/resolve-current-actor.ts`
- `apps/web/src/auth/resolve-current-actor.test.ts`
- `apps/web/src/features/birth-profile/birth-profile-actions.ts`
- `apps/web/src/features/birth-profile/save-birth-profile.ts`
- `apps/web/src/features/birth-profile/save-birth-profile.test.ts`
- `packages/backend/src/birth-profile/birth-profile.service.ts`
- `packages/backend/src/birth-profile/birth-profile.service.test.ts`
- `packages/contracts/src/birth-profile-v1.ts`
- `packages/contracts/src/index.ts`
- `pnpm-lock.yaml`

## RED/GREEN Evidence

- RED: the initial focused run failed because the actor resolver and
  submission orchestrator did not exist, and BirthProfile responses lacked
  `ziweiEligibility`.
- RED: the JSON content-type expectation failed before the POST requests set
  `content-type: application/json`.
- GREEN:

```text
pnpm vitest run packages/backend/src/birth-profile/birth-profile.service.test.ts apps/web/src/auth/resolve-current-actor.test.ts apps/web/src/features/birth-profile/save-birth-profile.test.ts
3 passed, 22 passed
```

- Typechecks:

```text
pnpm --filter @lasoviet/contracts typecheck
pnpm --filter @lasoviet/backend typecheck
pnpm --filter @lasoviet/web typecheck
all passed
```

## Self-Review

- Consent is rejected before actor resolution, and a failed consent result
  prevents the profile POST.
- Owner IDs and expiry never come from submission input; they come only from
  Better Auth and the live anonymous actor/session row.
- Anonymous sign-in uses its returned session token to look up the matching
  live session row. Existing anonymous sessions are matched by session ID.
- The private API receives JSON payloads with a server-generated request ID
  and internal actor token.

## Docs Impact

None. This is an internal server contract slice; the required task report is
the only documentation artifact.

## Rule Candidate

None.

## Unresolved Questions

None.

DONE

## Fix Round 1 - 2026-09-02

Status: DONE

### Fixed

- Read eligibility now parses the stored normalized revision with
  `NormalizedBirthProfileV1Schema`; it no longer renormalizes mutable source
  input.
- Backend and web use the shared `ZiweiEligibilityV1` contract. The web
  action validates the response fields at runtime and explicitly projects only
  `profileId`, `revisionId`, `ziweiEligibility`, and anonymous `expiresAt`.
- `INVALID_TIMEZONE` and `INVALID_CALENDAR_INPUT` now return
  `VALIDATION_FAILED`; `ANONYMOUS_EXPIRED` remains distinct; only explicit
  ownership/auth codes return `PROFILE_FORBIDDEN`. Typed operational private
  API errors still throw.
- Anonymous actor resolution now requires both anonymous actor expiry and
  Better Auth session-row expiry to be in the future.
- Added backend/web typecheck configs that resolve the workspace contracts
  source, matching the existing config-package pattern and preventing stale
  ignored declarations from masking shared contract changes.

### RED/GREEN Evidence

- RED:
  - Stored normalized exact time lost to `originalInput.time = unknown`.
  - An expired anonymous session row still resolved an actor.
  - Backend fields crossed the action boundary.
  - `INVALID_TIMEZONE` returned `PROFILE_FORBIDDEN`.
- GREEN:

```text
pnpm vitest run packages/backend/src/birth-profile/birth-profile.service.test.ts apps/web/src/auth/resolve-current-actor.test.ts apps/web/src/features/birth-profile/save-birth-profile.test.ts
3 passed, 25 passed

pnpm --filter @lasoviet/contracts typecheck
pnpm --filter @lasoviet/backend typecheck
pnpm --filter @lasoviet/web typecheck
all passed
```

### Docs Impact

None beyond this required task report update.

### Unresolved Questions

None.

## Fix Round 2 - 2026-09-02

Status: DONE

### Fixed

- The profile failure response now validates the complete backend `AppError`
  envelope: safe uppercase code, `messageKey`, `retryable`, and optional
  `field` and primitive `details`. The action consumes only the validated
  code and rejects unmodeled provider fields.
- Anonymous live-row checks now capture the clock immediately before the
  lookup. That one timestamp drives both database filtering and post-query
  actor/session expiry validation.

### RED/GREEN Evidence

- RED:
  - A real backend `INVALID_TIMEZONE` error envelope was rejected as
    `PRIVATE_API_RESPONSE_INVALID`.
  - A session that expired after `getSession()` but before lookup still
    resolved as anonymous.
- GREEN:

```text
pnpm vitest run packages/backend/src/birth-profile/birth-profile.service.test.ts apps/web/src/auth/resolve-current-actor.test.ts apps/web/src/features/birth-profile/save-birth-profile.test.ts
3 passed, 26 passed

pnpm --filter @lasoviet/contracts typecheck
pnpm --filter @lasoviet/backend typecheck
pnpm --filter @lasoviet/web typecheck
all passed
```

### Docs Impact

None beyond this required task report update.

### Unresolved Questions

None.
