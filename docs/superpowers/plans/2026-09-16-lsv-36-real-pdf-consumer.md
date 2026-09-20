# LSV-36 Real PDF Consumer Implementation Plan

Date: 2026-09-16

## Status And Baseline

This is a planning-only artifact. The approved scope prepares the real PDF
consumer; it does not authorize runtime implementation, dependency changes,
migrations, provider activation, deployment, merge, or production access.

Baseline: this plan is a snapshot, not an implementation baseline pin. Before
implementation, rebase the assigned branch onto the current
`origin/product/experience-spec-v1`, inspect the live Drizzle journal and
current product contracts, and derive the migration number and integration
points from that rebased state. Do not use a SHA or migration number recorded
in this plan.

Verified facts:

- `report_versions` persists immutable `html_content`, a reserved
  `pdf_asset_id`, and render version. Its successful generation transaction
  inserts `report.pdf.requested.v1`.
- `identity-report-pdf.v1` is current. LSV-36 reserves
  `identity-report-pdf.v2`; the consumer must support both exact literals
  without regenerating historical HTML.
- The outbox dispatcher, queue contracts, and worker currently consume only
  report-generation events. No `report_assets` table, Garage service/S3
  client, PDF renderer, local font asset, or PDF runtime consumer exists.
- The Phase 05 contract requires private Garage storage, opaque keys,
  checksum adoption, worker-local temporary artifacts, owner-authorized
  download, and preservation of ready HTML during PDF/Garage failure.
- The LSV-19 reader artifact/screenshot manifest is absent from this baseline.
  This consumer adds no reader visual UI and does not claim the V4.1
  activation smoke.

## Architecture

The consumer has one authoritative path:

1. A committed `report.pdf.requested.v1` carries only report ID, immutable
   report-version ID, reserved asset ID, and `identity-report-pdf.v1` or
   `identity-report-pdf.v2`.
2. The successful HTML-validation transaction performs a CAS from
   `html_ready` to `pdf_pending`, reserves the asset, and inserts
   `report.pdf.requested.v1`. The CAS predicate includes the report state and
   state version; a failed predicate inserts neither a new asset nor an event.
   This replaces any implementation that treats `html_ready` as sufficient to
   enqueue PDF work.
3. The dispatcher creates an idempotent `report.pdf.render.v1` job using
   `pdf-render:{assetId}:{renderVersion}`. The worker resolves all HTML,
   ownership, object key, and state from PostgreSQL.
4. The worker renders the already committed immutable HTML with Chromium,
   bundled Vietnamese fonts, and deterministic PDF metadata. It writes only a
   worker-local temporary file, computes SHA-256 and byte length, and removes
   the file in `finally`.
5. A private Garage S3-compatible adapter uses a fresh immutable object key for
   each fenced storage attempt. It can adopt a matching prior candidate key;
   otherwise it uploads checksum metadata under the fresh key and never
   overwrites an object from another attempt. Objects written by losing or
   expired attempts remain orphans for later reconciliation.
6. Only after Garage metadata verification does one successful
   asset-storage transaction CAS the leased asset to `stored`, transition the
   report from `pdf_pending` to `complete`, insert `report.asset.stored.v1`,
   and create the `report_ready` notification with stable idempotency
   `report-ready-email:{reportVersionId}:{recipientAccountId}`. This
   explicitly replaces the current immediate notification creation at HTML
   commit: no `report_ready` notification exists before Garage success, and a
   retry/adoption cannot create a second notification.
7. A server-authorized download ingress resolves the current account owner and
   stored asset. After private API owner authorization, the web BFF streams or
   proxies the PDF server-side; it never returns the short-lived internal
   Garage signed URL to the browser. Object keys and signed URLs never enter
   queue payloads or logs.

`report_assets` is the authoritative metadata/state record. It may reserve an
opaque placeholder key derived only from `assetId`, then records the fresh
immutable object key assigned under each lease attempt. Its fenced finalization
atomically persists the one winning stored key in PostgreSQL. It also stores
render version, media type, SHA-256, byte length, attempts, bounded error
code, lease and state version, and Garage verification metadata. Its initial
implementation uses `render_pending`, `rendering`, `rendered`, `storing`,
`stored`, and `store_retryable_failure`, plus `terminal_failure`; replica
fields remain `replica_disabled`. Later Phase 05 replication/deletion work owns
replica, orphan reconciliation, and tombstone transitions.

