# LSV #18 Wallet, Commerce, and Secure Preview Plan

## Scope

Replace new direct-VND content purchases with shared Lá funding and spending
while preserving every historical order and entitlement. Add provider-neutral
generated-preview persistence and projection, but keep all visual UI and
production activation out of this ticket branch.

## Contract Decisions

### Orders and invoices

- Add `orderKind: "content_purchase" | "wallet_topup"`.
- Backfill existing rows as `content_purchase`.
- `content_purchase` requires `chart_id`, `chart_version_id`, and content
  `sku`; it remains the historical compatibility path.
- `wallet_topup` requires `topup_pack_id`, forbids chart fields and content
  `sku`, and may reference an unlock intent.
- Replace the pending uniqueness rule with a partial index applying only to
  content-purchase rows.
- Add a unique server-generated order idempotency key for all new writes.
- Every state-changing command carries actor ID, reason code, request ID, trace
  ID, idempotency key, and expected version where applicable. A command
  receipt stores the deterministic result and append-only audit reference in
  the same transaction; matching retries replay the receipt without a second
  audit.
- Keep `invoice_number` immutable. A new immutable invoice-issue record is
  created only when a top-up payment is confirmed. It snapshots pack, line
  item, VND amount, currency, and issue time.
- No invoice is created for a Lá spend.

### Wallet journal

Use one wallet per durable account. Anonymous actors cannot fund or spend.

- `wallet_accounts` stores reconciliable paid/promotional cached balances,
  status, and version.
- `wallet_ledger_transactions` is append-only and idempotent.
- Each command receipt records `actor_id`, `reason_code`, `request_id`,
  `trace_id`, `idempotency_key`, optional `expected_version`, result status,
  bounded result payload, and audit-log reference. The receipt and domain
  mutation are committed atomically.
- The audit-log reference uses the existing trusted `auditLogs` append path;
  no new public audit-write endpoint or parallel audit schema is introduced.
- `wallet_ledger_entries` stores signed integer Lá deltas per bucket.
- `wallet_paid_credit_allocations` links paid-bucket spends to top-up grant
  entries using deterministic FIFO and snapshots exact recognized VND.
- Promotional entries are consumed before paid entries.
- Restorations reference the exact consumed entries and allocations, restoring
  the original buckets and reversing the exact recognized revenue.
- Database row locking and optimistic versioning prevent negative balances.
- Cached balances must equal the ledger sum; the ledger is authoritative.

Pack grants are:

| Pack ID | VND | Paid Lá | Promotional Lá |
|---|---:|---:|---:|
| `LA-ENTRY-300` | 29,000 | 300 | 0 |
| `LA-START-1100` | 99,000 | 1,000 | 100 |
| `LA-DISCOVER-3000` | 249,000 | 2,500 | 500 |
| `LA-LIBRARY-8000` | 599,000 | 6,000 | 2,000 |

Content prices are versioned server data: Tier 1 is 240 Lá, Tier 2 is 960 Lá,
and an eligible Tier-1-to-Tier-2 upgrade is a direct 720-Lá price. The wallet
does not apply or subtract a second upgrade credit. Existing
`credit_applied`, `credited_from_order_id`, and `credit_expires_at` fields stay
read-only for historical VND orders.

### Purchase intent and entitlement

`commerce_purchase_intents` snapshots owner, chart/version, SKU, scope,
price-Lá, price-rule version, eligibility deadline, a closed return target,
and idempotency key.

`commerce_entitlements` gains nullable `ledger_spend_id`; exactly one of
`order_id` or `ledger_spend_id` must be present. Existing entitlements remain
order-backed. New entitlements are spend-backed.

Add `CommerceOrderV2`, `WalletBalanceV1`, `WalletLedgerEntryV1`,
`WalletHistoryV1`, `PurchaseIntentV1`, and `AccountLibraryV2` contracts.
`WalletTopupCatalogV1` is defined in `commerce-wallet-v1.ts` and exposes pack
IDs, VND amounts, paid Lá, promotional Lá, and catalog version without
publishing a Lá/VND exchange rate. External micro-VND values are decimal
strings; database storage uses PostgreSQL `bigint` and application arithmetic
uses `bigint`, while existing VND order amounts remain integer VND.
`OrderHistoryV1` remains unchanged for legacy content orders. The V2 order
history includes paid top-ups with `kind: "wallet_topup"` and omits them from
the report library. The V2 library represents a spend-backed entitlement with
`orderId: null` and `source: "ledger_spend"`; an order-backed legacy item keeps
its non-null order ID and `source: "order"`. Every V2 projection is strict and
has an explicit schema version.

