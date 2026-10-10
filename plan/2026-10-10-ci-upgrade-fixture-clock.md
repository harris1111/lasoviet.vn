# Freeze the time-dependent upgrade impression fixture

## Bounded brief

PR382 rerun verification fails after 2026-10-10 00:00 UTC: the contextual unlock browser test expects an upgrade_view from a fixture credit expiring at that exact time, but reads the real browser clock. The application correctly suppresses the expired credit. AGENTS.md requires frozen/injected clocks for time-dependent tests.

Change only `tests/e2e/contextual-unlock.spec.ts`: in the test named `visible ladder impressions preserve actual offers and authoritative upgrade attribution`, install Playwright's browser clock at `2026-10-07T07:00:00Z` before mounting the fixture, matching the existing neighboring time-dependent test. Keep every analytics and deduplication assertion unchanged. This does not change UI, runtime analytics, credit expiry, financial policy or production clocks.

Record the unmodified October 10 failure, verify the corrected browser test on the current host date, and replay the contextual unlock browser file. Required pre-push checks, independent review and fresh CI precede merge. Reconcile this dedicated CI prerequisite into PR382/383 without changing their runtime source or actual trial/ledger evidence. No provider calls, customer mail or SePay activation.

## Local verification and independent review

- Current host date: 2026-10-10 UTC. After building producer packages, the unchanged test failed at `upgrade_view`: expected 1, received 0. The first local attempt had missing build exports and is not the clock reproduction.
- Corrected complete `contextual-unlock.spec.ts`: 31/31 passed. Independent named browser replay: 1/1 passed.
- `pnpm i18n:check`, `pnpm lint` and `pnpm typecheck`: passed; lint retains four existing warnings, zero errors. `git diff --check`: passed.
- Independent reviewer: working GO. The clock is installed before mount and before the fixture credit expiry; every existing assertion is unchanged. Fresh exact-head CI is still required before merge.
- No runtime source, authority journal/ledger, production configuration, provider request, customer send or payment activation changed.