The only PDF/Garage failure codes for this consumer are:

| Class | Retryable codes | Immediately terminal codes |
| --- | --- | --- |
| PDF | `PDF_RENDER_FAILED`, `PDF_TEMP_CLEANUP_FAILED` | `PDF_FONT_MISSING`, `PDF_RENDER_VERSION_UNSUPPORTED` |
| Garage | `GARAGE_UNAVAILABLE` | `ASSET_CHECKSUM_MISMATCH`, `ASSET_KEY_CONFLICT` |

This table contains only processor/storage failures persisted on the asset.
`ASSET_FORBIDDEN` and `SIGNED_URL_EXPIRED` remain the required P05-T02
non-persistent private-download request errors: they do not update asset or
report state, consume processor attempts, or enter the bounded persisted error
code. Retryable failures retain their code and bounded attempt count. When the
configured retry budget is exhausted, they take the same fenced terminal path
with their retained code; no unbounded or ad hoc error code is persisted.
`PDF_FONT_MISSING` is the binding literal for a missing or unloaded required
font face and is never replaced by `PDF_FONT_UNAVAILABLE`.

The terminal path is a dedicated `finalizePdfTerminalFailure` transaction,
not a side effect of a catch block. It requires the current asset lease token,
asset state/version in an eligible PDF or Garage processing state, and report
state/version `pdf_pending`; it CASes the asset and report to
`terminal_failure`, preserves immutable HTML, and records the bounded failure
code and stage (`pdf` or `garage`). In that same fenced transaction, it creates
exactly one persisted PDF/Garage support case, inserts exactly one
`report.fulfillment.failed.v1` with idempotency
`report-failed:{reportVersionId}:{failureStage}` and the created non-null
`supportCaseId` in its payload, inserts one pending `report_failed`
notification, and creates the required `report_terminal_failure` operational
alert. The failed notification uses
`report-failed-email:{reportVersionId}:{recipientAccountId}:{failureStage}`,
contains only safe status and a support link, and is later delivered through
the existing durable notification-maintenance consumer. A stale lease, changed
state/version, or duplicate terminalization commits none of the asset/report
terminalization, support case, event, notification, or alert. Neither a
transient error nor a direct external-storage exception may create any of
these records outside this fence.

`ReportFulfillmentFailedV1` remains compatible with current generation and
validation terminalization: those stages continue to accept their existing
absent or null `supportCaseId` until their separately owned workflow supplies
one. The schema must reject a PDF or Garage terminal payload unless
`supportCaseId` is a non-empty string. This is a stage-discriminated contract
rule, not a global non-null migration that would alter existing
generation/validation behavior.

The durable `report_failed` delivery is not a second outbox queue event.
`report.fulfillment.failed.v1` remains the terminal workflow event; the
outbox dispatcher maps only `report.pdf.requested.v1` to
`report.pdf.render.v1` for this consumer. The terminal transaction inserts the
notification row directly with the other fenced records, and the existing
maintenance runner claims pending `report_ready` and `report_failed`
deliveries through the same idempotent email state machine.

Renderer dispatch is exact and versioned:

| Stored render version | Renderer | Input | Result |
| --- | --- | --- | --- |
| `identity-report-pdf.v1` | `renderIdentityReportPdfV1` | stored immutable HTML | PDF artifact |
| `identity-report-pdf.v2` | `renderIdentityReportPdfV2` | stored immutable HTML | PDF artifact |
| any other literal | none | none | reject with `PDF_RENDER_VERSION_UNSUPPORTED`; do not render or mutate HTML |

No renderer regenerates, transforms, or replaces the stored HTML. The
processor reads the stored literal and dispatches only through this matrix.

## Implementation Slices

### Slice 1: Contracts, Asset Schema, And Dispatch

Owned files:

