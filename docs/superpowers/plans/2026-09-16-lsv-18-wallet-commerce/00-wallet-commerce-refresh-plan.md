# LSV-18 Wallet, Commerce, and Secure Preview Refresh Plan

**Date:** 2026-09-16
**Ticket:** LSV-18
**Baseline inspected:** `8a6eec4`
**Historical plan inspected read-only:** `69ac12e` / stale PR #55
**Status:** Refreshed planning artifact. This document authorizes no runtime,
migration execution, dependency change, deployment, provider activation, or UI
implementation by itself.

## 1. Authority, Current Baseline, and Superseded Assumptions

The founder's 2026-09-14 Kaneo decision authorizes provider-independent Lá
ledger, balance, spend, unlock, entitlement, idempotency, and redacted
projections. It also fixes the free-preview budget at three sections per chart,
24,000 billable tokens per chart, 3,000 VND per chart, one rewrite per section,
and a teaser fallback at a cap or generation failure. Top-up/payment-provider
activation remains deferred. Legal, accounting, and privacy questions remain
release gates rather than blockers for the bounded provider-independent slices.

This plan follows FD-059, FD-061, FD-063 through FD-068, FD-067's finance
gate, FD-081/FD-085, and the repository policy. In particular:

- A locked section's plaintext is never delivered to an unauthorized client in
  JSON, HTML, React payloads, metadata, accessibility content, print output,
  logs, analytics, or a client-side data cache.
- Purchased and promotional Lá are separate, non-expiring for the first
  release, non-transferable, non-withdrawable, append-only, and spend
  promotional Lá before purchased Lá.
- Content prices are Lá-only. VND is visible only for a top-up pack, payment
  order, and invoice. No public Lá/VND exchange rate is published.
- A top-up invoice is issued when a provider-confirmed top-up is recorded; an
  Lá-funded content unlock never issues a second invoice. Revenue is recognized
  at purchased-Lá spend, while unspent purchased Lá remains deferred revenue.
  Promotional Lá never becomes revenue.
- Analytics is the delivered first-party LSV-12 path under FD-081/FD-085.
  It is not a source of wallet balances, entitlement, revenue, or access
  control.

The `69ac12e` plan is stale in the following material ways and must not be
implemented literally:

1. It targets obsolete branch flow and reserves migrations `0026` through
   `0030`. Baseline already contains migrations through
   `0033_report_assets_and_report_failure_delivery.sql`; the next migration is
   **`0034_wallet_commerce_foundation.sql`**.
2. It treats LSV-10, LSV-11, LSV-12, LSV-13, LSV-15, LSV-17, and LSV-36 as
   future queue items. Their delivered contracts now exist and are integration
   inputs, not work owned by this ticket.
3. It assumes a direct `master` feature workflow. Current repository policy
   requires a dedicated branch, PR to `product/experience-spec-v1`, then a
   release PR to `master`.
4. It contains old analytics assumptions. FD-081 and delivered LSV-12 govern
   analytics; no LSV-18 slice may add a second sink, visitor identifier, or
   event store.

## 2. Existing Integration Inputs

| Delivered work | Verified current source | LSV-18 consequence |
|---|---|---|
| LSV-10 business metrics | `packages/backend/src/admin-business-metrics/business-metrics.sql.ts` | Its current query is direct-order based. A later LSV-18 slice must extend it to read ledger allocations and deferred revenue; analytics events are not a substitute. |
| LSV-11 AI cost and budget guard | `packages/contracts/src/ai-cost-v1.ts`, `packages/backend/src/reports/free-identity-preview.ts` | The budget constants and fail-closed `hasUnknownCost` behavior are reused. LSV-18 owns persistent generated-preview orchestration only, not AI cost collection or pricing. |
| LSV-12 analytics | `packages/backend/src/analytics/` and `packages/database/src/schema/analytics.ts` | Wallet commands may emit only already-approved, minimized events through the delivered sink after its consent/identity gates. They must not store wallet facts in analytics or create another tracking identity. |
| LSV-13 claims | `config/public-claims.json` and `docs/superpowers/plans/2026-09-14-lsv-13-claim-registry.md` | The finance-gated invoice wording remains non-publishable. No LSV-18 slice may publish it. |
| LSV-15 section generator | `packages/backend/src/reports/comprehensive-report-section-writer-v4.ts` | Generated previews reuse section-generation contracts after LSV-15's report-quality and lifecycle gates. They do not invent a parallel writer. |
| LSV-17 ReadingContext | `packages/contracts/src/reading-context-v1.ts` and report reservation context fields | Preview section selection may consume only the frozen, enum-only context through the established report lifecycle boundary. It never uses free text or makes context commercially determinative. |
| LSV-36 report/PDF delivery | `packages/database/drizzle/0033_report_assets_and_report_failure_delivery.sql` and report asset contracts | Lá unlock creates the existing entitlement/reservation/outbox chain; it does not bypass report asset ownership, download authorization, or recovery. |

