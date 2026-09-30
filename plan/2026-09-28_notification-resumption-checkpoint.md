# Notification Resumption Checkpoint

Date: 2026-09-28
Scope: Kaneo #60 / draft PR #212; read-only reconciliation before implementation.
Status: READY_FOR_REVIEW for the bounded repair; NO_GO for release or activation.

## Verified remote state

- Kaneo #60 (`c4ga0u2pfai9dtritzs0n9p0`) remains `to-do`.
- PR #212 remains open and draft; its verify job failed at `Run pnpm test`.
- The dedicated worktree started clean at `43bc86db`.
- Tickets in `In Review` are outside the authorized modification scope.
- The main worktree is a divergent local `master` with pre-existing untracked
  plans; it was not reset, switched, or edited.

## Catalog dependency reconciliation

- PR #207 merged on 2026-09-27 at 22:13:12 UTC with merge commit
  `39f0b31952dd44fcd9b763a34b0874105bb44464`.
- Its own master run `36354513574` was cancelled.
- A subsequent master run, `36397027461`, succeeded at verify, publish, and
  promote-production for `5bed9d95a3699771f1619b80d0f516a309c4dbea`.
- GitHub compare reports the latter commit 36 commits ahead of the #207 merge
  commit, with zero commits behind.
- The workflow and promote job log show that promote-production advances the
  GHCR production release marker. This is not evidence of runtime deployment.
- Kaneo #52 is `done`, but its recorded comments end with pre-merge verification
  and an explicit requirement for deployment and catalog/rollover smoke.
- Runtime SHA and authenticated catalog/rollover smoke remain unverified.
  No Kaneo status was changed.

## PR #212 CI evidence

Commands:

```sh
gh run view 36343326870 --repo harris1111/lasoviet.vn --json jobs
gh api repos/harris1111/lasoviet.vn/actions/jobs/108687534528/logs
```

The job log reports failures in `packages/database/src/schema/schema.integration.test.ts`,
including missing `commerce_orders.kind`, missing `wallet_purchase_intents.locale`,
missing `ai_usage_outcomes.invalid_output_reason`, and journal-tail assertions.

The missing-column symptom does not establish a missing production migration:
`0034_wallet_commerce_foundation.sql` already adds `commerce_orders.kind`.
The schema rewind tests delete fixed journal timestamps only through migration
0043, leaving the new notification migration 0044 at the journal tail. Earlier
dropped schema is then not reapplied by the timestamp-based migrator. The
hard-coded journal suffix also excludes the new migration.

Additionally, this branch's notification migration 0044 collides with mainline
0044 (Gemini pricing); mainline also has 0045 (catalog rollover).

Do not add a duplicate `kind` migration. Reconcile migration numbering and
rewind/journal test expectations against the merged baseline, then reproduce
with focused tests before claiming the CI issue fixed.

## Proposed bounded repair

1. Obtain Terra's preimplementation gate for unsubscribe routing and storage.
2. Preserve the existing dedicated branch and explicit dependency lineage;
   do not cherry-pick any `In Review` branch.
3. Register and implement the generated unsubscribe destination with token
   validation, privacy-safe responses, and route/noindex/sitemap coverage.
4. Resolve the notification migration collision and associated rewind tests,
   without duplicating existing schema migrations.
5. Keep dispatch disabled and delayed-unlock/month reminders deferred.
6. Run focused checks; obtain Terra diff review before expensive validation.

No merge, deployment, provider calls, email dispatch, production mutation, or
`Done` transition is authorized by this checkpoint. Draft-to-ready and
completion claims require actual verification evidence, not this plan.

## Terra preimplementation gate

Terra returned PASS with mandatory conditions:

- Rebase onto the current merged master before assigning the notification
  migration's next number; repair rewind/tail tests, not an existing column.
- Block both new nurture enqueue and retry delivery for all three new kinds.
  Existing maintenance wiring already registers nurture; merely avoiding new
  wiring is insufficient to keep dispatch disabled.
- Register a locale-aware public noindex confirmation page. GET must never
  mutate preferences. Carry the token in a URL fragment, not a query string,
  because its readable claims include personal data.
- Require explicit confirmation and a bounded, same-origin JSON POST.
  Use no-store and no-referrer; never echo token claims.
- Reuse the preference store and worker secret, fail closed on missing
  configuration, reject future-issued tokens beyond bounded clock skew, and
  preserve expiry and idempotent replay behavior.
