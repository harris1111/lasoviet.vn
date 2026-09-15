# LSV-20 Homepage Core UI Implementation Plan

**Date:** 2026-09-13
**Status:** Planning complete; blocked by LSV-19, the shared UI artifact, LSV-12
analytics contracts, and explicit founder plan approval
**Queue position:** 3 of 5

## Goal

Recompose the homepage into the founder-requested ten-block core funnel, put
the chart form first on mobile, remove the marquee and long redundant sections,
keep prices off the homepage, and meet the mobile length, readability,
accessibility, and no-horizontal-scroll gates.

## Approved Content Order

1. Hero with the chart form.
2. Two topic-chip rows plus the compact other-disciplines row.
3. Three-way comparison.
4. Real visual-proof carousel.
5. Free/Bản mệnh/Toàn diện capability matrix without prices.
6. Three-step process.
7. Knowledge: one feature plus four compact items.
8. Eight-item numbered FAQ.
9. Email support card.
10. Final repeated form.

The artifact must show the complete desktop and mobile order before
implementation. Existing approved copy may be shortened by deletion; new
claims require separate approval. Public attribution is only
`Lá Số Việt biên tập` / `Edited by La So Viet`.

## Flash Executor Slices

### Slice 20-A: Page Composition and Obsolete Section Removal

**Owned files**

- Modify: `apps/web/src/app/[locale]/page.tsx`
- Create: `apps/web/src/features/homepage/homepage-topic-chips.tsx`
- Create: `apps/web/src/features/homepage/homepage-comparison.tsx`
- Create: `apps/web/src/features/homepage/homepage-visual-proof.tsx`
- Create: `apps/web/src/features/homepage/homepage-plan-matrix.tsx`
- Create: `apps/web/src/features/homepage/homepage-support.tsx`
- Delete after import removal:
  `homepage-problem.tsx`, `homepage-chatbot-comparison.tsx`,
  `homepage-category-comparison.tsx`, `homepage-method.tsx`,
  `homepage-free-value.tsx`, `homepage-evidence.tsx`,
  `homepage-trust-specs.tsx`, and `homepage-about-excerpt.tsx`

**Behavior**

- Render exactly the ten ordered blocks.
- Remove the marquee from the homepage surface.
- Keep real internal links and existing metadata generation.
- Use only real sample artifacts already present in the repository; do not
  invent scores, testimonials, review counts, or performance claims.

**Acceptance**

- Structure tests assert the ten-block order.
- No deleted component remains imported.
- Homepage copy contains no VND or Lá price.
- Public canonical, route registry, and metadata behavior are unchanged.

### Slice 20-B: Hero, Repeated Form, and Mobile First Screen

**Owned files**

- Modify: `apps/web/src/features/homepage/homepage-hero.tsx`
- Modify: `apps/web/src/features/homepage/homepage-final-cta.tsx`
- Modify: `apps/web/src/features/birth-profile/homepage-birth-prefill.ts`
- Modify: `apps/web/src/features/birth-profile/homepage-birth-prefill.test.ts`

**Behavior**

- Desktop: copy and form follow the approved two-column artifact.
- Mobile: form card precedes H1 and shows at least the first three controls in
  the initial 390x844 viewport.
- Collect the artifact-approved hero fields and preserve all current
  validation, unknown-time, cache, and route behavior.
- Final CTA reuses the same form presenter and state contract; it must not fork
  validation logic.
- This is an interim shared presenter. LSV-21 performs the final extraction
  shared with the wizard after LSV-20 lands.

**Acceptance**

- Both forms submit the same prefill schema and route to the localized wizard.
- Invalid date/time errors are adjacent, text-backed, and announced.
- No field or action is below 44px.
- Existing cache tests remain green.

### Slice 20-C: Copy, Styles, and Component Behavior

**Owned files**

- Modify: `apps/web/messages/vi/common.json`
- Modify: `apps/web/messages/en/common.json`
- Modify: `apps/web/src/features/homepage/homepage-process.tsx`
- Modify: `apps/web/src/features/homepage/homepage-knowledge.tsx`
- Modify: `apps/web/src/features/homepage/homepage-faq.tsx`
- Modify: `apps/web/src/styles/homepage-foundation.css`
- Modify: `apps/web/src/styles/homepage-content.css`
- Modify: `apps/web/src/styles/homepage-conversion.css`
- Modify: `apps/web/src/styles/global.css` only for obsolete homepage selectors

**Behavior**

