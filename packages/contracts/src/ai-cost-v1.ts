import { z } from "zod";

export const AI_REQUEST_PURPOSES = [
  "report",
  "critic",
  "rewrite",
  "free_preview",
  "synthetic_probe",
] as const;

export const AiRequestPurposeSchema = z.enum(AI_REQUEST_PURPOSES);
export type AiRequestPurpose = z.infer<typeof AiRequestPurposeSchema>;

export const PREVIEW_COST_GUARD_CONSTANTS = Object.freeze({
  maxGeneratedSectionsPerChart: 3,
  maxBillableTokensPerChart: 24_000,
  maxCostVndPerChart: 3_000,
  maxRewritesPerSection: 1,
});

export const AiCostRequestContextSchema = z
  .object({
    idempotencyKey: z.string().trim().min(1).optional(),
    reportId: z.string().uuid().optional(),
    reportVersionId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    entitlementId: z.string().uuid().optional(),
    chartId: z.string().trim().min(1).optional(),
    chartVersionId: z.string().trim().min(1).optional(),
    sku: z.string().trim().min(1).optional(),
    purpose: AiRequestPurposeSchema.optional(),
    attemptNumber: z.number().int().nonnegative().optional(),
  })
  .strict();

export type AiCostRequestContext = z.infer<typeof AiCostRequestContextSchema>;

export const AiUsageTokensSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cachedTokens: z.number().int().nonnegative().default(0),
    totalTokens: z.number().int().nonnegative(),
  })
  .strict();

export type AiUsageTokens = z.infer<typeof AiUsageTokensSchema>;

export const AiModelPricingSchema = z
  .object({
    id: z.string().uuid().optional(),
    pricingVersion: z.string().trim().min(1),
    providerId: z.string().trim().min(1),
    modelId: z.string().trim().min(1),
    currency: z.literal("VND"),
    inputPricePerMillion: z.number().int().nonnegative(),
    outputPricePerMillion: z.number().int().nonnegative(),
    cachedInputPricePerMillion: z.number().int().nonnegative(),
    effectiveFrom: z.date(),
    source: z.string().trim().min(1),
    sourceCurrency: z.string().trim().min(1),
    sourceReference: z.string().trim().min(1),
    fxSource: z.string().trim().min(1),
    fxRate: z.number().int().positive(),
    fxTimestamp: z.date(),
    referenceMetadata: z.record(z.string(), z.unknown()).default({}),
    status: z.enum(["active", "retired", "pending_approval"]).default("active"),
    createdAt: z.date().optional(),
  })
  .strict();

export type AiModelPricing = z.infer<typeof AiModelPricingSchema>;

export const AiCallAttemptSchema = z
  .object({
    id: z.string().uuid(),
    callId: z.string().trim().min(1),
    attemptNumber: z.number().int().nonnegative(),
    idempotencyKey: z.string().trim().min(1).nullable().optional(),
    purpose: AiRequestPurposeSchema,
    providerId: z.string().trim().min(1),
    requestedModelId: z.string().trim().min(1),
    reportId: z.string().uuid().nullable().optional(),
    reportVersionId: z.string().uuid().nullable().optional(),
    orderId: z.string().uuid().nullable().optional(),
    entitlementId: z.string().uuid().nullable().optional(),
    chartId: z.string().trim().min(1).nullable().optional(),
    chartVersionId: z.string().trim().min(1).nullable().optional(),
    sku: z.string().trim().min(1).nullable().optional(),
    maxOutputTokens: z.number().int().positive(),
    pricingVersion: z.string().trim().min(1),
    inputPricePerMillion: z.number().int().nonnegative(),
    outputPricePerMillion: z.number().int().nonnegative(),
    cachedInputPricePerMillion: z.number().int().nonnegative(),
    currency: z.literal("VND"),
    sourceCurrency: z.string().trim().min(1),
    sourceReference: z.string().trim().min(1),
    fxSource: z.string().trim().min(1),
    fxRate: z.number().int().positive(),
    fxTimestamp: z.date(),
    pricingSource: z.string().trim().min(1),
    startedAt: z.date(),
  })
  .strict();

