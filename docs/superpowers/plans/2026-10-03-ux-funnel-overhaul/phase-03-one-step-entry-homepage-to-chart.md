---
phase: 3
title: "One-step entry homepage to chart"
status: in-review
priority: P1
effort: "2d"
dependencies: [1]
---

# Phase 3: One-step entry homepage to chart

## Overview
Today the homepage hero form saves a draft and `router.push`es to the 3-step wizard `/tao-la-so/tu-vi` (subject → birth → review/consent), so the visitor enters/confirms data twice (`homepage-v3-birth-form.tsx:138-161`). AiTuvi goes straight from the homepage form to the chart. Make the homepage form create the chart directly. **Needs founder decision #2 in plan.md.** Mobile-first.

## Prototype (2026-10-03, approved by founder)
`prototype/revamp-2026-09/lap-la-so-mot-buoc.html` (serve `prototype/` with any static server). Decisions taken in the prototype, to confirm: field order is date, gender, time (date first so the first field sits at y≈309 on a 390×844 phone; a full-form-above-the-fold target is not achievable with this many fields, so the criterion is "first field and CTA visible without scrolling"); consent is an **unticked checkbox** (Decree 13 needs an affirmative act; the implicit "bấm là đồng ý" variant stays off until legal text allows it); place of birth collapses to a "Việt Nam (giờ Việt Nam)" row with Đổi; concern chips are three fixed ids (self_understanding, career, love) matching `HomepageV3Interest`, with the "Công việc, tiền bạc" chip mapping to `career`; loading shows four real stages and lasts at least ~2 s.

## Requirements
- Functional:
  - Hero form fields: ngày sinh (dương/âm toggle), giờ sinh (canh giờ picker + "Không nhớ giờ"), giới tính, tên gọi (optional, defaults "bạn"), mối quan tâm chips (Công việc / Tình duyên / Tiền bạc / Sức khoẻ / Gia đạo) — concern drives which palace is read in full (FD-109b).
  - "Xem cho ai": default "Cho tôi"; "Cho người khác" reveals the third-party consent checkbox inline (only then).
  - Consent: one explicit line under the CTA. Decree 13/2023 requires an affirmative act, so either an unticked checkbox that must be ticked, or a CTA whose label/adjacent text states consent ("Bấm xem lá số là bạn đồng ý với Chính sách dữ liệu"). Pick the second only if legal text in `docs/compliance` allows; otherwise checkbox. Never pre-ticked.
  - Submit → loading state on the button ("Đang an sao…", 600–1500 ms min so it feels computed) → `/la-so/{chartId}` (guest chart allowed, FD-105).
  - Validation inline, in Vietnamese, field-level; impossible date (31/02) caught before submit.
- Non-functional: form above the fold on 390×844; tap targets ≥44px; numeric keypad for date; no layout shift when errors appear.

## Architecture
- Reuse `submitBirthProfile` + `calculateZiweiChartInLocale` server actions (the wizard already calls them); expose one server action `createChartFromHomepage(values)` that validates with the same zod schema, saves profile with `explicitConsent`, calculates, returns `chartId` or field errors.
- Keep the wizard for direct `/tao-la-so` visits and for free-tool prefill; it no longer sits in the homepage path.
- Concern stored in `readingContext` so the free result picks the matching palace.

## Related Code Files
- Modify: `apps/web/src/features/homepage-v3/homepage-v3-birth-form.tsx`
- Modify: `apps/web/src/features/troi-nam/troi-nam-hero.tsx` (remove "handoff note" that explains the wizard)
- Create: `apps/web/src/features/birth-profile/create-chart-from-homepage-action.ts` (+ test)
- Modify: `apps/web/messages/{vi,en}/*.json`
- Tests: `tests/e2e/free-chart-flow.spec.ts` (homepage → chart in one submit)

## Implementation Steps
1. Read `birth-profile-form.tsx` step 3 to reuse its exact payload shape and consent semantics.
2. Implement the action; return typed errors.
3. Update the hero form UI (chips, "Cho người khác", consent line, loading button).
4. Wire funnel event `chart_form_submit` (phase 2).
5. E2E at 390px and 1440px: fill → one click → chart page renders.

## Success Criteria
- [ ] Homepage → chart page in one submit, no wizard.
- [ ] Third-party consent only shown when "Cho người khác" is chosen.
- [ ] Concern chosen on homepage = full palace shown on the free result.
- [ ] First field and the CTA visible without scrolling on 390×844.

## Risk Assessment
- Consent wording is a legal surface → copy taken from existing wizard review step; no new legal claims.
- Wizard analytics (`wizard_step_complete`) will drop; dashboards updated in phase 2 runbook.

## Implementation status (2026-10-03)
Built on branch `feat/phase-3-one-step-entry`. `createChartFromHomepageAction` saves the profile (consent enforced server side, third-party consent required for "Cho người khác") and calculates the chart in one request; the hero form calls it, waits at least 1.2 s, and routes to `/la-so/{chartId}`. Unknown birth time still goes through the wizard because no chart can be drawn without a time or branch. Consent copy is reused verbatim from the wizard (`profile.review.consent`, `profile.subject.consentCheck`). On phones the submit button is sticky so it stays in view while the form is on screen. Decision from founder: tick-by-hand consent, field order date, time, gender, concern; "Cho người khác" holds the name field.
Verified: unit tests (`create-chart-from-homepage.test.ts`), 9 Playwright cases without backend (`tests/e2e/homepage-one-step-entry.spec.ts`), production build boundary test. **Not yet run:** the full-stack case "one submit lands on the chart page", which needs API, Postgres and Redis (CI or An's environment).
