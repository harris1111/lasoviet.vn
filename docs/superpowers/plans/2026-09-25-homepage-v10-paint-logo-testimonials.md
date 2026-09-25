# Homepage V10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox syntax.

**Goal:** Ship the V10 painted hero with wizard-driven chart and centre logo, USP/CTA paint art and a testimonials section on the live homepage.

**Architecture:** One pure module (`homepage-v3-hero-stage.ts`) derives the wizard stage from form values; the hero chart, paint reveal and logo all read it. New presentational components and CSS live next to the existing `homepage-v3-*` files. Existing form, validation, draft save and redirect are untouched.

**Tech Stack:** Next.js (App Router, read `node_modules/next/dist/docs/` before non-trivial API use), React client components, next-intl (VI/EN), vitest from repo root (`pnpm vitest run apps/web/src/features/homepage-v3`), plain CSS in `apps/web/src/styles/homepage-v3.css`.

Spec: `docs/superpowers/specs/2026-09-25-homepage-v10-paint-logo-testimonials-design.md`.

## File map
| File | Responsibility |
|---|---|
| `apps/web/public/images/lasoviet/v10/*.webp` | 9 paint assets, SEO names (done) |
| `homepage-v3/hero-logo/HeroCenterLogo.tsx`, `hero-logo-progress.ts`, `hero-center-logo.css` | Logo from zip (imports adapted) |
| `homepage-v3/homepage-v3-hero-stage.ts` (+ `.test.ts`) | `deriveHeroStage(values, now)`, branch index, centre text |
| `homepage-v3/homepage-v3-hero-chart.tsx` | Chart column (desktop + mobile toggle) |
| `homepage-v3/homepage-v3-hero.tsx` | Drop folio + lenses, render chart |
| `homepage-v3/homepage-v3-testimonials.ts` (+ `.test.ts`) | 15 quotes, groups, featured order |
| `homepage-v3/homepage-v3-testimonials.tsx` | Section + dialog + filters |
| `homepage-v3/homepage-v3-static-sections.tsx` | USP art background, `HomepageV3Cta` |
| `app/[locale]/page.tsx` | Insert testimonials and CTA |
| `styles/homepage-v3.css` | Hero chart, USP, CTA, testimonials styles |
| `messages/{vi,en}/homepage-v3.json` | New keys `heroChart`, `testimonials`, `cta` |

## Tasks
### Task 1: Stage logic (TDD)
- [ ] Write `homepage-v3-hero-stage.test.ts`: 31/02 and missing year give stage 0; valid date gives stage 1; `00:00` and `23:59` valid time; `24:00`, `23:60` invalid; branch mode without branch invalid; `timeUnknown` valid; stage 3 only with a name; clearing a field lowers the stage; hour to branch index `floor(((h+1)%24)/2)` (23 gives 0, 0 gives 0, 1 gives 1, 22 gives 11); logo stage ignores name; lunar date uses `calendarType`.
- [ ] Run `pnpm vitest run apps/web/src/features/homepage-v3/homepage-v3-hero-stage.test.ts`, expect FAIL (module missing).
- [ ] Implement `deriveHeroStage` reusing `validateWizardDate` and the same rules as `validate()` in the hero. Export `HeroStage`, `derive...`, `hourToBranchIndex`.
- [ ] Run test, expect PASS. Commit.

### Task 2: Logo files
- [ ] Copy the three zip files to `homepage-v3/hero-logo/`; `hero-logo-progress.ts` unchanged; keep the zip test as `hero-logo-progress.test.ts` ported to vitest.
- [ ] Run tests, commit.

### Task 3: Hero chart component and CSS
- [ ] `homepage-v3-hero-chart.tsx`: props `{ stage: HeroStageResult; calendarLabel... }`; two paint layers (dim + reveal mask, sizes 0/90x110/150x170/260x280 %), SVG grid (`viewBox 400`, dash `54 16 22 10` at stage 0, solid after), 12 HTML labels (`left = tx/4 %`, `top = (ty+8)/4 %`), highlighted branch cell, centre text, `HeroCenterLogo` in 2x2 centre; mobile toggle button with `aria-expanded`.
- [ ] Add `.hv3-chart-*` CSS with dark/light via existing `--art-dark/--art-light`; `prefers-reduced-motion` disables transitions; transitions enabled only after mount (class `is-live`) so restored drafts do not replay.
- [ ] Replace folio JSX and CSS in `homepage-v3-hero.tsx`/`homepage-v3.css`; remove `HERO_LENSES` usage, `lensIndex`, `patchKeepErrors` if unused; keep `topConcern: null` in `INITIAL`.
- [ ] `pnpm typecheck`, commit.

### Task 4: USP art and closing CTA
- [ ] USP: absolutely positioned art layer behind the grid (desktop masked from 30% to 55%, mobile top panel 300px); section stays dark in both themes, so dark art in both.
- [ ] `HomepageV3Cta` (server component) with new i18n keys and `HomepageV3GoWizard`; theme-aware CSS (dark raster, light edges from hero-light/tang-thu-light).
- [ ] Insert in `page.tsx` after About; commit.

### Task 5: Testimonials
- [ ] Data module with the 15 quotes from Claude Design `data/testimonials.json` (verbatim; ids 01-15; groups; excerpts contiguous).
- [ ] Test: 15 unique ids, every excerpt is a substring of its quote, five groups all non-empty, featured order 13/12/09/01. Run FAIL then PASS.
- [ ] Component: featured + 3 secondary, expand button, 5 filters, `role="dialog"` with Esc and focus return, mobile scroll-snap row with prev/next, monogram initials, `lang="vi"` on quotes.
- [ ] i18n keys VI/EN; insert after Compare in `page.tsx`; commit.

### Task 6: Verify
- [ ] `pnpm i18n:check && pnpm lint && pnpm typecheck && pnpm test`; `node scripts/public-claim-check.mjs`; `node scripts/check-public-content.mjs`.
- [ ] Browser QA at 360/390/768/1440, dark/light, keyboard, reduced motion; before/after screenshots vs design.
- [ ] Push branch, open PR to `master`, no merge/deploy without An or Lãm.
