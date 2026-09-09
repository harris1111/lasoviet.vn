# WP-06 Report And Payment Recovery UI Terra Review Brief

## Role

- Reviewer: Terra using `cx/gpt-5.6-terra` with `high` reasoning.
- Review independently. Do not edit files, commit, push, merge, deploy, access
  production, or trigger external effects.

## Scope

- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp06-report-recovery-ui-20260909`
- Base: `1baf26c8b082db8542567034cf30721ea4bf36ff`
- Tip: `f90345a`
- Review range:
  `1baf26c8b082db8542567034cf30721ea4bf36ff..f90345a`
- Implementation brief:
  `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp06-report-recovery-ui-brief.md`

## Binding Sources

- `AGENTS.md`
- `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`
- `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
- `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`
- Existing Terra-approved WP-06 server commits `b7613f5` and `3809a7d`
- Existing Terra-approved WP-02B payment recovery UI commit `6c370b7`

## Review Questions

1. Does every checkout state `pending`, `paid`, `expired`, `failed`, and
   `refunded` render exactly one truthful customer-facing screen with a valid
   exit?
2. Are `paid` and report generation visibly and semantically distinct?
3. Does pending retain one immutable QR/order while warning the customer never
   to transfer twice and exposing self-claim only in the correct state?
4. Do terminal checkout states hide stale QR instructions, self-claim, and
   inappropriate repurchase actions?
5. Does report `terminal_failure` render every required BE-5 field and build a
   bounded support path without internal IDs?
6. Are timestamps locale-correct in `Asia/Ho_Chi_Minh`?
7. Are polling and navigation bounded, without a client-side report unlock,
   fake percentage, fake completion time, duplicate navigation, or order
   creation?
8. Are locale paths, accessibility roles/live regions, and 375px responsive
   behavior correct?
9. Did the implementation stay within the owned files and preserve server,
   payment, notification, route-registry, and production boundaries?
10. Do focused tests cover the accepted states without overfitting to
    implementation strings?

## Required Checks

Run or inspect evidence for:

```bash
corepack pnpm@11.25.0 --filter @lasoviet/contracts run build
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 exec vitest run \
  apps/web/src/features/reports/report-progress.test.tsx \
  apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx \
  apps/web/src/features/commerce/vietqr-checkout.test.tsx \
  apps/web/src/features/commerce/payment-self-claim-form.test.tsx \
  apps/web/src/app/[locale]/thanh-toan/[orderId]/page.test.tsx
corepack pnpm@11.25.0 --filter @lasoviet/web run build
git diff --check \
  1baf26c8b082db8542567034cf30721ea4bf36ff..f90345a
```

## Report Format

- Verdict: `APPROVED` or `CHANGES_REQUIRED`.
- Findings first, ordered Critical then Important.
- Each finding must cite concrete file/line evidence, impact, violated
  requirement, and bounded correction.
- List optional findings separately; they do not return to Flash in this
  milestone.
- Explicitly list rejected or out-of-scope observations.
- End with focused check evidence and residual risks.
