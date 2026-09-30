# Bậc Thang Lá — Funnel, Reveal, and Lá Product Ladder Design Spec

**Date:** 2026-09-27
**Status:** Founder-approved (FD-105). Needs the implementation plan
`docs/superpowers/plans/2026-09-27-la-ladder-funnel-implementation.md` before code.
**Owner:** An (implementation). Lãm/Harris (acceptance per wave, FD-056 visual sign-off).
**Visual reference:** artifact "Bậc thang Lá" v2 (founder review copy,
<https://claude.ai/artifact/1F6X8qd1oxTETusgNxSK69>). This spec is the repository source; the artifact is not.
**Related:** FD-041, FD-042, FD-059, FD-061, FD-063, FD-064, FD-065, FD-066,
FD-067, FD-068, FD-069, FD-078, FD-089, FD-093, FD-103, FD-104;
`docs/superpowers/specs/2026-09-13-progressive-reveal-la-credits-and-conversion-ui-design.md`;
`docs/superpowers/specs/2026-09-25-membership-architecture-design.md`;
`docs/25-tong-hop-research-ux-hanh-trinh-khach-hang.md`.

## 1. Goal

Every entry point gives a real, sufficient free result first, reveals the next
layer at the moment of curiosity, and sells the matching item in Lá. Every
place a customer can stop has a mechanism that brings them back to the same
place. The primary KPI stays FD-038 (30-day contribution margin per
chart-creating customer).

## 2. Principles

### 2.1 Value equation (Hormozi)

Perceived value = (dream outcome × perceived likelihood) ÷ (time delay × effort).
Each screen must move at least one lever:

| Lever | Direction | Mechanism in this product |
|---|---|---|
| Dream outcome | up | Need-based names ("Tử Vi trọn đời", "Tình duyên", "Vận hạn năm 2026"); concrete promise (which months need care, what to do); traditional directness about hạn (FD-089) |
| Perceived likelihood | up | Real personalised free text (FD-068); "Vì sao có nhận định này?"; per-part feedback; real sample report; real testimonials; Lá-back guarantee |
| Time delay | down | Chart and first insight in about 60 seconds without an account; unlock is instant; paid top-up auto-completes the chosen unlock |
| Effort | down | Three-field form in the first screen; birth data carried from every tool; Google one tap; smallest covering pack pre-selected; the chosen item is never re-selected after sign-in or payment |

### 2.2 Money model (Hormozi, $100M Money Models)

| Layer | Offers |
|---|---|
| Attraction | Magnet offer (§3); 60 welcome Lá (free goodwill); Bản mệnh 240 and single palaces credited on rollover |
| Upsell | Anchor (Tử Vi trọn đời shown first); rollover credit; need-based menu (concern → topic → Hợp đôi); combo decoy 1,300 |
| Downsell | Declined Tử Vi trọn đời → Bản mệnh → single palace; declined large pack → Nhập Môn |
| Continuity | Membership (FD-093, no auto-renew); 7 days of Hôm nay with Tử Vi trọn đời as the bridge |

### 2.3 Legal line

FD-089 and FD-064 apply unchanged. Allowed: anchoring, decoy, pre-selection,
bonus framing, real deadlines (24-hour guest purge, 7-day rollover), naming a
hạn the engine computed. Banned: fake countdown or scarcity, fabricated
reference prices, hạn or dates the engine did not compute, death, lifespan,
named disease, rituals and objects, lottery numbers, invented scores or trend
charts (FD-063), VND next to content or any price on the homepage
(FD-065, FD-069).

## 3. Magnet offer

- **Name:** "Lá số Tử Vi của bạn, và 2 điều lá số nói riêng về bạn, trong 60 giây."
  (MAGIC: reason "của bạn", avatar searchers of "lá số tử vi", goal 2 personal
  points, interval 60 seconds, container the interactive 12-palace chart.)
- **Guest (layer 0):** full 12-palace chart (never blurred); insight 1 fully
  readable with "Vì sao?"; one real title line per palace; "Năm nay" shows how
  many months need care, month names masked (existing masking in the annual
  tab); one call to action "Lưu lá số để đọc điều thứ hai", with the true
  statement that guest charts are deleted after 24 hours (FD-020).
- **Signed in (layer 1, free):** insight 2 chosen by the FD-078 top concern;
  the chart summary; the opening of Bản mệnh followed by the blur; 60 welcome
  Lá; palace list states Đã đọc · Xem trước · Chưa mở.
- The two-insight split resolves the 2-versus-3 conflict recorded in
  `docs/25` §5 row 1 in favour of the 2026-09-23 homepage spec.

## 4. Secure reveal and blur

Pattern observed on AITuvi (13/09 audit): full chart visible, locked item
priced at the point of intent ("Mở – N Xu"), confirm dialog before spend,
context kept when the balance is short. Lá Số Việt adopts it with FD-059.

1. Never blur the chart. Blur interpretation only.
2. A locked part shows: real title, 1–2 real sentences clipped server-side and
   cut mid-thought, counts (points, evidence items, approximate words), then
   placeholder bars styled as blurred lines. The bars are generated
   client-side from a length hint; no locked plaintext is in HTML, JSON,
   React payload, print output, or the accessibility tree.
3. One primary action per locked part: "Mở – N Lá". No grid of purchase buttons.
4. Confirm dialog before every spend: item, price, balance, balance after.
5. Short balance: the sheet pre-selects the smallest covering pack, shows the
   next pack with its bonus Lá, and keeps the chosen item (§6).
6. After unlock the part de-blurs in place and the progress line updates
   ("Bạn đã mở 2/12 cung").
7. Per-part feedback "Đúng / Một phần / Không đúng" on free and paid parts.
8. Blur surfaces: 12-palace tab, Chủ đề tab, masked months in Năm nay, locked
   parts in the reader (reader owned by FD-104).

## 5. Product ladder

| Layer | Item | Price | Delivery | Status |
|---|---|---|---|---|
| 2 | Single palace | 120 Lá | Scope of one `palaceReadings` entry from the one full generation | New SKU |
| 2 | Hôm nay của bạn | 60 Lá | Personal daily reading from the daily hạn engine | New SKU and writer |
| 2 | Tháng này của bạn | 300 Lá | Monthly reading from `monthlyList()` | New SKU and writer |
| 3 | Bản mệnh | 240 Lá | Existing Tier 1 scope | Exists |
| 3 | Tình duyên và hôn nhân | 480 Lá | Topic deep dive, deeper than `thematicSynthesis.relationships_family` | New writer; reserved SKU `ZIWEI-RELATIONSHIP-P0` |
| 3 | Công việc và tài lộc | 480 Lá | Topic deep dive, deeper than `thematicSynthesis.career_wealth` | New writer; reserved SKU `ZIWEI-CAREER-P0` |
| 3 | Vận hạn năm 2026 | 480 Lá | 12 months, engine-computed hạn months, preparation | New SKU and writer |
| 3 | Hợp đôi | 600 Lá | Two charts with the other person's consent (OD-005) | New, last |
| 4 | Tử Vi trọn đời (`ZIWEI-IDENTITY-P0`) | 960 Lá; 720 in the FD-041 window | Full V4 report + 7 days Hôm nay + PDF + lifetime rereading | Exists; rename and bonus new |
| 4 | Combo Tử Vi trọn đời + Vận hạn năm 2026 | 1,300 Lá | Both items in one spend | New |
| 5 | Membership month / year | 1,500 / 8,000 Lá | FD-093 and the 2026-09-25 membership spec | New |

**Rollover rule.** For one chart, Lá spent on single palaces and Bản mệnh
within 7 days of the first such spend is subtracted from the Tử Vi trọn đời
price (floor 0). Promotional Lá counts as spent. Existing FD-041 behaviour for
Bản mệnh is the special case of this rule.

**Generation rule (reuses spec ladder §3.2).** The first paid natal unlock for
a chart generates the full comprehensive report once. Entitlement scope
decides what renders. Later natal unlocks for that chart cost no AI.

**Topic and time-based items** have their own writers and must pass the
FD-077 gates plus 20 consecutive passing generations before sale.

### 5.1 Residual balance hooks

After each unlock the page offers the item that best uses the remaining balance.

| Unlock | Pre-selected pack | Remaining | Suggestion |
|---|---|---|---|
| Single palace 120 | Nhập Môn 300 | 180 | Another palace + Hôm nay |
| Bản mệnh 240 | Nhập Môn 300 | 60 | Hôm nay |
| Topic 480 | Khởi Đọc 1,100 | 620 | Second topic + one palace |
| Hợp đôi 600 | Khởi Đọc 1,100 | 500 | Own Tình duyên |
| Tử Vi trọn đời 960 | Khởi Đọc 1,100 | 140 | Hôm nay twice |
| Membership month 1,500 | Khám Phá 3,000 | 1,500 | Tử Vi trọn đời at member price + one topic |
| Membership year 8,000 | Tàng Thư 8,000 | 0 | — |

## 6. Shared payment loop

1. **Choose:** reveal → "Mở – N Lá" → confirm dialog.
2. **Enough Lá:** atomic spend + entitlement under one idempotency key; de-blur in place.
3. **Short Lá:** top-up order (VietQR, 12-character payment code, 24-hour
   order); the unlock intent is stored server-side.
4. **Payment confirmed** (authenticated SePay webhook only): credit purchased
   and bonus buckets, issue the invoice (FD-067), complete the stored unlock
   intent, return the customer to the same part; email "Phần bạn chọn đã mở"
   if the customer has left.

Error branches return to step 4: payment not seen → order lookup and
self-claim (existing); generation failure → automatic retry, no second charge,
then automatic Lá restore; auto-match below 95% → circuit breaker (existing).

## 7. Entry flows

| Flow | Keywords (monthly range) | Path |
|---|---|---|
| A Lập lá số | tử vi, lá số tử vi (100K–1M); lập lá số tử vi (10K–100K) | Homepage or /tu-vi form → layer 0 → sign in → layer 1 → palace or Bản mệnh → Tử Vi trọn đời with rollover → 7 days Hôm nay → membership |
| B Hằng ngày | tử vi hôm nay / hàng ngày / ngày mai / tuần mới, tử vi 12 con giáp (10K–100K each) | Free daily page by con giáp → "Hôm nay của riêng bạn tuỳ lá số" (birth year prefilled) → layer 0 → sign in, welcome Lá opens Hôm nay → day 2: 60 Lá or membership → morning reminder |
| C Tình duyên | bói tình yêu (100K–1M); bói tình duyên (10K–100K); tuổi vợ chồng (100–10K) | Free love tool → "cung Phu Thê nói đủ" → form with concern preset → insight 2 about love → Tình duyên 480 → add the other chart → Hợp đôi 600 |
| D Năm nay | tử vi năm 2026 (1K–10K); xem vận hạn (no volume shown) | Free year page by age → form → "N tháng cần chú ý", names masked → sign in shows the nearest month → Vận hạn 2026 480 or combo 1,300 → monthly reminder → Tháng này or membership |
| E Đã muốn mua | tử vi trọn đời (10K–100K); luận giải tử vi (1K–10K) | Sample report (4 open, 2 blurred) and real testimonials → form → sign in → topic selection with Tử Vi trọn đời pre-selected, combo beside it, Bản mệnh as entry |
| F Tools and articles | lịch âm, thần số học, giải mộng | Real tool result or full article → "Xem điều này trên lá số của bạn" with birth data carried → flow A |

Keyword data: `data/lasoviet_research_master.xlsx`. Later disciplines
(bát tự, kinh dịch +900% YoY; bản đồ sao; thần số học −90% YoY) reuse Lá and
stay gated by `docs/23`.

## 8. Closed-loop exits

| Stop point | System action | Returns to |
|---|---|---|
| Form abandoned | 24-hour draft (exists) | Same step |
| Chart seen, no sign-in | 24-hour deletion notice, persistent save CTA | Layer 1 |
| Signed in, no purchase | Email after 2 days with one more real palace title; engine-computed hạn month if any | That palace |
| Price seen, dialog closed | Downsell to a smaller item of the same topic | Smaller item's dialog |
| Top-up abandoned | Unlock intent kept; order lives 24 hours (exists) | Confirm dialog |
| Paid, not credited | Order lookup, self-claim (exists) | Chosen item |
| "Không đúng" on an unlocked part | Lá-back guarantee if eligible; suggest a related palace | Palace list |
| Unknown birth time | Provisional chart per FD-103, labelled; prompt to add the hour later | Recomputed chart |
| One part read | "Đã đọc 4/12" and the next most relevant part blurred below | Next layer |
| Residual balance | §5.1 suggestion | That item |
| 7-day Hôm nay bonus ended | Membership offer with the true price comparison (30 × 60 = 1,800 > 1,500) | Membership |
| Membership ending | Reminder 3 days before; renew with Lá | Membership |
| Article reader only | Contextual "Xem vị trí này trên lá số của bạn" | Form |

## 9. Guarantee and gifts

- **Lá-back guarantee:** once per account; item price under 500 Lá; the
  customer marks the unlocked part "Không đúng" within 24 hours of the unlock;
  restore uses the wallet compensating restore; the entitlement for that part
  is revoked. Copy: "Đọc phần vừa mở mà không thấy mình, bấm Không đúng trong
  24 giờ, Lá Số Việt hoàn lại số Lá của phần đó."
- **Welcome grant:** 60 promotional Lá at the first verified sign-in,
  idempotent per account.
- **Tử Vi trọn đời bonus:** 7-day Hôm nay entitlement starting at unlock.

## 10. Measurement

Emit the defined but unsent events (`topup_view`, `pack_selected`,
`la_spent`, `upgrade_view`, `upgrade_purchased`, `return_visit`) and add
`unlock_confirm_view`, `unlock_confirmed`, `part_feedback`,
`guarantee_claimed`, `welcome_grant`. Stage metrics:

| Stage | Metric | Warning sign |
|---|---|---|
| Magnet | Form start, chart success, "Đúng" rate on insight 1 | High "Không đúng" on insight 1 |
| Sign-in | Sign-in after chart; welcome Lá used | Chart seen then exit |
| First purchase | Blur "Mở" clicks, first top-up, pack chosen | Many "Mở" clicks, few top-ups |
| Upsell and continuity | Second purchase in 30 days, rollover upgrades, membership, guarantee use | One purchase only |
| Primary | FD-038 margin per chart customer | Revenue up, margin down |

## 11. Out of scope

Reader layout and structure (FD-104). New disciplines (docs/23). Consent UI
(FD-080). Any change to FD-066 pack values.
