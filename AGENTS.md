# Lasoviet Repository Policy

## 1. Scope And Precedence

This file applies to the entire `lasoviet.vn` repository.

This file controls how repository sources are resolved. Follow this precedence
order:

1. Explicit founder decisions recorded in
   `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`.
2. This repository policy.
3. Approved plans and architecture records.
4. Founder-approved experience sources: `docs/13-brand-experience-guideline.md`,
   `docs/14-sitemap-seo-wireframes.md`, and
   `docs/15-collaboration-branch-workflow.md`.
5. Existing repository conventions and older business material.

`docs/10-decision-log.md` is a business-facing summary, not a second binding
founder-decision register. Blueprint v1.1 may supersede UX, route, and SEO
material in `MASTER_CONCEPT.md`, `docs/01-*` through `docs/12-*`, and the
deprecated `config/sitemap.json`. It does not supersede this policy, the
founder-decision tracker, or approved technical architecture constraints.

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

The active authority chain from P01-T02 onward is:

```text
Founder-approved goals and decisions
    -> GPT 5.6 Sol xhigh
    -> GPT 5.6 Terra medium
```

The former Sol -> Terra reviewer -> Luna implementor chain applies only through
P01-T01. Luna is paused and must not be dispatched unless the founder
explicitly reactivates that role.

### Sol: Orchestrator And Milestone Reviewer

- Sol owns orchestration, scope control, task decomposition, sequencing, and
  founder communication.
- Sol gives implementation goals directly to Terra.
- Sol reviews completed phases, complete features, and meaningful milestones;
  Sol does not run routine review gates after small tasks.
- Sol coordinates and reviews Terra's implementation evidence and correction
  work within already approved scope.
- Sol asks the founder in Vietnamese whenever founder input is required.
- Sol must verify the requested model and `xhigh` reasoning level before
  dispatch. Do not silently substitute another model or reasoning level.
- Before declaring a requested model or reasoning level unavailable solely
  because current metadata omits it, run one no-file probe with that exact
  model and reasoning level. If the probe fails or cannot run, stop and report
  to Sol; do not substitute a model or effort.

### Terra: Implementor And Debugger

- Terra medium receives goals from Sol and directly implements, debugs, and
  runs focused tests.
- Terra owns routine technical investigation, compile/test failure correction,
  and exact-version API verification without an intermediate reviewer.
- Terra may self-correct implementation defects inside approved scope and must
  preserve concise evidence in the task report.
- Terra reports completed milestone evidence and unresolved stop conditions to
  Sol.
- Terra must not silently broaden scope or make founder-level product,
  architecture, privacy, licensing, payment, or release decisions.

### Luna: Paused

- Do not dispatch Luna from P01-T02 onward.
- Preserve any Luna work already present when this workflow takes effect.
- Only an explicit founder instruction may reactivate Luna.

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

From P01-T02 onward, Terra continues through routine implementation ambiguity,
compile failures, test failures, dependency integration, and non-destructive
debugging inside the approved scope. Do not stop merely to request technical
instructions that repository evidence or focused experiments can resolve.

Stop and ask the founder through Sol only when:

- a product, architecture, or security decision is required and approved
  sources do not resolve it;
- credentials or secret material are required;
- an external side effect lacks explicit authorization;
- a destructive or hard-to-reverse operation is required.

Preserve completed safe work that is independent of the blocker. Terra reports
the exact blocker and evidence to Sol. Sol explains the issue, impact,
realistic options, and recommendation to the founder in Vietnamese.

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

Tests for expiry, retention, leases, or other runtime-clock behavior must use
an injected/frozen clock or values derived relative to the captured test time.
Do not use a fixed near-future calendar timestamp when production compares
against the real current clock; such fixtures become false failures as time
passes.

Tests that inspect repository text files must normalize CRLF and LF before
asserting line-oriented content. Do not make a Windows checkout fail solely
because Git materialized `\r\n` while CI materialized `\n`.

Record genuinely deferred edge cases in English in the relevant later-phase
plan or backlog, including risk, reason for deferral, and the condition that
should bring them into scope.

Never call work release-ready from UI rendering alone. The approved critical
flow must work end to end in the target deployment environment.

## 8. Review Closure

From P01-T02 onward, Terra implements, debugs, self-checks, and runs focused
tests directly. Sol performs the independent review after a complete phase,
complete feature, or meaningful milestone.

Sol classifies milestone findings as:

- `must-fix`: verified correctness, security, privacy, acceptance, or release
  issue within approved scope;
- `defer`: valid issue outside the current go-live scope, recorded for a later
  phase;
- `rejected`: unsupported, duplicate, contradicted by verified evidence, or
  inconsistent with founder-approved scope.

Do not schedule routine reviews after every small implementation task. Terra
may execute consecutive tasks in approved scope and self-correct technical
failures without an intermediate Sol review.

Only evidence-backed `must-fix` findings return to Terra for correction. Each
milestone review permits at most two Terra correction passes, with a Sol
re-review after each pass.

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