## 3. Target Model and Compatibility

### 3.1 Historical compatibility

Existing `commerce_orders`, `commerce_entitlements`, `report_reservations`,
report versions, invoices, payment events, and order-history projections remain
readable and immutable.

- Historical rows are `content_purchase` by compatibility, not rewritten.
- Historical `credit_applied`, `credited_from_order_id`, and
  `credit_expires_at` retain their current direct-VND upgrade meaning and are
  read-only. A Lá Tier-1-to-Tier-2 upgrade is a distinct 720-Lá price rule; it
  must not apply those old VND credits a second time.
- A new entitlement has exactly one authority source: legacy `order_id` or
  new `ledger_spend_id`. Database constraints, not only service code, enforce
  exclusive-or ownership. Existing order-backed entitlement rows remain valid.
- A `wallet_topup` is a top-up order only. It has no chart, chart version,
  report SKU, report reservation, or entitlement. A content unlock has a
  ledger spend and no new VND content order or invoice.

### 3.2 Wallet accounting

One wallet belongs to one verified, non-anonymous account. Anonymous actors
cannot receive, hold, spend, transfer, or buy Lá.

The ledger is authoritative. A wallet account's paid and promotional balances
are cached, non-negative reconciliation values whose sum must equal posted
ledger entries. Each durable command writes a transaction, signed entries, a
receipt, and the existing redacted audit evidence atomically.

Top-up grants create separate purchased and promotional credit lots. Spend
uses promotional lots first. It then uses purchased lots FIFO by grant time and
stable lot ID. Each consumed purchased amount records its exact purchased-Lá
and recognized-VND allocation. Promotional consumption records zero recognized
VND. A reversal references the original spend and allocations and restores the
same bucket and lots; it never guesses a contemporary price or converts Lá at
runtime.

The approved catalog is server versioned:

| Pack | VND | Purchased Lá | Promotional Lá |
|---|---:|---:|---:|
| `LA-ENTRY-300` | 29,000 | 300 | 0 |
| `LA-START-1100` | 99,000 | 1,000 | 100 |
| `LA-DISCOVER-3000` | 249,000 | 2,500 | 500 |
| `LA-LIBRARY-8000` | 599,000 | 6,000 | 2,000 |

The approved content-price rule is 240 Lá for Tier 1, 960 Lá for Tier 2, and
720 Lá for an eligible Tier-1-to-Tier-2 upgrade. Individual-palace pricing
remains a hypothesis and is excluded.

### 3.3 Atomicity, idempotency, and recovery

Every mutation accepts a server-validated actor, reason code, request/trace ID,
idempotency key, and expected state version where a mutable intent or wallet
state is addressed. The command repository revalidates active account authority
inside its transaction before receipt replay or mutation.

The transaction order for a sufficient-balance unlock is:

1. lock the wallet and purchase intent;
2. replay a matching receipt or reject an idempotency-key fingerprint mismatch;
3. validate current owner, chart/version ownership, SKU, price rule, upgrade
   eligibility, intent state, and expected version;
4. consume promotional then purchased lots without a negative balance;
5. insert the immutable ledger spend and purchased-Lá revenue allocations;
6. insert the entitlement with `ledger_spend_id`;
7. create the existing report reservation and outbox event when the SKU
   requires generation;
8. complete the intent, persist the bounded deterministic receipt, and append
   redacted audit evidence in the same transaction.

