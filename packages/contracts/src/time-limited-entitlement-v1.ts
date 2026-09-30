import { z } from "zod";

export const TimeLimitedEntitlementSourceSchema = z.enum([
  "lifetime_reading_bonus",
  "subscription",
  "direct_grant",
]);
export type TimeLimitedEntitlementSource = z.infer<
  typeof TimeLimitedEntitlementSourceSchema
>;

export const TimeLimitedEntitlementV1Schema = z
  .object({
    id: z.string().trim().min(1),
    ownerId: z.string().trim().min(1),
    chartId: z.string().trim().min(1),
    scope: z.literal("daily_reading").or(z.string().trim().min(1)),
    grantedAt: z.string().datetime({ offset: true }),
    validFrom: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    source: TimeLimitedEntitlementSourceSchema,
  })
  .strict();
export type TimeLimitedEntitlementV1 = z.infer<
  typeof TimeLimitedEntitlementV1Schema
>;

export const DailyReadingAccessStatusSchema = z.enum([
  "active",
  "expired",
  "not_yet_valid",
  "catalog_blocked",
]);
export type DailyReadingAccessStatus = z.infer<
  typeof DailyReadingAccessStatusSchema
>;

export const DailyReadingAccessEvaluationV1Schema = z
  .object({
    hasAccess: z.boolean(),
    status: DailyReadingAccessStatusSchema,
    expiresAt: z.string().datetime({ offset: true }).optional(),
    remainingMs: z.number().int().nonnegative().optional(),
    blockerMessage: z.string().trim().min(1).optional(),
  })
  .strict();
export type DailyReadingAccessEvaluationV1 = z.infer<
  typeof DailyReadingAccessEvaluationV1Schema
>;

export const DAILY_READING_CATALOG_BLOCKER_MESSAGE =
  "Paid daily reading SKU activation is pending catalog package 1.3";

/**
 * Calculates bonus expiry timestamp.
 * Defaults to exactly 7 full days (7 * 24h) from the grant timestamp.
 * Expired on the 8th day (at or after grantedAt + 7 days).
 */
export function calculateBonusExpiry(
  grantedAt: Date | string,
  bonusDays = 7,
): Date {
  const baseTime =
    typeof grantedAt === "string" ? new Date(grantedAt).getTime() : grantedAt.getTime();
  if (Number.isNaN(baseTime)) {
    throw new Error(`Invalid grantedAt timestamp: ${String(grantedAt)}`);
  }
  const durationMs = bonusDays * 24 * 60 * 60 * 1000;
  return new Date(baseTime + durationMs);
}

/**
 * Checks whether a time-limited entitlement is currently valid at `now`.
 */
export function isTimeLimitedEntitlementActive(
  entitlement: { validFrom: string | Date; expiresAt: string | Date },
  now?: Date | string | number,
): boolean {
  const nowMs =
    now === undefined
      ? Date.now()
      : typeof now === "number"
        ? now
        : typeof now === "string"
          ? new Date(now).getTime()
          : now.getTime();

  const validFromMs =
    typeof entitlement.validFrom === "string"
      ? new Date(entitlement.validFrom).getTime()
      : entitlement.validFrom.getTime();

  const expiresAtMs =
    typeof entitlement.expiresAt === "string"
      ? new Date(entitlement.expiresAt).getTime()
      : entitlement.expiresAt.getTime();

  return nowMs >= validFromMs && nowMs < expiresAtMs;
}

/**
 * Computes remaining milliseconds for an active entitlement, bounded at 0.
 */
export function getTimeLimitedEntitlementRemainingMs(
  entitlement: { expiresAt: string | Date },
  now?: Date | string | number,
): number {
  const nowMs =
    now === undefined
      ? Date.now()
      : typeof now === "number"
        ? now
        : typeof now === "string"
          ? new Date(now).getTime()
          : now.getTime();

  const expiresAtMs =
    typeof entitlement.expiresAt === "string"
      ? new Date(entitlement.expiresAt).getTime()
      : entitlement.expiresAt.getTime();

  return Math.max(0, expiresAtMs - nowMs);
}

/**
 * Evaluates access to daily reading foundation without catalog coupling.
 * If active entitlement exists, grants access.
 * If expired, returns expired status.
 * If no entitlement exists, reports the precise catalog blocker rather than
 * inventing an unauthorized SKU activation.
 */
export function evaluateDailyReadingAccess(params: {
  entitlement?: TimeLimitedEntitlementV1 | null;
  now?: Date | string | number;
}): DailyReadingAccessEvaluationV1 {
  const { entitlement, now } = params;
  if (!entitlement) {
    return {
      hasAccess: false,
      status: "catalog_blocked",
      blockerMessage: DAILY_READING_CATALOG_BLOCKER_MESSAGE,
    };
  }

  const nowMs =
    now === undefined
      ? Date.now()
      : typeof now === "number"
        ? now
        : typeof now === "string"
          ? new Date(now).getTime()
          : now.getTime();

  const validFromMs = new Date(entitlement.validFrom).getTime();
  const expiresAtMs = new Date(entitlement.expiresAt).getTime();

  if (nowMs < validFromMs) {
    return {
      hasAccess: false,
      status: "not_yet_valid",
      expiresAt: entitlement.expiresAt,
      remainingMs: Math.max(0, expiresAtMs - nowMs),
    };
  }

  if (nowMs >= expiresAtMs) {
    return {
      hasAccess: false,
      status: "expired",
      expiresAt: entitlement.expiresAt,
      remainingMs: 0,
    };
  }

  return {
    hasAccess: true,
    status: "active",
    expiresAt: entitlement.expiresAt,
    remainingMs: expiresAtMs - nowMs,
  };
}
