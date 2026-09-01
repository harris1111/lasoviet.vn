import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { CurrentActor } from "@lasoviet/contracts";
import {
  auditLogs,
  consents,
  type Database,
} from "@lasoviet/database";

export type RecordConsentInput = {
  actor: CurrentActor;
  documentKey: string;
  documentVersion: string;
  purpose: string;
  grantedAt: Date;
};

export type ConsentRepository = {
  record(input: RecordConsentInput): Promise<{ id: string }>;
};

export function createDatabaseConsentRepository(
  database: Database,
): ConsentRepository {
  return {
    async record(input) {
      return database.transaction(async (transaction) => {
        const owner =
          input.actor.kind === "account"
            ? { userId: input.actor.userId, anonymousActorId: null }
            : { userId: null, anonymousActorId: input.actor.anonymousActorId };
        const [existing] = await transaction
          .select({ id: consents.id })
          .from(consents)
          .where(
            and(
              input.actor.kind === "account"
                ? eq(consents.userId, input.actor.userId)
                : eq(consents.anonymousActorId, input.actor.anonymousActorId),
              eq(consents.documentKey, input.documentKey),
              eq(consents.documentVersion, input.documentVersion),
              eq(consents.purpose, input.purpose),
            ),
          )
          .limit(1);
        if (existing !== undefined) {
          return existing;
        }
        const id = randomUUID();
        await transaction.insert(consents).values({
          id,
          ...owner,
          documentKey: input.documentKey,
          documentVersion: input.documentVersion,
          purpose: input.purpose,
          grantedAt: input.grantedAt,
        });
        await transaction.insert(auditLogs).values({
          actorId:
            input.actor.kind === "account"
              ? input.actor.userId
              : input.actor.anonymousActorId,
          action: "consent.recorded",
          targetType: "consent",
          targetId: id,
          requestId: input.actor.requestId,
          metadata: {
            documentKey: input.documentKey,
            documentVersion: input.documentVersion,
            purpose: input.purpose,
          },
        });
        return { id };
      });
    },
  };
}
