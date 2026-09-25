# Homepage V10: painted hero, centre logo, USP/CTA art, testimonials

Date: 2026-09-25 · Branch: `feat/homepage-v10-paint-logo-testimonials` (from `origin/master`) · Domain: lasoviet.net

## Sources
- Claude Design project `d52aacf7-fdbb-44ce-87a5-25fd80a0766d`, file `Lasoviet Homepage v10.dc.html` and `HANDOFF-CLAUDE-CODE.md`.
- `lasoviet-homepage-claude-code-logo-integration-v1.zip` (`HeroCenterLogo.tsx`, `hero-logo-progress.ts`, `hero-center-logo.css`).
- Design placeholders (Explore, Compare, USP text, About, FAQ, footer, "Section hiện hữu") are NOT content. Production content stays.

## Scope (decided with the founder 2026-09-25)
1. Hero right column rebuilt as a painted chart driven by the wizard; the book ("folio") and the four concern buttons are removed. `topConcern` is no longer set from the hero.
2. Centre logo (`HeroCenterLogo`), one instance, no spinner.
3. USP art swap (dark/light, desktop/mobile). USP text unchanged.
4. Closing CTA section with paint art.
5. Testimonials section (15 founder-supplied quotes) after the comparison, before USP.
6. Ticker marquee fix (already committed as `8aac987`).

Out of scope: text of existing sections, header/footer, wizard/engine/payment, sitemap.

## Design
### Hero stage (single source of truth)
Pure module `homepage-v3-hero-stage.ts`:
`deriveHeroStage(values, now) -> { stage: 0..3, dateValid, timeValid, genderSelected, logoStage, dayBranchIndex | null, line1, line2 }`.
- Reuses `validateWizardDate` and the exact-minute/branch/unknown rules already in `homepage-v3-hero.tsx` (`00:00` valid, `24:00`/`23:60` invalid, `timeUnknown` only when the box is ticked).
- Paint stage (handoff table): 0 none; 1 valid date; 2 valid time or unknown; 3 name present. Logo stage per zip: date, then time-or-unknown, then gender; name never counts.
- Hour to branch index: `floor(((h+1)%24)/2)`. Range mode uses the selected branch.
- Restoring a draft feeds the same function, so the first render already shows the saved stage (no replay: transitions only enabled after mount).

### Hero UI
- `HomepageV3HeroChart` (client) replaces the folio: two paint layers (dim + "polished reveal" layer with radial mask growing per stage), SVG 4x4 grid, HTML branch labels, centre text (`DD · MM · YYYY …`, name italic), `HeroCenterLogo` in the 2x2 centre.
- Mobile (<760px): 176px art strip above the form and a toggle "Xem lá số đang hình thành" that expands the chart. `aria-expanded`, 44px target.
- `prefers-reduced-motion`: no transitions.
- Form markup, validation, draft save, redirect to `/tao-la-so/tu-vi` unchanged.

### Assets
Copy the 9 webp from `assets/v10/` to `apps/web/public/images/lasoviet/v10/` with SEO names (`la-so-tu-vi-hero-tranh-son-{dark|light}-{desktop|mobile}.webp`, `la-so-tu-vi-tang-thu-usp-…`, `la-so-tu-vi-cta-tranh-son-dark-desktop.webp`). Light CTA reuses the hero/usp light files at both edges (as the design does). No re-encoding.

### USP and CTA
- USP: swap background art via CSS (desktop full-section right-aligned with mask; mobile 300px panel above text).
- CTA: new `HomepageV3Cta` using existing wizard hand-off (`HomepageV3GoWizard`), copy "Công việc, tình cảm hay bản thân: bắt đầu từ lá số của bạn." / "Lập lá số miễn phí". Placed after About. If About already ends with the same CTA, it is reused, not duplicated.

### Testimonials
- Data: `homepage-v3-testimonials.ts` (15 entries: id, name, city, header, quote, group, excerpt). Featured 13, secondary 12/09/01. Quotes are verbatim; cards use contiguous excerpts only; the "80–90%" line appears only inside the full-text dialog and is not used as a headline.
- `HomepageV3Testimonials` (client): featured + 3 secondary, "Thêm góc nhìn từ người đọc" expands 5 filters (Tất cả, Hiểu mình, Công việc và thời vận, Cách luận giải, Cách đọc và cảm nhận) and all 15 cards; dialog with Escape and focus return; mobile secondary row scrolls by hand with prev/next; no autoplay; monogram initials, no fake avatars, no "verified" badge.
- i18n: chrome strings in VI and EN message files; quotes stay Vietnamese with `lang="vi"` on the EN page.

### Page order
story, ticker, explore, needs, compare, **testimonials**, usp, value, faq, about, **cta**.

## Testing
- Unit: `homepage-v3-hero-stage.test.ts` (invalid dates, 31/02, missing year, 00:00, 23:59, 24:00, 23:60, unknown time, branch mode, gender/name rules, regression stage on edit, draft restore), testimonials data integrity (15 unique ids, excerpts are substrings of quotes, groups cover all).
- Gates: `pnpm i18n:check && pnpm lint && pnpm typecheck && pnpm test`, `node scripts/public-claim-check.mjs`, `node scripts/check-public-content.mjs`.
- Browser QA: 360/390/768/1440, dark/light, reduced motion, compare with the design; before/after screenshots.

## Delivery
PR to `master`. No merge or deploy until An or Lãm authorizes (CLAUDE.md, FD-097). The report lists anything from the export not carried over.