Matching retries replay exactly one result. Conflicting retries return a stable
error. Transaction failure rolls back debit, entitlement, reservation, outbox,
receipt, and audit together. A post-commit worker/report failure is handled by
the existing LSV-36/report recovery path; it is not grounds to silently re-debit
or create a duplicate entitlement. Any business reversal is a compensating,
idempotent ledger command with audit evidence, never a ledger-row update or
queue requeue.

### 3.4 Provider-deferred top-ups and invoices

The data model supports a `wallet_topup` order and provider-event association,
but no LSV-18 provider-independent slice enables checkout, bank details,
webhooks, provider credentials, payment instructions, or automatic top-up
granting.

When a future provider activation is explicitly authorized, the confirmation
transaction must atomically deduplicate the authenticated provider event, mark
the top-up paid, issue the immutable invoice, grant purchased/promotional
credit lots, persist the receipt/audit, and optionally mark a separate intent
ready. The subsequent unlock is independently retryable and idempotent. A
return URL never confirms payment or mutates balance.

Refund or chargeback policy where purchased credit has already been spent is a
provider-activation release gate. The provider-independent ledger must expose
the data necessary to freeze affected spending and classify an unrecoverable
negative-recovery case, but it must not invent an automatic refund rule.

### 3.5 Redacted projections and privacy

Customer and admin projections use strict versioned contracts:

- Customer balance exposes only the total and paid/promotional Lá counts; it
  never exposes provider IDs, invoice numbers, bank data, cost allocations, or
  internal ledger references.
- Customer history exposes command category, Lá delta, resulting balances,
  relevant product title, and time. It excludes raw audit payloads and
  provider/payment data.
- Admin projections are private capability-gated views. They return aggregates
  and bounded, redacted operational projections only; they never expose birth
  facts, generated report plaintext, payment instrument data, provider raw
  payloads, session data, or unbounded command receipts.
- Analytics does not receive raw wallet balances, ledger IDs, chart IDs,
  invoice numbers, provider identifiers, generated preview content, or
  ReadingContext values. Existing LSV-12 field denylists remain authoritative.

## 4. Secure Generated Preview Boundary

The current `FreeIdentityPreviewV1` is structural and has legacy VND offers.
LSV-18 must preserve that V1 contract for historical clients and introduce
strict `FreeIdentityPreviewV2` and paid-topic V2 Lá-only contracts rather than
weakening V1 or sending a complete generated report to the web client.

For each chart/version, persistent preview state contains only:

- the selected generated section identifiers and immutable server-side source
  reference;
- authorized server-rendered plaintext for unlocked/currently permitted
  snippets;
- a server-derived clipped excerpt boundary for a locked section;
- generation status, budget reservation/usage reference, and failure reason;
- no client-visible full locked section, prompt, response, source snapshot
  content, or provider raw payload.

The server chooses up to three LSV-15 section keys from chart facts and the
frozen enum-only ReadingContext. Before every provider call it loads current
usage through LSV-11, rejects unknown cost, reserves within the exact
three-section / 24,000-token / 3,000-VND limit, and permits at most one rewrite
per section. It repeats LSV-17 lifecycle/ownership validation before every
provider call. Any preflight denial, provider error, validation failure,
ownership/lifecycle failure, or cap outcome returns the deterministic
structural teaser; it does not expose partial locked plaintext.

The rendering projection uses deterministic content bounds rather than
display-dependent line counts. It NFC-normalizes the selected narrative,
chooses the first eligible non-heading paragraph, skips its first complete
sentence, and emits the next two through four complete sentences while the
result remains between 280 and 520 Unicode code points. If no candidate meets
those bounds, the server returns the structural teaser. The server never cuts
inside a Unicode code point or includes text beyond the selected sentences.
Later UI work may visually clamp the already-safe excerpt to 3–6 lines, but
line layout is not a security or persistence boundary.

The client receives only that display-safe segment plus lock metadata, never a
CSS-blurred complete paragraph. Print, metadata, accessibility labels, SSR/RSC
payloads, preload data, error payloads, logs, analytics, and PDF pipelines must
all be characterized to prove that locked plaintext is absent.

## 5. Bounded, Disjoint Implementation Slices

No slice may edit files owned by another slice in this plan. New files listed
below are owned by that slice. Required package exports, Drizzle registration,
migration metadata, application registration, and worker registration are
owned by the slice that first requires them; there is no deferred wiring slice.
This makes every completed slice buildable and testable from its declared
prerequisites.