- Create `packages/contracts/src/report-assets.ts`
- Create `packages/contracts/src/report-assets.test.ts`
- Modify `packages/contracts/src/auth-email.ts`
- Create `packages/contracts/src/auth-email.test.ts`
- Modify `packages/contracts/src/jobs.ts`
- Modify `packages/contracts/src/jobs.test.ts`
- Modify `packages/contracts/src/index.ts`
- Create `packages/database/src/schema/assets.ts`
- Create `packages/database/src/schema/support-cases.ts`
- Modify `packages/database/src/schema/notifications.ts`
- Modify `packages/database/src/schema/reports.ts`
- Modify `packages/database/drizzle.config.ts`
- Modify `packages/database/src/index.ts`
- Modify `packages/database/src/runtime.ts`
- Modify `packages/database/src/schema/schema.integration.test.ts`
- Create `packages/database/drizzle/00XX_report_assets_and_report_failure_delivery.sql`
- Create `packages/database/drizzle/meta/00XX_snapshot.json`
- Modify `packages/database/drizzle/meta/_journal.json`
- Modify `packages/database/src/schema/report-generation-migration-layout.test.ts`
- Modify `packages/backend/src/reports/report-version.repository.ts`
- Modify `packages/backend/src/reports/report-version.repository.test.ts`
- Modify `packages/backend/src/reports/report.service.ts`
- Modify `packages/backend/src/reports/report.service.test.ts`
- Modify `packages/backend/src/outbox/outbox.dispatcher.ts`
- Modify `packages/backend/src/outbox/outbox.dispatcher.test.ts`
- Modify `packages/backend/src/reports/report-state.test.ts`

Allocate `00XX` only after rebasing onto the current
`origin/product/experience-spec-v1` and inspecting the live Drizzle journal.
Do not reserve a number in this plan. This avoids collision with LSV-16 or
any intervening migration.

The one additive migration creates `report_assets` and `support_cases`, adds
`report_failed` to `notification_delivery_kind`, and contains the related
foreign keys, uniqueness, bounded-status/error checks, and indexes. The
support-case row is a redacted operational record with report/report-version,
asset, stage, and bounded error-code lineage; it contains no HTML, chart,
provider response, or customer email. Its unique terminal lineage prevents a
second PDF/Garage support case for the same report version and failure stage.
Register both new schemas in `drizzle.config.ts`, export their tables and
enums from `packages/database/src/index.ts`, and export the runtime tables
required by backend repositories from `packages/database/src/runtime.ts`.

Define strict `ReportPdfRequestedV1`, `ReportPdfRenderJobV1`,
`ReportAssetStoredV1`, `ReportFailedEmailRequestV1`, and
`ReportFulfillmentFailedV1` schemas. Accept only the exact v1/v2 render
literals, not an arbitrary render-version string. Make
`ReportFulfillmentFailedV1` stage-discriminated: `pdf` and `garage` require a
non-empty `supportCaseId`; existing `generation` and `validation` payloads
continue to accept absent/null `supportCaseId`. Extend
`PersistedEmailDeliveryRequestSchema` and canonicalization with
`report_failed`, carrying the stable idempotency key, recipient, locale, safe
support action URL, request ID, `reportId`, `reportVersionId`, failure stage,
and non-empty `supportCaseId`; reject internal error detail and all unneeded
report/chart content. `ReportFailedEmailRequestV1` is the typed persisted
request for the logical `email.report-failed.v1` dispatch; it does not create
a second outbox or queue envelope.

Reserve the asset row and opaque key in the same transaction that persists
HTML, CASes `html_ready` to `pdf_pending`, and inserts the request event.
Move the current immediate `report_ready` insertion out of
`report-version.repository.ts`: successful generation/validation still commits
the immutable HTML, asset reservation, and PDF request with its existing
generation semantics, but creates no ready or failed delivery. Keep the
existing generation/validation terminal event behavior intact. Extend the
dispatcher claim condition, parser, and queue publisher so only a valid
`report.pdf.requested.v1` publishes the idempotent
`report.pdf.render.v1` job; `report.fulfillment.failed.v1` is not claimed or
published as a job.

Focused checks:

- a committed HTML report creates exactly one reserved asset and one PDF event;
- replaying the request event produces one `report.pdf.render.v1` queue job;
- a v1 and a v2 event retain their exact immutable render version;
- the `html_ready` to `pdf_pending` CAS creates the reservation/request once,
  while a stale or duplicate CAS creates neither;
