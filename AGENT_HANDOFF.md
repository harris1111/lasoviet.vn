# La So Viet Engineering Handoff

**Updated:** 2026-09-06
**Repository:** `harris1111/lasoviet.vn`
**Worktree:** `G:\Dev\Repos-Windows\tuvi-a-lam\lasoviet-admin-operations-plan\.worktrees\phase04-report-generation`
**Active branch:** `feature/phase04-report-generation`
**Audited implementation HEAD:** `3b7f8d7`

## Start Here

Read these sources before planning or editing:

1. `AGENTS.md`
2. `README.md`
3. `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/plan.md`
4. `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`
5. The phase file and task contract for the task being executed
6. `docs/reports/2026-09-04-project-status-and-next-steps.md`

Use Superpowers only. Do not invoke `/ck` or the CK CLI.

## Git State

A fresh `origin` fetch on 2026-09-05 established:

- Audited implementation commit: `3b7f8d7899bdd951ac96865851fe92370d809e20`.
- `origin/master` is `be0d2601dc5d3caa5197d19d9029358d256fa1c7`.
- Merged current `origin/master` (`9280954`) via merge commit `d6f5005`.
- The active branch is 72 commits ahead and 0 commits behind `origin/master`.
- No remote `feature/phase04-report-generation` branch exists.
- The documentation commit created after this audit makes the next task's
  actual HEAD newer than the implementation baseline above.
- Never push directly to `master`.
- Do not merge, create a PR, or deploy without an explicit founder request.

## Active Agent Roles

- **Sol high:** orchestrates, controls scope, adjudicates findings, and
  communicates with the founder in Vietnamese.
- **Flash Executor high:** bounded coder using `ag/gemini-3.8-flash-high`. It
  accepts exact Sol briefs, modifies assigned files, performs focused checks,
  and stops instead of planning, broadening scope, or debugging deeply.
- **Terra high:** independently reviews complete features, phases, and
  meaningful milestones, then re-reviews bounded corrections.
- **Luna:** paused until explicitly reactivated by the founder.

Repository documents and commit messages are English. Founder communication is
Vietnamese.

## Verified Product State

### Completed or Functionally Delivered

- **Phase 00:** repository, monorepo, contracts, i18n, CI, health, route,
  analytics, content, and design foundations are complete.
- **Phase 01:** PostgreSQL identity/privacy, Better Auth, SMTP verification and
  recovery, consent, deletion policies, and canonical birth profiles are
  implemented. The phase file still has stale unchecked P01-T02 bookkeeping.
- **Phase 02:** Zi Wei normalized calculation, iztro adapter, fixtures,
  immutable runs, capability registry, and deterministic evidence are complete.
- **Phase 03:** the artifact-driven free MVP is implemented and deployed. The
  phase file still contains pre-merge unchecked UI steps and must not be read as
  proof that the free MVP is absent.
- **Phase 04 implementation:** SePay Tasks 1-2, the durable report worker,
  approved knowledge retrieval, evidence-backed immutable generation, and the
  owner-authorized private HTML reader are implemented and reviewed on
  `feature/phase04-report-generation`. In-page VietQR Tasks 1-5 are complete.
- **Phase 06 foundation:** Docker images, Compose topology, loopback-only web
  publication, and production-like free-MVP smoke evidence exist. This does not
  close the full release phase.

### In Progress

- **In-page VietQR Task 6:** implementation and fixes complete through `3b7f8d7` (including final fix wave `3a884de` and content scope fix `3b7f8d7`). Non-Docker checks (`i18n:check`, `lint`, diff check) passed; full Vitest (110 passed files / 645 passed tests) and local Compose validation are BLOCKED by unavailable Docker daemon.
- **Phase 04 closure:** production AI remains fail-closed pending provider
  privacy approval. Seven private-report Playwright cases require controlled
  owner/other/pending/ready/failed fixtures, and two lineage integration cases
  require a running Docker daemon.
