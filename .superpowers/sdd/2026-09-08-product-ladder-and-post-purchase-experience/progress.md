# Product Ladder And Post-Purchase Experience Progress

## 2026-09-08

- WP-01 completed and Terra-approved in commit `07f3bb0`.
- WP-03 server-side account library and immutable order history completed and
  Terra-approved in commit `40237d9`.
- The WP-03 account-center UI remains deferred to the dedicated UI artifact
  branch.
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

## 2026-09-09

- Founder ratified decisions FD-040 through FD-056:
  - FD-040: `invoice_number` is immutable for the life of an order row; commerce order table becomes append-only.
  - FD-041: Upgrade credit (Tier 1 → Tier 2) expires exactly 7 days after the Tier 1 `paid_at` (paid timestamp); mandatory disclosure at point of purchase before payment confirmation.
  - FD-042: SKU ID is an immutable technical identifier and must never be exposed to the customer in any form (backend-only); only customer-facing display names change.
  - FD-043: No staffed payment reconciliation exists. Every step after checkout must self-recover automatically; anything that cannot self-recover must self-halt sales.
  - FD-044: Short 12-character noise-resistant payment code (`LSV` + 8 Crockford base32 chars + 1 checksum char) replaces the 40-character transfer memo.
  - FD-045: Odd-unit price proposal rejected; all displayed and charged prices remain strictly round. Replaced amount-only auto-match tier with customer self-claim within a narrow window (+/- 15 minutes around declared transfer timestamp in `Asia/Ho_Chi_Minh`) under rules R-AUTO-8, R-AUTO-9, R-AUTO-10, and R-AUTO-13 (requiring exactly one eligible unmatched payment and exactly one eligible unfulfilled order for that owner; zero or multiple candidate payments or orders leave payment unmatched until eligible for Tier 5 alerting only after pending >6 hours under R-AUTO-15).
  - FD-046: Funds that cannot be matched to an owner, with no bank auto-refund capability available, remain held pending indefinite customer self-claim; no manual refund process required.
  - FD-047: Out-of-band alert channel for circuit breaker and stale unmatched transactions (>6h) is a Telegram bot posting to shared Harris/An operations group with 6-hour founder response SLA (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` environment variables to be supplied).
  - FD-048: Tier 1 micro-offer priced and tested at single 19,000 VND price point; WP-12 deprioritized from near-term scope.
  - FD-049 through FD-054: Full analytics event migration to WP-10 names without dual-write; pre-consent logging restricted to anonymous technical events; primary storage is PostgreSQL in existing infrastructure (not ClickHouse); pseudonymous session ID without rotation; strict privacy boundaries against exporting personal/chart data to third parties; joint Harris/An dashboard and mapping ownership.
  - FD-055: Approved UI artifact branch is `product/discipline-flagship-pages`. Git ancestry verified that `product/bg-texture-consistency` and `product/homepage-content-rewrite` are ancestors; no preliminary UI branch merge is required. UI implementation branches start from `product/experience-spec-v1`.
  - FD-056: Harris signs off on cross-cutting visual QA (WP-13) alone; An executes checks and provides screenshot-backed pass/fail evidence.
- Documentation reconciliation milestone:
  - Created English decision document `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`.
  - Backfilled decisions FD-036 through FD-056 into `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`.
  - Reconciled `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md` with replacement FD-045 self-claim rules, 7-day credit expiration from Tier 1 `paid_at`, 19k pricing, and closed pending decisions.
  - Reconciled `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md` with replacement WP-02/WP-02B rules and tests (including two matching owner orders and frozen-clock R-AUTO-15 tests), WP-09 expiration tests, WP-10 PostgreSQL/privacy boundaries, deprioritized WP-12, and verified WP-13 UI ancestry.
  - Confirmed `docs/20-deep-research-ta-social-listening-handoff.md` is excluded and remains a separate documentation task.
- Documentation reconciliation milestone corrected per Terra review and pending Terra re-review.
