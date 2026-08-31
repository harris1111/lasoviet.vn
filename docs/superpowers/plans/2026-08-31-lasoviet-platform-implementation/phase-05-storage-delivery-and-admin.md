# Phase 05 Storage, Delivery, and Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`.

**Goal:** Add PDF delivery, Garage, optional cloud replication, SMTP
notification, and audited support/admin operations.

**Architecture:** PostgreSQL owns report and asset metadata. Garage owns
objects. Separate idempotent jobs render, store, replicate, delete, and email.

**Tech Stack:** Playwright Chromium, AWS S3 SDK, Garage, BullMQ, Nodemailer
SMTP, Next.js admin UI.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P05-T0N` in
`task-contracts-and-test-vectors.md`. Asynchronous edges are normative in
`workflow-event-contracts.md`.

## Global Constraints

- Buckets are private.
- Object keys contain no PII.
- HTML remains usable when PDF/Garage is degraded.
- Cloud S3 absence is normal.
- Replica failure never fails a successful Garage write.
- Admin never edits immutable report content in place.

---

### Task 1 [P05-T01]: Render deterministic PDF artifacts

**Files:**
- Create: `packages/contracts/src/asset.ts`
- Create: `packages/backend/src/pdf/pdf-renderer.ts`
- Create: `packages/backend/src/pdf/report-print-template.ts`
- Create: `packages/database/src/schema/assets.ts`
- Test: `packages/backend/src/pdf/pdf-renderer.test.ts`

**Interfaces:**
- Produces `renderReportPdf(reportVersionId): PdfArtifact`.
- Produces SHA-256, byte length, media type, and render version.
- Temporary artifact paths remain worker-local and never enter an outbox or
  queue payload.

- [ ] **Step 1: Write failing PDF tests**

Assert valid PDF signature, Vietnamese font rendering, page content, no
private navigation, stable metadata, and temporary-file cleanup.

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run packages/backend/src/pdf`
Expected: FAIL.

- [ ] **Step 3: Implement print template and Chromium renderer**

Render from immutable report content, not by scraping an authenticated browser
page.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run packages/backend/src/pdf`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add packages/contracts packages/backend/src/pdf packages/database docs/superpowers/plans
git commit -m "feat: render versioned report PDFs"
```

### Task 2 [P05-T02]: Add Garage storage and signed downloads

**Files:**
- Create: `packages/backend/src/storage/object-store.ts`
- Create: `packages/backend/src/storage/garage-adapter.ts`
- Create: `packages/backend/src/storage/asset.service.ts`
- Create: `apps/worker/src/processors/pdf-render.processor.ts`
- Create: `apps/api/src/assets/assets.controller.ts`
- Create: `apps/web/src/app/api/downloads/[assetId]/route.ts`
- Test: `tests/storage/garage.integration.test.ts`
- Test: `tests/e2e/private-download.spec.ts`

**Interfaces:**
- Produces `ObjectStore.put/getMetadata/delete/createSignedDownload`.
- Consumes `report.pdf.render.v1`; the same processor renders, uploads,
  verifies, and removes its temporary file.
- Produces `report.asset.stored.v1` after Garage metadata verification.
- Produces `report.fulfillment.failed.v1` only after PDF/Garage retry
  exhaustion.
- Produces owner-authorized download ingress.

- [ ] **Step 1: Write failing object lifecycle tests**

Cover opaque keys, checksum metadata, wrong owner, expired URL, object missing,
Garage outage, post-upload PostgreSQL commit failure, idempotent adoption of
an existing matching object, checksum conflict, orphan reconciliation, and
HTML report availability during PDF failure.

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run tests/storage && pnpm playwright test tests/e2e/private-download.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Garage adapter**

Use S3-compatible APIs and private buckets. Signed URLs are short-lived and
never logged. The PDF processor renders and uploads in one job, verifies
checksum/metadata, removes the local temporary file, then commits asset
`stored`, report `complete`, and `report.asset.stored.v1`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run tests/storage && pnpm playwright test tests/e2e/private-download.spec.ts`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add packages/backend/src/storage apps/worker/src/processors apps/api/src/assets apps/web/src/app/api/downloads tests/storage tests/e2e docs/superpowers/plans
git commit -m "feat: store and authorize private report assets"
```

### Task 3 [P05-T03]: Implement optional cloud S3 replication and deletion

**Files:**
- Create: `packages/backend/src/storage/cloud-s3-adapter.ts`
- Create: `packages/backend/src/storage/replication.service.ts`
- Create: `apps/worker/src/processors/storage-replicate.processor.ts`
- Create: `apps/worker/src/processors/storage-delete-replica.processor.ts`
- Create: `apps/worker/src/processors/storage-reconcile.processor.ts`
- Test: `tests/storage/replication.integration.test.ts`

**Interfaces:**
- Consumes `storage.replicate.v1`, `storage.delete-replica.v1`, and
  reconciliation commands.
