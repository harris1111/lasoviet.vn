# Free Result Page ("Lá số của bạn") — Mobile-First Design Spec

**Date:** 2026-09-28
**Status:** Founder confirmed the baseline and approved simple implementation on 2026-10-01. FD-109 replaces the beat order and the whole selling model of the first draft: read first, ask once, one door. UI/projection/cache may proceed; new free AI calls remain gated by the durable controls in §2a.
**Owner:** An (implementation). Lãm/Harris (acceptance, FD-056 visual sign-off).
**Page:** `/la-so/[chartId]` (`apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`, `apps/web/src/features/ziwei/`).
**Governing rules, in order of precedence:**
1. FD-105 "Bậc thang Lá" funnel: `docs/superpowers/specs/2026-09-27-la-ladder-funnel-design.md` §2 value equation, §3 magnet offer, §4 secure reveal, §5.1 residual balance hooks, §8 closed-loop exits.
2. FD-109 read-first architecture (§1b below), FD-107 published-formula scores (`apps/web/src/features/reports/report-palace-score.ts`), FD-106a chart as a real lá số (`report-chart-visuals.tsx`).
3. FD-108 (2026-09-28): progressive reveal and secure blur stay; the page must give enough real value to convince; anything the engine generates that is not illegal is valid, and every choice maximizes the business goal. The 13/09 self-imposed rules "curiosity yes, deception no" and "every visual metric must be true" are dropped.
4. FD-068 real free text, FD-078 concern, FD-089 content bans, FD-103 provisional chart, FD-064/FD-065/FD-069 pricing display.
5. Progressive reveal spec 2026-09-13 §3.2 (blur is presentation only, locked text never sent to the browser) and §3.4 (free value before the first paid CTA).
6. Mobile-first (founder rule, 2026-09-28): design at 360–390 px first, then widen.

**Builds on, does not replace:** PR #208 (Kaneo #53, FD-105 package 1.4) already implements the secure guest/verified projections, server-clipped previews, placeholder bars, guest 24-hour banner and palace title states. This spec decides **what the page gives, in what order, and where the asks are**; #208 supplies the security layer.

---

## 1. The one principle

> Give the customer a complete, satisfying free reading. Let it end. Then, once,
> show them how small what they read was against what exists, and open one door.

The first draft failed on the second half. It gave reasonable free content but
put a price on every screen: an offer rail pinned to all six tabs, a purchase
button on every topic card, a sticky CTA from the first second. The founder's
verdict on 2026-09-28: *"chưa cho cảm giác sau khi đọc xong 1 kết quả luận giải
free và cảm thấy muốn trả tiền."*

### 1b. Why an always-present offer cannot work (FD-109)

Wanting to pay is the end of an emotional sequence: anticipation → reading →
satisfaction → the reading stops → wanting more. A page that asks continuously
never lets the reader reach satisfaction, so it never produces the want.

Three independent sources agree, and the first draft contradicted all three:

| Source | Rule | First draft |
|---|---|---|
| Our 2026-09-13 reveal spec §3.4 | Free content is fully readable **before** the first paid CTA | Offer rail on every tab from the first screen |
| Same spec §6.7 | "Do not render twelve equally loud purchase buttons. The remaining locked cards function as the visible content map" | A price button on every topic and palace |
| Same spec §6.9, §8.1 | The CTA comes **after** the free reading and one evidence interaction; the sticky appears only after the first paid-preview interaction | Both present immediately |
| AiTuvi benchmark (screenshots 2026-09-13) | ~15 free paragraphs with no purchase button; one quiet inline text link; topic list with no prices and no buttons | Opposite on both counts |

There is also a structural duplication: `/la-so/{id}/chon-luan-giai` already
exists in `config/route-registry.yml` and already has an approved prototype with
all four offers. The first draft rebuilt that page inside the free result page.

### 1c. The rule that replaces it

1. **No price, offer card or purchase button in the page body.** Not on palace
   rows, not on topic cards, not in the rail.
2. **The free reading ends.** A completion marker states it plainly.
3. **One bridge**, immediately after: what you read, against what exists.
4. **One bridge door**, to the existing offer page after completion. Under FD-110
   (2026-10-04), an explicitly opened locked preview may offer an in-place
   purchase of that active item and a lifetime alternative, with API-derived
   prices/rollover credit and verified-account confirmation. The free body
   and content-map rows stay price-free; reserved products remain unbuyable.
