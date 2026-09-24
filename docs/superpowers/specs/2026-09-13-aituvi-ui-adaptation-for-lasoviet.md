# AITuvi UI Adaptation for Lá Số Việt — Design Rules and Page Specs

**Date:** 2026-09-13
**Status:** Founder-requested (2026-09-13). Source for Kaneo UI tickets LSV #19–#28 (UI-01…UI-10).
**Inputs:** live capture of aituvi.com and lasoviet.net on 2026-09-13 with Chrome
(desktop 1440×900, mobile 390×844), computed-style measurements, and
`2026-09-13-progressive-reveal-la-credits-and-conversion-ui-design.md` (the
"PR spec" below). Reference screenshots: `docs/reference/aituvi-benchmark-2026-09-13/`.
**Binding decisions that override anything here:** FD-059 (no locked plaintext to
unauthorized clients), FD-063 (no invented scores/trend charts), FD-064 (revenue
max within Vietnamese law), FD-065/066 (Lá pricing), FD-069 (no price on
homepage), FD-071 ("Lá Số Việt biên tập"), analytics per Kaneo #12 (no new
consent UI).

## 1. Why AITuvi reads better today — measured

| Metric | AITuvi | Lá Số Việt (live) | Consequence |
|---|---|---|---|
| Body text | 16px everywhere, line-height 24px | Cards and helper text 13.5–14px; micro labels 11–12px mono uppercase | LSV feels dense and hard to read, especially on mobile |
| Desktop H2 | 36px, centered, 1–2 line subtitle | 34px, left-aligned, eyebrow + subtitle + long intro | Similar size; LSV has more text layers per section |
| Mobile H2 | 24px | ~30px serif with long wrapping questions | LSV headings wrap to 4–5 lines on mobile |
| Homepage words | 2,722 (incl. ~500-word SEO block at bottom) | 2,374 | Similar totals, but AITuvi puts words into big visual components |
| Homepage mobile height | 12,724px | **20,287px** | LSV is ~60% longer to scroll on phones |
| Card body | ~33–35 words, 16px, centered icon above | 25–45 words, 13.5–14px | |
| Primary action on first mobile screen | Full form card is the first element | Headline + 3 paragraphs first; form below | AITuvi lets users act immediately |
| Surfaces | Warm paper `#FFFDF9`, peach tints, white rounded cards (radius ~16–24px), soft shadow | Dark lacquer `#15120E`, 1px hairline boxes, radius 8px | LSV looks like a document; AITuvi looks like an app |
| Buttons | Pill, 44px high, one filled primary per section | Rectangular gold gradient + many text links | |
| Visual proof | Chart carousel, free-vs-paid matrix with icons, radar/bar charts | Tables and text cards | |

## 2. Colour mapping — keep Lá Số Việt colours

Use the live tokens in `apps/web/src/styles/tokens.css`. Do not introduce AITuvi
orange/peach. Map roles, not hues:

| AITuvi role | AITuvi value | Lá Số Việt token |
|---|---|---|
| Page ground | `#FFFDF9` | `--lacquer-800` (keep texture only behind hero/final CTA, never behind body text) |
| Card surface | white, soft shadow | `--lacquer-700` + 1px `--lacquer-line` + `box-shadow: 0 8px 24px rgba(0,0,0,.35)` |
| Highlighted card (recommended) | brown/orange border | 1px `--gold-500` border + subtle gold inner glow |
| Tinted icon circle | peach `#FFEDD5` | `rgba(201,164,77,.14)` circle, icon `--gold-500` |
| Primary CTA | brown `#9A3412` pill | `--gold-gradient` pill, text `--lacquer-900` |
| Secondary CTA | peach pill, brown text | transparent pill, 1px `--gold-500`, text `--gold-400` |
| Heading | near-black | `--pearl-50`, display font `--font-display` |
| Body | `#0A0A0A` 16px | `--pearl-200` 16px `--font-ui` |
| Muted | grey | `--pearl-400` (never below 14px) |
| Included ✓ | green | jade `#4F7A68` icon + text label |
| Not included ✕ | red | `--pearl-600` ✕ icon + text label (do not use `--son` for "not included") |
| Accent / active | orange | `--son` only for active tab indicator and one emphasis per viewport |

Reading surfaces (free overview, report reader, FAQ answers) use `--lacquer-700`
panels, 17px body, line-height 1.7, max width 720px.

## 3. Global UI rules (apply to every ticket)

### 3.1 Type scale

| Token | Desktop | Mobile |
|---|---|---|
| Hero H1 | 48–56px | 32–36px |
| Section H2 | 34–36px, centered | 24–26px, centered |
| Card H3 | 20–22px | 18–20px |
| List/row title | 16–18px semibold | 16px |
| Body | 16px / 1.5 | 16px / 1.55 |
| Reader body | 17–18px / 1.7 | 17px / 1.7 |
| Muted/helper | 14px minimum | 14px minimum |
| Eyebrow label | max one per section, 12px, letter-spacing .08em | same |

