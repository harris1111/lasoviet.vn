# Workspace Reconciliation — 2026-10-03

## Bounded brief

Reconcile the existing local changes, open PRs, worktrees and Kaneo metadata against master `7c1b612047d7307ad8283f0937e4a1b125d74957`. Preserve recovery copies and historical handoffs, verify the superseding CTA implementation, close demonstrably obsolete PRs, and repair stale task metadata. No product activation, provider spend, payment, policy change, deployment, or Done transition is included.

## Recovery and preservation

Before mutations, eight dirty worktrees were captured in a private recovery directory outside Git: `/home/debian/projects/lasoviet-workspace-recovery-20261003T150849Z`. The manifest records each original branch/HEAD and SHA-256 for all 24 captured files; binary patches and complete file copies are retained. Nine existing stashes and unmerged local branch references remain preserved.

Three previously untracked September handoffs are preserved in this PR with historical-status notices. The five historical files from PR #233 are also retained with their original capture dates; they are evidence snapshots, not current acceptance claims.

The seven modified main-worktree files are superseded by master: the result-page hero CTA and bilingual label are present; the offer-card unlock controls now reside in `paid-topic-selector-client.tsx`; its server/client boundary, interactive selection, per-card actions and sticky paybar replace the old server-only patch. Existing tests retain the card CTA assertions. The old patch is preserved for exact recovery rather than reapplied over the newer implementation.

Seven other dirty worktrees contain old AGENTS/FD-084 policy backports. They differ from today's policy and must not be transplanted into master. Preserve their recovery copies and branch history; the current owner-authority and executor policy is binding.

## PR dispositions

| PR | Disposition and evidence |
|---|---|
| #51 | Obsolete policy proposal; conflicting legacy executor/workflow text must not replace current AGENTS.md and FD-097. Close with source retained. |
| #52 | September report-quality queue; all referenced LSV-29/15/16/17 tasks are already Done. Close as historical planning, without making new acceptance claims. |
| #53 | September trust/UI queue; all referenced LSV-9/14/23–28 tasks are already Done. Close as historical planning. |
| #54 | September core-UI queue; LSV-19/8/20/21/22 are Done; current FD-098/109 and October UX plans supersede the old prerequisites. Close as historical planning. |
| #152 | Close as incorporated: the complete head 1044ca64 is an ancestor of master, with zero candidate-only commits. Sixteen non-archived candidate paths were compared by blob identity; five match and eleven reflect later master evolution. No archived contents were read. |
| #177 | September top-up/membership/tools brief is superseded by live top-up/tools and current LSV-64/75–80 acceptance plans. Close as historical brief; membership sale remains held. |
| #197 | Keep: unique owner-decision proposal is not incorporated in the master tracker. Do not discard or silently apply it during cleanup. |
| #220 | Close as already incorporated: all 42 candidate content files are byte-identical to master. |
| #231 | Keep: all three design-only compatibility files are absent from master. Earlier Kaneo notes saying the draft was included in integration do not establish delivery. No BaZi runtime or sale activation is claimed. |
| #233 | Supersede with this reconciliation PR, preserving its five original historical files. |
| #234 | Membership implementation is already in integration #237/#240. Membership service, integration tests, expiry service, panel and packs are byte-identical to master. Close the overlapping implementation candidate; LSV-64 remains In Review and sale remains reserved. |

Closing an obsolete PR does not close its Kaneo product task, authorize a purchase, or satisfy outstanding release gates. Unmerged branch references remain retained.

## Kaneo reconciliation

Baseline: 79 tasks — 8 To Do, 0 In Progress, 19 In Review, 52 Done.

- LSV-71 stays To Do: #263–267/#269 delivered OFF-only code and partial smoke. Engagement/deletion races, reviewed token/cost proof, real output quality, remaining private/member/browser smoke and controlled enablement gates remain open.
- LSV-72 stays To Do: #258 delivered A04–A16 implementation and Phase B scaffolding. Replace the stale implementation-only checklist with an evidence reconciliation checkpoint; independent review and deployed A17 browser/theme/focus/history/performance acceptance remain open. Existing audit details remain available in the original description/history.
- LSV-73 stays In Review: #261/#262 deployed callback corrections; the 23-check Chromium smoke intercepted the social exchange. Real mobile Safari/FB/Messenger Google OAuth validation remains open.
- LSV-74 stays In Review: #271 merged into #270, which merged to master. Remove stale pending-approval wording; backend-enabled golden-path and remaining viewport smoke still need evidence.
- LSV-64 stays In Review: implemented membership primitives do not lift the owner's sale hold or replace promised benefit/quality/tool contracts.
- LSV-66 stays In Review: #231 remains an undelivered design candidate; source-system, participant consent/revocation and paid-runtime gates remain open.

Master CI run 37117325459 reports verify/publish/promote-production success. This run does not independently establish the current host revision or authenticated deployment smoke.

## Verification and final state

- `pnpm install --frozen-lockfile`: passed without lockfile changes.
- `pnpm i18n:check && pnpm lint && pnpm typecheck`: passed; lint has zero errors and four existing warnings. Producer packages were rebuilt before dependent typechecks.
- Focused Vitest: result-route, paid-topic-selector and wallet-unlock-dialog tests — 3 files / 41 tests passed.
- Deployed public Playwright: 19/19 passed against `https://lasoviet.net` at 390x844 and 1440x900, covering 11 homepage draft/review cases and 8 top-up selection/tab/paybar cases. The final consent/chart-creation case was excluded; no payment was submitted. This public smoke does not identify the host image SHA or satisfy backend, real OAuth, tablet/theme/performance gates.
- `git diff --check`: passed.

Main worktree is clean on local master, fast-forwarded to `7c1b6120`; no commit or push was made on master. Eight dirty worktrees were cleaned only after verifying every recovery file hash and confirming their HEAD/files had not changed. The three untracked originals were moved into the recovery directory, with marked historical copies included here.

Nine retired worktrees were removed without force: four September task-plan worktrees, legacy parallel-agent/backup-hotfix worktrees, the duplicate membership worktree and the two merged free-gift worktrees. Their nonmerged branch references remain retained. Five fully merged free-gift branches were deleted with `git branch -d`; every commit remains in master. The PR233 historical worktree is retired once this replacement PR exists.

Kaneo LSV-72/74 metadata was corrected; LSV-66 received the undelivered-draft correction and LSV-74 received the fresh 19-case deployed public smoke. Statuses and release/activation gates were preserved. All remaining worktrees are clean after this documentation commit.

The remaining product/review work is LSV-71 enablement/acceptance, LSV-72 A17, LSV-73 real mobile OAuth, LSV-74 backend/viewport evidence, the retained unique PR197 decision proposal and PR231 design candidate, and the LSV-75–80 UX queue. Workspace cleanup does not imply those tasks are Done.
