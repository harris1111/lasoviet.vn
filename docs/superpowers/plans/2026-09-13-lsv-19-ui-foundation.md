# LSV-19 UI Foundation Implementation Plan

**Date:** 2026-09-13
**Status:** Planning complete; implementation blocked by the shared UI artifact
gate and explicit founder plan approval
**Queue position:** 1 of 5 (`LSV-19 -> LSV-8 -> LSV-20 -> LSV-21 -> LSV-22`)

## Goal

Establish the approved typography, spacing, color-role, focus, motion, card,
field, tab, accordion, matrix, support, and bottom-sheet primitives required by
the five-ticket core UI queue without changing product behavior.

## Binding Sources

- Founder decisions FD-024, FD-053, FD-056, FD-059, FD-063, FD-069, FD-071,
  and FD-081.
- `docs/13-brand-experience-guideline.md`.
- `docs/14-sitemap-seo-wireframes.md`.
- `docs/superpowers/specs/2026-09-13-aituvi-ui-adaptation-for-lasoviet.md`.
- The measured screenshots under
  `docs/reference/aituvi-benchmark-2026-09-13/`.
- The repository `AGENTS.md` UI artifact and production typography rules.

## Mandatory UI Artifact Gate

Production UI work must not begin from the benchmark screenshots or this plan
alone. A dedicated UI artifact branch, created from the then-current
`origin/master`, must first provide founder-reviewable 320, 390, and 1440
screens for:

1. the complete primitive gallery;
2. the mobile and desktop 12-palace result composition;
3. the ten-block homepage;
4. every birth-wizard step, validation state, and keyboard-open state;
5. every result tab and the locked-preview desktop/mobile states.

The artifact must resolve these source conflicts explicitly:

- brand guideline card radius `8px` versus LSV-19 card radius `16px`;
- brand guideline pill use mainly for tags/filters versus pill CTAs;
- Blueprint mobile homepage copy-first order versus LSV-20 form-first order;
- the existing two-tab result artifact versus the LSV-22 five-tab result.

Harris must approve the artifact in writing under FD-056. The approved artifact
commit and screenshot manifest become immutable inputs to every Flash brief.

## Current-State Evidence

- `apps/web/src/styles/tokens.css` still defines `--radius-card: 8px`.
- Live CSS contains customer-facing text from `10px` through `13.5px`.
- `global.css` contains the marquee and several raw colors outside the role
  mapping requested by LSV-19.
- Reduced-motion and a global focus-visible rule already exist and must be
  preserved.
- No component-gallery route exists. Do not expose a production route merely
  for demonstration; artifact screenshots satisfy the pre-implementation
  visual gate, and production primitives are verified on their consuming
  pages.

## Flash Executor Slices

### Slice 19-A: Token and Primitive Style Contract

**Owned files**

