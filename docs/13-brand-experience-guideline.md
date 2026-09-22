---
title: Lá Số Việt — Brand & Experience Guideline
version: 2.0
status: approved
last_updated: 2026-09-22
source_of_truth: true
---

# Lá Số Việt — Brand & Experience Guideline

Version 2.0 is the lean rewrite ordered by the founder on 2026-09-22 (FD-096):
old rules that slowed UX, UI, and page-content work were removed. Rules that
protect the quality of paid readings, and all backend, payment, privacy, and
security rules, are unchanged and live where they always did (tracker FD-058,
FD-072 to FD-077; `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md`).

Where to look for everything else:

| Question | Source |
|---|---|
| Founder decisions | the tracker (binding) |
| Page layouts, type scale, components, word budgets | `docs/superpowers/specs/2026-09-13-aituvi-ui-adaptation-for-lasoviet.md` (FD-091) |
| Colour, surfaces, imagery, image file names | `docs/22-art-direction.md`, `docs/24-light-theme-color-spec.md`, `apps/web/src/styles/tokens.css` |
| Sitemap and technical SEO | `docs/14`, `docs/19`, `docs/23` |
| Revamp UI source (approved) | `prototype/revamp-2026-09/` (FD-098) |

## 1. Brand

- **Role:** Lá Số Việt builds and reads charts for Vietnamese users in plain
  Vietnamese, and shows why each reading says what it says.
- **Essence:** Hiểu mình có căn cứ.
- **Master brand:** Lá Số Việt, always with full diacritics. Canonical domain
  `lasoviet.net` (FD-057).
- **Live product:** Tử Vi. Other methods are described as live only when their
  engine ships (`docs/23`). AI is the mechanism, never the brand or the hero.
- **Canonical hero:** "Lập lá số. Hiểu vận mệnh." Supporting line: "Một con
  người. Nhiều hệ quy chiếu. Một bản luận giải dễ hiểu."

| Lá Số Việt is | Lá Số Việt is not |
|---|---|
| Your own chart, explained point by point | Generic text that fits anyone |
| Plain about good and bad, as traditional Tử Vi is | A seller of rituals, "giải hạn", or objects |
| Dark lacquer, museum light, gold edge, one red seal | Purple cosmos, smoke, crystal balls, fortune-teller stock |
| Open about AI and data | "99% accurate", fake experts, fake reviews |

## 2. Audience

People arrive during uncertainty about something concrete — work, money, love,
family, or a hard year — and search by method name ("tử vi", "lá số tử vi").
Entry points should name the method and the need.

| Need | What to give |
|---|---|
| Understand myself | The chart, strengths and weaknesses, the reason for each |
| Love and marriage | The relationship palace read plainly, with what to do |
| Work and money | Periods that favour or strain work and money |
| This year | Which months carry hạn and how to prepare |

## 4. Voice

- Address the reader as **"bạn"**. Use "Lá Số Việt" for the brand; never
  "đội ngũ" or "chuyên gia" (FD-071).
- **Plain and direct.** Say good and bad the way traditional Tử Vi does: hạn,
  bad stars, hard years, money loss, relationship trouble (FD-089).
- **Explain terms where they appear.** Everyday words first, the term second.
- **Always pair a problem with a next step.** Preparation is what the paid
  reading sells.
- Short sentences. No exclamation-mark strings.

### 4.3 Lexicon

| Use | Do not use |
|---|---|
| hạn, sao xấu chiếu, năm khó, hao tài, trắc trở | khắc chết, thọ yểu, tuổi thọ |
| nên chú ý sức khoẻ, nghỉ ngơi, khám định kỳ | a named disease as a prediction |
| cách chuẩn bị, việc nên làm | giải hạn, hoá giải, cúng, vật phẩm |
| bản luận giải, Lá | gói Đại Cát, VIP Thiên Mệnh |
| AI hỗ trợ diễn giải | AI tiên tri, chính xác 99% |

### 4.5 Banned everywhere (FD-089 — the only content line)

