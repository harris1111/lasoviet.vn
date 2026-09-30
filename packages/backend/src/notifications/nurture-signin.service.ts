import { and, desc, eq, isNull, isNotNull, lte, notExists, sql } from "drizzle-orm";

import {
  NormalizedZiweiChartV1Schema,
  type NurtureVerifiedSignInEmailRequest,
} from "@lasoviet/contracts";
import {
  authUsers,
  birthProfiles,
  commerceOrders,
  commerceEntitlements,
  notificationDeliveries,
  notificationVerifiedSignins,
  ziweiCharts,
  ziweiChartVersions,
  type Database,
} from "@lasoviet/database";

import {
  fingerprintEmail,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  type NotificationPreferenceStore,
} from "./notification-preference.js";

export const PALACE_TITLES_VI: Record<string, string> = {
  "ziwei.palace.life": "Cung Mệnh",
  "ziwei.palace.siblings": "Cung Huynh Đệ",
  "ziwei.palace.spouse": "Cung Phu Thê",
  "ziwei.palace.children": "Cung Tử Tức",
  "ziwei.palace.wealth": "Cung Tài Bạch",
  "ziwei.palace.health": "Cung Tật Ách",
  "ziwei.palace.travel": "Cung Thiên Di",
  "ziwei.palace.friends": "Cung Nô Bộc",
  "ziwei.palace.career": "Cung Quan Lộc",
  "ziwei.palace.property": "Cung Điền Trạch",
  "ziwei.palace.fortune": "Cung Phúc Đức",
  "ziwei.palace.parents": "Cung Phụ Mẫu",
};

export const PALACE_TITLES_EN: Record<string, string> = {
  "ziwei.palace.life": "Life Palace",
  "ziwei.palace.siblings": "Siblings Palace",
  "ziwei.palace.spouse": "Spouse Palace",
  "ziwei.palace.children": "Children Palace",
  "ziwei.palace.wealth": "Wealth Palace",
  "ziwei.palace.health": "Health Palace",
  "ziwei.palace.travel": "Travel Palace",
  "ziwei.palace.friends": "Friends Palace",
  "ziwei.palace.career": "Career Palace",
  "ziwei.palace.property": "Property Palace",
  "ziwei.palace.fortune": "Fortune Palace",
  "ziwei.palace.parents": "Parents Palace",
};

// Priority order for palace highlight in nurture email
const NURTURE_PALACE_PRIORITY = [
  "ziwei.palace.career",
  "ziwei.palace.wealth",
  "ziwei.palace.spouse",
  "ziwei.palace.fortune",
  "ziwei.palace.life",
] as const;

export type VerifiedSignInNurtureServiceOptions = {
  database: Database;
  preferenceStore: NotificationPreferenceStore;
  tokenSecret: string;
  canonicalOrigin?: string;
  now?: () => Date;
};

export type NurtureScanResult = {
  scanned: number;
  enqueued: number;
  skipped: number;
};

export interface VerifiedSignInNurtureService {
  scanAndEnqueue(limit?: number): Promise<NurtureScanResult>;
  isEligible(request: NurtureVerifiedSignInEmailRequest): Promise<boolean>;
}

