# Product Ladder And Post-Purchase Experience Progress

## 2026-09-08

- WP-01 completed and Terra-approved in commit `07f3bb0`.
- Founder direction: continue autonomously, but defer any item that is
  explicitly gated by a pending founder decision. Do not invent a default for
  a deferred product decision.
- FD-044 (short Crockford `payment_code`) is deferred pending founder approval.
- FD-045 (payment amount odd-unit surcharge) is deferred pending founder
  approval.
- WP-02 work that directly depends on FD-044 or FD-045 is skipped in this
  cycle:
  - public `payment_code` generation and payment-code display;
  - payment-code extraction and checksum matching;
  - odd-unit amount generation and amount-based fallback matching.
- Deferred WP-02 work must not activate a partial payment flow or change
  `SEPAY_ENV=disabled`.
- Continue only provider-independent, non-gated reliability work. Revisit the
  deferred WP-02 items after the founder records decisions for FD-044 and
  FD-045.
- WP-03 server-side account library and immutable order history completed and
  Terra-approved in commit `40237d9`.
- The WP-03 account-center UI remains deferred to the dedicated UI artifact
  branch.
- WP-04 is deferred because catalog/SKU expansion depends on approved product
  availability and unresolved pricing decisions.
- WP-05 is deferred because display naming depends on FD-042 and its remaining
  work is user-facing UI.
- WP-07 is deferred because it depends on WP-04 and user-facing UI.
- WP-08 and WP-09 are P1 work and remain deferred pending product/credit
  decisions, including FD-041.
- WP-06 Founder terminal-failure alerts are deferred until an out-of-band
  notification channel and destination are approved.
- Continue with the independent WP-06 server slice: report-ready customer
  email, terminal-failure support projection, and payment-isolation tests for
  report retry/recovery.
- WP-06 server slice implemented and pending Terra review:
  - Added `report_ready` notification delivery kind with database migration `0018`.
  - Atomically enqueued pending customer notification upon HTML publication with owner-verified lineage and canonical public origin validation.
  - Extended worker maintenance delivery to process pending and retryable report notifications while preserving auth delivery and lease bounds.
  - Extended terminal-failure report query projection with order invoice, timestamps, and customer support contact fields.
  - Added integration test proving report retry/recovery does not mutate commerce orders or payment events (R-AUTO-22).
  - Preserved deferred scope: founder terminal-failure alerts, user-facing UI, and `SEPAY_ENV=disabled`.
