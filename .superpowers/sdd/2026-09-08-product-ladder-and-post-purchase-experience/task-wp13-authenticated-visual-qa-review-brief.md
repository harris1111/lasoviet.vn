# WP-13 Authenticated Visual QA Terra Review Brief

## Role

- Reviewer: Terra using `cx/gpt-5.6-terra` with `high` reasoning.
- Review independently. Do not edit files, commit, push, merge, deploy, access
  production, activate providers, or trigger external effects.

## Scope

- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp13-visual-qa-20260909`
- Base: `4666bb6c4055171b3e4bbc1f558ebe5dfb827d29`
- Tip: supplied by Sol after the Flash implementation commit.
- Implementation brief:
  `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp13-authenticated-visual-qa-brief.md`
- Existing provider-independent QA commits:
  `7663dcb`, `0656fb9`, and `4666bb6`.

## Binding Sources

- `AGENTS.md`
- FD-056 in
  `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`
- WP-13 in
  `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`
- Existing WP-03 and WP-06 Terra-approved UI behavior and contracts.

## Review Questions

1. Does the fixture remain strictly local, synthetic, repeatable, and
   incapable of targeting a non-loopback/non-WP-13 database?
2. Does it use a real verified Better Auth session and the real private API
   authorization path rather than a UI-only bypass or test route?
3. Are seeded commerce/report rows minimal, schema-valid, owner-consistent,
   and sufficient to exercise every required state without provider calls?
4. Does every screenshot come from a canonical production web route at the
   stated viewport and correspond to the asserted state?
5. Are account overview, grouped report library, and immutable order history
   populated with customer-safe copy and valid actions?
6. Are pending, paid-before-report, expired, failed, and refunded checkout
   states visually distinct, truthful, and free of stale/inappropriate
   actions?
7. Are pending report and terminal report failure visually distinct and does
   terminal failure show every required customer-facing fact without internal
   IDs?
8. Do mobile controls meet both 44px dimensions, focus indicators remain
   visible, and screens avoid horizontal overflow and content overlap?
9. Do browser-visible text, links, metrics, screenshots, and the report omit
   SKU IDs, report/version internals, raw statuses, secrets, provider/model
   detail, and personal data beyond synthetic fixture content?
10. Does the report accurately preserve prior approved evidence, remove only
    resolved blockers, retain physical banking-app return as externally
    blocked, and keep WP-13 pending Harris sign-off?
11. Were only the allowed local containers/processes created and cleaned up,
    with unrelated server services left untouched?
12. Did the implementation stay inside its owned files and avoid application,
    package, migration, route, provider, payment-activation, and production
    changes?

## Required Checks

Run or inspect evidence for:

```bash
corepack pnpm@11.25.0 --filter @lasoviet/database run build
corepack pnpm@11.25.0 --filter @lasoviet/contracts run build
corepack pnpm@11.25.0 --filter @lasoviet/backend run build
corepack pnpm@11.25.0 --filter @lasoviet/api run build
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 --filter @lasoviet/web run build
git diff --check 4666bb6..<tip>
```

Terra may inspect screenshots and metrics directly. Terra must not restart
containers or runtimes unless Sol explicitly supplies a bounded local rerun
instruction.

## Report Format

- Verdict: `APPROVED` or `CHANGES_REQUIRED`.
- Findings first, ordered Critical then Important.
- Each finding cites concrete file/line or screenshot/metric evidence, impact,
  violated requirement, and one bounded correction.
- Optional findings remain separate and do not return to Flash.
- Explicitly list rejected or out-of-scope observations.
- End with focused-check evidence and residual blockers:
  physical banking-app return, Harris sign-off, and Telegram credentials where
  relevant to the broader release but not to this fixture.
