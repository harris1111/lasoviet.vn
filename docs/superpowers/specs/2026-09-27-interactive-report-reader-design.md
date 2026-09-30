# Interactive Comprehensive Report Reader — Design Spec

**Date:** 2026-09-27
**Status:** Founder-approved direction (brainstorm 2026-09-27, recorded as FD-104). Wave 1 plan: `docs/superpowers/plans/2026-09-27-fd104-wave1-report-reader-structure.md`. Waves 2 and 3 get their own plans after wave 1 ships.
**Owner:** An (implementation). Lãm/Harris (acceptance of prototype + each wave).
**Prototype:** `prototype/revamp-2026-09/doc-bao-cao-tuong-tac.html` (binding UI source for this reader once approved, per FD-098 practice).
**Related:** FD-058, FD-063, FD-068, FD-073, FD-077, FD-082, FD-089, FD-091, FD-098; `docs/22-art-direction.md`, `docs/24-light-theme-color-spec.md`.

## 1. Problem

Founder review of a live Tier-2 report (2026-09-27, screenshots in session): every section is one wall of text, no split by main idea, no visuals. Code audit on `origin/master` (`4bd25c3`):

| # | Cause | Evidence |
|---|---|---|
| 1 | Reader renders each narrative as a single `<p>`; any `\n\n` the model writes collapses to a space | `apps/web/src/features/reports/comprehensive-report-reader.tsx` L616, L631, L652, L676, L697, L715, L770, L784; no `white-space` rule for `.report-section-narrative` / `.report-subcard-narrative` in `global.css` |
| 2 | Section writer already asks for 3–5 paragraphs, but output contract is one `narrative` string; no conclusion, key points, sub-headings, do/avoid | `packages/backend/src/reports/comprehensive-report-section-writer-v4.ts` L604–613; `packages/contracts/src/ziwei-comprehensive-report-v2.ts` `narrativeSectionSchema` |
| 3 | Same content repeated 3× (overview, coreAxis, Mệnh palace all retell Liêm Trinh + Thiên Phủ at Thìn + the same aux stars). Per-section generation (FD-073) has no scope boundaries between sections | Founder screenshots 1, 2, 5 |
| 4 | Visual data exists but is dropped: stored sections carry `evidenceKeys`; frozen facts carry palaces, stars, brightness, mutagens, `triadPalaceIds`, `oppositePalaceId`, life/body palace; public projection strips all of it | `projectComprehensiveReportPublicContentV2` in `packages/contracts/src/identity-report-v1.ts`; `ComprehensiveZiweiPalaceFact` in `packages/backend/src/reports/comprehensive-ziwei-facts.ts` |
| 5 | Only the current decadal cycle is frozen; full cycle list exists at snapshot time and is discarded | `packages/engine-adapters/src/ziwei/iztro-report-snapshot.ts` L323–360 (`decadalList`) |
| 6 | Tall sections never register as read: observer uses `threshold: 0.1` inside a 30%-high root band; 10% of a ~15,000px section never fits → section 04 never ticked, active TOC stuck on 03 | `comprehensive-report-reader.tsx` L205–234 |
| 7 | "Đã đọc 23/10 phần", chip "Đã hoàn thành 23/24 phần (96%)", orphan "Chưa hoàn tất" under TOC item 05 are **not in master source** (read count is capped at `tocSections.length`) | Verify deployed build SHA vs master; rule out a browser extension |

## 2. Founder decisions (2026-09-27)

- Approach **C** (interactive report), delivered in **3 waves**; wave 1 ships first so already-sold reports improve immediately.
- **Keep current depth, layer it**: summary visible, detail behind "Đọc chi tiết"; print/PDF expands everything.
- **Old reports: UI-only upgrade** (no regeneration, no AI cost).
- Visuals in scope: mini chart, star chips, decadal timeline, tam phương tứ chính diagram.

## 3. Hard constraints

