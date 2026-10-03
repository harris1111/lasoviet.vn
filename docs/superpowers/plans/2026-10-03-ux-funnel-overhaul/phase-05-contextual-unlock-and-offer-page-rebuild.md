---
phase: 5
title: "Contextual unlock and offer page rebuild"
status: pending
priority: P1
effort: "4d"
dependencies: [1]
---

# Phase 5: Contextual unlock and offer page rebuild

## Overview
Sell the exact thing the visitor is curious about, where they are curious, and turn `/la-so/{id}/chon-luan-giai` into a real price ladder. Today the backend can sell 12 single palaces at 120 Lá (`availability: "active"`) but no web surface offers them; the preview sheet of a locked palace/topic only links to a page that sells Bản mệnh/“Toàn diện”. **Needs founder decision #1 in plan.md.** Mobile-first.

## Requirements
- Functional
  - **Locked preview sheet** (palace / topic / period), opened from the free result map or the cliffhanger:
    - Header: item name + score + 1 real line; clipped real excerpt + blur (secure, FD-059).
    - Primary CTA = this item: "Mở cung Phu Thê – 120 Lá" (palace), "Mở Tình duyên – 480 Lá" (topic, when active), "Mở Vận hạn 2026 – 480 Lá" (period, when active).
    - Secondary CTA = anchor up: "Hoặc mở Tử Vi trọn đời – 960 Lá (gồm cung này + 11 cung khác + đại vận)".
    - Rollover line when true (FD-105): "Bạn đã mở 240 Lá trong 7 ngày qua — Tử Vi trọn đời chỉ còn thêm 720 Lá".
    - Both CTAs open the unlock sheet (phase 6) — never navigate away.
  - **Offer page `chon-luan-giai`** (Lá only, FD-065), ordered as a ladder, Trọn đời pre-selected and labelled "Đáng nhất":
    1. Một cung — 120 Lá (opens a palace picker: 12 palaces with score; owned ones marked)
    2. Bản mệnh — 240 Lá
    3. Chủ đề: Tình duyên / Công việc & tài lộc — 480 Lá each (shown "Sắp mở" until catalog `active`)
    4. **Tử Vi trọn đời — 960 Lá** (rename from "Toàn diện", FD-105 customer name), shows "= 8 cung lẻ" comparison
    5. Combo Trọn đời + Vận hạn 2026 — 1,300 Lá (when active)
    - Accepts `?offer=<key>&palace=<id>` deep links and preselects (from preview sheets, emails, phase 8).
    - Owned items show "Đọc lại"; partial ownership shows the real remaining price (rollover).
    - Balance pill + "Thiếu N Lá" in the paybar, as today, but driven by the selected item.
  - **Naming**: "Toàn diện" → "Tử Vi trọn đời" everywhere customer-facing (`reports.json`, `purchase-offer-presentation.ts`).
- Non-functional: one sheet component reused on free result, offer page, reader; bottom sheet ≤85vh on mobile with drag handle; dialog on desktop; focus trap; Esc/backdrop close.

## Architecture
- `UnlockSheet` (client) = evolution of `wallet-unlock-dialog.tsx`: props `{ chartId, chartVersionId, sku, secondarySku?, itemName, returnAnchor }`. States: loading → confirm | short_balance (phase 6 inline top-up) | error(code).
- Offer catalogue for the page built server-side from `LA_PRODUCT_CATALOG` + ownership + rollover quote (backend `price()` already computes rollover; expose a read-only quote endpoint `GET /commerce/wallet/quotes?chartId=` returning `{ sku, priceLa, basePriceLa, creditLa }[]` so the UI never hard-codes 720).
- `checkout-offer.ts` public offer keys extended for palace/topic/period/combo; keep `server-only`.

## Related Code Files
- Create: `apps/web/src/features/commerce/unlock-sheet.tsx` (from `wallet-unlock-dialog.tsx`), `apps/web/src/features/reports/offer-ladder.tsx`, `apps/web/src/features/reports/palace-picker.tsx`
- Modify: `apps/web/src/features/reports/paid-topic-selector-client.tsx` (from phase 1), `purchase-offer-presentation.ts`, `features/commerce/checkout-offer.ts`, `ziwei-free-result.tsx` (preview dialog CTAs)
- Create (API): quote endpoint in `apps/api/src/commerce/commerce.controller.ts` + web proxy `apps/web/src/app/api/commerce/wallet/quotes/route.ts`
- Modify: `apps/web/messages/{vi,en}/reports.json`
- Docs: tracker entry amending FD-109c/d after founder sign-off (overwrite superseded text in the free-result spec §6.7 per doc rule)

## Implementation Steps
1. Founder decision #1 recorded as an FD; update `2026-09-28-free-result-page-design.md` text.
2. Quote endpoint (reads `price()`; no writes — note `price()` writes for MONTHLY revocation, so add a pure variant).
3. `UnlockSheet` + mobile bottom-sheet styling; replace `WalletUnlockButton` usages (selector, reader-upgrade, daily panel, membership panel).
4. Preview-sheet CTAs on the free result.
5. Offer ladder page with deep-link preselect and palace picker.
6. Rename to "Tử Vi trọn đời".
7. Tests: unit (ladder ordering, rollover display from quote), e2e (palace preview → sheet → confirm with seeded balance → report).

## Success Criteria
- [ ] A locked palace can be bought for 120 Lá from its own preview without leaving the page.
- [ ] Offer page lists the full active ladder; reserved items show "Sắp mở" and cannot be bought.
- [ ] Rollover price comes from the API quote and matches what is charged.
- [ ] No VND on any content surface (FD-065).

## Risk Assessment
- Twelve buyable palaces could cannibalise Trọn đời → mitigated by the anchor-up secondary CTA and the rollover credit ("mua lẻ rồi vẫn được trừ"); watch phase-2 funnel mix (share of 960 vs 120 orders) for 2 weeks.
- Reserved products must never be sold before content exists → availability check server-side in `walletIntentRequest` already enforces it.