1. Terra states the reusable failure condition and proposed behavior in the
   task report.
2. Sol checks the proposal for evidence, duplication, contradictions, scope
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
- Before Luna implements a task-critical external package or CLI integration
  whose exact-version behavior is unverified, Terra must verify and record only
  the task-relevant import/export, configuration, command working-directory or
  root, and lifecycle/build-script facts in the approved brief. Luna must stop
  if any required fact is unverified or conflicts with local evidence; never
  rely on remembered or generic examples.
- Keep upstream/reference repositories read-only unless the founder explicitly
  changes their role.
- Before generated public content is marked `published`, require deterministic
  locale-integrity and approved repository-source-boundary validation. Reject
  sustained foreign-language or encoding-corrupted prose, prohibited localized
  claims after Unicode normalization, and source paths that are absolute, UNC,
  traversing, symlink-escaping, or otherwise resolve outside the canonical
  repository root. A failed boundary check blocks publication and returns to
  Terra for correction before milestone review.
- Production web typography must not depend on runtime remote CSS imports.
  Bundle or self-host required fonts, explicitly include Vietnamese glyph
  coverage for every font role used by localized UI, and gate release with
  built-app browser evidence that each role resolves to a loaded font face.
  Missing or fallback-only font faces block release and return to Terra.
- Never commit secrets, credentials, private reports, or unnecessary personal
  data.
- When a phase combines provider-dependent and provider-independent work,
  missing credentials or environment values block only the provider-dependent
  adapter, activation, and external smoke. Continue approved contracts,
  domain services, admin tooling, and tests that do not consume those values.
  Never replace the blocked provider path with fake success, committed
  credentials, or an unverified production default.
- Provider hosts and actions must derive from a closed environment enum, never
  a free-form URL. Success, error, and cancel return URLs are navigation-only
  and must never mutate or confirm payment; only an authenticated provider
  notification validated against order identity, state, amount, and currency
  may do so.
- A provider setup probe that omits configured authentication is not payment
  verification. Never weaken the live webhook to satisfy that probe. Complete
  provider-side authentication, then verify the boundary with a real sandbox
  transaction. If real callbacks remain unauthenticated, stop payment
  activation and escalate through Sol.
- When inspecting rendered Compose configuration or runtime service state,
  never print complete environment maps. Query only the required structural
  fields or redact sensitive values before tool output; stop and narrow the
  command when an inspection would expose an external deploy environment.
- Administrative and operational surfaces must be server-authorized private
  tools, never a database, queue, secret, payment-provider, or CMS console.
  Admin V1 uses redacted projections only; unredacted sensitive-detail reveal
  is deferred. Privileged reads require private-API authorization and redacted
  audit evidence. Authorization denials that occur before a private controller
  must still use a trusted server-to-private-API path to append bounded,
  redacted audit evidence; never create an anonymous session or expose a public
  unauthenticated audit-write endpoint to fill that gap. Aggregate admin
  projections must authorize entry with an actual active, role-permitted read
  capability and independently gate every returned module and field by its
  matching active capability. Removing a capability must also stop the
  associated source query and omit its data; hiding navigation, a module row,
  or a label is not authorization. State-changing operations require an actor,
  reason code, request/trace ID, idempotency key, expected version where
  applicable, and an append-only audit record. After trusted authentication,
  the transactional command repository must revalidate active authority before
  receipt replay or outcome classification and must own every deterministic
  command result. Persist the bounded result receipt and required audit
  evidence atomically; matching retries replay without duplicate audits, and
  expected domain conflicts must be classified before they can fall through to
  storage constraint errors. State-changing operations call policy-checked
  domain services and use compensating versions/events plus the outbox rather
  than direct table edits, immutable-record mutation, or BullMQ requeue.
- Do not run destructive filesystem or Git operations without explicit founder
  approval.
- Do not deploy, push production configuration, modify DNS, change payment
  settings, migrate production data, or alter external infrastructure without
  explicit founder approval.
- Keep changes narrowly scoped and preserve unrelated user work.
- Use English conventional commit messages with no AI references.
- For every delegated Windows repository command, first set the shell location
  to the resolved absolute assigned worktree and verify `git
  rev-parse --show-toplevel` matches it. Use absolute paths for required reads;
  never rely on an inherited controller working directory. A failed read from
  another directory is blocking and must be corrected by Sol before resuming.
- Before searching a path that the task is expected to create, check whether it
  exists. A missing create-target and the resulting no-match search status are
  expected pre-implementation state, not a blocker. Only a missing source that
  the task requires as existing context must stop and escalate.
- For Windows `apply_patch` writes, first identify the tool's actual patch
  root; do not assume the terminal workdir controls it. Use only forward-slash
  headers relative to that root, never drive-qualified or backslash headers.
  Normalize the resulting target and require it to remain under the resolved
  assigned worktree; stop on any containment mismatch or sibling lookalike
  path.