- Apply LSV-19 primitives and artifact geometry.
- Chips pause for reduced motion and scroll to the nearest form.
- Carousel exposes buttons, labels, current item, and a 24px next-card peek on
  mobile; it does not auto-advance.
- Mobile comparison shows Lá Số Việt first and places alternatives in one
  accessible accordion.
- Matrix always shows all three labeled states without horizontal scrolling.
- FAQ contains eight items and opens the first by default.
- Support renders email only.

**Acceptance**

- Section subtitle/card word budgets pass.
- Homepage content above FAQ is at most 1,400 words.
- All customer-facing text is at least 14px.
- No remote font CSS or new raw color is added.

### Slice 20-D: Analytics Hooks After LSV-12

**Dispatch status:** blocked handoff; no Flash implementation slice may be
dispatched until LSV-12 lands an exact web dispatcher path and contract.

**Reserved ownership after the gate**

- Modify only the exact dispatcher path named by the merged LSV-12 contract.
- Modify only the homepage files already owned by 20-A through 20-C to call it.
- Create: `tests/analytics/homepage-ui-events.test.ts`

**Behavior**

- Emit only event names and properties already approved and implemented by
  LSV-12.
- Cover form start, CTA activation, chip activation, carousel tab change,
  sample-report link, and support action.
- Do not put name, birth data, `chart_id`, report/evidence content, or free text
  in event payloads.
- Do not create a second event registry or fallback logger.

**Acceptance**

- Event tests prove one emission per action and reject FD-053 fields.
- If LSV-12 is not present in the latest fetched `origin/master`, this slice is
  `BLOCKED`; do not substitute legacy analytics events. Sol must issue a new
  exact-file brief after inspecting the merged LSV-12 path.

### Slice 20-E: Browser, Lighthouse, and Screenshot Evidence

**Owned files**

- Modify: `tests/i18n/homepage-content.test.ts`
- Modify: `tests/web/homepage-navigation-parity.test.ts`
- Create: `tests/e2e/homepage-core-ui.spec.ts`
- Write generated evidence only under:
  `.superpowers/sdd/2026-09-13-lsv-20-homepage/artifacts/`

**Acceptance**

- Screenshots: 320, 375, 390, 768, 1024, and 1440.
- No horizontal scroll at every width.
- 390px full-page height is at most 12,000px.
- Initial mobile viewport contains at least three form controls.
- Lighthouse Accessibility is at least 95.
- Reduced motion, keyboard order, visible focus, loaded Vietnamese font roles,
  content checks, focused tests, web typecheck, and `git diff --check` pass.

## Focused Check Commands

```bash
corepack pnpm@11.25.0 vitest run \
  tests/i18n/homepage-content.test.ts \
  tests/web/homepage-navigation-parity.test.ts \
  apps/web/src/features/birth-profile/homepage-birth-prefill.test.ts \
  tests/analytics/homepage-ui-events.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 run i18n:check
corepack pnpm@11.25.0 run content:check
PLAYWRIGHT_BASE_URL=http://127.0.0.1:$WEB_HOST_PORT \
  corepack pnpm@11.25.0 playwright test \
  tests/e2e/homepage-core-ui.spec.ts
git diff --check
```

The repository does not currently pin Lighthouse. Before implementation, Sol
must verify and record the exact local/CI Lighthouse CLI version and invocation
in the Flash brief, or use founder-approved Chrome DevTools Lighthouse evidence.
Do not add a production dependency merely to obtain the score.

## Sequencing and Terra Review

1. LSV-19 and LSV-8 must already be present in the latest fetched
   `origin/master`; this agent does not merge either prerequisite branch.
2. LSV-12 must provide the canonical analytics transport before Slice 20-D.
3. Create the LSV-20 UI branch from current `origin/master`.
4. Run 20-A through 20-E in order.
5. Terra high reviews the complete homepage milestone once.
6. Harris reviews screenshot evidence and wording under FD-056.
7. Push and open the LSV-20 PR directly to `master`; never merge it.

## Conflict Map

- LSV-21 later owns the final hero/wizard shared form extraction. It must
  preserve LSV-20 layout and prefill behavior.
- LSV-12 owns analytics and consent semantics.
- Existing homepage structure and copy tests encode the old 17-block artifact
  and must change in the same slice as the new composition.
- The old homepage prototype is superseded only after founder approval of the
  new shared artifact.

## Founder Approval Required

1. Approve form-first mobile ordering despite the older Blueprint order.
2. Approve the complete ten-block artifact and shortened wording.
3. Approve this plan and authorize the LSV-20 implementation branch.