### 18A: Wallet and Preview Contract/Migration Foundation

**May begin without further founder input:** yes. The 2026-09-14 decision
authorizes this provider-independent foundation. It still requires the normal
Terra high milestone review before integration and no migration execution until
deployment authorization.

**Owned files:**

- Create `packages/contracts/src/wallet-commerce-v1.ts`
- Create `packages/contracts/src/wallet-commerce-v1.test.ts`
- Create `packages/contracts/src/commerce-report-v2.ts`
- Create `packages/contracts/src/commerce-report-v2.test.ts`
- Create `packages/contracts/src/generated-preview-v1.ts`
- Create `packages/contracts/src/generated-preview-v1.test.ts`
- Create `packages/contracts/src/free-identity-preview-v2.ts`
- Create `packages/contracts/src/free-identity-preview-v2.test.ts`
- Modify `packages/contracts/src/commerce.ts`
- Modify `packages/contracts/src/commerce.test.ts`
- Modify `packages/contracts/src/jobs.ts`
- Modify `packages/contracts/src/jobs.test.ts`
- Modify `packages/contracts/src/index.ts`
- Create `packages/database/src/schema/wallet-commerce.ts`
- Create `packages/database/src/schema/wallet-commerce.test.ts`
- Create `packages/database/src/schema/generated-preview.ts`
- Create `packages/database/src/schema/generated-preview.test.ts`
- Modify `packages/database/src/schema/commerce.ts`
- Create `packages/database/drizzle/0034_wallet_commerce_foundation.sql`
- Create `packages/database/drizzle/0035_generated_preview_persistence.sql`
- Create `packages/database/drizzle/meta/0034_snapshot.json`
- Create `packages/database/drizzle/meta/0035_snapshot.json`
- Modify `packages/database/drizzle/meta/_journal.json`
- Modify `packages/database/drizzle.config.ts`
- Modify `packages/database/src/client.ts`
- Modify `packages/database/src/index.ts`
- Modify `packages/database/src/schema/commerce-migration-layout.test.ts`
- Modify `packages/database/src/schema/report-generation-migration-layout.test.ts`
- Modify `packages/database/src/schema/schema.integration.test.ts`

**Behavior:** define strict V2 compatibility projections, top-up catalog,
wallet balance/history, immutable transaction/entry/lot/allocation records,
purchase intents, receipts, top-up order kind, and the XOR entitlement source.
Define `AccountLibraryV2`, an order-backed-or-ledger-backed report query source,
wallet-safe terminal-failure/support V2, generated-preview state/event/job
contracts, and Lá-only free-preview/topic V2 while leaving every V1 schema
byte-for-byte compatible. The migrations are additive/backfill-safe and
preserve legacy reads. They add database checks, unique constraints, locking
indexes, generated-preview request/result state, and migration characterization
tests for historical order-backed rows.

This foundation slice owns all package/database wiring needed by both wallet
and generated-preview runtime slices: contract exports, schema exports,
Drizzle config, database client schema registration, journal entries, generated
snapshots, and full schema integration. Slice 18F therefore starts from usable
generated-preview contracts and tables rather than editing migration wiring
later.

**Acceptance:** no new runtime service; schema can represent the model above;
legacy contracts stay parseable; no contract publishes a Lá/VND exchange rate;
the next migrations are exactly `0034` and `0035`; clean package builds resolve
all new exports; a clean database and a database upgraded from `0033` converge
to the same schema; the journal and snapshots match both migrations.
`packages/contracts` and `packages/database` build and test successfully before
any 18B or 18F runtime file exists.

### 18B: Provider-Independent Ledger and Balance Service

**Prerequisite:** 18A integrated.

**Owned files:**

- Create `packages/backend/src/wallet/wallet.repository.ts`
- Create `packages/backend/src/wallet/wallet.repository.test.ts`
- Create `packages/backend/src/wallet/wallet.repository.integration.test.ts`
- Create `packages/backend/src/wallet/wallet.service.ts`
- Create `packages/backend/src/wallet/wallet.service.test.ts`

**Behavior:** implement account-only wallet reads, grants for a future
provider-confirmed top-up adapter, balance reconciliation, immutable receipts,
FIFO purchased-lot selection, promotional-first debit primitives, compensating
restoration primitives, and redacted internal projections. It has no provider
call, controller, UI, top-up activation, or direct queue operation.

