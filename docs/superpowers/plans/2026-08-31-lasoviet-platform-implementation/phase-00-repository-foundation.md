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

- [x] **Step 1: Write the failing workspace-boundary test**

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

- [x] **Step 2: Run the test and confirm the workspace does not exist**

Run: `pnpm vitest run tests/workspace/workspace-boundaries.test.ts`
Expected: FAIL because the root workspace and manifests are absent.

- [x] **Step 3: Create the root workspace and exact-version installation record**

Use `pnpm add -E` for every dependency so the manifest records exact versions.
Resolve Next.js with `next@16` so installation selects the latest stable 16.x
available on the implementation date.

- [x] **Step 4: Create thin web, API, and worker bootstraps**

The API bootstrap uses `NestFactory.create<NestFastifyApplication>` with
`FastifyAdapter`. The worker bootstrap creates a Nest application context and
does not open an HTTP port.

- [x] **Step 5: Run workspace verification**

Run: `pnpm install --frozen-lockfile=false && pnpm typecheck && pnpm test`
Expected: PASS, with no product endpoints beyond implemented health endpoints.

- [x] **Step 6: Update tracking and commit**

Update `requirements-traceability.md` and
`dependency-integration-matrix.md`.

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc .gitignore apps packages tests docs/superpowers/plans
git commit -m "build: establish application workspace"
```

**P00-T01 Evidence (2026-09-01):**

- Final replacement verification passed: empty `pendingBuilds`, exact
  `unrs-resolver@1.12.2` approval `True`, and nonzero Windows native binding.
- `corepack pnpm@11.25.0 peers check` passed with no peer dependency issues.
- `corepack pnpm@11.25.0 vitest run tests/workspace/workspace-boundaries.test.ts`
  passed with one test.
- `corepack pnpm@11.25.0 run typecheck`, `run lint`, `run test`, `run build`,
  and `run check` passed.
- `corepack pnpm@11.25.0 install --frozen-lockfile` passed and reported the
  workspace already up to date.
- Commit: `ed37d67 build: establish application workspace`.
- Docs impact: minor
- Rule candidate: model-metadata availability probe, reviewed by Terra
- Evidence: `.superpowers/sdd/phase-00-repository-foundation/progress.md`
  (2026-09-01)
- AGENTS.md action: none; Sol owns any approved policy edit
- Corrected RED command approval: resolved by Sol on 2026-09-01.
- Open questions: none.

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

- [x] **Step 1: Write failing schema tests**

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

- [x] **Step 2: Run focused tests**

Run: `pnpm vitest run packages/contracts packages/config`
Expected: FAIL because schemas and loaders do not exist.

- [x] **Step 3: Implement Zod schemas and redacted configuration errors**

Configuration errors may name a missing variable but must never print its
value. Optional AI, SMTP, and cloud S3 groups expose explicit `enabled` state.

- [x] **Step 4: Run tests and typecheck**

Run: `pnpm vitest run packages/contracts packages/config && pnpm typecheck`
Expected: PASS.

- [x] **Step 5: Record docs/rule impact and commit**

Rule candidate must be `none` unless a recurring configuration ambiguity is
verified.

```bash
git add packages/contracts packages/config docs/superpowers/plans
git commit -m "feat: add versioned contracts and typed configuration"
```

**P00-T02 Evidence (2026-09-01):**

- Focused contracts/config suite passed with `2` test files and `50/50` tests.
- `@lasoviet/config` package typecheck and root typecheck passed.
- Root `check` passed lint, recursive typecheck, test discovery with `54/54`
  tests, and recursive build.
- Exact direct dependency pins: `zod: "4.5.4"` in both contracts and config;
  lockfile importers resolve `4.5.4`.
- Redaction vector passed; serialized failures contained safe variable
  metadata without synthetic secret, URL, password, or API-key values.
- Docs impact: minor
- Rule candidate: none
- AGENTS.md action: none
- Open questions: none.

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

- [x] **Step 1: Write a failing parity test**

```ts
expect(flattenKeys(viMessages)).toEqual(flattenKeys(enMessages));
```

Also fail when interpolation tokens differ between locales.

- [x] **Step 2: Run the parity test**

Run: `pnpm vitest run tests/i18n/message-parity.test.ts`
Expected: FAIL before message resources and parity tooling exist.

- [x] **Step 3: Implement locale routing and JSON resources**

Vietnamese resolves at canonical root paths. English resolves under `/en`.
Use the Next.js 16 `proxy.ts` convention with next-intl
`localePrefix: "as-needed"` so the `[locale]` App Router segment is internal
for Vietnamese and explicit for English. Persist a runtime language preference
without turning localized labels into domain values.

- [x] **Step 4: Verify parity and web build**

Run: `pnpm i18n:check && pnpm --filter @lasoviet/web build`
Expected: PASS.

- [x] **Step 5: Update docs/rules and commit**

```bash
git add apps/web/messages apps/web/src/i18n apps/web/src/proxy.ts packages/contracts scripts tests docs/superpowers/plans
git commit -m "feat: establish Vietnamese and English localization"
```

**P00-T03 Evidence (2026-09-01):**

- Focused parity test passed with `1` test file and `2/2` tests.
- Root `i18n:check` passed.
- `peers check` passed with no peer dependency issues; `ignored-builds`
  retained only the approved `@parcel/watcher@2.6.0` and
  `@swc/core@1.16.1` false decisions.
- Root lint passed under the pinned `eslint@9.39.5`; its exact registry
  deprecation notice was accepted by the approved ruling.
- Contracts and web typechecks passed.
- Web build passed under Next.js `16.3.4` with the Next 16 `proxy.ts`
  convention and `localePrefix: "as-needed"`.
- Exact direct dependency: `next-intl: "4.14.1"` in `@lasoviet/web`;
  ESLint remains exactly `9.39.5`.
- Docs impact: minor
- Rule candidate: none
- AGENTS.md action: none
- Open questions: none.

### Task 4 [P00-T04]: Add logging, health, tests, and CI gates

**Files:**
- Create: `packages/observability/package.json`
- Create: `packages/observability/src/logger.ts`
- Create: `packages/observability/src/request-context.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/web/src/app/health/live/route.ts`
- Create: `apps/web/src/app/health/ready/route.ts`
- Create: `vitest.config.mts`
- Create: `playwright.config.ts`
- Create: `.github/workflows/ci.yml`
- Test: `packages/observability/src/logger.test.ts`
- Test: `tests/health/health-contract.test.ts`

**Interfaces:**
- Produces `createLogger(serviceName)`.
- Produces request context fields `requestId`, `orderId`, `reportId`, `jobId`.
- Produces `/health/live` and `/health/ready`.

**Implementation note (2026-09-01):** Vitest 4 uses the supported root
`vitest.config.mts` filename for this ESM config. The config maps `@lasoviet/contracts` and the
concretely required `@lasoviet/config` import to absolute current-source
paths, so focused root tests do not require generated package declarations.

- [x] **Step 1: Write failing redaction and health tests**

Assert that `password`, `apiKey`, `birthProfile`, `reportContent`, and
`signedUrl` are redacted.

- [x] **Step 2: Run focused tests**

Run: `pnpm vitest run packages/observability tests/health`
Expected: FAIL.

**P00-T04 RED evidence (2026-09-01):** The focused command first failed with
missing `./logger.js` and `@lasoviet/contracts` modules before implementation.
After implementation, the source alias correction was required so clean root
tests resolve current contracts/config source without generated `dist`.

- [x] **Step 3: Implement Pino logging and health contracts**

Readiness checks only required P0 dependencies. Optional AI and cloud S3 report
degraded status without failing API readiness.

- [x] **Step 4: Add CI**

CI runs:

```text
pnpm install --frozen-lockfile
pnpm i18n:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- [x] **Step 5: Run the complete local gate**