- invalid render version or duplicate asset/event fails closed.
- a `generation` or `validation` failure payload preserves its present
  nullable/absent `supportCaseId` behavior, while every PDF/Garage payload
  without a non-empty `supportCaseId` fails contract validation;
- the additive migration, schema registration, database exports, and runtime
  exports expose `report_assets`, `support_cases`, and `report_failed`
  notification kind exactly once;
- HTML generation/validation no longer inserts `report_ready`, and the
  existing generation/validation terminalization does not acquire a new
  support-case requirement.

### Slice 2: Provider-Independent Renderer And Consumer

Owned files:

- Create `packages/backend/src/pdf/pdf-renderer.ts`
- Create `packages/backend/src/pdf/pdf-renderer.test.ts`
- Create `packages/backend/src/pdf/report-print-template.ts`
- Create `packages/backend/src/pdf/assets/fonts/BeVietnamPro-*.woff2`
- Create `packages/backend/src/storage/object-store.ts`
- Create `packages/backend/src/storage/asset.repository.ts`
- Create `packages/backend/src/storage/asset.service.ts`
- Create `packages/backend/src/storage/asset.service.test.ts`
- Create `packages/backend/src/support/support-case.repository.ts`
- Create `packages/backend/src/support/support-case.repository.test.ts`
- Create `packages/backend/src/support/support-case.service.ts`
- Create `packages/backend/src/support/support-case.service.test.ts`
- Modify `packages/backend/src/jobs/queue.registry.ts`
- Modify `packages/backend/src/reports/report.service.ts`
- Modify `packages/backend/src/reports/report-state.test.ts`
- Create `apps/worker/src/processors/pdf-render.processor.ts`
- Create `apps/worker/src/processors/pdf-render.processor.test.ts`
- Modify `apps/worker/src/processors/report-generate.processor.ts`
- Modify `apps/worker/src/worker.module.ts`
- Modify `apps/worker/src/worker.module.test.ts`
- Modify `apps/worker/src/main.ts`
- Modify `apps/worker/src/health/worker-heartbeat.ts`
- Modify `apps/worker/src/health/worker-heartbeat.test.ts`
- Modify `packages/backend/src/notifications/auth-email.ts`
- Modify `packages/backend/src/notifications/auth-email.test.ts`
- Modify `packages/backend/src/maintenance/phase-one-maintenance.ts`
- Modify `packages/backend/src/maintenance/phase-one-maintenance.test.ts`
- Modify `packages/backend/src/index.ts`
- Modify `packages/backend/package.json`
- Modify `apps/worker/package.json`
- Modify `pnpm-lock.yaml`
- Modify `pnpm-workspace.yaml` only if pnpm 11 requires an exact reviewed
  `allowBuilds` entry.
- Modify `tests/jobs/report-worker-state.integration.test.ts`

Before implementation, Sol records the exact package/version and the
task-relevant Playwright Chromium install path, browser executable lookup,
font-loading mechanism, S3 SDK imports, and worker image lifecycle. The
implementation must stop if those facts conflict with the reviewed lockfile or
image.

Use a renderer interface that accepts immutable HTML and an exact render
version, not an authenticated URL or mutable report model. The print template
adds print-only layout and local `@font-face` rules while preserving the
stored HTML input. It must load bundled Vietnamese glyph coverage, wait for
fonts before PDF creation, and fail with `PDF_FONT_MISSING` rather than
silently emitting fallback text. The processor state machine uses CAS, an
asset lease, bounded retry bookkeeping, the defined error-code table, the
dedicated terminal transaction, and a `finally` cleanup path. A bounded
retryable failure must keep report state `pdf_pending`; only the successful
storage transaction may complete it, and only the terminal transaction may
set `terminal_failure`.

Implement the dispatch matrix exactly as defined above:
`identity-report-pdf.v1` calls `renderIdentityReportPdfV1` and
`identity-report-pdf.v2` calls `renderIdentityReportPdfV2`, each with the
unchanged stored immutable HTML. Reject every other literal before renderer
initialization with `PDF_RENDER_VERSION_UNSUPPORTED`; no fallback/default
renderer is permitted.

