# WP-06 Report Terminal-Failure Alert Correction Brief

## Role And Scope

- Executor: Flash Executor using `ag/gemini-3.8-flash-high` with `high`
  reasoning.
- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp06-report-recovery-ui-20260909`
- Base implementation commit: `d266e98`.
- Correct only the one Terra-adjudicated Important finding below.
- Do not broaden the alert design, change delivery semantics, add migrations or
  credentials, or touch production/external state.
- Do not commit, push, merge, deploy, access production, or send a real
  Telegram request.

## Owned Files

- `packages/backend/src/reports/report.service.ts`
- `tests/jobs/report-generation.integration.test.ts`

Stop before editing any other file.

## Required Correction

The terminal alert insert currently uses `.onConflictDoNothing()`. A globally
unique idempotency-key collision with an existing malformed or wrong-kind row
can therefore allow the report job and reservation to commit
`terminal_failure` without creating the required valid
`report_terminal_failure` delivery.

- Remove conflict suppression from this exact alert insert.
- A duplicate/colliding key must throw and roll back the entire transaction.
- Preserve the deterministic immutable idempotency key.
- Do not weaken job lease fencing, reservation state/version fencing, outbox
  enqueue, or commerce isolation.

## Required Test

Extend the existing terminal-alert integration coverage:

1. Seed a fresh generating reservation and valid leased report job.
2. Compute its exact future terminal-alert idempotency key.
3. Pre-seed `commerce_alert_deliveries` with that key and a wrong kind or
   malformed payload.
4. Call the real `recordTerminalFailure`.
5. Assert it rejects/throws rather than returning success.
6. Assert the job remains leased and not terminal.
7. Assert the reservation remains generating with its prior state version and
   error state.
8. Assert the pre-seeded collision row is unchanged and no second alert exists.
9. Assert no commerce order or payment event changes.

## Focused Checks

```bash
corepack pnpm@11.25.0 --filter @lasoviet/backend run build
corepack pnpm@11.25.0 exec vitest run \
  tests/jobs/report-generation.integration.test.ts
git diff --check
```

## Return

- Exact changed files.
- Correction behavior.
- Focused check results.
- Blockers or residual risks.
- Confirmation that credentials, real Telegram delivery, payment activation,
  production, push, merge, and deploy remained untouched.