- **FD-063**: no invented scores/ratings (no "Sự nghiệp 8/10", no good/bad colour on decadal cycles, no trend lines). Visuals show only engine-computed structure: palaces, stars, brightness labels, mutagens, cycle age/year ranges.
- **FD-089** content line unchanged (death/lifespan, named disease, rituals, invented dates banned).
- **FD-073** per-section generation stays; **FD-077/FD-082** gates stay; new contract needs **20 consecutive passing generations** before paid traffic.
- **Privacy**: reader receives display labels only (palace, star, brightness, mutagen, age/year ranges). No birth date/time/place, no raw internal keys in the DOM.
- **No manual ops**: no per-report editing; failures self-rewrite or self-halt.
- **Chart visuals come from the report's frozen source snapshot**, never the live chart, so text and picture always agree.
- Brand: `docs/22` dark gold palette, `docs/24` light tokens, `lsv-revamp.css` components, SEO image names.

## 4. Target page anatomy

1. **Chân dung một trang** (new reports only): 1 headline sentence, 3 strengths, 3 watch-outs, 1 line for the target year; large interactive chart beside it.
2. **Chart as primary navigation**: desktop ≥1200px sticky chart rail replaces the text TOC (text TOC stays as a compact list under it); click palace → jump to its chapter; current chapter's palace lit; triad + opposite palaces linked with lines. Mobile: mini chart atop each chapter + "Xem lá số" full-screen sheet.
3. **Chapter template** (every section and every palace):
   1. eyebrow numeral + title + mini chart (lit palace) + star chips
   2. **Kết luận** — one sentence, display size
   3. **3 ý chính** — short bullets
   4. **Đọc chi tiết** (collapsed by default) — 2–4 paragraphs with sub-headings, ≤ ~4 sentences each
   5. **Nên làm / Nên tránh** box where relevant
4. **Decadal timeline**: all cycles with age + year ranges and palace name; current cycle lit; target-year marker. Neutral styling only (FD-063). Current cycle links to its chapter.
5. **Practical direction**: action cards (recommendation / why / avoid) instead of a run-on `<li>`.
6. Existing tools kept: font size, resume chip, progress bar, print, share.

Old (v3 content) reports: items 2, 4, 5, star chips, triad diagram, paragraph split, collapsible palaces. Hidden: portrait, conclusion, key points (no source text).

## 5. Wave 1 — reader + data projection (all reports)