- Produces replication states from `storage-replication-plan.md` and
  `workflow-event-contracts.md`.
- Produces idempotent upload and tombstone deletion jobs.

- [ ] **Step 1: Write failing disabled/degraded tests**

Cover no config, healthy upload, duplicate upload, checksum mismatch, cloud
outage, retry, Garage success with cloud failure, deletion retry, and
reconciliation.

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run tests/storage/replication.integration.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement one-way replication**

No cloud-to-Garage path exists. Deduplicate repeated operational errors.

- [ ] **Step 4: Implement deletion tombstones and reconciliation**

Unresolved deletion failures remain visible until cleared.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run tests/storage/replication.integration.test.ts`
Expected: PASS.

- [ ] **Step 6: Update risk/rule trackers and commit**

```bash
git add packages/backend/src/storage apps/worker/src/processors tests/storage docs/superpowers/plans
git commit -m "feat: replicate and delete cloud report assets"
```

### Task 4 [P05-T04]: Add SMTP report notifications

**Files:**
- Create: `packages/backend/src/notifications/email-provider.ts`
- Create: `packages/backend/src/notifications/smtp-email-adapter.ts`
- Create: `packages/backend/src/notifications/report-ready-email.ts`
- Create: `apps/worker/src/processors/email-send.processor.ts`
- Create: `apps/web/messages/vi/email.json`
- Create: `apps/web/messages/en/email.json`
- Test: `packages/backend/src/notifications/smtp-email-adapter.test.ts`
- Test: `tests/jobs/report-delivery-workflow.integration.test.ts`

**Interfaces:**
- Produces `EmailProvider.send(message, idempotencyKey)`.
- Consumes `email.report-ready.v1` and `email.report-failed.v1`.
- Produces localized report-ready and generation-failed support messages.

- [ ] **Step 1: Obtain phase-specific SMTP inputs**

Sol requests host, port, username, secret, verified sender domain/address, and
TLS requirements. Secret stays outside Git.

- [ ] **Step 2: Write failing email tests**

Cover localized subject/body, no report content in email, retryable SMTP
failure, permanent address failure, duplicate job, and safe download link.

- [ ] **Step 3: Run tests**

Run:
`pnpm vitest run packages/backend/src/notifications tests/jobs/report-delivery-workflow.integration.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement SMTP adapter and worker job**

The message links to the authenticated report page; it does not attach the
private PDF by default.

- [ ] **Step 5: Run tests and i18n parity**

Run:
`pnpm i18n:check && pnpm vitest run packages/backend/src/notifications tests/jobs/report-delivery-workflow.integration.test.ts`
Expected: PASS.

- [ ] **Step 6: Update trackers and commit**

```bash
git add packages/backend/src/notifications apps/worker/src/processors apps/web/messages tests/jobs docs/superpowers/plans
git commit -m "feat: send transactional report email"
```

### Task 5 [P05-T05]: Build audited admin and support operations

**Files:**
- Create: `packages/backend/src/admin/admin.service.ts`
- Create: `packages/backend/src/support/support.service.ts`
- Create: `packages/backend/src/reports/regeneration-policy.ts`
- Create: `apps/api/src/admin/admin.controller.ts`
- Create: `apps/web/src/app/[locale]/admin/layout.tsx`
- Create: `apps/web/src/app/[locale]/admin/orders/page.tsx`
- Create: `apps/web/src/app/[locale]/admin/reports/page.tsx`
- Create: `apps/web/src/app/[locale]/admin/support/page.tsx`
- Test: `tests/e2e/admin-support.spec.ts`

**Interfaces:**
- Produces RBAC-protected inspection, refund-case recording, input correction,
  and regeneration commands.
- Approved regeneration reserves a new report version and emits
  `report.generation.requested.v1`; it never mutates or directly requeues an
  existing version.

- [ ] **Step 1: Write failing admin E2E**

Cover non-admin denial, order/payment inspection, support reason taxonomy,
same-person correction within 24 hours, technical regeneration, superseded
version, and audit record.

- [ ] **Step 2: Run E2E**

Run: `pnpm playwright test tests/e2e/admin-support.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement least-privilege admin commands**

No command mutates an existing report version. Refund provider execution may
remain a recorded manual operation if SePay does not expose an approved API.

- [ ] **Step 4: Run E2E**

Run: `pnpm playwright test tests/e2e/admin-support.spec.ts`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add packages/backend/src/admin packages/backend/src/support packages/backend/src/reports apps/api/src/admin apps/web/src/app tests/e2e docs/superpowers/plans
git commit -m "feat: add audited report support operations"
```

## Phase Exit Criteria

- PDF renders Vietnamese correctly.
- Garage assets are private and owner-authorized.
- Cloud S3 disabled and outage modes pass.
- Deletion tombstones propagate and reconcile.
- SMTP retries safely without leaking report content.
- Admin/support operations are RBAC-protected and audited.
- Terra has no unresolved `must-fix`.
