# Funnel dashboard: how to read the customer funnel

Source of truth: table `analytics_events` (see `packages/database/src/schema/analytics.ts`). Event names and allowed properties live in `config/analytics-events.json` (registry, privacy-filtered, no birth data or chart ids). Money steps (`checkout_created`, `payment_confirmed`, `la_spent`) are written server-side and are the reliable ones; upper-funnel steps are browser events and lose a few percent to ad blockers.

Plan: `docs/superpowers/plans/2026-10-03-ux-funnel-overhaul/` (phase 2).

## Steps

| # | Step | Event | Filter |
|---|------|-------|--------|
| 1 | Visit | `landing` | |
| 2 | Chart form submitted | `chart_form_submit` | |
| 3 | Chart created | `chart_success` | |
| 4 | Read the free result | `free_result_interaction` | `properties->>'stage' = 'engaged'` |
| 5 | Went to the offer page | `free_result_interaction` | `properties->>'stage' = 'door'` |
| 6 | Opened a locked preview | `locked_preview_view` | |
| 7 | Saw the unlock dialog | `unlock_confirm_view` | |
| 8 | Chose a top-up pack | `pack_selected` | |
| 9 | Top-up order created | `checkout_created` | |
| 10 | Top-up paid | `payment_confirmed` | |
| 11 | Unlock confirmed | `unlock_confirmed` | |
| 12 | Opened the report | `report_opened` | |
| 13 | Bought an upgrade | `upgrade_purchased` | |

Side signal (not a step): `unlock_error` with `error_code`. Every dead end in the unlock dialog lands here; a non-zero count is a bug to look at the same day.

## Query: people per step

A person is `COALESCE(user_id, visitor_id)`, so a visitor who signs in mid-funnel is counted once. Change the date range and run it on the production database (read-only).

```sql
WITH steps(ord, label, event, stage) AS (
  VALUES
    (1,  'Visit',                  'landing',                 NULL),
    (2,  'Chart form submitted',   'chart_form_submit',       NULL),
    (3,  'Chart created',          'chart_success',           NULL),
    (4,  'Read free result',       'free_result_interaction', 'engaged'),
    (5,  'Went to offer page',     'free_result_interaction', 'door'),
    (6,  'Opened locked preview',  'locked_preview_view',     NULL),
    (7,  'Saw unlock dialog',      'unlock_confirm_view',     NULL),
    (8,  'Chose top-up pack',      'pack_selected',           NULL),
    (9,  'Top-up order created',   'checkout_created',        NULL),
    (10, 'Top-up paid',            'payment_confirmed',       NULL),
    (11, 'Unlock confirmed',       'unlock_confirmed',        NULL),
    (12, 'Opened report',          'report_opened',           NULL),
    (13, 'Bought upgrade',         'upgrade_purchased',       NULL)
),
people AS (
  SELECT s.ord, s.label,
         COUNT(DISTINCT COALESCE(e.user_id, e.visitor_id)) AS people
  FROM steps s
  LEFT JOIN analytics_events e
    ON e.name = s.event
   AND (s.stage IS NULL OR e.properties->>'stage' = s.stage)
   AND e.occurred_at >= TIMESTAMPTZ '2026-10-04 00:00+07'
   AND e.occurred_at <  TIMESTAMPTZ '2026-10-11 00:00+07'
  GROUP BY s.ord, s.label
)
SELECT ord, label, people,
       ROUND(100.0 * people / NULLIF(LAG(people) OVER (ORDER BY ord), 0), 1) AS pct_of_previous,
       ROUND(100.0 * people / NULLIF(FIRST_VALUE(people) OVER (ORDER BY ord), 0), 1) AS pct_of_visits
FROM people
ORDER BY ord;
```

Reading it: steps are not strictly nested (steps 8-10 only apply to people short of Lá; step 7 only to people who clicked unlock), so read `pct_of_previous` as a signal, not a law. The biggest drop between two neighbouring steps is where to look first.

## Query: unlock dialog dead ends

```sql
SELECT properties->>'error_code' AS error_code,
       properties->>'sku'        AS sku,
       COUNT(*)                  AS times,
       COUNT(DISTINCT COALESCE(user_id, visitor_id)) AS people
FROM analytics_events
WHERE name = 'unlock_error'
  AND occurred_at >= now() - interval '7 days'
GROUP BY 1, 2
ORDER BY times DESC;
```

Codes: `WALLET_CHART_NOT_FOUND` (wrong account), `WALLET_EVIDENCE_MISSING` (chart still preparing), `WALLET_INTENT_VERSION_CONFLICT` (stale selection), `PRIVATE_API_UNREACHABLE` / `UPSTREAM_UNAVAILABLE` / `NETWORK_ERROR` (service down), `UNKNOWN` (no code returned).

