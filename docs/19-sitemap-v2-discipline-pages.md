---
title: Lá Số Việt — Sitemap v2, Discipline Landing Pages & Art Direction Split
version: 1.1
status: founder-approved
date: 2026-09-05
approved_by: Founder (Harris/Product), via brainstorming session in-chat (revised 2026-09-05 after nav-clutter and shared-profile feedback)
supersedes:
  - "docs/03-sitemap-and-seo.md §1 (Navigation), and the top-level route grouping in §2 (calculator/commercial/knowledge presented as separate nav-level sections)"
  - "docs/14-sitemap-seo-wireframes.md §2 (Navigation, mega-menu model) and the sitemap-diagram framing in §3.1; the specific primary-entry slugs '/gieo-que-kinh-dich' and '/ban-do-sao' in §3.4.2–3.4.3 are replaced by '/kinh-dich' and '/chiem-tinh' as flagship URLs; '/la-so-tu-vi' is proposed for rename to '/tu-vi' (§2, not yet executed). §3.2–3.3 route registry (including the private `/tao-la-so/**` and `/la-so/{opaque_id}` wizard/result routes, reused as-is by §3 below), §3.4's per-discipline knowledge/commercial child-route tables, §3.5 entity-page gating, and the route-status system (§3.4.6) are NOT superseded."
depends_on:
  - docs/11-discipline-expansion-specs.md
  - docs/13-brand-experience-guideline.md (superseded on visual system by prototype/art-direction.md)
  - prototype/art-direction.md
  - prototype/homepage/homepage.html (current build)
changelog:
  - "v1.0 (2026-09-04): first version — flat 8-item nav, per-discipline intake forms"
  - "v1.1 (2026-09-05): context-sensitive nav (slim on homepage, full discipline-switcher on discipline pages) replaces flat nav; bare discipline-name URLs; single shared 'Lập lá số' birth-profile action replaces per-page intake forms for the four birth-profile disciplines"
---

# 19 — Sitemap v2: Discipline Landing Pages & Art Direction Split

## 0. Why this document exists

The founder requested a restructure of the top-level navigation so that,
beyond the homepage and the knowledge hub, every discipline (bộ môn) approved
in `docs/11` gets one dedicated landing page, each with its own required-input
UI matched to that method. This is a deliberate departure from the mega-menu
navigation model locked in `docs/14-sitemap-seo-wireframes.md` (FD-019). This
document records what changes, what is preserved, and why — so the change is
traceable rather than a silent reversal of a founder-approved decision, per
`AGENTS.md` §1.

Competitive reference: `huyenmenh.com` was reviewed for structural pattern
only, not copied. Two of its patterns are adopted deliberately because they
solve real problems here: (a) a **context-sensitive header** — a slim nav on
the homepage/services view, and a fuller discipline-switcher nav only once a
visitor is on a discipline page (huyenmenh does exactly this: compare its
`/#services` header to its `/tarot` header); and (b) one dedicated page per
discipline. Its dark mystical/starry aesthetic and fully independent per-page
theming are **not** adopted — see §6.

## 1. Navigation model

A flat nav listing every discipline at all times (the v1.0 draft of this doc)
was rejected as cluttered. The fix is a **context-sensitive header**: what's
in the nav depends on whether the visitor is on the homepage/services view or
already inside a discipline page.

### 1.1 Homepage header (slim)

```
Logo | Dịch vụ | Công cụ miễn phí | Kiến thức | Liên hệ ↗ | [Đăng nhập] [Lập lá số miễn phí]
```

- **Dịch vụ** — anchor link to the homepage's own services section (not a
  separate URL), which shows all 12 disciplines as cards, flagship and
  bundled alike. This section already exists in embryonic form as
  `prototype/homepage/homepage.html`'s "Một hồ sơ sinh, nhiều lăng kính"
  block (currently 3 cards: Bát Tự, Bản đồ sao, Thần Số Học); it needs to
  expand to represent all 12 and link each card to its real URL (§2, §5).
- **Công cụ miễn phí** — link to `/cong-cu-mien-phi` (§5).
- **Kiến thức** — link to `/kien-thuc`, unchanged from `docs/14`.
- **Liên hệ ↗** — external link to the Lá Số Việt Facebook fanpage, not an
  internal contact page. `/lien-he` (per `docs/14` §3.2) can still exist as a
  footer/legal-adjacent route for non-Facebook support, but is not the nav
  affordance.
