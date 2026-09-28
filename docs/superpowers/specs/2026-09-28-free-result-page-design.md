# Free Result Page ("Lá số của bạn") — Mobile-First Design Spec

**Date:** 2026-09-28
**Status:** Direction approved by the founder 2026-09-28 (mobile scroll + desktop tabs, free scores, FD-108). Clickable prototype approved to start; no production UI code until the founder signs off the prototype (§10).
**Owner:** An (implementation). Lãm/Harris (acceptance, FD-056 visual sign-off).
**Page:** `/la-so/[chartId]` (`apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`, `apps/web/src/features/ziwei/`).
**Governing rules, in order of precedence:**
1. FD-105 "Bậc thang Lá" funnel: `docs/superpowers/specs/2026-09-27-la-ladder-funnel-design.md` §2 value equation, §3 magnet offer, §4 secure reveal, §5.1 residual balance hooks, §8 closed-loop exits.
2. FD-107 published-formula scores (`apps/web/src/features/reports/report-palace-score.ts`), FD-106a chart as a real lá số (`report-chart-visuals.tsx`).
3. FD-108 (2026-09-28): progressive reveal and secure blur stay; the page must give enough real value to convince; anything the engine generates that is not illegal is valid, and every choice maximizes the business goal. The 13/09 self-imposed rules "curiosity yes, deception no" and "every visual metric must be true" are dropped.
4. FD-068 real free text, FD-078 concern, FD-089 content bans, FD-103 provisional chart, FD-064/FD-065/FD-069 pricing display.
5. Progressive reveal spec 2026-09-13 §3.2 (blur is presentation only, locked text never sent to the browser) and §3.4 (free value before the first paid CTA).
6. Mobile-first (founder rule, 2026-09-28): design at 360–390 px first, then widen.

**Builds on, does not replace:** PR #208 (Kaneo #53, FD-105 package 1.4) already implements the secure guest/verified projections, server-clipped previews, placeholder bars, guest 24-hour banner and palace title states. This spec decides **what the page gives, in what order, and where the asks are**; #208 supplies the security layer.

---

## 1. The one principle

> Give the customer enough real value that they think "đúng là mình", then show them exactly where the rest is, priced, one tap away.

Two failure modes to avoid:
- **Giving too little:** a chart plus generic text. The customer never believes the paid text will be about them (low perceived likelihood, FD-105 §2.1).
- **Giving too much:** every question answered for free. No curiosity left at the moment of the ask.

"Vừa đủ" is defined operationally in §3: the customer gets **one complete personal reading, the full structure of their chart with numbers, and the headline of every locked part**. They do not get the explanation of why a palace is strong or weak, the month names of their hạn, or the advice.

## 2. What costs us nothing to give, and what costs AI

