# La So Viet Engineering Handoff

**Updated:** 2026-09-04
**Repository:** `harris1111/lasoviet.vn`
**Worktree:** `G:\Dev\Repos-Windows\tuvi-a-lam\lasoviet-admin-operations-plan`
**Active branch:** `feature/paid-flow-admin-operations`
**Audited HEAD:** `8393f4a3fda31ff6aa50c5ad4390bcc4e5bf9e3c`

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

A fresh `origin` fetch on 2026-09-04 established:

- Worktree clean at audit start.
- Branch matches `origin/feature/paid-flow-admin-operations`.
- Branch is 31 commits ahead and 0 behind `origin/master`.
- `origin/master` is `b5ac65b63a11d5be1f11d9d1855f21d2a4f69b37`.
- No pull request exists for the active branch.
- The documentation commit created from this audit is expected to make the next
  task's actual HEAD newer than the audited implementation baseline above.
- Never push directly to `master`.
- Do not merge, create a PR, or deploy without an explicit founder request.

## Active Agent Roles

- **Sol xhigh:** orchestrates, controls scope, communicates with the founder in
  Vietnamese, and reviews complete features, phases, or meaningful milestones.
- **Terra medium:** implements, performs real debugging, corrects focused
  failures, and runs focused checks inside approved scope.
- **Flash Executor high:** global execution-only subagent using
  `ag/gemini-3.8-flash-high`. It accepts only exact bounded briefs from Sol or
  Terra, modifies assigned files, performs focused checks, and stops instead of
  planning, proposing, expanding scope, or debugging deeply.
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
- **Phase 06 foundation:** Docker images, Compose topology, loopback-only web
  publication, and production-like free-MVP smoke evidence exist. This does not
  close the full release phase.

### In Progress

- **Phase 04:** AI/report foundations and SePay Tasks 1-2 are implemented.
  A real authenticated sandbox payment created one paid order, payment event,
  entitlement, report reservation, and processed report outbox event.
  The report job remains `waiting` because P04-T03 worker consumption is not
  connected.
- **Phase 05A:** T01 admin access/RBAC/audit, T02 redacted operations overview,
  and T05 role administration/audit inspection are complete. T03, T04, and T06
  remain open.

### Remaining

- **P04-T03:** report worker and durable report state machine.
- **P04-T04:** approved knowledge ingestion and retrieval.
- **P04-T05:** production AI privacy approval plus complete generation,
  persistence, validation, and critic integration.
- **P04-T06:** immutable report versions and private HTML report.
- **Phase 05:** PDF, Garage, optional replication, report email delivery, and
  owner account center.
- **P05A-T03/T04/T06:** redacted detailed inspections, compensating commands,
  and production-like incident evidence.
- **Phase 06:** security, purge execution, metrics, backup/restore drills, paid
  E2E, twenty-report QA, legal/accounting gates, and indexing activation.
- **Phases 07-11:** later product waves.

## Immediate Next Execution

The recommended next coding task is **P04-T03: Build the worker and report state
machine**.

Why it is first:

- A real sandbox payment already publishes `report.generation.requested.v1`.
- The corresponding report job is waiting.
- P04-T03 is the first missing runtime consumer and unblocks the rest of the
  paid report pipeline.

After P04-T03, proceed in this order:

1. P04-T04 knowledge ingestion and retrieval.
2. Complete P04-T05 against the worker and knowledge boundaries.
3. P04-T06 immutable persistence and private HTML.
4. Phase 05 storage, PDF, email delivery, and account center.
5. P05A-T03 and P05A-T04 against the completed domain workflows.
6. P05A-T06 and Phase 06 production-like release evidence.

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

## First Task Brief Template

For P04-T03, Sol or Terra should produce an exact brief containing:

- Assigned files from the P04-T03 phase section.
- Required state transitions and idempotency behavior.
- The existing `report.generation.requested.v1` input contract.
- Focused test commands and minimum compile/typecheck command.
- Explicit exclusions for P04-T04, P04-T05, P04-T06, deployment, and external
  side effects.

Flash Executor may implement bounded slices only after this brief is complete.
Terra retains investigation and debugging ownership.

## Open Questions

None for starting P04-T03. Production AI approval, production payment
activation, and release activation remain explicit later founder gates.
