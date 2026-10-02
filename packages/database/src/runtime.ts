import { and, eq, gt, isNull } from "drizzle-orm";

import type { Result } from "@lasoviet/contracts";

export { createDatabase } from "./client.js";
export type { Database } from "./client.js";

export {
  authAccounts,
  authAnonymousActors,
  authSessions,
  authUsers,
  authVerifications,
} from "./schema/auth.js";
export { birthProfiles } from "./schema/birth-profile.js";
export { notificationDeliveries, notificationPreferences } from "./schema/notifications.js";
export { consents } from "./schema/privacy.js";
export { reportAssets } from "./schema/assets.js";
export { supportCases } from "./schema/support-cases.js";
export {
  accountBehaviorProfiles,
  analyticsEvents,
  analyticsFraudIpRecords,
  analyticsVisitors,
} from "./schema/analytics.js";

import { createDatabase, type Database } from "./client.js";
import {
  authAnonymousActors,
  authUsers,
} from "./schema/auth.js";
import { birthProfiles } from "./schema/birth-profile.js";

export type AnonymousLinkErrorCode = "ANONYMOUS_LINK_CONFLICT";

export type AnonymousLinkResult = Result<
  { anonymousActorId: string; userId: string },
  AnonymousLinkErrorCode
>;

export async function linkAnonymousActorToAccount(
  database: Database,
  anonymousActorId: string,
  userId: string,
): Promise<AnonymousLinkResult> {
  return database.transaction(async (transaction) => {
    const now = new Date();
    const [anonymousActor] = await transaction
      .update(authAnonymousActors)
      .set({ linkedUserId: userId })
      .where(
        and(
          eq(authAnonymousActors.id, anonymousActorId),
          isNull(authAnonymousActors.linkedUserId),
          gt(authAnonymousActors.expiresAt, now),
          isNull(authAnonymousActors.deletedAt),
        ),
      )
      .returning({ id: authAnonymousActors.id });

    if (anonymousActor === undefined) {
      return {
        ok: false,
        error: {
          code: "ANONYMOUS_LINK_CONFLICT",
          messageKey: "auth.anonymousLinkConflict",
          retryable: false,
        },
      };
    }

    const linked = await transaction
      .update(birthProfiles)
      .set({
        userId,
        anonymousActorId: null,
        anonymousExpiresAt: null,
      })
      .where(
        and(
          eq(birthProfiles.anonymousActorId, anonymousActorId),
          isNull(birthProfiles.userId),
        ),
      )
      .returning({ id: birthProfiles.id });
    await transaction.delete(authUsers).where(eq(authUsers.id, anonymousActorId));

    return {
      ok: true,
      value: { anonymousActorId, userId },
    };
  });
}

export { notificationVerifiedSignins } from "./schema/notifications.js";

/** Receives the server-created session event, never a browser-supplied timestamp. */
export async function recordVerifiedNotificationSignIn(database: import("./client.js").Database, session: { userId: string; createdAt: Date }): Promise<boolean> {
  const { authUsers } = await import("./schema/auth.js");
  const { notificationVerifiedSignins } = await import("./schema/notifications.js");
  const { sql } = await import("drizzle-orm");
  const [owner] = await database.select({ id: authUsers.id }).from(authUsers)
    .where(and(eq(authUsers.id, session.userId), eq(authUsers.emailVerified, true), eq(authUsers.isAnonymous, false))).limit(1);
  if (!owner || !Number.isFinite(session.createdAt.getTime())) return false;
  await database.insert(notificationVerifiedSignins).values({ userId: owner.id, signedInAt: session.createdAt })
    .onConflictDoUpdate({ target: notificationVerifiedSignins.userId, set: { signedInAt: sql`greatest(${notificationVerifiedSignins.signedInAt}, ${session.createdAt.toISOString()}::timestamptz)` } });
  return true;
}