5. **The money ask unlocks on engagement**, not on arrival: the sticky bar stays
   hidden until the reader reaches the completion block or opens a locked
   preview. The free sign-in gate is not a money ask and may appear earlier.

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

### 2a. Simple delivery and delegated AI ceiling (owner approval 2026-10-01)

This section supersedes §2's suggestion to generate a full report for title lines,
§7's old offer ladder in the left rail, and §8's allowance for prices on this page.
Ship UI/projection/cache first. Select one concern-matched palace per frozen chart
version, then reuse that selection and cached reading. Do not generate a full paid
report solely as a gift or make separate AI calls for the other eleven palaces.
Their map uses existing deterministic facts and scores; reuse authorised clipped
excerpts only when already available. Preserve the server-side secure-blur boundary.

Read-only staging DB evidence on 2026-10-01:

| Measure | Recorded value |
|---|---|
| Report calls | 424, including 76 without resolved cost |
| Resolved report call cost | Median 491 VND; mean 772 VND; p95 3,113 VND; maximum 4,257 VND |
| Rewrite calls | 75; resolved mean 756 VND |
| Paid orders | 64 staging orders; 5,017,000 VND nominal, **not real revenue** |
| Generated preview requests | 0 |

These calls cover different historical models and sections, not a measured
standalone free-palace campaign. The ceilings below are conservative policy
choices, not a cost forecast or a no-loss guarantee. The existing 3,000 VND
preview ceiling is retained; some historical calls would exceed it.

- **Chart-version ceiling:** 3,000 VND across all free AI, including existing
  free insights and any failed attempts; not another 3,000 VND just for the palace.
- **Global ceiling:** 50,000 VND per UTC day across free AI. This is an explicit
  staging/pilot spend allowance, not a budget funded by historical test orders.
  It bounds exposure to 1,500,000 VND over thirty fully used days.
- **Rolling 24-hour quotas:** one new eligible palace for a guest, three for a
  verified account. Cached views are free and do not consume new-generation quota.
  Use server-side counters and an abuse-resistant guest identity; linking a guest
  to an account must not reset already consumed usage.
- **Attempts:** one provider attempt for the new free gift, with no automatic
  retry/rewrite. Paid-report retry rules and quality gates remain unchanged.
- **Reservation before provider call:** reserve the worst-case input and maximum
  output cost under a frozen active pricing/model snapshot, atomically against
  both chart-version and day ceilings. Persist quota, reservation and single-flight
  state; a concurrent request must not charge or generate twice.
- **Cache:** reuse a frozen selection and versioned artifact keyed by chart version,
  concern, locale, prompt/rules/knowledge version, provider/model and contract.
  Changing technical versions must not grant a second free allowance for the same
  chart version. Check cache before charging; reconcile unused reservation only
  after resolved usage is known. Unknown cost retains its reservation.
- **Fallback:** if pricing/cost is unknown, no reservation is available, the cap
  is reached, or the call fails quality, serve the truthful structural preview.
  Do not label it a full AI reading, invent advice or bypass validation.

No new paid provider calls may be enabled until these durable controls and a
focused free-palace preflight pass. A settings/documentation change alone is not
enforcement. No additional founder input is required for this bounded scope.
Before scaling traffic, replace staging assumptions with real paid conversion
and contribution-margin evidence; do not automatically raise the cap.

## 3. Page order (FD-109)

Numbers are the on-page numeral spine. On mobile this is the scroll order; on
desktop the same blocks sit under the six tabs (§7).

