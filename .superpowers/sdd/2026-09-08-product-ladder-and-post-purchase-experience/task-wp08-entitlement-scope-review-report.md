# WP-08 Entitlement Scope Review Report

## Scope

- Initial implementation: `462fafc..539b036`
- Atomic activation correction: `539b036..0625e15`
- Cross-locale correction: `0625e15..7cd741c`
- Final reviewed range: `462fafc..7cd741c`

## Findings And Corrections

Terra found two Important issues in the initial implementation:

1. The comprehensive web reader assumed Tier-2 fields existed and failed web
   typecheck for a Tier-1 response.
2. The 19k offer was active in the catalog without matching topic-selection
   contract, public offer mapping, or customer presentation support.

The first correction added a narrowed Tier-1 reader, two-offer contract and
presentation support, same-report upgrade reuse, chart-wide transaction
serialization, English 19k rejection, and focused migration backfill evidence.

Terra then found one Important cross-locale issue: an English Tier-2 checkout
could reuse a Vietnamese V3 Tier-1 report. The final correction rejects that
cross-locale upgrade before order creation and requires locale equality in all
report-reuse queries.

## Final Verification

- Focused WP-08 suite: 16 files, 209 tests passed.
- Final correction subset: 7 files, 107 tests passed.
- Contracts, config, database, and backend builds and typechecks passed.
- API typecheck passed.
- Web typecheck and production build passed.
- `git diff --check 462fafc..7cd741c` passed.

## Verdict

Terra high returned `APPROVED` with no remaining Critical or Important
findings.

WP-08 is complete. Telegram activation and external smoke remain separately
deferred until the founder supplies `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_CHAT_ID`.
