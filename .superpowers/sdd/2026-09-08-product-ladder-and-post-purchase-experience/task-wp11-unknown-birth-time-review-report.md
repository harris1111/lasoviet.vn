# WP-11 Unknown Birth Time Review Report

## Review Scope

- Commit range: `bb36e82..d6b3e0e`
- Reviewer: Terra high
- Verdict: `CHANGES_REQUIRED`

## Confirmed Finding

### Important: Browser persistence claim is false outside successful self-cache

`saveBirthCache` is called only for `forWhom=self` and its boolean result is
ignored. The unresolved-time presenter nevertheless always says the data was
saved in the browser and always offers a return-later action.

For `forWhom=other`, or when browser storage rejects the write, leaving the
wizard does not preserve reusable input. The current copy therefore makes a
false persistence claim and the return-later action cannot fulfill its promise.

Smallest correction:

- track whether the self-profile browser cache write actually succeeded;
- show browser-persisted copy and the return-later action only in that state;
- otherwise show truthful session-only copy, keep the immediate add-time
  action, and omit any future-prefill promise.

## Other Review Results

- Unknown time remains `{ precision: "unknown" }`.
- Ineligible save does not call chart calculation.
- The saved presenter contains no paid CTA, price, checkout path, report
  selector path, or false chart-created claim.
- Exact-minute and branch-only calculation behavior remains intact.
- `FreeIdentityPreview` preserves free insights and hides paid coverage when
  `paidUpgradeEligible={false}`.
- Scope matched the approved allowlist.

## Checks

- Focused WP-11 Vitest: passed.
- Web typecheck: passed.
- Web production build: passed.
- `git diff --check`: passed.

## Required Follow-Up

Apply the bounded correction in
`task-wp11-unknown-birth-time-correction-brief.md`, then run a scoped Terra
re-review.
