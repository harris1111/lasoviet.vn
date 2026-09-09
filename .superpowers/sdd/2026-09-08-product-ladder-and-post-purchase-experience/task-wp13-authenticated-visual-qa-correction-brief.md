# WP-13 Authenticated Visual QA Correction Brief

## Role And Scope

- Executor: Flash Executor using `ag/gemini-3.8-flash-high` with `high`
  reasoning.
- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp13-visual-qa-20260909`
- Correct only the confirmed WP-13 evidence and touch-target findings below.
- Do not commit, push, merge, deploy, access production, activate providers,
  or touch unrelated services/worktrees.

## Owned Files

- `apps/web/src/styles/account-dashboard.css`
- `scripts/wp13-seed-authenticated-fixture.mjs`
- `tests/e2e/wp13-authenticated-visual-qa.spec.ts`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp13-visual-qa-report.md`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/**`

Stop before editing any other file.

## Confirmed Important Corrections

### 1. Account section links are below 44px

At mobile width, `.account-section-link` ("Xem tất cả") measures `75x18px`.

- Give the anchor a real minimum `44x44px` clickable box using layout and
  alignment properties.
- Preserve text, destination, visual hierarchy, desktop layout, and section
  header alignment.
- Do not add wrapper markup, JavaScript, or decorative content.

### 2. Touch-target evidence checks only the initial viewport

The current helper omits rendered controls below the fold, which allowed the
confirmed defect to pass.

- Measure every rendered, visible interactive `button`, `a`, `input`,
  `select`, and `summary` in the document, including below-fold controls.
- Require both width and height to be at least 44px on mobile.
- Record selector/class, text, width, and height for every failure.
- Do not weaken or special-case text links.

### 3. Focus evidence is non-deterministic and accepts invalid signals

The current helper:

- accepts any four focused elements instead of named expected controls;
- silently skips `null`/body focus;
- treats changed border color as a focus indicator.

Replace it with deterministic keyboard Tab assertions for meaningful named
controls on each route or stable route group:

- require a non-null active element at every expected step;
- assert the expected tag plus stable href, accessible name, class, or form
  field identity;
- accept only a real non-zero outline or non-none box shadow as visible focus;
- record the verified sequence in metrics or test evidence;
- do not use border color.

### 4. Screenshots are captured after scrolling to the document bottom

The current overlap helper scrolls to the bottom and the primary viewport
screenshot is then taken without restoring position. The resulting mobile
account image does not show the report's claimed account overview state.

- Preserve the bottom-of-page overlap assertion.
- Return to `scrollY = 0` and wait for stable layout before each primary
  viewport screenshot.
- The primary screenshot for each route must show the heading/state content
  described by the evidence matrix.
- Supplemental bottom screenshots are optional and must be clearly named.

### 5. Fixture and report cleanup

- Remove the accidental extra ignored argument in the second
  `seedChartLineage` call.
- Keep `fixture-manifest.json` generated and Git-ignored. It contains a
  short-lived signed local session cookie and must not be force-added or
  described as a committed artifact.
- Update report claims to match the corrected all-page touch audit, strict Tab
  evidence, and regenerated top-of-page screenshots.
- Remove the now-resolved account-section-link observation.
- Do not claim all local evidence is complete unless the unweakened suite
  passes.

## Runtime And Checks

Reuse the isolated runtime procedure in
`task-wp13-authenticated-visual-qa-brief.md`. Start and remove only:

- `lasoviet-wp13-postgres`
- `lasoviet-wp13-redis`
- web process on `3011`
- API process on `3012`

Run:

```bash
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 --filter @lasoviet/web run build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3011 \
  corepack pnpm@11.25.0 exec playwright test \
  tests/e2e/wp13-authenticated-visual-qa.spec.ts --workers=1
git diff --check
```

The full producer builds may be reused when their source and `dist` output
have not changed since the initial pass.

## Return

- Exact changed files.
- CSS dimensions after correction.
- Strict all-page touch and deterministic focus evidence.
- Playwright/build/typecheck results.
- Screenshot paths and cleanup confirmation.
- `BLOCKED` with measured evidence if any strict assertion still fails.
