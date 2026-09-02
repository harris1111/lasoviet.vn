# Phase 03 Free Web Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`.

**Goal:** Deliver the founder-approved Gate 1 public surface and the localized
private funnel from BirthProfile submission through free Zi Wei chart,
evidence drawer, paid preview, and safe analytics.

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
- Blueprint v1.1 canonical URLs and route states are normative.
- `ZIWEI-IDENTITY-P0` is the only visible first paid topic; later commercial
  routes remain reserved.

---

### Task 1 [P03-T01]: Implement route registry, layouts, and typed BFF client

**Files:**
- Modify: `config/route-registry.yml`
- Modify: `packages/config/src/route-registry.ts`
- Create: `apps/web/src/api/private-api-client.ts`
- Create: `apps/web/src/app/[locale]/layout.tsx`
- Create: `apps/web/src/app/[locale]/page.tsx`
- Create: `apps/web/src/app/robots.ts`
- Create: `apps/web/src/app/sitemap.xml/route.ts`
- Create: `apps/web/src/app/sitemaps/[section]/route.ts`
- Create: `apps/web/src/seo/sitemap-registry.ts`
- Test: `packages/config/src/route-registry.test.ts`
- Test: `tests/seo/crawl-controls.test.ts`
- Test: `tests/web/no-public-api-reference.test.ts`

**Interfaces:**
- Consumes the sole YAML route-definition source through its typed loader.
- Produces registry-driven navigation, canonical URLs, robots policy, sitemap
  index, and section sitemap responses.
- Produces `privateApiClient(actor, requestId)`.

- [ ] **Step 1: Write failing route and bundle tests**

Assert VI/EN routes, one canonical YAML route source, a valid sitemap index and
section children, private/reserved exclusion, robots-to-sitemap agreement, and
no browser bundle reference to an API hostname.

- [ ] **Step 2: Run tests**

Run:
`pnpm vitest run packages/config/src/route-registry.test.ts tests/seo/crawl-controls.test.ts tests/web/no-public-api-reference.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement layouts and private server client**

The home route shows the actual Zi Wei entry flow in the first viewport.
`robots.ts` and every sitemap response consume the typed YAML registry and
cannot publish private, reserved, preview, or archived routes.

- [ ] **Step 4: Build both locales**

Run: `pnpm i18n:check && pnpm --filter @lasoviet/web build`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add config/route-registry.yml packages/config/src/route-registry.ts apps/web/src/api apps/web/src/app apps/web/src/seo tests/seo tests/web docs/superpowers/plans
git commit -m "feat: add localized web and BFF routing"
```

#### Non-Visual Delivery Status (2026-09-02)

- Complete: server-only private API client, registry-derived robots policy,
  sitemap index, section sitemaps, locale URL generation, and browser-boundary
  verification.
- Verified: production web build, web typecheck, and 14 focused route/BFF
  tests.
- Deferred by FD-024: localized layouts, home route presentation, navigation,
  and visual/browser checks. P03-T01 remains partially complete until the
  dedicated UI artifact branch delivers those files.

### Task 2 [P03-T02]: Build the BirthProfile form and consent flow

**Files:**
- Create: `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- Create: `apps/web/src/features/birth-profile/birth-profile-actions.ts`
- Create: `apps/web/src/features/birth-profile/time-precision-fields.tsx`
- Create: `apps/web/src/app/[locale]/tao-la-so/tu-vi/page.tsx`
- Create: `apps/web/messages/vi/profile.json`
- Create: `apps/web/messages/en/profile.json`
- Test: `tests/e2e/birth-profile-flow.spec.ts`

**Interfaces:**
- Consumes `BirthProfileV1`.
- Produces a temporary anonymous or account-owned profile revision and typed
  eligibility response.

- [ ] **Step 1: Write failing Playwright tests**

Cover guest anonymous-session creation, exact time, traditional branch, unknown
time, crossing range, consent required, validation messages, locale switch,
refresh persistence, account linking without duplicate data, immediate guest
deletion, and denial after the 24-hour expiry boundary.

- [ ] **Step 2: Run E2E**

Run: `pnpm playwright test tests/e2e/birth-profile-flow.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement accessible form controls**

Create or resolve the Better Auth anonymous actor before the first persisted
submission. Use date/time inputs, location controls only where needed,
radio/segmented precision selection, and explicit consent checkbox. Do not
invent exact minute values or require registration before the free chart.

