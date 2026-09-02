# Operations Dashboard V1 Design

**Status:** Founder-approved for implementation planning
**Date:** 2026-09-02
**Scope:** Phase 05A Admin and Operations Console
**Related architecture:** `2026-08-31-lasoviet-platform-architecture-design.md`

## Purpose

Operations Dashboard V1 gives authorized staff a private, privacy-safe view of
the live product workflow and a small set of policy-checked recovery commands.
It exists to operate the approved account, commerce, report, delivery, privacy,
and support workflows. It is not a CMS or a general back-office system.

The console foundation may be implemented after Phase 03 because sessions,
route-state governance, and private API boundaries exist then. Its closure
depends on Phase 04 commerce/report workflow contracts and Phase 05 storage,
delivery, and account-center contracts that it inspects and operates. Phase 06
paid-release readiness depends on Phase 05A closure.

## Scope

### Included modules

- Overview metrics, dependency health, workflow backlog, and incident signals.
- Accounts, verification, account-retention state, and privacy-safe profile
  lookup.
- Privacy-safe birth-profile and chart inspection.
- Orders, payment state, entitlements, and immutable report lineage.
- Reports, generation attempts, queue-derived workflow state, and outbox state.
- Asset, storage, replication, delivery, and notification state.
- Support cases, refund records, correction requests, and regeneration records.
- Privacy export and deletion workflow status.
- Audit-log search and detail views.
- Read-only route, content, metadata, crawl, and indexing readiness.

### Excluded from V1

- Content editing, media editing, page publishing, or any CMS capability.
- Arbitrary SQL, shell access, queue/job execution, queue requeue, or raw
  worker controls.
- Credential, secret, environment-map, token, password-hash, or signed-URL
  display.
- Unredacted sensitive-detail reveal. Admin V1 uses redacted operational
  projections only.
- Direct payment-provider mutation, settlement mutation, or refund execution
  outside an approved provider/domain contract.
- In-place chart, evidence, report, asset, transaction, or audit mutation.
- In-place chart/report regeneration, raw report-body list views, and
  production AI, SePay, Google OAuth, DNS, or deployment activation.

Full CMS and broader editorial/back-office editing remain deferred.

## Trust Boundary And Route Contract

All console routes live under `/admin/**`. Each implemented route is
`live_noindex`, absent from public navigation, and absent from every sitemap.
It is excluded from the public indexable-route inventory but remains present
in the private-route security and indexing evidence inventory.
The server resolves a verified Better Auth session before rendering or data
access. The browser never supplies a trusted role, capability, target account,
or actor identity.

Next.js remains the browser-facing BFF. It obtains the server-resolved actor,
forwards a short-lived internal actor token and request/trace ID to the private
API, and renders only safe projections. The private API independently verifies
the actor and authorizes every query and command. A private network path is not
authorization.

## Roles And Capabilities

Roles are database-backed assignments, never client claims. Capabilities are
resolved server-side from the active assignment and can be narrowed per role.
Role assignment, revocation, and capability-policy changes are
super-admin-only, require an explicit reason code, and create an audit record.

| Role | Permitted capabilities | Explicit exclusions |
|---|---|---|
| `super_admin` | assign/revoke roles; read all operational projections; approve policy-allowed recovery commands; inspect audit records and readiness | no secrets, arbitrary SQL, direct provider mutation, CMS editing, or queue control |
| `operations` | read workflow, storage, delivery, account-retention, and readiness projections; submit policy-allowed retry/reconcile/regeneration commands | no role assignment, payment/refund approval, unredacted detail, or deletion approval |
| `support` | read assigned support-safe account/order/report summaries; create support cases; submit policy-allowed correction, regeneration, privacy-export, and refund-review requests | no role assignment, payment mutation, raw chart/report payload access, storage control, or deletion approval |
| `read_only` | read redacted overview, health, audit, workflow, and readiness projections | no state-changing command or unredacted detail |

The capability names planned for V1 are:

```text
admin.roles.manage
admin.overview.read
admin.accounts.read
admin.commerce.read
admin.support.manage
admin.reports.read
admin.reports.regenerate
admin.workflow.retry
admin.storage.reconcile
admin.privacy.manage
admin.audit.read
admin.readiness.read
```

An unredacted sensitive-detail capability, endpoint, or UI is outside V1.
Any later proposal requires a separate founder-approved privacy threat model,
field-class allowlist, case-linking policy, short-lived response contract, and
dedicated audit evidence.

## Data Minimization

Console list and overview projections use opaque identifiers, states,
timestamps, aggregate counts, bounded error codes, and carefully selected
account references. They do not return raw private source records.

By default, the console must not display:

- credentials, complete environment maps, provider secrets, password hashes,
  session tokens, actor tokens, or signed URLs;
