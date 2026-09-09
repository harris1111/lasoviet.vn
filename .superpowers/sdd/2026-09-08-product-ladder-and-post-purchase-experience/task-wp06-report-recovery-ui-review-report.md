# WP-06 Report And Payment Recovery UI Terra Review Report

## Review Scope

- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp06-report-recovery-ui-20260909`
- Base: `1baf26c8b082db8542567034cf30721ea4bf36ff`
- Reviewed tip: `f90345a`
- Reviewed range:
  `1baf26c8b082db8542567034cf30721ea4bf36ff..f90345a`

## Verdict

`APPROVED`

## Findings

No Critical or Important findings.

## Verified Behavior

- Checkout renders distinct customer-facing states for pending payment,
  payment received before report assignment, expired, failed, and refunded.
- Pending payment preserves VietQR instructions, warns against a duplicate
  transfer, and exposes self-claim only while the authoritative order remains
  pending.
- Terminal checkout states suppress stale QR instructions and self-claim and
  expose only the approved locale-correct recovery paths.
- Report terminal failure renders the payment confirmation, customer-facing
  invoice number, both required Ho Chi Minh timestamps, support reference,
  next step, and encoded support email without internal report identifiers.
- Polling remains limited to pending orders and paid orders awaiting a report
  ID. Report navigation is guarded against duplicate client redirects.
- The reviewed range stays within the bounded UI file allowlist and does not
  change contracts, API, backend, database, payment activation, Telegram, or
  route registry.

## Focused Checks

Passed:

- `@lasoviet/contracts` build.
- `@lasoviet/web` typecheck.
- Five focused Vitest files: 63 tests.
- `@lasoviet/web` production build.
- `git diff --check 1baf26c..f90345a`.

## Optional Observations

- English component-message coverage can be expanded later; production locale
  resolution is correctly delegated to `next-intl`.
- Browser screenshot evidence at 375px remains part of the later WP-13
  cross-cutting visual QA milestone and does not block this UI slice.

## Rejected Or Out Of Scope

- Rebuilding the already approved report notification and retry server paths
  is not required.
- Telegram activation and external smoke remain deferred until credentials are
  supplied.

Open questions: none.
