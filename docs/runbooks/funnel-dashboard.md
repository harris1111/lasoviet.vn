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
| Baseline (before phase 1 live) | | | | | | | | | |
| Phase 1 money-path hotfix | | | | | | | | | |

## Privacy

Never add chart ids, names, birth fields, free text or report/evidence text to an event. The registry rejects unknown properties and `sanitizeAnalyticsProperties` strips forbidden keys; keep `concern` to fixed option ids (`self_understanding`, `career`, `love`).
