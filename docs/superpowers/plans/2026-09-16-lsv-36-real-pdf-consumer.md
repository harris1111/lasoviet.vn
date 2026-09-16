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
5. A private Garage S3-compatible adapter performs metadata lookup before
   upload. An absent object is uploaded with checksum metadata; a matching
   object is adopted; a differing checksum is a terminal key conflict and is
   never overwritten.
6. Only after Garage metadata verification does one successful
   asset-storage transaction CAS the leased asset to `stored`, transition the
   report from `pdf_pending` to `complete`, insert `report.asset.stored.v1`,
   and create the `report_ready` notification with stable idempotency
   `report-ready:{reportVersionId}:{assetId}`. This explicitly replaces the
   current immediate notification creation at HTML commit: no `report_ready`
   notification exists before Garage success, and a retry/adoption cannot
   create a second notification.
7. A server-authorized download ingress resolves the current account owner and
   stored asset, then returns a short-lived private signed Garage download.
   Object keys and signed URLs never enter queue payloads or logs.

`report_assets` is the authoritative metadata/state record. It reserves an
opaque deterministic key derived only from `assetId`, stores render version,
media type, SHA-256, byte length, attempts, bounded error code, lease and
state version, and Garage verification metadata. Its initial implementation
uses `render_pending`, `rendering`, `rendered`, `storing`, `stored`, and
`store_retryable_failure`, plus `terminal_failure`; replica fields remain
`replica_disabled`. Later Phase 05 replication/deletion work owns replica and
tombstone transitions.

The only PDF/Garage failure codes for this consumer are:

| Class | Retryable codes | Immediately terminal codes |
| --- | --- | --- |
| PDF | `PDF_RENDER_FAILED`, `PDF_TEMP_CLEANUP_FAILED` | `PDF_FONT_MISSING`, `PDF_RENDER_VERSION_UNSUPPORTED` |
| Garage | `GARAGE_UNAVAILABLE` | `ASSET_CHECKSUM_MISMATCH`, `ASSET_KEY_CONFLICT` |

Retryable failures retain their code and bounded attempt count. When the
configured retry budget is exhausted, they take the same fenced terminal path
with their retained code; no unbounded or ad hoc error code is persisted.
`PDF_FONT_MISSING` is the binding literal for a missing or unloaded required
font face and is never replaced by `PDF_FONT_UNAVAILABLE`.

The terminal path is a dedicated `finalizePdfTerminalFailure` transaction,
not a side effect of a catch block. It requires the current asset lease token,
asset state/version in an eligible PDF or Garage processing state, and report
state/version `pdf_pending`; it CASes the asset and report to
`terminal_failure`, preserves immutable HTML, records the bounded failure
code and stage (`pdf` or `garage`), and inserts exactly one
`report.fulfillment.failed.v1` with idempotency
`report-failed:{reportVersionId}:{failureStage}`. A stale lease, changed
state/version, or duplicate terminalization commits nothing. Neither a
transient error nor a direct external-storage exception may emit the failure
event outside this fence.

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
- Modify `packages/contracts/src/jobs.ts`
- Modify `packages/contracts/src/jobs.test.ts`
- Modify `packages/contracts/src/index.ts`
- Create `packages/database/src/schema/assets.ts`
- Modify `packages/database/src/schema/reports.ts`
- Modify `packages/database/src/index.ts`
- Create `packages/database/drizzle/00XX_report_assets.sql`
- Create `packages/database/drizzle/meta/00XX_snapshot.json`
- Modify `packages/database/drizzle/meta/_journal.json`
- Modify `packages/database/src/schema/report-generation-migration-layout.test.ts`
- Modify `packages/backend/src/reports/report-version.repository.ts`
- Modify `packages/backend/src/reports/report-version.repository.test.ts`
- Modify `packages/backend/src/outbox/outbox.dispatcher.ts`
- Modify `packages/backend/src/outbox/outbox.dispatcher.test.ts`
- Modify `packages/backend/src/reports/report.service.ts`
- Modify `packages/backend/src/reports/report-state.test.ts`

Allocate `00XX` only after rebasing onto the current
`origin/product/experience-spec-v1` and inspecting the live Drizzle journal.
Do not reserve a number in this plan. This avoids collision with LSV-16 or
any intervening migration.

