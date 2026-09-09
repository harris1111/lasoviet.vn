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
- Documentation reconciliation milestone completed and Terra-approved:
  - Initial implementation landed in commit `5f46862`.
  - Terra review findings corrected in commit `2d092c2` (aligning R-AUTO-13 and WP-02B with R-AUTO-10 to require exactly one eligible unmatched payment and exactly one eligible unfulfilled order for that owner, adding the two-matching-orders test, and adding the focused frozen-clock R-AUTO-15 alerting test).
  - Scoped re-review returned APPROVED with no remaining Critical/Important findings.
- WP-02 automated reconciliation engine completed and Terra-approved:
  - Initial implementation landed in commit `3816b85` (Crockford base32 `payment_code` generation, weighted modulo-32 checksums, normalization, migration `0019_payment_code_reconciliation`, `commerce_unmatched_payments` table, `match_method` tracking, and VietQR instructions).
  - Terra review findings corrected in commit `8815002` (independent non-concatenating scanning of `bank.code` and `bank.content`, and scoping `onConflictDoNothing` specifically to `commerceOrders.paymentCode` on order creation).
  - Terra scoped re-review returned APPROVED with no remaining Critical or Important findings.
  - Focused checks passed: `@lasoviet/database` build, `@lasoviet/backend` build, `@lasoviet/api` typecheck, 7 focused test files with 114 passing tests, and clean `git diff --check`.
  - Invariant boundaries preserved: `SEPAY_ENV`, payment activation, WP-02B customer self-claim, and Telegram alert integration remained untouched.
- WP-02B customer self-claim server slice completed and Terra-approved:
  - Implementation landed in commit `16a63d6`.
  - Terra reviewed `1b066fe..16a63d6` and returned `APPROVED` with no Critical or Important findings.
  - Focused checks passed: contracts/database/backend builds, API typecheck, 6 focused test files with 130 passing tests, and clean `git diff --check`.
  - Implemented strict Vietnam local-minute parsing, inclusive +/-15-minute matching, exact-one payment/order eligibility, authenticated verified-account enforcement, concurrency-safe five-attempt daily rate limiting, bounded audit records, and atomic self-claim fulfillment.
- WP-02B reconciliation operations server slice completed and Terra-approved:
  - Implementation and corrections landed in commit `328d5ca`.
  - Initial Terra review found transaction-bound Telegram delivery, checkout/circuit race, and an unregistered reset capability.
  - Correction moved delivery through a durable leased queue outside database transactions, synchronized checkout and circuit transitions with one advisory lock, and registered `admin.commerce.manage` for super-admin reset authority.
  - Scoped re-review required lease-token fencing; the final correction added per-claim lease ownership and stale-claimant protection.
  - Terra returned `APPROVED` with no remaining Critical or Important findings.
  - Focused verification passed: contracts/database/backend builds, API and worker typechecks, 11 focused test files with 162 passing tests, final lease-fencing re-review tests, and clean `git diff --check`.
  - Telegram credentials remain absent; no external Telegram delivery, payment activation, `SEPAY_ENV` change, push, merge, deploy, or production access occurred.
- Remaining WP-02B scope:
  - Customer-facing self-claim and payment-paused UI on the approved UI artifact lineage.
  - Live Telegram activation and external smoke after the founder supplies `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- WP-02B customer-facing payment recovery UI completed and Terra-approved:
  - Implementation landed in commit `6c370b7`.
  - Added the authenticated customer self-claim form and localized payment-paused checkout state without changing payment activation or provider configuration.
  - Terra returned `APPROVED` with no Critical or Important findings.
  - Focused verification passed: contracts build, web typecheck, 6 focused test files with 38 passing tests, web production build, and clean `git diff --check`.
- WP-03 account-center UI completed and Terra-approved:
  - Initial implementation landed in commit `7d51677`.
  - Added verified-account server rendering for `/tai-khoan`, `/tai-khoan/bao-cao`, and `/tai-khoan/don-hang`, including locale-correct authentication callbacks, latest-readable report priority, profile-grouped report library, immutable order history, localized statuses, and canonical chart-creation links.
  - Terra identified three Important findings: projection failures appeared as empty accounts, support links exposed internal order IDs, and library groups used chart identity instead of birth-profile identity.
  - Corrections landed in commit `aefe73f`: unavailable states no longer claim the account is empty, support links use customer-facing immutable invoice numbers, and multiple chart revisions for one birth profile are grouped together.
  - Terra scoped re-review returned `APPROVED` with no remaining Critical or Important findings.
  - Focused verification passed: contracts/database/backend builds, API and web typechecks, 10 focused test files with 108 passing tests, 11 commerce repository integration tests, web production build, and clean `git diff --check`.
- Deferred provider activation:
  - Telegram delivery activation and external smoke remain blocked only on founder-supplied `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- WP-04 catalog single-source milestone completed and Terra-approved:
  - Initial implementation landed in commit `24f5f14`.
  - Centralized active commerce price and currency lookup on the validated JSON catalog, added fail-fast catalog policy checks, and enforced contract-level rejection of reserved and arbitrary SKUs before repository access.
  - Added `ZIWEI-NATAL-EXCERPT-P0` metadata at the founder-approved 19,000 VND price.
  - Terra identified one Important finding: the initial implementation made the 19,000 VND SKU purchasable before WP-08 provided atomic generation and server-side read-scope support.
  - Correction landed in commit `64d1733`: the natal excerpt remains staged as `P1` and `reserved`, is excluded from the active commerce contract and runtime lookup, and cannot enter order, payment, or report workflows before WP-08.
  - Terra scoped re-review returned `APPROVED` with no remaining Critical or Important findings.
  - Focused verification passed: contracts/config/backend builds, 64 focused contract/config/order/API tests, 12 commerce repository integration tests, API typecheck, and clean `git diff --check`.
