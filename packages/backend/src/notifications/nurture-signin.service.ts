import { and, desc, eq, isNull, lte } from "drizzle-orm";

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
  ziweiCharts,
  ziweiChartVersions,
  type Database,
} from "@lasoviet/database";

import {
  fingerprintEmail,
  generateUnsubscribeToken,
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
}

export function createVerifiedSignInNurtureService(
  options: VerifiedSignInNurtureServiceOptions,
): VerifiedSignInNurtureService {
  const nowValue = options.now ?? (() => new Date());
  const origin = (options.canonicalOrigin ?? "https://lasoviet.net").replace(/\/+$/, "");

  return {
    async scanAndEnqueue(limit = 25): Promise<NurtureScanResult> {
      const now = nowValue();
      // 2 days = 48 hours ago
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // 1. Find verified non-anonymous users created at least 2 days ago
      const candidateUsers = await options.database
        .select({
          id: authUsers.id,
          email: authUsers.email,
          createdAt: authUsers.createdAt,
        })
        .from(authUsers)
        .where(
          and(
            eq(authUsers.emailVerified, true),
            eq(authUsers.isAnonymous, false),
            lte(authUsers.createdAt, twoDaysAgo),
          ),
        )
        .orderBy(desc(authUsers.createdAt))
        .limit(limit);

      let enqueued = 0;
      let skipped = 0;

      for (const user of candidateUsers) {
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
              eq(commerceOrders.status, "paid"),
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
          recipient: user.email,
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