## Baseline and per-phase record

Fill in after each release so every later phase is judged against numbers. Window: 7 full days, Vietnam time.

| Phase shipped | Date live | Window | Visits | Chart created | Door | Dialog | Top-up paid | Unlock confirmed | Notes |
|---------------|-----------|--------|--------|---------------|------|--------|-------------|------------------|-------|
| Baseline (before phase 1 live) | Unavailable | No consistently instrumented, QA-separated pre-release window | — | — | — | — | — | — | Historical telemetry is recorded below; do not invent missing baseline values. |
| Phase 1 money-path hotfix | Included in deployed release 3d4cb47 on 2026-10-03 | Sept 27–Oct 3 Vietnam time, mixed historical window | 144 | 91 | 3 | 3 | 1, provider provenance unverified | 3 | Overlapping releases and QA; descriptive counts only. |

## Privacy

Never add chart ids, names, birth fields, free text or report/evidence text to an event. The registry rejects unknown properties and `sanitizeAnalyticsProperties` strips forbidden keys; keep `concern` to fixed option ids (`self_understanding`, `career`, `love`).

## Recorded telemetry snapshot (2026-10-03)

Read-only host query: 2026-09-27 00:00 through 2026-10-04 00:00 Vietnam time (end exclusive); excludes `device_class=bot`. This is a completed seven-day **mixed operational/QA telemetry window with unclassified customer traffic**, not a clean pre-release customer baseline. Homepage-submit instrumentation arrived during the window, and synthetic browser checks contribute to counts. Missing events mean zero stored events, not proof that no such user action happened. With `SEPAY_ENV=disabled` and auto-approval enabled, recorded payments do not establish real bank revenue.

| Step | Stored events | Distinct observed identities |
|---|---:|---:|
| Visit | 1124 | 144 |
| Homepage form | 2 | 2 |
| Chart created | 130 | 91 |
| Engaged free reading | 3 | 2 |
| Offer door | 7 | 3 |
| Locked preview | 0 | 0 |
| Unlock dialog | 5 | 3 |
| Pack selected | 132 | 9 |
| Checkout created | 28 | 6 |
| Payment recorded | 1 | 1 |
| Unlock confirmed | 5 | 3 |
| Report opened | 37 | 6 |
| Upgrade purchased | 0 | 0 |

Do not calculate a customer conversion rate from this snapshot. In particular, the two homepage submissions and 91 chart identities cover different instrumentation periods. Historical QA/customer traffic cannot be reliably separated from the stored rows. `unlock_error` has no stored rows for the October 3 Vietnam-time window; that does not rule out the reported error. An uncontaminated post-release baseline requires consistent instrumentation and traffic classification. Monetary counts require actual authenticated provider acceptance first.

Private raw aggregate evidence: `/home/debian/projects/lasoviet-overnight-evidence-20261003/funnel-baseline.json`; no account, visitor, birth or report identifiers exported.

## Committed rollover upgrades (LSV57/78 durable delivery)

The wallet transaction enqueues `wallet.upgrade.committed.v1` atomically with a new qualifying spend and immutable receipt. The existing worker schedule delivers `upgrade_purchased` from validated receipt/posted-spend proof, independently of the browser response. Browser analytics ingestion rejects that financial event. One receipt represents one purchase, with a stable opaque event key and the original committed time. Replaying the wallet command does not create another event. `amount` is the actual charged La, `currency` is `LA`, and `credit_amount` is the applied rollover credit; this is not VND bank revenue. `source_sku` is the largest applied credit source (SKU/spend-ID tie break); `source_skus` is the complete unique sorted credited set. Do not sum the purchase amount once for each source.

Credit is allocated oldest spend first, then SKU and spend ID, and capped at 960 La. A partially credited spend contributes only its applied amount. Later source restoration does not rewrite the historical credit proof. Membership discounts, included access, old receipts without proof, browser navigation and quotes produce no upgrade event.

Direct commands, zero-charge rollover and the shared top-up settlement continuation use the same producer. Failed settlement rolls back the upgrade outbox record. The worker atomically records analytics and acknowledges its fenced lease, retries transient delivery failures and rejects corrupt authority with redacted codes. It uses a server-owned account business visitor with no fabricated consent timestamp, birth profile, cookie, IP, user agent, route or campaign attribution; the account remains the funnel counting identity. Official purge shares a coordination fence with delivery and removes pending/processed upgrade payloads. An exact prior receipt event keeps its original attribution; conflicts are not overwritten. No historical receipt backfill is performed. Deployment evidence belongs in LSV57/78 before this release is called accepted. Existing historical browser-origin upgrade rows cannot be retrospectively treated as trusted receipts; evaluate the recorded release window separately. Continue treating QA traffic and disabled-provider auto-approved top-ups separately from real customer conversion and revenue.


