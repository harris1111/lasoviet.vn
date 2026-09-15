import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import {
  accountBehaviorProfiles,
  analyticsEvents,
  analyticsFraudIpRecords,
  analyticsVisitors,
  birthProfiles,
  type Database,
} from "@lasoviet/database";
import {
  isApprovedInterestTopic,
  rebuildBehaviorProfileFromEvents,
  toAccountBehaviorProfileV1,
  type ApprovedInterestTopicCode,
  type ExistingBehaviorProfile,
} from "./account-behavior-profile.js";
import type { AccountBehaviorProfileV1 } from "@lasoviet/contracts";

export type AnalyticsVisitorRecord = typeof analyticsVisitors.$inferSelect;
export type AnalyticsEventRecord = typeof analyticsEvents.$inferSelect;
export type AccountBehaviorProfileRecord = typeof accountBehaviorProfiles.$inferSelect;
export type AnalyticsFraudIpRecord = typeof analyticsFraudIpRecords.$inferSelect;

export type LinkVisitorResult =
  | { ok: true; visitor: AnalyticsVisitorRecord }
  | { ok: false; error: "VISITOR_ACCOUNT_CONFLICT" };

export type IngestEventRecordInput = {
  id?: string;
  idempotencyKey: string;
  visitorId: string;
  userId?: string | null;
  anonymousActorId?: string | null;
  birthProfileId?: string | null;
  name: string;
  properties: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  deviceClass?: string | null;
  locale?: string | null;
  pathname?: string | null;
  occurredAt: Date;
  now: Date;
};

export type RecordEventResult =
  | { ok: true; replayed: boolean; event: AnalyticsEventRecord }
  | {
      ok: false;
      error:
        | "IDEMPOTENCY_KEY_CONFLICT"
        | "VISITOR_ACCOUNT_CONFLICT"
        | "PROFILE_NOT_FOUND"
        | "PROFILE_FORBIDDEN";
    };

export type RecordConsentResult =
  | { ok: true }
  | { ok: false; error: "PROFILE_NOT_FOUND" | "PROFILE_FORBIDDEN" };

export type AssociateProfileResult =
  | { ok: true }
  | { ok: false; error: "PROFILE_NOT_FOUND" | "PROFILE_FORBIDDEN" | "VISITOR_NOT_FOUND" };

export type UpdateInterestTopicsResult =
  | { ok: true; profile: AccountBehaviorProfileV1 }
  | { ok: false; error: "INVALID_TOPIC_CODES" };

export type RecordFraudIpResult =
  | { ok: true; record: AnalyticsFraudIpRecord }
  | { ok: false; error: "FRAUD_IP_ACCOUNT_CONFLICT" };

export type ListAccountEventsResult =
  | { ok: true; events: AnalyticsEventRecord[] }
  | { ok: false; error: "ANALYTICS_EXPORT_LIMIT_EXCEEDED" };

type AnalyticsRepositoryTestHooks = {
  afterLinkVisitorLock?: () => Promise<void>;
  afterFraudVisitorLock?: () => Promise<void>;
  beforeDeleteExpiredEvents?: (candidateIds: string[]) => Promise<void>;
  beforeDeleteExpiredVisitors?: (candidateIds: string[]) => Promise<void>;
};

export type AnalyticsRepository = {
  findVisitorById(visitorId: string): Promise<AnalyticsVisitorRecord | null>;
  getOrCreateVisitor(input: {
    id: string;
    now: Date;
  }): Promise<AnalyticsVisitorRecord>;
  linkVisitorToAccount(params: {
    visitorId: string;
    userId: string;
    now: Date;
  }): Promise<LinkVisitorResult>;
  recordWizardConsent(params: {
    visitorId: string;
    birthProfileId?: string | null;
    owner?: { userId?: string | null; anonymousActorId?: string | null };
    consentedAt: Date;
    now: Date;
  }): Promise<RecordConsentResult>;
  associateBirthProfile(params: {
    visitorId: string;
    birthProfileId: string;
    owner: { userId?: string | null; anonymousActorId?: string | null };
    now: Date;
  }): Promise<AssociateProfileResult>;
  recordEvent(input: IngestEventRecordInput): Promise<RecordEventResult>;
  getAccountBehaviorProfile(userId: string): Promise<AccountBehaviorProfileV1 | null>;
  updateInterestTopics(
    userId: string,
    topics: string[],
    now: Date,
  ): Promise<UpdateInterestTopicsResult>;
  listAccountEvents(userId: string): Promise<ListAccountEventsResult>;
  recordFraudIp(params: {
    id?: string;
    ip: string;
    action: string;
    visitorId?: string | null;
    userId?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
    now: Date;
  }): Promise<RecordFraudIpResult>;
  deleteExpiredUnlinkedEvents(now: Date, limit: number): Promise<number>;
  deleteExpiredUnlinkedVisitors(now: Date, limit: number): Promise<number>;
  scrubExpiredIp(now: Date, limit: number): Promise<number>;
  deleteExpiredFraudIp(now: Date, limit: number): Promise<number>;
};

