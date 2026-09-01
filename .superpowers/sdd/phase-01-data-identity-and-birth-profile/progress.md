# SDD ledger — plan: docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/phase-01-data-identity-and-birth-profile.md

## Preflight — 2026-09-01

| Scope | Producer / consumer check | Result |
|---|---|---|
| P01-T01 self | Drizzle schema, reviewed migrations, outbox, ownership, expiry, and convergence tests agree. | Clean; production schema push remains prohibited. |
| P01-T02 self | Better Auth, anonymous linking, internal actor tokens, SMTP adapter, and auth E2E requirements agree. | Clean; browser cannot supply trusted identity or SMTP material. |
| P01-T03 self | Consent, immediate revocation, 30-day account purge, 24-hour anonymous purge, and manual deletion agree. | Clean; purge effects require audit/outbox evidence. |
| P01-T04 self | Original input, immutable normalized revisions, time precision, timezone, and ownership requirements agree. | Clean; no silent birth-time default. |
| P01-T01 -> P01-T02 | T01 produces auth/session/business tables consumed by Better Auth and identity linking. | Sequential dependency is explicit. |
| P01-T01 -> P01-T03 | T01 produces privacy, expiry, audit, and outbox storage consumed by deletion policies. | Sequential dependency is explicit. |
| P01-T01 -> P01-T04 | T01 produces birth-profile ownership and revision tables consumed by normalization. | Sequential dependency is explicit. |
| P01-T02 -> P01-T03 | T02 produces `CurrentActor` and account linking consumed by retention/deletion policy. | Linking must transfer ownership without duplication before account retention applies. |
| P01-T02 -> P01-T04 | T02 produces server-resolved actors consumed by profile commands. | Browser owner identifiers remain ignored. |
| P01-T03 -> P01-T04 | Anonymous expiry and consent policy constrain profile persistence. | P01-T04 must persist expiry/provenance consistently. |

Preflight note: `SMTP_USE_SSL=1` with port 587 may represent STARTTLS rather than implicit TLS. Before P01-T02 implementation, Terra must review direct provider/protocol evidence; Luna must not guess or expose credentials.

No plan/spec conflict blocks P01-T01.

## P01-T01 Implementation — 2026-09-01

| Gate | Result |
|---|---|
| Focused RED | Passed expected RED before the database package existed. |
| Build-policy remediation | Terra-approved exact version-qualified `allowBuilds` entries installed successfully. |
| Drizzle migration generation | Generated and inspected one migration covering 11 tables across five production schema modules. |
| Testcontainers acceptance | Passed 1 file and 2 tests, including repeat migration convergence and schema-integrity assertions. |
| Package typecheck | Passed. |
| Package build | Passed. |

Implementation is complete pending the exact scoped commit
`feat: add PostgreSQL schema and migration runner`.

## P01-T03 Implementation — 2026-09-01

| Gate | Result |
|---|---|
| Focused RED | Passed expected RED before the consent and privacy modules existed. |
| Policy integration | Consent version validation, immediate session revocation, 30-day recovery, cancellation, opaque purge orchestration, anonymous expiry, and immediate anonymous deletion are covered by database-backed flows. |
| Actor boundary | The in-memory Fastify flow confirms account deletion resolves the account from the verified internal actor token and rejects anonymous actors before execution. |
| Focused verification | Privacy/API flow passed 4 files and 9 tests; migration acceptance passed 1 file and 3 tests. |
| Repository verification | Passed 20 files and 92 tests; root typecheck, root build, and i18n parity passed. |

No external side effect occurred. No new durable rule is warranted because the
existing actor-authority and privacy-retention rules cover the implementation.

## P01-T04 Implementation — 2026-09-01

