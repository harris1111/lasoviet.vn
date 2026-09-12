import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import type {
  AccountCenterErrorCode,
  AccountExportProfileV1,
  PersistedNormalizedBirthProfileV1,
  AccountExportProjectionV1,
  AccountOverviewProjectionV1,
  AccountPrivacyProjectionV1,
  AccountProfilesProjectionV1,
  IdentityReportContentV1,
  Result,
  ZiweiComprehensiveReportContentV1,
} from "@lasoviet/contracts";
import {
  AccountExportProjectionV1Schema,
  AccountOverviewProjectionV1Schema,
  AccountPrivacyProjectionV1Schema,
  AccountProfilesProjectionV1Schema,
  BirthProfileV1Schema,
  IdentityReportContentV1Schema,
  IdentityReportV1Schema,
  NormalizedZiweiChartV1Schema,
  PersistedNormalizedBirthProfileV1Schema,
  ZiweiComprehensiveReportContentV1Schema,
} from "@lasoviet/contracts";
import {
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  commerceEntitlements,
  commerceOrders,
  consents,
  deletionRequests,
  reportReservations,
  reportVersions,
  ziweiChartVersions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";

export type AccountCenterService = {
  getOverview(
    userId: string,
  ): Promise<Result<AccountOverviewProjectionV1, AccountCenterErrorCode>>;
  getProfiles(
    userId: string,
  ): Promise<Result<AccountProfilesProjectionV1, AccountCenterErrorCode>>;
  getPrivacy(
    userId: string,
  ): Promise<Result<AccountPrivacyProjectionV1, AccountCenterErrorCode>>;
  getExport(
    userId: string,
  ): Promise<Result<AccountExportProjectionV1, AccountCenterErrorCode>>;
};

function notFoundError(): Result<never, AccountCenterErrorCode> {
  return {
    ok: false,
    error: {
      code: "ACCOUNT_RESOURCE_NOT_FOUND",
      messageKey: "account.resourceNotFound",
      retryable: false,
    },
  };
}

function exportLimitExceededError(): Result<never, AccountCenterErrorCode> {
  return {
    ok: false,
    error: {
      code: "ACCOUNT_EXPORT_LIMIT_EXCEEDED",
      messageKey: "account.exportLimitExceeded",
      retryable: false,
    },
  };
}

export function createAccountCenterService(
  database: Database,
): AccountCenterService {
  async function findUser(userId: string) {
    const [user] = await database
      .select({
        id: authUsers.id,
        name: authUsers.name,
        email: authUsers.email,
        emailVerified: authUsers.emailVerified,
        createdAt: authUsers.createdAt,
      })
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .limit(1);
    return user ?? null;
  }

  return {
    async getOverview(userId: string) {
      const user = await findUser(userId);
      if (!user) return notFoundError();

      // 1. Owned profiles count
      const ownedProfiles = await database
        .select({
          id: birthProfiles.id,
          createdAt: birthProfiles.createdAt,
        })
        .from(birthProfiles)
        .where(and(eq(birthProfiles.userId, userId), isNull(birthProfiles.deletedAt)));

      // 2. Owned orders count
      const ownedOrders = await database
        .select({
          id: commerceOrders.id,
          createdAt: commerceOrders.createdAt,
        })
        .from(commerceOrders)
        .where(eq(commerceOrders.ownerId, userId));

      // 3. Owned entitlements & reports
      const ownedEntitlements = await database
        .select({
          id: commerceEntitlements.id,
        })
        .from(commerceEntitlements)
        .where(eq(commerceEntitlements.ownerId, userId));

      const entitlementIds = ownedEntitlements.map((e) => e.id);
      const ownedReservations =
        entitlementIds.length > 0
          ? await database
              .select({
                reportId: reportReservations.reportId,
                createdAt: reportReservations.createdAt,
              })
              .from(reportReservations)
              .where(inArray(reportReservations.entitlementId, entitlementIds))
          : [];

      // 4. Consents - real active (revokedAt is null) and real total count
      const ownedConsents = await database
        .select({
          documentKey: consents.documentKey,
          revokedAt: consents.revokedAt,
        })
        .from(consents)
        .where(eq(consents.userId, userId));

      const consentActiveCount = ownedConsents.filter((c) => c.revokedAt === null).length;
      const consentTotalCount = ownedConsents.length;

      // 5. Deletion request
      const [deletionReq] = await database
        .select({
          id: deletionRequests.id,
          requestedAt: deletionRequests.requestedAt,
        })
        .from(deletionRequests)
        .where(eq(deletionRequests.userId, userId))
        .orderBy(desc(deletionRequests.requestedAt))
        .limit(1);

      // 6. Recent activity aggregation - neutral identifiers only
      const activities: Array<{
        id: string;
        type: "profile_created" | "report_purchased" | "order_created" | "deletion_requested";
        targetId: string;
        timestamp: string;
      }> = [];

      for (const p of ownedProfiles.slice(0, 3)) {
        activities.push({
          id: `act-p-${p.id}`,
          type: "profile_created",
          targetId: p.id,
          timestamp: p.createdAt.toISOString(),
        });
      }

      for (const r of ownedReservations.slice(0, 3)) {
        activities.push({
          id: `act-r-${r.reportId}`,
          type: "report_purchased",
          targetId: r.reportId,
          timestamp: r.createdAt.toISOString(),
        });
      }

      for (const o of ownedOrders.slice(0, 3)) {
        activities.push({
          id: `act-o-${o.id}`,
          type: "order_created",
          targetId: o.id,
          timestamp: o.createdAt.toISOString(),
        });
      }

      if (deletionReq) {
        activities.push({
          id: `act-d-${deletionReq.id}`,
          type: "deletion_requested",
          targetId: deletionReq.id,
          timestamp: deletionReq.requestedAt.toISOString(),
        });
      }

      activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      const projection: AccountOverviewProjectionV1 = {
        account: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
        counts: {
          profileCount: ownedProfiles.length,
          reportCount: ownedReservations.length,
          orderCount: ownedOrders.length,
          consentActiveCount,
          consentTotalCount,
        },
        recentActivity: activities.slice(0, 5),
      };

      const parsed = AccountOverviewProjectionV1Schema.safeParse(projection);
      if (!parsed.success) {
        throw new Error("CONTRACT_VIOLATION");
      }
      return { ok: true, value: parsed.data };
    },

    async getProfiles(userId: string) {
      const user = await findUser(userId);
      if (!user) return notFoundError();

      const profiles = await database
        .select({
          id: birthProfiles.id,
          createdAt: birthProfiles.createdAt,
        })
        .from(birthProfiles)
        .where(and(eq(birthProfiles.userId, userId), isNull(birthProfiles.deletedAt)))
        .orderBy(desc(birthProfiles.createdAt));

      const profileIds = profiles.map((p) => p.id);
      if (profileIds.length === 0) {
        return { ok: true, value: { profiles: [] } };
      }

      // Load latest revisions
      const revisions = await database
        .select({
          profileId: birthProfileRevisions.profileId,
          revisionNumber: birthProfileRevisions.revisionNumber,
          originalInput: birthProfileRevisions.originalInput,
        })
        .from(birthProfileRevisions)
        .where(inArray(birthProfileRevisions.profileId, profileIds))
        .orderBy(desc(birthProfileRevisions.revisionNumber));

      const revisionByProfile = new Map<string, typeof revisions[0]>();
      for (const rev of revisions) {
        if (!revisionByProfile.has(rev.profileId)) {
          revisionByProfile.set(rev.profileId, rev);
        }
      }

      // Load charts for these profiles
      const charts = await database
        .select({
          id: ziweiCharts.id,
          profileId: ziweiCharts.profileId,
        })
        .from(ziweiCharts)
        .where(inArray(ziweiCharts.profileId, profileIds));

      const chartByProfile = new Map<string, string>();
      for (const ch of charts) {
        chartByProfile.set(ch.profileId, ch.id);
      }

      // Load purchased report entitlements for this user
      const entitlements = await database
        .select({
          chartId: commerceEntitlements.chartId,
        })
        .from(commerceEntitlements)
        .where(eq(commerceEntitlements.ownerId, userId));

      const purchasedChartIds = new Set(entitlements.map((e) => e.chartId));

      const mappedProfiles: AccountProfilesProjectionV1["profiles"] = [];

      for (const p of profiles) {
        const rev = revisionByProfile.get(p.id);
        if (!rev) return notFoundError();

        // Validate persisted originalInput strictly against schema; fail closed on corruption.
        const parsedInput = BirthProfileV1Schema.safeParse(rev.originalInput);
        if (!parsedInput.success) {
          return notFoundError();
        }

        const original = parsedInput.data;
        const chartId = chartByProfile.get(p.id) ?? null;
        const hasPurchasedReport = chartId !== null && purchasedChartIds.has(chartId);

        mappedProfiles.push({
          id: p.id,
          calendar: original.calendar,
          time: original.time,
          timezone: original.timezone,
          gender: original.gender ?? null,
          chartId,
          hasPurchasedReport,
          createdAt: p.createdAt.toISOString(),
        });
      }

      const projection: AccountProfilesProjectionV1 = { profiles: mappedProfiles };
      const parsed = AccountProfilesProjectionV1Schema.safeParse(projection);
      if (!parsed.success) {
        throw new Error("CONTRACT_VIOLATION");
      }
      return { ok: true, value: parsed.data };
    },

    async getPrivacy(userId: string) {
      const user = await findUser(userId);
      if (!user) return notFoundError();

      // Select revokedAt; active = revokedAt === null
      const consentList = await database
        .select({
          documentKey: consents.documentKey,
          documentVersion: consents.documentVersion,
          purpose: consents.purpose,
          grantedAt: consents.grantedAt,
          revokedAt: consents.revokedAt,
        })
        .from(consents)
        .where(eq(consents.userId, userId))
        .orderBy(desc(consents.grantedAt));

      const [deletionReq] = await database
        .select({
          id: deletionRequests.id,
          requestedAt: deletionRequests.requestedAt,
          recoverUntil: deletionRequests.recoverUntil,
          purgeAfter: deletionRequests.purgeAfter,
          status: deletionRequests.status,
        })
        .from(deletionRequests)
        .where(eq(deletionRequests.userId, userId))
        .orderBy(desc(deletionRequests.requestedAt))
        .limit(1);

      const mappedConsents = consentList.map((c) => ({
        documentKey: c.documentKey,
        documentVersion: c.documentVersion,
        purpose: c.purpose,
        grantedAt: c.grantedAt.toISOString(),
        revokedAt: c.revokedAt?.toISOString() ?? null,
        active: c.revokedAt === null,
      }));

      const mappedDeletion = deletionReq
        ? {
            id: deletionReq.id,
            requestedAt: deletionReq.requestedAt.toISOString(),
            recoverUntil: deletionReq.recoverUntil.toISOString(),
            purgeAfter: deletionReq.purgeAfter.toISOString(),
            status: deletionReq.status,
          }
        : null;

      const projection: AccountPrivacyProjectionV1 = {
        consents: mappedConsents,
        deletionRequest: mappedDeletion,
      };
      const parsed = AccountPrivacyProjectionV1Schema.safeParse(projection);
      if (!parsed.success) {
        throw new Error("CONTRACT_VIOLATION");
      }
      return { ok: true, value: parsed.data };
    },

    async getExport(userId: string) {
      const user = await findUser(userId);
      if (!user) return notFoundError();

      // 1. Owned profiles & revisions
      const profiles = await database
        .select({
          id: birthProfiles.id,
          createdAt: birthProfiles.createdAt,
        })
        .from(birthProfiles)
        .where(and(eq(birthProfiles.userId, userId), isNull(birthProfiles.deletedAt)))
        .orderBy(desc(birthProfiles.createdAt));

      if (profiles.length > 50) {
        return exportLimitExceededError();
      }

      const profileIds = profiles.map((p) => p.id);
      const revisions =
        profileIds.length > 0
          ? await database
              .select({
                profileId: birthProfileRevisions.profileId,
                revisionNumber: birthProfileRevisions.revisionNumber,
                originalInput: birthProfileRevisions.originalInput,
                normalizedInput: birthProfileRevisions.normalizedInput,
                createdAt: birthProfileRevisions.createdAt,
              })
              .from(birthProfileRevisions)
              .where(inArray(birthProfileRevisions.profileId, profileIds))
              .orderBy(asc(birthProfileRevisions.revisionNumber))
          : [];

      if (revisions.length > 500) {
        return exportLimitExceededError();
      }

      const revisionsByProfile = new Map<string, typeof revisions>();
      for (const rev of revisions) {
        const list = revisionsByProfile.get(rev.profileId) ?? [];
        list.push(rev);
        revisionsByProfile.set(rev.profileId, list);
      }

      const exportedProfiles: AccountExportProjectionV1["profiles"] = [];
      for (const p of profiles) {
        const revs = revisionsByProfile.get(p.id) ?? [];
        if (revs.length === 0) {
          return notFoundError();
        }
        if (revs.length > 100) {
          return exportLimitExceededError();
        }

        const exportedRevs: AccountExportProfileV1["revisions"] = [];
        for (const rev of revs) {
          const parsedOriginal = BirthProfileV1Schema.safeParse(rev.originalInput);
          if (!parsedOriginal.success) {
            return notFoundError();
          }

          let parsedNormalized: PersistedNormalizedBirthProfileV1 | null = null;
          if (rev.normalizedInput !== null && rev.normalizedInput !== undefined) {
            const normResult = PersistedNormalizedBirthProfileV1Schema.safeParse(rev.normalizedInput);
            if (!normResult.success) {
              return notFoundError();
            }
            parsedNormalized = normResult.data;
          }

          exportedRevs.push({
            revisionNumber: rev.revisionNumber,
            originalInput: parsedOriginal.data,
            normalizedInput: parsedNormalized,
            createdAt: rev.createdAt.toISOString(),
          });
        }

        exportedProfiles.push({
          id: p.id,
          revisions: exportedRevs,
          createdAt: p.createdAt.toISOString(),
        });
      }

      // 2. Charts
      const charts =
        profileIds.length > 0
          ? await database
              .select({
                id: ziweiCharts.id,
                createdAt: ziweiCharts.createdAt,
              })
              .from(ziweiCharts)
              .where(inArray(ziweiCharts.profileId, profileIds))
          : [];

      const chartIds = charts.map((c) => c.id);
      const chartVersions =
        chartIds.length > 0
          ? await database
              .select({
                id: ziweiChartVersions.id,
                chartId: ziweiChartVersions.chartId,
                normalizedOutput: ziweiChartVersions.normalizedOutput,
                createdAt: ziweiChartVersions.createdAt,
              })
              .from(ziweiChartVersions)
              .where(inArray(ziweiChartVersions.chartId, chartIds))
          : [];

      if (chartVersions.length > 50) {
        return exportLimitExceededError();
      }

      const exportedCharts: AccountExportProjectionV1["charts"] = [];
      for (const cv of chartVersions) {
        // Parse with NormalizedZiweiChartV1Schema
        const parsedChart = NormalizedZiweiChartV1Schema.safeParse(cv.normalizedOutput);
        if (!parsedChart.success) {
          return notFoundError();
        }
        exportedCharts.push({
          chartId: cv.chartId,
          chartVersionId: cv.id,
          chartData: parsedChart.data,
          createdAt: cv.createdAt.toISOString(),
        });
      }

      // 3. Orders
      const orders = await database
        .select({
          id: commerceOrders.id,
          invoiceNumber: commerceOrders.invoiceNumber,
          sku: commerceOrders.sku,
          amount: commerceOrders.amount,
          currency: commerceOrders.currency,
          status: commerceOrders.status,
          createdAt: commerceOrders.createdAt,
          paidAt: commerceOrders.paidAt,
        })
        .from(commerceOrders)
        .where(eq(commerceOrders.ownerId, userId))
        .orderBy(desc(commerceOrders.createdAt));

      if (orders.length > 100) {
        return exportLimitExceededError();
      }

      const exportedOrders = orders.map((o) => ({
        id: o.id,
        invoiceNumber: o.invoiceNumber,
        sku: o.sku,
        amount: o.amount,
        currency: o.currency,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        paidAt: o.paidAt?.toISOString() ?? null,
      }));

      // 4. Reports - report versions must match congruent reservation fields
      const entitlements = await database
        .select({
          id: commerceEntitlements.id,
        })
        .from(commerceEntitlements)
        .where(eq(commerceEntitlements.ownerId, userId));

      const entitlementIds = entitlements.map((e) => e.id);
      const reservations =
        entitlementIds.length > 0
          ? await database
              .select({
                reportId: reportReservations.reportId,
                reportVersionId: reportReservations.reportVersionId,
                entitlementId: reportReservations.entitlementId,
                chartVersionId: reportReservations.chartVersionId,
                evidenceVersionId: reportReservations.evidenceVersionId,
                knowledgeVersionId: reportReservations.knowledgeVersionId,
                promptVersion: reportReservations.promptVersion,
                reportConfigVersion: reportReservations.reportConfigVersion,
                sku: reportReservations.sku,
                locale: reportReservations.locale,
                status: reportReservations.status,
                createdAt: reportReservations.createdAt,
              })
              .from(reportReservations)
              .where(inArray(reportReservations.entitlementId, entitlementIds))
          : [];

      if (reservations.length > 50) {
        return exportLimitExceededError();
      }

      const versionIds = reservations.map((r) => r.reportVersionId);
      const versions =
        versionIds.length > 0
          ? await database
              .select({
                reportId: reportVersions.reportId,
                reportVersionId: reportVersions.reportVersionId,
                entitlementId: reportVersions.entitlementId,
                chartVersionId: reportVersions.chartVersionId,
                evidenceVersionId: reportVersions.evidenceVersionId,
                knowledgeVersionId: reportVersions.knowledgeVersionId,
                promptVersion: reportVersions.promptVersion,
                reportConfigVersion: reportVersions.reportConfigVersion,
                sku: reportVersions.sku,
                locale: reportVersions.locale,
                structuredContent: reportVersions.structuredContent,
              })
              .from(reportVersions)
              .where(
                and(
                  inArray(reportVersions.reportVersionId, versionIds),
                  inArray(reportVersions.entitlementId, entitlementIds),
                ),
              )
          : [];

      const versionMap = new Map<string, typeof versions[0]>();
      for (const v of versions) {
        versionMap.set(v.reportVersionId, v);
      }

      const exportedReports: AccountExportProjectionV1["reports"] = [];
      for (const r of reservations) {
        const ver = versionMap.get(r.reportVersionId);
        if (
          !ver ||
          ver.reportId !== r.reportId ||
          ver.entitlementId !== r.entitlementId ||
          ver.chartVersionId !== r.chartVersionId ||
          ver.evidenceVersionId !== r.evidenceVersionId ||
          ver.knowledgeVersionId !== r.knowledgeVersionId ||
          ver.promptVersion !== r.promptVersion ||
          ver.reportConfigVersion !== r.reportConfigVersion ||
          ver.locale !== r.locale ||
          ver.sku !== r.sku
        ) {
          return notFoundError();
        }

        const parsedReport = IdentityReportV1Schema.safeParse(ver.structuredContent);
        let content: IdentityReportContentV1 | ZiweiComprehensiveReportContentV1;
        if (parsedReport.success) {
          content = {
            sections: parsedReport.data.sections,
            reflectionQuestions: parsedReport.data.reflectionQuestions,
            summaryActions: parsedReport.data.summaryActions,
          };
        } else {
          const parsedContent = IdentityReportContentV1Schema.safeParse(ver.structuredContent);
          if (parsedContent.success) {
            content = parsedContent.data;
          } else {
            const parsedV3 = ZiweiComprehensiveReportContentV1Schema.safeParse(ver.structuredContent);
            if (parsedV3.success) {
              content = parsedV3.data;
            } else {
              return notFoundError();
            }
          }
        }

        exportedReports.push({
          reportId: r.reportId,
          reportVersionId: r.reportVersionId,
          sku: r.sku,
          locale: (r.locale === "en" ? "en" : "vi") as "vi" | "en",
          status: r.status,
          content,
          createdAt: r.createdAt.toISOString(),
        });
      }

      // 5. Consents
      const consentList = await database
        .select({
          documentKey: consents.documentKey,
          documentVersion: consents.documentVersion,
          purpose: consents.purpose,
          grantedAt: consents.grantedAt,
          revokedAt: consents.revokedAt,
        })
        .from(consents)
        .where(eq(consents.userId, userId))
        .orderBy(desc(consents.grantedAt));

      if (consentList.length > 50) {
        return exportLimitExceededError();
      }

      const exportedConsents = consentList.map((c) => ({
        documentKey: c.documentKey,
        documentVersion: c.documentVersion,
        purpose: c.purpose,
        grantedAt: c.grantedAt.toISOString(),
        revokedAt: c.revokedAt?.toISOString() ?? null,
      }));

      // 6. Deletion request
      const [deletionReq] = await database
        .select({
          id: deletionRequests.id,
          requestedAt: deletionRequests.requestedAt,
          recoverUntil: deletionRequests.recoverUntil,
          purgeAfter: deletionRequests.purgeAfter,
          status: deletionRequests.status,
        })
        .from(deletionRequests)
        .where(eq(deletionRequests.userId, userId))
        .orderBy(desc(deletionRequests.requestedAt))
        .limit(1);

      const exportedDeletion = deletionReq
        ? {
            id: deletionReq.id,
            requestedAt: deletionReq.requestedAt.toISOString(),
            recoverUntil: deletionReq.recoverUntil.toISOString(),
            purgeAfter: deletionReq.purgeAfter.toISOString(),
            status: deletionReq.status,
          }
        : null;

      const exportData: AccountExportProjectionV1 = {
        exportedAt: new Date().toISOString(),
        account: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
        },
        profiles: exportedProfiles,
        charts: exportedCharts,
        orders: exportedOrders,
        reports: exportedReports,
        consents: exportedConsents,
        deletionRequest: exportedDeletion,
      };

      const parsed = AccountExportProjectionV1Schema.safeParse(exportData);
      if (!parsed.success) {
        throw new Error("CONTRACT_VIOLATION");
      }
      return { ok: true, value: parsed.data };
    },
  };
}