- **Phase 05A:** T01 admin access/RBAC/audit, T02 redacted operations overview,
  and T05 role administration/audit inspection are complete. T03, T04, and T06
  remain open.

### Remaining

- **P04 external gates:** provider privacy approval, controlled private-report
  browser acceptance, and separately authorized deployment/activation.
- **Phase 05:** PDF, Garage, optional replication, report email delivery, and
  owner account center.
- **P05A-T03/T04/T06:** redacted detailed inspections, compensating commands,
  and production-like incident evidence.
- **Phase 06:** security, purge execution, metrics, backup/restore drills, paid
  E2E, twenty-report QA, legal/accounting gates, and indexing activation.
- **Phases 07-11:** later product waves.

## Immediate Next Execution

The immediate execution task is **In-page VietQR Task 6 closure / Docker re-run**: re-run full Vitest suite and local synthetic Compose smoke checks once Docker daemon becomes available. Non-Docker verification is complete on `3b7f8d7`.

Following that milestone, the next coding phase is **Phase 05: PDF, Garage storage,
report email delivery, and owner account center**. Before claiming Phase 04 closed in the
intended environment:

1. Record and approve provider privacy due diligence.
2. Run the seven controlled private-report Playwright cases.
3. Re-run the two PostgreSQL lineage cases with Docker available.
4. Deploy or activate only after a separate explicit founder instruction.

## External And Founder Gates

- Production payment activation is founder-controlled. The current provider
  configuration is sandbox-only.
- Production AI remains blocked until provider privacy and operational terms
  are documented and approved.
- Google OAuth exists but has not been formally exercised in the recorded Phase
  01 evidence.
- A password-reset email was delivered after the auth recovery fix. The founder
  has not yet recorded successful reset completion and sign-in.
- Credentials and runtime secrets already exist outside Git. Never print,
  duplicate, or commit them.

## Deployment Context

The latest repository evidence records:

- VPS repository: `/home/debian/projects/lasoviet.vn`
- External environment file: `/home/debian/projects/.lasoviet-mvp.env`
- Public domain: `https://lasoviet.vn`
- Web publication: `127.0.0.1:63423`
- Nginx remains founder-managed.
- PostgreSQL, Redis, API, and web were healthy; the worker container was running.
- Deployed HEAD matched `8393f4a` in the latest recorded auth recovery evidence.

This handoff did not re-probe the VPS. Treat these as the latest recorded
deployment facts and verify them before a new production action.

## Guardrails

- Trust, privacy, payment integrity, authorization, and deterministic
  calculation evidence take priority over speed.
- AI interprets frozen facts and evidence; it never calculates the chart.
- Only an authenticated verified account may enter paid checkout.
- Only an authenticated SePay notification validated against order identity,
  state, amount, and currency may confirm payment.
- Private birth data, charts, and reports remain owner-authorized and noindex.
- Do not weaken production boundaries to make a synthetic provider probe pass.
- Keep testing focused on the core flow; defer only genuinely niche cases that
  cannot affect payment, authorization, privacy, calculation, or data integrity.
- Distill a new `AGENTS.md` rule only for a recurring or severe reusable failure
  condition, and record the decision in the tracker.

## Current Continuation Boundary

- Keep the Phase 04 implementation commits local until the founder explicitly
  authorizes push, merge, or deployment.
- Do not activate production AI until provider privacy due diligence is
  complete and founder-approved.
- Do not claim intended-environment Phase 04 closure until the controlled
  private-report Playwright suite and Docker-backed lineage tests pass.
- Phase 05 is the next coding phase. Sol writes each exact bounded brief,
  Gemini codes it, and Terra high reviews the meaningful milestone.

## Open Questions

Provider privacy terms and controlled private-report fixture execution remain
open. Production AI approval, production payment activation, deployment, and
release activation remain explicit founder gates.
