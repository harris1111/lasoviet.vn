# WP-06 Report Terminal-Failure Alert Brief

## Role And Boundary

- Executor: Flash Executor using `ag/gemini-3.8-flash-high` with `high`
  reasoning.
- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp06-report-recovery-ui-20260909`
- Base: Terra-approved WP-06 UI commit
  `f90345a`.
- Implement only the provider-independent R-AUTO-21 report
  terminal-failure alert path using the existing durable Telegram alert
  delivery infrastructure.
- Telegram activation and external smoke remain deferred until the founder
  supplies `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- Do not add or expose credentials, change environment defaults, activate
  payments, alter report retry policy, change customer UI, or add a migration
  unless live schema evidence proves one is strictly required.
- Do not commit, push, merge, deploy, access production, or trigger external
  effects.

## Binding Sources

- `AGENTS.md`
- FD-043 and FD-047 in
  `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`
- R-AUTO-21 in
  `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
- Existing Terra-approved WP-06 report terminal-state workflow
- Existing Terra-approved WP-02B durable `commerce_alert_deliveries`,
  lease-fencing, Telegram provider, and maintenance workflow

## Owned Files

- `packages/backend/src/reports/report.service.ts`
- `packages/backend/src/commerce/telegram-alert.ts`
- `packages/backend/src/commerce/telegram-alert.test.ts`
- `packages/backend/src/commerce/reconciliation-operations.ts`
- `packages/backend/src/commerce/reconciliation-operations.test.ts`
- `apps/worker/src/processors/report-generate.processor.ts`
- `apps/worker/src/processors/report-generate.processor.test.ts`
- `apps/worker/src/worker.module.ts`
- `apps/worker/src/worker.module.test.ts`
- `tests/jobs/report-generation.integration.test.ts`

Stop before editing any other file. If an owned test file does not exist,
create it only when required by the focused behavior.

## Durable Alert Creation

- When `createReportService(...).recordTerminalFailure(...)` successfully
  fences the leased job and transitions the matching reservation to
  `terminal_failure`, enqueue exactly one durable alert in
  `commerce_alert_deliveries` in the same database transaction.
- Use alert kind `report_terminal_failure`.
- Use an idempotency key derived only from immutable failure identity so a
  replay cannot create a duplicate alert.
- The bounded payload may contain:
  - `reportVersionId`;
  - `failureStage`;
  - bounded `errorCode`;
  - ISO `failedAt`;
  - the alert idempotency key.
- Do not include customer email, name, birth data, chart content, report
  content, provider payload, model response, prompt, or credentials.
- If the terminal transition fails or rolls back, no alert row may commit.
- Alert enqueue failure must roll back the terminal transition rather than
  leaving a silent terminal state.

## Delivery

- Extend the existing Telegram provider with one bounded
  `sendReportTerminalFailureAlert` operation.
- Message copy must be concise operational Vietnamese/ASCII text and include
  the report version reference, failure stage, bounded error code, failure
  time, and idempotency key. Do not include personal data.
- Extend the existing leased delivery dispatcher to recognize
  `report_terminal_failure` while preserving:
  - claim limits;
  - send outside database transactions;
  - lease-token fencing;
  - retryable failures;
  - idempotency.
- After a successful terminal transition, the report worker should attempt
  dispatch immediately after the transaction commits.
- Dispatch failure or unconfigured Telegram must not undo or misreport the
  already committed report terminal state. The durable row remains eligible
  for the existing maintenance fallback.
- Existing maintenance runs every 15 minutes and must include pending report
  terminal alerts in its normal `dispatchPendingAlerts()` pass.
- Do not perform a real Telegram request in tests or local checks.

## Required Tests

1. A real terminal-failure transition atomically creates one pending
   `report_terminal_failure` delivery with the bounded payload.
2. Replaying the same immutable failure identity creates no duplicate alert.
3. A lease/state conflict commits neither a terminal transition nor an alert.
4. Telegram formatting includes only approved operational fields and uses the
   existing timeout/error mapping.
5. The dispatcher claims, sends, and marks report terminal alerts with lease
   fencing; stale claimants cannot overwrite a later claim.
6. Unconfigured Telegram leaves the durable row pending and does not claim
   success.
7. The report processor requests immediate post-commit dispatch for every
   successful terminal path and does not dispatch after a failed transition.
8. Immediate dispatch failure does not change the committed report terminal
   result; maintenance can retry the pending delivery.
9. Existing stale-payment and circuit-open alerts remain green.
10. No commerce order/payment mutation is introduced.

## Focused Checks

```bash
corepack pnpm@11.25.0 --filter @lasoviet/database run build
corepack pnpm@11.25.0 --filter @lasoviet/backend run build
corepack pnpm@11.25.0 --filter @lasoviet/worker run typecheck
corepack pnpm@11.25.0 exec vitest run \
  packages/backend/src/commerce/telegram-alert.test.ts \
  packages/backend/src/commerce/reconciliation-operations.test.ts \
  apps/worker/src/processors/report-generate.processor.test.ts \
  apps/worker/src/worker.module.test.ts \
  tests/jobs/report-generation.integration.test.ts
git diff --check
```

## Return

- Exact changed files.
- Atomic enqueue and delivery behavior.
- Focused check results.
- Blockers or residual risks.
- Explicit confirmation that no credentials were added, no real Telegram
  request was sent, and payment activation, customer UI, production, push,
  merge, and deploy remained untouched.