Define strict `ReportPdfRequestedV1`, `ReportPdfRenderJobV1`,
`ReportAssetStoredV1`, and `ReportFulfillmentFailedV1` schemas. Accept only
the exact v1/v2 render literals, not an arbitrary render-version string.
Reserve the asset row and opaque key in the same transaction that persists
HTML, CASes `html_ready` to `pdf_pending`, and inserts the request event.
Extend the dispatcher claim condition and queue publisher for PDF jobs without
changing generation job behavior.

Focused checks:

- a committed HTML report creates exactly one reserved asset and one PDF event;
- replaying the request event produces one `report.pdf.render.v1` queue job;
- a v1 and a v2 event retain their exact immutable render version;
- the `html_ready` to `pdf_pending` CAS creates the reservation/request once,
  while a stale or duplicate CAS creates neither;
- invalid render version or duplicate asset/event fails closed.

### Slice 2: Provider-Independent Renderer And Consumer

Owned files:

- Create `packages/backend/src/pdf/pdf-renderer.ts`
- Create `packages/backend/src/pdf/pdf-renderer.test.ts`
- Create `packages/backend/src/pdf/report-print-template.ts`
- Create `packages/backend/src/pdf/assets/fonts/<approved-vietnamese-font>.woff2`
- Create `packages/backend/src/storage/object-store.ts`
- Create `packages/backend/src/storage/asset.repository.ts`
- Create `packages/backend/src/storage/asset.service.ts`
- Create `packages/backend/src/storage/asset.service.test.ts`
- Create `apps/worker/src/processors/pdf-render.processor.ts`
- Create `apps/worker/src/processors/pdf-render.processor.test.ts`
- Modify `apps/worker/src/worker.module.ts`
- Modify `apps/worker/src/worker.module.test.ts`
- Modify `apps/worker/src/main.ts`
- Modify `apps/worker/src/health/worker-heartbeat.ts`
- Modify `apps/worker/src/health/worker-heartbeat.test.ts`
- Modify `packages/backend/src/index.ts`
- Modify `packages/backend/package.json`
- Modify `apps/worker/package.json`
- Modify `pnpm-lock.yaml`
- Modify `pnpm-workspace.yaml` only if pnpm 11 requires an exact reviewed
  `allowBuilds` entry.

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
- a checksum mismatch never overwrites the existing object.
- retry exhaustion atomically terminalizes the asset/report and emits one
  `report.fulfillment.failed.v1`; stale lease and duplicate terminal attempts
  emit none.

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
internal actor token and redirects only after that API authorization; it does
not expose a public object lookup.

Credential-dependent work begins only when the founder supplies the external
Garage values and separately authorizes activation. Missing values block this
slice's adapter wiring and real smoke only. Slices 1-2 remain independently
testable and must not use fake successful Garage configuration.

Focused checks:

- Garage `head` plus matching SHA-256 adopts exactly one object;
- a Garage upload error preserves HTML and records retryable storage failure;
- the successful asset-storage transaction creates one `report_ready`
  notification with `report-ready:{reportVersionId}:{assetId}`; HTML commit
  alone creates none;
- owner download returns a short-lived response while cross-owner and anonymous
  requests disclose neither asset existence nor object key;
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

## Boundaries And Open Decisions

- LSV-16 may allocate intervening migrations; this consumer allocates only
  the next journal number at implementation time and does not modify corpus or
  retrieval work.
- LSV-19's reader artifact and screenshot manifest remain an activation
  dependency for the V4.1 report experience. This consumer has no visual
  reader scope.
- The founder must approve the exact bundled Vietnamese font family/license,
  Garage credentials and bucket policy, and the deployment/real-smoke
  authorization. These are not inferred from this plan.
- Cloud S3 replication, SMTP delivery, orphan reconciliation execution, and
  asset deletion remain later Phase 05 work. This plan supplies only the
  authoritative Garage PDF path and contracts they consume.

Docs impact: minor
Rule candidate: none
Evidence: Phase 05 storage plan, workflow event contracts, LSV-36 V4.1 plan,
current schema/worker/deployment source
AGENTS.md action: none
Open questions: exact font/license; Garage external configuration and activation
authorization; LSV-19 artifact availability
