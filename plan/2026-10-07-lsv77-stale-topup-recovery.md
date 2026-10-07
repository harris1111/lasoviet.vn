# LSV77 stale top-up recovery

## Bounded brief

Owner approved investigating and fixing HTTP 502 on replay of a completed in-context top-up. Root cause: completion correctly invalidates the original pending intent/version; the private controller returns a business failure envelope and the browser proxy maps it to an upstream outage. Preserve the existing financial rejection and all payment/ownership/version/privacy gates.

Return HTTP 409 with the existing closed `TOP_UP_CONTINUATION_INVALID` code for stale or unauthorized continuation terms. Retain a compatibility mapping for the old private failure envelope. In the inline dialog, only this exact 409/code shows a localized stale-state explanation and an explicit refresh action; suppress repeated top-up submissions until current terms are loaded. No automatic top-up or debit retry. Existing network and unknown errors remain unavailable/retry behavior.

Refresh through the existing verified intent/balance boundary. If the refreshed non-membership intent is completed, validate the existing redacted public intent shape (including SKU/locale), close the purchase sheet and refresh the contextual owned quote instead of proposing another spend. This completion signal is not report authority: the existing owned quote still controls report identity/access. Do not trust a conflict body as payment confirmation. Keep unmounted/late response fences.

Scope: private commerce controller and tests; web top-up proxy and tests; inline top-up/wallet dialog plus VI/EN messages; focused browser coverage and its browser-safe contract exports; existing PostgreSQL financial regression coverage and this plan. No ledger/repository mutation changes, migrations, new routes, provider activation, model/writer work or customer email.

## Acceptance

- Completed-command replay is a domain conflict (409), never a fabricated successful payment receipt.
- Invalid/foreign continuation stays rejected; one order, one credit and one unlock spend remain invariant.
- Lost successful response, retry with stale terms, explicit refresh: recover owned processing/ready state without a second top-up/unlock request.
- Unknown/non-JSON failures do not become success; closed dialog or changed selection ignores late recovery.
- Required pre-push i18n/lint/typecheck, focused API/proxy/PostgreSQL/browser checks, independent exact-head review and CI before merge.
- Deploy and repeat isolated actual published-image purchase/recovery smoke; verify runtime/holds/operator hashes and clean up owned QA before returning LSV77 to In Review. Real-bank acceptance remains deferred; full Done is not claimed.

The controller intentionally omits private chart identity from customer intents. Recovery uses `WalletUnlockResultV1Schema.shape.intent`, preserving that projection, and the request/effect version fence rather than adding chart identifiers to the response. A controller regression validates its actual completed projection against this public shape.

## Local verification

- API/proxy HTTP regression: 89 tests passed.
- PostgreSQL money-path regression: 52 tests passed, including three concurrent stale create attempts after settlement, retaining one order and one spend.
- Browser/component acceptance: 52 tests passed, including lost reply/409/explicit refresh, invalid completed projections, late responses after close/version change, VI/EN stale copy and unknown/non-JSON failures.
- The contextual fixture now returns a stable router identity, matching the application router context; the initial unstable fixture failure is preserved privately.
- Final pre-push checks, independent exact-head review, CI, deployment and published-image recovery acceptance are recorded at release time. Real-bank and outbound holds remain unchanged.
