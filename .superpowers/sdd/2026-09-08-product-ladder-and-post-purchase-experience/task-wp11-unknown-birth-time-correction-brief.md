# WP-11 Unknown Birth Time Correction Brief

## Role

Flash Executor applies one bounded correction using
`ag/gemini-3.8-flash-high` with `high` reasoning.

## Confirmed Finding

Terra classified one Important finding in commit `d6b3e0e`:

- `saveBirthCache` runs only for `forWhom=self` and may return `false`, but the
  unresolved-time presenter always claims browser persistence and always offers
  a return-later action. For `forWhom=other` or a failed cache write, leaving
  the page loses the reusable browser input and the UI claim is false.

No other Critical or Important finding was confirmed.

## Owned Files

- `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- `apps/web/src/features/birth-profile/birth-profile-form.test.ts`
- `apps/web/messages/vi/profile.json`
- `apps/web/messages/en/profile.json`

Do not modify files outside this allowlist.

## Required Correction

1. Capture the boolean returned by `saveBirthCache`.
2. Treat reusable return-later persistence as confirmed only when:
   - `forWhom === "self"`; and
   - `saveBirthCache(...) === true`.
3. Pass an explicit persistence state into the unknown-time saved presenter.
4. When reusable browser persistence is confirmed:
   - retain the truthful browser-saved confirmation;
   - retain the locale-correct return-home/return-later action.
5. For `forWhom=other` or a failed cache write:
   - use truthful session-only copy that does not claim browser persistence or
     future prefill;
   - do not render a return-later/home action that implies the data will be
     reusable after leaving;
   - retain the immediate "add birth time" action and all practical guidance;
   - do not turn the successful server profile save into a generic save error.
6. Preserve all prior WP-11 boundaries:
   - unknown time remains honest;
   - no chart calculation;
   - no paid CTA;
   - eligible exact-minute and branch-only flows remain unchanged.

## Focused Tests

Add or update tests proving:

1. self + successful cache write selects browser-persisted presenter state and
   renders the return-later action;
2. other-person input selects session-only state and omits browser-persistence
   claims and return-later action;
3. self + failed cache write also selects session-only state and omits those
   claims/action;
4. both states retain the add-time action, guidance, no paid CTA, and no chart
   calculation outcome.

## Required Checks

```bash
pnpm --filter @lasoviet/web test -- \
  src/features/birth-profile/birth-profile-form.test.ts
pnpm --filter @lasoviet/web typecheck
git diff --check
```

## Exclusions

- Do not change `saveBirthCache`, storage duration, backend persistence,
  consent policy, or the other-person cache policy.
- Do not modify the free preview correction already accepted by Terra.
- No refactor outside the confirmed finding.
- No commit, push, merge, deploy, production access, or external side effect.

## Return Format

Return:

1. status;
2. files changed;
3. correction behavior;
4. exact checks and results;
5. residual blockers.
