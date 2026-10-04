# LSV79 pending top-up capture milestone

The owner approved capture in the test environment only (owner worksheet item 8). This milestone creates a private reminder record for a verified, non-anonymous account with active offers consent, compatible notification preferences and an original owned pending top-up continuation. It never delivers mail or confirms payment. Full LSV79 remains open.

Eligibility starts at 30minutes and ends exclusively at the existing configured order TTL. The disabled-provider fixture uses the same 86400-second fallback as commerce. TTL at or below 30minutes captures nothing. The current milestone covers active lifetime-period intents at their full catalog price; discounted rollover/member quotes are conservatively excluded until their earlier deadline can be proved. No hold, price or owner policy changes.

The original order, intent, owner, locale, chart/version and state-version bindings are rechecked. Settled, expired, blocked, cancelled, mismatched, stale-version, unverified, anonymous, unconsented, unsubscribed and deletion-requested sources are excluded. Busy settlement/replacement rows are skipped without reverse authority-lock waits. Consent, preference, chart-version creation and account deletion join a dedicated recovery coordination fence. Capture and purge take the existing free-AI fence first, then the recovery fence; eligibility writers take only the recovery fence so account deletion can still cancel an in-flight delivery holding the AI fence. A capture row and a processed `notification.recovery.captured.v1` receipt commit atomically. One capture/order and maximum two recovery captures/chart are serialized by those fences.

The private row uses dedicated kind `recovery_pending_topup` and status `captured`, no sent timestamp/provider ID, zero attempts and an explicit capture-only code. AuthEmail schemas do not accept this request; retry selection, claim and mapping cannot send it. The canonical action opens the existing `/thanh-toan/<original-order-id>` (English prefix where applicable), with `utm_source=reminder` attribution and the original VND amount/human item name, with a signed unsubscribe link. No recipient address or birth/chart prose is stored outside that private unsubscribe token. Account purge removes both private capture payloads and their capture receipts, and its durable marker blocks late inserts.

## Validation

- 147 focused tests across seven files passed, including 32 real-PostgreSQL capture cases, consent/preferences, actual recalculation repository, environment parsing and worker wiring.
- Frozen business clock proves the 30-minute and exact-expiry boundaries. Real PostgreSQL barriers prove concurrent scans/cap, settlement, intent replacement, consent revocation, coordinated deletion and actual recalculation. Writer tests observe the contested advisory lock before releasing it.
- Forced unique-key failure on the outbox receipt proves the capture row rolls back, followed by one safe retry.
- The same fixture proves original orders and wallet transactions unchanged, valid human titles/canonical links/unsubscribe token, no SMTP retry/claim path and complete purge cleanup.
- Required i18n/lint/typecheck and release CI must pass on the reviewed head before merge. Installed deployment and isolated published-artifact capture proof remain release gates; record exact SHA and redacted outcomes in Kaneo after deployment.

## Operation

`FUNNEL_RECOVERY_MODE` is a closed `disabled | capture` setting, default `disabled`; there is no send mode. Test captures are scanned during maintenance before the existing notification workflows. Keep production configuration unchanged and disabled. Run focused QA with `pnpm exec vitest run packages/backend/src/notifications/pending-topup-recovery-capture.integration.test.ts packages/backend/src/consent/consent.repository.integration.test.ts packages/backend/src/notifications/nurture-signin.integration.test.ts packages/backend/src/ziwei/ziwei.repository.integration.test.ts packages/config/src/environment-schema.test.ts packages/config/src/funnel-recovery-environment.test.ts apps/worker/src/worker.module.test.ts` after rebuilding producer packages.

Private fixture credentials, unsubscribe tokens, email/birth data and provider settings must remain outside Git/artifact uploads. Disposable published-artifact QA uses an owned internal network/database, synthetic account/chart/order rows, no SMTP/payment/AI provider and verified cleanup. It is a capture test, not a notification-delivery, revenue or paid-writer acceptance.

## Remaining ticket scope

Free-chart follow-up needs approved safe source content; recovery/in-app resume and measured rollout remain open. Actual recipient delivery has no approved recipient and stays disabled. This bounded acceptance does not close SePay, physical-device, AI quality/budget or baseline/revenue gates on related tickets.

The first full-suite attempt was NO GO: eligibility request writers sharing the free-AI fence blocked the existing in-flight upgrade/deletion cancellation test. The dedicated recovery fence preserves that contract, and the corrected critical six-file run passed 116 tests (including the existing 49 wallet cases and 25 schema cases). Migration enum additions support rewinds/replay with `IF NOT EXISTS`; only the test that runs two complete migration passes has a 30-second execution budget, retaining every convergence assertion. A fresh full suite is required on this corrected source before release.

Full-suite scheduling note: the nine-purchase compensation case and two 57-migration provenance cases exceeded their inherited 5-second budgets only in the concurrent full suite. The same three cases passed unchanged in a focused 20-test run. Their budgets are now 30 seconds, with every financial and provenance assertion preserved; the complete suite is rerun before acceptance.

Final sequential local validation passed: 453 unit/integration files, 4177 tests (three pre-existing skipped), plus all 17 script checks. Required i18n/lint/typecheck passed. No additional wallet test assertion or timeout change was made for the overloaded concurrent attempt. `/tmp/lsv79-sequential-full-tests.log` records the accepted run.
