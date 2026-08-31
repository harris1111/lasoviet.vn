# Workflow Event and Job Contracts

## Purpose

This document is the normative asynchronous contract map for paid reports,
assets, notification, replication, regeneration, and deletion. Phase tasks may
add fields only through a versioned contract change reviewed by Terra.

## Common Envelope

```ts
type WorkflowEnvelopeV1<TType extends string, TPayload> = {
  schemaVersion: 1;
  type: TType;
  eventId: string;
  occurredAt: string;
  traceId: string;
  actorId: string | null;
  aggregateType: "order" | "report" | "asset" | "account";
  aggregateId: string;
  payload: TPayload;
};

type QueueJobV1<TName extends string, TPayload> = {
  schemaVersion: 1;
  name: TName;
  sourceEventId: string;
  traceId: string;
  idempotencyKey: string;
  payload: TPayload;
};
```

Payloads contain stable IDs, versions, bounded routing metadata, and integrity
values only. Storage keys, names, emails, complete birth profiles, chart JSON,
evidence text, report content, signed URLs, and secrets are prohibited.
Consumers resolve storage keys and private records from authoritative
PostgreSQL metadata after authorization.

## Persisted State

```ts
type ReportStatus =
  | "requested"
  | "generating"
  | "validating"
  | "html_ready"
  | "pdf_pending"
  | "complete"
  | "retryable_failure"
  | "terminal_failure";

type AssetStatus =
  | "render_pending"
  | "rendering"
  | "rendered"
  | "storing"
  | "stored"
  | "store_retryable_failure"
  | "replica_disabled"
  | "replica_pending"
  | "replicating"
  | "replicated"
  | "replica_retryable_failure"
  | "replica_terminal_failure"
  | "delete_pending"
  | "authoritative_deleted"
  | "replica_delete_pending"
  | "deleted";

type NotificationStatus =
  | "pending"
  | "sending"
  | "sent"
  | "retryable_failure"
  | "terminal_failure";
```

Every transition uses compare-and-set semantics against the expected prior
state and writes `attemptCount`, `lastErrorCode`, `nextAttemptAt`, and
`updatedAt`. Invalid transitions return `WORKFLOW_STATE_CONFLICT`.

## Contract Map

| Edge | Producer | Consumer | Persisted transition | Idempotency key | Retry owner |
|---|---|---|---|---|---|
| `report.generation.requested.v1` | SePay confirmation transaction or approved regeneration transaction | PostgreSQL outbox dispatcher | report absent -> `requested` | `report-request:{reportVersionId}` | Outbox dispatcher |
| `report.generate.v1` | Outbox dispatcher | report generation processor | `requested` -> `generating` -> `validating` -> `html_ready` | `report-generate:{reportVersionId}` | BullMQ worker |
| `report.pdf.requested.v1` | successful report validation transaction | Outbox dispatcher | report `html_ready` -> `pdf_pending`; asset -> `render_pending` | `pdf-request:{reportVersionId}:{renderVersion}` | Outbox dispatcher |
| `report.pdf.render.v1` | Outbox dispatcher | PDF-and-Garage processor | asset `render_pending` -> `rendering` -> `stored`; report -> `complete` | `pdf-render:{assetId}:{renderVersion}` | BullMQ worker |
| `report.asset.stored.v1` | Garage store transaction | Outbox dispatcher | notification -> `pending`; replica -> `pending` or `disabled` | `asset-stored:{assetId}` | Outbox dispatcher |
| `storage.replicate.v1` | Outbox dispatcher when cloud S3 is enabled | replication processor | `replica_pending` -> `replicating` -> `replicated` | `replicate:{assetId}:{sha256}:{destinationId}` | BullMQ worker |
| `email.report-ready.v1` | Outbox dispatcher | email processor | `pending` -> `sending` -> `sent` | `report-ready-email:{reportVersionId}:{recipientAccountId}` | BullMQ worker |
| `report.fulfillment.failed.v1` | terminal report, PDF, or Garage transaction | Outbox dispatcher | failure notification -> `pending` | `report-failed:{reportVersionId}:{failureStage}` | Outbox dispatcher |
| `email.report-failed.v1` | Outbox dispatcher | email processor | `pending` -> `sending` -> `sent` | `report-failed-email:{reportVersionId}:{recipientAccountId}:{failureStage}` | BullMQ worker |
| `storage.reconcile.v1` | scheduled operations command or audited admin action | reconciliation processor | repair only the stored state for the scanned asset | `reconcile:{destinationId}:{scanId}:{cursor}` | BullMQ worker |
| `asset.deletion.requested.v1` | account purge, report lifecycle, or approved admin transaction | Outbox dispatcher | asset -> `delete_pending`; tombstone created | `asset-delete-request:{assetId}:{deletionVersion}` | Outbox dispatcher |
| `storage.delete-authoritative.v1` | Outbox dispatcher | Garage deletion processor | `delete_pending` -> `authoritative_deleted` | `garage-delete:{assetId}:{deletionVersion}` | BullMQ worker |
| `asset.authoritative.deleted.v1` | Garage deletion transaction | Outbox dispatcher | replica -> `replica_delete_pending` or asset -> `deleted` if disabled | `garage-deleted:{assetId}:{deletionVersion}` | Outbox dispatcher |
| `storage.delete-replica.v1` | Outbox dispatcher when replica exists | cloud deletion processor | `replica_delete_pending` -> `deleted` | `replica-delete:{assetId}:{deletionVersion}:{destinationId}` | BullMQ worker |

