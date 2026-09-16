import { createHash, createHmac, randomUUID } from "node:crypto";
import { and, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import {
  authUsers, commerceAlertDeliveries, commerceEntitlements, notificationDeliveries,
  outbox, reportAssets, reportQueueJobs, reportReservations, reportVersions, type Database,
} from "@lasoviet/database";
import {
  ReportPdfRenderJobV1Schema,
  type ReportAssetFailureCode,
  type ReportPdfRenderVersion,
} from "@lasoviet/contracts";
import { createSupportCaseService } from "../support/support-case.service.js";

const PDF_JOB_NAME = "report.pdf.render.v1";
const PROCESSING = ["rendering", "rendered", "storing"] as const;
const CLAIMABLE = ["render_pending", "store_retryable_failure"] as const;

export type PdfWorkItem = {
  assetId: string; reportId: string; reportVersionId: string; immutableHtml: string;
  renderVersion: ReportPdfRenderVersion; candidateObjectKey: string; objectKey: string; assetStateVersion: number;
  reportStateVersion: number; leaseToken: string; ownerId: string; ownerEmail: string;
  locale: "vi" | "en";
};

export type AssetRepositoryOptions = {
  canonicalPublicOrigin: string;
  recipientFingerprintSecret: string;
  leaseDurationMs?: number;
  now?: () => Date;
};

type ClaimResult =
  | { ok: true; item: PdfWorkItem }
  | { ok: false; code: "REPLAY_SETTLED" | "LEASE_LOST" | "WORKFLOW_STATE_CONFLICT" };

function resolveOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("ASSET_REPOSITORY_INVALID_CANONICAL_ORIGIN");
  }
  return url.origin;
}

function samePdfLineage(payload: unknown, item: Pick<PdfWorkItem, "assetId" | "reportId" | "reportVersionId" | "renderVersion">): boolean {
  const parsed = ReportPdfRenderJobV1Schema.safeParse({
    schemaVersion: 1, name: PDF_JOB_NAME, sourceEventId: "database-lineage",
    traceId: "database-lineage", idempotencyKey: "database-lineage", payload,
  });
  return parsed.success &&
    parsed.data.payload.assetId === item.assetId &&
    parsed.data.payload.reportId === item.reportId &&
    parsed.data.payload.reportVersionId === item.reportVersionId &&
    parsed.data.payload.renderVersion === item.renderVersion;
}

