# Sitemap v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the navigation, routing, and Tử Vi renaming decisions from `docs/19-sitemap-v2-discipline-pages.md` into the actual `prototype/` build, and stand up placeholder pages for the four not-yet-built flagship disciplines plus the Free Tools hub, so the site's information architecture matches the approved design before the real per-discipline content is built.

**Architecture:** `prototype/` pages are static exports from a design tool (Claude Design) — most pages depend on a per-page `_ds/` token/component directory and `x-import component-from-global-scope="DesignSystem_031f07...."` elements that only resolve inside that tool. `prototype/homepage/homepage.html` is a self-contained, hand-editable exception (hardcoded CSS values, plain `<a>`/`<div>` markup, only isolated `{{ }}`/`sc-if`/`sc-for` bindings in a few dynamic spots like the FAQ accordion). Every existing page's *header/footer nav links* are plain `<a href="...">` markup even where the rest of the page uses `x-import` — so nav/route wiring is editable directly with `Edit`/`sed`, without needing the design tool. New pages containing bespoke content are NOT part of this plan (see §Roadmap below).

**Tech Stack:** Static HTML/CSS, no build step, no test framework — this repo has no automated tests for `prototype/`. Verification is manual, following the QA checklist already established in `docs/16-claude-design-page-build-handoff.md` (last section), adapted per task below.

---

## Roadmap (why this plan only covers Phase 1)

`docs/19` §8 lists follow-ups spanning far more than one session's worth of work, and it mixes two fundamentally different kinds of work that must not be planned the same way:

| Phase | Work | How it gets built |
|---|---|---|
| **Phase 1 (this plan)** | Rename Tử Vi/wizard routes, fix internal links, update homepage nav + services section, create 5 "Sắp ra mắt" stub pages, add the discipline-page header variant | Direct file edits in this repo — no design tool needed (see Architecture above) |
| **Phase 2 (separate handoff doc, not this plan)** | Full bespoke pages for `/bat-tu`, `/kinh-dich`, `/chiem-tinh`, `/than-so-hoc`, `/cong-cu-mien-phi` + its 7 children, each with real `_ds`-integrated components and the artifact photography from `docs/19` §6.2 | Claude Design handoff document (`docs/20-...`, matching the `docs/16` pattern) — these need the design tool's component/token generation, the same way all prior full pages were built |
| **Phase 3 (separate, content/asset work)** | New homepage hero imagery per `docs/19` §6.3, per-discipline artifact photography | Image generation workflow per `prototype/art-direction.md`, then a design-tool pass to place them |