Run: `pnpm check`
Expected: PASS.

- [x] **Step 6: Update docs/rules and commit**

```bash
git add packages/observability apps/api/src/health apps/api/src/api.module.ts apps/web/src/app/health vitest.config.mts playwright.config.ts .github tests/health package.json pnpm-lock.yaml docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/phase-00-repository-foundation.md
git commit -m "ci: add health observability and verification gates"
```

**P00-T04 Evidence (2026-09-01):**

- Focused `corepack pnpm@11.25.0 vitest run packages/observability tests/health`
  passed: 2 files, 3 tests.
- `corepack pnpm@11.25.0 --filter @lasoviet/api typecheck` passed.
- `corepack pnpm@11.25.0 check` passed: lint, all workspace typechecks, 6 test
  files with 59 tests, and all workspace builds.
- The build produced `/health/live` and `/health/ready` routes.
- Exact dependencies: `pino@10.3.1` in observability and
  `@playwright/test@1.62.1` at the root.
- Existing pnpm build policy was preserved. No new peer or build-policy warning
  occurred. The known ESLint `9.39.5` deprecation was non-blocking; the
  supported `.mts` config emitted no Vitest config-loader warning.
- `vitest.config.mts` is the supported filename deviation recorded above; its
  absolute aliases cover only the focused tests' concrete internal imports.
