# MVP UI, API, and Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Ship a founder-runnable free Zi Wei MVP that ports the approved
lacquer UI artifact into Next.js, connects the implemented auth/profile/chart
APIs, and runs through Docker Compose behind one loopback web port.

**Architecture:** The approved `product/bg-texture-consistency` prototypes are
the binding visual source. Next.js Server Components own public/private data
loading and metadata; focused Client Components own forms, drawers, menus, and
view toggles. Browser traffic reaches the private NestJS API only through the
existing server-side BFF and Better Auth boundary.

**Tech Stack:** Next.js 16, React 19, next-intl, Better Auth, NestJS/Fastify,
PostgreSQL, Redis, Drizzle, Docker Compose, Vitest, and Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Visual Sources:**
- `prototype/homepage/homepage.html`
- `prototype/la-so-tu-vi/index.html`
- `prototype/la-so-tu-vi-tao/index.html`
- `prototype/la-so-ket-qua/index.html`
- `prototype/luan-giai-tu-vi-tong-quan-ban-menh/index.html`
- `prototype/kien-thuc-tu-vi/index.html`
- `prototype/kien-thuc-tu-vi-la-so-tu-vi-la-gi/index.html`
- `prototype/tai-khoan/index.html`
- `prototype/bao-cao-doc/index.html`

## Global Constraints

- Communicate with the founder in Vietnamese; repository artifacts and commits
  remain English.
- Use Superpowers only. Terra medium implements, debugs, and runs focused
  tests. Sol xhigh reviews only the completed milestone. Luna remains paused.
- Preserve the artifact's dark lacquer, antique gold, cinnabar, typography,
  spacing, texture, imagery, and responsive hierarchy without redesign.
- `config/route-registry.yml` remains authoritative when prototype demo URLs
  differ from canonical application routes.
- The current MVP is free-flow first. SePay checkout, paid-report persistence,
  report sharing, and production AI calls remain deferred.
- Implement email auth and Google sign-in. Browser-test email auth; the founder
  will test Google sign-in after supplying valid OAuth credentials.
- Do not expose `PRIVATE_API_URL` or any private API hostname to browser code.
- Private chart, account, and report routes remain noindex and actor-authorized.
- Test the implemented happy paths at desktop and mobile. Do not expand into
  niche edge-case coverage unless correctness, authorization, privacy, or data
  integrity requires it.
- Docker Compose publishes only
  `127.0.0.1:${WEB_HOST_PORT}:3000`; API, PostgreSQL, Redis, and worker remain
  private.
- Do not commit `.env`, OAuth secrets, SMTP secrets, AI credentials, or user
  data.

---

### Task 1: Port The Shared Lacquer Experience And Public Assets

