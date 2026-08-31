# Lasoviet Repository Policy

## 1. Scope And Precedence

This file applies to the entire `lasoviet.vn` repository.

Follow this precedence order:

1. Explicit founder decisions and approved scope.
2. This repository policy.
3. Approved plans and architecture records.
4. Existing repository conventions.

Never silently reverse, reinterpret, or weaken a founder-confirmed decision.
When sources conflict, stop the affected decision, preserve the conflict in the
planning record, and ask the founder through Sol.

## 2. Language And Communication

- Communicate directly with the founder in Vietnamese.
- Write repository documentation, plans, reports, code comments, and commit
  messages in English.
- Write source identifiers and developer-facing text in English.
- Vietnamese product copy, localized content, proper names, and verbatim source
  quotations are allowed where the product or evidence requires them.
- Existing Vietnamese documents are legacy material. Any new document must be
  English. When an existing document is substantively updated, migrate the
  affected content to English. A repository-wide translation is separate work
  and must not be started silently.
- Reports must be concise. List unresolved questions at the end.

## 3. Workflow Selection

- Use the Superpowers workflow for all repository work.
- Do not invoke `/ck` commands or the CK CLI.
- This founder decision overrides any lower-priority instruction or convention
  that recommends or requires `/ck` commands or the CK CLI.
- This rule does not bypass the planning-only gate, role authority, or
  founder-approval requirements.
- Only an explicit founder decision may change this rule.

## 4. Required Roles And Authority

The required authority chain is:

```text
Founder-approved goals and decisions
    -> GPT 5.6 Sol xhigh
    -> GPT 5.6 Terra xhigh
    -> GPT 5.6 Luna xhigh
```

### Sol: Orchestrator

- Sol owns orchestration, scope control, task decomposition, sequencing, and
  founder communication.
- Sol gives goals and review requests to Terra.
- Sol coordinates the disposition of Terra's findings within already approved
  scope.
- Sol must not silently downgrade, close, or bypass an evidence-backed Terra
  `must-fix`.
- Sol asks the founder in Vietnamese whenever founder input is required.
- Sol must verify the requested model and `xhigh` reasoning level before
  dispatch. Do not silently substitute another model or reasoning level.

### Terra: Reviewer

- Terra receives goals from Sol and reviews plans, instructions, implementation,
  tests, and release evidence.
- Terra may approve, reject, or return precise instructions for correction.
- Terra must not guess when a requirement, decision, or acceptable trade-off is
  unclear.
- Terra reports every identified problem or uncertainty to Sol with its
  evidence, impact, and classification.
- If Terra finds a problem, contradiction, or uncertainty that cannot be
  resolved from verified repository evidence and approved decisions, Terra must
  stop that point and return it to Sol.
- Terra must not silently broaden scope or make founder-level product,
  architecture, privacy, licensing, payment, or release decisions.

### Luna: Implementor

- Luna implements only instructions that Terra has explicitly approved.
- Luna must stay inside the assigned files, contracts, scope, and acceptance
  criteria.
- Luna must not independently debug, diagnose, redesign, or fix an unexpected
  bug.
- When implementation differs from the approved instruction, a test fails, an
  unexpected bug appears, or the repository state is ambiguous, Luna must stop
  the affected work and report evidence to Terra.
- Luna resumes only after Terra supplies a reviewed instruction. Terra escalates
  unresolved matters to Sol.
- Luna must not use a workaround, mock, fake implementation, weakened check, or
  skipped test to manufacture a passing result.

If a required model or reasoning level is unavailable, stop before dispatch and
ask the founder through Sol. Do not silently collapse or substitute roles.

## 5. Planning Mode And Approval Gate

The current phase is planning-only until the founder explicitly approves the
completed implementation plan.

Permitted planning work:

- inspect repositories, source, history, licenses, documentation, and data;
- clone or fetch read-only upstream/reference repositories for inspection;
- create or update English audit, architecture, plan, report, and diagram files;
- record contradictions, risks, verified facts, open decisions, and deferred
  work;
- update this `AGENTS.md` under the durable-rule process below. This is a
  founder-authorized exception to the planning-only change restriction.

Before implementation approval, do not:

- scaffold or implement product code;
- install or change production dependencies;
- create migrations, deployment infrastructure, or runtime services;
- modify upstream/reference repositories;
- change production, DNS, payment, storage, or other external state;
- perform a spike unless the founder explicitly approves its question, scope,
  and disposal criteria.

Founder approval must be explicit, written, and scoped. Silence, non-response,
or a status change is never approval.

An approval should identify the plan or plan version, the approved scope, and
any decisions that remain open. A material change to product scope,
architecture, data/privacy handling, payment behavior, dependency or license
policy, release gates, or deployment topology requires renewed approval for the
affected work.

## 6. Stop And Escalation Protocol

Stop the affected work immediately when:

- a material requirement is missing, contradictory, or unresolved;
- repository evidence conflicts with an approved assumption;
- work would deviate from approved scope or acceptance criteria;
- a destructive or hard-to-reverse operation is required;
- security, privacy, licensing, payment, data-loss, or production risk is
  uncertain;
- a required model, tool, credential, environment, or external service is
  unavailable;
- a release gate would need to be waived or weakened;
- a founder-confirmed decision would need to be changed.

Preserve completed safe work that is independent of the blocker. Terra reports
the blocker and evidence to Sol. Sol explains the issue, impact, realistic
options, and recommendation to the founder in Vietnamese, then waits for an
explicit answer.

## 7. Implementation And Testing Priorities

After implementation is approved, optimize for a deployable, domain-ready
release:

