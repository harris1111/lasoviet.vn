import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { CurrentActor } from "@lasoviet/contracts";
import {
  auditLogs,
  consents,
  type Database,
} from "@lasoviet/database";

import { recordWizardConsentInTransaction } from "../analytics/analytics.repository.js";

export type ConsentRepositoryErrorCode =
  | "PROFILE_FORBIDDEN"
  | "PROFILE_NOT_FOUND"
  | "CONSENT_RECORD_FAILED";

export class ConsentRepositoryError extends Error {
  constructor(readonly code: ConsentRepositoryErrorCode) {
    super(code);
    this.name = "ConsentRepositoryError";
  }
}

export type RecordConsentInput = {
  actor: CurrentActor;
  documentKey: string;
  documentVersion: string;
  purposes: readonly string[];
  visitorId?: string | null;
  grantedAt: Date;
};

export type ConsentRecordResult = {
  id: string;
  ids: string[];
};

export type ConsentRepository = {
  record(input: RecordConsentInput): Promise<ConsentRecordResult>;
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

        // Atomic visitor consent and account linking inside the SAME transaction
        if (input.visitorId) {
          const visitorResult = await recordWizardConsentInTransaction(
            transaction,
            {
              visitorId: input.visitorId,
              owner,
              consentedAt: input.grantedAt,
              now: input.grantedAt,
            },
          );

          if (!visitorResult.ok) {
            throw new ConsentRepositoryError(visitorResult.error);
          }
        }

        const ids: string[] = [];

        // Insert consent rows and audits for all purposes atomically
        for (const purpose of input.purposes) {
          const id = randomUUID();
          const [inserted] = await transaction
            .insert(consents)
            .values({
              id,
              ...owner,
              documentKey: input.documentKey,
              documentVersion: input.documentVersion,
              purpose,
              grantedAt: input.grantedAt,
            })
            .onConflictDoNothing()
            .returning({ id: consents.id });

          if (inserted !== undefined) {
            ids.push(inserted.id);
            await transaction.insert(auditLogs).values({
              actorId:
                input.actor.kind === "account"
                  ? input.actor.userId
                  : input.actor.anonymousActorId,
              action: "consent.recorded",
              targetType: "consent",
              targetId: inserted.id,
              requestId: input.actor.requestId,
              metadata: {
                documentKey: input.documentKey,
                documentVersion: input.documentVersion,
                purpose,
              },
            });
          } else {
            // Preserves first granted timestamp and avoids duplicate audit rows on replay
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
                  eq(consents.purpose, purpose),
                ),
              )
              .limit(1);

            if (existing === undefined) {
              throw new ConsentRepositoryError("CONSENT_RECORD_FAILED");
            }
            ids.push(existing.id);
          }
        }

        return { id: ids[0] ?? "", ids };
      });
    },
  };
}
