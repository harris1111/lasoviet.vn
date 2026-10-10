import { randomUUID } from "node:crypto";
import { and, eq, lte, notExists, sql } from "drizzle-orm";
import { freeChartRecoverySources, lockFreeAiCoordination, lockRecoveryCaptureCoordination,
  notificationDeliveries, outbox, type Database } from "@lasoviet/database";
import { freeChartRecoverySourceHash, parseDisplayedRecoverySource, readFreeChartRecoveryAuthority,
  tryRecoveryChartLock, type TrustedDisplayedSourceReader } from "./free-chart-recovery-source.repository.js";
import { renderFreeChartRecoveryEmail } from "./free-chart-recovery-email.js";
import { recoveryChartHasCapacity } from "./recovery-capture-cap.js";

export const FREE_CHART_RECOVERY_DELAY_MS = 24 * 60 * 60 * 1000;
export const FREE_CHART_RECOVERY_CAPTURE_EVENT_TYPE = "notification.recovery.free-chart.captured.v1";

/** Unwired default-off private service. It cannot send mail, create purchases or call AI. */
export function createFreeChartRecoveryCaptureService(options: {
  database: Database; mode?: "disabled" | "capture"; tokenSecret: string;
  readTrustedDisplayedSource?: TrustedDisplayedSourceReader; now?: () => Date;
}) {
  const clock = options.now ?? (() => new Date());
  return {
    async scanAndCapture(limit = 25): Promise<number> {
      const reader = options.readTrustedDisplayedSource;
      if (options.mode !== "capture" || !reader) return 0;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("RECOVERY_LIMIT_INVALID");
      return options.database.transaction(async transaction => {
        await lockFreeAiCoordination(transaction);
        await lockRecoveryCaptureCoordination(transaction);
        const cutoff = new Date(clock().getTime() - FREE_CHART_RECOVERY_DELAY_MS);
        const candidates = await transaction.select().from(freeChartRecoverySources)
          .where(and(lte(freeChartRecoverySources.firstViewedAt, cutoff),
            notExists(transaction.select({ id: notificationDeliveries.id }).from(notificationDeliveries)
              .where(eq(notificationDeliveries.idempotencyKey, sql`'recovery-free-chart:' || ${freeChartRecoverySources.chartId}`)))))
          .orderBy(freeChartRecoverySources.firstViewedAt, freeChartRecoverySources.chartId).limit(limit);
        let captured = 0;
        for (const stored of candidates) {
          const source = parseDisplayedRecoverySource(stored.source);
          if (!source || stored.userId !== source.userId || stored.chartId !== source.chartId ||
              stored.chartVersionId !== source.chartVersionId || stored.firstViewedAt.getTime() !== new Date(source.firstViewedAt).getTime() ||
              stored.sourceSha256 !== freeChartRecoverySourceHash(source) || !await tryRecoveryChartLock(transaction, source.chartId)) continue;
          const idempotencyKey = `recovery-free-chart:${source.chartId}`;
          const [existing] = await transaction.select({ id: notificationDeliveries.id }).from(notificationDeliveries)
            .where(eq(notificationDeliveries.idempotencyKey, idempotencyKey));
          if (existing) continue;
          // Re-read genuine display authority and current renderer/content; stored JSON is not proof.
          const current = parseDisplayedRecoverySource(await reader({ transaction, userId: source.userId,
            chartId: source.chartId, viewReceiptSha256: source.viewReceiptSha256 }));
          if (!current || freeChartRecoverySourceHash(current) !== stored.sourceSha256) continue;
          const authority = await readFreeChartRecoveryAuthority(transaction, source, options.tokenSecret, clock);
          if (!authority || authority.now.getTime() - authority.firstViewedAt.getTime() < FREE_CHART_RECOVERY_DELAY_MS ||
              !await recoveryChartHasCapacity(transaction, source.chartId)) continue;
          const { user, now, recipientFingerprint } = authority;
          const message = renderFreeChartRecoveryEmail({ source, email: user.email, tokenSecret: options.tokenSecret, now });
          const deliveryId = randomUUID();
          await transaction.insert(notificationDeliveries).values({ id: deliveryId, idempotencyKey, kind: "recovery_free_chart",
            status: "captured", attemptCount: 0, recipientFingerprint, lastErrorCode: "RECOVERY_CAPTURE_ONLY",
            requestPayload: { version: 1, userId: source.userId, chartId: source.chartId, chartVersionId: source.chartVersionId,
              sourceSha256: stored.sourceSha256, viewReceiptSha256: source.viewReceiptSha256, firstViewedAt: source.firstViewedAt,
              locale: source.locale, productSku: source.productSku, offerKey: source.offerKey, palaceId: source.palaceId,
              teaserSha256: source.teaserSha256, ...message }, createdAt: now, updatedAt: now });
          await transaction.insert(outbox).values({ schemaVersion: 1, eventType: FREE_CHART_RECOVERY_CAPTURE_EVENT_TYPE,
            eventId: idempotencyKey, idempotencyKey, occurredAt: now, traceId: idempotencyKey,
            actorId: user.id, aggregateType: "account", aggregateId: user.id,
            payload: { deliveryId, chartVersionId: source.chartVersionId, sourceSha256: stored.sourceSha256 },
            status: "processed", processedAt: now, availableAt: now, createdAt: now, updatedAt: now });
          captured += 1;
        }
        return captured;
      });
    },
  };
}