**Web**
- Paragraph rendering: split narrative on `\n\n` (then `\n`) into `<p>`s. If a stored narrative has no breaks, fall back to deterministic grouping of 3–4 sentences (split on `. ` / `? ` / `! ` followed by an uppercase Vietnamese letter). Unit-test both paths.
- First sentence of each item rendered as a lead line (old reports' stand-in for a conclusion).
- 12 palace cards collapsible (first 2 open); "Mở tất cả" toggle; print CSS expands all.
- Fix read tracking: observe a zero-height sentinel at each section top (or `threshold: 0` + band); count read by sentinel crossings; keep `readCount ≤ total`.
- Components: `StarChip` (name, brightness label from `BRIGHTNESS_LABELS_VI`, mutagen badge Lộc/Quyền/Khoa/Kỵ), `MiniChart` (4×4 ring, 12 cells, lit cell, Mệnh/Thân markers), `DecadalTimeline`.
- Practical direction → action cards.

**Contracts / backend**
- Add optional `chartSnapshot` (`ReportChartSnapshotV1`) to the V2 and V3 comprehensive ready views: `palaces[12] { palaceId, earthlyBranchId, heavenlyStemId?, isLife, isBody, triadPalaceIds, oppositePalaceId, stars[{ starId, kind: main|aux, brightnessId?, transformationId? }] }`, `decadal { currentOrdinal, cycles[{ ordinal, palaceId, ageRange, yearRange }] }`, `annual { targetYear, palaceId }`. Built on read from the immutable chart version plus the frozen report source snapshot. Canonical IDs only; the web resolves labels with the existing `ziweiPresentation("vi")`. Any failure yields `null` and never blocks the report.
- Wave 1 star chips come from `chartSnapshot` alone (palace cards: own palace; Overview: life palace; Core axis: body palace; decadal and annual sections: their palaces). Per-section refs from `evidenceKeys` move to wave 2.
- Full decadal run is derived, not persisted: cycle ordinal from the current cycle's start age (first cycle starts at age 2-6), direction from the life palace plus ordinal landing on the current palace forward or backward. Works for sold and new reports with no snapshot change. Ambiguous cases (ordinal 0 or 6, `not_started`, inconsistent data) show the current cycle only.

**Verify first**: read one real stored Tier-2 report and confirm whether narratives contain `\n\n`. Resolve item 7 of §1.

## 6. Wave 2 — structured writing (new reports)

- New content contract `ziwei-comprehensive.v4` (keep v3 renderer for old reports). Per narrative block:
  `{ title, conclusion (≤ 40 words), keyPoints[3] (≤ 25 words each), paragraphs[2..4] { heading (≤ 8 words), body }, guidance? { do[1..3], avoid[1..3] }, evidenceKeys }`.
- **Portrait** block `{ headline, strengths[3], watchouts[3], yearLine }` generated **last**, from the other sections' conclusions + facts (one extra call, cheap, consistent).
- **Scope contract per section** to kill repetition: overview = whole-chart portrait, no star-by-star; coreAxis = Mệnh–Thân dynamic only; Mệnh palace = palace detail, must not restate overview/coreAxis claims; themes = cross-palace synthesis only. Extend the repetition gate across sections (compare conclusions + key points).
- Star names move out of prose where the chip already shows them (prompt: name a star only when the sentence explains it).
- Gates: conclusion present and ≤ limit; exactly 3 key points; 2–4 paragraphs; paragraph ≤ ~4 sentences; existing length/term/death/locale/anchoring gates apply to the concatenated text. Minimum-length thresholds re-based on paragraphs, not conclusion/key points.
- Re-check output token caps per group (`COMPREHENSIVE_REPORT_GROUP_OUTPUT_CAPS`); structure adds ~10–15% tokens.
- 20 consecutive passing generations before switching paid traffic. Tier-1 and FD-068 free previews reuse the same blocks (conclusion + key points are the teaser).

## 7. Wave 3 — interactive layer (all reports)

- Sticky chart rail as primary nav (desktop), full-screen chart sheet (mobile), click-to-chapter, lit palace follows scroll.
- Tam phương tứ chính overlay on the chart and in each palace chapter (lines from `triadPalaceIds` + `oppositePalaceId`; no AI).
- Accessibility: chart cells are buttons with `aria-label` "Cung Mệnh — Thìn — Liêm Trinh, Thiên Phủ"; keyboard arrows move between cells; focus ring; `prefers-reduced-motion`.
- Print/PDF: all expanded, chart printed once at top, timeline printed, no sticky elements.
- Light theme per `docs/24` when the report page is converted.

## 7b. Round 2 (FD-106, FD-107, founder review 2026-09-28 against AiTuvi)

Added after the founder compared the prototype with AiTuvi's free flow. These change waves 2 and 3; wave 1 as shipped in PR #201 is unaffected.

### 7b.1 Chart drawn as a real lá số sheet (FD-106a)

The wave-1 mini chart reads as a technical diagram. Every chart surface (hero, rail, palace card thumbnail, mobile sheet) uses the traditional printed cell instead:

| Slot | Content | Source |
|---|---|---|
| Top line left | Heavenly stem + earthly branch | `chartSnapshot.palaces[].heavenlyStemId`, `earthlyBranchId` |
| Top line right | Decadal age range for that palace | `chartSnapshot.decadal.cycles` |
| Second line | Palace name, centred, caps | `palaceId` |
| Middle | Chính tinh, brightness, tứ hóa, centred | `stars[kind=main]` |
| Below | Phụ tinh in two columns | `stars[kind=aux]` |
| Bottom line | Mệnh / Thân / đại vận / lưu niên markers, vòng trường sinh, cycle years | `isLife`, `isBody`, decadal, annual, **`cycleStateId` (new)** |
| Centre block | LSV logomark watermark, wordmark, year of birth, gender, mệnh, cục, thân cư, năm xem | `chartSnapshot` + report meta |

**Contract change:** `ReportChartPalaceV1` gains an optional `cycleStateId` (`ziwei.cycle.*`), already present on the normalized chart and currently dropped.

Star names are coloured by ngũ hành from a lookup table. Stars whose element is not well attested stay the default text colour; a wrong colour is worse than no colour, because a knowledgeable reader spots it instantly. The table needs An and the founder to review before it ships. Reference implementation: `prototype/revamp-2026-09/doc-bao-cao-tuong-tac-elements.js`.

Birth date, birth time and birth place never appear, unlike AiTuvi's chart.

### 7b.2 Palace strength score (FD-107)

A deterministic 0 to 100 per palace, computed on the web from `chartSnapshot` alone (pure function, no new backend data). Shown three ways: a badge on each palace card with a plain-language band label, a twelve-axis chart above the palace section, and a "Điểm này tính thế nào" box that prints the whole formula. Reference implementation and weights: `prototype/revamp-2026-09/doc-bao-cao-tuong-tac-score.js`.

Constraints that keep this inside FD-107: deterministic, reproducible from the same chart, every contribution traceable to a real star, formula published in the UI, and never described as a rating of the person's life or luck.

### 7b.3 All eight decadal cycles (FD-106b)

Wave 1 already derives the full 12-cycle engine run. Round 2 gives each cycle content:

- Current cycle: unchanged depth, full reading.
- Other seven teasers: derive 12 engine cycles and identify current by age range. If current ordinal is 0..7, return ordinals 0..7 excluding current (7 teasers). If current ordinal is outside 0..7, select 8 consecutive engine cycles containing current, clamped at boundaries, and return all except current (7 teasers); no invented cycles.
- Each teaser: a 120 to 200 syllable teaser each, as new writer sections.
- The timeline lists every cycle with its teaser and a link: the current cycle links to its full reading, the others to the palace the cycle passes through.
- A "Dải này nói gì về bạn?" box above the list explains how to read the timeline and states plainly that it does not rank cycles good or bad. Pattern borrowed from AiTuvi's "Biểu đồ của bạn nói gì", which is the clearest thing on their page.

### 7b.4 Beginner-first writing and the storytelling overview (FD-106c, FD-106d)

Full rules: `docs/superpowers/specs/2026-09-28-report-writing-rules-beginner-first.md`. The two load-bearing changes are that a star name must be translated into ordinary language the moment it appears, capped at one and a half distinct names per 80 syllables (calibrated on the approved texts), and that `minimumPalaceStars` moves from counting names in the prose to counting stars in the section's evidence refs, so the chips and the "Vì sao" box carry the proof instead of the sentences.

Section length targets are unchanged. The overview gains a fixed five-beat arc at the same length.

## 8. Metrics

Baseline from existing `useReportReaderAnalytics` (active section + scroll %) before wave 1.
- Reach-last-section rate; median time per section; palace-card expands; chart clicks; print/share rate; Tier-1 → Tier-2 upgrade rate from the reader.
- Qualitative: 5 readers, "name 3 things you remember about your chart" before/after.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Hiding detail makes 960 Lá feel thin | Show counts ("12 cung · 40 đoạn chi tiết"), first 2 palaces open, "Mở tất cả", print expands |
| Wave-2 gate failure rate rises | Bounded rewrite path exists (FD-082); run 20-pass gate before traffic |
| Decadal recompute for old reports mismatches frozen text | Only derive from frozen chart; on any mismatch with the frozen current cycle, show current cycle only |
| 12-cell chart unreadable on phone | Mini chart shows lit cell + names only; full detail in sheet |
| One developer | Waves are independently shippable |

## 10. Out of scope

Scores/ratings, predictive trend charts (FD-063), regenerating sold reports, audio, new SKUs.
