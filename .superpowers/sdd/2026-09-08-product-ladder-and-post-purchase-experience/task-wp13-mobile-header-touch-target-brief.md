# WP-13 Mobile Header Touch Target Correction Brief

## Role

Flash Executor implements this bounded UI correction with
`ag/gemini-3.8-flash-high`, reasoning `high`.

## Confirmed Defect

The strict WP-13 Playwright evidence measured two visible homepage mobile
header links below the required 44x44px touch target at 360, 390, and 414px:

- `a.brand[href="/"]`: 126x22px
- `a.login-link[href="/dang-nhap"]`: 74x19px

## Owned File

- `apps/web/src/styles/global.css`

Do not modify any other file.

## Required Behavior

1. At the existing mobile breakpoint, make `.brand` and `.login-link` expose a
   minimum 44x44px clickable box.
2. Preserve the current logo asset, visible logo dimensions, login typography,
   header height intent, link destinations, and desktop appearance.
3. Use layout properties on the anchors; do not add text, icons, wrappers, or
   JavaScript.
4. Do not weaken or modify the WP-13 test.

## Checks

```bash
pnpm --filter @lasoviet/web typecheck
pnpm --filter @lasoviet/web build
git diff --check
```

The orchestrator will restart the isolated local production web runtime and
rerun the strict Playwright suite after this edit.

No commit, push, merge, deploy, production access, or external effect.