- [ ] **Step 4: Run mobile and desktop E2E**

Run: `pnpm playwright test tests/e2e/birth-profile-flow.spec.ts --project=chromium`
Expected: PASS at mobile and desktop viewports.

- [ ] **Step 5: Update trackers and commit**

```bash
git add apps/web/src/features/birth-profile apps/web/messages tests/e2e docs/superpowers/plans
git commit -m "feat: add birth profile and consent flow"
```

#### Non-Visual Delivery Status (2026-09-02)

- Complete: authoritative account/anonymous actor resolution, consent-first
  BirthProfile submission, immutable normalized-read eligibility, strict
  server response projection, and anonymous expiry handling.
- Verified: 26 focused headless tests plus contracts, backend, and web
  typechecks.
- Deferred by FD-024: form controls, precision fields, localized messages,
  route page, refresh/browser behavior, and Playwright E2E. P03-T02 remains
  partially complete until the dedicated UI artifact branch delivers them.

### Task 3 [P03-T03]: Render the normalized Zi Wei chart and evidence drawer

**Files:**
- Create: `apps/web/src/features/ziwei/ziwei-chart.tsx`
- Create: `apps/web/src/features/ziwei/ziwei-palace.tsx`
- Create: `apps/web/src/features/evidence/evidence-drawer.tsx`
- Create: `apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`
- Create: `apps/web/messages/vi/ziwei.json`
- Create: `apps/web/messages/en/ziwei.json`
- Test: `tests/e2e/free-chart.spec.ts`

**Interfaces:**
- Consumes `NormalizedZiweiChartV1` and `EvidenceSetV1`.
- Produces actor-authorized responsive chart UI for account and unexpired
  anonymous owners.

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

#### Non-Visual Delivery Status (2026-09-02)

- Complete: evidence-gated calculation success, actor-authorized latest chart
  reads, selected-evidence reads, strict persisted-data contracts, private API
  endpoints, and server-only web loaders.
- Verified: 17 focused tests plus contracts, backend, API, and web typechecks
  and backend build.
- Deferred by FD-024: chart/palace/drawer components, localized messages,
  route page, accessibility, responsive behavior, and visual/browser checks.
  P03-T03 remains partially complete until the dedicated UI artifact branch
  delivers them.

### Task 4 [P03-T04]: Add free insights, paid preview, and analytics contracts

**Files:**
- Create: `apps/web/src/features/reports/free-identity-preview.tsx`
- Create: `apps/web/src/features/reports/paid-topic-selector.tsx`
- Create: `apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.tsx`
- Modify: `packages/contracts/src/analytics-event-v1.ts`
- Create: `packages/backend/src/analytics/analytics.service.ts`
- Create: `apps/web/messages/vi/reports.json`
- Create: `apps/web/messages/en/reports.json`
- Test: `tests/e2e/free-preview.spec.ts`
- Test: `packages/backend/src/analytics/analytics.service.test.ts`

**Interfaces:**
- Produces three evidence-backed insights, one strength, one tension, and a
  real 10-15% preview.
- Produces the canonical private topic-selection page with only
  `ZIWEI-IDENTITY-P0` purchasable.
- Produces privacy-safe event contracts.

- [ ] **Step 1: Write failing content and privacy tests**

Assert every insight has evidence, no blur overlay exists, the topic-selection
page is actor-authorized/noindex, reserved SKUs cannot render or be selected,
and analytics rejects name, birth data, chart JSON, evidence text, and report
content.

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run packages/backend/src/analytics && pnpm playwright test tests/e2e/free-preview.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement preview selection from deterministic evidence**

The preview is not generated as unrelated generic marketing copy. The topic
selector consumes the server-authoritative product catalog and exposes only
the identity offer while later Zi Wei SKUs remain reserved.

- [ ] **Step 4: Run tests and i18n parity**