Phase 1 is self-contained and unblocks Phase 2 (Phase 2's pages need real URLs and correct nav to link into, which Phase 1 creates). This plan produces **working, reviewable software on its own**: after Phase 1, every nav link and homepage card resolves to a real page (either the live Tử Vi flow or an honest "Sắp ra mắt" placeholder), with no dead links.

---

## Task 1: Rename Tử Vi and wizard routes; fix every internal reference

**Files:**
- Rename: `prototype/la-so-tu-vi/` → `prototype/tu-vi/`
- Rename: `prototype/la-so-tu-vi-tao/` → `prototype/lap-la-so/`
- Modify: `prototype/homepage/homepage.html`
- Modify: `prototype/tu-vi/index.html` (post-rename)
- Modify: `prototype/lap-la-so/index.html` (post-rename)
- Modify: `prototype/kien-thuc-tu-vi/index.html`
- Modify: `prototype/kien-thuc-tu-vi-la-so-tu-vi-la-gi/index.html`
- Modify: `prototype/luan-giai-tu-vi-tong-quan-ban-menh/index.html`
- Modify: `prototype/la-so-ket-qua/index.html`
- Modify: `prototype/tai-khoan/index.html`
- Modify: `prototype/thanh-toan/index.html`
- Modify: `prototype/bao-cao-doc/index.html`

- [ ] **Step 1: Rename the two directories with git mv**

```bash
git mv prototype/la-so-tu-vi prototype/tu-vi
git mv prototype/la-so-tu-vi-tao prototype/lap-la-so
```

- [ ] **Step 2: Replace the wizard path first (longer string), across every prototype page**

Must run before Step 3 — `/la-so-tu-vi-tao` contains `/la-so-tu-vi` as a substring, so replacing the short form first would corrupt the long form.

```bash
grep -rl '/la-so-tu-vi-tao' prototype/*/index.html | while read -r f; do
  sed -i '' 's#/la-so-tu-vi-tao#/lap-la-so#g' "$f"
done
```

(On Linux, drop the `''` after `-i`.)

- [ ] **Step 3: Replace the Tử Vi calculator path across every prototype page**

```bash
grep -rl '/la-so-tu-vi' prototype/*/index.html prototype/homepage/homepage.html | while read -r f; do
  sed -i '' 's#/la-so-tu-vi#/tu-vi#g' "$f"
done
```

- [ ] **Step 4: Verify no old references remain**

```bash
grep -rn 'la-so-tu-vi' prototype/*/index.html prototype/homepage/homepage.html
```

Expected: no output. If anything prints, it's either a leftover route reference (fix it) or a content string that happens to contain the substring (check by hand before deciding — none are currently known to exist based on the `grep` done during planning, but verify).

- [ ] **Step 5: Re-check the JSON-LD breadcrumb/canonical URLs in `kien-thuc-tu-vi-la-so-tu-vi-la-gi/index.html`**

That file has hardcoded `https://lasoviet.vn/...` URLs in `<script type="application/ld+json">` (not path-relative, so Steps 2–3's `sed` won't have touched them if they don't literally contain `/la-so-tu-vi`). Open the file and confirm the `mainEntityOfPage` and breadcrumb `item` values still make sense — they reference `/kien-thuc/tu-vi/...`, which is a separate content route unaffected by this rename, so no change needed there. This step is a manual read-check, not a further edit — confirm and move on.

- [ ] **Step 6: Commit**

```bash
git add -A -- prototype/
git commit -m "$(cat <<'EOF'
refactor: rename /la-so-tu-vi to /tu-vi and wizard to /lap-la-so

Bare discipline-name URL per docs/19 §2/D-028. Nothing is in
production yet, so this costs no real SEO equity. Updates every
internal reference across the prototype pages that link to the old
paths.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Slim homepage header (context-sensitive nav, §1.1)

**Files:**
- Modify: `prototype/homepage/homepage.html:108-115`

- [ ] **Step 1: Replace the nav block**

Current (post-Task-1, the `#hero-form` and other hrefs are unaffected by the rename):

```html
      <nav style="display: flex; gap: 28px; margin-left: 12px; font-size: 14.5px;">
        <a href="#hero-form" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Lập lá số Tử Vi</a>
        <a href="#he-quy-chieu" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Các hệ quy chiếu</a>
        <a href="#kien-thuc" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Thư viện tri thức</a>
        <a href="#phuong-phap" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Về phương pháp</a>
      </nav>
      <div style="flex: 1;"></div>
      <a href="#hero-form" style="display: inline-flex; align-items: center; min-height: 44px; padding: 0 20px; border-radius: 4px; background: linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%); color: #0F0D0A; font-weight: 600; font-size: 14.5px; text-decoration: none;" style-hover="filter: brightness(1.08); text-decoration: none;">Lập lá số miễn phí</a>
```

New — per `docs/19` §1.1 (`Dịch vụ | Công cụ miễn phí | Kiến thức | Liên hệ ↗ | [Đăng nhập] [Lập lá số miễn phí]`):

```html
      <nav style="display: flex; gap: 28px; margin-left: 12px; font-size: 14.5px;">
        <a href="#dich-vu" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Dịch vụ</a>
        <a href="/cong-cu-mien-phi" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Công cụ miễn phí</a>
        <a href="/kien-thuc" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Kiến thức</a>
        <a href="https://www.facebook.com/lasoviet.vn" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 4px; color: #DCD4C3;" style-hover="color: #F2DCA0;">Liên hệ<svg width="12" height="12" aria-hidden="true"><use href="#i-external-link"></use></svg></a>
      </nav>
      <div style="flex: 1;"></div>
      <a href="/dang-nhap" style="display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; color: #DCD4C3; font-size: 14.5px; text-decoration: none;" style-hover="color: #F2DCA0;"><svg width="18" height="18" aria-hidden="true"><use href="#i-user-circle"></use></svg>Đăng nhập</a>
      <a href="#hero-form" style="display: inline-flex; align-items: center; min-height: 44px; padding: 0 20px; border-radius: 4px; background: linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%); color: #0F0D0A; font-weight: 600; font-size: 14.5px; text-decoration: none;" style-hover="filter: brightness(1.08); text-decoration: none;">Lập lá số miễn phí</a>
```

Notes: `i-external-link` and `i-user-circle` are already defined in the `<defs>` sprite block earlier in the file (verified present — no new icon needed). `https://www.facebook.com/lasoviet.vn` is a placeholder handle — replace with the real fanpage URL before shipping; flag this to the founder rather than guessing.

- [ ] **Step 2: Open the file in a browser and confirm the header renders with 4 nav items + login + CTA, no layout overflow at 1200px and at 375px (mobile nav is handled separately — this step just confirms the desktop bar doesn't visually break)**

- [ ] **Step 3: Commit**

```bash
git add prototype/homepage/homepage.html
git commit -m "$(cat <<'EOF'
feat: slim homepage nav to Dịch vụ/Công cụ miễn phí/Kiến thức/Liên hệ

Per docs/19 §1.1 — homepage header no longer lists every discipline;
that only happens on discipline pages (Task 5). Login becomes a nav
item; primary CTA unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Rename the services section and expand it to all 12 disciplines (§1.1, §1.4)

**Files:**
- Modify: `prototype/homepage/homepage.html` — section starting `<section id="he-quy-chieu" ...>` (currently 4 cards: Tử Vi, Bát Tự, Bản đồ sao, Thần Số Học)

- [ ] **Step 1: Add a new sprite icon for Kinh Dịch**

Find the `<defs>` block near the top of the file (the same block containing `i-star`, `i-elements`, `i-orbit`, `i-hash`, etc. — used by the existing 4 cards). Add one new symbol immediately before the closing `</defs>`:

```html
      <symbol id="i-hexagram" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 5.5h16M4 9.5h6.5M13.5 9.5h6.5M4 13.5h16M4 17.5h6.5M13.5 17.5h6.5M4 21.5h16"></path></symbol>
```

This draws 6 stacked horizontal registers (a hexagram's six lines), with two of them (rows 2 and 4, at y=9.5 and y=17.5) drawn as broken/split lines (yin) and the rest solid (yang) — a real, simplified Kinh Dịch reference, not decorative filler.

- [ ] **Step 2: Rename the section id and heading, and change `he-quy-chieu` → `dich-vu` everywhere it's referenced as an anchor target**

```bash
sed -i '' 's#id="he-quy-chieu"#id="dich-vu"#; s#href="#he-quy-chieu"#href="#dich-vu"#g' prototype/homepage/homepage.html
```

Then check `grep -n 'he-quy-chieu' prototype/homepage/homepage.html` returns nothing (all renamed). Note the footer link in Task 4 will also point here.

- [ ] **Step 3: Update the section eyebrow/heading copy to reflect "all disciplines" instead of "4 lenses on one profile" (that specific 4-lens framing stays true and useful — keep it as a sub-block, see Step 4 — but the section itself now needs to also introduce the free tools)**

Change:

```html
      <div style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #C9A44D;">Hệ quy chiếu đa chiều</div>
      <h2 style="margin: 18px 0 0; max-width: 680px; font-family: 'Source Serif 4', Georgia, serif; font-weight: 400; font-size: 34px; line-height: 1.2; color: #F6F1E6;">Một hồ sơ sinh duy nhất. Soi tỏ qua 4 lăng kính.</h2>
      <p style="margin: 16px 0 0; max-width: 680px; font-size: 16px; line-height: 1.75; color: #DCD4C3;">Nhập ngày giờ sinh một lần. Hồ sơ của bạn được kích hoạt đồng thời qua 4 bộ môn nguyên bản — không pha trộn, không suy diễn gượng ép.</p>
```

To:

```html
      <div style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #C9A44D;">Dịch vụ</div>
      <h2 style="margin: 18px 0 0; max-width: 680px; font-family: 'Source Serif 4', Georgia, serif; font-weight: 400; font-size: 34px; line-height: 1.2; color: #F6F1E6;">Một hồ sơ sinh duy nhất. Soi tỏ qua 5 lăng kính.</h2>
      <p style="margin: 16px 0 0; max-width: 680px; font-size: 16px; line-height: 1.75; color: #DCD4C3;">Nhập ngày giờ sinh một lần — hồ sơ của bạn được kích hoạt đồng thời qua 4 bộ môn nguyên bản. Kinh Dịch dùng câu hỏi riêng, không cần hồ sơ sinh.</p>
```

- [ ] **Step 4: Change the card grid from 4 columns to 5, and add the Kinh Dịch card as the 5th**

Change `grid-template-columns: repeat(4, minmax(0, 1fr));` to `grid-template-columns: repeat(5, minmax(0, 1fr));` in the grid `<div>` that wraps the 4 existing cards.

Update the Bát Tự and Bản đồ sao cards' `href="#"` placeholders (currently dead links) to real Task-1-renamed/Task-6-stub routes:

```html
          <a href="/bat-tu" style="margin-top: 16px; display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px;">Khám phá Bát Tự<svg width="14" height="14" aria-hidden="true"><use href="#i-arrow-right"></use></svg></a>
```

```html
          <a href="/chiem-tinh" style="margin-top: 16px; display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px;">Khám phá Bản đồ sao<svg width="14" height="14" aria-hidden="true"><use href="#i-arrow-right"></use></svg></a>
```

```html
          <a href="/than-so-hoc" style="margin-top: 16px; display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px;">Khám phá Thần Số Học<svg width="14" height="14" aria-hidden="true"><use href="#i-arrow-right"></use></svg></a>
```

And the first card's CTA (`Xem lá số Tử Vi`, currently `href="#hero-form"`) stays pointed at the on-page form since Tử Vi is live — no change needed there.

Add the 5th card immediately after the Thần Số Học card's closing `</div>`, before the grid's closing `</div>`:

```html
        <div style="background: #1C1813; border: 1px solid #3A3227; border-radius: 8px; padding: 28px 24px; display: flex; flex-direction: column;">
          <svg width="26" height="26" style="color: #C9A44D;" aria-hidden="true"><use href="#i-hexagram"></use></svg>
          <div style="margin-top: 18px; font-family: 'Source Serif 4', Georgia, serif; font-size: 19px; line-height: 1.35; color: #F6F1E6;">Kinh Dịch</div>
          <div style="margin-top: 4px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #A8842F;">Chu Dịch cổ truyền</div>
          <p style="margin: 12px 0 0; flex: 1; font-size: 14.5px; line-height: 1.65; color: #A79E8B;">Đặt một câu hỏi thật, gieo một quẻ. Không cần hồ sơ sinh — chỉ cần câu hỏi và thời điểm gieo quẻ.</p>
          <a href="/kinh-dich" style="margin-top: 16px; display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px;">Khám phá Kinh Dịch<svg width="14" height="14" aria-hidden="true"><use href="#i-arrow-right"></use></svg></a>
        </div>
```

- [ ] **Step 5: Add a secondary, more compact row for the 7 bundled Free Tools, inside the same `#dich-vu` section, after the 5-card grid's closing `</div>` and before the section's own closing `</div></section>`**

```html
      <div style="margin-top: 56px; padding-top: 40px; border-top: 1px solid #3A3227;">
        <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 24px; flex-wrap: wrap;">
          <h3 style="margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-weight: 400; font-size: 22px; color: #F6F1E6;">Công cụ miễn phí</h3>
          <a href="/cong-cu-mien-phi" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px;">Xem tất cả<svg width="14" height="14" aria-hidden="true"><use href="#i-arrow-right"></use></svg></a>
        </div>
        <div style="margin-top: 24px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px;">
          <a href="/ngay-tot" style="display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #1C1813; border: 1px solid #3A3227; border-radius: 8px; color: #DCD4C3; text-decoration: none; font-size: 14px;" style-hover="border-color: #C9A44D; color: #F2DCA0;"><svg width="18" height="18" aria-hidden="true"><use href="#i-calendar-day"></use></svg>Xem Ngày Tốt</a>
          <a href="/12-con-giap" style="display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #1C1813; border: 1px solid #3A3227; border-radius: 8px; color: #DCD4C3; text-decoration: none; font-size: 14px;" style-hover="border-color: #C9A44D; color: #F2DCA0;"><svg width="18" height="18" aria-hidden="true"><use href="#i-compass"></use></svg>12 Con Giáp</a>
          <a href="/phong-thuy/huong-nha" style="display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #1C1813; border: 1px solid #3A3227; border-radius: 8px; color: #DCD4C3; text-decoration: none; font-size: 14px;" style-hover="border-color: #C9A44D; color: #F2DCA0;"><svg width="18" height="18" aria-hidden="true"><use href="#i-map-pin"></use></svg>Phong Thủy Hướng Nhà</a>
          <a href="/giai-ma-giac-mo" style="display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #1C1813; border: 1px solid #3A3227; border-radius: 8px; color: #DCD4C3; text-decoration: none; font-size: 14px;" style-hover="border-color: #C9A44D; color: #F2DCA0;"><svg width="18" height="18" aria-hidden="true"><use href="#i-book-open"></use></svg>Giải Mã Giấc Mơ</a>
          <a href="/boi-bai" style="display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #1C1813; border: 1px solid #3A3227; border-radius: 8px; color: #DCD4C3; text-decoration: none; font-size: 14px;" style-hover="border-color: #C9A44D; color: #F2DCA0;"><svg width="18" height="18" aria-hidden="true"><use href="#i-star"></use></svg>Tarot / Bói Bài</a>
          <a href="/lich-am" style="display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #1C1813; border: 1px solid #3A3227; border-radius: 8px; color: #DCD4C3; text-decoration: none; font-size: 14px;" style-hover="border-color: #C9A44D; color: #F2DCA0;"><svg width="18" height="18" aria-hidden="true"><use href="#i-calendar-day"></use></svg>Lịch Âm</a>
          <a href="/xem-chi-tay" style="display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #1C1813; border: 1px solid #3A3227; border-radius: 8px; color: #DCD4C3; text-decoration: none; font-size: 14px;" style-hover="border-color: #C9A44D; color: #F2DCA0;"><svg width="18" height="18" aria-hidden="true"><use href="#i-user"></use></svg>Xem Chỉ Tay</a>
        </div>
      </div>
```

All 7 icons used here (`i-calendar-day`, `i-compass`, `i-map-pin`, `i-book-open`, `i-star`, `i-user`) are already defined in the sprite — no icon reuse collides with a different card's established meaning (`i-star` is reused from Tử Vi's card for Tarot; acceptable since they're in different sections of the page and both are legitimately star-shaped topics — flag as a nice-to-have to give Tarot its own icon in Phase 2, not a blocker here).

- [ ] **Step 6: Open in a browser at 1200px, 768px, 375px — confirm the 5-card grid and the 7-item tool row both reflow without horizontal overflow. The 5-column grid will be tight at 768px; if it visibly breaks, change `repeat(5, ...)` to `repeat(3, minmax(0,1fr))` at that breakpoint using the file's existing `@media (max-width: 767px)` block (see near the top `<style>`), following the same pattern already used there for `.lsv-process-row`.**

- [ ] **Step 7: Commit**

```bash
git add prototype/homepage/homepage.html
git commit -m "$(cat <<'EOF'
feat: expand homepage Dịch vụ section to all 5 flagship + 7 free tools

Renames #he-quy-chieu to #dich-vu, adds the Kinh Dịch card (new
i-hexagram sprite icon) as the 5th flagship, and adds a compact Free
Tools row linking to /cong-cu-mien-phi and its 7 children. Wires up
the Bát Tự/Chiêm Tinh/Thần Số Học cards, which previously pointed to
href="#". Per docs/19 §1.1/§1.4.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update the footer to match

**Files:**
- Modify: `prototype/homepage/homepage.html:628-668` (footer)

- [ ] **Step 1: Update the "Sản phẩm" column and the "Liên hệ" link**

Change:

```html
            <a href="#hero-form" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Lập lá số Tử Vi</a>
            <a href="#he-quy-chieu" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Các hệ quy chiếu</a>
            <a href="#luan-giai" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Luận giải chuyên sâu</a>
            <a href="#" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Báo cáo mẫu</a>
```

To:

```html
            <a href="#hero-form" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Lập lá số Tử Vi</a>
            <a href="#dich-vu" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Tất cả dịch vụ</a>
            <a href="/cong-cu-mien-phi" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Công cụ miễn phí</a>
            <a href="#" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Báo cáo mẫu</a>
```

And in the "Công ty & pháp lý" column, change the dead `Liên hệ` link:

```html
            <a href="#" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Liên hệ</a>
```

To:

```html
            <a href="https://www.facebook.com/lasoviet.vn" target="_blank" rel="noopener" style="color: #DCD4C3;" style-hover="color: #F2DCA0;">Liên hệ ↗</a>
```

(Same placeholder fanpage URL caveat as Task 2 — confirm the real handle before shipping.)

- [ ] **Step 2: Commit**

```bash
git add prototype/homepage/homepage.html
git commit -m "$(cat <<'EOF'
fix: point footer nav at renamed/new routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Discipline-page header variant on `/tu-vi`

**Files:**
- Modify: `prototype/tu-vi/index.html:60-77` (header, post Task-1 rename)

- [ ] **Step 1: Replace the nav list**

Current:

```html
      <nav style="display:flex;gap:32px;font-size:15px" class="ls-nav-links">
        <a href="/" style="color:var(--text-body);text-decoration:none">Trang chủ</a>
        <a href="/la-so-tu-vi" style="color:var(--gold-400);text-decoration:none;border-bottom:1px solid var(--gold-500);padding-bottom:2px">Lập lá số</a>
        <a href="/luan-giai-mau" style="color:var(--text-body);text-decoration:none">Luận giải mẫu</a>
        <a href="/kien-thuc" style="color:var(--text-body);text-decoration:none">Kiến thức</a>
        <a href="/ve-chung-toi" style="color:var(--text-body);text-decoration:none">Về chúng tôi</a>
      </nav>
```

New — per `docs/19` §1.2 (`Trang chủ | Tử Vi | Bát Tự | Kinh Dịch | Chiêm Tinh | Thần Số Học | Kiến thức | Công cụ miễn phí | [Đăng nhập]`), with the current page (`Tử Vi`) marked active the same way `/la-so-tu-vi` was marked active before:

```html
      <nav style="display:flex;gap:24px;font-size:14px;flex-wrap:wrap" class="ls-nav-links">
        <a href="/" style="color:var(--text-body);text-decoration:none">Trang chủ</a>
        <a href="/tu-vi" style="color:var(--gold-400);text-decoration:none;border-bottom:1px solid var(--gold-500);padding-bottom:2px">Tử Vi</a>
        <a href="/bat-tu" style="color:var(--text-body);text-decoration:none">Bát Tự</a>
        <a href="/kinh-dich" style="color:var(--text-body);text-decoration:none">Kinh Dịch</a>
        <a href="/chiem-tinh" style="color:var(--text-body);text-decoration:none">Chiêm Tinh</a>
        <a href="/than-so-hoc" style="color:var(--text-body);text-decoration:none">Thần Số Học</a>
        <a href="/kien-thuc" style="color:var(--text-body);text-decoration:none">Kiến thức</a>
        <a href="/cong-cu-mien-phi" style="color:var(--text-body);text-decoration:none">Công cụ miễn phí</a>
      </nav>
```

Drop the old `/luan-giai-mau` and `/ve-chung-toi` links (neither is part of the approved IA in `docs/14`/`docs/19`; `/luan-giai-tu-vi-tong-quan-ban-menh` is the real commercial child page and is already linked from elsewhere on this page's body, not the header nav).

- [ ] **Step 2: The `Đăng nhập` affordance — this page's header currently has only the primary CTA button + mobile menu toggle in the right-hand group (`<x-import ... variant="primary" ...>Lập lá số ngay</x-import>` + menu button), no login link. Add one, matching the homepage pattern from Task 2 Step 1, placed before the CTA button:**

```html
        <a href="/dang-nhap" style="display:flex;align-items:center;gap:6px;color:var(--text-body);text-decoration:none;font-size:14px">Đăng nhập</a>
```

Insert it as the first child inside the `<div style="display:flex;align-items:center;gap:16px">` wrapper that currently holds the CTA button and menu toggle.

- [ ] **Step 3: Verify in a browser: 8 nav items + login + CTA + menu toggle at 1200px doesn't overflow. If it's tight, this is expected — `docs/19` §1.2 explicitly accepts this density on discipline pages (matches huyenmenh's own discipline-page nav, which runs 8 items). If it visually breaks (wraps ugly, not just tight), reduce nav font-size slightly (already lowered to 14px from the original 15px in Step 1) or let it wrap onto a second line via the `flex-wrap:wrap` already added.**

- [ ] **Step 4: Commit**

```bash
git add prototype/tu-vi/index.html
git commit -m "$(cat <<'EOF'
feat: switch /tu-vi header to full discipline-switcher nav

Per docs/19 §1.2 — this is the first page to carry the in-discipline
header (links to all 5 flagships + Kiến thức + Công cụ miễn phí),
replacing placeholder /luan-giai-mau and /ve-chung-toi links that
weren't part of the approved IA.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: "Sắp ra mắt" stub pages for the 4 unbuilt flagships + Free Tools hub

**Files:**
- Create: `prototype/bat-tu/index.html`
- Create: `prototype/kinh-dich/index.html`
- Create: `prototype/chiem-tinh/index.html`
- Create: `prototype/than-so-hoc/index.html`
- Create: `prototype/cong-cu-mien-phi/index.html`

These are honest placeholders, not fake product — no form, no calculation, just the discipline-switcher header (so cross-nav already works once Phase 2 replaces the body), a "Sắp ra mắt" state, and a link back. Plain, dependency-free HTML — no `_ds`/`x-import`, matching the constraint from `docs/19` §7 ("no fake form, no fake calculation").

- [ ] **Step 1: Write the shared stub template to `prototype/bat-tu/index.html`**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>Bát Tự / Tứ Trụ — Sắp ra mắt · Lá Số Việt</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Be+Vietnam+Pro:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
  html { color-scheme: dark; background: #0F0D0A; }
  body { margin: 0; background: #0F0D0A; color: #DCD4C3; font-family: "Be Vietnam Pro", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  * { box-sizing: border-box; }
  a { color: #C9A44D; text-decoration: none; }
  a:hover { color: #F2DCA0; text-decoration: underline; text-underline-offset: 3px; }
  nav a { text-decoration: none; }
  header nav { display: flex; gap: 24px; font-size: 14px; flex-wrap: wrap; }
</style>
</head>
<body>
  <header style="border-bottom: 1px solid #3A3227; padding: 0 32px; height: 74px; display: flex; align-items: center; gap: 40px; max-width: 1200px; margin: 0 auto;">
    <a href="/" style="font-family: 'Source Serif 4', Georgia, serif; font-size: 20px; color: #F6F1E6;">Lá Số Việt</a>
    <nav>
      <a href="/" style="color: #DCD4C3;">Trang chủ</a>
      <a href="/tu-vi" style="color: #DCD4C3;">Tử Vi</a>
      <a href="/bat-tu" style="color: #F2DCA0; border-bottom: 1px solid #C9A44D; padding-bottom: 2px;">Bát Tự</a>
      <a href="/kinh-dich" style="color: #DCD4C3;">Kinh Dịch</a>
      <a href="/chiem-tinh" style="color: #DCD4C3;">Chiêm Tinh</a>
      <a href="/than-so-hoc" style="color: #DCD4C3;">Thần Số Học</a>
      <a href="/kien-thuc" style="color: #DCD4C3;">Kiến thức</a>
      <a href="/cong-cu-mien-phi" style="color: #DCD4C3;">Công cụ miễn phí</a>
    </nav>
  </header>
  <main style="max-width: 680px; margin: 0 auto; padding: 120px 32px; text-align: center;">
    <div style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #C9A44D;">Sắp ra mắt</div>
    <h1 style="margin: 18px 0 0; font-family: 'Source Serif 4', Georgia, serif; font-weight: 400; font-size: 32px; line-height: 1.25; color: #F6F1E6;">Bát Tự / Tứ Trụ</h1>
    <p style="margin: 16px 0 0; font-size: 16px; line-height: 1.75; color: #A79E8B;">Lá Số Việt đang hoàn thiện luận giải Bát Tự — phân tích ngũ hành qua Năm, Tháng, Ngày, Giờ sinh, dùng chung hồ sơ sinh với Tử Vi. Trong lúc chờ, bạn có thể lập lá số Tử Vi miễn phí ngay.</p>
    <a href="/tu-vi" style="display: inline-flex; align-items: center; min-height: 44px; padding: 0 24px; margin-top: 32px; border-radius: 4px; background: linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%); color: #0F0D0A; font-weight: 600; font-size: 14.5px;">Lập lá số Tử Vi miễn phí</a>
  </main>
  <footer style="border-top: 1px solid #3A3227; margin-top: 80px; padding: 32px; text-align: center; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11.5px; color: #6E6656;">© 2026 Lá Số Việt · lasoviet.vn</footer>
</body>
</html>
```

`<meta name="robots" content="noindex, follow">` — a placeholder page must not get indexed as if it were the real discipline page (would create a thin/duplicate-content problem once the real page ships at the same URL); `follow` so link equity still flows through the nav.

- [ ] **Step 2: Create the remaining 4 stub pages by copying Step 1's file and substituting exactly these values (nothing else changes — same structure, same nav, same footer):**

| File | `<title>` | Active nav link (swap the highlighted one) | H1 | Body copy | CTA text/href |
|---|---|---|---|---|---|
| `prototype/kinh-dich/index.html` | `Kinh Dịch / Chu Dịch — Sắp ra mắt · Lá Số Việt` | `Kinh Dịch` | `Kinh Dịch / Chu Dịch` | `Lá Số Việt đang hoàn thiện Kinh Dịch — đặt một câu hỏi thật, gieo một quẻ theo phương pháp Mai Hoa/Lục Hào. Không cần hồ sơ sinh. Trong lúc chờ, bạn có thể lập lá số Tử Vi miễn phí ngay.` | same CTA as Bát Tự (`/tu-vi`, "Lập lá số Tử Vi miễn phí") |
| `prototype/chiem-tinh/index.html` | `Chiêm Tinh / Bản Đồ Sao — Sắp ra mắt · Lá Số Việt` | `Chiêm Tinh` | `Chiêm Tinh Tây Phương` | `Lá Số Việt đang hoàn thiện Bản Đồ Sao — dùng chung hồ sơ sinh với Tử Vi, cộng thêm nơi sinh để tính hệ nhà (house system). Trong lúc chờ, bạn có thể lập lá số Tử Vi miễn phí ngay.` | same CTA |
| `prototype/than-so-hoc/index.html` | `Thần Số Học — Sắp ra mắt · Lá Số Việt` | `Thần Số Học` | `Thần Số Học` | `Lá Số Việt đang hoàn thiện Thần Số Học — chỉ cần họ tên và ngày sinh, không cần giờ hay quy đổi âm lịch. Trong lúc chờ, bạn có thể lập lá số Tử Vi miễn phí ngay.` | same CTA |
| `prototype/cong-cu-mien-phi/index.html` | `Công Cụ Miễn Phí — Sắp ra mắt · Lá Số Việt` | `Công cụ miễn phí` | `Công Cụ Miễn Phí` | `Xem Ngày Tốt, 12 Con Giáp, Phong Thủy Hướng Nhà, Giải Mã Giấc Mơ, Tarot/Bói Bài, Lịch Âm và Xem Chỉ Tay đang được hoàn thiện tại đây. Trong lúc chờ, bạn có thể lập lá số Tử Vi miễn phí ngay.` | same CTA |

For each file, also update the `<div style="...">Sắp ra mắt</div>` eyebrow — leave it as `Sắp ra mắt` unchanged, and remember the active-nav-link styling (`color: #F2DCA0; border-bottom: 1px solid #C9A44D; padding-bottom: 2px;`) must move from the `Bát Tự` `<a>` to whichever discipline that file represents, with the other links reverting to the default `color: #DCD4C3;`.

- [ ] **Step 3: Verify all 5 files load with no console errors and no broken internal links**

```bash
for f in prototype/bat-tu prototype/kinh-dich prototype/chiem-tinh prototype/than-so-hoc prototype/cong-cu-mien-phi; do
  test -f "$f/index.html" && echo "OK: $f" || echo "MISSING: $f"
done
```

Expected: 5 `OK:` lines. Then open each in a browser and click every nav link to confirm it lands on either the live `/tu-vi` page, the homepage, or another stub in this same batch — no 404s.

- [ ] **Step 4: Commit**

```bash
git add prototype/bat-tu prototype/kinh-dich prototype/chiem-tinh prototype/than-so-hoc prototype/cong-cu-mien-phi
git commit -m "$(cat <<'EOF'
feat: add "Sắp ra mắt" stub pages for the 4 unbuilt flagships + tools hub

Standalone, dependency-free HTML (no _ds/x-import) — plain enough to
replace wholesale once each discipline's real Claude Design page
ships (Phase 2, docs/20). noindex,follow so these don't get indexed
as thin content but still pass link equity through the nav. Each
carries the full discipline-switcher header per docs/19 §1.2, so
cross-navigation already works today.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Full link-integrity pass

**Files:** none new — verification only, across all of `prototype/`

- [ ] **Step 1: Extract every internal `href` and confirm each resolves to either an existing directory or an external URL**

```bash
grep -ohE 'href="/[a-z0-9/_-]*"' prototype/*/index.html | sed 's/href="//;s/"$//' | sort -u
```

- [ ] **Step 2: For each internal path printed (ignore ones starting `http`, and ignore `#`-fragment-only hrefs), confirm `prototype/<path minus leading slash>/index.html` exists. Any path that doesn't resolve is either: (a) a route intentionally out of scope for this plan (e.g. `/dang-nhap`, `/ngay-tot`, `/12-con-giap`, `/phong-thuy/huong-nha`, `/giai-ma-giac-mo`, `/boi-bai`, `/lich-am`, `/xem-chi-tay` — all Phase 2 children, expected to 404 in the prototype for now, not a bug in this plan), or (b) a genuine leftover this task must fix. Cross-check against the Phase 2 list in the Roadmap before treating anything as a bug.**

- [ ] **Step 3: No commit needed for this task if Step 2 finds nothing to fix — it's a verification gate before calling Phase 1 done. If it finds a genuine leftover, fix it and commit with an appropriately scoped message.**

---

## Self-review notes (completed during planning, not a task to run)

- **Spec coverage:** `docs/19` §8's Phase-1-eligible items (rename Tử Vi, generalize wizard naming, expand homepage services section, stub pages so nav has no dead links) are each covered by a task above. Items requiring the design tool (full page builds, new homepage/discipline imagery) are explicitly deferred to Phase 2/3, not silently dropped — see Roadmap.
- **Wizard "generalization" scope check:** `docs/19` §3.1/§8 calls for generalizing `/la-so-tu-vi-tao` into a discipline-agnostic wizard. This plan only renames its route to `/lap-la-so` (Task 1) — it does not attempt to rewrite the wizard's internal copy/steps to be visibly multi-discipline, because that page is `x-import`/`_ds`-heavy (21 component references) and a deeper content rewrite there risks touching component wiring this plan hasn't inspected in full. Flagged here explicitly rather than silently narrowed: a follow-up task (copy-only edit of the wizard's step labels/headings from "Tử Vi" to generic "hồ sơ sinh" language) should be scoped separately once someone has read that file's `x-import` usage in full — not bundled into this plan's Task 1.
- **Placeholder scan:** no TBD/TODO; the Facebook fanpage URL is explicitly flagged as a placeholder needing the real handle (Tasks 2 and 4), not silently invented.
- **Type/naming consistency:** route names (`/tu-vi`, `/bat-tu`, `/kinh-dich`, `/chiem-tinh`, `/than-so-hoc`, `/cong-cu-mien-phi`, `/lap-la-so`) are identical across every task and match `docs/19` §2/§5 exactly.
