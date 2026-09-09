# WP-07 Purchase Selection And Ownership Flow Terra Review Brief

## Role

- Reviewer: Terra using `cx/gpt-5.6-terra` with `high` reasoning.
- Review independently. Do not edit files, commit, push, merge, deploy, access
  production, or trigger external effects.

## Scope

- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp07-purchase-flow-20260909`
- Base: `a8bcbbfec0cd8aa22da2e95d4e765087e6fce6c0`
- Tip: `0361a40`
- Review range:
  `a8bcbbfec0cd8aa22da2e95d4e765087e6fce6c0..0361a40`
- Implementation brief:
  `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp07-purchase-flow-brief.md`

## Binding Sources

- `AGENTS.md`
- FD-042 and FD-043 in
  `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`
- B-1, B-2, B-3, B-5, and B-9 in
  `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
- WP-07 in
  `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`
- Terra-approved WP-03 account library, WP-04 catalog, WP-05 offer promise,
  WP-06 recovery, and current active catalog/contract

## Review Questions

1. Does the browser receive only a public offer key and never a `ZIWEI-*` SKU
   or internal identity in visible markup, hidden inputs, URLs, callbacks, or
   error copy?
2. Is public-offer-to-SKU mapping server-only and fail-closed before auth/API
   work?
3. Does the selector render only safe active offers, at most two, preserve
   final VND price and WP-05 promise, and keep sample links?
4. Does verified ownership come only from server-derived owner-scoped data for
   the current chart and active offer?
5. Do readable, processing/terminal, owned-unknown, unavailable, anonymous,
   and unverified states each avoid an inappropriate purchase button?
6. Does `ENTITLEMENT_EXISTS` have a safe report-library exit without masking
   unrelated errors?
7. Does purchase intent survive localized sign-in/Google callback with safe
   chart and public offer values and no open redirect?
8. Does successful paid-with-report redirect directly to the report while
   pending/generating reuse stays on the same checkout order?
9. Is page render read-only and is B-9 order reuse proven against real
   PostgreSQL with immutable invoice/payment properties?
10. Are reserved 19,000 VND and other reserved products still unpurchasable?
11. Did the range preserve payment, auth, route, report, entitlement, and
   deployment boundaries?

## Required Checks

```bash
corepack pnpm@11.25.0 --filter @lasoviet/contracts run build
corepack pnpm@11.25.0 --filter @lasoviet/backend run build
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 exec vitest run \
  apps/web/src/features/commerce/checkout-offer.test.ts \
  apps/web/src/features/commerce/create-checkout-order.test.ts \
  apps/web/src/features/commerce/checkout-purchase-form.test.tsx \
  apps/web/src/features/reports/purchase-offer-presentation.test.ts \
  apps/web/src/features/reports/paid-topic-selector.test.tsx \
  apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.test.tsx \
  packages/backend/src/commerce/commerce.repository.integration.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web run build
git diff --check \
  a8bcbbfec0cd8aa22da2e95d4e765087e6fce6c0..0361a40
```

## Report Format

- Verdict: `APPROVED` or `CHANGES_REQUIRED`.
- Findings first, ordered Critical then Important.
- Each finding must cite concrete file/line evidence, impact, violated
  requirement, and bounded correction.
- List optional findings separately; optional items do not return to Flash in
  this milestone.
- Explicitly list rejected or out-of-scope observations.
- End with focused check evidence and residual risks.