If the wallet has enough Lá, one transaction:

1. locks the wallet and intent;
2. spends promotional then paid Lá;
3. records paid-lot revenue allocations;
4. inserts the entitlement;
5. inserts the report reservation when required;
6. emits the report outbox event; and
7. marks the intent complete.

Retries return the original deterministic receipt without another debit,
entitlement, audit, reservation, or outbox event.

### Top-up continuation and recovery

Payment confirmation atomically records the provider event, marks the top-up
paid, issues the invoice, grants both Lá buckets, and emits an intent-
fulfillment event. Intent fulfillment is separately retryable so a valid
top-up remains safely credited even if the content workflow is unavailable.

After five attempts using leases of two minutes and backoffs of 30 seconds,
two minutes, ten minutes, and thirty minutes, an undelivered Lá unlock reaches
`INTENT_RETRY_EXHAUSTED`. Compensation is fenced by the intent version:
revoke only the undelivered entitlement, restore the exact buckets, reverse
recognized revenue, mark the intent compensated, and open the content-sales
circuit. Existing successfully delivered ownership is never hidden by a
feature flag.

A top-up refund whose credits have already been spent must not create a
negative balance. For an approved refund amount, allocate refund value FIFO
against unspent paid-lot allocation values, then against exact consumed
allocation IDs only when the approved policy permits revenue reversal. Each
allocation can be reversed once; promo value is zero. Any cash refund beyond
the approved reversible value is recorded as a restricted shortfall, never
subtracted twice from deferred revenue, and restricts further wallet writes.
Delivered entitlements remain intact until the founder-approved refund policy
says otherwise. Final customer debt/entitlement policy remains a founder plus
legal/finance decision and blocks production refund activation.

### Revenue allocation vector

Revenue allocation is deterministic at the paid-lot level. For each top-up
lot, store `lotVndAmount`, `paidLaAmount`, and a versioned integer
micro-VND allocation vector. Promotional Lá has zero recognized value. The
paid-lot vector divides `lotVndAmount * 1,000,000` across exactly
`paidLaAmount` units using quotient/remainder: the first remainder units get
one extra micro-VND, and the vector sum equals the invoice amount exactly.
Spending consumes paid lots FIFO after promotional lots and records the exact
unit allocations consumed. Restoration reuses those same allocation IDs.
Reports round only at presentation boundaries; ledger and accounting
reconciliation use PostgreSQL `bigint` micro-VND values and decimal-string
contract fields.

Examples: `LA-ENTRY-300` has 300 paid units over 29,000 VND, while
`LA-START-1100` has 1,000 paid units over 99,000 VND plus 100 zero-value
promotional units. Spending two promotional units and one paid unit produces
zero and one exact lot allocation; it never assigns bonus units a share of
revenue.

## Secure Generated Previews

Introduce `FreeIdentityPreviewV2`; retain V1 unchanged for compatibility.
V2 uses Lá-only content offers and a strict union:

- `full_free`: authorized complete free section;
- `generated_locked`: authorized excerpt plus 3-6 irreversible fade-line
  widths and safe metadata; or
- `structural_locked`: deterministic fallback with no generated prose.

No V2 field can carry locked continuation text. The server chooses and clips
the excerpt before serialization. Print, metadata, and accessibility
projections receive only the authorized excerpt and a locked-state
description.

### Pre-generation baseline

The plan baseline is three generation units per eligible chart:

1. `overview`, fully readable;
2. `coreAxis`, locked preview; and
3. one context-mapped thematic unit, or `strengthsAndTensions` when no reading
   context exists.

The hard cap is the lower of three provider calls and 3,000 VND projected
maximum COGS per chart. Before each call, the service calculates the
worst-case call cost from the versioned #11 pricing table and token budget. If
the next call could exceed the cap, it stops and emits structural fallbacks.
Actual usage still records through #11. Any missing/unknown price disables
pre-generation rather than treating cost as zero.

Generated units are immutable by chart version, section-generator version,
prompt/config/knowledge versions, locale, and reading-context version. A paid
report may reuse only an exact version match that already passed the same
schema, evidence, locale, and quality gates. Anonymous units share the chart's
24-hour purge and immediate-delete lifecycle; account linking transfers
ownership without duplication.

This slice depends on the FD-073 section generator and #11 usage recorder.
Until both are integrated, V2 returns `structural_locked`.

## Provider Boundaries

