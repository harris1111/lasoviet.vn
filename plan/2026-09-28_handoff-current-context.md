> Historical checkpoint preserved during the 2026-10-03 workspace reconciliation.
> Task, PR, deployment and operating instructions below describe the original date only.
> Follow current AGENTS.md, the decision tracker, Kaneo, and `plan/2026-10-03-workspace-reconciliation.md` for current status.

# Current Context Handoff

## Operating Rules
- Communicate with the owner in Vietnamese; repository docs/code/comments/commits stay English.
- Do not inspect `docs/_archive/` or `prototype/_archive/`.
- Do not modify or merge tickets currently `In Review` unless the owner explicitly asks.
- Never mark a Kaneo ticket `Done` without deployment to the target environment and authenticated smoke evidence.
- Do not claim production verification without direct evidence.
- Keep stacked/dependent PR relationships explicit. Do not silently cherry-pick review branches.
- Use dedicated worktrees/feature branches and PRs to `master`; do not commit directly to `master`.
- User authorized unattended overnight implementation, but not automatic merge/deploy/production mutation.

## Verified Kaneo Status (checked 2026-09-28)
- #50: `In Review` — top-up / SePay money path. Production release exists, but authenticated payment sandbox smoke is still required.
- #51: `In Review` — wallet unlock/intent flow. Production release exists; residual-balance suggestion and auto-return/auto-unlock gaps remain.
- #52: `Done` in Kaneo — catalog/prices/rollover. This conflicts with the earlier implementation evidence that PR #207 had not been merged/deployed; verify GitHub merge SHA and deployment before treating catalog as live.
- #53: `In Review` — secure magnet preview. PR #208. No merge/deploy by this run.
- #54: `To Do` — single palace unlock; depends on #52 being genuinely merged/live.
- #55: `In Review` — welcome grant. No merge/deploy by this run.
- #56: `Done` — wizard birth-data handoff bug.
- #57: `In Review` — funnel analytics. PR #209. No merge/deploy by this run; some future flow hooks remain dependent on later tickets.
- #58: `In Review` — topic deep dives. Draft PR #211, branch `feat/fd105-1-9-topic-writers`, worktree `/home/debian/projects/lasoviet-fd105-package-19`.
- #59: `In Review` — feedback + La-back guarantee. PR #210, branch `feat/fd105-1-10-feedback-guarantee`, worktree `/home/debian/projects/lasoviet-fd105-package-110`.
- #60: `To Do` — email notifications. Draft PR #212 exists, branch `feat/fd105-1-11-notification-foundation`, worktree `/home/debian/projects/lasoviet-fd105-package-111`; it was returned to `To Do` because unsubscribe route/handler is missing and dispatch must not be enabled yet.
- #61: `To Do` — in-reader upsell; mobile-first UI requires founder notification before visual implementation. Depends on #52/#53/reader work.
- #62: `In Review` — personal daily reading. Draft PR #213, branch `feat/fd105-2-1-personal-daily-foundation`, worktree `/home/debian/projects/lasoviet-fd105-package-21`.
- #63: `To Do` — monthly/year reading; 20 real generations per topic required.
- #64: `To Do` — membership; mobile-first UI requires founder notification before visual implementation.
- #65: `To Do` — combo; depends on #52/#63.
- #66: `To Do` — two-chart compatibility; mobile-first UI requires founder notification before visual implementation.
- #68/#69/#70 are newer To Do work; #70 explicitly waits for founder's final confirmation before production coding. #68 has FD-106 beginner-first writing plan/PR #215 reference.

## Existing PRs / Work
- PR #210: #59 backend/API/data flow and DB migration. Tests pass, but it is not fully complete: no browser feedback/claim UI, and wallet restore plus claim persistence are not one atomic transaction. Review these before merge.
- PR #211: #58 contracts, deterministic quality gates, writer/rewrite loop, tests, and a sellability script. Commit `d12639d0` fixes a fail-open rewrite error. The script `scripts/verify-topic-deep-dive-real-generations.mjs` is still only a placeholder and does not execute live generations even when a key exists. Do not treat fixtures or script exit 0 as the required 20-generation evidence. Topic storage/API/worker/catalog activation are also incomplete.
- PR #212: #60 notification foundation, HMAC unsubscribe tokens/preferences, nurture service, blocked/deferred adapters. Commit `43bc86db` makes non-transactional mail require current `offers` consent and reads the latest consent. It still constructs an unsubscribe URL whose route/handler is absent; do not merge or enable nurture dispatch until route-registry entry, web handler, and tests exist. Hạn-month and delayed-unlock portions remain explicitly blocked/deferred.
- PR #213: #62 deterministic personal daily contract/writer, FD-089 gates, bridge metadata, and frozen-clock helper tests. It does not yet have entitlement DB persistence/API enforcement, personal reading endpoint/UI, or catalog activation. Treat day-8 expiry as unimplemented in the actual product until those layers exist.
- PR #208: #53 secure preview implementation; keep in review.
- PR #209: #57 analytics implementation; keep in review.
- Earlier release: PR #206 release SHA `03522cdf9ed65f714959034d83f4240eab15b2d6`; CI run `36316877126` passed verify/publish/promote-production. Public smoke `/health/ready`, `/vi`, `/en`, `/dang-nhap`, `/nap-la` returned 200. Authenticated payment/unlock smoke was not completed.

## Important Review Findings
- Do not call #59 complete until UI and atomicity/compensation failure behavior are addressed.
- #60 currently has a dangerous operational gap: worker foundation exists, but unsubscribe is 404 unless a route/handler is added. Missing marketing consent must block delivery.
- #58 live-generation acceptance is not satisfied. Implement a real runner only with authorized provider credentials and never fabricate evidence.
- #62 helper-only expiry is not enough. Add `valid_from`/`expires_at` persistence, enforce in entitlement query/API, and add endpoint/UI before claiming completion.
- #52 Kaneo status is `Done` but must be reconciled against actual GitHub merge/deployment evidence before enabling dependent catalog features.

## Plan / Local Artifacts
- Main plan: `plan/2026-09-27_fd105-todo-execution.md`.
- This handoff: `plan/2026-09-28_handoff-current-context.md`.
- Main worktree has pre-existing untracked plans; do not delete them.
- Dedicated worktrees are under `/home/debian/projects/lasoviet-fd105-package-*`.

## Suggested Next Actions
1. Reconcile #52 Kaneo `Done` against GitHub PR #207 merge/deployment evidence.
2. If continuing implementation without owner input, repair #60 unsubscribe route/handler and route-registry tests, but keep ticket state honest.
3. Improve #59 only after deciding whether to add UI and a transaction-safe orchestration boundary.
4. Do not start visual UI for #61/#64/#66 without notifying the founder as required by their ticket descriptions.
5. Avoid production merge/deploy and `Done` transitions until the owner reviews PRs and supplies/authenticates required smoke access.
