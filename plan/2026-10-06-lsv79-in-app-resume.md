# LSV79: in-app purchase recovery

## Bounded brief

Owner requests overnight progress across To Do and In Review. Continue phase 8 with a server-authorized latest short-balance intent hint and an in-app resume banner; improve the existing anonymous save prompt. UI notification delivered before implementation. This branch follows the independently reviewed LSV77 implementation and will target master after PR304 merges.

Allowed files: a backend pending-intent query/helper and repository/controller wiring; browser-safe contracts and private route registry/proxy/tests; pending-unlock-banner, locale layout, existing guest save banner, matching localization/styles and focused browser/integration tests; this brief/evidence and recovery runbook/owner worksheet updates. No schema migration, new wallet/payment command, real outbound delivery, model/API research or held product activation.

Return only an owned, undeleted, latest-chart-version pending intent for an active supported SKU and currently valid price. Hide owned/reserved/expired/stale intents, sufficient balances, existing pending payment orders or paid orders with pending fulfillment and deleted accounts/profiles. Read-only hint; reopening confirmation refreshes authoritative terms. Banner pricing is restricted to account, offer-selection and already-paid reader surfaces. FD069/101/109/110 supersede phase08’s general any-page wording; the homepage and uninterrupted free-result body stay price-free. Owner worksheet records the unresolved broader-placement conflict. Visibility/focus and wallet completion revalidate and clear old terms on failure. Browser state is scoped to verified account, path and locale and cancels stale requests on sign-out/account change. Dismissal is per account/intent; no birth data or raw notification payload enters analytics or browser storage.

Guest copy preserves the actual 24-hour purge and immediate-delete behavior and qualifies the once-per-eligible-verified-account 60 Lá welcome gift. It does not promise permanent storage or a second free reading.

Verify real-PG owner/deletion/stale/paid/reserved/no-mutation cases, private projection/SEO, anonymous/sign-out/foreign reply suppression and actual CSS at 390/1440px. Required i18n/lint/typecheck and independent review precede merge/deploy. Full LSV79 stays In Review: free-chart message requires an authoritative published teaser and outbound/cohort decisions remain deferred.