- **Đăng nhập** — Google OAuth; becomes an account/avatar affordance once
  signed in.
- Primary CTA **Lập lá số miễn phí** — unchanged, already built in the
  current header.

### 1.2 Discipline-page header (full switcher)

Shown once a visitor is on any of the 5 flagship pages (§2):

```
Logo | Trang chủ | Tử Vi | Bát Tự | Kinh Dịch | Chiêm Tinh | Thần Số Học | Kiến thức | Công cụ miễn phí | [Đăng nhập]
```

This is where the flagship-discipline links actually live — not on the
homepage. A visitor who has committed to "discipline mode" gets full
cross-navigation between all five; a first-time homepage visitor doesn't see
all of them competing for attention before they've picked one.

### 1.3 Mobile

Unchanged principle from `docs/14` §2.2 (full-height menu, no horizontal
carousel). Content mirrors whichever header context is active (§1.1 vs §1.2).

### 1.4 Full discipline accounting

The homepage "Dịch vụ" section (§1.1) and the discipline-page switcher (§1.2)
together must account for all 12 disciplines from `docs/11` §3, plus
`Lịch Âm` (a pre-existing utility route from `docs/03` §2, not part of the
12-discipline selection in `docs/11`, grouped here for convenience):

| Tier | Pages | Where shown |
|---|---|---|
| **Flagship** — 5 of the 12 | Tử Vi Đẩu Số, Bát Tự/Tứ Trụ, Kinh Dịch/Chu Dịch, Bản Đồ Sao/Chiêm Tinh Tây Phương (incl. Cung Hoàng Đạo), Thần Số Học | Card in homepage Dịch vụ section; own link in discipline-page switcher (§1.2); own URL (§2) |
| **Bundled** — 6 of the 12, + Lịch Âm | Xem Ngày/Ngày Tốt, 12 Con Giáp, Phong Thủy (hướng nhà), Giải Mã Giấc Mơ, Tarot/Bói Bài, Xem Chỉ Tay (pilot), Lịch Âm | Card in homepage Dịch vụ section; grouped under `/cong-cu-mien-phi` (§5), each keeping its own indexable URL |
| Not shown | Nhân Tướng/Xem Mặt (12th of the 12) | Deferred per D-021; no page, no card, until reopened |

## 2. Route registry — discipline flagship pages

Slugs are bare discipline names, not keyword-stuffed phrases — matches the
"one clean URL per bộ môn" instruction and is a negligible SEO cost (ranking
signal comes from H1/title/on-page content, not the slug itself).

| Discipline | URL | Primary head keyword (still targeted on-page) | Status |
|---|---|---|---|
| Tử Vi Đẩu Số | `/tu-vi` *(rename from `/la-so-tu-vi`, not yet executed — see §7)* | lá số tử vi | Live under old slug |
| Bát Tự/Tứ Trụ | `/bat-tu` | bát tự, lá số bát tự | New |
| Kinh Dịch/Chu Dịch | `/kinh-dich` | kinh dịch | New |
| Bản Đồ Sao/Chiêm Tinh Tây Phương | `/chiem-tinh` | bản đồ sao, chiêm tinh | New |
| Thần Số Học | `/than-so-hoc` | thần số học | New |

`/tu-vi` vs. keeping `/la-so-tu-vi`: nothing is in production yet (this is
still `prototype/`), so a rename costs no real SEO equity — but it does touch
already-built files (`homepage.html` links, `kien-thuc-tu-vi/*`,
`luan-giai-tu-vi-tong-quan-ban-menh/*` all reference the old slug). Recorded
here as the recommended decision; not executed in this doc — belongs to the
implementation plan.

## 3. The shared birth-profile action — "Lập lá số" is one flow, not five forms

**Correction from v1.0**: that draft implied each of Tử Vi/Bát Tự/Chiêm
Tinh/Thần Số Học collects its own birth data on its own page. That's wrong,
and contradicts what's already decided: `docs/11` §4.1 explicitly says Thần
Số Học "dùng chung Birth Profile data model với Tử Vi," and the current build
already separates the public landing (`/la-so-tu-vi`) from the private intake
wizard (`/la-so-tu-vi-tao`). Founder feedback makes this explicit: **creating
a chart is one action; having a chart is what lets you apply the relevant
disciplines to interpret it.**

