---
phase: 8
title: "Recovery loops"
status: pending
priority: P2
effort: "2d"
dependencies: [2, 6]
---

# Phase 8: Recovery loops

## Overview
Bring back visitors who stopped one step before paying. Every loop deep-links into the exact item (phase 5 `?offer=&palace=`) and runs without anyone operating it. Uses the existing worker/outbox and notification + unsubscribe infrastructure.

## Requirements
- Functional
  1. **Pending top-up**: order `pending` 30 min after creation and the account has email consent → one email/notification: "Đơn nạp {vnd} cho {item} vẫn đang chờ" → link to the same `/thanh-toan/{orderId}` (or a fresh order if expired). Once only.
  2. **Short-balance abandon**: unlock sheet shown in `short_balance`, no order created, signed-in → next visit to any page shows a slim banner "Bạn đang xem {item} – còn thiếu {gap} Lá" (client-side via last intent from API, no email).
  3. **Free chart, no purchase, signed-in**: +24h one email with the person's own cliffhanger sentence (from phase 4 teaser, no locked plaintext) → link to the cliffhanger anchor.
  4. **Guest**: the existing 24h deletion banner (`guest-24h-deletion-banner.tsx`) becomes the save prompt ("Lưu lá số để đọc tiếp, tặng 60 Lá") — it is the sign-in gate, not a money ask (FD-109d).
- Non-functional: every email has unsubscribe; at most 2 marketing emails per chart; no message to accounts without consent; no fake urgency (FD-064 legal limit).

## Related Code Files
- Modify/Create: worker jobs in `apps/worker/` (pending-order reminder, free-chart follow-up) via outbox events
- Modify: notification templates in `packages/backend` (find the existing unsubscribe-capable templates)
- Modify: `apps/web/src/features/ziwei/guest-24h-deletion-banner.tsx`
- Create: `apps/web/src/features/commerce/pending-unlock-banner.tsx`
- Tests: worker unit tests; `tests/e2e/notification-unsubscribe.spec.ts` extended

## Implementation Steps
1. Locate existing notification/outbox job pattern in `apps/worker` and reuse it.
2. Implement loops 1 and 3 as scheduled outbox jobs with idempotency keys (`reminder:{orderId}`, `followup:{chartVersionId}`).
3. Loop 2 banner (reads latest pending intent for the account).
4. Loop 4 copy/CTA change.
5. Add funnel attribution `utm_source=reminder|followup` to links.

## Success Criteria
- [ ] Each loop fires once per qualifying case in staging, never for unconsented accounts.
- [ ] Links land on the exact item with the sheet ready.
- [ ] Recovered revenue visible in the phase-2 runbook by `utm_source`.

## Risk Assessment
- Email deliverability / spam: low volume, single sends, unsubscribe; sender domain already used for transactional mail (verify SPF/DKIM before enabling).
