import { randomUUID } from "node:crypto";

import { and, desc, eq, gt, isNull } from "drizzle-orm";

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
  revisionNumber: number;
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

async function ownedProfile(
  database: Database,
  actor: CurrentActor,
  profileId: string,
  now: Date,
) {
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
  return profile;
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
            .select({
              linkedUserId: authAnonymousActors.linkedUserId,
              expiresAt: authAnonymousActors.expiresAt,
            })
            .from(authAnonymousActors)
            .where(eq(authAnonymousActors.id, input.actor.anonymousActorId))
            .limit(1);
          if (
            anonymousActor === undefined ||
            anonymousActor.linkedUserId !== null ||
            anonymousActor.expiresAt <= input.now
          ) {
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
          revisionNumber: input.revisionNumber,
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
          metadata: { revisionId, revisionNumber: input.revisionNumber },
        });
        return {
          profileId,
          revisionId,
          revisionNumber: input.revisionNumber,
          originalInput: input.originalInput,
          normalizedInput: serializedNormalized(input.normalized),
          normalizationWarnings: input.normalized.normalizationWarnings,
          limitations: input.normalized.limitations,
        };
      });
    },

    async update(input) {
      if (input.profileId === undefined) {
        return null;
      }
      return database.transaction(async (transaction) => {
        const profile = await ownedProfile(
          transaction,
          input.actor,
          input.profileId!,
          input.now,
        );
        if (profile === undefined) {
          return null;
        }
        const revisionId = randomUUID();
        await transaction.insert(birthProfileRevisions).values({
          id: revisionId,
          profileId: input.profileId!,
          revisionNumber: input.revisionNumber,
          originalInput: input.originalInput,
          normalizedInput: serializedNormalized(input.normalized),
          normalizationWarnings: input.normalized.normalizationWarnings,
          limitations: input.normalized.limitations,
          consentVersion: input.originalInput.consentVersion,
          createdAt: input.now,
        });
        await transaction
          .update(birthProfiles)
          .set({ updatedAt: input.now })
          .where(eq(birthProfiles.id, input.profileId!));
        await transaction.insert(auditLogs).values({
          actorId:
            input.actor.kind === "account"
              ? input.actor.userId
              : input.actor.anonymousActorId,
          action: "birth_profile.revised",
          targetType: "birth_profile",
          targetId: input.profileId!,
          requestId: input.actor.requestId,
          metadata: { revisionId, revisionNumber: input.revisionNumber },
        });
        return {
          profileId: input.profileId!,
          revisionId,
          revisionNumber: input.revisionNumber,
          originalInput: input.originalInput,
          normalizedInput: serializedNormalized(input.normalized),
          normalizationWarnings: input.normalized.normalizationWarnings,
          limitations: input.normalized.limitations,
        };
      });
    },

    async read(actor, profileId, now) {
      const profile = await ownedProfile(database, actor, profileId, now);
      return profile === undefined ? null : latestRecord(database, profileId);
    },

    async archive(actor, profileId, now) {
      const profile = await ownedProfile(database, actor, profileId, now);
      if (profile === undefined) {
        return false;
      }
      await database.transaction(async (transaction) => {
        await transaction
          .update(birthProfiles)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(birthProfiles.id, profileId));
        await transaction.insert(auditLogs).values({
          actorId:
            actor.kind === "account" ? actor.userId : actor.anonymousActorId,
          action: "birth_profile.archived",
          targetType: "birth_profile",
          targetId: profileId,
          requestId: actor.requestId,
          metadata: {},
        });
      });
      return true;
    },
  };
}
