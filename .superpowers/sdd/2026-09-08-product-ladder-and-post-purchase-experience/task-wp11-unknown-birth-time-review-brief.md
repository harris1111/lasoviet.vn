# WP-11 Unknown Birth Time Review Brief

## Role

Terra independently reviews the completed WP-11 milestone using
`cx/gpt-5.6-terra` with `high` reasoning. Terra must not edit files.

## Review Range

Sol will provide the exact implementation commit range after Flash completes.

## Binding Sources

- `AGENTS.md`
- `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
  - Flow A, especially A-2 and A-3
- `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`
  - WP-11
- `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`
  - FD-055
- `task-wp11-unknown-birth-time-brief.md`

## Review Focus

Verify with live code and focused tests:

1. Unknown time remains `{ precision: "unknown" }`; no hour, minute, or branch
   is synthesized.
2. The profile is saved and cached for later completion.
3. No chart calculation occurs after an ineligible save.
4. The post-save state is useful, locale-correct, and provides practical time
   recovery guidance plus immediate-edit and return-later actions.
5. No paid Zi Wei CTA, price, checkout/report-selector link, or false
   chart-created claim appears for unresolved time.
6. Eligible exact-minute and branch-only behavior is unchanged.
7. The free preview eligibility boundary hides only paid-upgrade messaging,
   preserving useful free content.
8. Changes remain inside the approved file and product scope.
9. Tests cover the acceptance boundary without unnecessary broad edge cases.

## Finding Rules

Report only evidence-backed findings classified as:

- `Critical`
- `Important`
- `Optional`
- `Rejected`

Critical and Important findings must include file/line evidence, user or system
impact, and the smallest valid correction. Do not broaden scope or implement
the correction.

## Required Checks

Run or inspect the recorded results for:

```bash
pnpm --filter @lasoviet/web test -- \
  src/features/birth-profile/birth-profile-form.test.ts \
  src/features/reports/free-identity-preview.test.tsx
pnpm --filter @lasoviet/web typecheck
pnpm --filter @lasoviet/web build
git diff --check
```

## Return Format

1. verdict (`APPROVED` or `CHANGES_REQUIRED`);
2. findings ordered by severity;
3. checks reviewed or run;
4. residual risk;
5. scoped re-review recommendation if corrections are required.