### 3.1 Shared wizard

One wizard collects the full superset of fields any birth-profile discipline
needs: display name (optional), birth date/time/place, gender, lunar/solar
calendar. This generalizes the existing `/la-so-tu-vi-tao` wizard into a
discipline-agnostic route (naming TBD at implementation time, e.g.
`/lap-la-so`) and produces the private profile already specified in `docs/14`
§3.3: `/la-so/{opaque_id}` (chart + free insight) and
`/la-so/{opaque_id}/chon-luan-giai` (choose interpretation topic). Those
routes are reused as-is — this doc does not invent new private-route shapes.

### 3.2 Which flagship pages use it

| Page | Relationship to the shared profile |
|---|---|
| Tử Vi | Primary consumer; already built this way |
| Bát Tự | Same profile, same wizard — reads date/time/place/gender/calendar |
| Chiêm Tinh | Same profile, same wizard — additionally requires **place** (for house-system calculation); every other discipline already collects place, so this adds no new field to the shared wizard, just makes an already-collected field mandatory for this reading |
| Thần Số Học | Same profile — but only consumes **name + birth date**, ignoring time/place/calendar. Can also be entered through a lighter standalone quick-form for a visitor who lands directly on `/than-so-hoc` with no profile yet; that quick entry still writes into the same shared profile record rather than creating a parallel one |
| Kinh Dịch | **Not part of this flow at all.** Its own action: question + casting moment (date/time). No birth profile involved. |

### 3.3 What "distinct UI per discipline" actually means now

Given four of the five flagship pages share one intake mechanism, the
per-discipline distinctiveness from §6 lives in three places, not in four
different intake forms:

1. **The landing/marketing content and visual identity** — still fully
   bespoke per page (signature artifact motif, accent color, copy) — see §6.
2. **The result/interpretation rendering** — genuinely different regardless
   of shared intake: Tử Vi's 12-cung chart wheel, Bát Tự's four-pillars grid,
   Chiêm Tinh's natal wheel, Thần Số Học's number grid. This is real
   structural difference, not decoration.
3. **Kinh Dịch's intake itself** — the one flagship page with a genuinely
   different form shape (question-first, not birth-profile-first).

### 3.4 Cross-linking

Each of the four birth-profile flagship pages should surface, once a profile
exists, direct links to view the *other* birth-profile disciplines' reading
from the same profile ("Bạn cũng có lá số Bát Tự từ hồ sơ này") — this is the
"một hồ sơ, nhiều lăng kính" mechanism already written into the homepage
content (`content-proposal.md` Block 5), now wired through to the actual
discipline pages instead of stopping at homepage teaser cards.

## 4. Per-discipline flagship page anatomy

Adapted from `docs/14` §8.1, revised to reflect §3 (no bespoke intake form on
four of five pages — a CTA into the shared flow instead):

1. Hero — H1 exact discipline name, primary CTA
   (`Lập lá số`/`Xem luận giải từ hồ sơ của bạn` if a profile already exists
   in session, or `Đặt câu hỏi` for Kinh Dịch)
2. "What you get for free"
3. Sample result — a real example of this method's chart/reading shape
4. Method, rule set, engine version, limitations
5. Deep paid-interpretation teaser → links to the discipline's commercial
   child page
6. Related knowledge articles (3–4) → links to `/kien-thuc/{discipline}/**`
7. FAQ from real queries
8. Closing CTA

## 5. `/cong-cu-mien-phi` (Free Tools hub)

Unchanged from v1.0. One nav-visible landing page presenting all seven
bundled tools as a card grid, each card routing to its own indexable URL:

- `/ngay-tot` — Xem Ngày/Chọn Ngày Tốt
- `/12-con-giap` — 12 Con Giáp
- `/phong-thuy/huong-nha` — Phong Thủy calculator (item-commerce still banned
  per D-010/D-020)
- `/giai-ma-giac-mo` — Giải Mã Giấc Mơ (mandatory disclaimer: no lottery/số đề
  association)
- `/boi-bai` — Tarot/Bói Bài (includes Bói Bài Tây, one page, not split)
- `/lich-am` — Lịch Âm
- `/xem-chi-tay` — Xem Chỉ Tay pilot (`noindex` until engagement/complaint
  rate validated per D-021; photo upload is opt-in with its own consent step)