## Payload Schemas

```ts
type ReportGenerationRequestedV1 = {
  reportId: string;
  reportVersionId: string;
  entitlementId: string;
  chartVersionId: string;
  evidenceVersionId: string;
  knowledgeVersionId: string;
  promptVersion: string;
  reportConfigVersion: string;
  locale: "vi" | "en";
  sku: string;
};

type ReportPdfRequestedV1 = {
  reportId: string;
  reportVersionId: string;
  assetId: string;
  renderVersion: string;
};

type ReportAssetStoredV1 = {
  assetId: string;
  reportVersionId: string;
  sha256: string;
  recipientAccountId: string;
};

type StorageReplicationV1 = {
  assetId: string;
  sourceVersion: string;
  sha256: string;
  byteLength: number;
  destinationId: string;
};

type ReportReadyEmailV1 = {
  notificationId: string;
  reportId: string;
  reportVersionId: string;
  recipientAccountId: string;
  locale: "vi" | "en";
};

type ReportFailedEmailV1 = {
  notificationId: string;
  reportId: string;
  reportVersionId: string;
  recipientAccountId: string;
  locale: "vi" | "en";
  failureStage: "generation" | "validation" | "pdf" | "garage";
  supportCaseId: string;
};

type StorageReconcileV1 = {
  scanId: string;
  destinationId: string;
  cursor: string | null;
  limit: number;
};

type AssetDeletionV1 = {
  assetId: string;
  deletionVersion: string;
  destinationId: string | null;
  reasonCode: "account_purge" | "report_lifecycle" | "admin_approved";
};
```

## Transaction Boundaries

1. Payment confirmation, entitlement creation, report-version reservation,
   and `report.generation.requested.v1` outbox insertion commit in one
   PostgreSQL transaction.
2. Successful report validation, immutable HTML report insertion,
   `html_ready`, asset reservation, and `report.pdf.requested.v1` insertion
   commit in one transaction.
3. The PDF-and-Garage processor resolves the reserved opaque object key from
   PostgreSQL, renders to a worker-local temporary file, calculates metadata,
   uploads and verifies Garage, then commits asset `stored`, report `complete`,
   and `report.asset.stored.v1`. A temporary path or object key never crosses
   a queue.
4. Email and replication are independent consumers. Their failure never
   reverts a completed Garage write or hides ready HTML.
