# Rules and Decisions Tracker

## Founder Decisions

| ID | Date | Decision | Status | Implemented in |
|---|---|---|---|---|
| FD-001 | 2026-08-31 | Use Superpowers only; no `/ck` or CK CLI | Approved | `AGENTS.md` |
| FD-002 | 2026-08-31 | Sol orchestrates, Terra reviews, Luna implements | Approved | `AGENTS.md` |
| FD-003 | 2026-08-31 | NestJS with Fastify | Approved | Phase 00 |
| FD-004 | 2026-08-31 | iztro `default` for public P0 | Approved | Phase 02 |
| FD-005 | 2026-08-31 | SePay | Approved | Phase 04 |
| FD-006 | 2026-08-31 | Balanced refund/regeneration policy | Approved | Phase 04-05 |
| FD-007 | 2026-08-31 | No paid Zi Wei with unresolved birth branch | Approved | Phase 01-03 |
| FD-008 | 2026-08-31 | Propagate Garage deletion to cloud S3 | Approved | Phase 05 |
| FD-009 | 2026-08-31 | Founder-provided OpenAI-compatible endpoint | Approved | Phase 04 |
| FD-010 | 2026-08-31 | Resend through SMTP | Superseded by FD-022 | Phase 05 |
| FD-011 | 2026-08-31 | Better Auth; email/password and Google | Approved | Phase 01 |
| FD-012 | 2026-08-31 | Follow master sequencing for D-019/D-020 | Approved | Phase 07, 11 |
| FD-013 | 2026-08-31 | Celestine for Western Wave 3 | Approved | Phase 09 |
| FD-014 | 2026-08-31 | Identity report is first paid SKU | Approved | Phase 04 |
| FD-015 | 2026-08-31 | Thirty-day account deletion recovery | Approved | Phase 01, 06 |
| FD-016 | 2026-08-31 | Free experience option A | Approved | Phase 03 |
| FD-017 | 2026-08-31 | Reuse founder-managed host Nginx | Approved | Phase 06 |
| FD-018 | 2026-08-31 | Stable random loopback host port | Approved | `AGENTS.md`, Phase 06 |
| FD-019 | 2026-08-31 | Approve Blueprint v1.1 as canonical UX, route, and SEO source while preserving approved technical decisions, including one-SKU-first | Approved | Architecture spec, Phase 00, Phase 03 |
| FD-020 | 2026-08-31 | Purge unlinked anonymous birth-profile and chart data after 24 hours; preserve it under account policy only after verified account linking | Approved | `AGENTS.md`, Phase 01, Phase 03 |
| FD-021 | 2026-09-01 | Review complete features, phases, or meaningful milestones instead of every small implementation task; keep focused core-flow verification | Approved | `AGENTS.md` |
| FD-022 | 2026-09-01 | Use the founder-provided MXRouting SMTP connection for authentication and report email; port 587 requires reviewed STARTTLS behavior | Approved | Phase 01, Phase 05 |
| FD-023 | 2026-09-01 | From P01-T02 onward, Terra medium directly implements, debugs, and runs focused tests; Sol xhigh orchestrates and reviews milestones; Luna is paused | Approved | `AGENTS.md`, P01-T02 onward |
| FD-024 | 2026-09-01 | Defer user-facing UI to a dedicated artifact branch and implement it only against the approved artifact; current branches focus on non-visual work | Approved | `AGENTS.md`, current implementation phases |

## Durable Rule Evaluation Log

This log records evaluation. It does not replace `AGENTS.md`.

| Candidate | Evidence | Terra result | Disposition |
|---|---|---|---|
| Superpowers-only workflow | Direct founder instruction | Approved | Added to `AGENTS.md` |
| Role authority and stop protocol | Direct founder instruction | Approved | Added to `AGENTS.md` |
| Durable-rule distillation process | Direct founder instruction | Approved | Added to `AGENTS.md` |
| Loopback stable high host port | Direct founder deployment invariant dated 2026-08-31 | Approved with clarification that randomness is not security | Added to `AGENTS.md` |
| Phase-scoped founder decision gates | Repeated open commercial and safety choices in Phases 07-11 | Terra approved minimal operational rule | Added to `AGENTS.md`; tracked in `open-decisions.md` |
| Single route-definition source | Terra found Blueprint YAML and TypeScript catalogs competing | Approved after source reconciliation | Added to `AGENTS.md`; YAML data plus typed loader |
| Anonymous chart retention | Founder approved the recommended 24-hour privacy boundary | Approved | Added to `AGENTS.md`; tracked as `FD-020` |
| Integration-branch-aware PR targets | Terra found direct-to-master wording conflicting with approved feature-to-product flow | Approved clarification | Updated in `AGENTS.md` and collaboration workflow |
| Route activation ownership | Final Terra review found private pages created without registry promotion ownership | Approved recurring invariant | Added to `AGENTS.md`; route tasks now own registry and crawl-state tests |
| Milestone-based review cadence | Direct founder instruction after task-level review caused unacceptable delivery delay | Approved | Added to `AGENTS.md`; per-task review is no longer the default |
| Delegated Windows worktree anchoring | Required reads repeatedly resolved from the controller root instead of the assigned worktree, stopping P00-T02 and P00-T03 | Approved recurring invariant | Added to `AGENTS.md`; delegated commands must anchor and verify the absolute worktree |
| Missing create-target handling | Discovery stopped when `rg` inspected `.github` before the task created it | Approved recurring ambiguity | Added to `AGENTS.md`; absent create-targets are expected, while missing required sources remain blocking |
| Exact-version integration preflight | P01-T01 repeatedly used unverified Drizzle, Vitest, and Testcontainers integration behavior | Terra approved narrowed task-critical rule | Added to `AGENTS.md`; approved briefs must record only task-relevant exact-version facts |
| Terra direct-execution workflow | Founder changed the active role model from P01-T02 to reduce implementation latency while preserving milestone review | Direct founder decision | Updated `AGENTS.md`; Terra medium implements/debugs/tests, Sol xhigh reviews milestones, Luna paused |
| UI artifact branch boundary | Founder reserved visual implementation for a later artifact branch | Direct founder decision | Added to `AGENTS.md`; non-UI branches may implement server routes and headless flows but not visual UI |

## Per-Task Rule Check

Every task completion report includes:

```text
Docs impact: none | minor | major
Rule candidate: none | describe recurring failure condition
Evidence: source/test/incident
AGENTS.md action: none | clarify existing rule | add reviewed rule
Open questions: none | list
```

Sol may propose a rule only when the condition meets `AGENTS.md` section 9.
Terra checks evidence, duplication, conflicts, and scope. Temporary workarounds
and task history remain in plans/reports, not `AGENTS.md`.

Open founder decisions are tracked in `open-decisions.md`. Package approval
does not silently close them.

## P01-T02 Evidence

Date: 2026-09-01

- Scope: non-visual authentication, identity, SMTP, and API/BFF work only;
  no pages, forms, components, navigation, layouts, styling, or visual states.
- Database migration and ownership-transfer acceptance passed: 3 tests.
- Focused auth/config/backend checks passed: 44 tests. Full repository suite
  passed: 83 tests. Root typecheck and build passed after rebuilding producer
  declarations.
- Browser E2E is not marked green. The exact Playwright command found no
  controlled Next/PostgreSQL runtime at `http://127.0.0.1:3000/`; a later
  authorized runtime must run that gate.
- No external SMTP send or Google request occurred. Rule candidate: none.