| Content | Cost per free chart | Give free? |
|---|---|---|
| 12-palace chart (FD-106a sheet) | 0 (engine) | Yes, never blurred |
| Palace scores and bands, radar (FD-107) | 0 (deterministic formula) | Yes — new in this spec |
| Strongest and weakest palace names | 0 | Yes |
| Number of hạn and thuận months this year | 0 (hạn engine, #190) | Yes; month names masked for guests |
| Decadal timeline: which cycle, which palace, ages | 0 | Yes |
| Insight 1 (identity) | AI, FD-068 pre-generation | Yes, full |
| Insight 2 (by FD-078 concern) | AI | After sign-in |
| One real title line per palace | AI (from the one full generation, FD-105 §5) | Yes |
| First 1–2 sentences of each palace reading | AI, server-clipped | Yes, then blur |
| Palace readings, advice, month names, decadal text | AI | Paid |

The structural layer (chart, scores, counts) is the cheapest persuasion we own: it is specific to the person and costs no AI. The page leans on it. Free palace scores confirmed by the founder 2026-09-28.

## 3. Page order, top to bottom (mobile)

Each block is one "beat". The number in brackets is the target height at 390 px wide, so the whole give-before-ask part stays within about four screens.

### Beat 1 — "Đây là lá số của bạn" [1 screen]
- Name, gender, solar date, hour label (or "Giờ tạm tính" badge for FD-103), mệnh/cục.
- The chart as a real lá số sheet (reuse `ReportChart` variant `compact` from `report-chart-visuals.tsx`), full width, never blurred.
- Tap a palace → bottom sheet for that palace (§5).
- Actions row: Lưu lá số (guest) · Tải ảnh · Chia sẻ. Guest line: "Lá số này tự xoá sau 24 giờ." (true, FD-020).

### Beat 2 — "Điều đầu tiên lá số nói về bạn" [1 screen]
- Insight 1, complete, 120–180 syllables, written to the beginner-first rules (`docs/superpowers/specs/2026-09-28-report-writing-rules-beginner-first.md`).
- "Vì sao có nhận định này?" disclosure: the stars and palaces it comes from.
- Feedback row: Đúng · Một phần · Không đúng (FD-105 §4.7; feeds the "Đúng rate on insight 1" metric).
- **No price in this beat.** This is the gift.

### Beat 3 — "Mười hai cung của bạn mạnh yếu ra sao" [1 screen] — new
- Radar of the 12 palace scores (`ReportPalaceRadar`) with band labels; below it two lines, computed:
  - "Mạnh nhất: cung {X} ({score}, {band})."
  - "Cần để ý nhất: cung {Y} ({score}, {band})."
- "Điểm này tính thế nào?" opens `ReportScoreExplainer` (FD-107 requires it next to any score).
- One curiosity line, true and specific: "Vì sao cung {Y} của bạn chỉ {score}? Phần luận giải cung {Y} nói rõ, kèm việc nên làm." → button "Xem cung {Y}" opens that palace's sheet (§5).
- Rationale: the number is free and true; the *why* is the paid part. This is the natural curiosity gap.

### Beat 4 — "Năm {year} của bạn" [0.5 screen]
- "Năm nay có {N} tháng cần chú ý và {M} tháng thuận." (engine counts only).
- 12-month strip: hạn months shown as masked cells for guests; signed-in customers see the **nearest** hạn month named (FD-105 §3 layer 1), the rest masked.
- Ask: "Tháng nào, chuyện gì, chuẩn bị ra sao" → Vận hạn năm 2026 (480 Lá) when that SKU is live; until then Tử Vi trọn đời.

### Beat 5 — Save gate (guest only) [0.3 screen]
- "Lưu lá số để đọc điều thứ hai lá số nói riêng về bạn" + "và nhận 60 Lá tặng" (welcome grant, FD-105 §9) + the 24-hour truth.
- Google one tap. After sign-in the page returns to this exact scroll position and Beat 6 appears in place.

### Beat 6 — Signed-in layer (FD-105 layer 1) [1 screen]
- Insight 2, chosen by the FD-078 concern, complete, with "Vì sao?" and feedback.
- Bản mệnh opening paragraph, then secure blur bars (#208), then "Mở Bản mệnh · 240 Lá".
- Balance chip: "Bạn đang có 60 Lá" → the item that uses it exactly: "Hôm nay của bạn · 60 Lá" (residual-balance hook, FD-105 §5.1). If the balance is spent, this chip disappears.

### Beat 7 — "Đọc tiếp theo điều bạn quan tâm" [scroll]
- The 12 palaces as a vertical list (not a grid on mobile). Each row: palace name, score badge, the real one-line title, state (Đã đọc · Xem trước · Chưa mở).
- Concern-matched palaces first (FD-078).
- Tap → palace sheet (§5).
- Progress line, true: "Bạn đã đọc {k}/12 cung" (goal-gradient, 13/09 spec §6.5).

### Beat 8 — "Bước tiếp theo" (the ladder) [1 screen]
Order follows FD-105 §2.2 (anchor first):
1. **Tử Vi trọn đời · 960 Lá** — "Gợi ý". One sentence of what is inside (12 cung, đại vận hiện tại + 7 chặng, từng tháng hạn năm nay, đọc lại trọn đời, PDF, 7 ngày Hôm nay). If rollover credit exists: "Bạn đã dùng {x} Lá cho lá số này, chỉ còn {960−x} Lá" (true, FD-105 §5 rollover).
2. **Bản mệnh · 240 Lá** — entry option, "nâng lên Tử Vi trọn đời trong 7 ngày được trừ lại".
3. **Mở từng cung · 120 Lá** — shown only when package 1.5 is live.
4. Hội viên — one line, link only.
- Secondary links: Xem bản luận giải mẫu · Lập lá số cho người thân.

### Beat 9 — Căn cứ (collapsed by default)
Calendar conversion, timezone, cục, tứ hóa, birth-time sensitivity. Trust content, not a sales surface.

## 4. The ask: one primary action per screen

- **Sticky bottom bar (mobile only), exactly one action**, changing with context:
  | Customer state | Sticky action |
  |---|---|
  | Guest, before Beat 5 | "Lưu lá số · nhận 60 Lá" |
  | Signed in, balance ≥ 60, no purchase | "Mở Hôm nay của bạn · 60 Lá" |
  | Signed in, a palace sheet was opened | "Mở cung {X} · 120 Lá" (or Bản mệnh until 1.5 ships) |
  | Otherwise | "Xem các gói luận giải" → Beat 8 |
- Lá only, never VND next to content (FD-065). The bar never covers text: page bottom padding = bar height.
- Every "Mở" goes through the #202 confirm dialog; short balance goes to the top-up sheet with the unlock intent kept (FD-105 §6).

## 5. Palace bottom sheet (mobile) / side panel (≥ 1024 px)

Opened from the chart, the radar line, or the palace list.

1. Palace name, score badge + band, the star chips (`ReportStarChips`), mini chart with triad lit (`ReportMiniChart`).
2. The real title line.
3. **Free:** the first 1–2 real sentences, server-clipped, ending mid-thought (FD-105 §4.2).
4. Counts, true: "{n} ý chính · {m} căn cứ · khoảng {w} chữ".
5. Blur bars from a length hint (no locked text in the payload, #208).
6. One action: "Mở cung này · 120 Lá" (after 1.5) or "Mở Bản mệnh · 240 Lá" if the palace is in Bản mệnh's scope, else "Mở Tử Vi trọn đời · 960 Lá".
7. Close returns focus to the element that opened it.

Mệnh palace: the first two paragraphs are free for signed-in customers (it is the Bản mệnh opening), so every signed-in customer reads one palace deeply before being asked.

## 6. Mobile-first layout rules (binding)

1. Design and build at 360 and 390 px first; widen to 768 and 1280 after the mobile version is signed off.
2. One column below 1024 px. No horizontal scrolling anywhere (the chart scales; the 12-palace list is vertical).
3. Body text 16 px minimum, line height ≥ 1.6, measure ≤ 36 em (FD-091 type rules).
4. Tap targets ≥ 44 × 44 px, including chart cells (the compact chart's cells are at least 44 px tall at 360 px; if not, tapping the chart opens a full-screen chart sheet first, as in FD-104 wave 3).
5. Bottom sheets, not modals, for palace previews, confirm dialog and top-up on mobile; drag handle + close button; body scroll locked while open.
6. Exactly one sticky element at a time (the bottom action bar). Header does not stick on mobile.
7. The give-before-ask content (Beats 1–4) fits in about four screens at 390 px; measure it in the prototype and in Playwright.
8. Performance: the chart and Beat 2 render server-side; radar and sheets are client components loaded after first paint. LCP under 2.5 s on a mid-range Android over 4G.
9. Test on real devices (iOS Safari and Android Chrome) before sign-off, including returning from the Google sign-in and from a bank app.

## 7. Mobile scroll, desktop tabs (founder decision 2026-09-28)

**Below 1024 px:** one continuous page in the order of §3, no tab bar. The only sticky element is the bottom action bar (§4).

**1024 px and up:** keep the six tabs of the approved prototype (Lá số · Tổng quan · Năm nay · 12 cung · Chủ đề · Căn cứ), with the chart in a left column that stays in view. The beats map onto tabs:

| Tab | Beats |
|---|---|
| Lá số | Beat 1 (large chart) + Beat 3 (radar and scores) |
| Tổng quan | Beat 2, Beat 5 (guest), Beat 6 (signed in) |
| Năm nay | Beat 4 |
| 12 cung | Beat 7 |
| Chủ đề | Concern-ordered topic cards (existing `ziwei-topics-tab.tsx`) |
| Căn cứ | Beat 9 |

Beat 8 (the ladder) sits in the right rail on every tab.

**Content parity is mandatory.** Every block that exists on mobile exists on desktop and vice versa, fed by the same data and components; only the arrangement differs. The Chủ đề topic cards appear on mobile as a section after Beat 7. Tab URLs (`?tab=12-cung`) keep working on mobile as scroll anchors, so shared links and analytics resolve on both. A Playwright test renders both widths and asserts the same set of block ids.

## 8. Copy rules for this page

- Beginner-first voice (`2026-09-28-report-writing-rules-beginner-first.md` §2b, §2c): no machine sub-headings, star names explained on arrival, no translation-like phrases.
- FD-108: curiosity lines are written for maximum pull. Any content or number the engine generates is usable; the only limits are Vietnamese law and the FD-089 content bans. Example lines: "Vì sao cung Phu Thê của bạn chỉ 38?", "Điều lá số nói về chuyện tiền của bạn, bạn sẽ muốn biết trước tháng {nearest hạn month}".
- Legal limits that still apply (consumer-protection and advertising law, not taste): no fabricated reference or crossed-out prices, no fake countdown or fake scarcity, no hạn or date the engine did not compute (FD-089), no death, lifespan, named disease, rituals or objects, lottery numbers.
- No VND on the page (FD-065); prices only on action buttons and Beat 8.

## 9. Measurement (extends FD-105 §10)

| Beat | Event | Watch |
|---|---|---|
| 2 | `insight_feedback` (id 1) | "Không đúng" rate on insight 1 |
| 3 | `score_explainer_open`, `radar_palace_tap` | Does the weakest-palace line drive sheet opens? |
| 5 | `save_cta_click`, `sign_in_complete` | Chart seen then exit |
| 5–6 | `welcome_grant`, first `la_spent` | Welcome Lá unused |
| 7 | `palace_sheet_open`, `unlock_confirm_view` | Many opens, few confirms |
| 8 | `offer_view`, `unlock_confirmed` by SKU | Anchor never chosen |
| Page | scroll depth per beat | Drop-off before Beat 3 |

## 10. Delivery sequence

1. **Clickable prototype** `prototype/revamp-2026-09/la-so-ket-qua-v2.html` at 390 px, then desktop, with the real sample chart used by the reader prototype. Founder approves (FD-056). *UI work: founder notified before it starts.*
2. Kaneo ticket for An with this spec, the prototype, and the dependency list:
   - #208 (package 1.4) merged — required.
   - #203 welcome grant (1.6) — required for Beats 5–6.
   - Package 1.5 single palace — optional; the page falls back to Bản mệnh / Tử Vi trọn đời until it ships.
   - Vận hạn 2026 SKU — optional; Beat 4 falls back to Tử Vi trọn đời.
   - Score and chart components from PR #214 — already on master.
3. Implementation plan (TDD) written after the prototype is approved.

## 11. Out of scope

Paid reader (FD-104). Free tools and daily pages (flows B–F of FD-105 §7) except that they land here. New SKUs. Email follow-ups (FD-105 §8, package 1.11).