## Recovery attribution boundary (LSV79)

The in-app pending-unlock hint is read-only and restricted to account, offer-selection and paid-reader surfaces. It opens the selected offer/palace with `resume=1`; confirmation refreshes authorized terms and still requires explicit spend/top-up consent. No notification or order is created by the hint.

`notification_deliveries.status = 'captured'` is a test capture, not an outbound send or a click. A paid order within a reminder time window is not evidence of recovered revenue. The existing browser collector records the pathname without a durable UTM-to-order binding, so do not report `utm_source=reminder` revenue as attributed until a consented click receipt is persisted and matched to its authorized continuation/order. Keep captured, sent, clicked and attributed paid counts separate. Technical financial lineage is described below; real outbound/provider acceptance and free-chart follow-up remain pending.

## Durable reminder click receipts (LSV79 capture milestone)

New captures carry `utm_source=reminder` for readable campaign labeling and an opaque random delivery ID in the URL fragment. The browser removes that fragment and POSTs an idempotent receipt through the verified private boundary. A bare UTM parameter cannot create a receipt. Admission rechecks owner, current offers consent/preferences, exact active chart/version, unchanged pending continuation and unexpired order under deletion/settlement coordination. Each order has at most one receipt; replay preserves its original classification and time. Capture clicks remain `captured_click` even if a delivery later changes status.

Read-only aggregate example (no identifiers or customer content):

```sql
SELECT d.status AS delivery_state, count(*) AS reminders
FROM notification_deliveries d WHERE d.kind = 'recovery_pending_topup'
GROUP BY d.status;
SELECT source, classification, count(*) AS eligible_receipts
FROM recovery_click_receipts GROUP BY source, classification;
```

Keep captured, sent and eligible-click counts separate. Capture clicks never qualify for monetary projection, even if the delivery later changes status. Official purge removes click receipts before deliveries, with retained financial records unchanged. Customer outbound delivery and the phase04 free-chart follow-up remain held.

## Trusted reminder conversion accounting (LSV79 technical lineage)

New authenticated SePay acceptance stores immutable versioned provenance at the validated adapter boundary: configured sandbox/production environment, bank HMAC or hosted IPN shared-secret authentication, channel and `authenticatedAcceptedAt`. Failed/mixed authentication or invalid payload never reaches persistence. Unmatched payment self-claim preserves the original provenance and acceptance time. Historical, auto-approved and metadata-free repository callers remain null; replay cannot upgrade a sandbox/null source to production. Provider body fields cannot supply provenance. No historical backfill is authorized.

The bounded scheduled projector requires configured production mode **and** stored authenticated production provenance, an immutable `clicked` receipt from a sent reminder, current offers consent/preferences and no deletion marker. It validates exact owner/order/intent/chart, acceptance after click, paid amount/currency, posted grant/ledger/immutable receipt and committed continuation/spend authority. The adapter does not parse bank transfer time: this establishes click before authenticated webhook acceptance, not click before the actual bank transfer. A late self-claim never replaces the earlier acceptance time. Least-checked ordering rotates ineligible committed sources before LIMIT so they cannot indefinitely starve a valid conversion.

Each exact order/payment/spend has at most one historical projection. `paid_vnd` is that top-up's accepted cash amount, `charged_la` is the converted content's entire Lá charge, and `recognized_vnd` sums only posted spend allocations from the credit lots of **that exact recovery order**. Other top-up lots in the same spend are excluded. These are three separate units/accounting meanings, not incremental uplift or net cash revenue. Subsequent refunds remain separate append-only restoration accounting and do not silently rewrite this historical conversion. Join existing restoration allocations for net accounting; never present the stored gross metric as net.

```sql
SELECT count(*) AS historically_attributed_orders,
       sum(paid_vnd) AS accepted_topup_vnd,
       sum(charged_la) AS converted_content_la,
       sum(recognized_vnd) AS posted_recognition_from_exact_order_vnd
FROM recovery_click_receipts
WHERE classification = 'clicked' AND attributed_at IS NOT NULL;
```

This technical change does not alter production provider/capture settings, send customer reminders or establish live SePay acceptance. Published isolated fixtures are explicitly synthetic authenticated acceptance; do not include them in customer/revenue reporting. Full LSV79 remains In Review for the held free-chart and real outbound/provider acceptance.

## LSV75 reading diagnostics

`free_read_depth` with `percent=100` means the visible, foreground reader reached the completion block; it is not proof of comprehension. `locked_preview_open` records one deliberately opened palace/topic/period preview per mounted result, including direct preview navigation. Both carry only locale, source kind and a closed section identifier when applicable; no chart identity or prose is included. The established `free_result_interaction` engaged/door funnel remains unchanged.
