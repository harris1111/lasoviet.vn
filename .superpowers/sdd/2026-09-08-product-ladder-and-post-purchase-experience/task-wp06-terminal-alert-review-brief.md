# WP-06 Report Terminal-Failure Alert Terra Review Brief

## Role

- Reviewer: Terra using `cx/gpt-5.6-terra` with `high` reasoning.
- Review independently. Do not edit files, commit, push, merge, deploy, access
  production, add credentials, or trigger external effects.

## Scope

- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp06-report-recovery-ui-20260909`
- Base: `3fcc408`
- Tip: `d266e98`
- Review range: `3fcc408..d266e98`
- Implementation brief:
  `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp06-terminal-alert-brief.md`

## Binding Sources

- `AGENTS.md`
- FD-043 and FD-047 in
  `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`
- R-AUTO-21 in
  `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
- Existing Terra-approved WP-06 report terminal-state implementation
- Existing Terra-approved WP-02B durable alert delivery and lease-fencing
  implementation

## Review Questions

1. Does every successful report terminal transition atomically enqueue exactly
   one durable `report_terminal_failure` alert?
2. Can an alert insert failure, reservation conflict, or lease loss commit a
   silent terminal state or dangling alert?
3. Is the idempotency identity stable and collision-safe for the immutable
   terminal failure?
4. Is the payload bounded and free of customer PII, birth/chart/report content,
   prompts, provider payloads, model output, and credentials?
5. Does immediate dispatch occur only after a successful terminal transaction,
   outside database transactions, on all real terminal paths?
6. Does immediate dispatch failure preserve the committed terminal state and
   leave a maintenance-retryable delivery?
7. Does the existing maintenance loop deliver the alert within the approved
   15-minute window when Telegram is configured?
8. Are claim limits, `SKIP LOCKED`, lease-token fencing, retry state, and stale
   claimant protection preserved for all alert kinds?
9. Do unconfigured Telegram credentials leave durable pending work without
   fake success or external calls?
10. Are existing commerce orders/payment events, report retry policy, payment
    activation, customer UI, and deployment boundaries unchanged?

## Required Checks

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
git diff --check 3fcc408..d266e98
```

## Report Format

- Verdict: `APPROVED` or `CHANGES_REQUIRED`.
- Findings first, ordered Critical then Important.
- Each finding must cite concrete file/line evidence, impact, violated
  requirement, and bounded correction.
- List optional findings separately; optional items do not return to Flash in
  this milestone.
- Explicitly list rejected or out-of-scope observations.
- End with focused check evidence and residual risks.
