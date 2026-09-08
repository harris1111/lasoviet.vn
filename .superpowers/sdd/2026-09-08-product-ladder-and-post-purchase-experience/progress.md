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
- WP-06 Terra correction pass completed and scoped re-review approved:
  - Report publication now requires an explicit validated public HTTPS origin and recipient fingerprint secret.
  - Terminal-failure projection now requires one unambiguous set of paid-order and support fields.
  - R-AUTO-22 now snapshots commerce and payment rows around the real invalid-output recovery command.
- WP-06 server slice is complete in commits `b7613f5` and `3809a7d`.
- WP-11 is deferred because its remaining work is user-facing UI owned by the
  dedicated UI artifact branch.
- WP-12 is deferred pending its founder price-test decision, completion of all
  prerequisites, and the required clean 14-day baseline.
- WP-13 is deferred to the dedicated UI artifact branch and founder visual
  acceptance.
- WP-14 remains founder/Product-owned and is not an implementation task for
  this workflow.
- Continue with WP-10 analytics and privacy instrumentation, which is
  independent of the deferred catalog, pricing, payment activation, and visual
  UI decisions.
- WP-10 implementation is deferred after source inspection because three
  required decisions are unresolved:
  - `config/analytics-events.json` remains the canonical ordered registry, and
    the approved architecture requires an explicit event migration and
    dashboard update before renaming or reordering its existing funnel;
  - the current production sink is a structured application logger, not a
    durable first-party KPI store capable of the required server-side commerce
    join and disabled-autopay revenue exclusion;
  - the repository requires separate analytics consent in experience guidance,
    but no approved policy defines which first-party operational events may be
    emitted before that consent or how the required pseudonymous session key is
    derived and rotated.
- Do not invent an analytics provider, consent default, identifier policy, or
  dashboard migration. Revisit WP-10 after the founder resolves those
  product/privacy/operations boundaries.
- No further independent work package remains in this backlog: all remaining
  items are recorded above as founder-decision, payment-prerequisite,
  dedicated-UI-branch, baseline, or Product-owned deferrals.
