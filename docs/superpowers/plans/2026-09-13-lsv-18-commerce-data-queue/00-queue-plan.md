# LSV Commerce and Data Dependency Queue Implementation Plan

**Date:** 2026-09-13
**Kaneo queue:** LSV #18 -> #10 / #11 / #12 -> #13
**Status:** Planning only. No implementation, migration execution, dependency
change, production access, deployment, activation, or merge is authorized.

## Authority and Overrides

This plan follows the founder-decision tracker, `AGENTS.md`, the approved
platform architecture, and the progressive-reveal/Lá design specification.
Section 18 of that specification overrides its earlier conflicting sections.

FD-081 is the current analytics decision. It supersedes FD-080 and FD-050:
behavioral tracking is first-party, persistent, and account-linked after the
existing wizard consent or sign-in. The older 2026-09-13 Kaneo #18 comment
retaining anonymous-only measurement is historical and non-binding.

The founder instruction dated 2026-09-13 overrides the branch target currently
present on `origin/master`: every delegated ticket branch starts from the
latest fetched `origin/master`, pushes its own branch, and opens a pull request
directly to `master`. No delegated agent merges. PR #51 records the pending
durable repository-rule update.

## Outcome

The queue delivers:

1. a shared, append-only Lá wallet and recoverable top-up/unlock workflow;
2. secure generated previews that never ship locked plaintext;
3. transaction-derived revenue, deferred-revenue, and operations metrics;
4. complete AI usage and contribution-margin evidence;
5. identified first-party analytics with consent, retention, and FD-053
   boundaries; and
6. a versioned claim registry that keeps product and policy copy aligned.

## Dependency Order

```text
Plan approval
  -> #18 foundation: wallet, order-source, entitlement-source, invoice, intent
      -> #10 transaction-derived business metrics
      -> #11 AI usage capture
      -> #12 identified analytics and consent
      -> #18 generated-preview persistence and projection
  -> #11 CM30 projection after #10 and #11 usage capture are integrated
  -> #13 claim inventory and approved wording
  -> QI shared export and runtime integration
  -> dedicated UI artifact branches consume the approved headless contracts
  -> Terra milestone review
  -> founder legal/finance/privacy/release approvals
  -> migration rehearsal and deployment authorization
  -> staged activation and production smoke
```

#18A-18E and 18G are the pre-queue foundation. After that foundation is
integrated, #10, #11A-11B, and #12 may proceed in parallel because they own
separate schema and runtime boundaries. #11C waits for #10A and 11B. #18F
waits for 11B and the FD-073 section generator, and is the only #18 slice that
may start after the queue's data work. #13 waits for all upstream claims and
policies. The queue-integration slice runs last and is the sole owner of shared
package barrels and API/worker module wiring.

## Non-UI Boundary

These ticket branches may implement contracts, database schemas, services,
private APIs, BFF routes, localized message data, and headless tests. They must
not implement pages, forms, components, layouts, styles, navigation
presentation, blur visuals, pack cards, balance controls, or other
customer-facing visual UI. Those surfaces wait for the dedicated UI artifact
branches and consume the contracts defined here.

## Shared Invariants

- Existing VND orders, invoice numbers, entitlements, and reports remain
  readable and immutable.
- New paid content unlocks debit Lá; they do not create a second VND order or
  invoice.
- New VND orders are wallet top-ups and are never tied to a chart.
- Paid and promotional Lá are separate, promotional Lá spends first, and
  balances never become negative.
- A wallet spend and entitlement grant are one idempotent transaction.
- Report reservation and outbox creation join that transaction for report
  products.
- Provider payment confirmation first secures the top-up and invoice; intended
  unlock completion is a separately retryable, idempotent transaction.
- Locked plaintext is absent from unauthorized JSON, HTML, React payloads,
  metadata, print output, and the accessibility tree.
- Transaction metrics derive from commerce/report/wallet state, not analytics
  events.
- AI usage records contain token/cost metadata only, never prompt or response
  content.
- Analytics clients cannot choose `visitor_id`, account ID, IP, or other
  server-owned identity fields.
- Admin outputs remain private, capability-gated, aggregate/redacted, and
  audited.

## Migration Reservation

To avoid parallel direct-to-`master` collisions:

| Migration | Owner |
|---|---|
| `0026_la_wallet_and_order_sources.sql` | #18 wallet, order, entitlement, invoice, intent |
| `0027_generated_locked_previews.sql` | #18 generated preview persistence |
| `0028_ai_usage_cost.sql` | #11 AI usage and pricing snapshots |
| `0029_identified_analytics.sql` | #12 visitors, events, links, retention |
| `0030_business_metrics_capability.sql` | #10 admin capability seed and policy |

