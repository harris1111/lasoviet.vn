> Historical checkpoint preserved during the 2026-10-03 workspace reconciliation.
> Task, PR, deployment and operating instructions below describe the original date only.
> Follow current AGENTS.md, the decision tracker, Kaneo, and `plan/2026-10-03-workspace-reconciliation.md` for current status.

# FD-104 Wave 1 Review, Evidence, and Kaneo Follow-up Plan

## Objective

Close the review loop for Kaneo #67 and prepare the dependent work queue without merging or marking work Done on behalf of An. The run must produce evidence that is consistent with:

- Kaneo #67 acceptance criteria and its Task 0 read-only production investigation;
- PR #201 scope and stated verification evidence;
- repository policy requiring deployment and smoke evidence before a ticket becomes Done;
- the current Kaneo queue, including PRs #200, #202, and #203 that are already open.

The run is allowed to continue with independent checks when a production-only or permission-dependent step is blocked. Blockers must be recorded explicitly rather than guessed around.

## Operating Constraints

- Do not merge PRs, push branches, deploy, or mark any ticket Done.
- Do not access or expose customer report contents beyond the minimum needed for a read-only verification.
- Do not run destructive git/filesystem commands.
- Do not alter implementation code unless a concrete review-blocking defect is found and the owner explicitly asks for implementation; this run is primarily review, evidence, and ticket coordination.
- Use English for repository/ticket comments and this plan; communicate conclusions to the owner in Vietnamese.
- Never claim Task 0 or production smoke is complete without direct evidence.
- Preserve unrelated working-tree changes.

## Workstreams

### 1. Baseline and authority check

1. Confirm current repository branch, worktree status, and the exact active commit.
2. Read active repository policy and locate the relevant FD-104 plan/spec from the PR branches or GitHub when absent locally. Do not inspect archived directories.
3. Fetch current GitHub metadata for PRs #201, #200, #202, and #203:
   - state, mergeability, merge state, checks, reviews, changed files, base/head SHA;
   - PR body claims and unchecked manual/deployment items;
   - comments and review threads if available.
4. Fetch Kaneo workspace/project, columns, and all non-Done tasks, then inspect complete task/comment history for #67, #50, #55, and #56.
5. Record a timestamped baseline in the execution notes.

### 2. Independent review of PR #201 against #67

1. Compare the PR diff with the stated FD-104 Wave 1 scope:
   - narrative paragraph splitting and lead sentence behavior;
   - scroll-position read tracking and read-count cap;
   - practical-direction action cards;
   - collapsible palace cards, open-all behavior, and print expansion;
   - optional chart snapshot behavior and fail-soft handling;
   - chart chips, mini chart, decadal timeline, and no score/good-bad coloring;
   - compatibility with old sold reports and absent chart snapshots.
2. Inspect tests added/changed and identify material untested paths, especially:
   - malformed/missing stored chart data;
   - old report versions and null chart snapshots;
   - scroll tracking edge conditions and count bounds;
   - print behavior and mobile/desktop accessibility;
   - decadal derivation direction/ambiguous fallback.
3. Run the narrowest reproducible local checks available without network or production credentials. Prefer tests related to changed files, then i18n, lint, and typecheck if dependencies/build artifacts permit.
4. Compare local results with the PR's claimed results. Distinguish:
   - independently reproduced;
   - supported by GitHub CI;
   - not reproducible in this environment;
   - pre-existing/environment-dependent failures.
5. Produce review findings ordered by severity. If a must-fix defect is found, leave the PR open and record exact file/line and reproduction; do not silently patch it.

### 3. Task 0 production investigation for #67

Attempt the two read-only checks in the approved plan, in this order:

#### 3a. Stored narrative newline statistics

1. Determine whether an approved, read-only production/read-replica connection, private tool, or owner-provided command is available in the environment.
2. If available, execute only the aggregate query from the plan, with no row contents or personal data returned. Capture prompt-version counts and newline/blank-line counts.
3. If unavailable, do not fabricate results. Record the precise blocker: missing connection, secret, tunnel, role, or command.
4. If a blocker is encountered, continue all non-production workstreams.

#### 3b. Source of the "Đã đọc 23/10" display

1. Compare the deployed web image/commit SHA with the relevant master/PR code using approved deployment metadata or health endpoints, if available.
2. Inspect the current source history for all read-progress strings, read-count calculations, and possible stale/deployed variants.
3. If a clean browser/profile and a real report URL are available, verify the display on clean profile without extensions and record viewport/theme/device.
4. If browser access, authentication, report URL, or production access is unavailable, record that exact blocker and do not infer the result.
5. State the strongest supported conclusion: source explanation, deployed-version mismatch, or unresolved pending owner check.

### 4. Review adjacent open PRs and queue dependencies

Perform bounded, evidence-backed triage, not full implementation:

- #202 / Kaneo #50: inspect money-path invariants and test evidence; flag review risks around idempotent webhook/self-claim settlement, amount/currency/order identity, expiry, and top-up projection.
- #203 / Kaneo #55: verify the implementation and tests match the acceptance requirement for the first verified sign-in and exactly-once promotional grant; flag semantic gaps.
- #200 / Kaneo #56: confirm whether PR exists and CI is green; compare the PR body with ticket scope and identify whether Kaneo should move from To Do to In Review. Do not move it if the PR is not actually ready or manual evidence is materially missing.
- Check whether documentation PRs #198/#199 are still open and whether that affects the implementation review; do not merge them.

### 5. Kaneo updates

Only after evidence is gathered:

1. Add a concise English comment to #67 containing:
   - PR #201 review result;
   - independently reproduced checks and GitHub CI evidence;
   - Task 0 production results, or an explicit blocker list;
   - remaining owner actions before merge/deploy/Done.
2. Keep #67 in In Review unless all policy gates truly pass; it must not become Done before deployment and smoke evidence.
3. If #56 is demonstrably ready for review, move it to In Review and add PR #200 plus evidence/blockers. Otherwise leave it To Do and explain why in the execution report, without changing it.
4. Do not change #50/#55 status merely because their PRs are green; status changes require matching review/deploy evidence. Add comments only if a concrete, useful review update is available.
5. Do not create duplicate tasks or comments.

### 6. Final orchestration and verification

1. Re-fetch affected Kaneo tasks/comments after updates and verify the exact final state.
2. Re-fetch PR metadata so no status changed during the run unnoticed.
3. Run `git diff --check` and confirm no unintended repository modifications were made.
4. Produce a final owner report in Vietnamese with:
   - completed actions;
   - evidence and commands/checks;
   - unresolved blockers requiring An or production access;
   - recommended next action ordered by urgency;
   - explicit statement that no merge/deploy/Done transition was performed.

## Stop/Continue Rules

- Continue independent GitHub/Kaneo/source review after any production-access blocker.
- Stop only if an unexpected user change appears in files being touched, credentials or privacy boundaries are unclear, or a destructive/production-mutating action would be required.
- If a code defect is found, report it with severity and reproduction; do not expand scope into implementation without explicit authorization.

## Acceptance Criteria

- PR #201 has an independent review record with findings or an explicit no-finding result and residual risks.
- Task 0 has either direct aggregate/browser evidence or a precise, honest blocker record.
- Kaneo #67 remains correctly gated in In Review and contains the latest evidence.
- Any status change is justified by PR readiness and recorded evidence.
- PRs #200/#202/#203 receive bounded triage with no unsupported approval claims.
- No merge, deploy, destructive action, or false Done status occurs.
- Final report clearly separates verified facts from owner-pending checks.
