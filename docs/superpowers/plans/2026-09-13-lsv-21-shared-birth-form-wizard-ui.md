# LSV-21 Shared Birth Form and Wizard UI Implementation Plan

**Date:** 2026-09-13
**Status:** Planning complete; blocked by LSV-19, LSV-20, LSV-6, LSV-12, the
shared UI artifact, and explicit founder plan approval
**Queue position:** 4 of 5

## Goal

Make the homepage and three-step birth wizard use one shared birth-details
presenter with 56px icon fields, compact date/calendar controls, mobile
two-column choices, adjacent errors, and a keyboard-aware sticky primary
action, while preserving calculation, unknown-time, cache, consent, and OAuth
resume behavior.

## Dependency Gates

- LSV-6 owns autosave and OAuth step restoration. It must merge first; LSV-21
  must preserve its storage keys, debounce, versioning, and resume semantics.
- LSV-12 owns the FD-081 consent version, purposes, wording, and analytics
  linkage. LSV-21 styles the existing single checkbox but does not redefine its
  legal meaning.
- LSV-20 owns the accepted homepage hero/final-form layout.
- FD-078 context questions are rendered only if their separate enum/storage
  contract is already merged. This ticket must not invent that contract.

## Flash Executor Slices

### Slice 21-A: Shared Birth Details Presenter

**Dispatch status:** blocked until LSV-12 lands. Sol must name the exact
dispatcher path in a new brief; this plan does not authorize Flash to search
for or create an analytics dispatcher.

**Reserved ownership after the gate**

- Create: `apps/web/src/features/birth-profile/birth-details-fields.tsx`
- Modify: `apps/web/src/features/birth-profile/birth-date-fields.tsx`
- Modify: `apps/web/src/features/birth-profile/time-precision-fields.tsx`
- Create: `apps/web/src/features/birth-profile/birth-details-fields.test.tsx`

**Behavior**

- Present name, date, calendar kind, time precision, gender, and optional place
  through controlled props.
- Keep day/month/year as three accessible controls inside one 56px visual
  group; keep solar/lunar selection in the same approved field shell.
- Preserve exact-minute, branch-only, and unknown-time states.
- Use real labels, icon plus text errors, and no placeholder-only naming.
- Do not own persistence, submission, analytics, or consent.

**Acceptance**

- One presenter renders in compact homepage and full wizard modes without
  branching validation rules.
- All controls remain operable at 320px and 200% zoom.
- Unit tests cover all time precision and calendar states.

### Slice 21-B: Adopt in Homepage and Wizard

**Owned files**

