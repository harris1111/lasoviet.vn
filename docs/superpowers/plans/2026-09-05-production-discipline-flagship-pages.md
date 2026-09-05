# Production Discipline Flagship Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development`. Gemini `flash_executor` implements
> the approved packets. Terra xhigh performs one milestone review after the
> complete batch, per FD-021 and FD-027.

**Goal:** Port the approved discipline and free-tool prototype pages into the
production Next.js web app with exact Vietnamese copy, close visual parity, and
typed presentation boundaries that backend data can populate later.

**Architecture:** Keep the canonical route registry as the routing source of
truth. Extend the public content path to render `live_noindex` previews, then
dispatch route templates to shared page shells and discipline-specific result
renderers. Static illustrative providers supply the current prototype examples;
future backend adapters can replace result data without changing page layout.

**Tech Stack:** Next.js 16.3.4, React 19.2.8, next-intl 4.14.1, TypeScript 6,
Vitest 4.1.11, Playwright 1.62.1, CSS.

**Spec:** `docs/19-sitemap-v2-discipline-pages.md`

## Global Constraints

- Exact source ref: `5b800ebdb0d3a1e294ebb5e044673b4565ea0585`.
- Exact integration base: `b37df34cb7c501a95e6ee7cc7cea1e516726e339`.
- Preserve all Vietnamese prototype copy verbatim, including the existing
  Chiêm Tinh engine wording approved by the founder on 2026-09-05.
- Do not re-port the `/tu-vi` body or rename `/tao-la-so/tu-vi`.
- Do not add backend endpoints, database changes, engine integrations,
  payments, production AI, or deployment changes.
- Preview and gated routes are public `live_noindex` with
  `indexing: noindex_follow`, `robots: noindex,follow`, and `sitemap: false`.
- Old canonical aliases return real HTTP `301` responses and preserve locale.
- Vietnamese is the exact-copy source. English must preserve key parity and
  the same page structure without weakening Vietnamese copy.
- Illustrative data must always carry and render an explicit disclosure.
- Use self-hosted existing fonts and assets only. Do not add remote font CSS or
  generate new imagery.
- Implementation PR targets `product/discipline-flagship-pages`.
- Run focused checks and one final Terra xhigh batch review. Do not schedule
  routine reviews after small edits.

---

### Task 1: Route Lifecycle And Preview Contracts

**Files:**
- Modify: `config/route-registry.yml`
- Modify: `config/public-content.json`
- Modify: `apps/web/src/proxy.ts`
- Modify: `apps/web/src/features/content/public-route-resolver.ts`
- Modify: `apps/web/src/features/content/public-content-repository.ts`
- Modify: `apps/web/src/features/content/public-content-page.tsx`
- Modify: `apps/web/src/seo/public-metadata.ts`
- Modify: `packages/config/src/route-registry.ts`
- Test: `tests/content/public-content-repository.test.ts`
- Test: `tests/content/public-content-contract.test.ts`
- Test: `tests/seo/public-metadata.test.ts`
- Test: `tests/seo/crawl-controls.test.ts`
- Create: `tests/seo/discipline-route-migration.test.ts`

**Interfaces:**
- Produces renderable `live_noindex` route resolution.
- Produces true locale-preserving `301` alias responses in `proxy.ts`.
- Produces metadata for renderable previews with canonical URLs and
  `noindex,follow`.
- Keeps `reserved`, `preview_noindex`, private, and archived non-redirect
  routes unavailable.

- [ ] Write focused failing tests for `live_noindex` rendering, metadata,
  sitemap exclusion, and each redirect alias.
- [ ] Run focused tests and verify the expected RED failures.
- [ ] Add canonical routes:
  `/tu-vi`, `/bat-tu`, `/kinh-dich`, `/chiem-tinh`, `/than-so-hoc`,
  `/cong-cu-mien-phi`, `/ngay-tot`, `/12-con-giap`,
  `/giai-ma-giac-mo`, `/boi-bai`, `/lich-am`,
  `/phong-thuy/huong-nha`, and `/xem-chi-tay`.
- [ ] Add archived aliases:
  `/la-so-tu-vi`, `/la-so-bat-tu`, `/gieo-que-kinh-dich`,
  `/ban-do-sao`, and `/boi-bai/tarot`.