**Acceptance:** concurrent debit attempts cannot make either bucket negative;
same idempotency key and fingerprint replay exactly one receipt; a different
fingerprint is rejected; cached balances equal ledger sums; redacted audit
records have no sensitive payment or chart data.

### 18C: Spend, Unlock, Entitlement, and Report Reservation Transaction

**Prerequisite:** 18A and 18B integrated.

**Owned files:**

- Create `packages/backend/src/commerce/wallet-unlock.service.ts`
- Create `packages/backend/src/commerce/wallet-unlock.service.test.ts`
- Create `packages/backend/src/commerce/wallet-unlock.repository.integration.test.ts`
- Modify `packages/backend/src/commerce/commerce.repository.ts`
- Modify `packages/backend/src/commerce/commerce.repository.integration.test.ts`
- Modify `packages/backend/src/reports/report-generation.repository.ts`
- Modify `packages/backend/src/reports/report-generation.repository.test.ts`
- Modify `packages/backend/src/reports/report-query.repository.ts`
- Create `packages/backend/src/reports/report-query.repository.integration.test.ts`
- Modify `packages/backend/src/reports/report-query.service.ts`
- Modify `packages/backend/src/reports/report-query.service.test.ts`
- Modify `apps/api/src/commerce/commerce.controller.ts`
- Modify `apps/api/src/commerce/commerce.controller.test.ts`
- Modify `apps/api/src/reports/reports.controller.ts`
- Modify `apps/api/src/reports/reports.controller.test.ts`
- Modify `apps/web/src/features/reports/load-report.ts`
- Modify `apps/web/src/features/reports/load-report.test.ts`

**Behavior:** create/validate purchase intents and execute the atomic
promotional-first spend, entitlement, existing report reservation, and outbox
transaction. Existing direct-VND checkout stays operational and its historical
upgrade behavior remains untouched.

The existing `CommerceController` gains authenticated headless V2 routes for
wallet balance, wallet history, purchase-intent creation, and wallet unlock.
It uses the already-exported commerce repository factory, whose implementation
composes the 18B wallet service internally; no new controller registration or
package-root export is required. Visual wallet, checkout, and paywall work
remains excluded.

Report authorization must stop requiring an inner-joined order. It resolves an
exclusive source:

- `order_id`: preserve all current order, chart-version, paid/refund, invoice,
  locale, SKU, evidence, and owner congruence checks;
- `ledger_spend_id`: validate the active, non-reversed spend, intent, wallet
  owner, entitlement owner, chart/version, SKU, locale, evidence, reservation,
  and report-version lineage without manufacturing an order row.

The existing `AccountLibraryV1` and `OrderHistoryV1` schemas and endpoints
remain unchanged for historical direct-VND data. Add
`GET /commerce/account/library-v2`, returning `AccountLibraryV2` with
`source: "order" | "ledger_spend"` and nullable `orderId`; both source types
remain readable in one library projection. Wallet unlocks appear in the V2
library and wallet history, never as a fabricated VND content order or second
invoice.

Pending and ready report views remain compatible. An order-backed terminal
failure continues to return the exact existing `ReportFailedViewV1` with its
real invoice lineage. A wallet-backed terminal failure returns the strict V2
failure projection from 18A with `purchaseSource: "wallet_spend"`, no
`invoiceNumber` field, and a bounded support reference derived from the report
ID rather than any ledger or top-up invoice identifier. The reports controller
and non-visual web loader accept the compatibility union; visual failure UI is
explicitly excluded.

**Acceptance:** a wallet-funded entitlement has `order_id = null` and a
non-null ledger spend; historical entitlements remain order-backed; exactly one
debit, entitlement, reservation, outbox record, receipt, and audit exists
under concurrent/matching retries; failed transaction leaves all absent; report
generation never sees a reservation without a valid entitlement. Repository,
service, API, and loader tests prove owner isolation, reversed-spend denial,
mixed entitlement scope union, V1 historical stability, V2 wallet library
readability, terminal-failure support without a synthetic invoice, and
customer wallet responses without provider payload, invoice number, ledger
allocation, report plaintext, raw chart identifier, or audit receipt.

