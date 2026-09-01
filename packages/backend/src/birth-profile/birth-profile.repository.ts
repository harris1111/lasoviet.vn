import { randomUUID } from "node:crypto";

import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import type {
  BirthProfileV1,
  CurrentActor,
  NormalizedBirthProfileV1,
} from "@lasoviet/contracts";
import {
  auditLogs,
  authAnonymousActors,
  birthProfileRevisions,
  birthProfiles,
  type Database,
} from "@lasoviet/database";

export type BirthProfileRecord = {
  profileId: string;
  revisionId: string;
  revisionNumber: number;
  originalInput: Record<string, unknown>;
  normalizedInput: Record<string, unknown> | null;
  normalizationWarnings: string[] | null;
  limitations: string[] | null;
};

export type BirthProfileWriteInput = {
  actor: CurrentActor;
  profileId?: string;
  revisionNumber?: number;
  originalInput: BirthProfileV1;
  normalized: NormalizedBirthProfileV1;
  now: Date;
};

export type BirthProfileRepository = {
  create(input: BirthProfileWriteInput): Promise<BirthProfileRecord | null>;
  update(input: BirthProfileWriteInput): Promise<BirthProfileRecord | null>;
  read(
    actor: CurrentActor,
    profileId: string,
    now: Date,
  ): Promise<BirthProfileRecord | null>;
  archive(actor: CurrentActor, profileId: string, now: Date): Promise<boolean>;
};

function ownerFilter(actor: CurrentActor, now: Date) {
  return actor.kind === "account"
    ? eq(birthProfiles.userId, actor.userId)
    : and(
        eq(birthProfiles.anonymousActorId, actor.anonymousActorId),
        gt(birthProfiles.anonymousExpiresAt, now),
      );
}

function serializedNormalized(
  normalized: NormalizedBirthProfileV1,
): Record<string, unknown> {
  const { originalInput: _originalInput, ...value } = normalized;
  return value as Record<string, unknown>;
}

async function latestRecord(database: Database, profileId: string) {
  const [revision] = await database
    .select()
    .from(birthProfileRevisions)
    .where(eq(birthProfileRevisions.profileId, profileId))
    .orderBy(desc(birthProfileRevisions.revisionNumber))
    .limit(1);
  if (revision === undefined) {
    return null;
  }
  return {
    profileId,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    originalInput: revision.originalInput,
    normalizedInput: revision.normalizedInput,
    normalizationWarnings: revision.normalizationWarnings,
    limitations: revision.limitations,
  };
}

