# LSV77 owned top-up recovery follow-up

## Bounded brief

Actual published-image acceptance of PR315 release b8c66fbd found a fixture mismatch: after a successful settlement with a lost browser response, retry correctly returns TOP_UP_CONTINUATION_INVALID/409. Explicit refresh creates a purchase intent, but the real repository rejects the already owned product with WALLET_ENTITLEMENT_EXISTS. It does not return the completed projection assumed by the component fixture. Financial rejection remained safe: one order and one 960 La spend.

Handle this existing ownership rejection by reading the authenticated wallet quote endpoint, validating its existing strict public contract and exact chart/version/locale/selected SKU. Only a matching owned quote may close the sheet and refresh the contextual receipt. A conflict body alone is never report or payment authority. Keep late-close/version fences, unknown errors and membership behavior unchanged. No backend, ledger, flags, migrations, routes or provider activation changes.

Scope: wallet-unlock-dialog, focused contextual browser fixtures/tests and this plan. Replace the fixture assumption with the actual ownership conflict, retaining completed-projection rolling compatibility coverage. Verify invalid/missing/non-owned quotes and late response fences. Run required pre-push checks, independent exact-head review and CI, merge/deploy, then repeat six actual published-image purchase cases including two lost-response recovery cases. Keep real-bank acceptance deferred and LSV77 In Review after release evidence.

## Local verification

- 62 browser/component cases passed, including the real ownership-conflict recovery, invalid owned quote projections, late quote fences and completed-intent rolling compatibility.
- Required pre-push checks, independent review/CI and actual published-image acceptance are recorded separately at release time.
