import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import {
  UnsubscribeTokenClaimsSchema,
  type NotificationPreferencesV1,
  type Result,
} from "@lasoviet/contracts";
import {
  authUsers,
  consents,
  notificationPreferences,
  type Database,
} from "@lasoviet/database/runtime";

export interface NotificationPreferenceStore {
  getPreferences(userId: string): Promise<NotificationPreferencesV1>;
  updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferencesV1>,
  ): Promise<void>;
  unsubscribeByToken(
    token: string,
  ): Promise<Result<{ email: string; userId: string }, "TOKEN_INVALID" | "TOKEN_EXPIRED">>;
  unsubscribeEmail(email: string, userId?: string): Promise<void>;
  isNonTransactionalAllowed(recipient: string, userId?: string, kind?: "nurture" | "han"): Promise<boolean>;
}

export function fingerprintEmail(email: string, secret: string): string {
  if (!secret || secret.trim() === "") {
    throw new Error("NOTIFICATION_PREFERENCE_SECRET_REQUIRED");
  }
  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export function generateUnsubscribeToken(
  payload: { userId: string; email: string },
  secret: string,
  now = new Date(),
): string {
  if (!secret || secret.trim() === "") {
    throw new Error("NOTIFICATION_PREFERENCE_SECRET_REQUIRED");
  }
  const data = {
    userId: payload.userId.trim(),
    email: payload.email.trim().toLowerCase(),
    timestamp: now.getTime(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret)
    .update("lasoviet:unsubscribe:v1\0")
    .update(encodedPayload)
    .digest("hex");
  return `${encodedPayload}.${signature}`;
}

export const CLOCK_SKEW_TOLERANCE_MS = 60_000; // 1 minute bounded skew
export const DEFAULT_UNSUBSCRIBE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function verifyUnsubscribeToken(
  token: string,
  secret: string,
  maxAgeMs = DEFAULT_UNSUBSCRIBE_TOKEN_TTL_MS,
  now = new Date(),
  maxFutureSkewMs = CLOCK_SKEW_TOLERANCE_MS,
): Result<{ userId: string; email: string }, "TOKEN_INVALID" | "TOKEN_EXPIRED"> {
  if (!secret || secret.trim() === "") {
    return { ok: false, error: { code: "TOKEN_INVALID", messageKey: "privacy.token_invalid", retryable: false } };
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { ok: false, error: { code: "TOKEN_INVALID", messageKey: "privacy.token_invalid", retryable: false } };
  }
  const [encodedPayload, providedSignature] = parts as [string, string];
  const expectedSignature = createHmac("sha256", secret)
    .update("lasoviet:unsubscribe:v1\0")
    .update(encodedPayload)
    .digest("hex");

  const providedBuffer = Buffer.from(providedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { ok: false, error: { code: "TOKEN_INVALID", messageKey: "privacy.token_invalid", retryable: false } };
  }

  let claimsRaw: unknown;
  try {
    claimsRaw = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: { code: "TOKEN_INVALID", messageKey: "privacy.token_invalid", retryable: false } };
  }

  const parseResult = UnsubscribeTokenClaimsSchema.safeParse(claimsRaw);
  if (!parseResult.success) {
    return { ok: false, error: { code: "TOKEN_INVALID", messageKey: "privacy.token_invalid", retryable: false } };
  }

  const { userId, email, timestamp } = parseResult.data;
  const nowMs = now.getTime();
  // Reject future-issued tokens beyond bounded skew
  if (timestamp - nowMs > maxFutureSkewMs) {
    return { ok: false, error: { code: "TOKEN_INVALID", messageKey: "privacy.token_invalid", retryable: false } };
  }
  // Keep 30-day TTL
  if (nowMs - timestamp > maxAgeMs) {
    return { ok: false, error: { code: "TOKEN_EXPIRED", messageKey: "privacy.token_expired", retryable: false } };
  }

  return {
    ok: true,
    value: { userId, email },
  };
}

export function createDatabaseNotificationPreferenceStore(
  database: Database,
  secret: string,
  nowValue: () => Date = () => new Date(),
): NotificationPreferenceStore {
  if (!database || !secret || secret.trim() === "") {
    throw new Error("NOTIFICATION_PREFERENCE_STORE_CONFIG_INVALID");
  }
  return {
    async getPreferences(userId: string): Promise<NotificationPreferencesV1> {
      const [record] = await database
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      if (!record) {
        return {
          nurtureEmailsAllowed: true,
          hanRemindersAllowed: true,
          unsubscribedAll: false,
        };
      }

      return {
        nurtureEmailsAllowed: record.nurtureEmailsAllowed && !record.unsubscribedAll,
        hanRemindersAllowed: record.hanRemindersAllowed && !record.unsubscribedAll,
        unsubscribedAll: record.unsubscribedAll,
      };
    },

    async updatePreferences(
      userId: string,
      preferences: Partial<NotificationPreferencesV1>,
    ): Promise<void> {
      const now = nowValue();
      const [user] = await database
        .select({ email: authUsers.email })
        .from(authUsers)
        .where(eq(authUsers.id, userId))
        .limit(1);

      const email = user?.email ?? "unknown@lasoviet.net";
      const emailFp = fingerprintEmail(email, secret);

      const isUnsubAll = preferences.unsubscribedAll ?? false;
      const unsubAt = isUnsubAll ? now : null;

      await database
        .insert(notificationPreferences)
        .values({
          id: `pref:${userId}`,
          userId,
          emailFingerprint: emailFp,
          nurtureEmailsAllowed: preferences.nurtureEmailsAllowed ?? true,
          hanRemindersAllowed: preferences.hanRemindersAllowed ?? true,
          unsubscribedAll: isUnsubAll,
          unsubscribedAt: unsubAt,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: {
            ...(preferences.nurtureEmailsAllowed !== undefined
              ? { nurtureEmailsAllowed: preferences.nurtureEmailsAllowed }
              : {}),
            ...(preferences.hanRemindersAllowed !== undefined
              ? { hanRemindersAllowed: preferences.hanRemindersAllowed }
              : {}),
            ...(preferences.unsubscribedAll !== undefined
              ? {
                  unsubscribedAll: preferences.unsubscribedAll,
                  unsubscribedAt: preferences.unsubscribedAll ? now : null,
                }
              : {}),
            updatedAt: now,
          },
        });
    },

    async unsubscribeByToken(
      token: string,
    ): Promise<Result<{ email: string; userId: string }, "TOKEN_INVALID" | "TOKEN_EXPIRED">> {
      const verified = verifyUnsubscribeToken(token, secret, undefined, nowValue());
      if (!verified.ok) return verified;

      const { userId, email } = verified.value;
      await this.unsubscribeEmail(email, userId);
      return { ok: true, value: { email, userId } };
    },

    async unsubscribeEmail(email: string, userId?: string): Promise<void> {
      const now = nowValue();
      const emailFp = fingerprintEmail(email, secret);

      if (userId) {
        await database
          .insert(notificationPreferences)
          .values({
            id: `pref:${userId}`,
            userId,
            emailFingerprint: emailFp,
            nurtureEmailsAllowed: false,
            hanRemindersAllowed: false,
            unsubscribedAll: true,
            unsubscribedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: notificationPreferences.userId,
            set: {
              nurtureEmailsAllowed: false,
              hanRemindersAllowed: false,
              unsubscribedAll: true,
              unsubscribedAt: now,
              updatedAt: now,
            },
          });
      } else {
        await database
          .insert(notificationPreferences)
          .values({
            id: `pref-fp:${emailFp.slice(0, 32)}`,
            userId: null,
            emailFingerprint: emailFp,
            nurtureEmailsAllowed: false,
            hanRemindersAllowed: false,
            unsubscribedAll: true,
            unsubscribedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: notificationPreferences.emailFingerprint,
            set: {
              nurtureEmailsAllowed: false,
              hanRemindersAllowed: false,
              unsubscribedAll: true,
              unsubscribedAt: now,
              updatedAt: now,
            },
          });
      }
    },

    async isNonTransactionalAllowed(recipient: string, userId?: string, kind: "nurture" | "han" = "nurture"): Promise<boolean> {
      const emailFp = fingerprintEmail(recipient, secret);

      if (userId) {
        const [userPref] = await database
          .select({
            unsubscribedAll: notificationPreferences.unsubscribedAll,
            nurtureEmailsAllowed: notificationPreferences.nurtureEmailsAllowed,
            hanRemindersAllowed: notificationPreferences.hanRemindersAllowed,
          })
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, userId))
          .limit(1);

        if (userPref && (userPref.unsubscribedAll || !(kind === "han" ? userPref.hanRemindersAllowed : userPref.nurtureEmailsAllowed))) {
          return false;
        }

        const [offersConsent] = await database
          .select({ revokedAt: consents.revokedAt })
          .from(consents)
          .where(and(eq(consents.userId, userId), eq(consents.purpose, "offers")))
          .orderBy(desc(consents.grantedAt))
          .limit(1);

        // Promotional mail is opt-in: missing or revoked consent must block delivery.
        if (offersConsent?.revokedAt !== null || offersConsent === undefined) {
          return false;
        }
      }

      const [emailPref] = await database
        .select({
          unsubscribedAll: notificationPreferences.unsubscribedAll,
          nurtureEmailsAllowed: notificationPreferences.nurtureEmailsAllowed,
            hanRemindersAllowed: notificationPreferences.hanRemindersAllowed,
        })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.emailFingerprint, emailFp))
        .limit(1);

      if (emailPref && (emailPref.unsubscribedAll || !(kind === "han" ? emailPref.hanRemindersAllowed : emailPref.nurtureEmailsAllowed))) {
        return false;
      }

      return true;
    },
  };
}
