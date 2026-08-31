# Phase 03 Free Web Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`.

**Goal:** Deliver the localized public funnel from landing page through
BirthProfile submission, free Zi Wei chart, evidence drawer, and paid preview.

**Architecture:** Server Components fetch through the private BFF client.
Client Components handle only interaction. Core validation and calculation
remain in the API.

**Tech Stack:** Next.js 16 App Router, next-intl, React, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P03-T0N` in
`task-contracts-and-test-vectors.md`.

## Global Constraints

- Build the usable product flow, not a marketing-only landing page.
- Vietnamese root routes and `/en` routes must remain key-parity complete.
- Private pages are server-authorized and noindex.
- Unknown-time users receive a clear eligibility state, not a generic error.
- No public backend URL appears in browser code.

---

### Task 1 [P03-T01]: Implement route registry, layouts, and typed BFF client

**Files:**
- Create: `apps/web/src/routes/route-registry.ts`
- Create: `apps/web/src/api/private-api-client.ts`
- Create: `apps/web/src/app/[locale]/layout.tsx`
- Create: `apps/web/src/app/[locale]/page.tsx`
- Create: `apps/web/src/app/sitemap.ts`
- Test: `apps/web/src/routes/route-registry.test.ts`
- Test: `tests/web/no-public-api-reference.test.ts`

**Interfaces:**
- Produces one route registry for navigation, canonical URLs, and sitemap.
- Produces `privateApiClient(actor, requestId)`.

- [ ] **Step 1: Write failing route and bundle tests**

Assert VI/EN routes, one canonical sitemap source, and no browser bundle
reference to an API hostname.

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run apps/web/src/routes tests/web/no-public-api-reference.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement layouts and private server client**

The home route shows the actual Zi Wei entry flow in the first viewport.

- [ ] **Step 4: Build both locales**

Run: `pnpm i18n:check && pnpm --filter @lasoviet/web build`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add apps/web/src/routes apps/web/src/api apps/web/src/app tests/web docs/superpowers/plans
git commit -m "feat: add localized web and BFF routing"
```

### Task 2 [P03-T02]: Build the BirthProfile form and consent flow

**Files:**
- Create: `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- Create: `apps/web/src/features/birth-profile/birth-profile-actions.ts`
- Create: `apps/web/src/features/birth-profile/time-precision-fields.tsx`
- Create: `apps/web/messages/vi/profile.json`
- Create: `apps/web/messages/en/profile.json`
- Test: `tests/e2e/birth-profile-flow.spec.ts`

**Interfaces:**
- Consumes `BirthProfileV1`.
- Produces a saved profile revision and typed eligibility response.

- [ ] **Step 1: Write failing Playwright tests**

Cover exact time, traditional branch, unknown time, crossing range, consent
required, validation messages, locale switch, and refresh persistence.

- [ ] **Step 2: Run E2E**

Run: `pnpm playwright test tests/e2e/birth-profile-flow.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement accessible form controls**

Use date/time inputs, location controls only where needed, radio/segmented
precision selection, and explicit consent checkbox. Do not invent exact minute
values.

- [ ] **Step 4: Run mobile and desktop E2E**

Run: `pnpm playwright test tests/e2e/birth-profile-flow.spec.ts --project=chromium`
Expected: PASS at mobile and desktop viewports.

- [ ] **Step 5: Update trackers and commit**

```bash
git add apps/web/src/features/birth-profile apps/web/messages tests/e2e docs/superpowers/plans
git commit -m "feat: add birth profile and consent flow"
```

### Task 3 [P03-T03]: Render the normalized Zi Wei chart and evidence drawer

**Files:**
- Create: `apps/web/src/features/ziwei/ziwei-chart.tsx`
- Create: `apps/web/src/features/ziwei/ziwei-palace.tsx`
- Create: `apps/web/src/features/evidence/evidence-drawer.tsx`
- Create: `apps/web/src/app/[locale]/app/charts/[chartId]/page.tsx`
- Create: `apps/web/messages/vi/ziwei.json`
- Create: `apps/web/messages/en/ziwei.json`
- Test: `tests/e2e/free-chart.spec.ts`

**Interfaces:**
- Consumes `NormalizedZiweiChartV1` and `EvidenceSetV1`.
- Produces owner-authorized responsive chart UI.

- [ ] **Step 1: Write failing chart E2E**

Assert 12 palaces, metadata, rule set, limitations, evidence opening, mobile
layout, desktop scanning, and no sequential-ID access.

- [ ] **Step 2: Run E2E**

Run: `pnpm playwright test tests/e2e/free-chart.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement server page and focused client interactions**

Keep chart data fetching server-side. Evidence drawer receives only the
selected evidence payload.

- [ ] **Step 4: Run accessibility and visual smoke**

Run: `pnpm playwright test tests/e2e/free-chart.spec.ts`
Expected: PASS without overlap at approved viewports.

- [ ] **Step 5: Update docs/rules and commit**

```bash
git add apps/web/src/features/ziwei apps/web/src/features/evidence apps/web/src/app apps/web/messages tests/e2e docs/superpowers/plans
git commit -m "feat: render free Zi Wei chart"
```

### Task 4 [P03-T04]: Add free insights, paid preview, and analytics contracts

**Files:**
- Create: `apps/web/src/features/reports/free-identity-preview.tsx`
- Create: `packages/contracts/src/analytics-event.ts`
- Create: `packages/backend/src/analytics/analytics.service.ts`
- Create: `apps/web/messages/vi/reports.json`
- Create: `apps/web/messages/en/reports.json`
- Test: `tests/e2e/free-preview.spec.ts`
- Test: `packages/backend/src/analytics/analytics.service.test.ts`

**Interfaces:**
- Produces three evidence-backed insights, one strength, one tension, and a
  real 10-15% preview.
- Produces privacy-safe event contracts.

- [ ] **Step 1: Write failing content and privacy tests**

Assert every insight has evidence, no blur overlay exists, and analytics
rejects name, birth data, chart JSON, evidence text, and report content.

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run packages/backend/src/analytics && pnpm playwright test tests/e2e/free-preview.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement preview selection from deterministic evidence**

The preview is not generated as unrelated generic marketing copy.

- [ ] **Step 4: Run tests and i18n parity**

Run: `pnpm i18n:check && pnpm vitest run packages/backend/src/analytics && pnpm playwright test tests/e2e/free-preview.spec.ts`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add apps/web/src/features/reports packages/contracts packages/backend/src/analytics apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add evidence-backed free preview"
```

## Phase Exit Criteria

- VI and EN funnels are complete.
- Full base chart and free evidence render at mobile and desktop.
- Unknown-time state cannot reach checkout.
- No public backend host appears in browser artifacts.
- Analytics contains no private calculation/report payloads.
- Sitemap derives from one route registry.
- Terra has no unresolved `must-fix`.