#13 must not add a migration. If another `master` change consumes one of these
numbers before implementation starts, Sol must reassign all affected numbers
in one plan amendment before any branch writes a migration.

## Milestones and Terra Reviews

### M1: Commerce Integrity

Complete #18 wallet/top-up/spend/entitlement/invoice contracts and focused
recovery tests. Terra reviews schema compatibility, non-negative concurrency,
idempotency, accounting allocations, provider boundaries, and feature-off
behavior.

### M2: Preview Security and Cost Boundary

Complete #18 generated-preview headless workflow after the #11 usage recorder
and the FD-073 section generator are available. Terra reviews plaintext
non-disclosure, anonymous 24-hour lifecycle, cost-cap enforcement, reuse, and
fallback.

### M3: Business Data

Complete #10, #11, and #12. Terra reviews authoritative revenue derivation,
deferred revenue, CM30 completeness, AI usage failure accounting, consent,
identity linking, retention, account export/deletion, and FD-053 tests.

### M4: Claim Consistency

Complete #13 after founder/expert wording decisions. Terra reviews registry
coverage, route references, prohibited-claim checks, and CI enforcement.

### M5: Queue Integration

Complete QI after all feature branches are integrated. Terra reviews root
exports, module registration, migration convergence, duplicate registration,
and consumer build order.

Each milestone permits one evidence-backed correction brief and one scoped
Terra re-review. A repeated blocking finding requires a materially different
replan, valid deferral, or founder escalation.

## Terra Review Status

The first independent Terra review returned `CHANGES_REQUESTED` with six
must-fix findings: the preview dependency loop, missing consent-receipt schema
ownership, incomplete top-up/spend compatibility contracts, overlapping shared
files, underspecified paid-lot accounting, and missing admin capability seed
ownership. This revision addresses those findings by separating #18
foundation from #18F, assigning the consent and `0030` migrations, adding V2
read contracts, defining integer paid-lot allocation, and centralizing shared
files in QI. The required scoped re-review is recorded below.

The scoped Terra re-review found no remaining `MUST-FIX` findings. It marked
the queue consistent for implementation planning, with founder and expert
approval gates below still outstanding.

## Queue Integration Slice

### QI: Shared exports and runtime wiring

**Prerequisites:** all approved feature slices that create exported contracts,
schemas, services, controllers, processors, or claim loaders.

**Owned files:** `packages/contracts/src/index.ts`,
`packages/config/src/index.ts`, `packages/database/src/index.ts`,
`packages/backend/src/index.ts`, `apps/api/src/api.module.ts`,
`apps/worker/src/worker.module.ts`,
`packages/backend/src/outbox/outbox.dispatcher.ts`, and
`packages/database/src/schema/schema.integration.test.ts`.

**Behavior:** export the approved queue surfaces, register API and worker
factories, replace the legacy API log-only analytics sink with the #12
PostgreSQL sink, extend the central migration integration suite, and make no
domain logic or policy changes. There must be one analytics write path, never
a log-plus-database dual-write.

**Acceptance:** every root-package import resolves from current source;
capability removal prevents the business-metrics query; worker/API startup
registers each feature once; the legacy `createApiAnalyticsSink` path is
removed or replaced and no analytics event is emitted to the legacy log sink;
clean-install and upgrade tests cover migrations `0026` through `0030`.

**Checks:** build producers before consumer typechecks, central schema
integration, API/worker module tests, duplicate-registration scan, and
`git diff --check`.

No feature slice may edit a QI-owned file. If a feature cannot remain testable
behind its local factory before QI, Sol must narrow the feature brief and move
only the required wiring into QI.

## Release Sequence

1. Deploy additive schemas and dormant read paths.
2. Reconcile legacy rows and prove byte-stable historical projections.
3. Enable wallet reads while all wallet writes remain off.
4. Run provider sandbox top-up, replay, self-claim, and refund probes.
5. Enable top-ups for an internal allowlist.
6. Enable Lá spends only after wallet reconciliation is exact.
7. Enable generated previews only after usage pricing and the per-chart cap are
   enforceable.
8. Enable identified analytics only after consent/privacy claims are approved.
9. Enable public UI only from the approved UI artifact branch.

Any ledger mismatch, unauthenticated provider callback, invoice failure,
negative-balance attempt, unrecoverable intent, or unknown AI cost opens the
matching circuit and halts the affected write path without hiding existing
balances or entitlements.

## Queue Completion Evidence

Before any task can be marked `Done`, its approved implementation must have:

- focused contract, unit, integration, concurrency, and privacy tests;
- producer builds before dependent typechecks;
- `pnpm content:check` where public claims are touched;
- `pnpm i18n:check` where localized messages are touched;
- `git diff --check`;
- Terra approval with no unresolved `must-fix`;
- founder-authorized deployment; and
- target-environment smoke evidence recorded in Kaneo.
