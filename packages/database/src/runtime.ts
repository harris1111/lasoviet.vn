import { and, eq, isNull } from "drizzle-orm";

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
    const [anonymousActor] = await transaction
      .select({
        id: authAnonymousActors.id,
        linkedUserId: authAnonymousActors.linkedUserId,
      })
      .from(authAnonymousActors)
      .where(eq(authAnonymousActors.id, anonymousActorId))
      .limit(1);

    if (
      anonymousActor === undefined ||
      (anonymousActor.linkedUserId !== null &&
        anonymousActor.linkedUserId !== userId)
    ) {
      return {
        ok: false,
        error: {
          code: "ANONYMOUS_LINK_CONFLICT",
          messageKey: "auth.anonymousLinkConflict",
          retryable: false,
        },
      };
    }

    await transaction
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
      );

    await transaction
      .update(authAnonymousActors)
      .set({ linkedUserId: userId })
      .where(eq(authAnonymousActors.id, anonymousActorId));

    return {
      ok: true,
      value: { anonymousActorId, userId },
    };
  });
}