| # | Block | Free? |
|---|---|---|
| 01 | **Lá số** — the 12-palace sheet, never blurred, each cell carrying its score | free |
| 02 | **Điều đầu tiên lá số nói về bạn** — insight 1, complete, with "Vì sao?" and feedback | free |
| 05 | **Lưu lá số** (guest) → **Điều thứ hai** (signed in), chosen by the FD-078 concern, plus the Bản mệnh opening and its blur | free; gated by sign-in, not money |
| 06 | **One palace, read in full** — the concern-matched palace: conclusion, key points, full prose, Nên làm / Nên tránh, "Vì sao?", feedback | free; the largest gift |
| 03 | **Mười hai cung mạnh yếu** — radar, strongest and weakest palace, "Điểm này tính thế nào" | free |
| 04 | **Năm {year}** — count of hạn and thuận months; month names masked, nearest one named after sign-in | free, partial |
| 07 | **Mười một cung còn lại** — content map: name, score, one real line, state chip. No price, no button | map |
| 08 | **Chủ đề** — content map, same rule | map |
| 09 | **Bạn đã đọc xong phần miễn phí** → bridge → **one door** | the only ask |
| — | **Căn cứ**, collapsed | free |

Block 06 is the change that makes the page work. Before it, the reader has
opinions about themselves; after it they have held a finished piece of the
product in their hands and know precisely what the other eleven are.

### 3b. Block 09, in full

1. Completion chip: `✓ Bạn đã đọc xong phần miễn phí`.
2. Heading that reframes, not repeats: *Những gì bạn vừa đọc là một phần mười
   hai lá số này.*
3. One paragraph naming what was read and what exists, in the same voice as the
   reading.
4. A four-cell map of true counts: parts read free · 11 palaces unopened ·
   8 decadal cycles · N hạn months not yet named.
5. One button: `Xem các gói luận giải` → `/la-so/{id}/chon-luan-giai`.
6. One line of terms: paid once in Lá, read forever in the library.

The free page body carries no price; only explicitly opened locked previews may show API-derived La prices under FD-110.

## 4. The ask: one door, and it unlocks on engagement

- **In the body:** nothing. No price, no offer card, no purchase button.
- **At block 09:** the single door.
- **Mobile sticky bar:** hidden on arrival. It appears only when the reader
  reaches block 09 (observed) or opens a locked preview. Before that the only
  sticky content is the free save gate for guests, which costs nothing.
- Lá only, never VND beside content (FD-065). The bar carries one context line
  above the button so it is never a naked CTA.
- Every unlock still runs through the existing confirm dialog and short-balance
  top-up sheet. Under FD-110 they may also be embedded in an explicitly opened
  locked preview; no purchase surface appears in the uninterrupted free body.

## 5. Palace bottom sheet (mobile) / side panel (≥ 1024 px)

Opened from the chart, the radar line, or the palace list.

1. Palace name, score badge + band, the star chips (`ReportStarChips`), mini chart with triad lit (`ReportMiniChart`).
2. The real title line.
3. **Free:** the first 1–2 real sentences, server-clipped, ending mid-thought (FD-105 §4.2).
4. Counts, true: "{n} ý chính · {m} căn cứ · khoảng {w} chữ".
5. Blur bars from a length hint (no locked text in the payload, #208).
6. Under FD-110 (2026-10-04), the explicitly opened preview may show the active item’s API-derived La price, an in-place unlock/confirmation and a lifetime alternative with true rollover credit. Reuse the existing authorized purchase intent, verified-account checkout and server settlement; never expose locked plaintext or sell a reserved item. The offer-page link remains a fallback. A line states the reading is written to the same depth as the palace the reader just read in full.
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

Beat 8 (the ladder) sits under the chart in the left column on every tab, in a compact form (no bullet list).

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

1. **Clickable prototype** `prototype/revamp-2026-09/la-so-ket-qua-v2.html` (phone frame: `la-so-ket-qua-v2-dien-thoai.html`), built 2026-09-28 with the real sample chart used by the reader prototype. Founder approves (FD-056). Started with the founder's go-ahead.
2. Kaneo ticket for An with this spec, the prototype, and the dependency list:
   - #208 (package 1.4) merged — required.
   - #203 welcome grant (1.6) — required for Beats 5–6.
   - Package 1.5 single palace — optional; the page falls back to Bản mệnh / Tử Vi trọn đời until it ships.
   - Vận hạn 2026 SKU — optional; Beat 4 falls back to Tử Vi trọn đời.
   - Score and chart components from PR #214 — already on master.
3. Implementation plan (TDD) written after the prototype is approved.

## 11. Out of scope

Paid reader (FD-104). Free tools and daily pages (flows B–F of FD-105 §7) except that they land here. New SKUs. Email follow-ups (FD-105 §8, package 1.11).