| Gate | Result |
|---|---|
| Focused RED | Passed expected RED before the canonical contract and service modules existed. |
| Precision fixtures | Nine fixtures cover exact minute, traditional branch, single/multi-branch ranges, unknown time, offset, IANA zone, historical DST, solar, and lunar input. |
| Persistence and actor boundary | Database-backed create/read/update/archive uses only the resolved internal actor, appends revisions, preserves anonymous expiry, and rejects browser-supplied owner identifiers. |
| Focused verification | Birth-profile service, persistence, and private HTTP tests passed 3 files and 13 tests; migration acceptance passed 1 file and 3 tests. |
| Typecheck | Root workspace typecheck passed. |

No external side effect occurred. No new durable rule is warranted because the
existing actor-authority, retention, and no-false-precision rules cover the
implementation.

## Phase Exit Verification — 2026-09-01

| Gate | Exact command | Result |
|---|---|---|
| Headless core smoke | `pnpm vitest run packages/backend/src/notifications apps/api/src/auth apps/api/src/privacy packages/backend/src/privacy tests/privacy packages/backend/src/birth-profile tests/birth-profile apps/api/src/birth-profile` | Passed: 12 files, 33 tests. |
| Migration acceptance | `pnpm --filter @lasoviet/database migrate:test` | Passed: 1 file, 3 tests. |
| Root tests | `pnpm test` | Passed: 23 files, 105 tests. |
| Root typecheck | `pnpm typecheck` | Passed. |
| Root build | `pnpm build` | Passed. |
| I18n parity | `pnpm i18n:check` | Passed. |
| Live SMTP | `node --env-file=.env.local --input-type=module -e ...` using `packages/backend/dist/notifications/smtp-email-adapter.js` | One authorized strict-STARTTLS send passed; provider message ID `<13e55cd6-c231-8595-6b55-8ba559115788@0err.com>`. |
| Live Google OAuth | Not run. | Credentials unavailable; no external Google action performed. |

No browser/Playwright UI result is recorded. The non-visual artifact deferral
remains binding. No new durable rule is warranted.

## Phase 01 Correction Wave — 2026-09-01

| Finding group | Fresh evidence | Result |
|---|---|---|
| M-06, M-07 | `pnpm --filter @lasoviet/database migrate:test` | Passed: 1 file, 4 tests; owner/expiry and nullable-owner consent uniqueness reject direct invalid inserts. |
| M-01, M-02 | `pnpm exec vitest run --pool=forks --maxWorkers=1 --no-file-parallelism ...` | Passed within the 12-file, 39-test focused suite; live session/deletion-state actor resolution and lazy process singleton are covered. |
| M-03, M-04, M-05, M-10, M-12 | Same focused command | Coordinated anonymous deletion, expired-link rejection, bounded runner, exact cancellation cutoff, non-delivery response handling, and bounded retries passed. |
| M-08, M-09, M-11 | Same focused command | Owner-qualified mutations, concurrent immutable revision allocation, and inverted-range rejection passed. |
| Root verification | `pnpm typecheck`; `pnpm build`; `pnpm test`; `pnpm i18n:check` | Passed: root tests 25 files, 114 tests; typecheck, build, and i18n parity passed. |

Google OAuth was not called because credentials are unavailable. Browser or
Playwright UI verification is not claimed; FD-024 continues to defer it.

## Phase 01 Correction Pass 2 — 2026-09-01

| Gate | Exact command | Result |
|---|---|---|
| Scoped lifecycle regressions | `pnpm exec vitest run --pool=forks --maxWorkers=1 --no-file-parallelism apps/api/src/auth/internal-actor-live.integration.test.ts packages/backend/src/maintenance/phase-one-maintenance.test.ts tests/privacy/account-deletion.integration.test.ts packages/database/src/schema/schema.integration.test.ts` | Passed: 4 files, 14 tests. |
| Migration acceptance | `pnpm --filter @lasoviet/database migrate:test` | Passed: 1 file, 5 tests. |
| Root typecheck | `pnpm typecheck` | Passed. |
| Root build | `pnpm build` | Passed. |

The pass closes anonymous session binding, bounded non-overlapping maintenance,
conflict-safe consent reuse, no-profile linking, and post-link anonymous
identity/session cleanup. No durable rule is warranted. Google and browser/UI
limitations remain unchanged.