Run: `pnpm i18n:check && pnpm vitest run packages/backend/src/analytics && pnpm playwright test tests/e2e/free-preview.spec.ts`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add apps/web/src/features/reports packages/contracts packages/backend/src/analytics apps/web/messages tests docs/superpowers/plans
git commit -m "feat: add evidence-backed free preview"
```

#### Non-Visual Delivery Status (2026-09-01)

- Complete: strict free-preview and topic-selection contracts, deterministic
  evidence-backed preview construction, server-authoritative product catalog,
  privacy-safe analytics emission, actor-authorized private API operations,
  and server-only web loaders/actions.
- Verified: 32 focused tests plus contracts, config, backend, API, and web
  typechecks. Sol approved the correction pass with zero open
  Critical/Important findings.
- Fixed during milestone review: production evidence-ID integration,
  authorize-before-SKU ordering, relational evidence linkage, and observable
  analytics emission.
- Deferred by FD-024: preview and selector components, localized messages,
  route page, visible copy, and Playwright/browser checks. P03-T04 remains
  partially complete until the dedicated UI artifact branch delivers them.

### Task 5 [P03-T05]: Build the public page, metadata, and structured-data renderer

**Files:**
- Create: `apps/web/src/features/content/content-repository.ts`
- Create: `apps/web/src/features/content/public-content-page.tsx`
- Create: `apps/web/src/seo/build-metadata.ts`
- Create: `apps/web/src/seo/structured-data.tsx`
- Create: `apps/web/src/app/[locale]/(public)/[...publicPath]/page.tsx`
- Test: `tests/seo/public-metadata.test.ts`
- Test: `tests/e2e/public-surface.spec.ts`

**Interfaces:**
- Consumes `RouteDefinitionV1` and `PublicContentV1`.
- Produces server-rendered public HTML, canonical/alternate metadata, robots
  directives, breadcrumbs, and schema selected only from registry templates.
- Produces not-found or redirect behavior for `reserved`, `preview_noindex`,
  and `archived` routes without leaking roadmap content.

- [ ] **Step 1: Write failing public-route and SEO tests**

```ts
expect(await metadataFor("/la-so-tu-vi", "vi")).toMatchObject({
  alternates: { canonical: "https://lasoviet.vn/la-so-tu-vi" },
  robots: { index: true, follow: true },
});
expect(await resolvePublicRoute("/luan-giai-tu-vi/tinh-duyen-hon-nhan"))
  .toEqual({ kind: "not-found", state: "reserved" });