export function createDatabaseBirthProfileRepository(
  database: Database,
): BirthProfileRepository {
  return {
    async create(input) {
      return database.transaction(async (transaction) => {
        let anonymousExpiresAt: Date | null = null;
        if (input.actor.kind === "anonymous") {
          const [anonymousActor] = await transaction
            .update(authAnonymousActors)
            .set({
              expiresAt: sql`${authAnonymousActors.expiresAt}`,
            })
            .where(
              and(
                eq(authAnonymousActors.id, input.actor.anonymousActorId),
                isNull(authAnonymousActors.linkedUserId),
                isNull(authAnonymousActors.deletedAt),
                gt(authAnonymousActors.expiresAt, input.now),
              ),
            )
            .returning({ expiresAt: authAnonymousActors.expiresAt });
          if (anonymousActor === undefined) {
            return null;
          }
          anonymousExpiresAt = anonymousActor.expiresAt;
        }

        const profileId = randomUUID();
        const revisionId = randomUUID();
        await transaction.insert(birthProfiles).values(
          input.actor.kind === "account"
            ? {
                id: profileId,
                userId: input.actor.userId,
                createdAt: input.now,
                updatedAt: input.now,
              }
            : {
                id: profileId,
                anonymousActorId: input.actor.anonymousActorId,
                anonymousExpiresAt,
                createdAt: input.now,
                updatedAt: input.now,
              },
        );
        await transaction.insert(birthProfileRevisions).values({
          id: revisionId,
          profileId,
          revisionNumber: input.revisionNumber ?? 1,
          originalInput: input.originalInput,
          normalizedInput: serializedNormalized(input.normalized),
          normalizationWarnings: input.normalized.normalizationWarnings,
          limitations: input.normalized.limitations,
          consentVersion: input.originalInput.consentVersion,
          createdAt: input.now,
        });
        await transaction.insert(auditLogs).values({
          actorId:
            input.actor.kind === "account"
              ? input.actor.userId
              : input.actor.anonymousActorId,
          action: "birth_profile.created",
          targetType: "birth_profile",
          targetId: profileId,
          requestId: input.actor.requestId,
          metadata: { revisionId, revisionNumber: input.revisionNumber ?? 1 },
        });
        return {
          profileId,
          revisionId,
          revisionNumber: input.revisionNumber ?? 1,
          originalInput: input.originalInput,
          normalizedInput: serializedNormalized(input.normalized),
          normalizationWarnings: input.normalized.normalizationWarnings,
          limitations: input.normalized.limitations,
        };
      });
    },

    async update(input) {
      const profileId = input.profileId;
      if (profileId === undefined) {
        return null;
      }
      return database.transaction(async (transaction) => {
        const [profile] = await transaction
          .update(birthProfiles)
          .set({ updatedAt: input.now })
          .where(
            and(
              eq(birthProfiles.id, profileId),
              ownerFilter(input.actor, input.now),
              isNull(birthProfiles.deletedAt),
            ),
          )
          .returning({ id: birthProfiles.id });
        if (profile === undefined) {
          return null;
        }
        const existing = await latestRecord(transaction, profileId);
        if (existing === null) {
          throw new Error("BIRTH_PROFILE_REVISION_MISSING");
        }
        const revisionNumber = existing.revisionNumber + 1;
        const revisionId = randomUUID();
        await transaction.insert(birthProfileRevisions).values({
          id: revisionId,
          profileId,
          revisionNumber,
          originalInput: input.originalInput,
          normalizedInput: serializedNormalized(input.normalized),
          normalizationWarnings: input.normalized.normalizationWarnings,
          limitations: input.normalized.limitations,
          consentVersion: input.originalInput.consentVersion,
          createdAt: input.now,
        });
        await transaction.insert(auditLogs).values({
          actorId:
            input.actor.kind === "account"
              ? input.actor.userId
              : input.actor.anonymousActorId,
          action: "birth_profile.revised",
          targetType: "birth_profile",
          targetId: profileId,
          requestId: input.actor.requestId,
          metadata: { revisionId, revisionNumber },
        });
        return {
          profileId,
          revisionId,
          revisionNumber,
          originalInput: input.originalInput,
          normalizedInput: serializedNormalized(input.normalized),
          normalizationWarnings: input.normalized.normalizationWarnings,
          limitations: input.normalized.limitations,
        };
      });
    },

    async read(actor, profileId, now) {
      const [record] = await database
        .select({
          profileId: birthProfiles.id,
          revisionId: birthProfileRevisions.id,
          revisionNumber: birthProfileRevisions.revisionNumber,
          originalInput: birthProfileRevisions.originalInput,
          normalizedInput: birthProfileRevisions.normalizedInput,
          normalizationWarnings: birthProfileRevisions.normalizationWarnings,
          limitations: birthProfileRevisions.limitations,
        })
        .from(birthProfiles)
        .innerJoin(
          birthProfileRevisions,
          and(
            eq(birthProfileRevisions.profileId, birthProfiles.id),
            eq(
              birthProfileRevisions.revisionNumber,
              sql<number>`(
                SELECT MAX("revision_number")
                FROM "birth_profile_revisions"
                WHERE "profile_id" = ${birthProfiles.id}
              )`,
            ),
          ),
        )
        .where(
          and(
            eq(birthProfiles.id, profileId),
            ownerFilter(actor, now),
            isNull(birthProfiles.deletedAt),
          ),
        )
        .limit(1);
      return record ?? null;
    },

    async archive(actor, profileId, now) {
      return database.transaction(async (transaction) => {
        const [profile] = await transaction
          .update(birthProfiles)
          .set({ deletedAt: now, updatedAt: now })
          .where(
            and(
              eq(birthProfiles.id, profileId),
              ownerFilter(actor, now),
              isNull(birthProfiles.deletedAt),
            ),
          )
          .returning({ id: birthProfiles.id });
        if (profile === undefined) {
          return false;
        }
        await transaction.insert(auditLogs).values({
          actorId:
            actor.kind === "account" ? actor.userId : actor.anonymousActorId,
          action: "birth_profile.archived",
          targetType: "birth_profile",
          targetId: profileId,
          requestId: actor.requestId,
          metadata: {},
        });
        return true;
      });
    },
  };
}
