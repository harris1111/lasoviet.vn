---
phase: 3
title: "One-step entry homepage to chart"
status: in-review
priority: P1
effort: "2d"
dependencies: [1]
---

# Phase 3: One-step entry homepage to chart

## Approved scope (owner review, 2026-10-03)

The homepage is the only data-entry step. Its submit saves a step-3 draft and opens `/tao-la-so/tu-vi` directly on “Review & privacy”; the visitor confirms the entered data and explicitly consents once there. Consent starts unticked. Subject and birth-entry wizard steps are skipped for homepage visitors; direct wizard visits retain their existing flow.

The owner changed the initial prototype's direct-create/inline-consent proposal during implementation review. That proposal, the proposed `createChartFromHomepage` action, and homepage third-party controls are superseded. PR271's final owner correction also removed the “someone else” action and made the name field always visible. The approved prototype remains `prototype/revamp-2026-09/lap-la-so-mot-buoc.html`; current behavior follows the later owner corrections recorded here and in LSV74.

## Requirements and architecture

- Birth day/month/year dropdowns, solar/lunar choice, exact/branch/unknown birth time, gender, and optional display name. Entered name updates the sample chart.
- Three concern chips: `self_understanding`, `career`, `love`. The selected concern persists in `readingContext`; downstream free-result policy remains governed by FD-109 and its generation gates.
- No homepage consent or third-party action. `toHomepageV3Draft(..., { forWhom: "self", consentOther: false, step: 3 })` transfers the values to review. Existing wizard save/calculate actions run after affirmative consent.
- Missing/invalid data receives field errors and first-invalid-field focus. Unknown time retains the existing saved-without-chart flow.
- Phones show the first field and sticky CTA without scrolling; the entire form need not fit the phone viewport. Tablet controls and submit remain reachable by normal vertical scrolling. Desktop CTA fits 1024x768, 1280x720, 1366x768, 1440x900 and 1920x1080 without scrolling.
- Keep VI/EN parity, existing analytics and consent copy, control dimensions, and approved Trời Nam visual design.

## Implementation and acceptance

PR270/271 merged on 2026-10-03. Their original evidence covered unit checks and 11 browser cases without backend; the full-stack case and tablet acceptance were outstanding. LSV74 stays In Review until the remaining deployment evidence passes.

A live Chromium audit of release `3d4cb478d92d42e680f1c17b3dcc1b78404c8195` measured 22 VI/EN viewport combinations with no horizontal overflow. Desktop CTA was below the fold at 1024x768, 1280x720 and 1366x768. The bounded correction reduces heading size and vertical spacing only on desktops below 900px high, preserving input/button sizes and natural error expansion. Taller desktops and mobile/tablet layout rules remain as implemented in PR270/271.

The pre-deploy real-backend acceptance passed both locales: homepage → direct review, unchecked consent, draft parity, zero synthetic actor profiles before consent, then one saved profile with exact date/time/gender/name/locale and concern parity plus an authorized 12-palace chart. Official anonymous DELETE removed both synthetic actors and charts, with DB absence verified. Generation remained OFF.

Pending: independent correction review, CI, corrected release deployment, and post-deploy viewport/backend smoke. Track release-specific evidence in `plan/2026-10-03-lsv74-homepage-acceptance.md` and Kaneo LSV74. Chromium evidence does not claim Safari, physical-device, member, payment or enabled-provider acceptance.

Independent review also found an English time-selector overlap at 1024px. Concise equivalent mode labels and bounded wrapping correct it; browser checks now assert non-overlap and successful range-mode selection. Consent wording and birth-time payload semantics are unchanged.

## Related files

- `apps/web/src/features/homepage-v3/homepage-v3-birth-form.tsx`
- `apps/web/src/features/troi-nam/troi-nam-hero.tsx`
- `apps/web/src/features/birth-profile/birth-profile-draft.ts`
- `apps/web/src/styles/troi-nam.css`
- `tests/e2e/homepage-one-step-entry.spec.ts`