- WP-05 offer-name and delivery-promise synchronization completed and Terra-approved:
  - Implementation landed in commit `bd38d16`.
  - Preserved immutable SKU `ZIWEI-IDENTITY-P0`, active 79,000 VND pricing, and the staged P1/reserved natal excerpt.
  - Renamed the active offer to `Luận giải Tử Vi toàn diện` / `Comprehensive Zi Wei reading` across catalog, account projections, preview, result CTA, selector, and checkout.
  - Replaced the legacy identity-section list with the exact seven top-level comprehensive V3 sections.
  - Active Vietnamese purchase copy now states the actual 12-palace, key-configuration, cross-palace, four-theme, practical-direction, and 2,200-3,200-word delivery scope without promising unsupported time forecasting.
  - Terra returned `APPROVED` with no Critical or Important findings.
  - Focused verification passed: contracts/config/backend builds, web typecheck and production build, 63 focused tests, and clean `git diff --check`.
- WP-06 report and payment recovery UI completed and Terra-approved:
  - Implementation landed in commit `f90345a`.
  - Added distinct pending, paid-before-report, expired, failed, refunded, report-generation, and report-terminal-failure customer states.
  - Pending payment preserves immutable VietQR instructions, warns against duplicate transfer, and exposes self-claim only while pending.
  - Terminal report failure now displays every required BE-5 fact and a bounded prefilled support path without internal report identifiers.
  - Terra returned `APPROVED` with no Critical or Important findings.
  - Focused verification passed: contracts build, web typecheck and production build, 63 focused tests, and clean `git diff --check`.
  - R-AUTO-21 durable founder alert delivery was implemented in commit `d266e98`.
  - Terminal transitions now atomically enqueue a bounded non-PII `report_terminal_failure` alert, attempt immediate post-commit delivery, and retain the existing 15-minute maintenance retry.
  - Terra identified one Important idempotency-collision finding. Correction commit `d1487da` removed conflict suppression so alert-key collisions roll back the job, reservation, outbox, and alert transaction.
  - Terra scoped re-review returned `APPROVED` with no remaining Critical or Important findings.
  - Focused verification passed: database/backend builds, worker typecheck, 70 alert/report tests, 31 correction integration tests, and clean `git diff --check`.
  - WP-06 provider-independent implementation is complete. Live Telegram activation and external smoke remain deferred until the founder supplies `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- WP-07 purchase selection and ownership flow completed and Terra-approved:
  - Implementation landed in commit `0361a40`.
  - Added server-only public offer mapping, ownership-aware read/progress/library states, safe intent-preserving auth callbacks, compatibility handling for `ENTITLEMENT_EXISTS`, and real PostgreSQL ten-call pending-order reuse coverage.
  - Reserved offers remain unpurchasable and no `ZIWEI-*` SKU reaches browser-visible UI, hidden inputs, URLs, or callbacks.
  - Terra returned `APPROVED` with no Critical or Important findings.
  - Focused verification passed: contracts/backend builds, web typecheck and production build, 64 focused tests, and clean `git diff --check`.
- WP-08 entitlement scope and Tier-1 activation completed and Terra-approved:
  - Initial implementation landed in commit `539b036`.
  - Added immutable Tier-1/Tier-2 entitlement scopes, migration `0022`, full
    backfill for existing comprehensive entitlements, server-side scope union,
    and strict omission of locked report prose.
  - Activated the 19,000 VND Vietnamese Tier-1 offer with a customer-safe
    public offer key and a four-section report reader while preserving the
    complete 12-palace Tier-2 reader.
  - Terra identified two Important atomic-activation issues. Correction commit
    `0625e15` completed the topic contract/UI path, serialized cross-tier
    payment decisions with a chart-wide lock, and made Tier-2 unlock reuse the
    existing report without another reservation or generation event.
  - Terra's scoped re-review found one Important cross-locale issue. Correction
    commit `7cd741c` blocks Vietnamese-V3 to English-V2 cross-locale upgrades
    before order creation and requires locale-equal report reuse.
  - Terra final scoped re-review returned `APPROVED` with no remaining Critical
    or Important findings.
  - Focused verification passed 209 WP-08 tests, the 107-test final correction
    subset, contracts/config/database/backend builds and typechecks, API
    typecheck, web typecheck and production build, and clean
    `git diff --check`.
