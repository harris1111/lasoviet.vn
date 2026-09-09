# Founder Decisions — Round 2 (2026-09-09)

**Date:** 2026-09-09
**Context:** Founder (Harris) reviewed and approved open decision points (FD-040 through FD-045 and "Pending Founder" items) in `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md` and `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md` via direct interview on 2026-09-09, prior to An finalizing `feature/site-foundation` to open a pull request into `product/experience-spec-v1`.
**Status:** All decisions below are **official and ratified**. This document serves as the authoritative source of truth superseding every "Pending approval" or "Pending founder" notation in the two source documents mentioned above.
**Action items for An:** See section 7 at the end of this document, and update `rules-and-decisions-tracker.md` (supplemented with FD-036 through FD-056 in this cycle), the 2026-09-08 spec, and the 2026-09-08 backlog accordingly.

---

## 1. Transaction Record Integrity (P0, Blocks WP-01/WP-02)

### FD-040 — Approved
`invoice_number` is immutable for the entire lifetime of an order row; the commerce order table transitions to append-only (reopening an order inserts a new row rather than issuing an `UPDATE` on the old code). Exactly as proposed by An, without alteration. This is an essential prerequisite for all subsequent automated reconciliation mechanisms (WP-02, WP-02B) to function correctly, resolving the lost-funds defect described in section 2 of the spec.

### FD-042 — Approved (With Supplementary Rule)
SKU ID (`ZIWEI-IDENTITY-P0`...) is an immutable technical identifier; repositioning is accomplished by modifying the **product display name**, never altering the SKU ID, avoiding migration of legacy commerce records.

The founder reinforced an invariant applied across the platform: **SKU ID and all internal technical identifiers must never be exposed to customers in any form**—customers only see clear, friendly product names, or customer-facing order and reference codes in an accessible format (never raw internal identifier strings). This reinforces requirement B-2 already present in the spec ("No `ZIWEI-*` strings leak to UI"), and must be treated as a strict rule across all user-facing touchpoints.

### FD-044 — Approved
Replace the 40-character transfer memo (`LSV-<uuid>`) with a short 12-character noise-resistant payment code: `LSV` + 8 uppercase Crockford base32 characters (excluding ambiguous `I/L/O/U`) + 1 checksum character. Exactly as proposed by An.

### FD-045 — Initial Proposal REJECTED; Replaced With Approved Mechanism (2026-09-09)

**Initial proposal rejected:** Adding an identifying odd-unit surcharge of 1–999 VND to each order amount (e.g. 79,000 VND -> 79,348 VND) to serve as a near-unique fallback reconciliation key. **The founder does not accept odd-unit prices displayed or charged to customers in any form, without exception**—including on bank transfer prompts or VietQR screens.

**Approved replacement mechanism:**

1. Eliminate the legacy Tier 3 in section 2B.2 of the spec: there is no longer an automated reconciliation tier that blindly approves payments based solely on matching amounts without customer confirmation.
2. All transactions from which a `payment_code` cannot be extracted in Tiers 1–2 (FD-044, R-AUTO-4 through R-AUTO-7) proceed directly to **Tier 4 — Customer Self-Claim** (R-AUTO-11 through R-AUTO-14), bypassing any intermediate automated match.
3. In Tier 4, matching constraints are tightened: the amount must match exactly **and** candidate payment `received_at` must fall within a narrow time window of plus/minus 15 minutes around the customer-declared transfer timestamp, entered to minute precision and interpreted in `Asia/Ho_Chi_Minh` (replacing the wide 24-hour window used in the legacy auto-match proposal). The narrow window drastically reduces collision probability at round price points (e.g., 79,000 VND or 19,000 VND).
4. Maintain the rule: auto-approve only when exactly one candidate matches (R-AUTO-10 / R-AUTO-13). If zero or multiple candidate payments match the exact amount within the same time window, entitlement is not granted, the payment remains unmatched in `commerce_unmatched_payments`, and it becomes eligible for Tier 5 stale alerting only after remaining pending >6 hours under R-AUTO-15 (never triggering immediate Telegram alerts or creating a manual operations queue).
5. Circuit breaker rules (R-AUTO-17, R-AUTO-18, R-AUTO-19) remain unchanged from the spec.

**Accepted tradeoff:** The automated match rate for transactions lacking an extractable payment code will be lower than with odd-unit pricing, but in exchange, **all displayed and charged prices remain strictly round everywhere**—offer, checkout, QR, and receipt—without exception.

**Concrete rules defined for spec and backlog implementation:**
- `R-AUTO-8`: A validly authenticated payment without a valid payment code is persisted as unmatched and must never be auto-assigned from amount alone.
- `R-AUTO-9`: An authenticated customer self-claim supplies exact transferred amount and a transfer timestamp to minute precision in `Asia/Ho_Chi_Minh`; candidate payment `received_at` must fall within plus/minus 15 minutes.
- `R-AUTO-10`: Auto-approval requires exactly one eligible unmatched payment and exactly one eligible unfulfilled order for that owner under the exact-amount/time-window constraints. Zero or multiple candidates do not grant entitlement; the payment remains unmatched and becomes eligible for Tier 5 stale alerting only after remaining pending >6 hours under R-AUTO-15.