```

Cover real `<a href>` navigation, Vietnamese root canonicals, `/en` alternates,
private-route noindex, reserved-route exclusion, schema/content agreement,
mobile header behavior, and no client-only SEO copy.

- [ ] **Step 2: Run focused tests**

Run:

```bash
pnpm vitest run tests/seo/public-metadata.test.ts
pnpm playwright test tests/e2e/public-surface.spec.ts
```

Expected: FAIL before the renderer and route-state behavior exist.

- [ ] **Step 3: Implement the server-rendered public surface**

Use route-specific product pages where interaction requires them and the
registry-backed content renderer for editorial/trust routes. The first viewport
shows the real Zi Wei entry flow, not a marketing-only hero. Use the approved
Paper/Ink/Cinnabar tokens, Source Serif 4 for editorial display, Be Vietnam Pro
for UI/data, Lucide icons, 44px controls, visible focus, reduced motion, and no
card nesting.

- [ ] **Step 4: Verify metadata, accessibility, and performance budgets**

Run:

```bash
pnpm vitest run tests/seo/public-metadata.test.ts
pnpm playwright test tests/e2e/public-surface.spec.ts
pnpm --filter @lasoviet/web build
```

Expected: PASS with no public route overlap and no reserved route in sitemap or
navigation.

- [ ] **Step 5: Update tracking and commit**

```bash
git add apps/web/src/features/content apps/web/src/seo apps/web/src/app tests/seo tests/e2e docs/superpowers/plans
git commit -m "feat: render canonical public experience"
```

#### Non-Visual Delivery Status (2026-09-02)

- Complete: server-only public-content repository, locale-aware route
  resolution, registry-owned canonical/alternate/robots metadata, and pure
  JSON-LD builders backed by validated content and product catalog data.
- Complete by FD-025: `/du-bao-cung-hoang-dao` is a Gate 1
  `live_indexable` route with published VI/EN metadata; `/horoscope` remains
  an archived 301 redirect to that live canonical. Other Horoscope routes
  remain reserved.
- Verified: 25 focused tests plus config build and web typecheck. Sol approved
  both correction scopes with zero open Critical/Important findings.
- Fixed during milestone review: embedded route placeholders, stable route
  error codes, non-self canonical ownership, authoritative robots policies,
  and redirect-to-reserved topology.
- Deferred by FD-024: public page/TSX rendering, visible navigation,
  responsive/accessibility behavior, and Playwright/browser checks. P03-T05
  remains partially complete until the dedicated UI artifact branch delivers
  them.

### Task 6 [P03-T06]: Publish the Gate 1 trust surface and foundation content

**Files:**
- Create: `content/public/vi/pages/home.mdx`
- Create: `content/public/vi/pages/calculator.ziwei.mdx`
- Create: `content/public/vi/pages/commercial.ziwei.mdx`
- Create: `content/public/vi/pages/commercial.ziwei.identity.mdx`
- Create: `content/public/vi/pages/sample.ziwei.mdx`
- Create: `content/public/vi/pages/method.mdx`
- Create: `content/public/vi/pages/method.ziwei.mdx`
- Create: `content/public/vi/pages/method.ai-evidence.mdx`
- Create: `content/public/vi/pages/sources.mdx`
- Create: `content/public/vi/pages/knowledge.mdx`
- Create: `content/public/vi/pages/knowledge.ziwei.mdx`
- Create: `content/public/vi/pages/about.mdx`
- Create: `content/public/vi/pages/faq.mdx`
- Create: `content/public/vi/pages/contact.mdx`
- Create: `content/public/vi/pages/privacy.mdx`
- Create: `content/public/vi/pages/terms.mdx`
- Create: `content/public/en/pages/home.mdx`
- Create: `content/public/en/pages/calculator.ziwei.mdx`
- Create: `content/public/en/pages/commercial.ziwei.mdx`
- Create: `content/public/en/pages/commercial.ziwei.identity.mdx`
- Create: `content/public/en/pages/sample.ziwei.mdx`
- Create: `content/public/en/pages/method.mdx`
- Create: `content/public/en/pages/method.ziwei.mdx`
- Create: `content/public/en/pages/method.ai-evidence.mdx`
- Create: `content/public/en/pages/sources.mdx`
- Create: `content/public/en/pages/knowledge.mdx`
- Create: `content/public/en/pages/knowledge.ziwei.mdx`
- Create: `content/public/en/pages/about.mdx`
- Create: `content/public/en/pages/faq.mdx`
- Create: `content/public/en/pages/contact.mdx`
- Create: `content/public/en/pages/privacy.mdx`
- Create: `content/public/en/pages/terms.mdx`
- Create: `content/public/vi/articles/la-so-tu-vi-la-gi.mdx`
- Create: `content/public/vi/articles/cach-lap-la-so-tu-vi.mdx`
- Create: `content/public/vi/articles/cach-doc-la-so-tu-vi.mdx`
- Create: `content/public/vi/articles/12-cung-trong-la-so-tu-vi.mdx`
- Create: `content/public/vi/articles/14-chinh-tinh.mdx`
- Create: `content/public/vi/articles/menh-than-cuc.mdx`
- Create: `content/public/vi/articles/dai-van-tieu-van.mdx`
- Create: `content/public/vi/articles/gio-sinh-anh-huong-the-nao.mdx`
- Create: `content/public/vi/articles/tu-vi-co-chinh-xac-khong.mdx`
- Create: `content/public/vi/articles/cac-truong-phai-tu-vi.mdx`
- Create: `content/public/en/articles/what-is-a-zi-wei-chart.mdx`
- Create: `content/public/en/articles/how-to-create-a-zi-wei-chart.mdx`
- Create: `content/public/en/articles/how-to-read-a-zi-wei-chart.mdx`
- Create: `content/public/en/articles/twelve-palaces-in-zi-wei.mdx`
- Create: `content/public/en/articles/fourteen-major-stars.mdx`
- Create: `content/public/en/articles/life-body-and-configuration.mdx`
- Create: `content/public/en/articles/major-and-minor-periods.mdx`
- Create: `content/public/en/articles/how-birth-time-affects-zi-wei.mdx`
- Create: `content/public/en/articles/is-zi-wei-accurate.mdx`
- Create: `content/public/en/articles/schools-of-zi-wei.mdx`
- Create: `content/public/sources.yml`
- Create: `content/public/reviewers.yml`
- Test: `tests/content/gate-1-content.test.ts`
- Test: `tests/e2e/public-content-links.spec.ts`

**Interfaces:**
- Produces reviewed `PublicContentV1` records for every Gate 1 route.
- Produces sixteen core public/trust content records per locale, including
  `/kien-thuc` and `/kien-thuc/tu-vi`.
- Produces ten Vietnamese foundation articles and complete English equivalents.
- Produces source/reviewer references, contextual internal links, content-risk
  tags, and `lastReviewed` metadata.

- [ ] **Step 1: Write failing completeness and quality tests**

Assert every Gate 1 route has VI/EN content, one intent owner, reviewed sources,
no incomplete placeholder markers, no unsupported expert identity, no fear/scarcity
copy, no thin synonym pages, and contextual links to methodology, calculator,
and related content.

- [ ] **Step 2: Run the content gate**

Run:

```bash
pnpm vitest run tests/content/gate-1-content.test.ts
node scripts/check-public-content.mjs
```

Expected: FAIL before the content records exist.

- [ ] **Step 3: Write the core public and trust content**

Derive copy from the approved brand guideline and Blueprint v1.1. The identity
commercial page alone may present a purchasable offer. Relationship, career,
and annual topics remain absent from navigation and render no indexable page.
The sample is anonymized, contains real structure/evidence examples, and never
uses fake testimonials.

- [ ] **Step 4: Write and review the ten foundation articles**

Each article has a unique intent, plain-language summary, independent example
or figure specification, method limits, source references, author/reviewer
records, and two to four related links. Do not mass-generate entity variants.

- [ ] **Step 5: Run content, link, SEO, and web verification**

Run:

```bash
pnpm vitest run tests/content tests/seo
pnpm playwright test tests/e2e/public-content-links.spec.ts
node scripts/check-public-content.mjs
pnpm --filter @lasoviet/web build
```

Expected: PASS with all Gate 1 routes server-rendered and ten reviewed
foundation articles available in both locales.

- [ ] **Step 6: Update tracking and commit**

```bash
git add content/public tests/content tests/e2e docs/superpowers/plans
git commit -m "feat: publish Gate 1 public content"
```

#### Non-Visual Delivery Status (2026-09-02)

- Complete: 54 reviewed VI/EN documents for all 27 current Gate 1
  `live_indexable` routes, including 20 Zi Wei foundation articles and the
  FD-025 Horoscope forecast landing.
- Complete: strict frontmatter, source, reviewer, metadata, public-link,
  related-route, article, FAQ, commercial-offer, unsafe-copy, duplication,
  locale-integrity, and canonical repository-source-boundary gates.
- Complete: anonymized sample reports use implemented identity evidence keys
  with moderate confidence, conditional interpretation, limitations, and
  observable actions.
- Complete: exact `franc-min@6.2.0` runtime language detection replaced the
  rejected fixture-coupled wordlist heuristic after breaker adjudication.
- Verified: Gate 1 content tests pass 6/6; config build and typecheck pass;
  the content checker validates all 54 documents. Sol approved the replan
  cycle with zero open Critical/Important findings.
- Deferred by FD-024: visible public rendering, navigation, responsive and
  accessibility behavior, Playwright link checks, and production web build.
  P03-T06 non-visual content is complete; Phase 03 remains partial until the
  dedicated UI artifact branch delivers the visual surface.

#### Task 5 Founder-Run Stack And Gender Correction (2026-09-02)

- A real Docker Compose stack now provides the web, API, worker, migration,
  PostgreSQL, and Redis runtime behind a loopback-only web port.
- Founder-approved Step 2 radio choices require `Nam`/`Nữ` before advancing,
  pass `male`/`female` to the birth profile without defaulting or inference,
  explain why Zi Wei needs the value, and show it in the Step 3 review.
- Fresh browser evidence passes the free path through birth-profile creation,
  Zi Wei calculation, chart rendering, evidence, and the identity-only free
  preview. Registration email delivery remains recorded as sent.

## Phase Exit Criteria

- VI and EN funnels are complete.
- The founder-approved Gate 1 public routes render from the canonical registry.
- `/kien-thuc` and `/kien-thuc/tu-vi` are complete in VI/EN and own their
  distinct hub intents.
- Ten reviewed foundation articles pass source, quality, link, and locale gates.
- Reserved commercial routes are absent from public navigation and sitemap.
- Full base chart and free evidence render at mobile and desktop.
- Unknown-time state cannot reach checkout.
- No public backend host appears in browser artifacts.
- Analytics contains no private calculation/report payloads.
- Robots and sitemap index/children derive from `config/route-registry.yml`
  through the typed loader.
- Terra has no unresolved `must-fix`.