Remove the scrolling marquee strip and the small mono uppercase captions under
images on mobile.

### 3.2 Word budget (AITuvi-measured, adopt as hard limits)

- Section subtitle: ≤ 30 words, max 2 lines desktop.
- Card body: ≤ 30 words.
- Accordion teaser: ≤ 3 lines, clamped with ellipsis.
- One section = one job + at most one CTA.
- Homepage above FAQ: ≤ 1,400 words. Long SEO explanation moves to `/tu-vi` or
  `/kien-thuc`, not the homepage bottom.
- Mobile homepage height target: ≤ 12,000px at 390px width.

Shorten using existing approved copy (delete sentences, don't invent claims).
Founder reviews wording on the PR.

### 3.3 Section rhythm

`centered H2 → 1–2 line subtitle → one visual component → one centered pill CTA`.
Vertical padding: 88px desktop, 56px mobile. Container max 1200px; reading 720px.

### 3.4 Components

| Component | Spec |
|---|---|
| Pill button | height 44px (48px mobile primary), radius 9999px, padding 0 24px, 16px semibold, optional trailing arrow |
| Card | radius 16px, padding 24px (20px mobile), icon circle 48px on top, H3, body |
| Form field | height 56px, radius 12px, leading 36px tinted icon square, chevron for selects; paired selects in 2 columns even on mobile |
| Segmented tabs | pills in a row, active = filled; mobile = horizontal scroll with fade edge, 44px targets |
| Layer tab bar | full-width sticky bar under header, equal-width tabs, active = `--son` background or 2px indicator + bold |
| Check matrix | rows with 24px leading icon + label, columns with ✓/✕ badges in 28px circles |
| Accordion | numbered rows, radius 16px, `+`/`×` icon right, first item open |
| Chip rows | two rows of pill chips auto-scrolling in opposite directions (pause on hover/reduced-motion) |
| Support card | illustration right, H3 20px gold, 2–3 lines, secondary pill "Gửi email hỗ trợ" |
| Floating contact | Not used at this stage (founder decision). If enabled later it must never overlap a primary CTA — AITuvi's chat bubble covers its own CTA on mobile |
| Bottom sheet (mobile) | radius 16px top, drag handle, max 85vh, focus trapped |

### 3.5 Do not copy from AITuvi

- Invented radar "năng lực 12 cung" scores, daily luck percentage gauges, trend bars (FD-063).
- Scaling the 12-palace chart down on mobile until text is unreadable (see ticket #8).
- Comparison table whose columns get cut off on mobile.
- Fake crossed-out reference prices, "Phổ biến nhất" without real sales data (legal line under FD-064; use "Gợi ý" or a mathematically true "Nhiều Lá nhất / Lá rẻ nhất").
- Testimonials that are not real, consented user reviews (illegal as fake reviews).
- Lottery/"trúng đậm" article titles, "khoa học/chính xác" claims.
- Payment guide made of bank-logo walls.

## 4. Page specs

### 4.1 Homepage `/` (superseded by FD-100)

The homepage order, sections, and copy now live in
`docs/superpowers/specs/2026-09-23-homepage-content-spec.md` (Homepage V3). This
spec keeps only the acceptance bar below.

**Done when:** mobile height ≤ 12,000px; all text ≥ 14px; Lighthouse accessibility
≥ 95; no horizontal scroll at 320px.

### 4.2 Birth wizard `/tao-la-so/tu-vi` and hero form

- AITuvi field style (§3.4): leading icon squares, 56px fields, day/month/year as
  three inline selects + calendar toggle in one field.
- Keep existing steps and the existing consent checkbox as one checkbox.
- Under the primary button: "Bạn có thể xem lá số minh hoạ tại đây".
- Mobile primary button sticky at bottom when the keyboard is closed.

### 4.3 Free result `/la-so/[chartId]`

AITuvi `sample` + `tab-*` screenshots, filtered through PR spec §5–§8:

1. **Layer tab bar** (sticky): `Lá số | Tổng quan | 12 cung | Chủ đề | Căn cứ`.
   State in URL (`?tab=`) so refresh/back/login return keep the tab.
2. **Lá số tab:** full chart (mobile handled by ticket #8), legend row below,
   **action row of 3 pills**: "Sửa thông tin", "Tra cứu sao", "Tải ảnh lá số".
   Below: exploration strip (PR spec §6.2). No radar chart.
3. **Tổng quan tab:** free overview in a reading panel; star names inline-highlighted
   with element colour + dotted underline, tap/hover shows a one-line definition.
   Ends with primary CTA "Xem luận giải 12 cung →".
4. **Chủ đề tab:** AITuvi "Chuyên đề" accordion list — numbered rows, title 18px,
   3-line clamped teaser; expanding a locked row opens the secure preview (PR spec §5.2)
   inline on desktop, bottom sheet on mobile, with Lá CTA.
5. **12 cung tab:** list of 12 palace rows (name, main stars, state marker
   Đã đọc/Xem trước/Chưa mở). Tap opens palace detail.
6. **Căn cứ tab:** evidence matrix (PR spec §6.4).

### 4.4 Topic selection and Lá pricing `/la-so/[chartId]/chon-luan-giai` and Lá top-up

AITuvi `pricing` screenshots:

- **Segmented tabs:** `Luận giải` (content priced in Lá) | `Gói Lá` (top-up packs in VND).
- **Luận giải tab:** 2 cards — Bản mệnh 240 Lá, Toàn diện 960 Lá (highlighted,
  badge "Gợi ý"); in the FD-041 window show upgrade 720 Lá. Card anatomy: icon
  circle, name, Lá price large, one-line description, primary pill "Mở khóa",
  then "Chi tiết phần được mở" ✓ list.
- **Gói Lá tab:** 4 cards (FD-066): Nhập Môn 29.000đ → 300 Lá; Khởi Đọc 99.000đ →
  1.000 + 100 Lá; Khám Phá 249.000đ → 2.500 + 500 Lá (badge "Gợi ý"); Tàng Thư
  599.000đ → 6.000 + 2.000 Lá. Show bonus as a green "+500 Lá tặng" line (true, not a
  fake reference price). VND shown only here (FD-065).
- **Benefits panel** ("Quyền lợi khi mở luận giải"): 4 ✓ rows ≤ 20 words each.
- **FAQ per tab** (3 items each) + **support card**.
- Mobile: tabs full width; cards stacked vertically with the recommended card
  first; sticky bottom bar shows selected item + CTA.
- Depends on the Lá ledger implementation; until then build with the current
  offers behind a feature flag.

### 4.5 Sample report `/bao-cao-mau/tu-vi`

Current page shows generic palace cards and still prints "79.000 ₫" (conflicts
with FD-065). Rebuild as AITuvi's public sample: a real anonymized sample chart
rendered with the same result components (§4.3) and label "Bản mẫu" (PR spec
`sample_preview`), one complete free overview, the topic accordion with 2 sample
topics fully open and the rest showing the locked preview, then CTA "Lập lá số của
bạn". Never use a real person's name (AITuvi uses a named "Tỷ phú").

### 4.6 Paid report reader

- Desktop: sticky layer tab bar or left TOC, reading column 720px, progress text
  "Bạn đã đọc 2/4 phần".
- Mobile: tab bar scrolls horizontally; TOC in bottom sheet; resume chip.
- Upgrade module per PR spec §7.3 after meaningful progress; locked sections use
  the Chủ đề accordion style.

### 4.7 Support and trust surfaces

- Support card component used on homepage (before final CTA), topic selection,
  checkout, payment failure/expired states, account orders.
- Founder decision 2026-09-13: do not display Zalo, legal entity name, address,
  or phone number at this stage, and no floating contact button. The only visible
  support channel is the `lasoviet.net` support email.
- Footer: logo, policy links row, support email. Contact data comes from one
  config source with a per-field visibility flag so hidden fields can be enabled
  later without code changes.
- Checkout support card uses a `mailto:` link with the order code pre-filled in
  the subject.

### 4.8 Knowledge hub and article list (P1, after core funnel — FD-070)

AITuvi `category` screenshot: breadcrumb; per cluster an uppercase accent heading,
1 large featured card + 4-item list on desktop, 3-column cards with 16:9 image,
2-line clamped title, 2-line excerpt, date. Mobile: single column, image 16:9.

### 4.9 Free tools cross-sell

AITuvi `date-view` screenshot: a banner inside utility results — "Ngày tốt chung,
nhưng có hợp với lá số của bạn?" + pill "Kiểm tra lá số của bạn". Add to every
free-tool result page, linking into the wizard with the tool context kept.
No fear wording, no certainty claims.

## 5. Acceptance checklist shared by all UI tickets

- Colours only from §2 mapping; no new hex values outside tokens.
- Type and word budgets from §3.1–3.2 verified with a script or screenshot annotation.
- 320 / 375 / 390 / 768 / 1024 / 1440 screenshots attached; no horizontal scroll.
- Touch targets ≥ 44px; keyboard focus visible; reduced-motion stops chip scrolling.
- Floating widgets never overlap a primary CTA at any tested width.
- Analytics events (Kaneo #12) fired for every CTA and tab change.
- Founder visual sign-off (FD-056) before `Done`.