export function createDatabaseAssetRepository(
  database: Database,
  options: AssetRepositoryOptions,
  supportCases = createSupportCaseService(),
) {
  const origin = resolveOrigin(options.canonicalPublicOrigin);
  if (!options.recipientFingerprintSecret.trim()) throw new Error("ASSET_REPOSITORY_RECIPIENT_FINGERPRINT_SECRET_REQUIRED");
  const clock = options.now ?? (() => new Date());
  const leaseDurationMs = options.leaseDurationMs ?? 60_000;
  if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs <= 0) throw new Error("ASSET_REPOSITORY_INVALID_LEASE_DURATION");

  const fingerprint = (email: string) => createHmac("sha256", options.recipientFingerprintSecret)
    .update(email.trim().toLowerCase()).digest("hex");

  async function lineage(tx: Database, assetId: string) {
    const [row] = await tx.select({
      assetId: reportAssets.id, assetStatus: reportAssets.status, assetStateVersion: reportAssets.stateVersion,
      assetLeaseExpiresAt: reportAssets.leaseExpiresAt, assetLastErrorCode: reportAssets.lastErrorCode,
      reportId: reportAssets.reportId,
      reportVersionId: reportAssets.reportVersionId, immutableHtml: reportVersions.htmlContent,
      renderVersion: reportAssets.renderVersion, objectKey: reportAssets.objectKey,
      reportStatus: reportReservations.status, reportStateVersion: reportReservations.stateVersion,
      ownerId: commerceEntitlements.ownerId, ownerEmail: authUsers.email, locale: reportReservations.locale,
    }).from(reportAssets)
      .innerJoin(reportVersions, eq(reportVersions.reportVersionId, reportAssets.reportVersionId))
      .innerJoin(reportReservations, eq(reportReservations.reportVersionId, reportAssets.reportVersionId))
      .innerJoin(commerceEntitlements, eq(commerceEntitlements.id, reportReservations.entitlementId))
      .innerJoin(authUsers, eq(authUsers.id, commerceEntitlements.ownerId))
      .where(eq(reportAssets.id, assetId)).limit(1);
    if (!row || (row.renderVersion !== "identity-report-pdf.v1" && row.renderVersion !== "identity-report-pdf.v2") ||
      (row.locale !== "vi" && row.locale !== "en")) return null;
    return {
      ...row,
      renderVersion: row.renderVersion as ReportPdfRenderVersion,
      locale: row.locale as "vi" | "en",
    };
  }

  async function leasedJob(tx: Database, jobId: string, workerId: string, now: Date) {
    const [job] = await tx.select({ id: reportQueueJobs.id, payload: reportQueueJobs.payload })
      .from(reportQueueJobs).where(and(
        eq(reportQueueJobs.id, jobId), eq(reportQueueJobs.name, PDF_JOB_NAME),
        eq(reportQueueJobs.status, "leased"), eq(reportQueueJobs.leasedBy, workerId),
        gt(reportQueueJobs.leasedUntil, now),
      )).limit(1);
    return job ?? null;
  }

  async function settleJob(tx: Database, input: { jobId: string; workerId: string; now: Date; status: "processed" | "retryable_failure" | "terminal_failure"; errorCode?: string; availableAt?: Date }) {
    const [job] = await tx.update(reportQueueJobs).set({
      status: input.status, lastErrorCode: input.errorCode,
      availableAt: input.availableAt, processedAt: input.status === "processed" ? input.now : undefined,
      leasedBy: null, leasedUntil: null, updatedAt: input.now,
    }).where(and(
      eq(reportQueueJobs.id, input.jobId), eq(reportQueueJobs.name, PDF_JOB_NAME),
      eq(reportQueueJobs.status, "leased"), eq(reportQueueJobs.leasedBy, input.workerId),
      gt(reportQueueJobs.leasedUntil, input.now),
    )).returning();
    return job ?? null;
  }

  return {
    async claimPdfWork(jobId: string, workerId: string, assetId: string, now = clock()): Promise<ClaimResult> {
      return database.transaction(async (tx) => {
        const current = await lineage(tx as Database, assetId);
        if (!current) return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
        const job = await leasedJob(tx as Database, jobId, workerId, now);
        if (!job || !samePdfLineage(job.payload, current)) return { ok: false, code: "LEASE_LOST" };
        if (current.assetStatus === "stored") {
          if (current.reportStatus !== "complete") return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
          if (!await settleJob(tx as Database, { jobId, workerId, now, status: "processed" })) {
            return { ok: false, code: "LEASE_LOST" };
          }
          return { ok: false, code: "REPLAY_SETTLED" };
        }
        if (current.assetStatus === "terminal_failure") {
          if (current.reportStatus !== "terminal_failure") return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
          if (!await settleJob(tx as Database, {
            jobId, workerId, now, status: "terminal_failure",
            errorCode: current.assetLastErrorCode ?? undefined,
          })) {
            return { ok: false, code: "LEASE_LOST" };
          }
          return { ok: false, code: "REPLAY_SETTLED" };
        }
        if (current.reportStatus !== "pdf_pending") return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };

        const expired = PROCESSING.includes(current.assetStatus as typeof PROCESSING[number]) &&
          current.assetLeaseExpiresAt !== null && current.assetLeaseExpiresAt <= now;
        if (!CLAIMABLE.includes(current.assetStatus as typeof CLAIMABLE[number]) && !expired) {
          return { ok: false, code: "LEASE_LOST" };
        }
        const leaseToken = randomUUID();
        const objectKey = `reports/${current.assetId}/${leaseToken}.pdf`;
        const [claimed] = await tx.update(reportAssets).set({
          status: "rendering", objectKey, leaseToken, leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
          attemptCount: sql`${reportAssets.attemptCount} + 1`,
          stateVersion: sql`${reportAssets.stateVersion} + 1`, updatedAt: now,
        }).where(and(
          eq(reportAssets.id, assetId), eq(reportAssets.stateVersion, current.assetStateVersion),
          or(
            inArray(reportAssets.status, [...CLAIMABLE]),
            and(inArray(reportAssets.status, [...PROCESSING]), lte(reportAssets.leaseExpiresAt, now)),
          ),
        )).returning({ stateVersion: reportAssets.stateVersion });
        if (!claimed) return { ok: false, code: "LEASE_LOST" };
        return { ok: true, item: {
          assetId: current.assetId, reportId: current.reportId, reportVersionId: current.reportVersionId,
          immutableHtml: current.immutableHtml, renderVersion: current.renderVersion,
          candidateObjectKey: current.objectKey, objectKey,
          assetStateVersion: claimed.stateVersion, reportStateVersion: current.reportStateVersion, leaseToken,
          ownerId: current.ownerId, ownerEmail: current.ownerEmail, locale: current.locale,
        } };
      });
    },

    async markRendered(input: Pick<PdfWorkItem, "assetId" | "leaseToken" | "assetStateVersion"> & { now?: Date }) {
      const now = input.now ?? clock();
      const [row] = await database.update(reportAssets).set({
        status: "rendered", stateVersion: sql`${reportAssets.stateVersion} + 1`, updatedAt: now,
      }).where(and(eq(reportAssets.id, input.assetId), eq(reportAssets.status, "rendering"),
        eq(reportAssets.leaseToken, input.leaseToken), eq(reportAssets.stateVersion, input.assetStateVersion),
        gt(reportAssets.leaseExpiresAt, now))).returning({ stateVersion: reportAssets.stateVersion });
      return row ? { ok: true as const, stateVersion: row.stateVersion } : { ok: false as const, code: "LEASE_LOST" as const };
    },

    async markStoring(input: Pick<PdfWorkItem, "assetId" | "leaseToken" | "assetStateVersion"> & { now?: Date }) {
      const now = input.now ?? clock();
      const [row] = await database.update(reportAssets).set({
        status: "storing", stateVersion: sql`${reportAssets.stateVersion} + 1`, updatedAt: now,
      }).where(and(eq(reportAssets.id, input.assetId), eq(reportAssets.status, "rendered"),
        eq(reportAssets.leaseToken, input.leaseToken), eq(reportAssets.stateVersion, input.assetStateVersion),
        gt(reportAssets.leaseExpiresAt, now))).returning({ stateVersion: reportAssets.stateVersion });
      return row ? { ok: true as const, stateVersion: row.stateVersion } : { ok: false as const, code: "LEASE_LOST" as const };
    },

    async finalizeStored(input: {
      item: PdfWorkItem; jobId: string; workerId: string; objectKey: string; sha256: string; byteLength: number;
      garageEtag?: string; garageVersionId?: string; now?: Date;
    }): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" | "WORKFLOW_STATE_CONFLICT" }> {
      const now = input.now ?? clock();
      if (!/^[a-f0-9]{64}$/.test(input.sha256) || !Number.isSafeInteger(input.byteLength) || input.byteLength <= 0) {
        throw new Error("ASSET_REPOSITORY_INVALID_STORAGE_METADATA");
      }
      if (input.objectKey !== input.item.objectKey && input.objectKey !== input.item.candidateObjectKey) {
        throw new Error("ASSET_REPOSITORY_INVALID_OBJECT_KEY");
      }
      try {
        return await database.transaction(async (tx) => {
          const current = await lineage(tx as Database, input.item.assetId);
          if (current?.assetStatus === "stored" && current.reportStatus === "complete") return { ok: true };
          if (!current || current.reportStateVersion !== input.item.reportStateVersion) return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
          const job = await leasedJob(tx as Database, input.jobId, input.workerId, now);
          if (!job || !samePdfLineage(job.payload, input.item)) return { ok: false, code: "LEASE_LOST" };
          const [asset] = await tx.update(reportAssets).set({
            status: "stored", objectKey: input.objectKey, sha256: input.sha256, byteLength: input.byteLength,
            garageEtag: input.garageEtag, garageVersionId: input.garageVersionId, storedAt: now,
            leaseToken: null, leaseExpiresAt: null, lastErrorCode: null,
            stateVersion: sql`${reportAssets.stateVersion} + 1`, updatedAt: now,
          }).where(and(eq(reportAssets.id, input.item.assetId), eq(reportAssets.status, "storing"),
            eq(reportAssets.leaseToken, input.item.leaseToken), eq(reportAssets.stateVersion, input.item.assetStateVersion),
            gt(reportAssets.leaseExpiresAt, now))).returning();
          if (!asset) return { ok: false, code: "LEASE_LOST" };
          const [report] = await tx.update(reportReservations).set({
            status: "complete", stateVersion: sql`${reportReservations.stateVersion} + 1`, updatedAt: now,
          }).where(and(eq(reportReservations.reportVersionId, input.item.reportVersionId),
            eq(reportReservations.status, "pdf_pending"), eq(reportReservations.stateVersion, input.item.reportStateVersion))).returning();
          if (!report) throw new Error("WORKFLOW_STATE_CONFLICT");
          if (!await settleJob(tx as Database, { jobId: input.jobId, workerId: input.workerId, now, status: "processed" })) throw new Error("LEASE_LOST");
          await tx.insert(outbox).values({
            schemaVersion: 1, eventType: "report.asset.stored.v1", eventId: `evt-asset-stored-${input.item.assetId}`,
            occurredAt: now, traceId: `trace-asset-stored-${input.item.assetId}`, aggregateType: "asset", aggregateId: input.item.assetId,
            idempotencyKey: `asset-stored:${input.item.assetId}`,
            payload: { reportId: input.item.reportId, reportVersionId: input.item.reportVersionId, assetId: input.item.assetId,
              renderVersion: input.item.renderVersion, sha256: input.sha256, byteLength: input.byteLength },
            status: "pending", availableAt: now,
          });
          await tx.insert(notificationDeliveries).values({
            idempotencyKey: `report-ready-email:${input.item.reportVersionId}:${input.item.ownerId}`, kind: "report_ready",
            recipientFingerprint: fingerprint(input.item.ownerEmail),
            requestPayload: { version: 1, kind: "report_ready",
              idempotencyKey: `report-ready-email:${input.item.reportVersionId}:${input.item.ownerId}`,
              recipient: input.item.ownerEmail, locale: input.item.locale,
              actionUrl: `${origin}${input.item.locale === "en" ? "/en/bao-cao" : "/bao-cao"}/${encodeURIComponent(input.item.reportId)}`,
              requestId: `report-ready-${input.item.assetId}` },
            status: "pending", createdAt: now, updatedAt: now,
          });
          return { ok: true };
        });
      } catch (error) {
        return { ok: false, code: error instanceof Error && error.message === "LEASE_LOST" ? "LEASE_LOST" : "WORKFLOW_STATE_CONFLICT" };
      }
    },

    async releaseRetryableFailure(input: {
      item: PdfWorkItem; jobId: string; workerId: string;
      errorCode: Extract<ReportAssetFailureCode, "PDF_RENDER_FAILED" | "PDF_TEMP_CLEANUP_FAILED" | "GARAGE_UNAVAILABLE">;
      nextAttemptAt: Date; now?: Date;
    }): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }> {
      const now = input.now ?? clock();
      try {
        return await database.transaction(async (tx) => {
          const job = await leasedJob(tx as Database, input.jobId, input.workerId, now);
          if (!job || !samePdfLineage(job.payload, input.item)) return { ok: false, code: "LEASE_LOST" };
          const current = await lineage(tx as Database, input.item.assetId);
          if (!current || current.reportStatus !== "pdf_pending" || current.reportStateVersion !== input.item.reportStateVersion) {
            return { ok: false, code: "LEASE_LOST" };
          }
          const [asset] = await tx.update(reportAssets).set({
            status: "store_retryable_failure", lastErrorCode: input.errorCode, leaseToken: null, leaseExpiresAt: null,
            stateVersion: sql`${reportAssets.stateVersion} + 1`, updatedAt: now,
          }).where(and(eq(reportAssets.id, input.item.assetId), inArray(reportAssets.status, [...PROCESSING]),
            eq(reportAssets.leaseToken, input.item.leaseToken), eq(reportAssets.stateVersion, input.item.assetStateVersion),
            gt(reportAssets.leaseExpiresAt, now))).returning();
          if (!asset) return { ok: false, code: "LEASE_LOST" };
          if (!await settleJob(tx as Database, { jobId: input.jobId, workerId: input.workerId, now,
            status: "retryable_failure", errorCode: input.errorCode, availableAt: input.nextAttemptAt })) throw new Error("LEASE_LOST");
          return { ok: true };
        });
      } catch {
        return { ok: false, code: "LEASE_LOST" };
      }
    },

    async finalizePdfTerminalFailure(input: {
      item: PdfWorkItem; jobId: string; workerId: string; errorCode: ReportAssetFailureCode;
      failureStage: "pdf" | "garage"; now?: Date;
    }): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" | "WORKFLOW_STATE_CONFLICT" }> {
      const now = input.now ?? clock();
      try {
        return await database.transaction(async (tx) => {
          const current = await lineage(tx as Database, input.item.assetId);
          if (current?.assetStatus === "terminal_failure" && current.reportStatus === "terminal_failure") {
            return { ok: true };
          }
          if (!current || current.reportStateVersion !== input.item.reportStateVersion) return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
          const job = await leasedJob(tx as Database, input.jobId, input.workerId, now);
          if (!job || !samePdfLineage(job.payload, input.item)) return { ok: false, code: "LEASE_LOST" };
          const [asset] = await tx.update(reportAssets).set({
            status: "terminal_failure", lastErrorCode: input.errorCode, leaseToken: null, leaseExpiresAt: null,
            stateVersion: sql`${reportAssets.stateVersion} + 1`, updatedAt: now,
          }).where(and(eq(reportAssets.id, input.item.assetId), inArray(reportAssets.status, [...PROCESSING]),
            eq(reportAssets.leaseToken, input.item.leaseToken), eq(reportAssets.stateVersion, input.item.assetStateVersion),
            gt(reportAssets.leaseExpiresAt, now))).returning();
          if (!asset) return { ok: false, code: "LEASE_LOST" };
          const [report] = await tx.update(reportReservations).set({
            status: "terminal_failure", lastErrorCode: input.errorCode,
            stateVersion: sql`${reportReservations.stateVersion} + 1`, updatedAt: now,
          }).where(and(eq(reportReservations.reportVersionId, input.item.reportVersionId),
            eq(reportReservations.status, "pdf_pending"), eq(reportReservations.stateVersion, input.item.reportStateVersion))).returning();
          if (!report) throw new Error("WORKFLOW_STATE_CONFLICT");
          const supportCaseId = await supportCases.createTerminalCase(tx as Database, {
            reportId: input.item.reportId, reportVersionId: input.item.reportVersionId, assetId: input.item.assetId,
            failureStage: input.failureStage, errorCode: input.errorCode,
          });
          const token = createHash("sha256").update(`${input.item.reportVersionId}:${input.failureStage}`).digest("hex");
          await tx.insert(outbox).values({
            schemaVersion: 1, eventType: "report.fulfillment.failed.v1", eventId: `evt-pdf-failed-${token}`,
            occurredAt: now, traceId: `trace-pdf-failed-${token}`, aggregateType: "report", aggregateId: input.item.reportVersionId,
            idempotencyKey: `report-failed:${input.item.reportVersionId}:${input.failureStage}`,
            payload: { reportId: input.item.reportId, reportVersionId: input.item.reportVersionId,
              failureStage: input.failureStage, errorCode: input.errorCode, supportCaseId },
            status: "pending", availableAt: now,
          });
          const actionUrl = `${origin}${input.item.locale === "en" ? "/en/lien-he" : "/lien-he"}?case=${encodeURIComponent(supportCaseId)}`;
          await tx.insert(notificationDeliveries).values({
            idempotencyKey: `report-failed-email:${input.item.reportVersionId}:${input.item.ownerId}:${input.failureStage}`,
            kind: "report_failed", recipientFingerprint: fingerprint(input.item.ownerEmail),
            requestPayload: { version: 1, kind: "report_failed",
              idempotencyKey: `report-failed-email:${input.item.reportVersionId}:${input.item.ownerId}:${input.failureStage}`,
              recipient: input.item.ownerEmail, locale: input.item.locale, actionUrl, requestId: `report-failed-${token}`,
              reportId: input.item.reportId, reportVersionId: input.item.reportVersionId,
              failureStage: input.failureStage, supportCaseId },
            status: "pending", createdAt: now, updatedAt: now,
          });
          await tx.insert(commerceAlertDeliveries).values({
            idempotencyKey: `report-terminal-failure:${token}`, alertKind: "report_terminal_failure",
            payload: { reportVersionId: input.item.reportVersionId, failureStage: input.failureStage,
              errorCode: input.errorCode, failedAt: now.toISOString(), idempotencyKey: `report-terminal-failure:${token}` },
            status: "pending", createdAt: now, updatedAt: now,
          });
          if (!await settleJob(tx as Database, { jobId: input.jobId, workerId: input.workerId, now,
            status: "terminal_failure", errorCode: input.errorCode })) throw new Error("LEASE_LOST");
          return { ok: true };
        });
      } catch (error) {
        return { ok: false, code: error instanceof Error && error.message === "LEASE_LOST" ? "LEASE_LOST" : "WORKFLOW_STATE_CONFLICT" };
      }
    },
  };
}