### 18E: Top-Up Order Separation, Feature-Off Provider Adapter Contract, and Invoice Projection

**Prerequisite:** 18A and 18B integrated.

**Owned files:**

- Create `packages/backend/src/commerce/wallet-topup.service.ts`
- Create `packages/backend/src/commerce/wallet-topup.service.test.ts`
- Create `packages/backend/src/commerce/wallet-topup.repository.integration.test.ts`
- Modify `packages/backend/src/commerce/order.service.ts`
- Modify `packages/backend/src/commerce/order.service.test.ts`
- Modify `packages/backend/src/commerce/payment-provider.ts`

**Behavior:** model top-up orders separately from report orders and expose a
feature-off provider-neutral confirmation contract. It may validate catalog,
invoice projection shape, and future confirmation inputs in tests, but does not
wire SePay, payment instructions, webhook routes, bank credentials, or enabled
top-up creation.

**Acceptance:** `wallet_topup` cannot have report/chart fields or create an
entitlement; a content unlock cannot issue a second invoice; disabled provider
configuration returns a stable feature-off response and performs no synthetic
autopay grant; no unapproved invoice line copy is publicly emitted.

### 18F: Persistent Generated Preview and Server-Safe Projection

**Prerequisite:** LSV-11 cost data/pricing release gate, LSV-15 section
generator reliability gate, LSV-17 lifecycle fence, and 18A integrated.

**Owned files:**

- Create `packages/backend/src/reports/generated-preview.service.ts`
- Create `packages/backend/src/reports/generated-preview.service.test.ts`
- Create `packages/backend/src/reports/generated-preview.repository.ts`
- Create `packages/backend/src/reports/generated-preview.repository.test.ts`
- Create `packages/backend/src/reports/generated-preview.repository.integration.test.ts`
- Modify `packages/backend/src/reports/free-identity-preview.ts`
- Modify `packages/backend/src/reports/free-identity-preview.test.ts`
- Modify `packages/backend/src/ziwei/ziwei.service.ts`
- Modify `packages/backend/src/ziwei/ziwei.service.test.ts`
- Modify `packages/backend/src/ziwei/ziwei-query.repository.ts`
- Modify `packages/backend/src/ziwei/ziwei-query.service.ts`
- Modify `packages/backend/src/ziwei/ziwei-query.service.test.ts`
- Modify `packages/backend/src/outbox/outbox.dispatcher.ts`
- Modify `packages/backend/src/outbox/outbox.dispatcher.test.ts`
- Modify `packages/backend/src/jobs/queue.registry.ts`
- Create `packages/backend/src/jobs/queue.registry.test.ts`
- Modify `packages/backend/src/index.ts`
- Modify `apps/api/src/api.module.ts`
- Modify `apps/api/src/ziwei/ziwei.controller.test.ts`
- Create `apps/worker/src/processors/generated-preview.processor.ts`
- Create `apps/worker/src/processors/generated-preview.processor.test.ts`
- Modify `apps/worker/src/worker.module.ts`
- Modify `apps/worker/src/worker.module.test.ts`
- Modify `apps/worker/src/main.ts`
- Modify `apps/worker/src/health/worker-heartbeat.ts`
- Modify `apps/worker/src/health/worker-heartbeat.test.ts`

**Behavior:** persist generated-section metadata and authorized server
projections; introduce V2 Lá-only preview/topic contracts while retaining V1
read compatibility; reuse LSV-11 preflight/usage and LSV-15 section generation;
return the structural teaser on every guard/failure path.

The persisted trigger/read path is:

1. after chart evidence persistence succeeds, `ziwei.service.ts` calls the
   preview request service;
2. the request repository transaction idempotently inserts one request for
   `(chartVersionId, previewVersion)` and one
   `preview.generation.requested.v1` outbox event;
3. the existing outbox dispatcher validates the 18A event contract and
   publishes one `preview.generate.v1` row into `report_queue_jobs`;
4. the generated-preview worker claims only that job name, revalidates the
   chart/profile lifecycle before every provider call, applies LSV-11 budget
   reservations, invokes the LSV-15 section writer, validates output, persists
   only approved section state and deterministic safe excerpts, and marks the
   job processed;
