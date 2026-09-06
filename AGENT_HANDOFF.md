# La So Viet Engineering Handoff

**Updated:** 2026-09-06
**Repository:** `harris1111/lasoviet.vn`
**Worktree:** `G:\Dev\Repos-Windows\tuvi-a-lam\lasoviet-admin-operations-plan\.worktrees\phase04-report-generation`
**Active branch:** `feature/phase04-report-generation`
**Audited implementation baseline:** `63f3823c7d630f690588e23de45ad03bec1e2559`

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

- Audited implementation baseline (2026-09-06): `63f3823c7d630f690588e23de45ad03bec1e2559` (`fix(web): prevent private report locale redirect loops`).
- Documentation commit `92c8a000a8a6c084ec3c0530c1c95d33d4fec0f6` (`docs: record Phase 04 browser acceptance`) was the single documentation commit immediately following audited implementation baseline `63f3823` and recorded browser acceptance, followed by later handoff-lineage correction `060ae351ba55a38db177e33ab303d634acc79760` (`docs: correct Phase 04 handoff lineage`).
- A fresh `origin` fetch on 2026-09-05 established verified current `origin/master`: `9280954429fd2f123eebaf94ec04fa70ee4ea7c7`.
- Merged current `origin/master` (`9280954429fd2f123eebaf94ec04fa70ee4ea7c7`) via merge commit `d6f500528f54bb6d6768d7b119e7a7d22ddc69e8`.
- Ahead/behind status against `origin/master`: 0 behind; ahead count was 72 at prior implementation baseline `3b7f8d7`, 74 at prior documentation commit `35f2eb9`, 77 at audited implementation baseline `63f3823`, 78 at documentation commit `92c8a00`, and 79 at `060ae35` (re-derive dynamically via `git rev-list --left-right --count origin/master...HEAD`).
- No remote `feature/phase04-report-generation` branch exists.
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
  `feature/phase04-report-generation`. In-page VietQR Tasks 1-6 are complete.
  Controlled browser acceptance for private reports is complete (7 passed, 0 failed).
  Controller-verified evidence on 2026-09-06:
  `corepack pnpm@11.25.0 vitest run`: 121 test files passed, 723 tests passed, 0 failed, 0 skipped; duration 16.00s on 2026-09-06.
  Controlled browser acceptance: `corepack pnpm@11.25.0 playwright test tests/e2e/paid-report-html.spec.ts --fully-parallel --workers=7`: 7 passed, 0 failed, 0 skipped, duration 11.2s on 2026-09-06. Covered signed-out redirect, cross-owner/missing 404 equivalence, VI evidence/noindex/canonical locale, EN locale, pending-to-ready refresh retaining path, safe static failed state, mobile TOC focus lifecycle.
  Fixture harness safety: 16 passed, 0 failed (12 pure + 4 command-level); loopback-only base URL enforcement; duplicate setup refusal; manifest/path/ID validation and DB ownership validation before promote/reset/cleanup. Terra final scoped review: SPEC PASS / QUALITY APPROVED.
  Final fixture cleanup: synthetic users, report reservations, report versions, outbox, and report queue counts verified zero; storage states and manifest absent. No real SePay, payment, AI, PDF/storage, email delivery, or deployment activity.
  Repository verification: workspace typecheck PASS, workspace production build PASS, i18n parity PASS, repository ESLint PASS, git diff check PASS.
  Compose services: web healthy on 127.0.0.1:55453, API healthy, PostgreSQL healthy, Redis healthy, worker running; migration completed successfully during rebuild.
  HTTP smoke: `/`, `/health/live`, `/health/ready` through http://127.0.0.1:55453 each returned HTTP 200.
  Oversized SePay webhook: 65,537-byte request with valid synthetic ingress auth returned HTTP 413 and `{"ok":false}`; no real provider/payment activity.
  `G:\Dev\Temp\lasoviet-mvp-phase04-compose.env` is absent after successful smoke and must not be recreated or printed.
- **Phase 06 foundation:** Docker images, Compose topology, loopback-only web
  publication, and production-like free-MVP smoke evidence exist. This does not
  close the full release phase.

### In Progress

- **Phase 04 closure:** production AI remains fail-closed pending provider
  privacy approval. Controlled private-report Playwright acceptance is complete
  (7/7 passed). Provider privacy due diligence approval is the sole remaining
  Phase 04 closure decision gate.
- **Phase 05A:** T01 admin access/RBAC/audit, T02 redacted operations overview,
  and T05 role administration/audit inspection are complete. T03, T04, and T06
  remain open.

### Remaining

- **P04 external gates:** provider privacy due diligence approval remains the
  sole Phase 04 closure decision gate; production payment activation,
  production AI activation, and production deployment remain separately
  authorized founder gates.
- **Phase 05:** PDF, Garage, optional replication, report email delivery, and
  owner account center.
- **P05A-T03/T04/T06:** redacted detailed inspections, compensating commands,
  and production-like incident evidence.
- **Phase 06:** security, purge execution, metrics, backup/restore drills, paid
  E2E, twenty-report QA, legal/accounting gates, and indexing activation.
- **Phases 07-11:** later product waves.

## Immediate Next Execution

With In-page VietQR Task 6, full Vitest suite (121 files, 723 tests), and
controlled private-report browser acceptance (7/7 Playwright cases) complete and
verified, the immediate execution focus points only to the sole remaining Phase
04 closure gate:

1. Record and approve provider privacy due diligence.
2. Deploy or activate only after a separate explicit founder instruction.

Following those gates, the next coding phase is **Phase 05: PDF, Garage storage,
report email delivery, and owner account center**.

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
- Controlled private-report browser acceptance is complete; intended-environment
  Phase 04 closure remains open only for provider privacy approval. Do not claim
  production activation.
- Phase 05 is the next coding phase. Sol writes each exact bounded brief,
  Gemini codes it, and Terra high reviews the meaningful milestone.

## Open Questions

Provider privacy due diligence approval remains the sole open Phase 04 closure
decision gate. Production AI approval, production payment activation,
deployment, and release activation remain explicit founder gates.