- full birth-profile payloads, raw chart/vendor payloads, full evidence sets,
  complete report bodies, or unbounded provider error bodies;
- full names, full email addresses, precise birth location, or payment
  instrument/provider metadata when a masked value or state is sufficient.

Support and operations detail views use redacted fields by default. A detail
view may provide immutable IDs, state history, error codes, policy outcome,
and references to the source aggregate. Full report bodies remain confined to
the owner-authorized report flow, not the console.

## Command Model

Every privileged read is authorized in the private API and records access
metadata sufficient for investigation without storing private payloads.
Every state-changing command includes:

```ts
type AdminCommandContext = {
  actorId: string;
  roleAssignmentId: string;
  capability: string;
  reasonCode: string;
  requestId: string;
  traceId: string;
  idempotencyKey: string;
  expectedVersion?: number;
  supportCaseId?: string;
};
```

The private API validates command context before calling a domain service. The
domain service validates policy and aggregate version, writes the domain
record/state transition and audit record atomically, and inserts an outbox
event when asynchronous work is needed. Duplicate idempotency keys return the
original safe result. Version mismatch returns a conflict without mutation.

Console commands are limited to these compensating operations:

- request a policy-eligible report regeneration, which reserves a new report
  version and emits `report.generation.requested.v1`;
- request a policy-eligible workflow retry, which creates a new retry request
  and a versioned outbox event rather than requeueing a BullMQ job;
- request a storage reconciliation scan through `storage.reconcile.v1`;
- record a refund review or an approved refund outcome through the commerce
  domain service; provider execution remains outside V1 unless a reviewed
  provider contract explicitly supports it;
- request privacy export, deletion, or deletion-status remediation through
  the existing privacy state machine;
- record a support case or policy decision; and
- request one policy-eligible same-person input correction within 24 hours,
  which references a proposed birth-profile revision and creates new
  chart/report lineage rather than rewriting prior versions.

Commands never write domain tables directly from a controller, mutate immutable
versions, enqueue directly into BullMQ, or invoke arbitrary queue/job actions.

## Modules And Interfaces

The implementation decomposes console code by feature and keeps planned
backend and UI source files below 200 lines where practical:

| Module | Private API projection | Command boundary |
|---|---|---|
| Overview and health | aggregate metrics and safe dependency/workflow health | none |
| Accounts and profiles | redacted account, verification, retention, profile/chart summary | none |
| Commerce and support | orders, payments, entitlements, support cases, refund records | support case, correction, refund-review/record commands |
| Reports and workflow | report lineage, attempts, bounded error codes, outbox and queue-derived state | regeneration and policy-checked retry requests |
| Assets and delivery | storage, replication, notification, and delivery state | reconciliation request only |
| Privacy and audit | export/delete status and immutable audit records | privacy workflow requests |
| Readiness | route/content/indexing configuration and verification state | none |

## User Experience

The console is an operational tool, not a marketing page. It uses compact
navigation, dense sortable/filterable tables, stable responsive grid behavior,
accessible status labels with text and color, keyboard-reachable controls, and
explicit confirmation for dangerous commands. Read-only state is visually
distinct from command forms. Each command confirmation presents its target,
reason code, expected effect, and irreversibility warning where applicable.

The console has no public link, hero, campaign copy, or CMS-style editing
surface. Mobile remains usable for triage and approvals without collapsing
identifiers, status, or confirmation context.

## Audit And Retention

Each audit row stores actor, role assignment, capability, operation,
aggregate type/ID, request ID, trace ID, idempotency key where applicable,
reason code, policy result, before/after version references, and a redacted
result summary. Audit rows are append-only. They never contain secrets, raw
birth/chart payloads, report bodies, or signed URLs.

Privileged reads record the requested projection type, target aggregate IDs,
authorization outcome, request/trace ID, and redaction level. Sensitive
detail reveal is not implemented in V1.

## Release Evidence

Phase 05A closure requires:

- server-side non-admin denial for every `/admin/**` route and API operation;
- `live_noindex`, robots, public-navigation, and every-sitemap exclusion tests;
- Better Auth verified-session and database-backed role/capability matrix tests;
- PII/redaction tests proving no unredacted reveal capability, endpoint, or UI;
- command-context, idempotency, expected-version, and audit-completeness tests;
- immutable report/chart/asset record tests;
- direct queue/requeue and direct-table-write denial tests;
- outbox-mediated retry, reconciliation, regeneration, refund-record, and
  privacy-workflow tests;
- production-like admin incident E2E covering a failed report, safe
  regeneration, delivery/reconciliation visibility, support case, audit trail,
  and non-admin denial.

Phase 06 consumes this evidence for paid-release readiness. Free-MVP deployment
evidence does not satisfy the paid-release gate.
