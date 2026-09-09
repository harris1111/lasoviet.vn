# WP-07 Purchase Selection And Ownership Flow Terra Review Report

## Review Scope

- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp07-purchase-flow-20260909`
- Base: `a8bcbbfec0cd8aa22da2e95d4e765087e6fce6c0`
- Reviewed tip: `0361a40`
- Reviewed range:
  `a8bcbbfec0cd8aa22da2e95d4e765087e6fce6c0..0361a40`

## Verdict

`APPROVED`

## Findings

No Critical or Important findings.

## Verified Behavior

- Browser-visible offer identity is a public key; SKU mapping is server-only
  and fails closed before authentication/private API calls.
- Reserved offers remain filtered and unpurchasable. Active offer presentation
  is capped at two, keeps the approved VND price and WP-05 promise, and keeps
  sample-report links.
- Verified ownership is derived from the server-resolved account and
  owner-scoped library. Readable, processing, owned-unknown, and unavailable
  states do not expose a purchase submit button.
- `ENTITLEMENT_EXISTS` has a report-library exit. Paid readable orders redirect
  to the report; pending/generating reuse remains on the existing checkout.
- Sign-in intent preserves locale, chart, public offer key, and anchor without
  an open redirect or SKU leakage.
- Ten real PostgreSQL order-creation calls reuse one pending order and preserve
  invoice, payment code, amount, and timestamp.

## Focused Checks

Passed:

- contracts build;
- backend build;
- web typecheck;
- seven focused Vitest files, 64 tests;
- web production build;
- `git diff --check`.

## Optional Observations

- Add browser screenshot evidence at 375px in WP-13.
- Expand the two-offer test when a second offer becomes active.

Open questions: none.