- Add VI/EN parity and focused routing, security, preference, and dispatch tests.

No owner decision is missing for this bounded repair. Secret rotation remains
an operational caveat: outstanding links use the current shared secret.
Implementation is delegated to Flash; Terra must review the resulting diff
before expensive validation.

## First implementation review

The feature branch was rebased onto `5bed9d95a3699771f1619b80d0f516a309c4dbea`,
producing HEAD `c608a6d45e4dd3ebdfebf68fa1f409549f3900cb`. Notification
migration 0046 preserves mainline migrations 0044 and 0045.

Independent orchestrator verification:

```sh
pnpm i18n:check
pnpm exec vitest run \
  packages/config/src/route-registry.test.ts \
  packages/contracts/src/auth-email.test.ts \
  packages/backend/src/notifications/notification-preference.test.ts \
  packages/backend/src/notifications/auth-email.test.ts \
  packages/backend/src/maintenance/phase-one-maintenance.test.ts \
  apps/web/src/seo/sitemap-registry.test.ts \
  apps/web/src/features/notifications/unsubscribe-form.test.tsx \
  apps/web/src/app/api/notifications/unsubscribe/route.test.ts
git diff --check
```

Results: i18n parity passed; 8 files / 47 tests passed; diff check passed.
Focused ESLint on the unsubscribe page, handler, form, tests, token store, and
delivery service also exited 0.

Terra nevertheless returned NO_GO:

1. Enforce actual streamed body bytes, not only Content-Length.
2. Reject absent Origin and wrong content type; normalize storage exceptions.
3. Reuse a validated lazy server-side store/pool, not one pool per request.
4. Fix StrictMode fragment handling and replace tests that only reproduce code
   without rendering the component.
5. Correct copy to optional/non-transactional emails, not all emails.
6. Derive migration-tail metadata and rewind ranges instead of fixed lists.
7. Narrow the web/backend runtime import and remove unrelated lockfile churn.

The 47-test result is not acceptance evidence for actual client behavior.
Flash reported a full typecheck before diff approval; that command also builds
producer packages and was premature under the bounded execution instructions.
It does not authorize any later gate. No Docker integration, full CI, push,
deployment, or ticket transition has been performed.

Flash is assigned only the seven review corrections. Expensive validation
remains blocked pending Terra re-review.

## Final bounded verification

The review corrections were subsequently implemented. Terra approved the
focused PostgreSQL gate, then the producer/web build and isolated browser gate.
Additional review caught an EN locale handoff error, ambiguous browser alert
selectors, and a database-root import causing a migrator build warning. Each
was corrected and reviewed before the affected gate was repeated.

Commands and actual results:

```sh
pnpm exec vitest run \
  packages/database/src/schema/schema.integration.test.ts \
  packages/backend/src/notifications/nurture-signin.integration.test.ts
# 2 files passed; 28 tests passed; 15.68 seconds.

pnpm --filter @lasoviet/database run build &&
pnpm --filter @lasoviet/backend run build &&
pnpm --filter @lasoviet/web run typecheck &&
pnpm --filter @lasoviet/web run build
# All exited 0. Final web build had no migrator/drizzle warning.

# Local-only server; no production connections or email dispatch.
pnpm --filter @lasoviet/web exec next start --hostname 127.0.0.1 --port 49260
PLAYWRIGHT_BASE_URL=http://127.0.0.1:49260 \
  pnpm exec playwright test tests/e2e/notification-unsubscribe.spec.ts --workers=1
# Final fresh-build run: 6 passed; 3.3 seconds.

pnpm i18n:check
# i18n parity passed.
```

The eight-file unit command recorded above was repeated against the final
source: **50 tests passed, 8 files passed, 1.69 seconds**. The lower count than
the intermediate 53-test run reflects removal of misleading copied-logic
tests and replacement with actual browser coverage. Final `git diff --check`
passed. Focused ESLint passed throughout the corrections.

The first browser run failed three selector assertions because Next's route
announcer also has `role=alert`; the corrected test scopes assertions to the
unsubscribe panel and all six cases pass. The earlier build warning was
removed by importing the database runtime subpath in the handler/preference
store and exporting `consents` through that existing runtime surface.

Limitations:

- Browser tests intercept the unsubscribe POST response. They validate actual
  UI behavior, not a complete browser-to-live-database unsubscribe transaction.
  Handler tests and real PostgreSQL preference tests cover those layers
  separately.