- Modify: `apps/web/src/features/homepage/homepage-hero.tsx`
- Modify: `apps/web/src/features/homepage/homepage-final-cta.tsx`
- Modify: `apps/web/src/features/birth-profile/birth-wizard-birth-step.tsx`
- Modify: `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- Modify: `apps/web/src/features/birth-profile/birth-wizard-review-step.tsx`
- Modify: `apps/web/src/features/birth-profile/homepage-birth-prefill.ts`
- Modify: `apps/web/src/features/birth-profile/birth-wizard-state.ts`

**Behavior**

- Replace duplicated field markup with `BirthDetailsFields`.
- Preserve the three wizard steps and every current submit guard.
- Preserve LSV-6 autosave/resume and homepage prefill.
- Preserve one required FD-081 consent checkbox and the separate permission
  check when creating a chart for another person.
- Keep the sample-report link directly below the primary action.
- If FD-078 contracts exist, render both optional questions as single-choice
  chips with `Skip`; otherwise leave them excluded and record the dependency.

**Acceptance**

- Homepage and wizard submit equivalent shared field values.
- Existing exact, branch-only, lunar, unknown-time, and anonymous retention
  behavior remains green.
- No calculation or persistence payload changes except already-approved LSV-6,
  LSV-12, or FD-078 contracts.

### Slice 21-C: Keyboard-Aware Sticky Action and Styling

**Owned files**

- Modify: `apps/web/src/styles/birth-profile-wizard.css`
- Modify: `apps/web/src/styles/homepage-foundation.css`
- Modify: `apps/web/src/styles/global.css` only for superseded hero field rules
- Create: `apps/web/src/features/birth-profile/use-mobile-keyboard-state.ts`
- Create: `apps/web/src/features/birth-profile/use-mobile-keyboard-state.test.ts`

**Behavior**

- Apply approved 56px fields, 36px icon wells, 12px field radius, and 44px
  minimum controls.
- Keep gender and other short choices in two columns at widths of at least
  360px and stack safely below that.
- Use `window.visualViewport` plus focused editable state to mark keyboard-open
  state; sticky primary action is enabled only when the mobile keyboard is
  closed and remains in normal flow otherwise.
- Do not add a floating widget.

**Acceptance**

- Sticky action never covers focused fields, validation errors, sample link, or
  browser safe-area inset.
- No layout shift when opening/closing the keyboard.
- No document-level horizontal scroll at 320, 360, 390, and 430.

### Slice 21-D: Localized Copy and Analytics Adoption

**Owned files**

- Modify: `apps/web/messages/vi/profile.json`
- Modify: `apps/web/messages/en/profile.json`
- Modify: `apps/web/messages/vi/common.json` only for shared homepage labels
- Modify: `apps/web/messages/en/common.json` only for shared homepage labels
- Modify only the exact LSV-12 dispatcher call sites in files already owned by
  21-B after that path is recorded
- Create: `tests/analytics/birth-wizard-ui-events.test.ts`

**Behavior**

- Reuse LSV-12 consent wording/version exactly.
- Emit only approved wizard start, step completion, field-error category, and
  chart success events.
- Never emit entered values, birth data, name, place, free text, or chart ID.

**Acceptance**

- VI/EN parity passes.
- Event tests reject forbidden properties and duplicate emission.
- If LSV-12 is absent or its wording conflicts, stop with `NEEDS_CONTEXT`.

### Slice 21-E: End-to-End and Screenshot Evidence

**Owned files**

- Modify: `apps/web/src/features/birth-profile/birth-profile-form.test.ts`
- Modify: `tests/e2e/auth-and-birth-flow.spec.ts`
- Modify: `tests/e2e/wp13-visual-qa.spec.ts`
- Create: `tests/e2e/shared-birth-form-ui.spec.ts`
- Write generated evidence only under:
  `.superpowers/sdd/2026-09-13-lsv-21-birth-form/artifacts/`

**Acceptance**

- Complete the wizard without zoom at 320, 360, 390, 430, 768, and 1440.
- Test keyboard-open and keyboard-closed action placement.
- Test adjacent errors, focus order, 44px targets, no horizontal scroll,
  autosave/resume, unknown time, lunar input, and sample link.
- Capture every step and error state at 320, 375, 390, 768, 1024, and 1440;
  include the 320 overflow proof in the same evidence manifest.
- Focused Vitest, Playwright, i18n, typecheck, content check, and
  `git diff --check` pass.

## Focused Check Commands

```bash
corepack pnpm@11.25.0 vitest run \
  apps/web/src/features/birth-profile/birth-details-fields.test.tsx \
  apps/web/src/features/birth-profile/use-mobile-keyboard-state.test.ts \
  apps/web/src/features/birth-profile/birth-profile-form.test.ts \
  apps/web/src/features/birth-profile/homepage-birth-prefill.test.ts \
  tests/analytics/birth-wizard-ui-events.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 run i18n:check
corepack pnpm@11.25.0 run content:check
PLAYWRIGHT_BASE_URL=http://127.0.0.1:$WEB_HOST_PORT \
  corepack pnpm@11.25.0 playwright test \
  tests/e2e/auth-and-birth-flow.spec.ts \
  tests/e2e/shared-birth-form-ui.spec.ts \
  tests/e2e/wp13-visual-qa.spec.ts
git diff --check
```

## Sequencing and Terra Review

1. LSV-19, LSV-20, LSV-6, and LSV-12 must already be present in the latest
   fetched `origin/master`; this agent does not merge prerequisite branches.
2. Create the LSV-21 UI branch from that current `origin/master`.
3. Run 21-A through 21-E.
4. Terra high reviews the complete shared-form milestone once, emphasizing
   regression safety for autosave, consent, privacy, calendar/time, and mobile
   keyboard behavior.
5. Harris signs off on screenshots under FD-056.
6. Push and open the LSV-21 PR directly to `master`; never merge it.

## Conflict Map

- Highest overlap is with LSV-6 in `homepage-hero.tsx`,
  `birth-profile-form.tsx`, prefill/state files, and OAuth E2E tests. Sequence,
  do not parallel-edit.
- Highest overlap is with LSV-12 in profile messages, consent version, and
  submission behavior. LSV-12 semantics win.
- LSV-20 owns homepage composition; LSV-21 may replace field internals only.
- LSV-22 consumes completed chart state and must not modify the birth form.

## Founder Approval Required

1. Approve the complete form/wizard artifact, including keyboard-open states.
2. Approve this plan and authorize the LSV-21 implementation branch.
