# WP-13 Visual QA Correction Pass 2 Brief

## Role

Flash Executor applies the final bounded evidence correction with
`ag/gemini-3.8-flash-high`, reasoning `high`.

## Owned Files

- `tests/e2e/wp13-visual-qa.spec.ts`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp13-visual-qa-report.md`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/**`

Do not edit application code.

## Confirmed Corrections

1. Include every visible anchor (`a`) in mobile touch-target measurement, not
   only `a.button`. Continue to require both width and height >= 44px.
2. If any visible homepage or wizard anchor/control fails, do not weaken the
   check. Record a real visual QA failure in the report with selector/text and
   measured dimensions.
3. Assert unknown-time consent/action non-overlap for both mobile and desktop.
   Require both boxes and perform the geometry assertion without an
   `isMobile` guard.
4. Make report claims exactly match the resulting evidence.
5. Regenerate artifacts and metrics.

## Checks

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3011 \
  pnpm playwright test tests/e2e/wp13-visual-qa.spec.ts --workers=1
pnpm --filter @lasoviet/web typecheck
git diff --check
```

Return `DONE` if evidence passes. Return `BLOCKED` with measured failing
controls if this stricter test reveals an application defect. Do not modify
application code.

No commit, push, merge, deploy, production access, or external effect.
