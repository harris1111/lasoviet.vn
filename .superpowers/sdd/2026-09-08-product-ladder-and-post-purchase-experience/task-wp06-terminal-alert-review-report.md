# WP-06 Report Terminal-Failure Alert Terra Review Report

## Review Scope

- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp06-report-recovery-ui-20260909`
- Base: `3fcc408`
- Reviewed tip: `d266e98`
- Reviewed range: `3fcc408..d266e98`

## Verdict

`CHANGES_REQUIRED`

## Must-Fix Finding

### Important: An idempotency collision can commit a silent terminal failure

The terminal alert insert used `.onConflictDoNothing()` and then returned
success. If the globally unique idempotency key was already occupied by a
wrong-kind or malformed row, the report job and reservation could commit
`terminal_failure` without a valid `report_terminal_failure` delivery.

Remove conflict suppression so a collision rolls back the full transaction.
Add real PostgreSQL integration coverage that pre-seeds the exact key and
proves the job, reservation, outbox, alert, order, and payment state remain
unchanged.

## Verified Behavior

- The normal path atomically enqueues the terminal alert with the report
  terminal transition.
- Alert payload is bounded and excludes customer personal, birth, chart,
  report-content, prompt, model-output, provider-payload, and credential data.
- Immediate dispatch runs after the terminal transaction and delivery remains
  maintenance-retryable when Telegram is unavailable.
- Existing claim limits, `SKIP LOCKED`, lease-token fencing, stale-claimant
  protection, and payment isolation remain intact.

## Focused Checks

Passed:

- `@lasoviet/database` build.
- `@lasoviet/backend` build.
- `@lasoviet/worker` typecheck.
- Five focused Vitest files: 70 tests.
- `git diff --check 3fcc408..d266e98`.

## Explicit Deferral

Telegram activation and real external smoke remain deferred until the founder
supplies `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

Open questions: none.
