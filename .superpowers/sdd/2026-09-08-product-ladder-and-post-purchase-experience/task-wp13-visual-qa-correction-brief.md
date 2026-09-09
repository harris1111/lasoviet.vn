# WP-13 Visual QA Correction Brief

## Role

Flash Executor applies one bounded evidence correction with
`ag/gemini-3.8-flash-high`, reasoning `high`.

## Owned Files

- `tests/e2e/wp13-visual-qa.spec.ts`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp13-visual-qa-report.md`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/**`

Do not edit application code.

## Confirmed Important Corrections

1. Require both rendered width and height to be at least 44px for visible
   mobile interactive controls. Apply this to homepage and wizard controls.
   Record the true minimum width and height.
2. Replace the weak focus check with deterministic Tab-order assertions across
   multiple named controls and a real focus-indicator check (`outline-style`
   and width, or non-none box shadow). Do not use non-empty border color.
3. Correct refresh evidence. Verify and report the actual behavior: a direct
   unsubmitted wizard refresh safely returns to the initial wizard state; do
   not claim Step 3 or unsaved input persistence.
4. Use 720x450 as the 200%-zoom reflow equivalent for a 1440x900 viewport, and
   label it as an equivalent reflow approximation rather than real browser
   zoom.
5. For unknown-time review, scroll to final consent, require both consent and
   sticky action bounding boxes to exist, assert non-overlap, then capture the
   screenshot. Never silently skip geometry assertions.
6. Correct checkout blocker language: the current blocker is absence of an
   isolated verified-account/order/private-API fixture. Visual checkout does
   not inherently require live webhooks or provider credentials.
7. Regenerate deterministic screenshots and metrics. Preserve the overall
   status as incomplete pending remaining authenticated-flow evidence and
   Harris sign-off.

## Checks

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3011 \
  pnpm playwright test tests/e2e/wp13-visual-qa.spec.ts --workers=1
pnpm --filter @lasoviet/web typecheck
git diff --check
```

No commit, push, merge, deploy, production access, or external effect.
