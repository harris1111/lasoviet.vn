# WP-11 Unknown Birth Time Implementation Brief

## Role

Flash Executor implements this bounded task using
`ag/gemini-3.8-flash-high` with `high` reasoning.

## Objective

Complete acceptance criterion A-3 for an honestly unresolved Zi Wei birth
time. Save the birth profile for later completion, provide a useful next step,
and never calculate a chart or present a paid Zi Wei path until the user adds
an eligible exact-minute or two-hour branch time.

## Binding Sources

- `AGENTS.md`
- `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
  - Flow A, especially A-2 and A-3
- `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`
  - WP-11
- `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`
  - FD-055
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/progress.md`

## Owned Files

- `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- `apps/web/src/features/birth-profile/birth-profile-form.test.ts`
- `apps/web/src/features/reports/free-identity-preview.tsx`
- `apps/web/src/features/reports/free-identity-preview.test.tsx`
- `apps/web/messages/vi/profile.json`
- `apps/web/messages/en/profile.json`
- `apps/web/src/styles/birth-profile-wizard.css`

Do not modify files outside this allowlist. If a required change falls outside
the allowlist, stop and return `NEEDS_CONTEXT` with evidence.

## Required Behavior

1. Preserve the existing honest `{ precision: "unknown" }` profile payload.
   Never assign a default hour, minute, or branch.
2. The final-step primary action must say "Lưu hồ sơ" in Vietnamese and
   "Save profile" in English when time precision is unknown. Its pending label
   must describe saving rather than chart calculation.
3. Submit the birth profile exactly once. If the returned Zi Wei eligibility is
   false:
   - save the existing self-profile browser cache as today;
   - do not call `calculateZiweiChart`;
   - replace the wizard step body with a dedicated saved-profile state instead
     of rendering a form error;
   - clearly confirm that the profile was saved;
   - explain that a paid Zi Wei reading requires at least a known traditional
     two-hour branch;
   - give concise practical guidance to check a birth certificate, hospital
     record, or a close family member;
   - provide one action that returns to the birth step with all current input
     intact so the user can add the time;
   - provide one action that returns to the locale-correct homepage while
     retaining the saved cache for later.
4. The dedicated unresolved-time state must contain no paid Zi Wei CTA, price,
   checkout link, report selector link, or promise that a chart was created.
5. A failed profile save remains an error and must not render the saved state.
6. Eligible exact-minute and branch-only flows remain unchanged and navigate
   to the calculated chart.
7. Add an explicit `paidUpgradeEligible?: boolean` presentation boundary to
   `FreeIdentityPreview`, defaulting to the current eligible behavior. When
   false, omit the paid coverage/upgrade message entirely. Do not hide the
   useful free insights.
8. Keep Vietnamese and English copy concise, direct, and consistent with the
   existing approved UI artifact styling. Do not add methodology, confidence,
   limitation, or defensive report prose.

## Focused Tests

Add focused deterministic tests proving:

1. Unknown time keeps its honest payload and remains valid for profile saving.
2. Unknown time selects the save-profile labels.
3. The saved-profile presenter renders confirmation, all three practical
   guidance sources, and both locale-correct actions without paid-price,
   checkout, report-selector, or chart-created language.
4. The unknown-time post-save transition cannot request Zi Wei calculation.
   Extract a small pure decision helper if needed so this is tested without a
   browser integration harness.
5. `FreeIdentityPreview` retains free insights but omits paid coverage when
   `paidUpgradeEligible={false}`; default behavior remains unchanged.
6. Existing exact-minute and branch-only submit decisions remain eligible for
   calculation.

## Required Checks

Run only:

```bash
pnpm --filter @lasoviet/web test -- \
  src/features/birth-profile/birth-profile-form.test.ts \
  src/features/reports/free-identity-preview.test.tsx
pnpm --filter @lasoviet/web typecheck
pnpm --filter @lasoviet/web build
git diff --check
```

## Exclusions

- No backend, API, contract, database, commerce, payment, report-generation,
  route-registry, auth, analytics, or deployment changes.
- No paid product for unresolved birth time.
- No automatic time inference or synthetic fallback.
- No WP-10, WP-12, WP-13, or Telegram work.
- No commit, push, merge, deployment, production access, or external side
  effect.

## Return Format

Return:

1. status (`DONE`, `BLOCKED`, or `NEEDS_CONTEXT`);
2. files changed;
3. behavior implemented;
4. exact checks and results;
5. residual risks or blockers.