- Modify: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/ui-core.css`
- Modify: `apps/web/src/styles/global.css` only to import `ui-core.css` and
  remove superseded global primitive declarations
- Create: `tests/web/ui-core-token-contract.test.ts`

**Behavior**

- Add semantic tokens for the approved artifact roles, including jade success,
  16px cards, 12px fields, pill controls, 44/48px controls, 56px fields,
  reading width, section spacing, and the approved shadow.
- Keep all raw color values in `tokens.css`; consuming styles use variables.
- Preserve bundled font roles and Vietnamese glyph coverage.
- Preserve global focus and reduced-motion behavior.

**Acceptance**

- No product component or page layout changes in this slice.
- Token tests reject unapproved raw colors in `ui-core.css`.
- All customer-facing primitive defaults are at least `14px`.
- `git diff --check` and the focused token test pass.

### Slice 19-B: Static Shared Primitives

**Owned files**

- Create: `apps/web/src/components/ui/ui-card.tsx`
- Create: `apps/web/src/components/ui/ui-field-shell.tsx`
- Create: `apps/web/src/components/ui/check-matrix.tsx`
- Create: `apps/web/src/components/ui/support-card.tsx`
- Create: `apps/web/src/components/ui/ui-primitives.test.tsx`

**Behavior**

- Implement presentation-only card, field shell, check matrix, and email
  support primitives against Slice 19-A classes.
- Accept semantic children and labels; do not embed page copy, prices, tracking,
  route decisions, or product state.
- Support card exposes email only. It must not render Zalo, phone, address, or a
  floating contact control.

**Acceptance**

- Components render valid labels and do not create nested card shells.
- Matrix cells expose text labels in addition to icons.
- Interactive descendants retain at least a 44px target.
- Component tests and web typecheck pass.

### Slice 19-C: Interactive Shared Primitives

**Owned files**

- Create: `apps/web/src/components/ui/segmented-tabs.tsx`
- Create: `apps/web/src/components/ui/layer-tab-bar.tsx`
- Create: `apps/web/src/components/ui/numbered-accordion.tsx`
- Create: `apps/web/src/components/ui/chip-rows.tsx`
- Create: `apps/web/src/components/ui/bottom-sheet.tsx`
- Create: `apps/web/src/components/ui/ui-interactions.test.tsx`

**Behavior**

- Tabs implement roving keyboard focus and explicit selected-panel semantics.
- Accordion permits one approved initial open item and keeps native heading
  structure.
- Chip rows stop under `prefers-reduced-motion`.
- Bottom sheet traps focus, closes on Escape/backdrop, restores trigger focus,
  labels the dialog, and never receives protected locked plaintext.

**Acceptance**

- Keyboard, focus restoration, reduced-motion, and accessible-name tests pass.
- No dependency is added.
- No page adopts the primitives in this slice.

### Slice 19-D: Content Budgets and Shared Visual Checks

**Owned files**

- Modify: `scripts/check-public-content.mjs`
- Create: `tests/content/ui-copy-budget.test.ts`
- Create: `tests/e2e/core-ui-visual-contract.spec.ts`

**Behavior**

- Normalize CRLF/LF before line-oriented checks.
- Enforce section subtitles at 30 words, card bodies at 30 words, accordion
  teaser source copy at the approved limit, and no homepage price copy.
- Add reusable Playwright helpers for overflow, minimum font size, 44px targets,
  focus visibility, reduced motion, font loading, and screenshot naming.
- The browser checks run against consuming pages after their ticket lands; they
  do not require a public demo route.

**Acceptance**

- The checker reports file/key context and does not rewrite copy.
- Existing public-content validation still passes.
- `git diff --check`, focused Vitest, content check, and web typecheck pass.

## Focused Check Commands

```bash
corepack pnpm@11.25.0 vitest run \
  tests/web/ui-core-token-contract.test.ts \
  apps/web/src/components/ui/ui-primitives.test.tsx \
  apps/web/src/components/ui/ui-interactions.test.tsx \
  tests/content/ui-copy-budget.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 run content:check
PLAYWRIGHT_BASE_URL=http://127.0.0.1:$WEB_HOST_PORT \
  corepack pnpm@11.25.0 playwright test \
  tests/e2e/core-ui-visual-contract.spec.ts
git diff --check
```

The Playwright command runs only after a local app server is available on the
validated loopback port. It must not deploy or use production.

## Sequencing and Terra Review

1. Founder approves the shared UI artifact and this five-plan queue.
2. Flash runs 19-A through 19-D in order on an LSV-19 UI branch created from
   the latest fetched `origin/master`.
3. Terra high reviews the complete LSV-19 foundation milestone once, including
   token drift, accessibility, typography, and excluded product behavior.
4. Must-fix corrections use one narrowed Sol brief and Terra re-review.
5. The branch is pushed and a PR is opened directly to `master`. This planning
   branch and its PR are never merged by the agent; any later merge requires
   separate explicit founder authorization.

## Conflict Map

- LSV-20, LSV-21, and LSV-22 consume these primitives and must not redefine
  them in page-local CSS.
- LSV-12 owns analytics registry, visitor identity, consent semantics, and
  dispatch transport. LSV-19 owns no analytics behavior.
- Existing `prototype/**` files are reference artifacts and are not production
  lint targets. Generated support bundles must not be edited.
- PR #51 documents the pending repository-rule update for direct-to-`master`
  ticket PRs. The founder instruction dated 2026-09-13 governs this queue now.

## Explicit Exclusions

- Homepage restructuring, wizard behavior, chart responsiveness, result tabs,
  secure preview contracts, analytics emission, dependencies, deployment, and
  route creation.

## Founder Approval Required

1. Approve the new shared UI artifact and its exact commit.
2. Confirm that the artifact supersedes the radius, pill, homepage ordering,
   and result-tab conflicts listed above.
3. Approve this implementation plan and authorize the bounded LSV-19 branch.
