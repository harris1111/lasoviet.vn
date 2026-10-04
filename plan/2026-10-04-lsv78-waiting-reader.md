# LSV78 bounded brief: truthful waiting and reader upgrades

## Authority and base

The owner approved the contextual/waiting prototype and recommendations on 2026-10-04, then authorized implementation, ticket testing, independent review and deployment. This dedicated branch starts from reviewed LSV76 merge `74d44909bee441629190bc10fc5e1557bc234920`; rebase before release if master advances. SePay acceptance is explicitly deferred. No paid provider calls or outbound notifications are part of implementation verification.

## Scope

Replace reader display-time purchase-intent writes with the LSV76 read-only wallet quote API and reuse native UnlockSheet. Show real rollover credit separately from membership discounts and respect expiry/ownership/availability. Track upgrade views only when the inline offer is actually visible and eligible. Produce upgrade purchases only from an authoritative completed wallet debit/receipt, with closed source SKU lineage and replay-safe event identities; do not infer purchase from navigation, browser amounts or mere price discounts.

Improve pending report pages with real owned calculation/available free evidence and automatic refresh-to-ready. Handle terminal wallet generation failures as an honest recovery state; only claim restored Lá when an actual posted reversal is proven. Never invent progress stages, ETA, excerpts, report readiness or refund success. Preserve immutable report/chart-version authorization and deletion privacy. Extend strict contracts/backend projections only as required for safe client data, not private writer payloads.

Allowed files: report progress/readers/loaders/page, commerce quote/sheet integration, matching VI/EN messages/styles, strict report/wallet outcome contracts, wallet unlock/receipt lineage and report-query projection, server analytics producers/runbook, and focused money/privacy/reader/browser tests. No new public route unless canonical registry and tests are updated. No reserved combo/membership activation, free-generation switch, real SePay transaction, provider budget use, notification send or host infrastructure change.

## Milestone gates

1. Inspect existing report DTOs, immutable query authorization, posted reversal rules, wallet continuation/replay authority and consent/idempotency analytics ingestion before changing them.
2. Frozen-clock actual database tests prove quote-to-debit equality, qualifying source credit, no discount-as-credit, replay once, deleted/foreign/version denial, real pending/failure/refund distinctions and ready switch.
3. Browser tests exercise mobile/light/dark/VI/EN waiting content, refresh-ready, availability, native focus and visible upgrade tracking with safe fixtures. These do not count as paid-provider acceptance.
4. Run required i18n/lint/typecheck, focused relevant checks/build, independent exact-head GO, green CI, deploy and smoke before Done. Record any remaining owner/provider/device gates without false closure.

## First release boundary

Release the independent reader/waiting correction first: read-only quotes, native inline confirmation, frozen calculation facts for authorized pending reservations, visibility-aware refresh and honest wallet terminal support. This fixes customer-visible behavior without changing money commands. The broader ticket remains In Progress.

The next money milestone must implement persisted upgrade-credit receipt lineage and authoritative purchase events, plus token-authorized automatic terminal wallet compensation. Independent architecture review found shared reservations can have multiple linked paid spends, and terminal recovery can reopen a reservation without a compensation fence. A correct implementation must discover/deduplicate all affected active spends, hold account/wallet/spend/allocation locks before reservation locks, validate the persisted failure/version and absent publication, restore exact original buckets atomically with receipts/access revocation, and fence recovery/publication. GET must only display proven posted reversals. Frozen-clock race/duplicate/corruption/privacy tests are required. No owner approval is inferred as a pass for these unmet criteria.