- [ ] Return HTTP `301` from `proxy.ts` before next-intl routing, preserving
  `/en` on English requests and setting `Location` to the canonical route.
- [ ] Extend repository, resolver, and metadata handling only for public
  `live_noindex`; keep other non-live states unavailable.
- [ ] Add VI/EN metadata records for every renderable route.
- [ ] Run focused tests until GREEN.
- [ ] Run `corepack pnpm@11.25.0 --filter @lasoviet/config... run build`.
- [ ] Run web typecheck.
- [ ] Commit with `feat(web): add discipline preview route lifecycle`.

### Task 2: Shared Presentation Boundary And Page Shell

**Files:**
- Create: `apps/web/src/features/discipline-pages/discipline-page-model.ts`
- Create: `apps/web/src/features/discipline-pages/discipline-page-provider.ts`
- Create: `apps/web/src/features/discipline-pages/discipline-page-shell.tsx`
- Create: `apps/web/src/features/discipline-pages/discipline-page-sections.tsx`
- Create: `apps/web/src/features/discipline-pages/discipline-result-preview.tsx`
- Create: `apps/web/src/features/discipline-pages/discipline-page-content.ts`
- Modify: `apps/web/src/components/site-header.tsx`
- Create: `apps/web/src/styles/discipline-pages-foundation.css`
- Create: `apps/web/src/styles/discipline-pages-components.css`
- Create: `apps/web/src/styles/discipline-pages-results.css`
- Modify: `apps/web/src/styles/global.css`
- Test: `tests/web/discipline-page-contract.test.ts`
- Test: `tests/i18n/discipline-page-content.test.ts`

**Interfaces:**
- `PreviewData<T>` is a discriminated union:
  `{ sourceKind: "illustrative"; isIllustrative: true; disclosure: string; data: T }`
  or
  `{ sourceKind: "backend"; isIllustrative: false; provenance: string; data: T }`.
- `DisciplinePageProvider` resolves route, locale, exact content, availability,
  method rows, limitations, FAQ, and typed result preview.
- The shell requires an illustrative disclosure whenever
  `sourceKind === "illustrative"`.

- [ ] Write contract tests first for the discriminated union, required
  disclosure, route lookup, and context-sensitive discipline navigation.
- [ ] Run focused tests and verify RED.
- [ ] Implement the minimum typed presentation boundary and static provider.
- [ ] Port only geometry shared by the prototypes into the shell and section
  primitives; keep result visualizations page-specific.
- [ ] Add the discipline header variant without changing homepage header
  behavior.
- [ ] Port prototype token values, breakpoints, and shared SVG geometry into
  scoped CSS.
- [ ] Run focused tests until GREEN.
- [ ] Run i18n parity and web typecheck.
- [ ] Commit with `feat(web): add discipline page presentation shell`.

### Task 3: Flagship Preview Pages

**Files:**
- Create: `apps/web/src/features/discipline-pages/bazi-result-preview.tsx`
- Create: `apps/web/src/features/discipline-pages/iching-result-preview.tsx`
- Create: `apps/web/src/features/discipline-pages/astrology-result-preview.tsx`
- Create: `apps/web/src/features/discipline-pages/numerology-result-preview.tsx`
- Create: `apps/web/messages/vi/discipline-pages.json`
- Create: `apps/web/messages/en/discipline-pages.json`
- Modify: `apps/web/src/i18n/request.ts`
- Modify: `apps/web/src/features/content/public-content-page.tsx`
- Test: `tests/i18n/discipline-prototype-copy.test.ts`
- Test: `tests/e2e/discipline-preview-pages.spec.ts`

**Source Mapping:**
- `/bat-tu` -> `prototype/bat-tu/index.html`
- `/kinh-dich` -> `prototype/kinh-dich/index.html`
- `/chiem-tinh` -> `prototype/chiem-tinh/index.html`
- `/than-so-hoc` -> `prototype/than-so-hoc/index.html`

- [ ] Add an independent prototype extractor that reads final HTML and
  `text/x-dc` bindings from the mapped files.
- [ ] Write exact-copy tests against the extractor and verify RED.
- [ ] Port all four pages section-for-section and copy-for-copy.
- [ ] Implement the distinct sample visualizations: four pillars, primary and
  changed hexagrams, natal wheel/table, and numerology trace/grid.
