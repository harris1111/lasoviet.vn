---
phase: 9
title: "End-to-end QA and staged rollout"
status: pending
priority: P1
effort: "2d (spread across phases)"
dependencies: []
---

# Phase 9: End-to-end QA and staged rollout

## Overview
One automated "golden path" per device that walks the whole funnel, plus a release order that never leaves production with a half-connected flow. Runs after every phase PR, not only at the end.

## Requirements
- Golden paths (Playwright, `tests/e2e/`), each at 390×844 and 1440×900:
  1. Guest: homepage form → chart → read overview → open locked palace → sheet asks to sign in → sign in → back on the same preview.
  2. Signed-in, enough Lá (seeded): palace preview → confirm → palace readable.
  3. Signed-in, short balance: cliffhanger → sheet → pack → (staging auto-approve) paid → auto-unlock → scrolled to item.
  4. Bản mệnh → reader → upgrade to Trọn đời for the quoted difference.
  5. Offer page: every tab, every card, every pack clickable after soft navigation (regression for phase 1).
  6. Error: forced `WALLET_EVIDENCE_MISSING` → readable message + retry.
- Manual pass by the founder on a real phone after each phase (one look, not a review round).
- Gates per PR: `pnpm i18n:check && pnpm lint && pnpm typecheck && pnpm test`, `node scripts/public-claim-check.mjs`, `node scripts/check-public-content.mjs`, golden paths green.

## Rollout order
1. Phase 1 (hotfix) → production as soon as green.
2. Phase 2 → production; collect 7-day baseline.
3. Phases 3, 4, 5 → each behind a flag if they change the visible flow; switch on one at a time with ≥3 days between, compare funnel step conversion vs baseline.
4. Phase 6 → staging with sandbox payments first, then production.
5. Phases 7, 8.
- Kaneo: one task per phase in `La so viet`; mark Done only with deployment + smoke evidence (or when only An's merge/deploy remains, per the Kaneo rule).

## Related Code Files
- Create: `tests/e2e/funnel-golden-path.spec.ts`, helpers for seeded balance/charts in `tests/e2e/helpers/`
- Modify: CI config to run the golden paths

## Success Criteria
- [ ] Six golden paths green on both viewports in CI.
- [ ] Each phase shipped with its before/after funnel numbers recorded in the runbook.

## Risk Assessment
- Payment e2e depends on staging auto-approve (`COMMERCE_AUTO_APPROVE_TOPUPS`); production smoke uses a real 29,000đ pack bought by the founder once after phase 6.
