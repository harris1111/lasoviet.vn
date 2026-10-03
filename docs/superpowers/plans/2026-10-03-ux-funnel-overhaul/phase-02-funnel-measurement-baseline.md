---
phase: 2
title: "Funnel measurement baseline"
status: pending
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 2: Funnel measurement baseline

## Overview
One funnel with one event per step, so every later phase can be judged by numbers, not opinion. Reuse `apps/web/src/features/analytics/funnel-analytics.ts` and `server-funnel-analytics.ts`; add only the missing steps.

## Requirements
- Functional: a single ordered funnel, keyed by an anonymous funnel id that survives sign-in and payment redirects.
- Non-functional: no PII in properties (no birth date, no name); `chartId` hashed or omitted.

## Architecture
Steps and event names (existing ones kept, new ones marked NEW):

| # | Step | Event |
|---|---|---|
| 1 | Homepage form submitted | `chart_form_submit` NEW (props: `entry`=`homepage|wizard|tool`, `concern`) |
| 2 | Free chart rendered | `free_result_view` NEW |
| 3 | Read 50% / 100% of free layer | `free_read_depth` NEW (`depth`=50|100) |
| 4 | Locked preview opened | `locked_preview_open` NEW (`kind`=palace|topic|period, `sku`) |
| 5 | Unlock dialog shown | `trackUnlockConfirmView` / `trackTopupView` (existing) |
| 6 | Pack chosen | `trackPackSelected` (existing) |
| 7 | Top-up order created | server `checkout_created` (existing) |
| 8 | Paid | server webhook event (existing; verify name) |
| 9 | Unlock completed | `trackUnlockConfirmed` (existing) + server continuation completed |
| 10 | Report first read | `report_read_start` NEW |
| 11 | Upsell shown / bought | `trackUpgradeView` / `trackUpgradePurchased` (existing) |
| — | Any error in dialog | `unlock_error` NEW (`code`) |

## Related Code Files
- Modify: `apps/web/src/features/analytics/funnel-analytics.ts` (+ tests)
- Modify: emitters in `homepage-v3-birth-form.tsx`, `ziwei-free-result.tsx`, `wallet-unlock-dialog.tsx`, report reader
- Create: `docs/runbooks/funnel-dashboard.md` (how to read the funnel; query or dashboard link)

## Implementation Steps
1. Confirm which analytics sink is live (read `analytics-collector.tsx`) and the payment-success event name in the API.
2. Add NEW events with zod-typed props, unit tests like existing ones.
3. Wire emitters; `free_read_depth` via `IntersectionObserver` on the completion block and midpoint.
4. Write the runbook with a one-screen funnel table (count + step conversion), daily.
5. Record a 7-day baseline before phases 3–6 ship (phase 1 can ship before; mark its date).

## Success Criteria
- [ ] Each step fires once per real action in a staging run (checked in network tab / collector).
- [ ] Baseline numbers written into the runbook with dates.
- [ ] No PII in any payload (test asserts allowed keys).

## Risk Assessment
- Ad blockers drop client events → server-side events (order created, paid, unlock) are the source of truth for money; client events only for upper funnel.