export type AiCallAttempt = z.infer<typeof AiCallAttemptSchema>;

export const AiUsageOutcomeSchema = z
  .object({
    id: z.string().uuid(),
    attemptId: z.string().uuid(),
    responseModelId: z.string().trim().min(1).nullable().optional(),
    httpStatus: z.number().int().nullable().optional(),
    errorCode: z.string().nullable().optional(),
    inputTokens: z.number().int().nonnegative().nullable().optional(),
    outputTokens: z.number().int().nonnegative().nullable().optional(),
    cachedTokens: z.number().int().nonnegative().nullable().optional(),
    totalTokens: z.number().int().nonnegative().nullable().optional(),
    tokensUnknown: z.boolean().default(false),
    costMicroVnd: z.string().nullable().optional(),
    costVnd: z.number().int().nonnegative().nullable().optional(),
    costStatus: z.enum(["resolved", "unknown"]),
    completedAt: z.date(),
  })
  .strict();

export type AiUsageOutcome = z.infer<typeof AiUsageOutcomeSchema>;

export const AiUsageRecordSchema = z
  .object({
    id: z.string().uuid(),
    callId: z.string().trim().min(1),
    idempotencyKey: z.string().trim().min(1).nullable().optional(),
    attemptNumber: z.number().int().nonnegative(),
    purpose: AiRequestPurposeSchema,
    providerId: z.string().trim().min(1),
    modelId: z.string().trim().min(1),
    responseModelId: z.string().trim().min(1).nullable().optional(),
    reportId: z.string().uuid().nullable().optional(),
    reportVersionId: z.string().uuid().nullable().optional(),
    orderId: z.string().uuid().nullable().optional(),
    entitlementId: z.string().uuid().nullable().optional(),
    chartId: z.string().trim().min(1).nullable().optional(),
    chartVersionId: z.string().trim().min(1).nullable().optional(),
    sku: z.string().trim().min(1).nullable().optional(),
    inputTokens: z.number().int().nonnegative().nullable().optional(),
    outputTokens: z.number().int().nonnegative().nullable().optional(),
    cachedTokens: z.number().int().nonnegative().nullable().optional(),
    totalTokens: z.number().int().nonnegative().nullable().optional(),
    tokensUnknown: z.boolean().default(false),
    httpStatus: z.number().int().nullable().optional(),
    errorCode: z.string().nullable().optional(),
    pricingVersion: z.string().trim().min(1),
    inputPricePerMillion: z.number().int().nonnegative(),
    outputPricePerMillion: z.number().int().nonnegative(),
    cachedInputPricePerMillion: z.number().int().nonnegative(),
    currency: z.literal("VND").default("VND"),
    costMicroVnd: z.string().nullable().optional(),
    costVnd: z.number().int().nonnegative().nullable().optional(),
    costStatus: z.enum(["resolved", "unknown"]),
    startedAt: z.date(),
    completedAt: z.date().nullable().optional(),
  })
  .strict();

export type AiUsageRecord = z.infer<typeof AiUsageRecordSchema>;

export const AiCogsSummarySchema = z
  .object({
    tier1ReportCogsVnd: z.number().int().nonnegative(),
    tier2ReportCogsVnd: z.number().int().nonnegative(),
    freePreviewCogsVnd: z.number().int().nonnegative(),
    otherCogsVnd: z.number().int().nonnegative(),
    totalCogsVnd: z.number().int().nonnegative(),
    totalCogsMicroVnd: z.string(),
    totalBillableTokens: z.number().int().nonnegative(),
    totalAttempts: z.number().int().nonnegative(),
    resolvedAttemptCount: z.number().int().nonnegative(),
    unknownAttemptCount: z.number().int().nonnegative(),
    hasIncompleteAttempts: z.boolean(),
  })
  .strict();

export type AiCogsSummary = z.infer<typeof AiCogsSummarySchema>;