1. Death, lifespan, "khắc chết".
2. Selling or recommending rituals, "giải hạn", "hoá giải", or objects.
3. Events, dates, or hạn the engine did not compute for this chart.
4. False scarcity, countdowns, fabricated reference or crossed-out prices,
   fake reviews, fake experts or teams.
5. Lottery or "lô đề" numbers.

Everything else that converts is allowed, including decoys, anchoring, bonus
framing, default pre-selection, curiosity gaps (FD-064), daily-return loops,
and upsell copy that names a real hạn (FD-089).

### 8.5 Product names

Luận giải Bản mệnh · Luận giải Toàn diện · Hội viên tháng · Hội viên năm ·
Gói Lá: Nhập Môn, Khởi Đọc, Khám Phá, Tàng Thư. Prices follow FD-065, FD-066,
and FD-093.

## 5. Visual essentials

Colour, surfaces, and imagery: `docs/22` and `docs/24`. Layout, type scale,
components, and radii: the FD-091 spec. This section keeps only what those do
not cover.

### 5.2 Light palette

Moved. The Paper / Ink / Cinnabar light palette and its measured contrast
ratios now live only in `docs/24-light-theme-color-spec.md`.

### 5.3 Typography

- Display: **Source Serif 4** for headings and long reading.
- UI and body: **Be Vietnam Pro** for forms, labels, body, tables, buttons;
  tabular numerals for dates and times.
- Never set a whole Vietnamese sentence in capitals.

### 5.6 Iconography

- Base set: Lucide, 1.75px stroke, round caps.
- Each free-tools hub tool has its own drawn icon in the Lá Số Việt style
  (FD-094). Icons never replace a label on an important action.

### 5.8 Motion

120ms feedback, 180ms standard, 240ms panels. Respect `prefers-reduced-motion`.

### 7.5 Accessibility minimum

Text contrast 4.5:1 (large text and UI 3:1), touch targets 44px, full keyboard
use with visible focus, no horizontal scroll at 320px, colour never the only
signal.

## 6. Product experience

### 6.2 Funnel

Search or need → method page or free tool → birth input → free chart →
free highlights and "năm nay" teaser → choose a reading or membership → pay
with Lá → read → save and return daily.

### 6.3 Birth form

- Ask only what the chart needs. Carry data already entered on the homepage or
  a tool into the wizard; never ask twice.
- Offer "Không rõ giờ sinh"; never guess silently.
- Solar calendar by default; lunar input allowed.

### 6.4 Free result

- Full chart, three highlights, one open reason ("Vì sao?"), and real
  personalised excerpts (FD-068).
- Locked content uses secure progressive reveal (FD-059): no locked plaintext
  reaches an unauthorised client.
- "Đúng / Một phần / Không đúng" feedback on highlights.

### 6.6 Paywall

- Content priced in Lá only; VND only on top-up packs, the payment order, and
  the invoice (FD-065). Pack list and content prices: FD-066. Membership: FD-093.
- The insufficient-balance button pre-selects the smallest pack that covers the
  item.
- A misfortune period may be named in upsell copy only when the engine computed
  it (FD-089).

### 6.7 Paid report

Structure, depth, and quality gates are set by the Zi Wei V4 spec and FD-058,
FD-072 to FD-077. Do not restate or override them here.

## 7. Privacy (unchanged backend rules)

- Charts and reports are private by default, noindex, and at unguessable URLs.
- Share cards hide full name, birth date, time, place, and order code by
  default.
- Third-party tools never receive name, exact birth data, free-text questions,
  or `chart_id` (FD-053). Analytics and retention follow FD-080, FD-081, FD-085.
- Anonymous unlinked birth data is purged after 24 hours (FD-020).

## Appendix A. Microcopy

- "Vì sao có nhận định này?"
- "Căn cứ được sử dụng"
- "Nhận định này phụ thuộc vào độ chính xác của giờ sinh."
- "Bản luận giải này là riêng tư và không xuất hiện trên công cụ tìm kiếm."
- "Không tự động gia hạn."
- "Thanh toán đang được xác nhận. Không cần thực hiện lại."
- "Nếu nhập sai dữ liệu, bạn có thể sửa và tạo lại lá số."
