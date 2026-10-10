import { createHash } from "node:crypto";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { FreeChartRecoverySourceV1Schema, type FreeChartRecoverySourceV1 } from "@lasoviet/contracts";
import {
  authUsers, birthProfiles, commerceEntitlements, commerceOrders, consents, deletionRequests,
  freeChartRecoverySources, lockFreeAiCoordination, lockRecoveryCaptureCoordination,
  notificationPreferences, ziweiCharts, ziweiChartVersions, type Database,
} from "@lasoviet/database";
import { fingerprintEmail } from "./notification-preference.js";

export type RecoveryTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DisplayedSourceLookup = { userId: string; chartId: string; viewReceiptSha256: string };
/** Must retrieve a genuine displayed receipt and check current displayed content/renderer parity. */
export type TrustedDisplayedSourceReader = (input: DisplayedSourceLookup & { transaction: RecoveryTransaction }) => Promise<unknown>;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
export function freeChartRecoverySourceHash(source: FreeChartRecoverySourceV1): string {
  return createHash("sha256").update(canonicalJson(source)).digest("hex");
}
export function parseDisplayedRecoverySource(value: unknown): FreeChartRecoverySourceV1 | null {
  const result = FreeChartRecoverySourceV1Schema.safeParse(value);
  if (!result.success || createHash("sha256").update(result.data.teaserText).digest("hex") !== result.data.teaserSha256) return null;
  return result.data;
}

/** The purchase mutex is nonblocking: commerce holds wallet/account rows before this mutex. */
export async function tryRecoveryChartLock(transaction: RecoveryTransaction, chartId: string): Promise<boolean> {
  const [row] = await transaction.execute(sql`SELECT pg_try_advisory_xact_lock(hashtext(${`commerce:chart:${chartId}`})) AS acquired`);
  return row?.acquired === true;
}

/** Caller holds free-AI -> recovery -> nonblocking commerce chart fence. */
export async function readFreeChartRecoveryAuthority(transaction: RecoveryTransaction,
  source: FreeChartRecoverySourceV1, tokenSecret: string, clock: () => Date) {
  const [user] = await transaction.select().from(authUsers).where(eq(authUsers.id, source.userId)).for("share", { skipLocked: true });
  if (!user || !user.emailVerified || user.isAnonymous) return null;
  const [deletion] = await transaction.select().from(deletionRequests).where(eq(deletionRequests.userId, user.id));
  if (deletion && deletion.status !== "cancelled") return null;
  const [chart] = await transaction.select().from(ziweiCharts).where(eq(ziweiCharts.id, source.chartId));
  if (!chart) return null;
  const [profile] = await transaction.select().from(birthProfiles).where(eq(birthProfiles.id, chart.profileId)).for("share", { skipLocked: true });
  if (!profile || profile.userId !== user.id || profile.anonymousActorId !== null || profile.deletedAt !== null) return null;
  const [version] = await transaction.select().from(ziweiChartVersions).where(eq(ziweiChartVersions.chartId, chart.id))
    .orderBy(desc(ziweiChartVersions.createdAt), desc(ziweiChartVersions.id)).limit(1);
  if (!version || version.id !== source.chartVersionId) return null;
  // Pin the latest consent before SKIP LOCKED, so a busy revocation cannot expose an older grant.
  const [latest] = await transaction.select({ id: consents.id }).from(consents)
    .where(and(eq(consents.userId, user.id), eq(consents.purpose, "offers")))
    .orderBy(desc(consents.grantedAt), desc(consents.id)).limit(1);
  if (!latest) return null;
  const [consent] = await transaction.select().from(consents).where(eq(consents.id, latest.id)).for("share", { skipLocked: true });
  if (!consent || consent.revokedAt !== null) return null;
  const recipientFingerprint = fingerprintEmail(user.email, tokenSecret);
  const preferences = await transaction.select().from(notificationPreferences)
    .where(or(eq(notificationPreferences.userId, user.id), eq(notificationPreferences.emailFingerprint, recipientFingerprint)));
  if (preferences.some(row => row.unsubscribedAll || !row.nurtureEmailsAllowed)) return null;
  const [access] = await transaction.select({ id: commerceEntitlements.id }).from(commerceEntitlements)
    .where(eq(commerceEntitlements.chartId, chart.id)).limit(1);
  const [purchase] = await transaction.select({ id: commerceOrders.id }).from(commerceOrders)
    .where(and(eq(commerceOrders.chartId, chart.id), eq(commerceOrders.kind, "content_purchase"))).limit(1);
  if (access || purchase) return null;
  // Sample after all locks and trusted lookup. No client clock or chart-created inference.
  const now = clock(), firstViewedAt = new Date(source.firstViewedAt);
  if (!Number.isFinite(now.getTime()) || firstViewedAt > now || firstViewedAt < version.createdAt ||
      firstViewedAt < user.createdAt || profile.createdAt > now || chart.createdAt > now || consent.grantedAt > now) return null;
  return { user, recipientFingerprint, now, firstViewedAt };
}

/** Disconnected private factory; an absent display producer refuses before any database work. */
export function createFreeChartRecoverySourceRepository(options: {
  database: Database; mode?: "disabled" | "capture"; tokenSecret: string;
  readTrustedDisplayedSource?: TrustedDisplayedSourceReader; now?: () => Date;
}) {
  return {
    async recordFirstView(input: DisplayedSourceLookup): Promise<"disabled" | "refused" | "recorded" | "reused"> {
      if (options.mode !== "capture") return "disabled";
      const reader = options.readTrustedDisplayedSource;
      if (!reader || !/^[A-Za-z0-9_-]{1,128}$/.test(input.userId) || !/^[A-Za-z0-9_-]{1,128}$/.test(input.chartId) ||
          !/^[a-f0-9]{64}$/.test(input.viewReceiptSha256) || Object.keys(input).sort().join(",") !== "chartId,userId,viewReceiptSha256") return "refused";
      return options.database.transaction(async transaction => {
        await lockFreeAiCoordination(transaction);
        await lockRecoveryCaptureCoordination(transaction);
        if (!await tryRecoveryChartLock(transaction, input.chartId)) return "refused";
        const source = parseDisplayedRecoverySource(await reader({ ...input, transaction }));
        if (!source || source.userId !== input.userId || source.chartId !== input.chartId || source.viewReceiptSha256 !== input.viewReceiptSha256) return "refused";
        const authority = await readFreeChartRecoveryAuthority(transaction, source, options.tokenSecret, options.now ?? (() => new Date()));
        if (!authority) return "refused";
        const sourceSha256 = freeChartRecoverySourceHash(source);
        const [stored] = await transaction.select().from(freeChartRecoverySources).where(eq(freeChartRecoverySources.chartId, input.chartId));
        if (stored) return stored.sourceSha256 === sourceSha256 && freeChartRecoverySourceHash(stored.source) === sourceSha256 &&
          stored.userId === source.userId && stored.chartVersionId === source.chartVersionId &&
          stored.firstViewedAt.getTime() === authority.firstViewedAt.getTime() ? "reused" : "refused";
        await transaction.insert(freeChartRecoverySources).values({ chartId: source.chartId, chartVersionId: source.chartVersionId,
          userId: source.userId, firstViewedAt: authority.firstViewedAt, sourceSha256, source, createdAt: authority.now });
        return "recorded";
      });
    },
  };
}