- This local server used `next start`, which emits the existing standalone
  launch advisory. Production standalone-container validation was not run.
  Playwright also emitted only the terminal NO_COLOR/FORCE_COLOR advisory.
- Full CI, full monorepo lint/typecheck after the final patch, standalone image
  build, authenticated production smoke, and provider delivery were not run.
- Nurture, monthly reminder, and delayed-unlock dispatch remain disabled.
- The original shared-secret rotation caveat remains.
- Local servers started for this work were stopped. Generated-only changes
  to `next-env.d.ts` were restored; pre-existing main-worktree plans remain.
- Corrections remain uncommitted/unpushed in the dedicated worktree. The
  rebased branch must not be pushed without checking remote lineage and
  coordinating replacement of its previous history. PR #212 remains unchanged.
- No merge, deployment, Kaneo status change, or `Done` transition was performed.

## Final Terra evidence gate

Terra accepted the focused evidence and returned **READY_FOR_REVIEW** for this
bounded repair, while retaining **NO_GO** for release and notification
activation. No remote mutation was approved. Before activation, resolve and
document shared-secret rotation behavior, verify a live default-store/database
unsubscribe round trip, and record authorized deployment and authenticated
runtime smoke. Deferred notification flows remain out of scope.

## 2026-09-30 release resumption

This appendix supersedes the historical uncommitted/unpushed and release
authorization statements above; the earlier evidence and limitations remain
historical records.

- The owner authorized choosing the simplest effective options and prioritizing
  merge/deployment after the safety gates. This is not authorization to skip
  failed checks, activate deferred dispatch, or mark the original ticket Done.
- Secret policy A is selected: only the current `INTERNAL_ACTOR_SECRET` verifies
  unsubscribe tokens. Future secret rotation invalidates existing links. No
  secret rotation or previous-key support is part of this release.
- The branch was rebased onto master `223aa5d0b45e3ca00da52729640922ae0e3d3992`.
  The i18n conflict was corrected to preserve both `brand-about` and
  `notifications` namespaces and the EN profile import.
- Implementation commit `46547b024422c641835ce7a1a9ee4dfb0c2172e9` was
  force-pushed. PR #212 is no longer a draft. Its initial CI failure
  was the previous blanket web/backend boundary invariant.
- Boundary correction `924a909e9feefcdb2c2d690eec7ffb843a9fa717` was pushed
  before Terra's diff review: this was a checkpoint-sequencing deviation, not
  an approved shortcut. At appendix creation, the correction awaited review
  before further CI; Terra subsequently returned PASS for the scanner.
- CI run `36682282444` passed. Sibling `36682286415` failed on 5-second
  Compose/provenance test timeouts, with a PostgreSQL socket error after the
  timeout. No obsolete-SHA rerun was performed and no timeout was relaxed.
- The pending boundary scanner uses the existing TypeScript AST parser and
  covers production TS/JS module variants, side-effect/static/dynamic imports,
  exports and literal require forms. The exemption remains exactly one
  server route and one backend subpath. Focused ESLint exited 0 and all
  36 workspace-boundary tests passed. The full pre-push command
  `pnpm i18n:check && pnpm lint && pnpm typecheck` subsequently exited 0
  (four existing lint warnings, no errors); fresh CI is still pending.
- Production currently runs immutable release
  `223aa5d0b45e3ca00da52729640922ae0e3d3992`. Deployment must use the reviewed
  release script, immutable images and unchanged production Compose manifests,
  preserving the dirty production checkout. No host Nginx or secret edits.
- Real signed-token production insert/read/delete smoke requires separately
  confirmed synthetic-write scope. Public readiness or mocked browser tests
  are not evidence of a live default-store unsubscribe round trip.
- For this disabled-foundation release, merge and deployment are permitted
  after the listed CI and deployment gates. A live signed-token/default-store
  unsubscribe round trip remains required before notification-dispatch
  activation or Kaneo #60 Done; it is not a merge/deployment gate for this
  release. Terra confirmed this boundary and authorized the corrected
  scanner/appendix commit followed by fresh CI.
- Nurture, monthly-reminder and delayed-unlock dispatch remain disabled.
  Kaneo #60 is still `to-do`; the original delivery scope is incomplete.
  No merge, deployment, or Done transition has occurred at this checkpoint.
