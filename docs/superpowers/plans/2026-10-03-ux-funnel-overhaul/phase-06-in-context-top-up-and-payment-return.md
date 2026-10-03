---
phase: 6
title: "In-context top-up and payment return"
status: pending
priority: P1
effort: "3d"
dependencies: [5]
---

# Phase 6: In-context top-up and payment return

## Overview
When the balance is short, finish the purchase inside the same unlock sheet: pick a pack → VietQR shown in the sheet → payment detected → the confirmed intent auto-completes (existing FD-105 continuation) → the sheet closes and the page scrolls to the unlocked part. Today the short-balance state links out to `/nap-la?pack=…&intent=…`, then `/thanh-toan/{orderId}`, then back — three page loads where a phone user often gets lost. Mobile-first.

## Requirements
- Functional
  - Short-balance state in `UnlockSheet`:
    - Line 1: "{Item} – {price} Lá · Bạn có {balance} Lá · Thiếu {gap} Lá".
    - Pack list (all 4, FD-066 values), **smallest covering pack preselected** (FD-066), the next pack up tagged "Tiết kiệm hơn · +{bonus} Lá tặng" (bonus framing allowed by FD-064). Show VND only here (FD-065 allows VND on packs).
    - After-purchase line: "Sau khi nạp, {item} mở ngay và bạn còn {balance+pack-price} Lá" (makes the bigger pack's leftover concrete).
    - CTA "Nạp {vnd} và mở {item}".
  - Payment step inside the sheet: QR, bank, account, amount, transfer note with copy buttons, countdown (order TTL), live status ("Đang chờ chuyển khoản…" → "Đã nhận tiền, đang mở…").
    - Mobile: "Mở app ngân hàng" deep-link list (VietQR app deep links) + "Lưu ảnh QR".
    - "Tôi đã chuyển khoản" → existing self-claim path (`payment-self-claim-form.tsx`) when the webhook is late.
  - On `continuation.status === "completed"`: close sheet, toast "Đã mở {item}", navigate/scroll to `returnAnchor` (report link for report SKUs, palace anchor for palace SKUs).
  - If the tab is closed mid-payment: existing `/thanh-toan/{orderId}` page and the continuation still complete server-side; the account library shows the item; phase 8 reminds.
  - `/nap-la` (standalone top-up, no intent) keeps working with the same pack component.
- Non-functional: no new money logic — reuse `POST /commerce/wallet/top-up-orders` with `continuation`, existing order status polling and webhook; idempotent order creation per intent (don't create a second order if one is pending for the same intent+pack — reuse it).

## Architecture
- New web route `POST /api/commerce/wallet/top-up-orders` (JSON proxy; the current `createTopUpOrder` server action redirects, which can't drive an in-sheet step). Returns checkout status (`safeParseCheckoutStatus`).
- Extract the QR/status UI from `vietqr-checkout.tsx` into `VietQrPanel` (embedded mode) used by both the sheet and `/thanh-toan/{orderId}`.
- Status polling reuses `GET /api/commerce/orders/{orderId}/status`.
- Backend: reuse a pending top-up order for the same `(owner, purchaseIntentId, packId)` instead of creating a new one.

## Related Code Files
- Create: `apps/web/src/app/api/commerce/wallet/top-up-orders/route.ts`, `apps/web/src/features/commerce/vietqr-panel.tsx`, `apps/web/src/features/commerce/pack-picker.tsx`
- Modify: `apps/web/src/features/commerce/unlock-sheet.tsx` (phase 5), `vietqr-checkout.tsx`, `create-topup-order.ts` (shared core), `la-packs.ts` (next-pack-up helper)
- Modify (backend): top-up order creation reuse in `packages/backend/src/commerce/`
- Tests: unit for pack recommendation + reuse; e2e with sandbox webhook (`COMMERCE_AUTO_APPROVE_TOPUPS` in staging) covering short balance → pay → auto-open.

## Implementation Steps
1. Backend order reuse + test.
2. JSON route for top-up orders.
3. `PackPicker` + `VietQrPanel` extraction; `/thanh-toan` page uses the panel (no visual regression).
4. Short-balance + payment steps in `UnlockSheet`; completion handling and scroll-to-anchor.
5. Mobile bank deep links + save-QR.
6. E2E on staging with auto-approve.

## Success Criteria
- [ ] Short balance → paid → item unlocked without leaving the page (staging, 390px and 1440px).
- [ ] Re-opening the sheet during a pending payment shows the same QR/order, not a new one.
- [ ] Closing the tab mid-payment still results in the item unlocked after payment.
- [ ] Funnel steps 5→9 measurable in one session.

## Risk Assessment
- Money path: only presentation moves into the sheet; settlement, ledger and continuation stay server-side and unchanged (FD-105 1.1/1.2). Must pass the existing commerce test suite unchanged.
- Self-run business (no manual ops): late webhooks resolve via self-claim + continuation; nothing requires a human.
