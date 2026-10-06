# LSV79 in-app recovery verification

Scope: read-only latest eligible shortfall hint, account/offer/paid-reader banner, once-only fresh confirmation resume, and truthful guest save copy. Outbound delivery and held SKUs remain disabled. Full LSV79 stays In Review; authoritative free-chart follow-up and durable recovery attribution remain incomplete.

Early independent review identified money-ask placement and stale eligibility. Both were corrected: explicit placement whitelist preserves FD069/101/109/110; focus/visibility/wallet completion clears and revalidates hints with abort/generation fencing. Paid orders with pending fulfillment independently suppress recovery.

- Real PostgreSQL plus private BFF/registry: 82 checks passed, including no side effects, verified ownership/locale, deletion, latest chart version, reserved SKU, stale price, paid/pending/funded states and expired unpaid order.
- Actual React/CSS browser fixture: 25 checks passed at 390/1440px and vi/en, including scoped dismissals, malformed/foreign replies, sign-out/account/navigation races, once-only confirmation with no spend/order, paid invalidation, and price-free homepage/free chart. These use mocked network projections, not real bank settlement.
- Required i18n/lint/typecheck passed (four pre-existing warnings, zero errors). Combined existing top-up/contextual and new recovery component browser suite passed all 48 cases. CI, independent exact-head review and deployment smoke remain release gates.
