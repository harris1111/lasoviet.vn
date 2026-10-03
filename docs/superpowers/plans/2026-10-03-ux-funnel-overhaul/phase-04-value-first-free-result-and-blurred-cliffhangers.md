---
phase: 4
title: "Value-first free result and blurred cliffhangers"
status: pending
priority: P1
effort: "4d"
dependencies: [1, 2]
---

# Phase 4: Value-first free result and blurred cliffhangers

## Overview
Make `/la-so/{chartId}` give as much real, personal reading as AiTuvi before any ask, then stop **mid-sentence at the point of highest curiosity** behind a secure blur with an in-place unlock. Keeps FD-108/109: no prices in the page body; the money ask appears only in a locked preview or after the completion block. Mobile is one scrolling page; desktop keeps the six tabs with the chart in the left rail. Mobile-first.

## Benchmark (AiTuvi, measured 2026-10-03)
- Free overview ≈1,150 words, generated per chart with a visible "Đang luận giải…" state, naming the person's own stars and palaces.
- It ends mid-sentence on the **current decadal cycle** ("Bước vào đại vận hiện tại tại cung Tài Bạch… Sự hội t"). A "Luận giải toàn bộ (219k)" anchor button stays pinned at the top.
- No blur needed there: the cut itself is the hook. We do better by putting a real blur + in-place unlock exactly at the cut.

## Requirements
- Functional — page order (mobile scroll = desktop tab order):
  1. Chart (never blurred) + birth summary + "Sửa thông tin" link.
  2. **Tổng quan lá số** free prose, target 900–1,200 words, structured (Mệnh–Thân axis, strengths, tensions, how others see you), real star/palace names; streamed/revealed with a short "Đang luận giải lá số của {tên}…" state on first generation; cached afterwards.
  3. 12 palace scores (FD-107) with strongest/weakest named.
  4. Concern-matched palace read in full (FD-109b, existing `model.gift`).
  5. **Cliffhanger block "Năm 2026 và đại vận hiện tại của bạn"**: 2–3 real sentences from the engine (current đại vận palace, its main stars, the annual caution/favourable month counts already in `model.annual`), then the text continues into a fade that cuts mid-sentence; overlay: "Phần còn lại nằm trong Vận hạn năm 2026" + **[Mở đoạn này – 480 Lá]** (in-place, opens phase 5/6 sheet). This is the one in-body unlock allowed, because it sits inside a locked preview (FD-109d).
  6. Locked palace/topic map (title, score, one real line, state chip; no price on rows, FD-109c). Tap → preview sheet with server-clipped excerpt + blur + contextual unlock (phase 5).
  7. Completion block "Bạn đã đọc xong phần miễn phí" → what you read vs what exists (e.g. "Bạn đã đọc 2/12 cung, 0/4 chủ đề, 0/1 năm") → one door "Chọn luận giải cho lá số này".
  8. Mobile sticky bar appears only after (5) or (7) is reached (FD-109d), label "Mở luận giải đầy đủ".
- Guest vs signed-in (FD-105): guest gets everything above; sign-in gate ("Lưu lá số để không mất") appears after the overview, not before it, and unlocks the second insight + 60 Lá welcome grant (shown as "Bạn có 60 Lá tặng").
- Blur rules (2026-09-13 spec §5.2, kept): fade starts at a paragraph boundary except the deliberate mid-sentence cut in the cliffhanger; 3–6 blurred lines; locked plaintext never reaches the client (blur lines are server-generated filler or clipped real text per FD-059 secure-preview rules); screen readers get a short "Phần bị khoá: …" description.
- Non-functional: LCP of chart < 2.5s on 4G; overview may stream after; free AI cost within FD-109a ceilings (3,000 VND/chart version, 50,000 VND/day, cache).

## Architecture
- Backend: extend the free projection (`ziwei-free-preview-projection.ts`, `load-free-palace-gift.ts`) with `overview` (cached per chart version, generated once under the FD-109a reservation) and `periodTeaser` (deterministic engine facts + clipped first sentences of the 2026 reading if it exists, else deterministic teaser).
- Web: `ziwei-free-result.tsx` gains `FreeOverview` and `PeriodCliffhanger` components; existing `secure-locked-preview.tsx` used for the blur overlay.
- Reading-depth events from phase 2.

## Related Code Files
- Modify: `apps/web/src/features/ziwei/ziwei-free-result.tsx`, `ziwei-free-result-model.ts`, `ziwei-free-preview-projection.ts`, `secure-locked-preview.tsx`
- Modify: `apps/web/src/styles/free-result-read-first.css`
- Modify/Create (backend): free overview generation + cache in `packages/backend/src/ziwei/` (reuse free-gift reservation code)
- Modify: `prototype/revamp-2026-09/la-so-ket-qua-v2.*` first (prototype → founder look → code), per FD-098 working rule
- Tests: model tests, `tests/e2e/free-result-read-first.spec.ts`

## Implementation Steps
1. Update the prototype `la-so-ket-qua-v2` with blocks 2 and 5 (mobile 390 first, then desktop). Founder sees it once (single sign-off for this phase).
2. Backend overview generation with FD-109a reservation + cache; fallback = deterministic structural overview if the budget is exhausted (truthful, still long).
3. Period teaser projection.
4. Web components + CSS; sticky-bar trigger moves to reaching block 5 or 7.
5. Wire the cliffhanger CTA to the phase-5 unlock sheet. As of 2026-10-03 `ZIWEI-YEAR-2026-P0` and `ZIWEI-COMBO-2026-P0` are `availability: "reserved"` in `packages/contracts/src/la-catalog.ts`, so: while reserved → CTA targets `ZIWEI-IDENTITY-P0` "Tử Vi trọn đời – 960 Lá" (it covers đại vận + năm nay); once the year product is activated (LSV-58 topic/period delivery) → CTA switches to "Vận hạn 2026 – 480 Lá" with Trọn đời as the secondary option. Driven by catalog availability, not a code change.
6. E2E + visual check at 390 and 1440.

## Success Criteria
- [ ] Free overview ≥900 words, personal, renders on every new chart within budget; cached view costs 0.
- [ ] Cliffhanger cuts mid-sentence with blur and an in-place unlock that opens the sheet.
- [ ] No price anywhere in the page body outside locked previews/cliffhanger overlay.
- [ ] View-source / network contains no locked plaintext.
- [ ] Funnel (phase 2): `free_read_depth=100` and `locked_preview_open` measurable.

## Risk Assessment
- AI cost: hard ceilings already decided (FD-109a); deterministic fallback keeps UX intact when over budget.
- Quality: overview uses beginner-first writing rules (`2026-09-28-report-writing-rules-beginner-first.md`) and FD-089 content bans.
