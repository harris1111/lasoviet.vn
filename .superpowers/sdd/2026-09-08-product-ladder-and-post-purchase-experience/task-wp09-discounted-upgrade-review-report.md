# WP-09 Discounted Upgrade Review Report

## Scope

- Implementation commit: `189a673`
- Reviewed range: `7ecbe5e..189a673`

## Verified Behavior

- Upgrade credit uses the actual paid Tier-1 amount for the same owner, chart,
  and locale.
- Refunded Tier-1 orders do not grant credit.
- Credit is valid only while `now < paid_at + 7 days`; the exact deadline is
  expired.
- Discounted pending orders expire at the credit deadline and late webhook or
  self-claim paths cannot grant the entitlement at the stale price.
- Payment instructions use the earlier of normal order TTL and credit expiry.
- Tier-2 payment adds its entitlement while reusing the existing report and
  generation event.
- The Vietnamese selector displays list price, applied credit, net price,
  exact Vietnam-local deadline, newly unlocked sections, and the mandatory
  seven-day Tier-1 disclosure.
- Browser-visible presentation omits technical SKU and source-order IDs.

## Verification

- 154 focused WP-09 tests passed.
- 66 webhook, loader, and checkout compatibility tests passed.
- Contracts, config, database, and backend builds and typechecks passed.
- API and web typechecks passed.
- Web production build passed.
- `git diff --check 7ecbe5e..189a673` passed.

## Verdict

Terra high returned `APPROVED` with no Critical, Important, deferred, or
rejected findings.

WP-09 is complete.