5. A deletion tombstone commits before any object is made unavailable.
   Unresolved replica deletion remains operationally visible.
6. A terminal generation, validation, PDF, or Garage failure creates one
   support case and `report.fulfillment.failed.v1`. The user email contains a
   support link and safe status only, never provider or internal error detail.

## Garage Upload Recovery

The asset row reserves a deterministic opaque object key from `assetId` before
`report.pdf.requested.v1` is emitted.

For every `report.pdf.render.v1` attempt:

1. Resolve the reserved key from PostgreSQL.
2. Issue Garage metadata lookup before upload.
3. If absent, upload the rendered file with SHA-256 metadata.
4. If present with the expected SHA-256, adopt it and continue without a
   second upload.
5. If present with another checksum, stop with `ASSET_KEY_CONFLICT`; never
   overwrite.
6. Commit asset/report state and `report.asset.stored.v1`.
7. Delete the worker-local temporary file in a finally block.

If Garage upload succeeds and the PostgreSQL commit fails, BullMQ retries the
same idempotency key. The retry verifies and adopts the existing object, then
repeats only the PostgreSQL transaction.

Reconciliation scans reserved/rendering assets past their lease:

- matching object exists: atomically adopt and emit the missing event;
- object absent: return the asset to `render_pending`;
- checksum conflict: terminal alert, no overwrite;
- known object exists for a rolled-back/deleted asset: quarantine then remove
  only after the configured orphan-retention window and an audited check.

## Required Integration Tests

```ts
it("maps one paid webhook to one complete report workflow", async () => {
  await deliverSignedWebhook(validPaidWebhook);
  await drainWorkflow();

  expect(await countEntitlements(orderId)).toBe(1);
  expect(await countReportVersions(orderId)).toBe(1);
  expect(await reportStatus(orderId)).toBe("complete");
  expect(await assetStatus(orderId)).toMatchObject({
    authoritative: "stored",
    replica: cloudEnabled ? "replicated" : "replica_disabled",
  });
  expect(await countSentReportReadyEmails(orderId)).toBe(1);
});

it("replays every edge without duplicate side effects", async () => {
  await deliverSignedWebhook(validPaidWebhook);
  await deliverSignedWebhook(validPaidWebhook);
  await replayEveryRecordedOutboxEventTwice();
  await retryEveryCompletedJobTwice();

  expect(await countEntitlements(orderId)).toBe(1);
  expect(await countReportVersions(orderId)).toBe(1);
  expect(await countGarageObjects(orderId)).toBe(1);
  expect(await countSentReportReadyEmails(orderId)).toBe(1);
});

it("keeps paid work recoverable when Redis is unavailable", async () => {
  await stopRedis();
  await deliverSignedWebhook(validPaidWebhook);

  expect(await reportStatus(orderId)).toBe("requested");
  expect(await pendingOutboxCount(orderId)).toBe(1);

  await startRedis();
  await drainWorkflow();
  expect(await reportStatus(orderId)).toBe("complete");
});

it("adopts a Garage object after a post-upload database failure", async () => {
  failNextAssetCompletionCommit();
  await runJob("report.pdf.render.v1", pdfJob);

  expect(await countGarageObjectsByAsset(assetId)).toBe(1);
  expect(await assetStatusById(assetId)).not.toBe("stored");

  await retryJob("report.pdf.render.v1", pdfJob);
  expect(await countGarageObjectsByAsset(assetId)).toBe(1);
  expect(await assetStatusById(assetId)).toBe("stored");
  expect(await countOutboxEvents("report.asset.stored.v1", assetId)).toBe(1);
});
```

## Change Protocol

- Renaming an event or job requires a new version and an explicit old-to-new
  compatibility path.
- Adding a required payload field requires a new schema version.
- A producer and consumer change ship in the same reviewed task unless an
  expand/contract compatibility period is documented.
- Queue names are transport configuration; event and job names above are
  domain contracts and must remain stable.
