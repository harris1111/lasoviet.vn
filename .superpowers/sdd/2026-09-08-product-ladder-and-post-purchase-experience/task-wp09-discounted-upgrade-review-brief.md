# WP-09 Terra Review Brief

Review the supplied WP-09 commit range against the ratified FD-041/FD-048
rules, the product-ladder spec/backlog, the WP-09 implementation brief, and
live repository evidence. Do not implement or commit.

## Review Questions

1. Is upgrade credit server-authoritative, based on the actual paid Tier-1
   amount for the same owner/chart/locale, and excluded after refund?
2. Is expiration exactly seven days from `paid_at`, with the exact timestamp
   treated as expired?
3. Can a pending 60k quote, late webhook, or self-claim bypass expiration?
4. Are pricing fields persisted consistently without mutating immutable
   commerce/report history?
5. Does payment confirmation still create the Tier-2 entitlement while reusing
   exactly one report and one generation event?
6. Are QR/payment instructions capped at the credit deadline?
7. Does the UI disclose the seven-day rule before Tier-1 payment and show the
   exact list price, credit, net price, deadline, and unlocked scope?
8. Are Tier-1-after-Tier-2, refunded, expired, cross-owner, cross-chart, and
   cross-locale paths fail closed?
9. Are internal SKU/source-order identifiers absent from browser-visible data?
10. Do focused frozen-clock and PostgreSQL integration tests cover the
    acceptance boundary without broad unrelated testing?

Return evidence-backed Critical/Important findings first with file/line and
reproduction. Classify other observations as defer or rejected. State
`APPROVED` only when no Critical/Important finding remains.