Use an in-memory/fake object-store implementation only in focused tests. It
does not simulate successful Garage activation and it must exercise the same
checksum and metadata contract as the real adapter.

`support-case.repository.ts` owns only persistence primitives and accepts the
active transaction supplied by the terminalizer. `support-case.service.ts`
validates the bounded PDF/Garage support-case input and creates the single
terminal-lineage record without introducing an admin controller, UI, or a
generic support workflow. `asset.repository.ts` owns
`finalizePdfTerminalFailure`: after all lease/state CAS predicates succeed, it
uses that transaction-bound service to persist the support case, then inserts
the required non-null-support-case failure event, the pending
`report_failed` delivery, and the operational alert before commit. The
notification payload contains the same persisted `supportCaseId` as the
event, and constructs a canonical owner-safe support URL without error detail.

Extend the existing email service rather than creating a parallel sender:
add the `report_failed` template and kind, permit pending `report_failed`
records in its bounded `retryDue` query, and retain the existing unique
idempotency key, claim lease, three-attempt cap, and sent-delivery replay
behavior. Wire the same service through `createMaintenanceRunner` and
`createPhaseOneMaintenanceRunner`; `apps/worker/src/main.ts` continues to
invoke that maintenance runner, so no direct SMTP call is permitted from the
PDF processor. `worker.module.ts`, `main.ts`, and heartbeat ownership add the
`pdf.render` runner alongside the existing report/outbox cycle, gated by the
resolved worker queue configuration.

Extend `packages/backend/src/jobs/queue.registry.ts` so the closed
`WORKER_QUEUES` registry accepts both `report.generate` and `pdf.render`.
The registry contract maps `report.generate` to only
`report.generate.v1|report.generate.v2`, and maps `pdf.render` to only
`report.pdf.render.v1`; a queue token is never a wildcard over
`report_queue_jobs.name`.

Refactor the queue-store claim contract so every consumer passes its immutable
allowlist of job names. Both the candidate selection and the CAS update in
`claimNext` must filter `report_queue_jobs.name` by that allowlist:
the generation processor passes only `report.generate.v1|report.generate.v2`,
and the PDF processor passes only `report.pdf.render.v1`. The name predicate
is retained when a waiting job, retryable failure, or expired lease is claimed,
so an expired lease or retry never transfers a job to the other consumer.
Generation parsing must reject an unexpected job name rather than treating it
as a v1 default.

The successful PDF storage transaction and
`finalizePdfTerminalFailure` both atomically settle the exact leased
`report.pdf.render.v1` queue job with the asset/report CAS updates. A
successful stored asset settles the job as processed; a terminal asset/report
settles it as terminal failure. Each settlement requires the current worker,
unexpired lease, exact job name, and matching fenced state. A later replay
observing a stored or terminal asset/report must only adopt the already settled
outcome or no-op under that state fence; it must not create a new claim,
render, upload, asset transition, or report transition.

Focused checks:

- immutable Vietnamese HTML renders a valid PDF with the expected font loaded
  through `renderIdentityReportPdfV1`;
- immutable Vietnamese HTML renders a valid PDF with the expected font loaded
  through `renderIdentityReportPdfV2`;
- a missing font fails before storage with `PDF_FONT_MISSING` and removes the
  temporary artifact;
- every unsupported render-version literal is rejected before rendering, with
  no HTML mutation;
- duplicate event/job replay performs no second render/upload after stored
  adoption;
- a storage failure leaves `html_content` unchanged and the asset retryable;
- a checksum mismatch never overwrites the existing object;
- retry exhaustion atomically terminalizes the asset/report, creates one
  persisted support case, emits one `report.fulfillment.failed.v1` containing
  that same non-null `supportCaseId`, inserts one pending `report_failed`
  delivery whose payload contains that same `supportCaseId`, and creates one
  bounded operational alert; stale lease and duplicate terminal attempts
  create none;
- the terminal transaction rollback leaves no support case, failure event,
  failed notification, or alert when any required insert fails;
