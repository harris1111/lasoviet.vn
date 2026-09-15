# LSV #10 Transaction-Derived Business Metrics Plan

## Scope

Create tested, private, server-authorized business and operations projections
directly from commerce, wallet, report, and outbox state. Do not derive money
metrics from behavioral analytics or add a visual dashboard in this ticket
branch.

## Metric Contract

`BusinessMetricsV1` uses bounded UTC date ranges and reports Vietnam-local
calendar buckets with explicit timezone metadata.

### Money and wallet

- top-up orders created, paid, expired, failed, refunded;
- confirmed top-up VND cash;
- invoices issued;
- purchased and promotional Lá granted/spent/restored;
- recognized revenue from immutable paid-credit allocations;
- deferred revenue as remaining paid-lot allocation value after approved
  refundable cash, with an explicit restricted-shortfall bucket;
- promotional spend reported as discount, never revenue; and
- wallet reconciliation mismatch count and amount.

Recognized revenue uses the exact paid-lot micro-VND allocation vector defined
in the #18 plan. Refund allocation is FIFO within the source top-up: first
unspent paid-lot value, then exact consumed allocation IDs only when the
approved refund policy permits reversal. Each refund allocation is immutable
and unique; repeated commands replay their receipt. Deferred revenue is the
remaining paid-lot allocation value after the first class of approved refunds;
cash beyond reversible value is restricted shortfall and is not subtracted
again. Promotional balances are excluded. A projection is incomplete, not
zero, when a legacy lot lacks allocation provenance.

Rows sourced from any payment event whose `provider_event_id` starts with
`disabled-autopay:` are excluded from cash, revenue, deferred revenue, and
margin. The exclusion follows the source top-up lot through later spend
allocations.

### Operations

- payment unmatched and age;
- pending payment over one hour;
- expired QR orders;
- self-claim success/failure;
- funded intent pending/failed/compensated;
- report ready/failed and paid-to-ready latency percentiles;
- Tier-1-to-Tier-2 upgrade within seven days;
- repeat top-up and repeat content unlock; and
- refunds and wallet restrictions.

Support tickets per 100 orders is returned as `unavailable` until a
repository-authoritative support-case source exists. It must never return
zero as a substitute.

### Cohort rules

Daily cash cohorts use top-up `created_at`. Revenue is attributed to the
source paid-credit lot and recognized at spend time. Upgrade counts use the
price-rule and entitlement lineage, not legacy `credit_applied`. All ranges
use half-open intervals and an injected clock.

## Admin Boundary

Add a dedicated `admin.business_metrics.read` projection contract and private
API. It returns aggregates and bounded timestamps only: no name, birth data,
free-text question, `chart_id`, report body, raw provider payload, IP, or
visitor ID. Authorization and read-audit evidence use the existing trusted
private API path. The new capability is seeded by the owned additive
`0030_business_metrics_capability.sql` migration and is included in the
approved role-to-capability matrix; no application code may assume it exists
without the seed.

Visual dashboard rendering waits for the UI artifact branch.

## Bounded Flash Executor Slices

### 10A: Authoritative repository queries

**Owned files:** `packages/backend/src/business-metrics/business-metrics.repository.ts`,
`packages/backend/src/business-metrics/business-metrics.repository.test.ts`,
`packages/backend/src/business-metrics/business-metrics.service.ts`,
`packages/backend/src/business-metrics/business-metrics.service.test.ts`.

**Behavior:** implement the definitions above from source tables with bounded
filters and explicit unavailable states.

**Acceptance:** disabled-autopay exclusion follows lots; bonus is not revenue;
revenue timestamp is spend time; deferred revenue reconciles exactly.

**Checks:** focused repository/service tests including real PostgreSQL,
backend build, `git diff --check`.

### 10B: Redacted private admin contract

**Owned files:** `packages/contracts/src/business-metrics.ts`,
`packages/contracts/src/business-metrics.test.ts`,
`packages/contracts/src/admin-auth.ts`,
`packages/contracts/src/admin-auth.test.ts`,
`packages/database/drizzle/0030_business_metrics_capability.sql`,
`packages/database/src/schema/admin-access.ts`,
`packages/backend/src/admin-access/capability.service.ts`,
`packages/backend/src/admin-access/capability.service.test.ts`,
`apps/api/src/admin-overview/admin-business-metrics.controller.ts`,
`apps/api/src/admin-overview/admin-business-metrics.controller.test.ts`.

**Behavior:** capability-gated aggregate read with bounded filters and
redacted audit evidence. Extend the canonical closed capability enum in
`admin-auth.ts`, not a second capability contract, and add
`admin.business_metrics.read` to the founder-approved role matrix. Define the
extensible `BusinessMetricsV1` response with an explicit unavailable CM30
section; #11 fills that section later without changing this contract,
controller, or shared module ownership.

**Acceptance:** capability removal stops source queries and omits data;
denied/missing responses expose no aggregate or source detail.

**Checks:** contracts/backend/API tests and builds in dependency order,
security projection tests, `git diff --check`.

QI adds the contract export and API module registration. This slice does not
edit a shared barrel or `apps/api/src/api.module.ts`. The migration inserts
only the new capability/policy rows using the repository's existing idempotent
seed pattern, with exact role rows selected by the founder before
implementation. #10 is allowed this one migration solely for the capability
seed and active policy entry.

### 10C: Claim handoff

**Owned files:** no public copy. Produce a claim input entry in the #13
inventory only after #13 starts.

**Behavior:** supply the exact transaction-data privacy disclosure from Kaneo
#10 and its route inventory.

**Acceptance:** no public wording changes before founder claim approval.
