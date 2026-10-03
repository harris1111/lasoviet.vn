---
phase: 7
title: "Waiting room reader and post-purchase upsell"
status: pending
priority: P2
effort: "3d"
dependencies: [5, 6]
---

# Phase 7: Waiting room, reader and post-purchase upsell

## Overview
After paying, the customer must (a) see value immediately even if the report is still generating and (b) meet the next relevant purchase at natural break points. Builds on the FD-104 interactive reader and `reader-upgrade.tsx`. Mobile-first.

## Requirements
- Functional
  - **Waiting room** (report status `queued|generating`): progress with real stages ("Đang an sao → Đang viết 12 cung → Đang soát lại"), estimated time, and readable content meanwhile: the free overview, the bought palace's facts and score, the evidence matrix. Auto-switch to the report when ready (poll/SSE), plus "Báo tôi khi xong" (email if signed in).
  - Failure: auto-retry per existing paid retry rules; if final failure, Lá restored automatically and message says so (no manual ops).
  - **Reader upsell placements** (2026-09-13 spec §5.4, FD-105):
    - Single palace / Bản mệnh reader: after the first full section → "Bạn đã mở {n}/12 phần" + "Tử Vi trọn đời chỉ thêm {quote} Lá (đã trừ {credit} Lá)" via `UnlockSheet`.
    - Locked sections inside the reader show title + clipped excerpt + blur + in-place unlock (same component as phase 5).
    - End of report: next logical product — Trọn đời owner → "Vận hạn 2026" / combo (when active) or membership "Hôm nay của bạn" (when active); otherwise Trọn đời.
    - Lá-back guarantee (FD-105): "Không đúng" control per part, items < 500 Lá, 24h — keep visible, it raises trust for the next purchase.
  - Residual balance nudge (exists: `residual-balance.ts`): "Bạn còn {n} Lá — đủ mở cung {suggested}" with one-tap unlock.
- Non-functional: upsell never interrupts reading (no modal on scroll); max one inline offer per screen-height on mobile.

## Related Code Files
- Modify: `apps/web/src/features/reports/report-reader.tsx`, `reader-upgrade.tsx`, `report-progress.tsx`, `topic-report-reader.tsx`, `period-report-reader.tsx`, `features/commerce/residual-balance.ts`
- Modify: `apps/web/src/app/[locale]/bao-cao/[reportId]/page.tsx`
- Tests: `tests/e2e/reader-upgrade.spec.ts`, `paid-report-html.spec.ts`

## Implementation Steps
1. Waiting-room states in `report-progress.tsx` with the free content blocks.
2. Replace reader upgrade CTA with `UnlockSheet` + quote API.
3. End-of-report next-product resolver (pure function, unit tested, availability-driven).
4. Residual-balance one-tap unlock.
5. E2E: buy Bản mệnh → read → upgrade to Trọn đời paying only the difference.

## Success Criteria
- [ ] No blank wait screen; report opens automatically when ready.
- [ ] Upgrade price in reader equals charged amount (quote API).
- [ ] `trackUpgradeView`/`trackUpgradePurchased` fire; upgrade rate visible in phase-2 runbook.

## Risk Assessment
- Over-selling inside paid content hurts trust → placement caps above; measure part-feedback "Không đúng" rate before/after.