- Docs impact: minor. Rule candidate: none. Open questions: none.

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

- [x] **Step 1: Write failing registry, analytics, and content tests**

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

- [x] **Step 2: Run focused contract tests**

Run:

```bash
pnpm vitest run packages/config/src/route-registry.test.ts tests/analytics/event-contract.test.ts tests/content/public-content-contract.test.ts
```

Expected: FAIL before the contracts, registry, tokens, and checks exist.

**P00-T05 RED evidence (2026-09-01):** The focused command first failed because
the new route-registry, analytics, and public-content modules were absent.

- [x] **Step 3: Implement the canonical registries**

Register the complete East/West taxonomy in `config/route-registry.yml`
immediately, but expose only approved Gate 1 routes. Mark relationship, career,
annual Zi Wei, and every later-wave route `reserved`. Keep private routes
`live_noindex` only when their owning flow is implemented. The TypeScript
registry module parses and validates the YAML source. The legacy
`config/sitemap.json` remains a deprecated snapshot and is never imported.

- [x] **Step 4: Implement public-content validation and design tokens**

The content checker validates locale, route ownership, source/reviewer fields,
quality status, and forbidden placeholder text. Tokens implement the approved
Paper/Ink/Cinnabar palette, Source Serif 4 and Be Vietnam Pro roles, 44px touch
targets, visible focus, reduced motion, and maximum 8px card radius.

- [x] **Step 5: Run contract, token, and workspace verification**

Run:

```bash
pnpm vitest run packages/config tests/analytics tests/content
pnpm check
```

Expected: PASS with one canonical registry and no public route/content drift.

- [x] **Step 6: Update tracking and commit**

```bash
git add packages/contracts packages/config apps/web/src/styles scripts/check-public-content.mjs tests/analytics tests/content package.json pnpm-lock.yaml vitest.config.mts docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/phase-00-repository-foundation.md
git commit -m "feat: establish public experience contracts"
```

**P00-T05 Evidence (2026-09-01):**

- Focused `corepack pnpm@11.25.0 vitest run packages/config/src/route-registry.test.ts tests/analytics/event-contract.test.ts tests/content/public-content-contract.test.ts`
  passed: 3 files, 7 tests.
- `corepack pnpm@11.25.0 content:check` passed after building the config
  dependency closure and validated 26 public routes with VI/EN ownership.
- `corepack pnpm@11.25.0 check` passed lint, all workspace typechecks, 9 test
  files with 66 tests, and all workspace builds.
- The route registry is YAML-backed, includes the East/West taxonomy and
  private routes, and exposes only the approved public states. Exactly
  `ZIWEI-IDENTITY-P0` is purchasable; reserved commercial routes remain
  reserved.
- The analytics schema and canonical funnel are derived from
  `config/analytics-events.json`; public content checks enforce ownership,
  review metadata, quality status, and placeholder rejection.
- Tokens implement the approved Paper/Ink/Cinnabar palette, Source Serif 4,
  Be Vietnam Pro, spacing, radii, 44px targets, focus, reduced motion, and
  accessibility behavior.
- Exact dependency: `yaml@2.9.0` in `@lasoviet/config`. Existing scripts and
  pnpm policy were preserved. No new peer or build-policy warning occurred.
- The supported `vitest.config.mts` correction removed the prior config-loader
  warning. Docs impact: minor. Rule candidate: none. Open questions: none.

### P00-T05 Milestone Fix Wave Evidence (2026-09-01)

- Focused runtime i18n, TCP health, and public-content regressions passed:
  `3` files, `7` tests.
- `corepack pnpm@11.25.0 content:check` passed with `52` records for `26`
  public routes.
- `corepack pnpm@11.25.0 i18n:check` passed.
- `corepack pnpm@11.25.0 --filter @lasoviet/web build` passed after regenerating
  stale `.next` route artifacts. The build exposed `/[locale]`,
  `/health/live`, and `/health/ready`.
- `corepack pnpm@11.25.0 --filter @lasoviet/web typecheck` passed.
- Fresh `corepack pnpm@11.25.0 check` passed lint, workspace typechecks,
  `10` test files with `69` tests, and all workspace builds.
- Runtime i18n now owns the locale root tree, required dependency readiness uses
  bounded TCP probes, and `content:check` validates the version-controlled
  `config/public-content.json` source.
- Docs impact: minor. Rule candidate: none. Open questions: none.
- Commit: `fix: complete Phase 00 runtime acceptance`.

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
