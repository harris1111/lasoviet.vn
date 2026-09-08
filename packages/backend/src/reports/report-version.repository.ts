import { createHash, createHmac, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

import type { IdentityReportV1, Result } from "@lasoviet/contracts";
import {
  authUsers,
  commerceEntitlements,
  commerceOrders,
  notificationDeliveries,
  outbox,
  reportGenerationAttempts,
  reportQueueJobs,
  reportReservations,
  reportVersions,
  type Database,
} from "@lasoviet/database";

export type ReportVersionConflictCode = "REPORT_VERSION_CONFLICT";

export type CommitImmutableVersionInput = {
  reportId: string;
  reportVersionId: string;
  entitlementId: string;
  chartVersionId: string;
  evidenceVersionId: string;
  knowledgeVersionId: string;
  promptVersion: string;
  reportConfigVersion: string;
  templateVersion: string;
  renderVersion: "identity-report-pdf.v1";
  locale: "vi" | "en";
  sku: string;
  providerId: string;
  modelId: string;
  structuredContent: IdentityReportV1;
  htmlContent: string;
  jobId: string;
  workerId: string;
  attemptNumber: number;
  traceId: string;
};

export type StartOrReuseAttemptInput = {
  jobId: string;
  attemptNumber: number;
  reportVersionId: string;
  providerId?: string;
  modelId?: string;
};

export type ImmutableReportVersionRecord = typeof reportVersions.$inferSelect;
export type ReportGenerationAttemptRecord = typeof reportGenerationAttempts.$inferSelect;

export type ReportVersionRepositoryOptions = {
  betterAuthUrl?: string;
  recipientFingerprintSecret?: string;
};

export type ReportVersionRepository = {
  getImmutableVersion(reportVersionId: string): Promise<ImmutableReportVersionRecord | null>;
  startOrReuseAttempt(input: StartOrReuseAttemptInput): Promise<Result<ReportGenerationAttemptRecord, ReportVersionConflictCode>>;
  recordFailedAttempt(input: { jobId: string; attemptNumber: number; errorCode: string }): Promise<Result<void, ReportVersionConflictCode>>;
  commitImmutableVersion(input: CommitImmutableVersionInput): Promise<Result<ImmutableReportVersionRecord, ReportVersionConflictCode>>;
  consumeRewriteBudget(reportVersionId: string): Promise<Result<{ consumed: boolean }, ReportVersionConflictCode>>;
};

class ConflictError extends Error {
  constructor() {
    super("REPORT_VERSION_CONFLICT");
    this.name = "ConflictError";
  }
}

function resolveCanonicalPublicOrigin(configuredUrl?: string): string {
  const raw = configuredUrl ?? process.env.BETTER_AUTH_URL;
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    throw new ConflictError();
  }
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new ConflictError();
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    (!hostname.includes(".") && !hostname.includes(":"))
  ) {
    throw new ConflictError();
  }
  return parsed.origin;
}

function resolveFingerprintSecret(configuredSecret?: string): string {
  const secret = configuredSecret ?? process.env.INTERNAL_ACTOR_SECRET;
  if (!secret || typeof secret !== "string" || !secret.trim()) {
    throw new ConflictError();
  }
  return secret.trim();
}

function conflict(): Result<never, ReportVersionConflictCode> {
  return {
    ok: false,
    error: {
      code: "REPORT_VERSION_CONFLICT",
      messageKey: "reports.report_version_conflict",
      retryable: false,
    },
  };
}

