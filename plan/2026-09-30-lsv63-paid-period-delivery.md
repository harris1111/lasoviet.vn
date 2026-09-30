# LSV-63 paid period delivery

## Bounded implementation

Owner-authorized prerequisite for LSV-65, based on FD-105 and the active commercial specifications. The period writer and computed engine facts remain the dedicated period-reading implementation. This change connects them to wallet fulfillment, immutable reports, authorized retrieval, account export, and the mobile reader. Monthly and annual SKUs remain reserved pending the real-provider acceptance campaign.

- Monthly purchases cost 300 Lá and bind a chart to the actual lunar year/month/leap-month key. Leap-month halves belong to one purchase. January can belong to the preceding lunar year.
- Annual purchases cost 480 Lá and bind only to 2026. Quotes cannot cross the annual sales boundary.
- Intents and entitlements store the purchase period. Migration 0052 allows independent periods while enforcing one active entitlement per chart/SKU/period. Stale monthly quotes are cancelled and replaced; stale confirmation rolls back the whole spend.
- Computed snapshot facts, paid period, chart/version, source date, and dedicated writer tuple must agree before provider dispatch and before public projection. Every accepted result is immutable. Historical reports remain authorized after calendar rollover.
- Rewrite calls consume the durable report rewrite budget, retain separate cost keys, and pass lifecycle/lease fences. No natal report is substituted for period content.
- The reader exposes lunar prose, period navigation, printing, and report-specific feedback. Internal evidence and engine period identifiers are removed. Guarantee claims for period products require the exact report and restore only its spend.

## Verification

Focused generation/query tests cover tuple mismatch, unpaid periods, source provenance, January lunar-year differences, durable rewrite exhaustion, lifecycle revocation, and public redaction. PostgreSQL integration covers concurrent purchase/replay, exact 300/480 amounts, stale quote rollback, monthly repurchase, annual boundary, historical access, and selective refund/relock. Browser coverage uses 320, 390, and 1440 pixel viewports with overflow, navigation, feedback, and print assertions. Required i18n, lint, and type checks run before handoff.

## Remaining release gates

No catalog activation, paid provider call, production mutation, merge, deployment, or Done transition is included. The parent LSV-63 PR owns campaign evidence and final integration. Membership discounted prices and LSV-65 dual-entitlement fulfillment must compose with this period scope before release.