- [ ] Preserve every `Sắp ra mắt`, method, limitation, FAQ, and illustrative
  disclaimer string exactly in Vietnamese.
- [ ] Add structurally equivalent English copy.
- [ ] Run exact-copy tests, i18n parity, web typecheck, and production build.
- [ ] Commit with `feat(web): port discipline flagship previews`.

### Task 4: Free Tools Hub, Tool Previews, And Gated Pages

**Files:**
- Create: `apps/web/src/features/free-tools/free-tools-page-model.ts`
- Create: `apps/web/src/features/free-tools/free-tools-page-provider.ts`
- Create: `apps/web/src/features/free-tools/free-tools-hub.tsx`
- Create: `apps/web/src/features/free-tools/good-days-preview.tsx`
- Create: `apps/web/src/features/free-tools/zodiac-preview.tsx`
- Create: `apps/web/src/features/free-tools/dream-symbol-preview.tsx`
- Create: `apps/web/src/features/free-tools/tarot-preview.tsx`
- Create: `apps/web/src/features/free-tools/lunar-calendar-preview.tsx`
- Create: `apps/web/src/features/free-tools/gated-tool-preview.tsx`
- Create: `apps/web/messages/vi/free-tools.json`
- Create: `apps/web/messages/en/free-tools.json`
- Modify: `apps/web/src/i18n/request.ts`
- Modify: `apps/web/src/features/content/public-content-page.tsx`
- Test: `tests/i18n/free-tools-prototype-copy.test.ts`
- Test: `tests/e2e/free-tool-preview-pages.spec.ts`

**Source Mapping:**
- `/cong-cu-mien-phi` -> `prototype/cong-cu-mien-phi/index.html`
- `/ngay-tot` -> `prototype/ngay-tot/index.html`
- `/12-con-giap` -> `prototype/12-con-giap/index.html`
- `/giai-ma-giac-mo` -> `prototype/giai-ma-giac-mo/index.html`
- `/boi-bai` -> `prototype/boi-bai/index.html`
- `/lich-am` -> `prototype/lich-am/index.html`
- `/phong-thuy/huong-nha` -> `prototype/phong-thuy/huong-nha/index.html`
- `/xem-chi-tay` -> `prototype/xem-chi-tay/index.html`

- [ ] Write exact-copy and provider tests first and verify RED.
- [ ] Port the hub and five full tool previews with their prototype
  interactions and illustrative data.
- [ ] Port the two gated pages without upload, image processing, calculation,
  or unavailable actions.
- [ ] Preserve all Vietnamese copy exactly.
- [ ] Add structurally equivalent English copy.
- [ ] Run focused tests, i18n parity, web typecheck, and production build.
- [ ] Commit with `feat(web): port free tool preview pages`.

### Task 5: Visual Parity And Milestone Review

**Files:**
- Create: `tests/fixtures/discipline-prototype-source-manifest.json`
- Create: `tests/e2e/discipline-visual-parity.spec.ts`
- Modify: focused files only when parity evidence requires correction.

- [ ] Lock each route to its prototype path and SHA-256 at source ref
  `5b800ebdb0d3a1e294ebb5e044673b4565ea0585`.
- [ ] Render prototype baselines through the generated prototype runtime with
  no console errors.
- [ ] Pin Chromium, device scale factor `1`, loaded self-hosted fonts,
  reduced motion, and viewports `1440x900` and `320x720`.
- [ ] Verify every page has no horizontal overflow, functional mobile menu and
  FAQ controls, and all required illustrative disclosures.
- [ ] Require key section bounding boxes within `2px` and screenshot differing
  pixels at or below `0.5%`.
- [ ] Run focused route, copy, i18n, typecheck, build, and Playwright checks.
- [ ] Run `git diff --check` and confirm the changed-file allowlist.
- [ ] Dispatch one Terra xhigh milestone review over the complete branch diff.
- [ ] Apply only evidence-backed `must-fix` findings, with no more than two
  correction passes.
- [ ] Push the implementation branch and create a PR targeting
  `product/discipline-flagship-pages`.

## Unresolved Questions

None. The founder approved Plan V1 and explicitly required all prototype text
to remain unchanged on 2026-09-05.