- For pnpm 11 workspaces, record every build-script decision non-interactively
  in `pnpm-workspace.yaml` using exact reviewed package-version `allowBuilds`
  entries. Keep `strictDepBuilds` enabled; do not use interactive
  `approve-builds` or removed pnpm 10 build-policy settings. Stop for Terra
  review when pnpm adds or changes a workspace manifest policy, release-age
  exception, or build-script decision.
- When a changed workspace package is consumed through package exports or
  generated declarations in `dist`, rebuild that producer from current source
  before typechecking dependent packages. Run producer builds and consumer
  typechecks in dependency order; never diagnose stale declarations as a
  consumer defect or hand-edit generated `dist` output.
- Treat a Git for Windows LF/CRLF notice as non-blocking only when its command
  exits `0`, the exact changed or staged allowlist matches,
  `git diff --check` passes, and content or hash checks show no unauthorized
  mutation; otherwise treat it as blocking and escalate.

### Branch, Pull Request, And Merge Workflow

- This subsection records a founder-approved repository invariant dated
  2026-08-31.
- Start every change on a dedicated branch before editing or committing. Never
  commit new work directly on `master`, and never push directly to `master`.
- Integrate changes only through this sequence: push the branch, create a pull
  request targeting the integration branch named by the approved workflow,
  complete any founder-requested review, then merge through the pull request.
  Feature implementation targets `product/experience-spec-v1`; the accepted
  product integration branch targets `master` only for release.
- A separate review between pull request creation and merge is optional and
  runs only when the founder requests it for that pull request. This does not
  waive any review already required by an approved planning or implementation
  workflow.
- Do not merge a pull request until the founder explicitly authorizes the
  merge. If unpushed work is accidentally committed on local `master`, preserve
  it on a dedicated branch before pushing and restore local `master` to the
  integrated remote state afterward.

### UI Artifact Branch Workflow

- This subsection records a founder-approved repository invariant dated
  2026-09-01.
- Do not implement user-facing visual UI in non-UI implementation branches.
  Pages, forms, components, layouts, navigation presentation, styles, and
  visual interaction states wait for the dedicated UI artifact branch.
- The approved artifact on that branch is the binding UI implementation source.
  Do not invent or pre-empt its visual design in backend, data, auth, engine, or
  infrastructure tasks.
- Server-side Next.js BFF/routes, APIs, contracts, localized message data, and
  headless HTTP/session tests remain allowed when they do not introduce visual
  UI.
- When a non-UI task depends on an unresolved visual decision, record the UI
  artifact dependency and continue independent non-visual work.
- Generated or exported files under `prototype/` are reference artifacts, not
  production lint targets. Exclude the prototype tree in repository-wide lint
  configuration; never edit generated support bundles merely to satisfy
  application framework rules.

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
- Never derive a browser-facing public origin from a loopback or private
  container upstream. Prefer same-origin browser clients; on VPS,
  `BETTER_AUTH_URL` must be the canonical public HTTPS origin while Nginx
  proxies to the loopback `WEB_HOST_PORT`. A release is blocked when a public
  build variable bakes `127.0.0.1`, a Compose service name, or another internal
  upstream into browser code.

### Canonical Route Registry

- `config/route-registry.yml` is the sole versioned route-definition source.
- `packages/config/src/route-registry.ts` is a typed loader and validator for
  that YAML file. It must not contain a second hand-maintained route catalog.
- Navigation, canonicals, robots policy, sitemap membership, structured-data
  templates, redirects, route ownership, and lifecycle state derive from the
  validated registry.
- The only route states are `reserved`, `preview_noindex`, `live_noindex`,
  `live_indexable`, and `archived`.
- A task that creates, exposes, retires, or redirects a route must own the
  matching `config/route-registry.yml` change and a state/robots/sitemap test in
  the same task. Route activation must never be left to an unnamed later task.

### Calculation Completion And Evidence

- A calculation flow whose consuming contract requires evidence must not return
  success until the evidence set for the exact calculation/chart version,
  capability, and rule version is persisted and schema-valid.
- If evidence persistence fails after immutable calculation output commits,
  preserve that output, return a non-success result, and make retry reuse the
  same calculation and evidence identity. Never delete immutable output or
  claim completion to hide a partial workflow.

### Anonymous Chart Retention

- Better Auth anonymous actors may create temporary birth profiles and charts
  before account registration.
- Unlinked anonymous profile and chart data must expire and be purged within
  24 hours of creation. The product must also expose immediate manual deletion.
- Linking the anonymous actor to a verified account transfers ownership into
  the normal account retention and deletion policy without duplicating the
  profile or chart.
- Anonymous data and identifiers remain subject to the same analytics
  prohibition as account-owned birth and chart data.
- Paid checkout is unavailable to anonymous actors. Before order creation, the
  server must require a current non-anonymous account with verified email;
  immutable commerce rows use that durable account owner and must not add
  retention-blocking foreign keys to anonymous, profile, chart, or chart-version
  lifecycle records.
