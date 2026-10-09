# Follow-up plan for the next session (2026-10-09)

Read first: the handoff memory `project_free_result_revamp_handoff.md`, this file, `docs/qa/2026-10-09-free-result-purchase-revamp.md`, and the original plan `plan/free-result-purchase-revamp` (phases 4 to 7).

Rules that still apply: Sonnet writes code, Opus reviews; effort medium; mobile-first and tell the founder before real UI work; founder is a non-coder (plain Vietnamese, no mixed jargon); any backend code is a Kaneo ticket for An (Minh An, userId WFmcpXkgkOx0XKnruxlZbbPpaCs7MmRL, project rcaikczb8v3h693a37g0zlzl); never move a Kaneo task to Done without deploy and smoke evidence; nothing merges without An or Lãm authorizing.

## State
- Stack of PRs, all with a passing GitHub `verify` job on the head: #326 stage, #327 overview cards, #339 evidence folded + closing block, #340 12-palace cards, #341 decade + months (base master, includes everything below), #342 ladder by tier, #343 icons, #344 one button per card, #345 icons rest + acceptance (head of stack). Recommended merge: retarget #345 to master and merge once (it contains the whole stack), then close the lower PRs as merged by inclusion. Needs An or Lãm to authorize.
- Local review stack: web :3000 and API :3001 from this worktree (scratchpad scripts web25.sh and api25.sh), review DB container `lsv-review-db`. Guest charts expire after 24 hours; create a new one through /tao-la-so/tu-vi.
- Acceptance: https://claude.ai/artifact/7FQsZiZiTCf9Nj4vQjVpbv (interim). Prototypes: https://claude.ai/artifact/5CrJXi35X6kRmUDe9giLbJ (chart page), https://claude.ai/artifact/SHBn3hZ4dEtDY86fKHrwoL (offer page).

## A. Founder review round of 2026-10-09 (do these first)

### A1. Offer page is not optimized for desktop
Seen in the prototype (screenshot of chon-luan-giai-v3) and true in the real page: each time tier holds one card, so the card hugs the left third and two thirds of the row are empty. The real CSS uses `repeat(auto-fit, minmax(260px, 1fr))`, which stretches a single card across the full row instead.
Plan:
1. Design the desktop layout in the prototype first (artifact), then the real page. Candidate: a sticky left rail listing the tiers (Hôm nay, Tháng, Năm, Cung, Chủ đề, Trọn đời, Gói gộp) with the balance chip, and a right column of cards in a two-column grid with a tier label on each card; featured cards span two columns. Keep one column on phone.
2. Cap the content width (about 1100 px), never let one card exceed about 520 px, group tiers with fewer than three cards into one grid row.
3. Re-run `tests/e2e/revamp-acceptance.spec.ts` (overflow, tap targets) and screenshots at 1024, 1280, 1440.
Same check for every other desktop page of this work (decade tab, month tiles, palace cards, closing block, top-up).

### A2. Overview text of each palace starts with system-style text and lowercase
Seen on the chart page, tab Tổng quan, the long overview: section titles such as "cung Quan Lộc" are lowercase, and each palace section opens with the facts sentence ("cung Mệnh an tại Tý; dữ liệu ghi nhận …; Đây là quan hệ theo vị trí địa chi, không phải sao …"). This is the rule-based text from `packages/backend/src/ziwei/free-structural-overview.ts` (`facts()`, `interpretation()`, `scoreText()`), which An replaces in LSV-82.
Plan:
1. Ask An (Kaneo LSV-82, comment already posted gmd41b8n1iakoe9wf7vcsz1p with the defect list) for the date rule-v2 ships, and confirm that the rule-v2 output uses capitalised titles and sentences, no semicolon-joined facts, no formula numbers.
2. Front-end stopgap that does not touch backend files: in the render of `model.overview.sections` capitalise the first letter of each title and paragraph; move the `facts()` paragraph (first paragraph of each palace section) out of the reading flow into that palace's Căn cứ sheet. Do not rewrite meaning on the client.
3. Add a test that fails when a rendered overview paragraph starts with a lowercase letter or contains "dữ liệu ghi nhận".

### A3. Numbering and headings are confusing on every tab
Seen: eyebrows "02", "03", "06", "07", "08", "09" above headings. They came from the old single page and mean nothing now that there are tabs, and the heading sentences are hard to understand ("Điều lá số nói riêng về bạn", "Mười hai cung mạnh yếu", "Một cung được đọc đầy đủ, diễn giải cấu trúc", and similar).
Plan:
1. Remove the numeric eyebrows everywhere in `apps/web/src/features/ziwei/ziwei-free-result.tsx` and the message files (`freeResult.*`, `tabs.*`).
2. Audit every visible heading and eyebrow on all five tabs (VI and EN), write one plain-language heading per block, and get the founder's approval on the list before coding. Draft to start from: Tổng quan: "Lá số này nói gì về bạn" / "Cung nào đỡ bạn, cung nào cần để ý" / "Một cung đọc trọn" (use the actual cung name); Năm nay: "Năm {năm} của bạn"; Đại vận: "Đường đời 10 năm"; 12 cung: "Từng cung trong lá số"; Chủ đề: "Những câu hỏi thường gặp".
3. Test that no rendered heading or eyebrow is only digits.

## B. Remaining items of the original plan
FE items (Lãm + Claude):
- Offer page: comparison table (needs An to confirm whether Bản mệnh gets the 7-day credit), on-card sample read from the chart (needs LSV-82 `teasers`), a "Hôm nay" free line on the Hôm nay tier, "Chặng kế tiếp" and "Năm gần hết" first-card logic with real per-person facts (the read-only purchase context API landed on master in #338; build `chooseFirstCard` as a pure function and test it on 7 charts), stronger copy for B set already chosen.
- Palace preview sheet: three "bạn sẽ biết" bullets and two sample sentences (second cut) from An's teasers.
- Closing block: switch the picker to An's `salient` ranking once exposed (Kaneo comment brc128ghttlen5ffw86bjqad is waiting for his answer).
- Phase 6 sample pages `mau-bai-<mon>.html` per product once An has real text; add each new SKU to `LADDER_ENTRIES` in `apps/web/src/features/reports/offer-ladder-config.ts`; Decade strip "Xem thử chặng" opens the Chặng card when that SKU is active.
- Remaining icons: nothing known; re-check any new Lá amount that appears.
- Bug (spawned task): Back sometimes reloads the whole free-result page. Fix it, then turn the flaky Playwright test green 10 of 10.
- Rewrite the three stale specs (`chart-tabs-navigation`, `chart-topics-mobile-dialog`, `free-chart-flow`) to the FD-109 design.
- Phase 7 after release: LCP on the real site with 4G throttling, Firefox and WebKit, real phone, funnel before/after on clean 7-day windows, 2 to 3 hand tests per sold product, update the acceptance page.

An-dependent (already in Kaneo; only ping if stale): LSV-82 (free text, AI, rule-v2), LSV-86/87/88 are merged to master and being finalized, LSV-89 (activation and FD-119 prices: lifetime 1,200 La, refund 50% for items of 500 La and above; the page still shows 960), LSV-90 waits for Lãm's spec, LSV-91 (Bát Tự + two-person), LSV-92 (six new topics), LSV-93 (P2).

## C. Order for the next session
1. Merge decision and CI: confirm with An or Lãm, retarget #345, wait for `verify`, merge.
2. A3 heading audit (approval first), then A2 stopgap, then A1 desktop layout (prototype first, then code).
3. Re-run revamp-acceptance and update the acceptance artifact.
4. Then the B list as An's data lands.
