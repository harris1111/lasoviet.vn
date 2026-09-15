import { randomUUID } from "node:crypto";

import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";

import type {
  CurrentActor,
  LifeStageV1,
  ReadingContextV1,
  Result,
  TopConcernV1,
} from "@lasoviet/contracts";
import {
  auditLogs,
  birthProfileReadingContextMutationReceipts,
  birthProfileReadingContextRevisions,
  birthProfileReadingContexts,
  birthProfiles,
  type Database,
} from "@lasoviet/database";

export type ReadingContextCurrentRecord = {
  profileId: string;
  revisionId: string | null;
  revisionNumber: number | null;
  stateVersion: number;
  lifeStage: LifeStageV1 | null;
  topConcern: TopConcernV1 | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type ReadingContextRevisionRecord = {
  profileId: string;
  revisionId: string;
  revisionNumber: number;
  lifeStage: LifeStageV1 | null;
  topConcern: TopConcernV1 | null;
  createdAt: Date;
};

export type MutationReceiptRecord = {
  profileId: string;
  idempotencyKey: string;
  commandType: "set" | "clear";
  requestFingerprint: string;
  resultStateVersion: number;
  resultRevisionId: string | null;
  resultRevisionNumber: number | null;
  resultKind: "created" | "updated" | "cleared";
  createdAt: Date;
};

export type ReadingContextRepositoryError =
  | "READING_CONTEXT_CONFLICT"
  | "IDEMPOTENCY_KEY_REUSED"
  | "PROFILE_NOT_FOUND";

export type ReadingContextMutationOperation = {
  commandType: "set" | "clear";
  context?: ReadingContextV1;
  expectedStateVersion: number;
  idempotencyKey: string;
  requestFingerprint: string;
  now: Date;
};

export type ReadingContextRepository = {
  getCurrent(
    actor: CurrentActor,
    profileId: string,
    now: Date,
  ): Promise<ReadingContextCurrentRecord | null>;
  getRevision(
    actor: CurrentActor,
    profileId: string,
    revisionId: string,
    now: Date,
  ): Promise<ReadingContextRevisionRecord | null>;
  listRevisions(
    actor: CurrentActor,
    profileId: string,
    now: Date,
  ): Promise<ReadingContextRevisionRecord[] | null>;
  getReceipt(
    actor: CurrentActor,
    profileId: string,
    idempotencyKey: string,
    now: Date,
  ): Promise<MutationReceiptRecord | null>;
  mutateContextWithAdvisoryLock(
    actor: CurrentActor,
    profileId: string,
    operation: ReadingContextMutationOperation,
  ): Promise<Result<ReadingContextCurrentRecord, ReadingContextRepositoryError>>;
};

function ownerFilter(actor: CurrentActor, now: Date) {
  return actor.kind === "account"
    ? eq(birthProfiles.userId, actor.userId)
    : and(
        eq(birthProfiles.anonymousActorId, actor.anonymousActorId),
        gt(birthProfiles.anonymousExpiresAt, now),
      );
}

function actorId(actor: CurrentActor): string {
  return actor.kind === "account" ? actor.userId : actor.anonymousActorId;
}

function notFound(): Result<never, "PROFILE_NOT_FOUND"> {
  return {
    ok: false,
    error: {
      code: "PROFILE_NOT_FOUND",
      messageKey: "readingContext.profile_not_found",
      retryable: false,
    },
  };
}

function conflict(): Result<never, "READING_CONTEXT_CONFLICT"> {
  return {
    ok: false,
    error: {
      code: "READING_CONTEXT_CONFLICT",
      messageKey: "readingContext.reading_context_conflict",
      retryable: false,
    },
  };
}

function keyReused(): Result<never, "IDEMPOTENCY_KEY_REUSED"> {
  return {
    ok: false,
    error: {
      code: "IDEMPOTENCY_KEY_REUSED",
      messageKey: "readingContext.idempotency_key_reused",
      retryable: false,
    },
  };
}

function toRevisionRecord(
  row: typeof birthProfileReadingContextRevisions.$inferSelect,
): ReadingContextRevisionRecord {
  return {
    profileId: row.profileId,
    revisionId: row.id,
    revisionNumber: row.revisionNumber,
    lifeStage: row.lifeStage as LifeStageV1 | null,
    topConcern: row.topConcern as TopConcernV1 | null,
    createdAt: row.createdAt,
  };
}

function toReceiptRecord(
  row: typeof birthProfileReadingContextMutationReceipts.$inferSelect,
): MutationReceiptRecord {
  return {
    profileId: row.profileId,
    idempotencyKey: row.idempotencyKey,
    commandType: row.commandType as "set" | "clear",
    requestFingerprint: row.requestFingerprint,
    resultStateVersion: row.resultStateVersion,
    resultRevisionId: row.resultRevisionId,
    resultRevisionNumber: row.resultRevisionNumber,
    resultKind: row.resultKind as "created" | "updated" | "cleared",
    createdAt: row.createdAt,
  };
}

async function hasActiveProfile(
  database: Database,
  actor: CurrentActor,
  profileId: string,
  now: Date,
): Promise<boolean> {
  const [profile] = await database
    .select({ id: birthProfiles.id })
    .from(birthProfiles)
    .where(
      and(
        eq(birthProfiles.id, profileId),
        ownerFilter(actor, now),
        isNull(birthProfiles.deletedAt),
      ),
    )
    .limit(1);
  return profile !== undefined;
}

async function currentRecord(
  database: Database,
  profileId: string,
): Promise<ReadingContextCurrentRecord> {
  const [state] = await database
    .select()
    .from(birthProfileReadingContexts)
    .where(eq(birthProfileReadingContexts.profileId, profileId))
    .limit(1);
  if (state === undefined) {
    return {
      profileId,
      revisionId: null,
      revisionNumber: null,
      stateVersion: 0,
      lifeStage: null,
      topConcern: null,
      createdAt: null,
      updatedAt: null,
    };
  }
  if (state.currentRevisionId === null) {
    return {
      profileId,
      revisionId: null,
      revisionNumber: null,
      stateVersion: state.stateVersion,
      lifeStage: null,
      topConcern: null,
      createdAt: null,
      updatedAt: state.updatedAt,
    };
  }
  const [revision] = await database
    .select()
    .from(birthProfileReadingContextRevisions)
    .where(
      and(
        eq(birthProfileReadingContextRevisions.profileId, profileId),
        eq(birthProfileReadingContextRevisions.id, state.currentRevisionId),
      ),
    )
    .limit(1);
  if (revision === undefined) {
    throw new Error("READING_CONTEXT_CURRENT_REVISION_MISSING");
  }
  return {
    profileId,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    stateVersion: state.stateVersion,
    lifeStage: revision.lifeStage as LifeStageV1 | null,
    topConcern: revision.topConcern as TopConcernV1 | null,
    createdAt: revision.createdAt,
    updatedAt: state.updatedAt,
  };
}

async function replayReceipt(
  database: Database,
  receipt: MutationReceiptRecord,
): Promise<ReadingContextCurrentRecord> {
  if (receipt.resultRevisionId === null) {
    return {
      profileId: receipt.profileId,
      revisionId: null,
      revisionNumber: null,
      stateVersion: receipt.resultStateVersion,
      lifeStage: null,
      topConcern: null,
      createdAt: null,
      updatedAt: receipt.createdAt,
    };
  }
  const [revision] = await database
    .select()
    .from(birthProfileReadingContextRevisions)
    .where(
      and(
        eq(birthProfileReadingContextRevisions.profileId, receipt.profileId),
        eq(birthProfileReadingContextRevisions.id, receipt.resultRevisionId),
      ),
    )
    .limit(1);
  if (revision === undefined) {
    throw new Error("READING_CONTEXT_RECEIPT_REVISION_MISSING");
  }
  return {
    profileId: receipt.profileId,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    stateVersion: receipt.resultStateVersion,
    lifeStage: revision.lifeStage as LifeStageV1 | null,
    topConcern: revision.topConcern as TopConcernV1 | null,
    createdAt: revision.createdAt,
    updatedAt: receipt.createdAt,
  };
}

export function createDatabaseReadingContextRepository(
  database: Database,
): ReadingContextRepository {
  return {
    async getCurrent(actor, profileId, now) {
      if (!(await hasActiveProfile(database, actor, profileId, now))) {
        return null;
      }
      return currentRecord(database, profileId);
    },

    async getRevision(actor, profileId, revisionId, now) {
      if (!(await hasActiveProfile(database, actor, profileId, now))) {
        return null;
      }
      const [revision] = await database
        .select()
        .from(birthProfileReadingContextRevisions)
        .where(
          and(
            eq(birthProfileReadingContextRevisions.profileId, profileId),
            eq(birthProfileReadingContextRevisions.id, revisionId),
          ),
        )
        .limit(1);
      return revision === undefined ? null : toRevisionRecord(revision);
    },

    async listRevisions(actor, profileId, now) {
      if (!(await hasActiveProfile(database, actor, profileId, now))) {
        return null;
      }
      const rows = await database
        .select()
        .from(birthProfileReadingContextRevisions)
        .where(eq(birthProfileReadingContextRevisions.profileId, profileId))
        .orderBy(asc(birthProfileReadingContextRevisions.revisionNumber));
      return rows.map(toRevisionRecord);
    },

    async getReceipt(actor, profileId, idempotencyKey, now) {
      if (!(await hasActiveProfile(database, actor, profileId, now))) {
        return null;
      }
      const [receipt] = await database
        .select()
        .from(birthProfileReadingContextMutationReceipts)
        .where(
          and(
            eq(birthProfileReadingContextMutationReceipts.profileId, profileId),
            eq(
              birthProfileReadingContextMutationReceipts.idempotencyKey,
              idempotencyKey,
            ),
          ),
        )
        .limit(1);
      return receipt === undefined ? null : toReceiptRecord(receipt);
    },

    async mutateContextWithAdvisoryLock(actor, profileId, operation) {
      return database.transaction(async (transaction) => {
        await transaction.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${`reading_context:${profileId}`}))`,
        );
        if (!(await hasActiveProfile(transaction, actor, profileId, operation.now))) {
          return notFound();
        }

        const [storedReceipt] = await transaction
          .select()
          .from(birthProfileReadingContextMutationReceipts)
          .where(
            and(
              eq(
                birthProfileReadingContextMutationReceipts.profileId,
                profileId,
              ),
              eq(
                birthProfileReadingContextMutationReceipts.idempotencyKey,
                operation.idempotencyKey,
              ),
            ),
          )
          .limit(1);
        if (storedReceipt !== undefined) {
          const receipt = toReceiptRecord(storedReceipt);
          if (receipt.requestFingerprint !== operation.requestFingerprint) {
            return keyReused();
          }
          return { ok: true as const, value: await replayReceipt(transaction, receipt) };
        }

        const [state] = await transaction
          .select()
          .from(birthProfileReadingContexts)
          .where(eq(birthProfileReadingContexts.profileId, profileId))
          .limit(1);
        const stateVersion = state?.stateVersion ?? 0;
        const lastRevisionNumber = state?.lastRevisionNumber ?? 0;
        if (stateVersion !== operation.expectedStateVersion) {
          return conflict();
        }

        if (operation.commandType === "clear") {
          if (state === undefined) {
            return conflict();
          }
          const nextStateVersion = stateVersion + 1;
          await transaction
            .update(birthProfileReadingContexts)
            .set({
              currentRevisionId: null,
              stateVersion: nextStateVersion,
              updatedAt: operation.now,
            })
            .where(eq(birthProfileReadingContexts.profileId, profileId));
          await transaction.insert(auditLogs).values({
            actorId: actorId(actor),
            action: "birth_profile.reading_context.cleared",
            targetType: "birth_profile",
            targetId: profileId,
            requestId: actor.requestId,
            metadata: {
              profileId,
              revisionId: null,
              revisionNumber: null,
              stateVersion: nextStateVersion,
              hasLifeStage: false,
              hasTopConcern: false,
              action: "clear",
              outcome: "success",
            },
          });
          await transaction.insert(birthProfileReadingContextMutationReceipts).values({
            profileId,
            idempotencyKey: operation.idempotencyKey,
            commandType: "clear",
            requestFingerprint: operation.requestFingerprint,
            resultStateVersion: nextStateVersion,
            resultRevisionId: null,
            resultRevisionNumber: null,
            resultKind: "cleared",
            createdAt: operation.now,
          });
          return {
            ok: true as const,
            value: {
              profileId,
              revisionId: null,
              revisionNumber: null,
              stateVersion: nextStateVersion,
              lifeStage: null,
              topConcern: null,
              createdAt: null,
              updatedAt: operation.now,
            },
          };
        }

        if (operation.context === undefined) {
          throw new Error("READING_CONTEXT_SET_INPUT_MISSING");
        }
        const revisionId = randomUUID();
        const revisionNumber = lastRevisionNumber + 1;
        const nextStateVersion = stateVersion + 1;
        const resultKind = stateVersion === 0 ? "created" : "updated";
        await transaction.insert(birthProfileReadingContextRevisions).values({
          id: revisionId,
          profileId,
          revisionNumber,
          lifeStage: operation.context.lifeStage,
          topConcern: operation.context.topConcern,
          createdAt: operation.now,
        });
        if (state === undefined) {
          await transaction.insert(birthProfileReadingContexts).values({
            profileId,
            currentRevisionId: revisionId,
            stateVersion: nextStateVersion,
            lastRevisionNumber: revisionNumber,
            updatedAt: operation.now,
          });
        } else {
          await transaction
            .update(birthProfileReadingContexts)
            .set({
              currentRevisionId: revisionId,
              stateVersion: nextStateVersion,
              lastRevisionNumber: revisionNumber,
              updatedAt: operation.now,
            })
            .where(eq(birthProfileReadingContexts.profileId, profileId));
        }
        await transaction.insert(auditLogs).values({
          actorId: actorId(actor),
          action: `birth_profile.reading_context.${resultKind}`,
          targetType: "birth_profile",
          targetId: profileId,
          requestId: actor.requestId,
          metadata: {
            profileId,
            revisionId,
            revisionNumber,
            stateVersion: nextStateVersion,
            hasLifeStage: operation.context.lifeStage !== undefined,
            hasTopConcern: operation.context.topConcern !== undefined,
            action: "set",
            outcome: "success",
          },
        });
        await transaction.insert(birthProfileReadingContextMutationReceipts).values({
          profileId,
          idempotencyKey: operation.idempotencyKey,
          commandType: "set",
          requestFingerprint: operation.requestFingerprint,
          resultStateVersion: nextStateVersion,
          resultRevisionId: revisionId,
          resultRevisionNumber: revisionNumber,
          resultKind,
          createdAt: operation.now,
        });
        return {
          ok: true as const,
          value: {
            profileId,
            revisionId,
            revisionNumber,
            stateVersion: nextStateVersion,
            lifeStage: operation.context.lifeStage ?? null,
            topConcern: operation.context.topConcern ?? null,
            createdAt: operation.now,
            updatedAt: operation.now,
          },
        };
      });
    },
  };
}
