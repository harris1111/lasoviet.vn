# Phase 00 Repository Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Luna implements only Terra-approved tasks.

**Goal:** Create a compilable, testable monorepo foundation with public/private
runtime boundaries, versioned runtime/route/content contracts, VI/EN resources,
design tokens, privacy-safe analytics, and baseline CI.

**Architecture:** `apps/web`, `apps/api`, and `apps/worker` are thin
composition roots. Shared runtime-safe code lives in focused packages.

**Tech Stack:** pnpm, TypeScript, Next.js 16, NestJS/Fastify, Zod, Vitest,
Playwright, Pino.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P00-T0N` in
`task-contracts-and-test-vectors.md`.

## Global Constraints

- Do not add product features in this phase.
- Resolve and save exact dependency versions; do not leave ranges in
  production manifests.
- Web may not import backend implementation modules.
- API and worker may import `packages/backend`, but browser bundles may not.
- All user-facing strings begin in JSON i18n resources.
- Blueprint v1.1 owns UX, canonical routes, route states, and SEO behavior.
- `ZIWEI-IDENTITY-P0` is the only first purchasable SKU.

---

### Task 1 [P00-T01]: Create the pnpm workspace and application composition roots

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.npmrc`
- Create: `.gitignore`
- Create: `apps/web/package.json`
- Create: `apps/api/package.json`
- Create: `apps/worker/package.json`
- Create: `packages/backend/package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/config/package.json`
- Test: `tests/workspace/workspace-boundaries.test.ts`

**Interfaces:**
- Produces workspace package names `@lasoviet/web`, `@lasoviet/api`,
  `@lasoviet/worker`, `@lasoviet/backend`, `@lasoviet/contracts`, and
  `@lasoviet/config`.
- Produces root scripts `build`, `typecheck`, `test`, `lint`, and `check`.