Provider-independent work includes contracts, schemas, wallet arithmetic,
idempotency, invoice snapshots, purchase intents, entitlement sourcing,
preview projection, admin projections, and all tests using local fixtures.

Provider-dependent work includes SePay top-up activation, authenticated
sandbox callbacks/refunds, and real AI usage/pre-generation. Missing provider
credentials block only those adapters and external smokes. They do not block
provider-independent implementation or tests.

## Bounded Flash Executor Slices

### 18A: Versioned catalog and contracts

**Owned files:** `config/product-catalog.json`,
`packages/config/src/product-catalog.ts`,
`packages/config/src/product-catalog.test.ts`,
`packages/contracts/src/commerce.ts`,
`packages/contracts/src/commerce.test.ts`,
`packages/contracts/src/free-identity-preview-v2.ts`,
`packages/contracts/src/free-identity-preview-v2.test.ts`,
`packages/contracts/src/commerce-wallet-v1.ts`,
`packages/contracts/src/commerce-wallet-v1.test.ts`.

**Behavior:** add pack/content price rules, V2 order/wallet/intent/invoice
contracts, wallet-history, and spend-backed-library contracts, plus preview V2
without changing V1 parsing.

**Acceptance:** no Lá/VND exchange-rate field; legacy fixtures still parse;
upgrade is exactly 720 Lá; single-palace SKU remains unavailable.

**Checks:** focused contract/config Vitest, contracts/config builds,
`git diff --check`.

### 18B: Additive wallet and source migrations

**Owned files:** `packages/database/src/schema/commerce.ts`,
`packages/database/src/schema/wallet.ts`,
`packages/database/drizzle/0026_la_wallet_and_order_sources.sql`,
`packages/database/src/schema/commerce-migration-layout.test.ts`,
`packages/database/src/schema/commerce-wallet-schema.integration.test.ts`.

**Behavior:** add order kind checks, top-up fields, invoice issues, purchase
intents, wallet journal/allocation tables, command receipts, entitlement
source XOR, append-only guards, non-negative cached balances, and PostgreSQL
`bigint` columns for micro-VND allocation values.

**Acceptance:** migration upgrades current schema without fabricating invoice
issue timestamps; legacy rows remain valid; empty and upgraded databases
converge.

**Checks:** migration layout tests, Testcontainers schema integration,
database build, `git diff --check`.

### 18C: Wallet repository and arithmetic

**Owned files:** `packages/backend/src/wallet/wallet.repository.ts`,
`packages/backend/src/wallet/wallet.repository.test.ts`,
`packages/backend/src/wallet/wallet.service.ts`,
`packages/backend/src/wallet/wallet.service.test.ts`,
`packages/backend/src/wallet/wallet-reconciliation.ts`,
`packages/backend/src/wallet/wallet-reconciliation.test.ts`.

**Behavior:** idempotent grants, promo-first spends, FIFO paid allocations,
exact restorations, concurrent non-negative writes, and reconciliation.

**Acceptance:** concurrent spends cannot overspend; replay is byte-stable;
revenue allocation and restoration reconcile exactly to `bigint` micro-VND
units; each state-changing command has one atomic receipt and audit record.

**Checks:** focused unit/integration/concurrency tests, backend build,
`git diff --check`.

### 18D: Top-up, invoice, and provider confirmation

**Owned files:** `packages/backend/src/commerce/topup.service.ts`,
`packages/backend/src/commerce/topup.service.test.ts`,
`packages/backend/src/commerce/order.service.ts`,
`packages/backend/src/commerce/commerce.repository.ts`,
`packages/backend/src/commerce/commerce.repository.integration.test.ts`,
`packages/backend/src/commerce/sepay-webhook.service.ts`,
`packages/backend/src/commerce/sepay-webhook.service.test.ts`,
`apps/api/src/commerce/commerce.controller.ts`,
`apps/api/src/commerce/commerce.controller.test.ts`.

**Behavior:** create verified-account top-up orders, confirm payment into
invoice plus wallet grants, preserve self-claim, and emit intent fulfillment.

**Acceptance:** provider replay grants once; `disabled-autopay:` never becomes
recognized revenue; top-up has no chart; content spends issue no invoice.
Provider selection uses the closed environment enum. Success, error, and
cancel URLs are navigation-only and cannot confirm payment. A callback is
accepted only after authenticated validation of order identity, state, amount,
and currency.

**Checks:** commerce/API focused tests, payment integration tests, backend/API
build/typecheck, `git diff --check`.