**Files:**
- Modify: `apps/web/src/app/[locale]/layout.tsx`
- Modify: `apps/web/src/app/[locale]/page.tsx`
- Modify: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/global.css`
- Create: `apps/web/src/components/site-header.tsx`
- Create: `apps/web/src/components/site-footer.tsx`
- Create: `apps/web/src/components/icon.tsx`
- Create: `apps/web/src/components/artifact-image.tsx`
- Create: `apps/web/public/images/lasoviet/**`
- Modify: `apps/web/messages/vi/common.json`
- Modify: `apps/web/messages/en/common.json`
- Test: `tests/e2e/public-surface.spec.ts`

**Interfaces:**
- Produces reusable `SiteHeader`, `SiteFooter`, `Icon`, and `ArtifactImage`.
- Produces artifact-owned design tokens and production WebP asset paths.
- Preserves VI root and `/en` locale routing.

- [ ] Write the public-surface smoke assertions for homepage content, real
  links, locale switching, mobile navigation, keyboard focus, and no horizontal
  overflow at 320px and 1200px.
- [ ] Run the focused test and confirm it fails because the artifact UI is not
  rendered.
- [ ] Port the shared visual shell and homepage sections from the artifact.
- [ ] Copy only production image assets into stable public paths; do not ship
  prototype runtimes or design-tool bundles to the browser.
- [ ] Run web typecheck, build, i18n parity, and the public-surface smoke test.
- [ ] Commit with `feat: port the lacquer web experience`.

### Task 2: Deliver Email/Google Auth And The Live Birth Wizard

**Files:**
- Modify: `apps/web/src/auth/auth.ts`
- Modify: `apps/web/src/auth/auth-email-client.ts`
- Create: `apps/web/src/features/auth/auth-panel.tsx`
- Create: `apps/web/src/features/auth/google-sign-in-button.tsx`
- Create: `apps/web/src/app/[locale]/dang-nhap/page.tsx`
- Create: `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- Create: `apps/web/src/features/birth-profile/time-precision-fields.tsx`
- Modify: `apps/web/src/features/birth-profile/birth-profile-actions.ts`
- Create: `apps/web/src/features/ziwei/calculate-ziwei-chart.ts`
- Create: `apps/web/src/app/[locale]/tao-la-so/tu-vi/page.tsx`
- Create: `apps/web/messages/vi/profile.json`
- Create: `apps/web/messages/en/profile.json`
- Modify: `apps/web/messages/vi/auth.json`
- Modify: `apps/web/messages/en/auth.json`
- Test: `tests/e2e/auth-and-birth-flow.spec.ts`

**Interfaces:**
- Consumes `BirthProfileV1` and `submitBirthProfile`.
- Produces `calculateZiweiChart(revisionId)` through the private BFF.
- Redirects successful calculation to `/la-so/{opaque_id}`.
- Google sign-in is configured only when the complete server-side Google
  environment group exists.

- [ ] Write failing happy-path tests for email sign-up/sign-in request, visible
  delivery confirmation, exact-time birth submission, consent, calculation,
  and redirect to the chart route.
- [ ] Run the focused test and confirm the missing UI/actions fail.
- [ ] Port the artifact auth and three-step wizard presentation while keeping
  the canonical `/tao-la-so/tu-vi` route.
- [ ] Connect consent, anonymous/account actor resolution, profile persistence,
  calculation, loading, and actionable failure states.
- [ ] Add the Google sign-in button and provider configuration without logging
  or exposing OAuth credentials.
- [ ] Run auth/profile/API focused tests, web typecheck/build, and the focused
  browser test.
- [ ] Commit with `feat: add auth and live birth-chart flow`.

### Task 3: Render The Live Chart, Evidence, And Free Preview

**Files:**
- Create: `apps/web/src/features/ziwei/ziwei-chart.tsx`
- Create: `apps/web/src/features/ziwei/ziwei-palace.tsx`
- Create: `apps/web/src/features/ziwei/ziwei-chart-list.tsx`
- Create: `apps/web/src/features/evidence/evidence-drawer.tsx`
- Create: `apps/web/src/features/reports/free-identity-preview.tsx`
- Create: `apps/web/src/features/reports/paid-topic-selector.tsx`
- Create: `apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`
- Create: `apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.tsx`
- Create: `apps/web/messages/vi/ziwei.json`
- Create: `apps/web/messages/en/ziwei.json`
- Create: `apps/web/messages/vi/reports.json`
- Create: `apps/web/messages/en/reports.json`
- Test: `tests/e2e/free-chart-flow.spec.ts`

**Interfaces:**
- Consumes `loadZiweiChart`, `loadEvidence`, and
  `freeIdentityPreviewLoader`.
- Produces a 12-palace visual chart plus an equivalent list view.
- Produces three evidence-backed insights, one strength, one tension, and the
  single server-authoritative `ZIWEI-IDENTITY-P0` offer.

- [ ] Write the failing browser test for chart ownership, 12 palaces,
  narrative-first mobile view, evidence opening/closing, free preview, and
  transition to topic selection.
- [ ] Run it and confirm the visual routes are missing.
- [ ] Port the free-result artifact using live normalized chart and evidence
  contracts, not fixture text.
- [ ] Preserve the required claim, condition, observable action, and evidence
  sequence; never encode meaning only by color.
- [ ] Keep the purchase action visibly deferred while SePay is out of scope.
- [ ] Run chart/preview focused tests, web typecheck/build, and desktop/mobile
  browser smoke.
- [ ] Commit with `feat: render the evidence-backed Zi Wei result`.

### Task 4: Render Registry-Backed Public Content And Private Account Shell

**Files:**
- Create: `apps/web/src/features/content/public-content-page.tsx`
- Create: `apps/web/src/features/content/knowledge-hub.tsx`
- Create: `apps/web/src/features/content/knowledge-article.tsx`
- Create: `apps/web/src/features/content/commercial-topic-page.tsx`
- Create: `apps/web/src/app/[locale]/(public)/[...publicPath]/page.tsx`
- Create: `apps/web/src/features/account/account-dashboard.tsx`
- Create: `apps/web/src/app/[locale]/tai-khoan/page.tsx`
- Create: `apps/web/src/features/reports/report-reader.tsx`
- Create: `apps/web/src/app/[locale]/bao-cao/[reportId]/page.tsx`
- Test: `tests/e2e/content-and-account.spec.ts`

**Interfaces:**
- Consumes `resolvePublicRoute`, `loadPublicContentRepository`,
  `buildPublicMetadata`, and structured-data builders.
- Produces artifact-specific templates for homepage, calculator, product,
  knowledge hub/article, trust, and policy route families.
- Produces a noindex account shell backed only by currently supported actions.
- Produces a report-reader shell that renders persisted `IdentityReportV1` only
  when a real report loader exists; no synthetic private report is created.

- [ ] Write failing browser checks for the calculator landing, paid topic
  landing, knowledge hub/article, canonical metadata, account noindex, and
  honest unavailable report state.
- [ ] Run the focused checks and confirm the visual renderer is absent.
- [ ] Implement template dispatch from the canonical route and reviewed content
  records.
- [ ] Port the corresponding artifact sections and images without shipping
  fake testimonials, fake report data, or unsupported account controls.
- [ ] Run content/SEO tests, i18n parity, web typecheck/build, and focused
  browser checks.
- [ ] Commit with `feat: render public content and account surfaces`.

### Task 5: Package And Verify The Founder-Run MVP

**Files:**
- Create: `apps/web/Dockerfile`
- Create: `apps/api/Dockerfile`
- Create: `apps/worker/Dockerfile`
- Create: `packages/database/src/migrate-cli.ts`
- Create: `docker-compose.yml`
- Create: `docker-compose.production.yml`
- Create: `.env.example`
- Create: `scripts/select-web-host-port.mjs`
- Create: `scripts/validate-web-host-port.mjs`
- Create: `scripts/run-mvp-smoke.mjs`
- Create: `docs/runbooks/mvp-docker-compose.md`
- Create: `tests/deployment/compose-config.test.ts`
- Create: `tests/deployment/web-host-port.test.ts`
- Create: `tests/e2e/mvp-happy-path.spec.ts`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/phase-03-free-web-experience.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/phase-06-production-readiness-and-launch.md`

**Interfaces:**
- Produces `web`, `api`, `worker`, `migrate`, `postgres`, and `redis`
  services.
- Publishes only the web service on the required loopback port.
- Produces one basic browser flow:
  auth email -> birth profile -> Zi Wei calculation -> chart -> evidence ->
  free preview.

- [ ] Write failing Compose and port-selection tests.
- [ ] Implement multi-stage non-root images, one-shot migration, health checks,
  private service networking, persistent PostgreSQL/Redis volumes, restart
  policy, and capped Docker logs.
- [ ] Validate Compose with an external env file and a stable unused
  `WEB_HOST_PORT` in `49152-65535`.
- [ ] Build and start the stack, then wait for API/web readiness.
- [ ] Open the running app in the in-app browser and test every implemented
  basic flow at desktop and mobile. Trigger a real SMTP delivery to the
  founder-approved test recipient and report that it is ready for checking.
- [ ] Do not test Google OAuth automatically; confirm only that the configured
  button and redirect contract render.
- [ ] Run focused Vitest, typecheck, builds, Docker Compose config/build, and
  Playwright happy-path checks.
- [ ] Update decision/rule/phase trackers. Add an `AGENTS.md` rule only if a
  genuinely reusable failure pattern meets the durable-rule threshold.
- [ ] Sol performs one final milestone review. Terra fixes only verified
  release-blocking findings.
- [ ] Commit with `build: package the founder-run MVP`.
- [ ] Push `feature/mvp-ui-api-compose`; do not create a PR or merge without
  explicit founder instruction.

## Success Criteria

- The artifact visual language is recognizably preserved on mobile and desktop.
- Email auth, profile creation, calculation, chart, evidence, and free preview
  work through real application APIs.
- Google sign-in is implemented and ready for founder testing after credentials
  are supplied.
- All implemented public routes render reviewed content with canonical metadata.
- Private routes remain noindex and do not expose the API host.
- Docker Compose starts the free MVP with only the web service exposed on
  loopback.
- The final basic browser flow passes without relying on SePay or fake paid
  report data.