5. authorized `GET /ziwei/charts/:chartId/preview` reads the persisted V2
   projection. When no request exists, it performs the same idempotent request
   as a repair path for historical charts or a prior trigger failure and
   immediately returns the structural teaser with pending/fallback state.

A primary preview-request failure does not turn an otherwise successful chart
calculation into an error. The chart remains readable with its structural
preview, and the authorized read repair retries durable request creation.

The outbox claim predicate, queue registry, worker heartbeat, worker polling
cycle, backend exports, and API dependency wiring all include the preview path
in this slice. A preview failure never enters paid-report terminal-failure or
support-case state. Cap, invalid output, lifecycle denial, provider failure,
lease loss, and retry exhaustion persist a bounded preview fallback reason and
serve the structural teaser. This slice creates no visual blur component, no
browser cache, no PDF content, and no analytics payload containing generated
text.

**Acceptance:** exhaustive HTTP/SSR/RSC/print/accessibility/error/log
characterization proves unauthorized clients cannot obtain locked plaintext;
three-section/token/cost/rewrite caps remain deterministic under concurrent
requests; a failed attempt cannot cause later cap bypass; ReadingContext is
only enum-derived and never persisted into analytics. Tests prove concurrent
primary and repair triggers create one request/event/job, duplicate outbox
dispatch is harmless, only one worker lease can commit the result, stale leases
cannot overwrite a winner, every terminal path serves the teaser, and V1 reads
remain available for historical clients. After 18A, the backend, API, and
worker packages build and test with 18F alone; no later export, Drizzle, module,
or polling-cycle patch is required to make the feature runnable.

### 18G: Transaction-Derived Revenue, Deferred Revenue, and Contribution-Margin Reconciliation

**Prerequisite:** 18A, 18B, 18C, and 18E integrated. LSV-11's
model-pricing/FX approval remains a release gate for contribution margin.

**Owned files:**

- Modify `packages/backend/src/admin-business-metrics/business-metrics.sql.ts`
- Modify `packages/backend/src/admin-business-metrics/business-metrics.repository.ts`
- Modify `packages/backend/src/admin-business-metrics/business-metrics.repository.integration.test.ts`
- Modify `packages/backend/src/admin-business-metrics/business-metrics.service.ts`
- Modify `packages/backend/src/admin-business-metrics/business-metrics.service.test.ts`
- Modify `packages/backend/src/ai/ai-cost.ts`
- Modify `packages/backend/src/ai/ai-cost.test.ts`
- Modify `packages/contracts/src/admin-business-metrics-source-availability.ts`
- Create `packages/contracts/src/admin-business-metrics-source-availability.test.ts`
- Modify `packages/contracts/src/admin-business-metrics.ts`
- Modify `packages/contracts/src/ai-cost-v1.ts`
- Modify `packages/contracts/src/ai-cost-v1.test.ts`
- Modify `apps/api/src/admin-overview/admin-business-metrics.controller.test.ts`

**Behavior:** make recognized revenue derive from purchased-Lá spend
allocations, deferred revenue from unspent purchased lots, and refunds/reversals
from compensating allocations. Preserve legacy direct-VND reporting for
historical orders. Exclude promotional Lá, disabled autopay, and analytics from
authoritative revenue. Keep the current private/redacted metrics boundary.

Change `laWalletAccounting` in
`AdminBusinessMetricsSourceAvailabilityV1Schema` from an unavailable-only
object to a strict available/unavailable union. The available projection
contains aggregate integers only: `topUpVnd`, `purchasedLaGranted`,
`promotionalLaGranted`, `purchasedLaOutstanding`, `deferredRevenueVnd`,
`recognizedLaRevenueVnd`, `promotionalLaSpend`, and
`reversedRecognizedRevenueVnd`. It contains no account, order, invoice, chart,
ledger transaction, lot, allocation, or provider identifier. Existing
`admin-business-metrics.ts` and package-root exports continue exporting the
same named source-availability contract; focused contract tests import it both
directly and through `packages/contracts/src/index.ts`.

The repository returns wallet aggregates and source completeness separately
from daily legacy metrics. The service marks the wallet source available only
when reconciliation succeeds and every required aggregate is known; otherwise
it returns the existing redacted unavailable branch with a bounded reason code.
The existing `admin.commerce.read` controller authorization and audit path are
unchanged.