### 18E: Atomic spend, entitlement, reservation, and recovery

**Owned files:** `packages/backend/src/wallet/purchase-intent.service.ts`,
`packages/backend/src/wallet/purchase-intent.service.test.ts`,
`packages/backend/src/wallet/purchase-intent.repository.ts`,
`packages/backend/src/wallet/purchase-intent.repository.integration.test.ts`,
`packages/backend/src/wallet/wallet-intent-jobs.ts`,
`packages/backend/src/wallet/wallet-intent-jobs.test.ts`,
`apps/worker/src/processors/wallet-intent.processor.ts`,
`apps/worker/src/processors/wallet-intent.processor.test.ts`.

**Behavior:** persist intent, debit/grant/reserve atomically, retry funded
intents, and compensate terminal undelivered unlocks.

**Acceptance:** kill/retry creates one spend, entitlement, reservation, and
outbox event; a failed transaction creates none; insufficient balance returns
the smallest covering pack without creating an order automatically. The
receipt includes actor, reason, request/trace IDs, expected version, and
idempotency key; exhausted recovery produces exactly one fenced compensation
and audit result.

**Checks:** jobs/outbox/wallet integration tests, worker/backend builds and
typechecks in dependency order, `git diff --check`.

### 18F: Generated-preview persistence and projection

**Prerequisites:** integrated #11 usage recorder and FD-073 section generator.

**Owned files:** `packages/database/src/schema/generated-previews.ts`,
`packages/database/drizzle/0027_generated_locked_previews.sql`,
`packages/backend/src/reports/generated-preview.repository.ts`,
`packages/backend/src/reports/generated-preview.repository.test.ts`,
`packages/backend/src/reports/generated-preview.service.ts`,
`packages/backend/src/reports/generated-preview.service.test.ts`,
`packages/backend/src/reports/free-identity-preview.ts`,
`packages/backend/src/reports/free-identity-preview.test.ts`,
`packages/backend/src/ziwei/ziwei-query.service.ts`,
`packages/backend/src/ziwei/ziwei-query.service.test.ts`,
`apps/worker/src/processors/generated-preview.processor.ts`,
`apps/worker/src/processors/generated-preview.processor.test.ts`.

**Behavior:** generate/reuse up to three units under the cap, persist exact
version lineage, return V2 safe excerpts/fade metadata, and purge with charts.

**Acceptance:** source/API/React serialization scans find no locked
continuation; unknown price or cap exhaustion yields structural fallback; paid
reuse requires exact lineage.

**Checks:** preview security tests, serialization leak scans, anonymous purge
integration using an injected/frozen clock, worker/backend builds,
`git diff --check`.

### 18G: Private reads and kill switches

**Owned files:** `packages/backend/src/wallet/wallet-query.service.ts`,
`packages/backend/src/wallet/wallet-query.service.test.ts`,
`apps/api/src/wallet/wallet.controller.ts`,
`apps/api/src/wallet/wallet.controller.test.ts`,
`packages/config/src/environment-schema.ts`,
`packages/config/src/environment-schema.test.ts`.

**Behavior:** owner-only balance/history reads, server-only
`off|read_only|topup|spend` gates, and redacted operational status.

**Acceptance:** disabling writes does not hide balances/history/entitlements;
anonymous and cross-owner reads disclose nothing.

**Checks:** focused API/security/config tests, producer-consumer build order,
`git diff --check`.

## Shared File Ownership

To keep direct-to-`master` PRs mergeable, feature files have one owner:

- 18D owns `packages/backend/src/commerce/order.service.ts`,
  `packages/backend/src/commerce/commerce.repository.ts`, and
  `apps/api/src/commerce/commerce.controller.ts`.
- 18E owns only its wallet-intent jobs/processors; 18F owns only its generated-
  preview jobs/processors.
- QI owns all root barrels, `apps/api/src/api.module.ts`,
  `apps/worker/src/worker.module.ts`, the shared outbox dispatcher, and the
  central schema integration suite.

No slice may modify another slice's owned file. Sol must reissue a narrowed
brief if a required integration cannot be expressed through the assigned
boundary.

## UI Artifact Handoff

The dedicated UI branch will own pack cards, insufficient-balance sheets,
balance/history surfaces, locked-preview blur/fade, banking return, and
accessibility focus behavior. It must use `FreeIdentityPreviewV2`,
`WalletBalanceV1`, `WalletTopupCatalogV1`, and `PurchaseIntentV1`; it must
never receive or reconstruct locked plaintext.
