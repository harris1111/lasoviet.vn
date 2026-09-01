import { randomUUID } from "node:crypto";

import { and, eq, gt, lte } from "drizzle-orm";

import {
  auditLogs,
  authSessions,
  deletionRequests,
  enqueueOutbox,
  type Database,
} from "@lasoviet/database";

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
  purgeExpired(now: Date): Promise<string[]>;
};

export function createDatabaseDeletionRepository(
  database: Database,
): DeletionRepository {
  return {
    async request(input) {
      return database.transaction(async (transaction) => {
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

    async purgeExpired(now) {
      const requests = await database
        .select()
        .from(deletionRequests)
        .where(
          and(
            eq(deletionRequests.status, "requested"),
            lte(deletionRequests.purgeAfter, now),
          ),
        );
      const purged: string[] = [];
      for (const request of requests) {
        await database.transaction(async (transaction) => {
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
