# LSV #11 AI Usage Cost and CM30 Plan

## Scope

Record every AI provider attempt, price it with immutable versioned evidence,
and combine it with #10 revenue for 30-day contribution margin before support
cost. No prompt, response, birth data, chart content, or evidence content is
stored in usage tables.

## Usage Contract

Every provider call receives a server-generated `aiCallId` and context:

- purpose: report section, rewrite, critic, free preview, or capability probe;
- attempt/retry ordinal and parent call;
- provider/model;
- report/order/entitlement/preview opaque linkage where applicable;
- requested max output tokens;
- started/completed timestamps and outcome; and
- provider-reported input, output, and cached tokens.

The adapter records an attempt in a `finally` boundary. Non-2xx responses,
timeouts, malformed responses, retries, and critic calls all create records.
If the provider does not return billable usage, the record is
`usage_status: "unknown"`, never zero.

## Pricing and Historical Cost

`config/ai-model-pricing.yml` is versioned by provider, model, currency,
effective-from timestamp, and per-million input/output/cached token rates.
At call completion, the service selects the effective row and persists its
pricing version plus calculated cost in integer micros. Historical rows never
reprice when config changes.

If pricing currency is not VND, the same config row must reference an approved
versioned FX source and rate. Missing pricing or FX makes cost unknown and
marks CM30 incomplete.

Network failures may consume billable tokens without returning usage. The
production provider-dependent gate therefore requires either provider billing
evidence for failed calls or an explicitly founder-approved conservative
accounting rule. Until then, the projection exposes unknown COGS and must not
publish a complete margin.

The usage contract includes `billingEvidenceRef` and
`billingEvidenceStatus: "provider_reported" | "provider_reconciled" | "unknown"`.
Fixtures cover a successful usage payload, a timeout with provider billing
evidence supplied out of band, and a network failure with no evidence. The
last case remains unknown and blocks a complete CM30 result.

## CM30

For each top-up cohort created in the selected period, use the half-open
30-day window from order creation:

```text
recognized purchased-Lá revenue
- cash refunds and unlock revenue reversals
- all linked AI COGS, including retry/error/critic/free-preview calls
- allocated payment fee
= CM30 before support cost
```

Promotional Lá is excluded from revenue. `disabled-autopay:` source lots are
excluded. Existing AI COGS remains after a refund. SePay fee is zero under the
current approved free plan, but the model supports a versioned monthly fixed
fee allocated across paid top-ups. Infrastructure and support cost remain
outside this metric.

The projection separately reports Tier 1 report COGS, Tier 2 report COGS,
free-preview COGS per chart, unknown-cost call count, and completeness status.

Free-preview calls have no revenue cohort at creation. Their usage record
keeps an opaque actor/profile/chart attribution key. If that identity later
has a verified-account top-up for the same profile/chart within 30 days, the
preview COGS is assigned exactly once to the earliest qualifying top-up
cohort. Otherwise it remains in an `unattributed_free_preview` bucket and is
reported separately, never silently assigned to a later purchaser.

## Bounded Flash Executor Slices

### 11A: Pricing contract and usage schema

**Owned files:** `config/ai-model-pricing.yml`,
`packages/config/src/ai-model-pricing.ts`,
`packages/config/src/ai-model-pricing.test.ts`,
`packages/contracts/src/ai-usage.ts`,
`packages/contracts/src/ai-usage.test.ts`,
`packages/database/src/schema/ai-usage.ts`,
`packages/database/drizzle/0028_ai_usage_cost.sql`,
`packages/database/src/schema/ai-usage-schema.integration.test.ts`.

**Behavior:** validate effective-dated prices/FX and add immutable usage/cost
records with unknown status.

**Acceptance:** no content columns; price changes do not alter history; empty
and upgraded databases converge.

**Checks:** config/contracts/database tests, migration integration, producer
builds, `git diff --check`.

### 11B: Provider attempt recording

**Owned files:** `packages/backend/src/ai/ai-provider.ts`,
`packages/backend/src/ai/openai-compatible-adapter.ts`,
`packages/backend/src/ai/openai-compatible-adapter.test.ts`,
`packages/backend/src/ai/ai-usage.repository.ts`,
`packages/backend/src/ai/ai-usage.repository.test.ts`,
`packages/backend/src/ai/ai-usage.service.ts`,
`packages/backend/src/ai/ai-usage.service.test.ts`.

**Behavior:** record every attempt and retry, parse provider usage, price it,
and preserve unknown usage honestly.

**Acceptance:** success, retry, terminal error, timeout, malformed response,
and critic tests each create the expected immutable records; prompt/response
are absent; unknown billing evidence blocks complete cost reporting.

**Checks:** focused AI/backend tests, report generation regression tests,
backend/worker builds and typechecks, `git diff --check`.

QI owns the contracts/database/backend exports and worker registration. 11A
and 11B expose local schemas/factories and do not edit shared barrels or
module files.

### 11C: Contribution-margin projection

**Prerequisite:** integrated #10 `BusinessMetricsV1`.

**Owned files:** `packages/backend/src/business-metrics/contribution-margin.repository.ts`,
`packages/backend/src/business-metrics/contribution-margin.repository.test.ts`,
`packages/backend/src/business-metrics/contribution-margin.service.ts`,
`packages/backend/src/business-metrics/contribution-margin.service.test.ts`.

**Behavior:** populate the already-versioned `BusinessMetricsV1` CM30 section
and COGS breakdown through the #10-owned service/controller boundary. This
slice does not edit shared contracts, controllers, barrels, or module wiring.

**Acceptance:** retry/error/critic COGS is included; refund keeps AI COGS;
bonus and disabled-autopay revenue are excluded; unknown usage prevents a
complete-margin claim.

**Checks:** focused margin integration tests, contracts/backend/API builds,
`git diff --check`.

## Provider-Dependent Gate

Before 11B receives a production adapter brief, Sol must verify and record the
exact 9router response fields for successful and failed usage, model identity,
billing currency, and effective price source. A no-file/sandbox probe is
allowed only after plan approval and must not contain real customer data.
