import { z } from "zod";

import {
  BirthCalendarInputSchema,
  BirthProfileV1Schema,
  BirthTimeInputSchema,
  BirthTimezoneInputSchema,
  NormalizedBirthProfileV1Schema,
} from "./birth-profile-v1.js";
import { IdentityReportContentV1Schema } from "./identity-report-v1.js";
import { NormalizedZiweiChartV1Schema } from "./normalized-ziwei-chart-v1.js";
import { ZiweiComprehensiveReportContentV1Schema } from "./ziwei-comprehensive-report-v1.js";

export const AccountCenterErrorCodeSchema = z.enum([
  "ACCOUNT_AUTH_REQUIRED",
  "RESOURCE_FORBIDDEN",
  "ACCOUNT_RESOURCE_NOT_FOUND",
  "ACCOUNT_EXPORT_LIMIT_EXCEEDED",
]);
export type AccountCenterErrorCode = z.infer<
  typeof AccountCenterErrorCodeSchema
>;

export const AccountActivityItemV1Schema = z
  .object({
    id: z.string().trim().min(1).max(128),
    type: z.enum([
      "profile_created",
      "report_purchased",
      "order_created",
      "deletion_requested",
    ]),
    targetId: z.string().trim().min(1).max(128),
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();
export type AccountActivityItemV1 = z.infer<
  typeof AccountActivityItemV1Schema
>;

export const AccountOverviewProjectionV1Schema = z
  .object({
    account: z
      .object({
        id: z.string().trim().min(1).max(128),
        name: z.string().trim().min(1).max(256),
        email: z.string().trim().min(1).max(256),
        createdAt: z.string().datetime({ offset: true }),
      })
      .strict(),
    counts: z
      .object({
        profileCount: z.number().int().nonnegative(),
        reportCount: z.number().int().nonnegative(),
        orderCount: z.number().int().nonnegative(),
        consentActiveCount: z.number().int().nonnegative(),
        consentTotalCount: z.number().int().nonnegative(),
      })
      .strict(),
    recentActivity: z.array(AccountActivityItemV1Schema).max(20),
  })
  .strict();
export type AccountOverviewProjectionV1 = z.infer<
  typeof AccountOverviewProjectionV1Schema
>;

export const AccountProfileSummaryV1Schema = z
  .object({
    id: z.string().trim().min(1).max(128),
    calendar: BirthCalendarInputSchema,
    time: BirthTimeInputSchema,
    timezone: BirthTimezoneInputSchema,
    gender: z.string().trim().min(1).max(32).nullable(),
    chartId: z.string().trim().min(1).max(128).nullable(),
    hasPurchasedReport: z.boolean(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type AccountProfileSummaryV1 = z.infer<
  typeof AccountProfileSummaryV1Schema
>;

export const AccountProfilesProjectionV1Schema = z
  .object({
    profiles: z.array(AccountProfileSummaryV1Schema).max(50),
  })
  .strict();
export type AccountProfilesProjectionV1 = z.infer<
  typeof AccountProfilesProjectionV1Schema
>;

export const AccountConsentItemV1Schema = z
  .object({
    documentKey: z.string().trim().min(1).max(64),
    documentVersion: z.string().trim().min(1).max(64),
    purpose: z.string().trim().min(1).max(64),
    grantedAt: z.string().datetime({ offset: true }),
    revokedAt: z.string().datetime({ offset: true }).nullable(),
    active: z.boolean(),
  })
  .strict();
export type AccountConsentItemV1 = z.infer<
  typeof AccountConsentItemV1Schema
>;

export const AccountDeletionRequestSummaryV1Schema = z
  .object({
    id: z.string().trim().min(1).max(128),
    requestedAt: z.string().datetime({ offset: true }),
    recoverUntil: z.string().datetime({ offset: true }),
    purgeAfter: z.string().datetime({ offset: true }),
    status: z.string().trim().min(1).max(32),
  })
  .strict();
export type AccountDeletionRequestSummaryV1 = z.infer<
  typeof AccountDeletionRequestSummaryV1Schema
>;

export const AccountPrivacyProjectionV1Schema = z
  .object({
    consents: z.array(AccountConsentItemV1Schema).max(50),
    deletionRequest: AccountDeletionRequestSummaryV1Schema.nullable(),
  })
  .strict();
export type AccountPrivacyProjectionV1 = z.infer<
  typeof AccountPrivacyProjectionV1Schema
>;

export const PersistedNormalizedBirthProfileV1Schema = z
  .object({
    version: z.literal(1),
    normalizedCalendar: BirthCalendarInputSchema,
    normalizedTime: BirthTimeInputSchema,
    timezoneProvenance: z.discriminatedUnion("source", [
      z
        .object({
          source: z.literal("offset"),
          offsetMinutes: z.number().int().min(-840).max(840),
        })
        .strict(),
      z
        .object({
          source: z.literal("iana"),
          ianaZone: z.string().trim().min(1).max(128),
          runtime: z.literal("Intl"),
        })
        .strict(),
    ]),
    utcInstant: z.string().datetime({ offset: true }).optional(),
    normalizationWarnings: z.array(z.string().trim().min(1).max(256)).max(50),
    limitations: z.array(z.string().trim().min(1).max(256)).max(50),
  })
  .strict();
export type PersistedNormalizedBirthProfileV1 = z.infer<
  typeof PersistedNormalizedBirthProfileV1Schema
>;

export const AccountExportProfileRevisionV1Schema = z
  .object({
    revisionNumber: z.number().int().positive(),
    originalInput: BirthProfileV1Schema,
    normalizedInput: PersistedNormalizedBirthProfileV1Schema.nullable(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type AccountExportProfileRevisionV1 = z.infer<
  typeof AccountExportProfileRevisionV1Schema
>;

export const AccountExportProfileV1Schema = z
  .object({
    id: z.string().trim().min(1).max(128),
    revisions: z.array(AccountExportProfileRevisionV1Schema).min(1).max(100),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type AccountExportProfileV1 = z.infer<
  typeof AccountExportProfileV1Schema
>;

export const AccountExportChartV1Schema = z
  .object({
    chartId: z.string().trim().min(1).max(128),
    chartVersionId: z.string().trim().min(1).max(128),
    chartData: NormalizedZiweiChartV1Schema,
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type AccountExportChartV1 = z.infer<
  typeof AccountExportChartV1Schema
>;

export const AccountExportOrderV1Schema = z
  .object({
    id: z.string().trim().min(1).max(128),
    invoiceNumber: z.string().trim().min(1).max(128),
    sku: z.string().trim().min(1).max(64),
    amount: z.number().int().nonnegative(),
    currency: z.string().trim().min(1).max(16),
    status: z.string().trim().min(1).max(32),
    createdAt: z.string().datetime({ offset: true }),
    paidAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();
export type AccountExportOrderV1 = z.infer<
  typeof AccountExportOrderV1Schema
>;

export const AccountExportReportV1Schema = z
  .object({
    reportId: z.string().trim().min(1).max(128),
    reportVersionId: z.string().trim().min(1).max(128),
    sku: z.string().trim().min(1).max(64),
    locale: z.enum(["vi", "en"]),
    status: z.string().trim().min(1).max(32),
    content: z.union([
      IdentityReportContentV1Schema,
      ZiweiComprehensiveReportContentV1Schema,
    ]),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type AccountExportReportV1 = z.infer<
  typeof AccountExportReportV1Schema
>;

export const AccountExportConsentV1Schema = z
  .object({
    documentKey: z.string().trim().min(1).max(64),
    documentVersion: z.string().trim().min(1).max(64),
    purpose: z.string().trim().min(1).max(64),
    grantedAt: z.string().datetime({ offset: true }),
    revokedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();
export type AccountExportConsentV1 = z.infer<
  typeof AccountExportConsentV1Schema
>;

export const AccountExportProjectionV1Schema = z
  .object({
    exportedAt: z.string().datetime({ offset: true }),
    account: z
      .object({
        id: z.string().trim().min(1).max(128),
        name: z.string().trim().min(1).max(256),
        email: z.string().trim().min(1).max(256),
        emailVerified: z.boolean(),
        createdAt: z.string().datetime({ offset: true }),
      })
      .strict(),
    profiles: z.array(AccountExportProfileV1Schema).max(50),
    charts: z.array(AccountExportChartV1Schema).max(50),
    orders: z.array(AccountExportOrderV1Schema).max(100),
    reports: z.array(AccountExportReportV1Schema).max(50),
    consents: z.array(AccountExportConsentV1Schema).max(50),
    deletionRequest: AccountDeletionRequestSummaryV1Schema.nullable(),
  })
  .strict();
export type AccountExportProjectionV1 = z.infer<
  typeof AccountExportProjectionV1Schema
>;