const ADVISORY_LOCK_NAMESPACES = {
  VISITOR: "analytics_visitor:",
  IDEMPOTENCY: "analytics_idem:",
  BEHAVIOR_PROFILE: "behavior_profile:",
} as const;

// Stable lock hierarchy:
// Level 1: Visitor lock - pg_advisory_xact_lock(hashtext("analytics_visitor:" + visitorId))
// Level 2: Idempotency lock - pg_advisory_xact_lock(hashtext("analytics_idem:" + idempotencyKey))
// Level 3: User behavior profile lock - pg_advisory_xact_lock(hashtext("behavior_profile:" + userId))
//
// Documented lock ordering guarantee:
// Any operation acquiring multiple locks MUST acquire Level 1 before Level 2, and Level 2 before Level 3.
// Operations never acquire locks in reverse order, preventing deadlocks.

type DatabaseOrTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function lockVisitor(tx: DatabaseOrTransaction, visitorId: string): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${ADVISORY_LOCK_NAMESPACES.VISITOR + visitorId}))`,
  );
}

async function lockIdempotencyKey(tx: DatabaseOrTransaction, idempotencyKey: string): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${ADVISORY_LOCK_NAMESPACES.IDEMPOTENCY + idempotencyKey}))`,
  );
}

async function lockUserBehaviorProfile(tx: DatabaseOrTransaction, userId: string): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${ADVISORY_LOCK_NAMESPACES.BEHAVIOR_PROFILE + userId}))`,
  );
}

function calculateIpExpiry(now: Date): Date {
  const d = new Date(now.getTime());
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

function calculateUnlinkedExpiry(now: Date): Date {
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

function earlierDate(first: Date, second: Date): Date {
  return first.getTime() <= second.getTime() ? first : second;
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a as Record<string, unknown>).sort();
  const keysB = Object.keys(b as Record<string, unknown>).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const keyA = keysA[i];
    const keyB = keysB[i];
    if (!keyA || !keyB || keyA !== keyB) return false;
    if (
      !isDeepEqual(
        (a as Record<string, unknown>)[keyA],
        (b as Record<string, unknown>)[keyB],
      )
    ) {
      return false;
    }
  }
  return true;
}

async function rebuildAccountBehaviorProfile(
  tx: DatabaseOrTransaction,
  userId: string,
  now: Date,
): Promise<void> {
  const allEvents = await tx
    .select({
      id: analyticsEvents.id,
      name: analyticsEvents.name,
      properties: analyticsEvents.properties,
      occurredAt: analyticsEvents.occurredAt,
    })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.userId, userId))
    .orderBy(asc(analyticsEvents.occurredAt), asc(analyticsEvents.id));

  const [existingProfile] = await tx
    .select()
    .from(accountBehaviorProfiles)
    .where(eq(accountBehaviorProfiles.userId, userId))
    .limit(1);

  const update = rebuildBehaviorProfileFromEvents(
    existingProfile as ExistingBehaviorProfile | null,
    allEvents.map((e) => ({
      id: e.id,
      name: e.name,
      properties: (e.properties ?? {}) as Record<string, unknown>,
      occurredAt: e.occurredAt,
    })),
  );

  if (existingProfile) {
    await tx
      .update(accountBehaviorProfiles)
      .set({
        lockedSectionsViewed: update.lockedSectionsViewed ?? [],
        topupPacksViewed: update.topupPacksViewed ?? [],
        laBalance: update.laBalance ?? null,
        lastReturnAt: update.lastReturnAt ?? null,
        reportReadDepthPercent: update.reportReadDepthPercent ?? null,
        lastEventAt: update.lastEventAt ?? null,
        updatedAt: now,
      })
      .where(eq(accountBehaviorProfiles.userId, userId));
  } else if (allEvents.length > 0) {
    await tx.insert(accountBehaviorProfiles).values({
      id: randomUUID(),
      userId,
      version: 1,
      lockedSectionsViewed: update.lockedSectionsViewed ?? [],
      topupPacksViewed: update.topupPacksViewed ?? [],
      laBalance: update.laBalance ?? null,
      lastReturnAt: update.lastReturnAt ?? null,
      reportReadDepthPercent: update.reportReadDepthPercent ?? null,
      interestTopics: update.interestTopics ?? [],
      lastEventAt: update.lastEventAt ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

function createDatabaseAnalyticsRepositoryInternal(
  database: Database,
  testHooks?: AnalyticsRepositoryTestHooks,
): AnalyticsRepository {
  return {
    async findVisitorById(visitorId) {
      const [visitor] = await database
        .select()
        .from(analyticsVisitors)
        .where(eq(analyticsVisitors.id, visitorId))
        .limit(1);
      return visitor ?? null;
    },

    async getOrCreateVisitor(input) {
      return database.transaction(async (tx) => {
        await lockVisitor(tx, input.id);

        const [existing] = await tx
          .select()
          .from(analyticsVisitors)
          .where(eq(analyticsVisitors.id, input.id))
          .limit(1);

        if (existing) {
          // Unlinked visitor expiry is fixed at first collection + 30 days; do NOT extend on subsequent activity
          const [updated] = await tx
            .update(analyticsVisitors)
            .set({
              lastSeenAt: input.now,
              updatedAt: input.now,
            })
            .where(eq(analyticsVisitors.id, input.id))
            .returning();
          return updated ?? existing;
        }

        const unlinkedExpiry = calculateUnlinkedExpiry(input.now);
        const [created] = await tx
          .insert(analyticsVisitors)
          .values({
            id: input.id,
            userId: null,
            firstSeenAt: input.now,
            lastSeenAt: input.now,
            expiresAt: unlinkedExpiry,
            createdAt: input.now,
            updatedAt: input.now,
          })
          .onConflictDoNothing({ target: analyticsVisitors.id })
          .returning();

        if (created) return created;

        const [fallback] = await tx
          .select()
          .from(analyticsVisitors)
          .where(eq(analyticsVisitors.id, input.id))
          .limit(1);

        if (!fallback) throw new Error("Failed to get or create visitor");
        return fallback;
      });
    },

    async linkVisitorToAccount(params) {
      return database.transaction(async (tx) => {
        // Level 1: visitor lock
        await lockVisitor(tx, params.visitorId);
        await testHooks?.afterLinkVisitorLock?.();
        // Level 3: behavior profile lock
        await lockUserBehaviorProfile(tx, params.userId);

        const [existing] = await tx
          .select()
          .from(analyticsVisitors)
          .where(eq(analyticsVisitors.id, params.visitorId))
          .limit(1);

        let visitorRecord: AnalyticsVisitorRecord;

        if (!existing) {
          const [created] = await tx
            .insert(analyticsVisitors)
            .values({
              id: params.visitorId,
              userId: params.userId,
              linkedAt: params.now,
              expiresAt: null,
              firstSeenAt: params.now,
              lastSeenAt: params.now,
              createdAt: params.now,
              updatedAt: params.now,
            })
            .onConflictDoNothing({ target: analyticsVisitors.id })
            .returning();

          if (!created) {
            const [reRead] = await tx
              .select()
              .from(analyticsVisitors)
              .where(eq(analyticsVisitors.id, params.visitorId))
              .limit(1);
            if (!reRead) throw new Error("Failed to create visitor");
            if (reRead.userId !== null && reRead.userId !== params.userId) {
              return { ok: false, error: "VISITOR_ACCOUNT_CONFLICT" };
            }
            visitorRecord = reRead;
          } else {
            visitorRecord = created;
          }
        } else {
          if (existing.userId !== null && existing.userId !== params.userId) {
            return { ok: false, error: "VISITOR_ACCOUNT_CONFLICT" };
          }

          if (existing.userId === params.userId) {
            if (existing.expiresAt !== null || existing.linkedAt === null) {
              const [updated] = await tx
                .update(analyticsVisitors)
                .set({
                  expiresAt: null,
                  linkedAt: existing.linkedAt ?? params.now,
                  lastSeenAt: params.now,
                  updatedAt: params.now,
                })
                .where(eq(analyticsVisitors.id, params.visitorId))
                .returning();
              visitorRecord = updated ?? existing;
            } else {
              visitorRecord = existing;
            }
          } else {
            const [updated] = await tx
              .update(analyticsVisitors)
              .set({
                userId: params.userId,
                linkedAt: params.now,
                expiresAt: null,
                lastSeenAt: params.now,
                updatedAt: params.now,
              })
              .where(eq(analyticsVisitors.id, params.visitorId))
              .returning();
            if (!updated) throw new Error("Failed to update visitor");
            visitorRecord = updated;
          }
        }

        // Update past unlinked events
        await tx
          .update(analyticsEvents)
          .set({
            userId: params.userId,
            unlinkedExpiresAt: null,
          })
          .where(
            and(
              eq(analyticsEvents.visitorId, params.visitorId),
              isNull(analyticsEvents.userId),
            ),
          );

        // Update existing visitor-only fraud IP records to the linked account owner for cascade deletion
        await tx
          .update(analyticsFraudIpRecords)
          .set({ userId: params.userId })
          .where(
            and(
              eq(analyticsFraudIpRecords.visitorId, params.visitorId),
              isNull(analyticsFraudIpRecords.userId),
            ),
          );

        // Rebuild account_behavior_profiles from ALL account-owned events in deterministic (occurredAt, id) order
        await rebuildAccountBehaviorProfile(tx, params.userId, params.now);

        return { ok: true, visitor: visitorRecord };
      });
    },

    async recordWizardConsent(params) {
      return database.transaction(async (tx) => {
        return recordWizardConsentInTransaction(tx, params);
      });
    },

    async associateBirthProfile(params) {
      return database.transaction(async (tx) => {
        // Level 1: visitor lock
        await lockVisitor(tx, params.visitorId);

        const [visitor] = await tx
          .select()
          .from(analyticsVisitors)
          .where(eq(analyticsVisitors.id, params.visitorId))
          .limit(1);

        if (!visitor) {
          return { ok: false, error: "VISITOR_NOT_FOUND" };
        }

        if (visitor.userId !== null) {
          if (params.owner?.anonymousActorId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }
          if (params.owner?.userId && params.owner.userId !== visitor.userId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }
        }

        const hasUserId = Boolean(params.owner?.userId);
        const hasAnonId = Boolean(params.owner?.anonymousActorId);
        if (hasUserId === hasAnonId) {
          return { ok: false, error: "PROFILE_FORBIDDEN" };
        }

        const [profile] = await tx
          .select({
            id: birthProfiles.id,
            userId: birthProfiles.userId,
            anonymousActorId: birthProfiles.anonymousActorId,
          })
          .from(birthProfiles)
          .where(eq(birthProfiles.id, params.birthProfileId))
          .limit(1);

        if (!profile) {
          return { ok: false, error: "PROFILE_NOT_FOUND" };
        }

        if (hasUserId && profile.userId !== params.owner?.userId) {
          return { ok: false, error: "PROFILE_FORBIDDEN" };
        }

        if (hasAnonId && profile.anonymousActorId !== params.owner?.anonymousActorId) {
          return { ok: false, error: "PROFILE_FORBIDDEN" };
        }

        // Do NOT extend visitor expiresAt on subsequent profile association
        const [updated] = await tx
          .update(analyticsVisitors)
          .set({
            birthProfileId: params.birthProfileId,
            lastSeenAt: params.now,
            updatedAt: params.now,
          })
          .where(eq(analyticsVisitors.id, params.visitorId))
          .returning();

        if (!updated) {
          return { ok: false, error: "VISITOR_NOT_FOUND" };
        }

        return { ok: true };
      });
    },

    async recordEvent(input) {
      return database.transaction(async (tx) => {
        // Stable lock ordering:
        // Level 1: Lock visitor
        await lockVisitor(tx, input.visitorId);
        // Level 2: Lock idempotency key
        await lockIdempotencyKey(tx, input.idempotencyKey);

        // Resolve current visitor state under lock
        const [visitor] = await tx
          .select()
          .from(analyticsVisitors)
          .where(eq(analyticsVisitors.id, input.visitorId))
          .limit(1);

        if (visitor && visitor.userId !== null) {
          if (input.userId && input.userId !== visitor.userId) {
            return { ok: false, error: "VISITOR_ACCOUNT_CONFLICT" };
          }
          if (input.anonymousActorId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }
        }

        let effectiveUserId: string | null = null;
        if (visitor && visitor.userId !== null) {
          effectiveUserId = visitor.userId;
        } else if (input.userId) {
          effectiveUserId = input.userId;
        }

        // Level 3: If effective user is known, lock user behavior profile
        if (effectiveUserId) {
          await lockUserBehaviorProfile(tx, effectiveUserId);
        }

        let verifiedBirthProfileId: string | null = null;
        if (input.birthProfileId) {
          const hasUserId = Boolean(input.userId);
          const hasAnonId = Boolean(input.anonymousActorId);
          if (hasUserId === hasAnonId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }

          if (hasAnonId && visitor && visitor.userId !== null) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }

          const [profile] = await tx
            .select({
              id: birthProfiles.id,
              userId: birthProfiles.userId,
              anonymousActorId: birthProfiles.anonymousActorId,
            })
            .from(birthProfiles)
            .where(eq(birthProfiles.id, input.birthProfileId))
            .limit(1);

          if (!profile) {
            return { ok: false, error: "PROFILE_NOT_FOUND" };
          }

          if (hasUserId && profile.userId !== input.userId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }

          if (hasAnonId && profile.anonymousActorId !== input.anonymousActorId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }

          verifiedBirthProfileId = input.birthProfileId;
        }

        const effectiveBirthProfileId = verifiedBirthProfileId ?? (visitor?.birthProfileId ?? null);

        // Resolve existing event under lock
        const [existingEvent] = await tx
          .select()
          .from(analyticsEvents)
          .where(eq(analyticsEvents.idempotencyKey, input.idempotencyKey))
          .limit(1);

        if (existingEvent) {
          const visitorMatch = existingEvent.visitorId === input.visitorId;
          const nameMatch = existingEvent.name === input.name;
          const occurredAtMatch = existingEvent.occurredAt.getTime() === input.occurredAt.getTime();
          const propertiesMatch = isDeepEqual(existingEvent.properties, input.properties);

          let userMatch = true;
          if (input.userId) {
            userMatch = existingEvent.userId === input.userId;
          }

          let profileMatch = true;
          if (input.birthProfileId) {
            profileMatch = existingEvent.birthProfileId === input.birthProfileId;
          }

          if (
            visitorMatch &&
            nameMatch &&
            occurredAtMatch &&
            propertiesMatch &&
            userMatch &&
            profileMatch
          ) {
            return { ok: true, replayed: true, event: existingEvent };
          }

          return { ok: false, error: "IDEMPOTENCY_KEY_CONFLICT" };
        }

        let unlinkedExpiresAt: Date | null = null;

        if (visitor) {
          if (visitor.userId !== null) {
            unlinkedExpiresAt = null;
            await tx
              .update(analyticsVisitors)
              .set({
                ...(verifiedBirthProfileId ? { birthProfileId: verifiedBirthProfileId } : {}),
                lastSeenAt: input.now,
                updatedAt: input.now,
              })
              .where(eq(analyticsVisitors.id, input.visitorId));
          } else {
            if (input.userId) {
              unlinkedExpiresAt = null;
              await tx
                .update(analyticsVisitors)
                .set({
                  userId: input.userId,
                  linkedAt: input.now,
                  expiresAt: null,
                  ...(verifiedBirthProfileId ? { birthProfileId: verifiedBirthProfileId } : {}),
                  lastSeenAt: input.now,
                  updatedAt: input.now,
                })
                .where(eq(analyticsVisitors.id, input.visitorId));

              await tx
                .update(analyticsEvents)
                .set({
                  userId: input.userId,
                  unlinkedExpiresAt: null,
                })
                .where(
                  and(
                    eq(analyticsEvents.visitorId, input.visitorId),
                    isNull(analyticsEvents.userId),
                  ),
                );

              await tx
                .update(analyticsFraudIpRecords)
                .set({ userId: input.userId })
                .where(
                  and(
                    eq(analyticsFraudIpRecords.visitorId, input.visitorId),
                    isNull(analyticsFraudIpRecords.userId),
                  ),
                );
            } else {
              if (!visitor.expiresAt) {
                throw new Error("Unlinked visitor must have an expiry");
              }
              unlinkedExpiresAt = earlierDate(
                visitor.expiresAt,
                calculateUnlinkedExpiry(input.now),
              );
              await tx
                .update(analyticsVisitors)
                .set({
                  ...(verifiedBirthProfileId ? { birthProfileId: verifiedBirthProfileId } : {}),
                  lastSeenAt: input.now,
                  updatedAt: input.now,
                })
                .where(eq(analyticsVisitors.id, input.visitorId));
            }
          }
        } else {
          if (input.userId) {
            unlinkedExpiresAt = null;
            await tx
              .insert(analyticsVisitors)
              .values({
                id: input.visitorId,
                userId: input.userId,
                birthProfileId: verifiedBirthProfileId,
                linkedAt: input.now,
                expiresAt: null,
                firstSeenAt: input.now,
                lastSeenAt: input.now,
                createdAt: input.now,
                updatedAt: input.now,
              })
              .onConflictDoNothing({ target: analyticsVisitors.id });
          } else {
            unlinkedExpiresAt = calculateUnlinkedExpiry(input.now);
            await tx
              .insert(analyticsVisitors)
              .values({
                id: input.visitorId,
                userId: null,
                birthProfileId: verifiedBirthProfileId,
                linkedAt: null,
                expiresAt: unlinkedExpiresAt,
                firstSeenAt: input.now,
                lastSeenAt: input.now,
                createdAt: input.now,
                updatedAt: input.now,
              })
              .onConflictDoNothing({ target: analyticsVisitors.id });
          }
        }

        const ipExpiresAt = input.ip ? calculateIpExpiry(input.now) : null;
        const eventId = input.id ?? randomUUID();

        const [inserted] = await tx
          .insert(analyticsEvents)
          .values({
            id: eventId,
            idempotencyKey: input.idempotencyKey,
            visitorId: input.visitorId,
            userId: effectiveUserId,
            birthProfileId: effectiveBirthProfileId,
            name: input.name,
            properties: input.properties,
            ip: input.ip ?? null,
            userAgent: input.userAgent ?? null,
            referrer: input.referrer ?? null,
            utmSource: input.utmSource ?? null,
            utmMedium: input.utmMedium ?? null,
            utmCampaign: input.utmCampaign ?? null,
            utmContent: input.utmContent ?? null,
            utmTerm: input.utmTerm ?? null,
            deviceClass: input.deviceClass ?? null,
            locale: input.locale ?? null,
            pathname: input.pathname ?? null,
            ipExpiresAt,
            unlinkedExpiresAt,
            occurredAt: input.occurredAt,
            createdAt: input.now,
          })
          .returning();

        if (!inserted) throw new Error("Failed to insert event");

        if (effectiveUserId) {
          // Rebuild whole behavior profile deterministically from all account-owned events
          await rebuildAccountBehaviorProfile(tx, effectiveUserId, input.now);
        }

        return { ok: true, replayed: false, event: inserted };
      });
    },

    async getAccountBehaviorProfile(userId) {
      const [record] = await database
        .select()
        .from(accountBehaviorProfiles)
        .where(eq(accountBehaviorProfiles.userId, userId))
        .limit(1);

      if (!record) {
        return null;
      }
      return toAccountBehaviorProfileV1(record as ExistingBehaviorProfile);
    },

    async updateInterestTopics(userId, topics, now) {
      const cleanTopics: ApprovedInterestTopicCode[] = [];
      for (const topic of topics) {
        if (typeof topic !== "string" || !isApprovedInterestTopic(topic.trim())) {
          return { ok: false, error: "INVALID_TOPIC_CODES" };
        }
        const trimmed = topic.trim() as ApprovedInterestTopicCode;
        if (!cleanTopics.includes(trimmed)) {
          cleanTopics.push(trimmed);
          if (cleanTopics.length >= 20) break;
        }
      }

      return database.transaction(async (tx) => {
        await lockUserBehaviorProfile(tx, userId);

        const [existing] = await tx
          .select()
          .from(accountBehaviorProfiles)
          .where(eq(accountBehaviorProfiles.userId, userId))
          .limit(1);

        if (existing) {
          const [updated] = await tx
            .update(accountBehaviorProfiles)
            .set({
              interestTopics: cleanTopics,
              updatedAt: now,
            })
            .where(eq(accountBehaviorProfiles.userId, userId))
            .returning();
          return {
            ok: true,
            profile: toAccountBehaviorProfileV1(updated as ExistingBehaviorProfile),
          };
        }

        const [created] = await tx
          .insert(accountBehaviorProfiles)
          .values({
            id: randomUUID(),
            userId,
            version: 1,
            lockedSectionsViewed: [],
            topupPacksViewed: [],
            laBalance: null,
            lastReturnAt: null,
            reportReadDepthPercent: null,
            interestTopics: cleanTopics,
            lastEventAt: null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        return {
          ok: true,
          profile: toAccountBehaviorProfileV1(created as ExistingBehaviorProfile),
        };
      });
    },

    async listAccountEvents(userId) {
      const events = await database
        .select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.userId, userId))
        .orderBy(desc(analyticsEvents.occurredAt), desc(analyticsEvents.id))
        .limit(501);

      if (events.length > 500) {
        return { ok: false, error: "ANALYTICS_EXPORT_LIMIT_EXCEEDED" };
      }

      return { ok: true, events };
    },

    async recordFraudIp(params) {
      return database.transaction(async (tx) => {
        let effectiveUserId = params.userId ?? null;

        if (params.visitorId) {
          await lockVisitor(tx, params.visitorId);
          await testHooks?.afterFraudVisitorLock?.();

          const [visitor] = await tx
            .select({ userId: analyticsVisitors.userId })
            .from(analyticsVisitors)
            .where(eq(analyticsVisitors.id, params.visitorId))
            .limit(1);

          const visitorUserId = visitor?.userId ?? null;
          if (params.userId && params.userId !== visitorUserId) {
            return { ok: false, error: "FRAUD_IP_ACCOUNT_CONFLICT" };
          }
          effectiveUserId = visitorUserId;
        }

        const [record] = await tx
          .insert(analyticsFraudIpRecords)
          .values({
            id: params.id ?? randomUUID(),
            ip: params.ip,
            action: params.action,
            visitorId: params.visitorId ?? null,
            userId: effectiveUserId,
            requestId: params.requestId ?? null,
            metadata: params.metadata ?? {},
            expiresAt: calculateIpExpiry(params.now),
            createdAt: params.now,
          })
          .returning();

        if (!record) {
          throw new Error("Failed to insert fraud IP record");
        }
        return { ok: true, record };
      });
    },

    async deleteExpiredUnlinkedEvents(now, limit) {
      const candidateIds = await database
        .select({ id: analyticsEvents.id })
        .from(analyticsEvents)
        .where(
          and(
            isNull(analyticsEvents.userId),
            lte(analyticsEvents.unlinkedExpiresAt, now),
          ),
        )
        .limit(limit);

      if (candidateIds.length === 0) {
        return 0;
      }

      const ids = candidateIds.map((r) => r.id);

      await testHooks?.beforeDeleteExpiredEvents?.(ids);

      // Recheck eligibility predicate in the DELETE statement to eliminate link-vs-purge race
      const deleted = await database
        .delete(analyticsEvents)
        .where(
          and(
            inArray(analyticsEvents.id, ids),
            isNull(analyticsEvents.userId),
            lte(analyticsEvents.unlinkedExpiresAt, now),
          ),
        )
        .returning({ id: analyticsEvents.id });

      return deleted.length;
    },

    async deleteExpiredUnlinkedVisitors(now, limit) {
      const candidateIds = await database
        .select({ id: analyticsVisitors.id })
        .from(analyticsVisitors)
        .where(
          and(
            isNull(analyticsVisitors.userId),
            lte(analyticsVisitors.expiresAt, now),
            sql`NOT EXISTS (
              SELECT 1 FROM ${analyticsEvents}
              WHERE ${analyticsEvents.visitorId} = ${analyticsVisitors.id}
                AND (${analyticsEvents.unlinkedExpiresAt} IS NULL OR ${analyticsEvents.unlinkedExpiresAt} > ${now.toISOString()}::timestamptz)
            )`,
          ),
        )
        .limit(limit);

      if (candidateIds.length === 0) {
        return 0;
      }

      const ids = candidateIds.map((r) => r.id);

      await testHooks?.beforeDeleteExpiredVisitors?.(ids);

      // Recheck eligibility predicate in the DELETE statement to eliminate link-vs-purge race
      const deleted = await database
        .delete(analyticsVisitors)
        .where(
          and(
            inArray(analyticsVisitors.id, ids),
            isNull(analyticsVisitors.userId),
            lte(analyticsVisitors.expiresAt, now),
            sql`NOT EXISTS (
              SELECT 1 FROM ${analyticsEvents}
              WHERE ${analyticsEvents.visitorId} = ${analyticsVisitors.id}
                AND (${analyticsEvents.unlinkedExpiresAt} IS NULL OR ${analyticsEvents.unlinkedExpiresAt} > ${now.toISOString()}::timestamptz)
            )`,
          ),
        )
        .returning({ id: analyticsVisitors.id });

      return deleted.length;
    },

    async scrubExpiredIp(now, limit) {
      const candidateIds = await database
        .select({ id: analyticsEvents.id })
        .from(analyticsEvents)
        .where(
          and(
            isNotNull(analyticsEvents.ip),
            lte(analyticsEvents.ipExpiresAt, now),
          ),
        )
        .limit(limit);

      if (candidateIds.length === 0) {
        return 0;
      }

      const ids = candidateIds.map((r) => r.id);
      const updated = await database
        .update(analyticsEvents)
        .set({
          ip: null,
          ipExpiresAt: null,
        })
        .where(
          and(
            inArray(analyticsEvents.id, ids),
            isNotNull(analyticsEvents.ip),
            lte(analyticsEvents.ipExpiresAt, now),
          ),
        )
        .returning({ id: analyticsEvents.id });

      return updated.length;
    },

    async deleteExpiredFraudIp(now, limit) {
      const candidateIds = await database
        .select({ id: analyticsFraudIpRecords.id })
        .from(analyticsFraudIpRecords)
        .where(lte(analyticsFraudIpRecords.expiresAt, now))
        .limit(limit);

      if (candidateIds.length === 0) {
        return 0;
      }

      const ids = candidateIds.map((r) => r.id);
      const deleted = await database
        .delete(analyticsFraudIpRecords)
        .where(
          and(
            inArray(analyticsFraudIpRecords.id, ids),
            lte(analyticsFraudIpRecords.expiresAt, now),
          ),
        )
        .returning({ id: analyticsFraudIpRecords.id });

      return deleted.length;
    },
  };
}

export function createDatabaseAnalyticsRepository(
  database: Database,
): AnalyticsRepository {
  return createDatabaseAnalyticsRepositoryInternal(database);
}

export function createDatabaseAnalyticsRepositoryForTest(
  database: Database,
  testHooks: AnalyticsRepositoryTestHooks,
): AnalyticsRepository {
  return createDatabaseAnalyticsRepositoryInternal(database, testHooks);
}

export async function recordWizardConsentInTransaction(
  tx: DatabaseOrTransaction,
  params: {
    visitorId: string;
    birthProfileId?: string | null;
    owner?: { userId?: string | null; anonymousActorId?: string | null };
    consentedAt: Date;
    now: Date;
  },
): Promise<RecordConsentResult> {
        // Level 1: visitor lock
        await lockVisitor(tx, params.visitorId);

        // Reject ambiguous owner objects (both user and anonymous IDs)
        if (params.owner?.userId && params.owner?.anonymousActorId) {
          return { ok: false, error: "PROFILE_FORBIDDEN" };
        }

        const [visitor] = await tx
          .select()
          .from(analyticsVisitors)
          .where(eq(analyticsVisitors.id, params.visitorId))
          .limit(1);

        if (visitor && visitor.userId !== null) {
          if (params.owner?.anonymousActorId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }
          if (params.owner?.userId && params.owner.userId !== visitor.userId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }
        }

        if (params.birthProfileId) {
          const hasUserId = Boolean(params.owner?.userId);
          const hasAnonId = Boolean(params.owner?.anonymousActorId);
          if (hasUserId === hasAnonId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }

          const [profile] = await tx
            .select({
              id: birthProfiles.id,
              userId: birthProfiles.userId,
              anonymousActorId: birthProfiles.anonymousActorId,
            })
            .from(birthProfiles)
            .where(eq(birthProfiles.id, params.birthProfileId))
            .limit(1);

          if (!profile) {
            return { ok: false, error: "PROFILE_NOT_FOUND" };
          }

          if (hasUserId && profile.userId !== params.owner?.userId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }

          if (hasAnonId && profile.anonymousActorId !== params.owner?.anonymousActorId) {
            return { ok: false, error: "PROFILE_FORBIDDEN" };
          }
        }

        const targetUserId = params.owner?.userId ?? null;
        if (targetUserId) {
          // Level 3: behavior profile lock
          await lockUserBehaviorProfile(tx, targetUserId);
        }

        if (!visitor) {
          const isLinkedUser = Boolean(targetUserId);
          await tx
            .insert(analyticsVisitors)
            .values({
              id: params.visitorId,
              userId: targetUserId,
              birthProfileId: params.birthProfileId ?? null,
              consentedAt: params.consentedAt,
              firstSeenAt: params.now,
              lastSeenAt: params.now,
              linkedAt: isLinkedUser ? params.now : null,
              expiresAt: isLinkedUser ? null : calculateUnlinkedExpiry(params.now),
              createdAt: params.now,
              updatedAt: params.now,
            })
            .onConflictDoNothing({ target: analyticsVisitors.id });

          if (targetUserId) {
            await rebuildAccountBehaviorProfile(tx, targetUserId, params.now);
          }
        } else {
          // Preserve first non-null consentedAt on exact retry; do not move forward
          const consentedAt = visitor.consentedAt ?? params.consentedAt;

          if (targetUserId && visitor.userId === null) {
            // Authenticated owner links an existing unlinked visitor
            await tx
              .update(analyticsVisitors)
              .set({
                userId: targetUserId,
                linkedAt: visitor.linkedAt ?? params.now,
                expiresAt: null,
                consentedAt,
                ...(params.birthProfileId ? { birthProfileId: params.birthProfileId } : {}),
                lastSeenAt: params.now,
                updatedAt: params.now,
              })
              .where(eq(analyticsVisitors.id, params.visitorId));

            // Link prior unlinked events to account
            await tx
              .update(analyticsEvents)
              .set({
                userId: targetUserId,
                unlinkedExpiresAt: null,
              })
              .where(
                and(
                  eq(analyticsEvents.visitorId, params.visitorId),
                  isNull(analyticsEvents.userId),
                ),
              );

            // Update unlinked fraud IP records to the linked user
            await tx
              .update(analyticsFraudIpRecords)
              .set({ userId: targetUserId })
              .where(
                and(
                  eq(analyticsFraudIpRecords.visitorId, params.visitorId),
                  isNull(analyticsFraudIpRecords.userId),
                ),
              );

            // Rebuild behavior profile for the authenticated user
            await rebuildAccountBehaviorProfile(tx, targetUserId, params.now);
          } else {
            // Already linked or remaining unlinked; do NOT extend visitor expiresAt
            const [updated] = await tx
              .update(analyticsVisitors)
              .set({
                consentedAt,
                ...(params.birthProfileId ? { birthProfileId: params.birthProfileId } : {}),
                lastSeenAt: params.now,
                updatedAt: params.now,
              })
              .where(eq(analyticsVisitors.id, params.visitorId))
              .returning();

            if (!updated) {
              throw new Error("Failed to update visitor consent");
            }
          }
        }

        return { ok: true };

}