- `retryDue` claims a pending `report_failed` delivery, renders only the safe
  support-link template, sends `email.report-failed.v1` with
  `report-failed-email:{reportVersionId}:{recipientAccountId}:{failureStage}`,
  and a replay produces no second provider send;
- `report-state.test.ts` proves `WORKER_QUEUES=pdf.render` resolves through
  the closed registry and that the registry maps it only to
  `report.pdf.render.v1`;
- `report-worker-state.integration.test.ts` proves generation can claim only
  `report.generate.v1|report.generate.v2` and PDF can claim only
  `report.pdf.render.v1`, including retryable and expired-lease candidates;
  neither consumer can claim the other consumer's job;
- the same integration test proves a settled PDF success or terminal job is
  not claimable again, while replay after the asset/report state fence only
  adopts or no-ops;
- worker/maintenance tests prove `pdf.render` is enabled only by its worker
  queue and that a pending `report_failed` delivery is dispatched through the
  existing maintenance cycle, not directly by the processor or an outbox job.

### Slice 3: Garage Adapter, Private Download, And Credential-Gated Activation

Owned files:

- Create `packages/backend/src/storage/garage-adapter.ts`
- Create `packages/backend/src/storage/garage-adapter.test.ts`
- Create `packages/backend/src/storage/asset-download.service.ts`
- Create `packages/backend/src/storage/asset-download.service.test.ts`
- Create `apps/api/src/assets/assets.controller.ts`
- Create `apps/api/src/assets/assets.controller.test.ts`
- Modify `apps/api/src/api.module.ts`
- Create `apps/web/src/app/api/downloads/[assetId]/route.ts`
- Create `apps/web/src/app/api/downloads/[assetId]/route.test.ts`
- Modify `packages/config/src/environment-schema.ts`
- Modify `packages/config/src/environment-schema.test.ts`
- Modify `packages/config/src/load-environment.ts`
- Modify `.env.example`
- Modify `docker-compose.yml`
- Modify `docker-compose.production.yml`
- Modify `apps/worker/Dockerfile`
- Modify `tests/deployment/compose-config.test.ts`
- Modify `tests/deployment/web-host-port.test.ts` only if the existing
  structural assertion needs the private Garage service allowlist.
- Modify `scripts/deployment/deploy-release.sh`
- Modify `scripts/deployment/rollback-release.sh`
- Modify `tests/deployment/cd-scripts.test.ts`

Add a closed Garage environment group, separate from the optional cloud-S3
replica group: endpoint, region, private bucket, access key, secret key, and
the fixed local Garage service configuration. No free-form storage host is
accepted. Compose adds Garage with persistent metadata/object volumes and no
published host port; API, worker, and migration lifecycle remain private.
The deploy script, not an operator's ad hoc Compose command, owns Garage image
pull, volume-preserving start, private health probing, and PDF-consumer
enablement order.
The worker image includes the reviewed Chromium system dependencies and only
the bundled font files required by the renderer.

The real adapter uses private bucket operations only: `head`, checksum-aware
`put`, metadata verification, delete for later lifecycle work, and
short-lived signed `get`. The API download controller verifies the account
actor and report asset ownership through the existing account/report lineage
before invoking the service. The Next.js route mints the existing trusted
internal actor token, then server-side fetches and streams or proxies the
internal signed response only after that API authorization. It never returns
the signed URL or object key to the browser and does not expose a public object
lookup.

Credential-dependent work begins only when the founder supplies the external
Garage values and separately authorizes activation. Missing values block this
slice's adapter wiring and real smoke only. Slices 1-2 remain independently
testable and must not use fake successful Garage configuration.

Focused checks:

- Garage `head` plus matching SHA-256 adopts exactly one object;
- a Garage upload error preserves HTML and records retryable storage failure;
- the successful asset-storage transaction creates one `report_ready`
  notification with
  `report-ready-email:{reportVersionId}:{recipientAccountId}`; HTML commit
  alone creates none;
- owner download streams a PDF through the BFF while cross-owner and anonymous
  requests disclose neither asset existence, object key, nor signed URL;
- `ASSET_FORBIDDEN` and `SIGNED_URL_EXPIRED` remain non-persistent
  private-download request errors and do not mutate asset/report state or
  processor retry bookkeeping;
