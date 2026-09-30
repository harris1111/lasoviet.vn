import { and, eq, gt, lte, or, sql } from "drizzle-orm";
import type { MembershipExpiryEmailRequest } from "@lasoviet/contracts";
import { authUsers, membershipSubscriptions, notificationDeliveries, type Database } from "@lasoviet/database";
import { membershipCoverage, readMembershipPeriods } from "../commerce/membership.service.js";
import { fingerprintEmail, generateUnsubscribeToken, type NotificationPreferenceStore } from "./notification-preference.js";

const THREE_DAYS = 3 * 86_400_000;
export async function membershipReminderAllowed(database: Database, request: MembershipExpiryEmailRequest, now: Date) {
  const [user] = await database.select().from(authUsers).where(eq(authUsers.id, request.userId)).limit(1);
  if (!user?.emailVerified || user.isAnonymous || user.email.trim().toLowerCase() !== request.recipient) return false;
  const periods = await readMembershipPeriods(database, user.id, now);
  const final = membershipCoverage(periods, now)?.final;
  return !!final && final.id === request.subscriptionId &&
    final.expiresAt.toISOString() === request.expiresAt && final.expiresAt.getTime() - now.getTime() <= THREE_DAYS;
}

export function createMembershipExpiryReminderService(options: {
  database: Database; preferenceStore: NotificationPreferenceStore; tokenSecret: string; now?: () => Date;
}) {
  return {
    async scanAndEnqueue(limit = 25) {
      const now = (options.now ?? (() => new Date()))();
      let cursor: { expiresAt: Date; id: string } | undefined;
      let scanned = 0;
      let enqueued = 0;
      const batchSize = Math.max(1, Math.min(limit, 100));
      while (enqueued < limit) {
        const candidates = await options.database.select({ subscription: membershipSubscriptions, user: authUsers })
          .from(membershipSubscriptions).innerJoin(authUsers, eq(authUsers.id, membershipSubscriptions.ownerId))
          .where(and(gt(membershipSubscriptions.expiresAt, now), lte(membershipSubscriptions.expiresAt, new Date(now.getTime() + THREE_DAYS)), eq(authUsers.emailVerified, true), eq(authUsers.isAnonymous, false),
            cursor ? or(gt(membershipSubscriptions.expiresAt, cursor.expiresAt), and(eq(membershipSubscriptions.expiresAt, cursor.expiresAt), gt(membershipSubscriptions.id, cursor.id))) : undefined,
            sql`NOT EXISTS (SELECT 1 FROM notification_deliveries delivery WHERE delivery.idempotency_key = 'membership-expiry:' || ${membershipSubscriptions.id}::text)`))
          .orderBy(membershipSubscriptions.expiresAt, membershipSubscriptions.id).limit(batchSize);
        if (!candidates.length) break;
        scanned += candidates.length;
        const last = candidates[candidates.length - 1]!.subscription;
        cursor = { expiresAt: last.expiresAt, id: last.id };
        for (const { subscription, user } of candidates) {
          if (!await options.preferenceStore.isNonTransactionalAllowed(user.email, user.id)) continue;
          const token = generateUnsubscribeToken({ userId: user.id, email: user.email }, options.tokenSecret, now);
          const request: MembershipExpiryEmailRequest = {
            version: 1, kind: "membership_expiry", idempotencyKey: `membership-expiry:${subscription.id}`,
            recipient: user.email.trim().toLowerCase(), locale: "vi", userId: user.id, subscriptionId: subscription.id,
            expiresAt: subscription.expiresAt.toISOString(), actionUrl: "https://lasoviet.net/nap-la?tab=hoi-vien",
            unsubscribeUrl: `https://lasoviet.net/thong-bao/huy-dang-ky#token=${encodeURIComponent(token)}`,
            requestId: `membership-reminder:${subscription.id}`,
          };
          if (!await membershipReminderAllowed(options.database, request, now)) continue;
          const inserted = await options.database.insert(notificationDeliveries).values({
            idempotencyKey: request.idempotencyKey, kind: request.kind,
            recipientFingerprint: fingerprintEmail(request.recipient, options.tokenSecret), requestPayload: request,
            status: "pending", createdAt: now, updatedAt: now,
          }).onConflictDoNothing().returning({ id: notificationDeliveries.id });
          enqueued += inserted.length;
          if (enqueued >= limit) break;
        }
      }
      return { scanned, enqueued };
    },
  };
}