---

## 2. Unattended Reconciliation (Fulfilling FD-043)

### FD-046 — Approved
When a transaction cannot be attributed to an owner (no customer self-claim, no order matched) **and** the system lacks automated bank refund capability (SePay does not support automated outbound refunds), the transaction remains held in an **unmatched state pending indefinite customer self-claim**. The founder does not require building an alternate manual refund workflow; this is a real system boundary, consistent with spec section 2B.1.

### FD-047 — Approved
The out-of-band alert channel for the circuit breaker (R-AUTO-18) and stale unmatched transactions pending >6 hours (R-AUTO-15) is a **Telegram bot posting to the shared Harris and An operations group**.

**Response SLA:** The founder commits to inspecting alerts **within 6 hours**. Because the circuit breaker does not self-reset (R-AUTO-19; resetting is an intentional manual operation), sales downtime while the circuit breaker is open depends directly on this SLA—An should treat 6 hours as the maximum duration the system might remain in "sales paused" state before founder intervention.

**Technical configuration:** Bot token and group chat ID are configured via environment variables `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, never hardcoded. Credentials will be supplied later by the founder; code and tests must not commit credentials or unverified defaults. External smoke and activation remain blocked until values are supplied securely.

---

## 3. Product Policy

### FD-041 — Approved (Diverging From An's Proposal)
Upgrade credit from Tier 1 to Tier 2 **expires exactly 7 days** after the Tier 1 `paid_at` (paid timestamp), never generic order creation or an ambiguous purchase timestamp (diverging from An's recommendation of no expiration, adhering to the 7-day window initially defined by the brainstorm council).

**Mandatory requirement:** Because this is a bounded window, it must be **explicitly disclosed at the point of purchase for Tier 1**, prior to payment confirmation—for example: "Upgrade credit towards the comprehensive report applies for 7 days from payment." This disclosure is mandatory: without clear disclosure, customers paying for Tier 1 lose an implied entitlement after 7 days, risking trust erosion.

**Backlog impact:** WP-09 requires an expiration mechanism (`credit_expires_at` column or equivalent on the Tier 1 order) and point-of-purchase warning copy before confirmation, not post-purchase.

### FD-048 — Approved
The Tier 1 micro-offer is priced and tested at exactly **19,000 VND**—a single price point, with no 19k/29k A/B testing in this release.

**Guardrail note (spec section 8):** The threshold "COGS / Tier 1 price > 40% -> Halt 19k branch" applies directly to this price point. This carries the highest margin risk between the two evaluated options, as each 19k order incurs the full report COGS (spec section 3.2). Actual COGS must be measured against real traffic as soon as live data exists.

**Backlog impact:** WP-12 (A/B 19k vs 29k) is deprioritized from near-term work—retained in the backlog for future experimentation, but not active when only one price point is offered. `price_variant`, if retained for forward compatibility, has only the current `"19k"` assignment in near-term scope.

---

## 4. Analytics

### FD-049 — Approved
Fully migrate the legacy analytics event set (`config/analytics-events.json`, 18 events: `landing_view`, `chart_created`, `payment_completed`...) to the new WP-10 funnel event names (`landing`, `wizard_start`, `wizard_step_complete`, `chart_success`, `offer_view`, `auth_verified`, `checkout_created`, `payment_confirmed`, `report_ready`, `report_opened`, `upgrade_view`, `upgrade_purchased`, `repeat_purchase`, `payment_unmatched`, `payment_pending_over_1h`, `report_failed`, `refund`, `support_ticket`). Do not operate a dual-write or parallel event system.

### FD-050 — Approved
Prior to customer analytics consent (where a consent mechanism is active), **only** anonymous technical events not tied to user behavior (e.g. page load errors, health checks) may be recorded. No canonical funnel event (`landing`, `wizard_start`, `checkout_created`...) may be emitted prior to consent.

### FD-051 — Approved
Long-term primary analytics storage is **PostgreSQL hosted within existing infrastructure** (dedicated tables in the existing PostgreSQL instance; ClickHouse is not used for this round). No third-party SaaS as primary store. The current log-only sink (`createApiAnalyticsSink` at `apps/api/src/api.module.ts:160`) will be replaced under WP-10.

### FD-052 — Approved (Simplified From Initial Proposal)
The pseudonymous session ID for analytics **does not require periodic rotation**. Concerns regarding lifetime tracking across durable IDs only apply when data leaves self-hosted infrastructure (which FD-051 excludes for primary storage). It simply needs to be a technical identifier distinct from account ID / internal primary keys (avoiding leaking internal primary keys to logs/analytics). It can persist across normal cookie/session lifespans.

### FD-053 — Approved
Data scope permitted for export to third-party purchase-optimization or conversion analytics tools (if external tools are used):
- **Freely permitted:** Behavioral and commercial data—funnel steps, selected SKU/price, traffic source, time to purchase, drop-off points, device/browser metadata.
- **Strictly prohibited under any circumstances:** Name, exact birth date/time/place, customer free-text questions, `chart_id`.
- Deep analysis requiring joins with astrological chart data (e.g. segmentation by birth year) must run solely on **self-hosted BI tools** (e.g. Metabase/Superset on existing PostgreSQL) within founder-controlled infrastructure.

**Rationale:** Once data is exported to third parties, customer data deletion obligations under Phase 01 / FD-020 cannot be enforced against third-party replicas; birth data and personal question text touch sensitive personal data under Decree 13/2023/ND-CP.

### FD-054 — Approved
The analytics dashboard and legacy-to-new event mapping are jointly owned by Harris and An.

---

## 5. UI

### FD-055 — Approved
The official UI artifact branch for An to build WP-03 (account library/order history), WP-06 (payment failure path), WP-11 (unknown birth time path), and WP-13 (cross-cutting visual verification) per FD-024 ("Defer user-facing UI to a dedicated artifact branch") is:

**`product/discipline-flagship-pages`**

**Branch ancestry verification (2026-09-09):** Git inspection confirmed that `product/bg-texture-consistency` (containing approved Colophon v5 assets) and `product/homepage-content-rewrite` are both ancestors of `product/discipline-flagship-pages`. That artifact branch is itself an ancestor of `product/experience-spec-v1`. Therefore, no preliminary UI branch merge is required. UI implementation branches must start from the current `product/experience-spec-v1` lineage while treating the approved flagship artifact as binding.

### FD-056 — Approved
Cross-cutting visual QA sign-off (WP-13, across mobile/desktop/checkout flows, including return-from-banking-app scenario): **Harris signs off alone.** An executes checks and supplies pass/fail verification tables with screenshot evidence.

---

## 6. Economic Assumptions (Item 9 of "Pending Founder") — Baseline For Planning

The founder confirmed that lasoviet.vn currently has no live traffic or revenue—the site is newly launched and will ramp up from zero according to the founder's launch schedule. Real AI COGS, actual payment fees, and historical refund rates do not yet exist.

Working assumptions derived from market research (2026-09-09):
- **All figures below are working assumptions/estimates, not live lasoviet.vn data.** They must be replaced with live figures once initial traffic and revenue are established, and must not be used to permanently halt or expand scope.

1. **Average AI COGS per report** — Assuming 1 API call per report, total input+output 15,000–30,000 tokens (input ~70% structured prompt and chart/reference data; output 2,200–3,200 Vietnamese words ≈ 4,500–9,000 tokens due to BPE tokenizer overhead with Vietnamese diacritics):
   - Frontier tier (GPT-4o / Claude Sonnet class): **~1,750–5,000 VND / report**
   - Mid tier (GPT-4o-mini class): **~100–225 VND / report**
   Even at the frontier tier, AI COGS remains under 5,000 VND / report, which is sustainable compared to the 19k/79k price points.

2. **Vietnamese payment processing fees** — SePay (webhook bank-sync model for direct VietQR transfers, not holding funds) charges no percentage fee: FREE tier 0 VND/month (50 transactions), STARTUP tier 120,000 VND/month (180 transactions, ~667 VND/transaction). Third-party gateways (VNPay, Ngan Luong, MoMo) charge 1,000–1,650 VND + 1.0–1.1% per transaction if card or wallet processing is added later. For the current VietQR model, the baseline is **~0% + fixed monthly subscription fee**.

3. **Refund rate** — No public VN-specific figures; global digital/info-product benchmark: **3–5% baseline**, with worst-case stress-test at **10%**.

4. **Traffic ramp** — Weeks 1–12 represent SEO indexing and foundation ramp with minimal traffic; initial organic signals typically appear around weeks 8–12, with compounding growth starting after month 6.

**Application to guardrail:** With estimated AI COGS at max ~5,000 VND on a 19,000 VND price, the COGS/price ratio is ~26%—comfortably below the 40% stop threshold (spec section 8). This guardrail must be remeasured against real traffic.

---

## 7. Next Actions For Implementation

1. Update spec `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md` section 2B.2 per the replacement FD-045 mechanism (`R-AUTO-8`, `R-AUTO-9`, `R-AUTO-10`).
2. Update spec section 3.3 to incorporate the 7-day upgrade credit expiration window (measured from Tier 1 `paid_at`) and mandatory point-of-purchase disclosure requirement (FD-041).
3. Update backlog `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`: WP-09 adds expiration logic; WP-12 is deprioritized (single 19,000 VND price point per FD-048); WP-02 and WP-02B are updated per replacement FD-045; WP-10 implements FD-049 through FD-054 using PostgreSQL.
4. Record UI branch ancestry verification complete; no merge needed before starting UI work; start from `product/experience-spec-v1` with flagship artifact as binding (FD-055).
5. Prepare Telegram bot alert integration (FD-047) with environment variable placeholders `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, awaiting credentials from founder before activation.
6. Note that `docs/20-deep-research-ta-social-listening-handoff.md` is excluded from this reconciliation and remains a separate documentation task.