**Acceptance:** revenue reports reconcile legacy direct-VND rows plus wallet
allocation rows without double counting; deferred revenue matches unspent
purchased credit; promotional spend has zero recognized VND; reversals are
visible and idempotent; unknown AI cost keeps the margin result incomplete or
fail-closed as the existing LSV-11 contract requires. Contract, service,
repository, and controller tests prove the available and unavailable branches,
root export availability, redaction, capability denial without source queries,
and exact aggregate reconciliation.

## 6. Rollout, Rollback, and Release Gates

1. Deploy additive schema only after a rehearsal against a production-shaped
   backup and historical compatibility tests. Keep all new write paths disabled.
2. Deploy provider-independent read/reconciliation code with no public wallet
   UI or top-up write path. Prove historical orders, library, report reads, and
   admin projections remain byte/contract compatible.
3. Enable internal ledger/reconciliation commands only after concurrent
   idempotency, non-negative balance, and allocation reconciliation smoke
   evidence passes.
4. Enable Lá content spend only after entitlement/reservation/outbox/recovery
   smoke verifies one successful end-to-end report generation and a failure
   compensating path.
5. Do not enable top-up provider paths until founder-authorized sandbox
   transaction evidence, authenticated callback validation, invoice issuance,
   duplicate callback replay, refund/chargeback disposition, and finance/tax
   wording confirmation are complete.
6. Do not enable generated previews until LSV-11 pricing/FX is approved,
   preview cap evidence is recorded, generated plaintext boundary tests pass,
   LSV-15/17 lifecycle checks are live, and three founder-selected reports are
   manually reviewed.
7. Visual paywalls, pack selection, wallet presentation, and blur interaction
   remain UI-artifact work. They cannot be added by these slices.

Rollback means disabling new command routes/feature flags and stopping new
wallet writes while retaining immutable ledger, entitlement, invoice, receipt,
and audit data. Never delete or rewrite posted ledger rows, issued invoices,
historical orders, report output, or migration history. A reconciliation
mismatch opens the affected write circuit and escalates; it is not repaired by
manual balance edits.

## 7. Required Verification

Each slice must run its focused contract/unit/integration tests, producer builds
before dependent typechecks, relevant API/worker tests, and `git diff --check`.

The milestone suite additionally requires:

- database migration upgrade and characterization tests from `0033`;
- concurrency tests for duplicate and conflicting idempotency keys;
- balance/lot/allocation reconciliation tests;
- legacy order, entitlement, report library, and invoice compatibility tests;
- authorization, anti-enumeration, redaction, audit, and no-direct-queue tests;
- generated-preview boundary tests across API JSON, SSR/RSC payload, metadata,
  print, accessibility, error, logging, and analytics instrumentation;
- deterministic preview-budget tests using injected time and exact cost/token
  fixtures; and
- target-environment smoke evidence before a Kaneo task moves to `Done`.

## 8. Explicit Exclusions

- Provider credentials, bank/payment setup, webhook activation, DNS, external
  configuration, invoice issuance in production, and payment confirmation.
- Customer-facing wallet/checkout/paywall/blur UI and any CSS/component work.
- New analytics storage, consent flow, tracking identity, or third-party
  analytics provider.
- Public finance/tax claim publication before FD-067 wording confirmation.
- Single-palace product pricing, transferability, withdrawal, expiry, or a
  published Lá/VND exchange rate.

## 9. Founder Decisions Still Required

The provider-independent slices may start without another founder product
decision. The following are true unresolved founder/expert gates:

1. **FD-067 finance/tax confirmation:** approve the exact Vietnamese and
   English invoice line wording for the Lá service credit before public
   publication or provider activation.
2. **Legal review:** confirm the permitted/prohibited commercial presentation
   table in progressive-reveal specification section 18.1 before public wallet
   and conversion UI activation.
3. **Provider activation:** explicitly authorize the selected payment-provider
   configuration, authenticated sandbox transaction, callback verification, and
   operational refund/chargeback policy before enabling top-ups.
4. **LSV-11 pricing/FX source:** approve the model-price and FX source before
   contribution-margin or generated-AI-preview production activation.
5. **Generated content review:** approve three generated preview/report samples
   and the live 20-consecutive-generation evidence gate before public generated
   preview activation.
