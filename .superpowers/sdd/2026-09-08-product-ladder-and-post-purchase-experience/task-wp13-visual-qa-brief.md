# WP-13 Cross-Cutting Visual QA Brief

## Role

Flash Executor implements and executes this bounded QA task using
`ag/gemini-3.8-flash-high` with `high` reasoning.

## Objective

Create reproducible screenshot-backed visual QA for provider-independent public
and birth-wizard flows. Do not claim checkout or banking-return coverage without
an isolated authenticated local fixture.

## Runtime

- Local production build only: `http://127.0.0.1:3011`
- Do not use any other listening service or production URL.
- The current local web runtime intentionally has no reachable private API.

## Owned Files

- `tests/e2e/wp13-visual-qa.spec.ts`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp13-visual-qa-report.md`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/**`

Do not edit application code.

## Required Automated Coverage

1. Homepage at 360x800, 390x844, 414x896, 1440x900, and 720x900 as the
   desktop 200%-zoom reflow equivalent.
2. Birth wizard at 390x844 and 1440x900:
   - subject step;
   - exact-time birth step;
   - exact-time review;
   - unknown-time review with "Save profile" action and no paid text.
3. Validate:
   - no horizontal overflow;
   - loaded UI/display/mono font faces with Vietnamese sample text;
   - visible interactive controls are at least 44px on mobile;
   - form labels remain associated with fields;
   - invalid date error appears at the date field;
   - keyboard Tab reaches controls in logical order with a visible focus
     indicator;
   - a reduced-height 390x500 viewport can focus hour/minute fields and scroll
     them above the viewport bottom, approximating soft-keyboard pressure;
   - sticky mobile actions do not permanently cover the focused field or final
     consent content;
   - browser refresh preserves the current page safely and multi-tab cache
     reads do not mutate or clear stored birth data.
4. Save viewport screenshots, not stitched full-page screenshots, for sticky
   overlap adjudication. Full-page images may be supplemental only.
5. Reuse current approved UI; do not invent or modify visual design.

## Report Rules

Write an English pass/fail table with screenshot paths and measured evidence.
Explicitly mark these as `BLOCKED - NOT VERIFIED` unless a fully isolated local
fixture already exists without new credentials or external effects:

- verified-account library and order history;
- paid checkout states;
- return from banking app on one mobile device;
- report recovery and terminal-failure states.

The report must state that Harris alone provides final sign-off under FD-056.
Do not label WP-13 complete while any required checkout/banking evidence is
blocked or while Harris sign-off is absent.

## Focused Checks

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3011 \
  pnpm playwright test tests/e2e/wp13-visual-qa.spec.ts --workers=1
pnpm --filter @lasoviet/web typecheck
git diff --check
```

## Exclusions

- No application, database, API, worker, auth, commerce, or deployment edits.
- No production access.
- No use of AI provider credentials.
- No push, merge, deploy, payment activation, Telegram activation, or external
  side effect.

## Return Format

Return status, changed files, test results, verified pass/fail items, blocked
items, and exact evidence paths.
