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
export { notificationDeliveries } from "./schema/notifications.js";

import { createDatabase, type Database } from "./client.js";
import { authAnonymousActors } from "./schema/auth.js";
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
    if (linked.length === 0) {
      throw new Error("ANONYMOUS_LINK_PROFILE_MISSING");
    }

    return {
      ok: true,
      value: { anonymousActorId, userId },
    };
  });
}