export const PreviewPreflightReservationSchema = z
  .object({
    projectedSections: z.number().int().nonnegative(),
    projectedTokens: z.number().int().positive(),
    projectedCostVnd: z.number().int().positive(),
    sectionId: z.string().trim().min(1).optional(),
    isRewrite: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.isRewrite) {
      if (data.projectedSections !== 0) {
        ctx.addIssue({
          code: "custom",
          path: ["projectedSections"],
          message: "Rewrite reservation must specify projectedSections === 0",
        });
      }
      if (!data.sectionId || data.sectionId.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["sectionId"],
          message: "Rewrite reservation requires a non-empty sectionId",
        });
      }
    } else {
      if (data.projectedSections <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["projectedSections"],
          message: "Generation reservation must specify projectedSections > 0",
        });
      }
    }
  });

export type PreviewPreflightReservation = z.infer<
  typeof PreviewPreflightReservationSchema
>;

export const PreviewBudgetUsageSchema = z
  .object({
    generatedSections: z.number().int().nonnegative(),
    billableTokens: z.number().int().nonnegative(),
    costVnd: z.number().int().nonnegative(),
    hasUnknownCost: z.boolean().optional(),
    rewritesBySection: z.record(z.string(), z.number().int().nonnegative()).optional(),
  })
  .strict();

export type PreviewBudgetUsage = z.infer<typeof PreviewBudgetUsageSchema>;

export const ContributionMarginCohortInputSchema = z
  .object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    asOfDate: z.date().optional(),
    paymentFeeAllocationVnd: z.number().int().nonnegative().default(0),
  })
  .strict();

export type ContributionMarginCohortInput = z.infer<
  typeof ContributionMarginCohortInputSchema
>;

export const AuthoritativeRevenueSnapshotSchema = z
  .object({
    periodStart: z.date(),
    periodEnd: z.date(),
    recognizedRevenueVnd: z.number().int(),
    grossPurchasedLaSpendVnd: z.number().int().nonnegative(),
    refundedPurchasedLaVnd: z.number().int().nonnegative(),
    excludedPromotionalBonusLaVnd: z.number().int().nonnegative(),
    excludedDisabledAutopayVnd: z.number().int().nonnegative(),
    source: z.string().trim().min(1),
  })
  .strict();

export type AuthoritativeRevenueSnapshot = z.infer<
  typeof AuthoritativeRevenueSnapshotSchema
>;

export const ContributionMarginReportSchema = z
  .object({
    status: z.literal("complete"),
    periodStart: z.date(),
    periodEnd: z.date(),
    recognizedRevenueVnd: z.number().int(),
    aiCogsVnd: z.number().int().nonnegative(),
    tier1AiCogsVnd: z.number().int().nonnegative(),
    tier2AiCogsVnd: z.number().int().nonnegative(),
    freePreviewAiCogsVnd: z.number().int().nonnegative(),
    otherAiCogsVnd: z.number().int().nonnegative(),
    paymentFeesVnd: z.number().int().nonnegative(),
    infrastructureCostVnd: z.literal(0),
    supportCostMetricLabel: z.literal("contribution margin before support cost"),
    contributionMarginBeforeSupportCostVnd: z.number().int(),
    contributionMarginRatio: z.number(),
    hasIncompleteAttempts: z.literal(false),
    unknownAttemptCount: z.literal(0),
  })
  .strict();

export type ContributionMarginReport = z.infer<
  typeof ContributionMarginReportSchema
>;

export const ContributionMarginUnavailableSchema = z
  .object({
    status: z.literal("unavailable"),
    reason: z.enum(["LA_LEDGER_SOURCE_MISSING", "AI_COGS_INCOMPLETE"]),
    message: z.string(),
    periodStart: z.date(),
    periodEnd: z.date(),
    cogs: AiCogsSummarySchema,
  })
  .strict();

export type ContributionMarginUnavailable = z.infer<
  typeof ContributionMarginUnavailableSchema
>;

export const ContributionMarginResultSchema = z.discriminatedUnion("status", [
  ContributionMarginReportSchema,
  ContributionMarginUnavailableSchema,
]);

export type ContributionMarginResult = z.infer<
  typeof ContributionMarginResultSchema
>;