- [ ] **Step 1: Write the failing workspace-boundary test**

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("workspace boundaries", () => {
  it("does not expose backend implementation to the web package", async () => {
    const web = JSON.parse(await readFile("apps/web/package.json", "utf8"));
    expect(web.dependencies?.["@lasoviet/backend"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and confirm the workspace does not exist**

Run: `pnpm vitest run tests/workspace/workspace-boundaries.test.ts`
Expected: FAIL because the root workspace and manifests are absent.

- [ ] **Step 3: Create the root workspace and exact-version installation record**

Use `pnpm add -E` for every dependency so the manifest records exact versions.
Resolve Next.js with `next@16` so installation selects the latest stable 16.x
available on the implementation date.

- [ ] **Step 4: Create thin web, API, and worker bootstraps**

The API bootstrap uses `NestFactory.create<NestFastifyApplication>` with
`FastifyAdapter`. The worker bootstrap creates a Nest application context and
does not open an HTTP port.

- [ ] **Step 5: Run workspace verification**

Run: `pnpm install --frozen-lockfile=false && pnpm typecheck && pnpm test`
Expected: PASS, with no product endpoints beyond implemented health endpoints.

- [ ] **Step 6: Update tracking and commit**

Update `requirements-traceability.md` and
`dependency-integration-matrix.md`.

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc .gitignore apps packages tests docs/superpowers/plans
git commit -m "build: establish application workspace"
```

### Task 2 [P00-T02]: Add versioned runtime contracts and configuration

**Files:**
- Create: `packages/contracts/src/versioned-contract.ts`
- Create: `packages/contracts/src/internal-actor.ts`
- Create: `packages/contracts/src/health.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/config/src/environment-schema.ts`
- Create: `packages/config/src/load-environment.ts`
- Create: `packages/config/src/index.ts`
- Test: `packages/contracts/src/versioned-contract.test.ts`
- Test: `packages/config/src/environment-schema.test.ts`

**Interfaces:**
- Produces `VersionedContract<T>`.
- Produces `InternalActorV1Schema`.
- Produces `loadEnvironment(source: NodeJS.ProcessEnv): AppEnvironment`.

- [ ] **Step 1: Write failing schema tests**

```ts
expect(() =>
  InternalActorV1Schema.parse({
    version: 1,
    sub: "user_1",
    sid: "session_1",
    aud: "lasoviet-api",
    exp: 1,
    requestId: "req_1",
  }),
).not.toThrow();
```

Add a config test proving production rejects missing
`INTERNAL_ACTOR_SECRET`, `DATABASE_URL`, and `REDIS_URL`.

- [ ] **Step 2: Run focused tests**

Run: `pnpm vitest run packages/contracts packages/config`
Expected: FAIL because schemas and loaders do not exist.

- [ ] **Step 3: Implement Zod schemas and redacted configuration errors**

Configuration errors may name a missing variable but must never print its
value. Optional AI, SMTP, and cloud S3 groups expose explicit `enabled` state.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm vitest run packages/contracts packages/config && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Record docs/rule impact and commit**

Rule candidate must be `none` unless a recurring configuration ambiguity is
verified.

```bash
git add packages/contracts packages/config docs/superpowers/plans
git commit -m "feat: add versioned contracts and typed configuration"
```

### Task 3 [P00-T03]: Establish VI/EN internationalization

**Files:**
- Create: `apps/web/messages/vi/common.json`
- Create: `apps/web/messages/en/common.json`
- Create: `apps/web/messages/vi/navigation.json`
- Create: `apps/web/messages/en/navigation.json`
- Create: `apps/web/src/i18n/request.ts`
- Create: `apps/web/src/i18n/routing.ts`
- Create: `apps/web/src/proxy.ts`
- Create: `packages/contracts/src/i18n-key.ts`
- Create: `scripts/check-i18n-parity.mjs`
- Test: `tests/i18n/message-parity.test.ts`

**Interfaces:**
- Produces `SupportedLocale = "vi" | "en"`.
- Produces `resolveLocale(pathname, cookieLocale)`.
- Produces Next.js 16 locale proxy behavior with
  `localePrefix: "as-needed"`.
- Produces CI command `pnpm i18n:check`.

- [ ] **Step 1: Write a failing parity test**

```ts
expect(flattenKeys(viMessages)).toEqual(flattenKeys(enMessages));
```

Also fail when interpolation tokens differ between locales.

- [ ] **Step 2: Run the parity test**

Run: `pnpm vitest run tests/i18n/message-parity.test.ts`
Expected: FAIL before message resources and parity tooling exist.

- [ ] **Step 3: Implement locale routing and JSON resources**

Vietnamese resolves at canonical root paths. English resolves under `/en`.
Use the Next.js 16 `proxy.ts` convention with next-intl
`localePrefix: "as-needed"` so the `[locale]` App Router segment is internal
for Vietnamese and explicit for English. Persist a runtime language preference
without turning localized labels into domain values.

- [ ] **Step 4: Verify parity and web build**

Run: `pnpm i18n:check && pnpm --filter @lasoviet/web build`
Expected: PASS.

- [ ] **Step 5: Update docs/rules and commit**

```bash
git add apps/web/messages apps/web/src/i18n apps/web/src/proxy.ts packages/contracts scripts tests docs/superpowers/plans
git commit -m "feat: establish Vietnamese and English localization"
```

### Task 4 [P00-T04]: Add logging, health, tests, and CI gates

**Files:**
- Create: `packages/observability/package.json`
- Create: `packages/observability/src/logger.ts`
- Create: `packages/observability/src/request-context.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/web/src/app/health/live/route.ts`
- Create: `apps/web/src/app/health/ready/route.ts`
- Create: `vitest.workspace.ts`
- Create: `playwright.config.ts`
- Create: `.github/workflows/ci.yml`
- Test: `packages/observability/src/logger.test.ts`
- Test: `tests/health/health-contract.test.ts`

**Interfaces:**
- Produces `createLogger(serviceName)`.
- Produces request context fields `requestId`, `orderId`, `reportId`, `jobId`.
- Produces `/health/live` and `/health/ready`.

- [ ] **Step 1: Write failing redaction and health tests**

Assert that `password`, `apiKey`, `birthProfile`, `reportContent`, and
`signedUrl` are redacted.

- [ ] **Step 2: Run focused tests**

Run: `pnpm vitest run packages/observability tests/health`
Expected: FAIL.

- [ ] **Step 3: Implement Pino logging and health contracts**

Readiness checks only required P0 dependencies. Optional AI and cloud S3 report
degraded status without failing API readiness.

- [ ] **Step 4: Add CI**

CI runs:

```text
pnpm install --frozen-lockfile
pnpm i18n:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- [ ] **Step 5: Run the complete local gate**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 6: Update docs/rules and commit**

```bash
git add packages/observability apps/api/src/health apps/web/src/app/health vitest.workspace.ts playwright.config.ts .github tests docs/superpowers/plans
git commit -m "ci: add health observability and verification gates"
```

### Task 5 [P00-T05]: Establish route, content, analytics, and design contracts

**Files:**
- Create: `packages/contracts/src/route-v1.ts`
- Create: `packages/contracts/src/public-content-v1.ts`
- Create: `packages/contracts/src/analytics-event-v1.ts`
- Create: `config/route-registry.yml`
- Create: `packages/config/src/route-registry.ts`
- Create: `packages/config/src/analytics-events.ts`
- Create: `apps/web/src/styles/tokens.css`
- Create: `scripts/check-public-content.mjs`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/config/src/index.ts`
- Test: `packages/config/src/route-registry.test.ts`
- Test: `tests/analytics/event-contract.test.ts`
- Test: `tests/content/public-content-contract.test.ts`

**Interfaces:**
- Produces
  `RouteState = "reserved" | "preview_noindex" | "live_noindex" |
  "live_indexable" | "archived"`.
- Produces `RouteDefinitionV1` with stable ID, path, locale behavior, owner,
  intent, template, state, canonical, robots, schema types, and redirect
  disposition.
- Produces `PublicContentV1` metadata with route ID, locale, title, summary,
  reviewer, source references, risk tags, status, and `lastReviewed`.
- Produces the canonical analytics event union from
  `config/analytics-events.json`, including its ordered canonical funnel.
- Produces a typed route loader that validates `config/route-registry.yml`;
  the TypeScript module contains no duplicate route catalog.
- Produces Paper, Ink, Cinnabar, typography, spacing, radius, focus, motion,
  and accessibility CSS tokens from the approved brand guideline.

- [ ] **Step 1: Write failing registry, analytics, and content tests**

```ts
expect(routeStateSchema.options).toEqual([
  "reserved",
  "preview_noindex",
  "live_noindex",
  "live_indexable",
  "archived",
]);
expect(routeRegistry.filter((route) => route.purchasable).map((route) => route.sku))
  .toEqual(["ZIWEI-IDENTITY-P0"]);
expect(analyticsEventSchema.parse({ name: "payment_completed", properties: {} }))
  .toBeDefined();
expect(canonicalFunnel).toEqual(analyticsConfig.canonical_funnel);
```

Also fail duplicate paths, multiple owners for one canonical intent,
`live_indexable` routes without content/reviewer metadata, private routes in
the sitemap, reserved commercial routes marked purchasable, unknown analytics
properties, and public content without VI/EN route ownership.

- [ ] **Step 2: Run focused contract tests**

Run:

```bash
pnpm vitest run packages/config/src/route-registry.test.ts tests/analytics/event-contract.test.ts tests/content/public-content-contract.test.ts
```

Expected: FAIL before the contracts, registry, tokens, and checks exist.

- [ ] **Step 3: Implement the canonical registries**

Register the complete East/West taxonomy in `config/route-registry.yml`
immediately, but expose only approved Gate 1 routes. Mark relationship, career,
annual Zi Wei, and every later-wave route `reserved`. Keep private routes
`live_noindex` only when their owning flow is implemented. The TypeScript
registry module parses and validates the YAML source. The legacy
`config/sitemap.json` remains a deprecated snapshot and is never imported.

- [ ] **Step 4: Implement public-content validation and design tokens**

The content checker validates locale, route ownership, source/reviewer fields,
quality status, and forbidden placeholder text. Tokens implement the approved
Paper/Ink/Cinnabar palette, Source Serif 4 and Be Vietnam Pro roles, 44px touch
targets, visible focus, reduced motion, and maximum 8px card radius.

- [ ] **Step 5: Run contract, token, and workspace verification**

Run:

```bash
pnpm vitest run packages/config tests/analytics tests/content
pnpm check
```

Expected: PASS with one canonical registry and no public route/content drift.

- [ ] **Step 6: Update tracking and commit**

```bash
git add packages/contracts packages/config apps/web/src/styles scripts/check-public-content.mjs tests docs/superpowers/plans
git commit -m "feat: establish public experience contracts"
```

## Phase Exit Criteria

- All workspace packages compile.
- Web cannot import backend implementation.
- Runtime contracts validate at process boundaries.
- VI/EN parity is enforced automatically.
- Health and log-redaction tests pass.
- CI runs the root `check` command.
- Canonical route, route-state, public-content, analytics, and design-token
  contracts pass.
- Only `ZIWEI-IDENTITY-P0` is purchasable; later routes are registered but
  reserved.
- Terra records no unresolved `must-fix`.
- Trackers contain docs impact and rule-candidate results.