export function createVerifiedSignInNurtureService(
  options: VerifiedSignInNurtureServiceOptions,
): VerifiedSignInNurtureService {
  const nowValue = options.now ?? (() => new Date());
  const origin = "https://lasoviet.net";
  if (options.canonicalOrigin && options.canonicalOrigin !== origin) throw new Error("NOTIFICATION_ORIGIN_INVALID");

  return {
    async isEligible(request) {
      const now = nowValue();
      const [user] = await options.database.select({ id: authUsers.id, email: authUsers.email }).from(authUsers)
        .innerJoin(notificationVerifiedSignins, eq(notificationVerifiedSignins.userId, authUsers.id))
        .where(and(eq(authUsers.id, request.userId), eq(authUsers.emailVerified, true), eq(authUsers.isAnonymous, false), lte(notificationVerifiedSignins.signedInAt, new Date(now.getTime() - 48 * 60 * 60_000)))).limit(1);
      if (!user || user.email.trim().toLowerCase() !== request.recipient || request.idempotencyKey !== `nurture-signin:${user.id}` || request.locale !== "vi" ||
        !await options.preferenceStore.isNonTransactionalAllowed(user.email, user.id)) return false;
      const [paid] = await options.database.select({ id: commerceOrders.id }).from(commerceOrders).where(and(eq(commerceOrders.ownerId, user.id), isNotNull(commerceOrders.paidAt))).limit(1);
      const [purchase] = await options.database.select({ id: commerceEntitlements.id }).from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, user.id)).limit(1);
      if (paid || purchase) return false;
      const [chart] = await options.database.select({ content: ziweiChartVersions.normalizedOutput }).from(ziweiCharts)
        .innerJoin(birthProfiles, and(eq(birthProfiles.id, ziweiCharts.profileId), eq(birthProfiles.userId, user.id), isNull(birthProfiles.deletedAt)))
        .innerJoin(ziweiChartVersions, eq(ziweiChartVersions.chartId, ziweiCharts.id))
        .where(eq(ziweiCharts.id, request.chartId)).orderBy(desc(ziweiChartVersions.createdAt)).limit(1);
      const parsed = NormalizedZiweiChartV1Schema.safeParse(chart?.content);
      if (!parsed.success || !parsed.data.palaces.some((palace) => palace.id === request.palaceId) || request.palaceTitle !== PALACE_TITLES_VI[request.palaceId] ||
        request.actionUrl !== `${origin}/la-so/${encodeURIComponent(request.chartId)}?palace=${encodeURIComponent(request.palaceId)}`) return false;
      const unsubscribe = new URL(request.unsubscribeUrl);
      if (unsubscribe.origin !== origin || unsubscribe.pathname !== "/thong-bao/huy-dang-ky" || unsubscribe.search !== "" || unsubscribe.username !== "" || unsubscribe.password !== "") return false;
      const token = new URLSearchParams(unsubscribe.hash.slice(1)).get("token");
      const claims = token ? verifyUnsubscribeToken(token, options.tokenSecret, undefined, now) : null;
      return claims?.ok === true && claims.value.userId === user.id && claims.value.email === user.email.trim().toLowerCase();
    },
    async scanAndEnqueue(limit = 25): Promise<NurtureScanResult> {
      const now = nowValue();
      // 2 days = 48 hours ago
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Require a recorded verified session event; account creation is not sign-in.
      const candidateUsers = await options.database
        .select({
          id: authUsers.id,
          email: authUsers.email,
          createdAt: authUsers.createdAt,
        })
        .from(authUsers)
        .innerJoin(notificationVerifiedSignins, eq(notificationVerifiedSignins.userId, authUsers.id))
        .where(
          and(
            eq(authUsers.emailVerified, true),
            eq(authUsers.isAnonymous, false),
            lte(notificationVerifiedSignins.signedInAt, twoDaysAgo),
            notExists(options.database.select({ id: notificationDeliveries.id }).from(notificationDeliveries).where(eq(notificationDeliveries.idempotencyKey, sql`'nurture-signin:' || ${authUsers.id}`))),
          ),
        )
        .orderBy(sql`${notificationVerifiedSignins.lastCheckedAt} nulls first`, notificationVerifiedSignins.signedInAt)
        .limit(limit);

      let enqueued = 0;
      let skipped = 0;

      for (const user of candidateUsers) {
        await options.database.update(notificationVerifiedSignins).set({ lastCheckedAt: now }).where(eq(notificationVerifiedSignins.userId, user.id));
        const idempotencyKey = `nurture-signin:${user.id}`;

        // 2. Check if already enqueued / delivered
        const [existingDelivery] = await options.database
          .select({ id: notificationDeliveries.id })
          .from(notificationDeliveries)
          .where(eq(notificationDeliveries.idempotencyKey, idempotencyKey))
          .limit(1);

        if (existingDelivery !== undefined) {
          skipped += 1;
          continue;
        }

        // 3. Check "without purchase": must not have any paid order or entitlement
        const [paidOrder] = await options.database
          .select({ id: commerceOrders.id })
          .from(commerceOrders)
          .where(
            and(
              eq(commerceOrders.ownerId, user.id),
              isNotNull(commerceOrders.paidAt),
            ),
          )
          .limit(1);

        if (paidOrder !== undefined) {
          skipped += 1;
          continue;
        }

        const [entitlement] = await options.database
          .select({ id: commerceEntitlements.id })
          .from(commerceEntitlements)
          .where(eq(commerceEntitlements.ownerId, user.id))
          .limit(1);

        if (entitlement !== undefined) {
          skipped += 1;
          continue;
        }

        // 4. Check preference / unsubscribe
        const allowed = await options.preferenceStore.isNonTransactionalAllowed(
          user.email,
          user.id,
        );
        if (!allowed) {
          skipped += 1;
          continue;
        }

        // 5. Look up user chart: join birthProfiles -> ziweiCharts -> ziweiChartVersions
        const [chartRecord] = await options.database
          .select({
            chartId: ziweiCharts.id,
            normalizedOutput: ziweiChartVersions.normalizedOutput,
          })
          .from(birthProfiles)
          .innerJoin(ziweiCharts, eq(ziweiCharts.profileId, birthProfiles.id))
          .innerJoin(
            ziweiChartVersions,
            eq(ziweiChartVersions.chartId, ziweiCharts.id),
          )
          .where(
            and(
              eq(birthProfiles.userId, user.id),
              isNull(birthProfiles.deletedAt),
            ),
          )
          .orderBy(desc(ziweiChartVersions.createdAt))
          .limit(1);

        if (!chartRecord || !chartRecord.normalizedOutput) {
          // Do not invent chart data!
          skipped += 1;
          continue;
        }

        const parsedChart = NormalizedZiweiChartV1Schema.safeParse(
          chartRecord.normalizedOutput,
        );
        if (!parsedChart.success || parsedChart.data.palaces.length === 0) {
          skipped += 1;
          continue;
        }

        // Find one REAL palace from the user chart
        const availablePalaceIds = new Set(
          parsedChart.data.palaces.map((p) => p.id),
        );
        let selectedPalaceId: string | undefined;

        for (const preferred of NURTURE_PALACE_PRIORITY) {
          if (availablePalaceIds.has(preferred)) {
            selectedPalaceId = preferred;
            break;
          }
        }

        if (!selectedPalaceId) {
          selectedPalaceId = parsedChart.data.palaces[0]?.id;
        }

        if (!selectedPalaceId) {
          skipped += 1;
          continue;
        }

        const palaceTitle =
          PALACE_TITLES_VI[selectedPalaceId] ?? selectedPalaceId;

        // 6. Build payload
        const unsubToken = generateUnsubscribeToken(
          { userId: user.id, email: user.email },
          options.tokenSecret,
          now,
        );

        const payload: NurtureVerifiedSignInEmailRequest = {
          version: 1,
          kind: "nurture_verified_signin",
          idempotencyKey,
          recipient: user.email.trim().toLowerCase(),
          locale: "vi",
          actionUrl: `${origin}/la-so/${encodeURIComponent(chartRecord.chartId)}?palace=${encodeURIComponent(selectedPalaceId)}`,
          unsubscribeUrl: `${origin}/thong-bao/huy-dang-ky#token=${encodeURIComponent(unsubToken)}`,
          requestId: `nurture-${user.id}-${now.getTime()}`,
          userId: user.id,
          chartId: chartRecord.chartId,
          palaceId: selectedPalaceId,
          palaceTitle,
        };

        // 7. Enqueue delivery
        await options.database
          .insert(notificationDeliveries)
          .values({
            idempotencyKey,
            kind: "nurture_verified_signin",
            recipientFingerprint: fingerprintEmail(user.email, options.tokenSecret),
            requestPayload: payload,
            status: "pending",
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();

        enqueued += 1;
      }

      return {
        scanned: candidateUsers.length,
        enqueued,
        skipped,
      };
    },
  };
}