Not gộp into one literal URL: each has independent search volume (10K–100K
for 12 con giáp, ngày tốt, tarot cluster; 1K–10K + long-tail for giấc mơ —
per `docs/03`/`docs/11`). One shared URL would make the page compete against
itself across unrelated intents. `12-con-giap` and `phong-thuy/huong-nha` may
optionally offer "dùng hồ sơ đã lưu" as a shortcut for visitors who already
created a birth profile via §3 (year and tuổi/mệnh are subsets of that
profile), but do not require creating one — these tools should stay usable
standalone.

## 6. Art direction & UI: distinct per page, one brand underneath

Unchanged from v1.0 — founder-approved, no revision needed this round.

Current visual system of record is `prototype/art-direction.md` ("Tàng thư dát
vàng" — dark lacquer, gold leaf, cinnabar, museum-artifact macro photography),
which supersedes the bright Paper-Ink-Cinnabar system described in
`docs/13-brand-experience-guideline.md`. `docs/13` §5.2/5.5/5.8 still need a
formal update to match (tracked as an open item in `art-direction.md` §6,
unchanged by this doc).

### 6.1 Constants across every page (what keeps it one brand)

- Dark lacquer surface (`#0F0D0A`–`#1C1813`), gold (`#C9A44D`/`#F2DCA0`) and
  cinnabar (`#CE5B45`) as the core palette
- Source Serif 4 (display/editorial) + Be Vietnam Pro (UI/body)
- Photography direction: museum-artifact style, single raking light, shallow
  depth of field, muted warm palette — per `art-direction.md` §1–§3

### 6.2 Variables per discipline (what makes each page distinct on purpose)

Each flagship page gets its own **signature artifact motif**, one secondary
accent color drawn from an approved extension of the core palette, and (per
§3.3) a genuinely distinct **result-rendering shape** rather than decorative
variation alone:

| Page | Signature artifact motif |
|---|---|
| Tử Vi | La kinh (geomantic compass) — already produced |
| Bát Tự | Ink stone + calligraphy brush / counting tools |
| Kinh Dịch | Mai Hoa coins / casting tokens |
| Chiêm Tinh | Brass astronomical instrument (armillary sphere/astrolabe) — already scoped as "ảnh dự phòng" in `art-direction.md` §3 |
| Thần Số Học | Pythagorean/geometric number motifs |

### 6.3 Homepage / platform-level imagery (revised scope)

The homepage represents the whole platform's Đông–Tây positioning ("một hồ sơ
sinh, nhiều lăng kính"), not any single discipline. Its imagery must not
over-index on Tử Vi/Đông-phương-specific artifacts (la kinh, Vietnamese
lacquer archive cabinet) the way the current build does. Homepage art
direction is broadened to **universal archive/observatory imagery** — still
inside the dark-lacquer macro-artifact family, but composed of artifacts
neutral or dual enough to read as "many reference systems, one archive"
(e.g., the brass astronomical instrument already scoped as a discipline-page
placeholder in `art-direction.md` §3 is a candidate for homepage use instead,
or a composition pairing an Eastern and Western instrument together). Each
discipline page, including Tử Vi's own, is where the discipline-specific
artifact (la kinh, etc.) now lives without needing to also carry the whole
platform's identity.

**Follow-up implied, not executed by this doc**: the current
`prototype/homepage/homepage.html` hero and supporting imagery are Tử Vi-coded
and will need a new image pass aligned to §6.3 before the multi-discipline
positioning is visually complete. Tracked as an open item, not built here.

### 6.4 Controlled exemption: Tarot and Chiêm Tinh imagery

`art-direction.md` §2 bans tarot cards and Western zodiac symbols in imagery.
That rule was written for the homepage/Tử Vi context, where such imagery would
undercut the "kho tàng thư Đông phương" first impression. It cannot apply
verbatim to `/boi-bai` and `/chiem-tinh`, which need to show exactly those
things to function as pages.

**Resolution (founder-approved)**: the ban stays in force for homepage and
`/tu-vi`. `/boi-bai` and `/chiem-tinh` get a controlled exemption: tarot
cards and zodiac symbols may appear, but must stay within the same
dark-lacquer/raking-light/macro-artifact treatment — e.g. the tarot deck shot
as a museum artifact (deck + box + worn edges, not cards fanned out in a
generic web-tarot layout), zodiac symbols engraved on a brass instrument
rather than rendered as flat app-style icons. This keeps the exemption from
becoming a crack that lets generic mystical-site visual tropes back in.

## 7. What this changes vs. the locked blueprint (FD-019) and vs. v1.0 of this doc

| Locked in `docs/14` | Changed to |
|---|---|
| Mega-menu nav (`Lập lá số` containing all disciplines, `Luận giải` separate top-level) | Context-sensitive header — slim on homepage, full discipline-switcher only on discipline pages (§1) |
| "Chỉ hiển thị sản phẩm đã hoạt động; không trình bày roadmap như tính năng live" (nav shows only live products) | Homepage "Dịch vụ" section shows all 12 disciplines as cards from the start; disciplines without a working engine show an explicit "Sắp ra mắt" state — no fake form, no fake calculation |
| Per-discipline calculator URLs (`/gieo-que-kinh-dich`, `/ban-do-sao`) | Bare discipline-name flagship URLs (§2); `/la-so-tu-vi` proposed for rename to `/tu-vi`, not yet executed |
| Homepage imagery scope (implicit, via `art-direction.md` Tử Vi-first execution) | Homepage imagery broadened to platform-level/universal archive motifs (§6.3) |
| `art-direction.md` §2 blanket ban on tarot/zodiac imagery | Controlled exemption for `/boi-bai` and `/chiem-tinh` only (§6.4) |

**Changed from v1.0 of this same doc** (2026-09-04 → 2026-09-05, both within
the same unpushed brainstorming session, so the earlier draft is revised in
place rather than layered):

- Flat 8-item nav → context-sensitive two-header model (§1)
- Keyword-leaning slugs (`/la-so-bat-tu`, `/kinh-dich`, `/chiem-tinh` were
  already bare, `/than-so-hoc` already bare) → all bare discipline names,
  including proposing `/la-so-tu-vi` → `/tu-vi` (§2)
- Each flagship page implied to have its own intake form → single shared
  birth-profile wizard for Tử Vi/Bát Tự/Chiêm Tinh/Thần Số Học; Kinh Dịch
  stays genuinely separate (§3)

**Unchanged / explicitly preserved:**

- Child-URL separation for calculator vs. paid interpretation vs. knowledge
  article content, underneath each flagship page (§4)
- Public library vs. private reading room split (wizard/result/checkout/report
  stay `noindex`, access-controlled) — untouched by this doc; §3 reuses those
  exact private routes
- Batch/phase build order from `docs/11` §3 — this doc changes what's visible
  in the IA, not what gets engineered first
- D-010/D-020 (no phong thủy item commerce), D-021 (Nhân Tướng deferred)
- Art direction constants/variables system (§6) — unrevised this round

## 8. Follow-up actions (not executed by this document)

- Decision-log entries D-023–D-028 in `docs/10-decision-log.md` (done
  alongside this doc)
- Superseded-pointer banners in `docs/03-sitemap-and-seo.md` and
  `docs/14-sitemap-seo-wireframes.md` (done alongside v1.0, still accurate)
- Rename `/la-so-tu-vi` → `/tu-vi` and update its internal links
  (`homepage.html`, `kien-thuc-tu-vi/*`,
  `luan-giai-tu-vi-tong-quan-ban-menh/*`) — not started
- Generalize `/la-so-tu-vi-tao` into a discipline-agnostic wizard route,
  reused by Bát Tự/Chiêm Tinh/Thần Số Học per §3 — not started
- Expand homepage "Một hồ sơ sinh, nhiều lăng kính" section from 3 cards to
  all 12 disciplines (§1.1) — not started
- New homepage hero/supporting image pass per §6.3 — not started
- New page builds for `/bat-tu`, `/kinh-dich`, `/chiem-tinh`, `/than-so-hoc`,
  `/cong-cu-mien-phi` and its seven children — not started; needs its own
  implementation plan (`writing-plans` skill) once this spec is reviewed
- `docs/13-brand-experience-guideline.md` §5.2/5.5/5.8 still needs to be
  reconciled to the sơn mài system (pre-existing open item, not new)
- When this reaches the Sol/Terra/Luna implementation pipeline, a
  corresponding `FD-0xx` entry should be added to
  `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`
  referencing this doc and the new decision-log entries — not added here, out
  of respect for that pipeline's own ownership of its FD ledger
