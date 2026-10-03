---
phase: 1
title: "Money-path hotfix"
status: pending
priority: P1
effort: "1.5d"
dependencies: []
---

# Phase 1: Money-path hotfix

## Overview
Repair the defects found by the 2026-10-03 debug pass that block purchases today. Ship as one PR, no design change, no founder design review needed (bug fix). Mobile-first verification.

## Requirements
- Functional: every button on `/la-so/{id}/chon-luan-giai` and `/nap-la` does what its label says; tabs switch on client-side navigation; any reading offer can be bought; any top-up pack can be bought; the unlock dialog never ends in an unexplained dead end.
- Non-functional: no inline `<script>` for behaviour; works after soft navigation; 390px and 1440px.

## Root causes (verified by reading code 2026-10-03)
1. `apps/web/src/features/reports/paid-topic-selector.tsx` is a server component. Selection is hard-coded (`selectedReading = "ziwei-comprehensive"`, `selectedPackId`, `selectedMembershipId`, lines 99-101). Cards have no click handlers; `radio-circle` never fills.
2. Unlock button renders only when `isSelected` (line 436) → "Bản mệnh 240 Lá" card never shows a buy button.
3. Tab switching is an inline `<script dangerouslySetInnerHTML>` (line 802). React does not execute it on client navigation (the free-result "Chọn chủ đề luận giải" is a `<Link>`), so tabs are dead. On hard loads it looks up `paybar-sum-*`/`paybar-btn-*` ids that do not exist, so the paybar never follows the tab.
4. Paybar content is chosen from the server-side `activeTab` only → on the chart page, the "Nạp Lá" tab shows packs but no top-up button.
5. `/nap-la` pack cards are `<div aria-pressed>` with no handler → only the default pack (`LA-DISCOVER-3000`) or the URL `?pack=` is purchasable.
6. `wallet-unlock-dialog.tsx` maps every non-401 failure of `POST /api/commerce/wallet/purchase-intents` or `GET /api/commerce/wallet/balance` to `genericError` with no code, no retry.
7. Prime suspect for the observed error: `packages/backend/src/commerce/wallet-unlock.service.ts:537` returns `WALLET_INTENT_VERSION_CONFLICT` forever when a pending intent exists for the same chart+sku but a different `chartVersionId` (chart recalculated). Stale intents with a changed price are auto-cancelled (line 540) but version/locale changes are not. Other possible codes: `WALLET_EVIDENCE_MISSING`, `WALLET_CHART_NOT_FOUND`.
8. Free-result evidence tab (`ziwei-free-result.tsx:297`) renders a raw `<details>` with N identical "Xem căn cứ" buttons and no labels.

## Architecture
- Split `PaidTopicSelector` into a server wrapper (data, translations resolved to plain props) and a `"use client"` `PaidTopicSelectorClient` holding `activeTab`, `selectedOfferKey`, `selectedPackId` in state. Tab buttons use `onClick`; sync `?tab=` and `?pack=` via `router.replace(..., { scroll: false })` so a refresh keeps the selection.
- Cards become `<button role="radio">` inside `role="radiogroup"` (keyboard arrows), selected state fills the radio.
- Paybar renders from client state for all three tabs. Unlock button lives in the paybar AND on each card (card button = select + open dialog).
- Top-up form stays a server action (`createTopUpOrderFormAction`), `packId` from client state.
- Note: `checkout-offer.ts` imports `server-only`; compute SKUs in the server wrapper and pass them down as props.

## Related Code Files
- Modify: `apps/web/src/features/reports/paid-topic-selector.tsx` (server wrapper only)
- Create: `apps/web/src/features/reports/paid-topic-selector-client.tsx`
- Modify: `apps/web/src/features/commerce/wallet-unlock-dialog.tsx` (error codes, retry, intent-conflict recovery)
- Modify: `apps/web/src/app/api/commerce/wallet/purchase-intents/route.ts`, `.../balance/route.ts` (always return `{ code }` JSON, map unknown errors to `{ code: "UPSTREAM_UNAVAILABLE" }` 502 instead of throwing)
- Modify: `packages/backend/src/commerce/wallet-unlock.service.ts` (cancel stale pending intent on `chartVersionId`/`locale` mismatch the same way as price change)
- Modify: `apps/web/src/features/ziwei/ziwei-free-result.tsx` evidence panel (labelled cards, reuse markup/CSS of `ziwei-evidence-tab.tsx` `evidence-cards-matrix`)
- Modify: `apps/web/messages/{vi,en}/reports.json` (error copy per code)
- Tests: `paid-topic-selector.test.tsx`, `wallet-unlock-dialog.test.ts`, backend `wallet-unlock.service` tests, `tests/e2e/wallet-unlock-dialog-viewport.spec.ts`

## Implementation Steps
1. Backend: in `createPurchaseIntent`, when a pending intent differs only by `chartVersionId` or `locale`, cancel it (status `cancelled`, `stateVersion+1`) and create a fresh one. Unit test: recalculated chart → new intent succeeds.
2. Web API proxies: never `throw` past the route; return `{ code }` with the upstream status, 502 + `UPSTREAM_UNAVAILABLE` for network errors. Log `code` + `requestId` server-side.
3. Dialog: keep `code` in error state; map known codes to plain Vietnamese (`WALLET_CHART_NOT_FOUND` → "Lá số này không thuộc tài khoản đang đăng nhập", `WALLET_EVIDENCE_MISSING` → "Lá số đang được chuẩn bị, thử lại sau vài giây", default → "Chưa mở được. Mã: XXX"). Add "Thử lại" (remount with new key) and "Nhắn hỗ trợ" (Messenger/email from `config/customer-contact.json`).
4. Build `PaidTopicSelectorClient` per Architecture; delete the inline script.
5. Every unowned offer card gets its own CTA ("Mở Bản mệnh – 240 Lá"); paybar mirrors the selected card.
6. `/nap-la`: packs selectable; default = `?pack=` or smallest pack covering `?price - balance`, else `LA-START-1100` (most popular entry), CTA "Nạp {vnd}".
7. Evidence panel: one card per evidence item with the insight title, source number and its drawer button.
8. Add an e2e: soft-navigate from free result → selection page → click each tab → paybar text changes → select Bản mệnh → dialog opens.

## Success Criteria
- [ ] From the chart page link (soft navigation) all three tabs switch and the paybar follows, on 390px and 1440px.
- [ ] Both reading cards can open the unlock dialog; selection is visible (filled radio + gold border).
- [ ] All four packs selectable and purchasable on `/nap-la` and in the selection page top-up tab.
- [ ] Recalculated chart no longer produces a permanent unlock error (backend test).
- [ ] Dialog errors show a code + retry; no generic dead end.
- [ ] Evidence tab shows labelled cards.
- [ ] `pnpm i18n:check && pnpm lint && pnpm typecheck && pnpm test` green.

## Risk Assessment
- Root cause of the founder's error may be another code → the code display in step 3 makes the next occurrence self-diagnosing; ask An to grep API logs for `WALLET_` codes on 2026-10-03 to confirm.
- Splitting server/client must not leak `server-only` modules to the client bundle → pass resolved SKUs as props.
