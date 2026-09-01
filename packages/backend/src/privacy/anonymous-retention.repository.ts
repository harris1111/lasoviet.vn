import { and, eq, isNull, lte } from "drizzle-orm";

import {
  auditLogs,
  authAnonymousActors,
  authUsers,
  enqueueOutbox,
  type Database,
} from "@lasoviet/database";

import type {
  AnonymousRetentionError,
  AnonymousRetentionRepository,
} from "./anonymous-retention.service.js";

async function deleteActor(
  database: Database,
  actorId: string,
  now: Date,
  requireExpiry: boolean,
): Promise<
  | { ok: true; value: { actorId: string } }
  | { ok: false; error: AnonymousRetentionError }
> {
  return database.transaction(async (transaction) => {
    const [actor] = await transaction
      .delete(authAnonymousActors)
      .where(
        and(
          eq(authAnonymousActors.id, actorId),
          isNull(authAnonymousActors.linkedUserId),
          ...(requireExpiry
            ? [lte(authAnonymousActors.expiresAt, now)]
            : []),
        ),
      )
      .returning({
        id: authAnonymousActors.id,
        expiresAt: authAnonymousActors.expiresAt,
      });
    if (actor === undefined) {
      const [existing] = await transaction
        .select({
          id: authAnonymousActors.id,
          linkedUserId: authAnonymousActors.linkedUserId,
          expiresAt: authAnonymousActors.expiresAt,
        })
        .from(authAnonymousActors)
        .where(eq(authAnonymousActors.id, actorId))
        .limit(1);
      if (existing === undefined) {
        return { ok: true, value: { actorId } };
      }
      if (existing.linkedUserId !== null) {
        return { ok: false, error: "ANONYMOUS_ALREADY_LINKED" };
      }
      return { ok: false, error: "ANONYMOUS_NOT_EXPIRED" };
    }

    await enqueueOutbox(transaction, {
      schemaVersion: 1,
      type: "anonymous.purge.requested.v1",
      eventId: `anonymous-purge:${actor.id}`,
      occurredAt: now.toISOString(),
      traceId: `anonymous-purge:${actor.id}`,
      actorId: actor.id,
      aggregateType: "account",
      aggregateId: actor.id,
      idempotencyKey: `anonymous-purge:${actor.id}`,
      payload: { anonymousActorId: actor.id },
    });
    await transaction.insert(auditLogs).values({
      actorId: actor.id,
      action: requireExpiry
        ? "anonymous.purge.expired"
        : "anonymous.deletion.requested",
      targetType: "anonymous_actor",
      targetId: actor.id,
      metadata: { retentionBoundary: requireExpiry ? "expired" : "manual" },
    });
    await transaction
      .delete(authUsers)
      .where(eq(authUsers.id, actor.id));
    return { ok: true, value: { actorId: actor.id } };
  });
}

export function createDatabaseAnonymousRetentionRepository(
  database: Database,
): AnonymousRetentionRepository {
  return {
    async purgeExpired(now, limit) {
      const actors = await database
        .select({ id: authAnonymousActors.id })
        .from(authAnonymousActors)
        .where(
          and(
            isNull(authAnonymousActors.linkedUserId),
            lte(authAnonymousActors.expiresAt, now),
          ),
        )
        .limit(limit);
      const purged: string[] = [];
      for (const actor of actors) {
        const result = await deleteActor(database, actor.id, now, true);
        if (result.ok) {
          purged.push(result.value.actorId);
        }
      }
      return purged;
    },

    async purgeActor(actorId, now) {
      return deleteActor(database, actorId, now, true);
    },

    async deleteNow(actorId) {
      return deleteActor(database, actorId, new Date(), false);
    },
  };
}