- Compose renders Garage private, persistent, and without a host port;
- deploy/rollback script tests prove Garage image pull/start and private health
  completion precede `pdf.render` enablement, and rollback disables the
  consumer without removing Garage volumes;
- built worker smoke confirms Chromium can render a Vietnamese fixture with
  the bundled font face.

## Deployment, Smoke, And Rollback

After separate founder authorization:

1. Record external Garage configuration and private bucket policy without
   printing credentials. Apply the additive migration through the existing
   one-shot `migrate` service.
2. The deploy script pulls the approved Garage image, starts Garage with the
   named persistent metadata and object volumes retained, and waits for its
   private S3 health probe. Keep Garage, API, Redis, and PostgreSQL
   unexposed, and preserve the existing loopback-only web publishing rule.
3. Enable `pdf.render` only after that private Garage health gate passes, then
   deploy the worker image and consumer through the deploy script. A failed
   pull, start, health gate, or consumer enablement leaves `pdf.render`
   disabled and blocks activation.
4. Run one authorized non-production happy path: immutable HTML -> PDF ->
   Garage metadata verification -> `stored` -> owner download. Record only
   opaque IDs, render version, checksum prefix, and redacted health evidence.
5. Verify API/worker/web readiness plus a Garage health probe. Garage failure
   is a release blocker for PDF activation but must not make existing HTML
   report reads unavailable.

Rollback is owned by the rollback script: first disable `pdf.render` and stop
the PDF consumer, then restore the prior API/worker image. It retains Garage
metadata and object volumes and does not delete stored objects, mutate
immutable HTML, alter report version lineage, or roll back the additive
migration. A later authorized reconciliation handles reserved/rendering
assets and any verified orphan under the Phase 05 contract.

## Boundaries And Remaining External Gates

- **Implementation dependency verification (2026-09-16):**
  `@aws-sdk/client-s3` `3.1133.0` and
  `@aws-sdk/s3-request-presigner` `3.1133.0` were locally verified from
  package metadata as Apache-2.0. The reviewed task-relevant API surface is
  `S3Client`, `HeadObjectCommand`, `PutObjectCommand`, `DeleteObjectCommand`,
  `GetObjectCommand`, `HeadBucketCommand`, and `getSignedUrl` where required.
  Adapter configuration remains closed to the approved Garage endpoint,
  region, and bucket rather than accepting a free-form host. No package build
  script decision is required for these SDK packages. The exact
  `minimumReleaseAgeExclude` entries are reviewed and intentionally narrow;
  there is no `allowBuilds` change. The backend producer build copies bundled
  fonts before worker build and deployment consume the compiled package.
- **FD-087 founder approval (2026-09-16):** Garage conditional writes are not
  required for this consumer. Each fenced storage attempt uses an immutable
  object key, and PostgreSQL atomically selects the winning stored key during
  finalization. Objects from losing or expired attempts remain orphans for
  later authorized reconciliation. The web BFF streams or proxies PDF bytes
  server-side only after private API owner authorization; Garage remains
  private without a host-published port, and its internal signed URL is never
  returned to the browser.
- LSV-16 may allocate intervening migrations; this consumer allocates only
  the next journal number at implementation time and does not modify corpus or
  retrieval work.
- LSV-19's reader artifact and screenshot manifest remain an activation
  dependency for the V4.1 report experience. This consumer has no visual
  reader scope.
- **FD-087 font approval (2026-09-16):** Be Vietnam Pro with SIL OFL-1.1 is
  approved for PDF output.
- Garage credentials and bucket policy, deployment, activation, and
  real external smoke remain separate gates. They require explicit founder
  authorization and actual configured credentials; no local test or approved
  design decision authorizes them.
- Cloud S3 replication, SMTP delivery, orphan reconciliation execution, and
  asset deletion remain later Phase 05 work. This plan supplies only the
  authoritative Garage PDF path and contracts they consume.

Docs impact: minor
Rule candidate: none
Evidence: Phase 05 storage plan, workflow event contracts, LSV-36 V4.1 plan,
current schema/worker/deployment source
AGENTS.md action: none
Open questions: Garage external configuration and activation authorization;
LSV-19 artifact availability