export function createDatabaseReportVersionRepository(
  database: Database,
  options?: ReportVersionRepositoryOptions,
): ReportVersionRepository {
  return {
    async getImmutableVersion(reportVersionId: string): Promise<ImmutableReportVersionRecord | null> {
      const [existing] = await database.select().from(reportVersions).where(eq(reportVersions.reportVersionId, reportVersionId)).limit(1);
      return existing ?? null;
    },

    async startOrReuseAttempt(input: StartOrReuseAttemptInput): Promise<Result<ReportGenerationAttemptRecord, ReportVersionConflictCode>> {
      const [existing] = await database
        .select()
        .from(reportGenerationAttempts)
        .where(and(eq(reportGenerationAttempts.jobId, input.jobId), eq(reportGenerationAttempts.attemptNumber, input.attemptNumber)))
        .limit(1);
      if (existing) return { ok: true, value: existing };

      const [inserted] = await database
        .insert(reportGenerationAttempts)
        .values({
          reportVersionId: input.reportVersionId,
          jobId: input.jobId,
          attemptNumber: input.attemptNumber,
          status: "running",
          providerId: input.providerId,
          modelId: input.modelId,
          startedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();

      if (!inserted) {
        const [reselected] = await database
          .select()
          .from(reportGenerationAttempts)
          .where(and(eq(reportGenerationAttempts.jobId, input.jobId), eq(reportGenerationAttempts.attemptNumber, input.attemptNumber)))
          .limit(1);
        if (reselected) return { ok: true, value: reselected };
        return conflict();
      }
      return { ok: true, value: inserted };
    },

    async recordFailedAttempt(input: { jobId: string; attemptNumber: number; errorCode: string }): Promise<Result<void, ReportVersionConflictCode>> {
      const [updated] = await database
        .update(reportGenerationAttempts)
        .set({ status: "failed", errorCode: input.errorCode, completedAt: new Date() })
        .where(and(eq(reportGenerationAttempts.jobId, input.jobId), eq(reportGenerationAttempts.attemptNumber, input.attemptNumber)))
        .returning();
      return updated ? { ok: true, value: undefined } : conflict();
    },

    async commitImmutableVersion(input: CommitImmutableVersionInput): Promise<Result<ImmutableReportVersionRecord, ReportVersionConflictCode>> {
      const computedHash = createHash("sha256").update(Buffer.from(input.htmlContent, "utf8")).digest("hex").toLowerCase();

      try {
        return await database.transaction(async (tx) => {
          const now = new Date();

          const [existing] = await tx.select().from(reportVersions).where(eq(reportVersions.reportVersionId, input.reportVersionId)).limit(1);
          if (existing) {
            const matches =
              existing.reportId === input.reportId &&
              existing.entitlementId === input.entitlementId &&
              existing.chartVersionId === input.chartVersionId &&
              existing.evidenceVersionId === input.evidenceVersionId &&
              existing.knowledgeVersionId === input.knowledgeVersionId &&
              existing.promptVersion === input.promptVersion &&
              existing.reportConfigVersion === input.reportConfigVersion &&
              existing.templateVersion === input.templateVersion &&
              existing.locale === input.locale &&
              existing.sku === input.sku &&
              existing.providerId === input.providerId &&
              existing.modelId === input.modelId &&
              existing.contentHash === computedHash &&
              existing.renderVersion === input.renderVersion;
            if (!matches || !isDeepStrictEqual(existing.structuredContent, input.structuredContent)) {
              throw new ConflictError();
            }

            const [queueRow] = await tx
              .select({
                status: reportQueueJobs.status,
                leasedBy: reportQueueJobs.leasedBy,
                leasedUntil: reportQueueJobs.leasedUntil,
              })
              .from(reportQueueJobs)
              .where(eq(reportQueueJobs.id, input.jobId))
              .limit(1);
            if (!queueRow) throw new ConflictError();

            if (queueRow.status === "processed") {
              return { ok: true, value: existing };
            }

            const [fencedReplayJob] = await tx
              .update(reportQueueJobs)
              .set({ status: "processed", leasedBy: null, leasedUntil: null, processedAt: now, updatedAt: now })
              .where(and(eq(reportQueueJobs.id, input.jobId), eq(reportQueueJobs.status, "leased"), eq(reportQueueJobs.leasedBy, input.workerId), gt(reportQueueJobs.leasedUntil, now)))
              .returning();
            if (!fencedReplayJob) throw new ConflictError();
            return { ok: true, value: existing };
          }

          const [fencedQueue] = await tx
            .select({ id: reportQueueJobs.id })
            .from(reportQueueJobs)
            .where(and(eq(reportQueueJobs.id, input.jobId), eq(reportQueueJobs.status, "leased"), eq(reportQueueJobs.leasedBy, input.workerId), gt(reportQueueJobs.leasedUntil, now)))
            .limit(1);
          if (!fencedQueue) throw new ConflictError();

          const [reservationFenced] = await tx
            .update(reportReservations)
            .set({ status: "validating", stateVersion: sql`${reportReservations.stateVersion} + 1`, updatedAt: now })
            .where(
              and(
                eq(reportReservations.reportVersionId, input.reportVersionId),
                eq(reportReservations.reportId, input.reportId),
                eq(reportReservations.entitlementId, input.entitlementId),
                eq(reportReservations.chartVersionId, input.chartVersionId),
                eq(reportReservations.evidenceVersionId, input.evidenceVersionId),
                eq(reportReservations.knowledgeVersionId, input.knowledgeVersionId),
                eq(reportReservations.promptVersion, input.promptVersion),
                eq(reportReservations.reportConfigVersion, input.reportConfigVersion),
                eq(reportReservations.locale, input.locale),
                eq(reportReservations.sku, input.sku),
                eq(reportReservations.status, "generating"),
                eq(reportReservations.activeJobId, input.jobId),
              ),
            )
            .returning();
          if (!reservationFenced) throw new ConflictError();

          const [recipientLineage] = await tx
            .select({
              user: authUsers,
              order: commerceOrders,
              entitlement: commerceEntitlements,
            })
            .from(commerceEntitlements)
            .innerJoin(
              commerceOrders,
              and(
                eq(commerceOrders.id, commerceEntitlements.orderId),
                eq(commerceOrders.ownerId, commerceEntitlements.ownerId),
                eq(commerceOrders.chartId, commerceEntitlements.chartId),
                eq(commerceOrders.sku, commerceEntitlements.sku),
              ),
            )
            .innerJoin(
              authUsers,
              eq(authUsers.id, commerceOrders.ownerId),
            )
            .where(
              and(
                eq(commerceEntitlements.id, input.entitlementId),
                eq(commerceEntitlements.sku, input.sku),
                eq(commerceOrders.chartVersionId, input.chartVersionId),
                eq(commerceOrders.sku, input.sku),
                eq(commerceOrders.status, "paid"),
              ),
            )
            .limit(1);

          if (!recipientLineage) {
            throw new ConflictError();
          }

          const { user, order } = recipientLineage;
          if (
            order.paidAt === null ||
            user.isAnonymous ||
            !user.emailVerified ||
            !user.email ||
            !user.email.trim()
          ) {
            throw new ConflictError();
          }

          const canonicalOrigin = resolveCanonicalPublicOrigin(options?.betterAuthUrl);
          const fingerprintSecret = resolveFingerprintSecret(options?.recipientFingerprintSecret);

          const reportPath =
            input.locale === "en"
              ? `/en/bao-cao/${encodeURIComponent(input.reportId)}`
              : `/bao-cao/${encodeURIComponent(input.reportId)}`;
          const actionUrl = new URL(reportPath, canonicalOrigin).toString();

          const notificationIdempotencyKey = `report-ready-email:${input.reportVersionId}:${user.id}`;
          const recipientEmail = user.email.trim().toLowerCase();
          const recipientFingerprint = createHmac("sha256", fingerprintSecret)
            .update(recipientEmail)
            .digest("hex");

          const deliveryPayload = {
            version: 1,
            kind: "report_ready" as const,
            idempotencyKey: notificationIdempotencyKey,
            recipient: recipientEmail,
            locale: input.locale,
            actionUrl,
            requestId: input.traceId,
          };

          const pdfAssetId = randomUUID();
          const [versionInserted] = await tx
            .insert(reportVersions)
            .values({
              reportId: input.reportId,
              reportVersionId: input.reportVersionId,
              entitlementId: input.entitlementId,
              chartVersionId: input.chartVersionId,
              evidenceVersionId: input.evidenceVersionId,
              knowledgeVersionId: input.knowledgeVersionId,
              promptVersion: input.promptVersion,
              reportConfigVersion: input.reportConfigVersion,
              templateVersion: input.templateVersion,
              locale: input.locale,
              sku: input.sku,
              providerId: input.providerId,
              modelId: input.modelId,
              structuredContent: input.structuredContent,
              htmlContent: input.htmlContent,
              contentHash: computedHash,
              pdfAssetId,
              renderVersion: input.renderVersion,
              createdAt: now,
            })
            .returning();
          if (!versionInserted) throw new ConflictError();

          const [reservationReady] = await tx
            .update(reportReservations)
            .set({ status: "html_ready", stateVersion: sql`${reportReservations.stateVersion} + 1`, updatedAt: now })
            .where(and(eq(reportReservations.id, reservationFenced.id), eq(reportReservations.status, "validating"), eq(reportReservations.stateVersion, reservationFenced.stateVersion)))
            .returning();
          if (!reservationReady) throw new ConflictError();

          await tx.insert(outbox).values({
            schemaVersion: 1,
            eventType: "report.pdf.requested.v1",
            eventId: `evt-pdf-${randomUUID()}`,
            occurredAt: now,
            traceId: input.traceId,
            aggregateType: "report",
            aggregateId: input.reportVersionId,
            idempotencyKey: `pdf-request:${input.reportVersionId}:${input.renderVersion}`,
            payload: {
              reportId: input.reportId,
              reportVersionId: input.reportVersionId,
              assetId: pdfAssetId,
              renderVersion: input.renderVersion,
            },
            status: "pending",
            availableAt: now,
          });

          await tx.insert(notificationDeliveries).values({
            idempotencyKey: notificationIdempotencyKey,
            kind: "report_ready",
            recipientFingerprint,
            requestPayload: deliveryPayload,
            status: "pending",
            attemptCount: 0,
            createdAt: now,
            updatedAt: now,
          });

          const [updatedAttempt] = await tx
            .update(reportGenerationAttempts)
            .set({
              status: "succeeded",
              providerId: input.providerId,
              modelId: input.modelId,
              completedAt: now,
            })
            .where(
              and(
                eq(reportGenerationAttempts.jobId, input.jobId),
                eq(reportGenerationAttempts.attemptNumber, input.attemptNumber),
                eq(reportGenerationAttempts.reportVersionId, input.reportVersionId),
                eq(reportGenerationAttempts.status, "running"),
              ),
            )
            .returning();
          if (!updatedAttempt) throw new ConflictError();

          const [jobProcessed] = await tx
            .update(reportQueueJobs)
            .set({ status: "processed", leasedBy: null, leasedUntil: null, processedAt: now, updatedAt: now })
            .where(and(eq(reportQueueJobs.id, input.jobId), eq(reportQueueJobs.status, "leased"), eq(reportQueueJobs.leasedBy, input.workerId), gt(reportQueueJobs.leasedUntil, now)))
            .returning();
          if (!jobProcessed) throw new ConflictError();

          return { ok: true, value: versionInserted };
        });
      } catch (error) {
        if (error instanceof ConflictError) return conflict();
        throw error;
      }
    },

    async consumeRewriteBudget(reportVersionId: string): Promise<Result<{ consumed: boolean }, ReportVersionConflictCode>> {
      const now = new Date();
      const [updated] = await database
        .update(reportReservations)
        .set({ rewriteConsumedAt: now, updatedAt: now })
        .where(
          and(
            eq(reportReservations.reportVersionId, reportVersionId),
            isNull(reportReservations.rewriteConsumedAt),
          ),
        )
        .returning();

      if (updated !== undefined) {
        return { ok: true, value: { consumed: true } };
      }

      const [existing] = await database
        .select({ id: reportReservations.id, rewriteConsumedAt: reportReservations.rewriteConsumedAt })
        .from(reportReservations)
        .where(eq(reportReservations.reportVersionId, reportVersionId))
        .limit(1);

      if (existing === undefined) {
        return conflict();
      }

      return { ok: true, value: { consumed: false } };
    },
  };
}