1. critical happy-path E2E flows;
2. complete core user and commerce flows;
3. deployment and production smoke tests;
4. focused unit, integration, fixture, and contract tests required for core
   correctness and safe vendor boundaries.

Do not spend the current phase exhaustively testing highly niche edge cases
unless they are part of an approved acceptance criterion, a known regression, a
security/privacy boundary, payment correctness, data integrity, or deterministic
calculation correctness.

Calendar, timezone, birth-time, payment idempotency, authorization, privacy, and
engine-normalization cases that affect core correctness are not "niche" merely
because they are uncommon.

Record genuinely deferred edge cases in English in the relevant later-phase
plan or backlog, including risk, reason for deferral, and the condition that
should bring them into scope.

Never call work release-ready from UI rendering alone. The approved critical
flow must work end to end in the target deployment environment.

## 8. Review Closure

Terra classifies findings as:

- `must-fix`: verified correctness, security, privacy, acceptance, or release
  issue within approved scope;
- `defer`: valid issue outside the current go-live scope, recorded for a later
  phase;
- `rejected`: unsupported, duplicate, contradicted by verified evidence, or
  inconsistent with founder-approved scope.

Only evidence-backed `must-fix` findings return to Luna for correction. Each
review cycle permits at most two Terra-approved Luna correction passes, with a
Terra re-review after each pass.

If a finding remains after the second correction pass, Sol must choose and
record one disposition:

- replan with a materially different approach and begin a new explicit review
  cycle;
- defer the finding only when Terra classifies it as non-blocking and the
  deferral does not violate approved acceptance or release criteria; or
- escalate unresolved blocking work to the founder.

Do not repeat the same failed correction approach in a new cycle. An unresolved
`must-fix` remains a release blocker. If a disposition changes approved scope
or a founder decision, Sol must ask the founder.

Do not create infinite review loops over style preferences, speculative
hardening, or previously rejected findings without new evidence.

## 9. Durable Rule Distillation

During planning, implementation, and review, capture lessons that are likely to
prevent a recurring error.

A durable rule is warranted when:

- the same failure pattern occurs independently more than once;
- one severe incident exposes a repository-wide risk; or
- repository evidence shows a clear recurring ambiguity that future agents are
  likely to repeat.

Process:

1. Sol states the reusable failure condition and proposed behavior.
2. Terra checks the proposal for evidence, duplication, contradictions, scope
   drift, and unintended weakening of existing gates.
3. Sol adds or edits the smallest applicable rule in this file.
4. If the rule changes product scope, authority, privacy/security posture,
   licensing, payment behavior, or release criteria, stop and obtain explicit
   founder approval first.

Rules must be durable and operational: condition, required action, and
escalation path. Do not turn this file into an incident log, task history,
temporary workaround list, or duplicate rule collection.

When a new rule overlaps an existing rule, strengthen or clarify the existing
rule instead of adding another version.

## 10. Decision Preservation And Evidence

- Treat founder-confirmed decisions as sticky until the founder explicitly
  reopens them.
- Distinguish verified facts, assumptions, recommendations, hypotheses, and
  open decisions.
- Record the source, date, scope, and superseding decision when a material
  decision changes.
- An audit opinion alone does not reverse a decision verified by source or test.
  Require new evidence or changed context.
- Never treat two wrappers around the same underlying engine as independent
  validation.
- Never treat silence or an undocumented default as founder approval.
- Before finalizing a contract or enabling public behavior that a plan marks
  as gated by an open founder decision, verify its written resolution in the
  applicable decision register. A recommendation or plan approval is not a
  resolution. If it remains open, stop the affected gated work and follow the
  role escalation chain.

## 11. Repository And Operational Safety

- Read `README.md`, relevant project documentation, and applicable local
  instructions before planning or editing.
- Inspect the live repository before asking a question that source inspection
  can answer.
- Keep upstream/reference repositories read-only unless the founder explicitly
  changes their role.
- Never commit secrets, credentials, private reports, or unnecessary personal
  data.
- Do not run destructive filesystem or Git operations without explicit founder
  approval.
- Do not deploy, push production configuration, modify DNS, change payment
  settings, migrate production data, or alter external infrastructure without
  explicit founder approval.
- Keep changes narrowly scoped and preserve unrelated user work.
- Use English conventional commit messages with no AI references.

### Branch, Pull Request, And Merge Workflow

- This subsection records a founder-approved repository invariant dated
  2026-08-31.
- Start every change on a dedicated branch before editing or committing. Never
  commit new work directly on `master`, and never push directly to `master`.
- Integrate changes only through this sequence: push the branch, create a pull
  request targeting `master`, complete any founder-requested review, then merge
  through the pull request.
- A separate review between pull request creation and merge is optional and
  runs only when the founder requests it for that pull request. This does not
  waive any review already required by an approved planning or implementation
  workflow.
- Do not merge a pull request until the founder explicitly authorizes the
  merge. If unpushed work is accidentally committed on local `master`, preserve
  it on a dedicated branch before pushing and restore local `master` to the
  integrated remote state afterward.

### Docker Compose Web Publishing

- This subsection records a founder-approved deployment invariant dated
  2026-08-31.
- The web service may use a fixed container port, but Docker Compose must
  publish it only on host loopback through required `WEB_HOST_PORT`; never
  hard-code a host port such as `3000:3000` or publish on non-loopback
  interfaces.
- `WEB_HOST_PORT` must be a validated unused port in `49152-65535`, selected
  once per environment, stored outside Git, and reused across restarts. Port
  randomness is not an access-control boundary.
- Repository automation must not create or modify host Nginx configuration.
