import { WALLET_TOPUP_UNLOCK_EVENT_TYPE } from "../commerce/wallet-topup-unlock-event.js";
import { randomUUID } from "node:crypto";

import { and, eq, gt, inArray, lte, sql } from "drizzle-orm";

import {
  accountBehaviorProfiles,
  analyticsEvents,
  analyticsFraudIpRecords,
  analyticsVisitors,
  auditLogs,
  authSessions,
  deletionRequests,
  enqueueOutbox,
  lockFreeAiCoordination,
  lockRecoveryCaptureCoordination,
  outbox,
  notificationDeliveries,
  type Database,
} from "@lasoviet/database";
import { WALLET_UPGRADE_EVENT_TYPE } from "../commerce/wallet-upgrade-event.js";

import {
  collectFreePalaceChartVersionIds,
  purgeFreePalaceForChartVersions,
} from "../ziwei/free-palace-artifact.repository.js";

export type DeletionRepositoryError =
  | "DELETION_ALREADY_REQUESTED"
  | "DELETION_RECOVERY_EXPIRED";

export type DeletionRequestInput = {
  userId: string;
  requestId: string;
  requestedAt: Date;
  recoverUntil: Date;
};

export type DeletionRepository = {
  request(
    input: DeletionRequestInput,
  ): Promise<
    | { ok: true; value: { requestId: string; recoverUntil: Date } }
    | { ok: false; error: DeletionRepositoryError }
  >;
  cancel(
    userId: string,
    requestId: string,
    now: Date,
  ): Promise<
    | { ok: true; value: { requestId: string } }
    | { ok: false; error: DeletionRepositoryError }
  >;
  purgeExpired(now: Date, limit: number): Promise<string[]>;
};

export function createDatabaseDeletionRepository(
  database: Database,
): DeletionRepository {
  return {
    async request(input) {
      return database.transaction(async (transaction) => {
        await lockRecoveryCaptureCoordination(transaction);
        const [existing] = await transaction
          .select()
          .from(deletionRequests)
          .where(eq(deletionRequests.userId, input.userId))
          .limit(1);
        if (existing?.status === "requested") {
          return { ok: false, error: "DELETION_ALREADY_REQUESTED" as const };
        }
        if (existing?.status === "purged") {
          return { ok: false, error: "DELETION_RECOVERY_EXPIRED" as const };
        }

        await transaction
          .delete(authSessions)
          .where(eq(authSessions.userId, input.userId));
        const purgeAfter = input.recoverUntil;
        const requestId = existing?.id ?? randomUUID();
        if (existing === undefined) {
          await transaction.insert(deletionRequests).values({
            id: requestId,
            userId: input.userId,
            status: "requested",
            requestedAt: input.requestedAt,
            recoverUntil: input.recoverUntil,
            purgeAfter,
          });
        } else {
          await transaction
            .update(deletionRequests)
            .set({
              status: "requested",
              requestedAt: input.requestedAt,
              recoverUntil: input.recoverUntil,
              purgeAfter,
              cancelledAt: null,
              updatedAt: input.requestedAt,
            })
            .where(eq(deletionRequests.id, requestId));
        }
        await transaction.insert(auditLogs).values({
          actorId: input.userId,
          action: "account.deletion.requested",
          targetType: "account",
          targetId: input.userId,
          requestId: input.requestId,
          metadata: { deletionRequestId: requestId },
        });
        return {
          ok: true,
          value: { requestId, recoverUntil: input.recoverUntil },
        };
      });
    },

    async cancel(userId, requestId, now) {
      return database.transaction(async (transaction) => {
        await lockRecoveryCaptureCoordination(transaction);
        const [cancelled] = await transaction
          .update(deletionRequests)
          .set({
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(deletionRequests.userId, userId),
              eq(deletionRequests.status, "requested"),
              gt(deletionRequests.recoverUntil, now),
            ),
          )
          .returning({ id: deletionRequests.id });
        if (cancelled === undefined) {
          return {
            ok: false,
            error: "DELETION_RECOVERY_EXPIRED" as const,
          };
        }
        await transaction.insert(auditLogs).values({
          actorId: userId,
          action: "account.deletion.cancelled",
          targetType: "account",
          targetId: userId,
          requestId,
          metadata: { deletionRequestId: cancelled.id },
        });
        return { ok: true, value: { requestId: cancelled.id } };
      });
    },

    async purgeExpired(now, limit) {
      const requests = await database
        .select()
        .from(deletionRequests)
        .where(
          and(
            eq(deletionRequests.status, "requested"),
            lte(deletionRequests.purgeAfter, now),
          ),
        )
        .limit(limit);
      const purged: string[] = [];
      for (const request of requests) {
        await database.transaction(async (transaction) => {
          // Coordination lock first, the same order admission and publication use.
          await lockFreeAiCoordination(transaction);
          await lockRecoveryCaptureCoordination(transaction);
          const [updated] = await transaction
            .update(deletionRequests)
            .set({
              status: "purged",
              purgedAt: now,
              updatedAt: now,
            })
            .where(
              and(
                eq(deletionRequests.id, request.id),
                eq(deletionRequests.status, "requested"),
              ),
            )
            .returning({ id: deletionRequests.id, userId: deletionRequests.userId });
          if (updated === undefined) {
            return;
          }

          // Free-palace gift payloads are purged with the account; only accounting tombstones stay.
          await purgeFreePalaceForChartVersions(
            transaction,
            await collectFreePalaceChartVersionIds(transaction, { userId: updated.userId }),
            now,
          );
          // Permanently delete all analytics rows owned by updated.userId in robust order
          await transaction
            .delete(analyticsEvents)
            .where(eq(analyticsEvents.userId, updated.userId));
          await transaction
            .delete(analyticsFraudIpRecords)
            .where(eq(analyticsFraudIpRecords.userId, updated.userId));
          await transaction
            .delete(accountBehaviorProfiles)
            .where(eq(accountBehaviorProfiles.userId, updated.userId));
          await transaction
            .delete(analyticsVisitors)
            .where(eq(analyticsVisitors.userId, updated.userId));
          // This outbox has no account FK. Remove its financial analytics payloads
          // while holding the purge marker, which also fences concurrent delivery.
          await transaction.delete(outbox).where(and(
            inArray(outbox.eventType, [WALLET_UPGRADE_EVENT_TYPE, WALLET_TOPUP_UNLOCK_EVENT_TYPE]), eq(outbox.actorId, updated.userId),
          ));
          await transaction.delete(notificationDeliveries).where(and(
            eq(notificationDeliveries.kind, "recovery_pending_topup"),
            sql`${notificationDeliveries.requestPayload}->>'userId' = ${updated.userId}`,
          ));
          await transaction.delete(outbox).where(and(
            eq(outbox.eventType, "notification.recovery.captured.v1"),
            eq(outbox.actorId, updated.userId),
          ));
          await enqueueOutbox(transaction, {
            schemaVersion: 1,
            type: "account.purge.requested.v1",
            eventId: `account-purge:${updated.id}`,
            occurredAt: now.toISOString(),
            traceId: `account-purge:${updated.id}`,
            actorId: updated.userId,
            aggregateType: "account",
            aggregateId: updated.userId,
            idempotencyKey: `account-purge:${updated.id}`,
            payload: { deletionRequestId: updated.id },
          });
          await transaction.insert(auditLogs).values({
            actorId: updated.userId,
            action: "account.purge.requested",
            targetType: "account",
            targetId: updated.userId,
            metadata: { deletionRequestId: updated.id },
          });
          purged.push(updated.id);
        });
      }
      return purged;
    },
  };
}
