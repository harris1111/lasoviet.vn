import { randomUUID } from "node:crypto";
import {
  type AiCogsSummary,
  type AiCostRequestContext,
  type AiModelPricing,
  type AiRequestPurpose,
  type AiUsageRecord,
  type AuthoritativeRevenueSnapshot,
  type ContributionMarginCohortInput,
  type ContributionMarginReport,
  type ContributionMarginResult,
} from "@lasoviet/contracts";
import {
  aiModelPricing,
  aiCallAttempts,
  aiUsageOutcomes,
  commerceEntitlements,
  type Database,
} from "@lasoviet/database";
import { and, desc, eq, gte, lte, ne } from "drizzle-orm";

export function toSafeInteger(value: bigint | number, fieldName: string): number {
  const n = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(n) || (typeof value === "bigint" && BigInt(n) !== value)) {
    throw new RangeError(`Value for ${fieldName} exceeds safe integer range: ${value.toString()}`);
  }
  return n;
}

export type CalculateCostInput = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  inputPricePerMillion: number | bigint;
  outputPricePerMillion: number | bigint;
  cachedInputPricePerMillion?: number | bigint;
};

export function calculateTokenCostMicroVnd(input: CalculateCostInput): bigint {
  const cached = Math.max(0, input.cachedTokens ?? 0);
  const nonCachedInput = Math.max(0, input.inputTokens - cached);
  const output = Math.max(0, input.outputTokens);

  const inputPrice = BigInt(input.inputPricePerMillion);
  const cachedPrice = BigInt(input.cachedInputPricePerMillion ?? 0);
  const outputPrice = BigInt(input.outputPricePerMillion);

  return (
    BigInt(nonCachedInput) * inputPrice +
    BigInt(cached) * cachedPrice +
    BigInt(output) * outputPrice
  );
}

export function calculateTokenCostVnd(input: CalculateCostInput): number {
  const numerator = calculateTokenCostMicroVnd(input);
  if (numerator === 0n) return 0;
  const cost = (numerator + 999_999n) / 1_000_000n;
  return toSafeInteger(cost, "costVnd");
}

export type BeginAttemptInput = {
  callId: string;
  attemptNumber: number;
  idempotencyKey?: string;
  purpose: AiRequestPurpose;
  providerId: string;
  requestedModelId: string;
  maxOutputTokens: number;
  costContext?: AiCostRequestContext;
};

export type BeginAttemptResult = {
  attemptId: string;
  pricing: AiModelPricing;
};

export type CompleteAttemptInput = {
  attemptId: string;
  responseModelId?: string;
  httpStatus?: number;
  errorCode?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  totalTokens?: number;
  tokensUnknown?: boolean;
};

export type CompleteAttemptResult = {
  outcomeId: string;
  costMicroVnd?: string;
  costVnd?: number;
  costStatus: "resolved" | "unknown";
};

export type AiCostRecorder = {
  beginAttempt(input: BeginAttemptInput): Promise<
    | { ok: true; value: BeginAttemptResult }
    | {
        ok: false;
        error: {
          code: "AI_PROVIDER_NOT_APPROVED" | "AI_COST_RECORDING_FAILED";
          retryable: boolean;
          message: string;
        };
      }
  >;
  completeAttempt(input: CompleteAttemptInput): Promise<
    | { ok: true; value: CompleteAttemptResult }
    | {
        ok: false;
        error: {
          code: "AI_COST_RECORDING_FAILED";
          retryable: boolean;
          message: string;
        };
      }
  >;
};

export type AiCostService = {
  recorder: AiCostRecorder;
  getEffectivePricing(
    providerId: string,
    modelId: string,
    effectiveAt?: Date,
  ): Promise<AiModelPricing | null>;
  savePricing(pricing: Omit<AiModelPricing, "id" | "createdAt">): Promise<AiModelPricing>;
  getAiCogsSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<AiCogsSummary>;
  getAiCogsPerReport(reportId: string): Promise<{
    totalCostVnd: number;
    totalCostMicroVnd: string;
    totalBillableTokens: number;
    hasIncompleteAttempts: boolean;
    unknownAttemptCount: number;
    records: AiUsageRecord[];
  }>;
  getAiCogsPerChart(chartId: string): Promise<{
    totalCostVnd: number;
    totalCostMicroVnd: string;
    freePreviewCostVnd: number;
    reportCostVnd: number;
    totalBillableTokens: number;
    hasIncompleteAttempts: boolean;
    unknownAttemptCount: number;
    records: AiUsageRecord[];
  }>;
  getContributionMarginReport(
    input?: ContributionMarginCohortInput,
  ): Promise<ContributionMarginResult>;
};

export type InMemoryAiCostService = AiCostService & {
  seedEntitlement(entitlement: { id: string; orderId: string; chartId: string }): void;
};

export function createDatabaseAiCostService(database: Database): AiCostService {
  async function getEffectivePricing(
    providerId: string,
    modelId: string,
    effectiveAt?: Date,
  ): Promise<AiModelPricing | null> {
    const at = effectiveAt ?? new Date();
    const [row] = await database
      .select()
      .from(aiModelPricing)
      .where(
        and(
          eq(aiModelPricing.providerId, providerId),
          eq(aiModelPricing.modelId, modelId),
          eq(aiModelPricing.status, "active"),
          eq(aiModelPricing.currency, "VND"),
          lte(aiModelPricing.effectiveFrom, at),
        ),
      )
      .orderBy(desc(aiModelPricing.effectiveFrom))
      .limit(1);

    if (!row) return null;
    return {
      id: row.id,
      pricingVersion: row.pricingVersion,
      providerId: row.providerId,
      modelId: row.modelId,
      currency: "VND",
      inputPricePerMillion: toSafeInteger(row.inputPricePerMillion, "inputPricePerMillion"),
      outputPricePerMillion: toSafeInteger(row.outputPricePerMillion, "outputPricePerMillion"),
      cachedInputPricePerMillion: toSafeInteger(row.cachedInputPricePerMillion, "cachedInputPricePerMillion"),
      effectiveFrom: row.effectiveFrom,
      source: row.source,
      sourceCurrency: row.sourceCurrency,
      sourceReference: row.sourceReference,
      fxSource: row.fxSource,
      fxRate: toSafeInteger(row.fxRate, "fxRate"),
      fxTimestamp: row.fxTimestamp,
      referenceMetadata: row.referenceMetadata as Record<string, unknown>,
      status: row.status as "active" | "retired" | "pending_approval",
      createdAt: row.createdAt,
    };
  }

  async function savePricing(
    pricing: Omit<AiModelPricing, "id" | "createdAt">,
  ): Promise<AiModelPricing> {
    const [inserted] = await database
      .insert(aiModelPricing)
      .values({
        pricingVersion: pricing.pricingVersion,
        providerId: pricing.providerId,
        modelId: pricing.modelId,
        currency: "VND",
        inputPricePerMillion: BigInt(pricing.inputPricePerMillion),
        outputPricePerMillion: BigInt(pricing.outputPricePerMillion),
        cachedInputPricePerMillion: BigInt(pricing.cachedInputPricePerMillion),
        effectiveFrom: pricing.effectiveFrom,
        source: pricing.source,
        sourceCurrency: pricing.sourceCurrency,
        sourceReference: pricing.sourceReference,
        fxSource: pricing.fxSource,
        fxRate: BigInt(pricing.fxRate),
        fxTimestamp: pricing.fxTimestamp,
        referenceMetadata: pricing.referenceMetadata,
        status: pricing.status,
      })
      .returning();
    if (!inserted) {
      throw new Error("Failed to insert model pricing");
    }

    return {
      id: inserted.id,
      pricingVersion: inserted.pricingVersion,
      providerId: inserted.providerId,
      modelId: inserted.modelId,
      currency: "VND",
      inputPricePerMillion: toSafeInteger(inserted.inputPricePerMillion, "inputPricePerMillion"),
      outputPricePerMillion: toSafeInteger(inserted.outputPricePerMillion, "outputPricePerMillion"),
      cachedInputPricePerMillion: toSafeInteger(inserted.cachedInputPricePerMillion, "cachedInputPricePerMillion"),
      effectiveFrom: inserted.effectiveFrom,
      source: inserted.source,
      sourceCurrency: inserted.sourceCurrency,
      sourceReference: inserted.sourceReference,
      fxSource: inserted.fxSource,
      fxRate: toSafeInteger(inserted.fxRate, "fxRate"),
      fxTimestamp: inserted.fxTimestamp,
      referenceMetadata: inserted.referenceMetadata as Record<string, unknown>,
      status: inserted.status as "active" | "retired" | "pending_approval",
      createdAt: inserted.createdAt,
    };
  }

  const recorder: AiCostRecorder = {
    async beginAttempt(input) {
      const now = new Date();
      const pricing = await getEffectivePricing(input.providerId, input.requestedModelId, now);
      if (!pricing && input.purpose !== "synthetic_probe") {
        return {
          ok: false,
          error: {
            code: "AI_PROVIDER_NOT_APPROVED",
            retryable: false,
            message: `No approved VND pricing configured for ${input.providerId}:${input.requestedModelId}`,
          },
        };
      }

      const activePricing: AiModelPricing = pricing ?? {
        pricingVersion: "synthetic-probe",
        providerId: input.providerId,
        modelId: input.requestedModelId,
        currency: "VND",
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        cachedInputPricePerMillion: 0,
        effectiveFrom: now,
        source: "synthetic_probe_harness",
        sourceCurrency: "VND",
        sourceReference: "synthetic_probe_harness",
        fxSource: "identity",
        fxRate: 1,
        fxTimestamp: now,
        referenceMetadata: {},
        status: "active",
      };

      let orderId = input.costContext?.orderId ?? null;
      let chartId = input.costContext?.chartId ?? null;

      if (input.costContext?.entitlementId && (!orderId || !chartId)) {
        try {
          const [entitlement] = await database
            .select({
              orderId: commerceEntitlements.orderId,
              chartId: commerceEntitlements.chartId,
            })
            .from(commerceEntitlements)
            .where(eq(commerceEntitlements.id, input.costContext.entitlementId))
            .limit(1);

          if (!entitlement) {
            return {
              ok: false,
              error: {
                code: "AI_COST_RECORDING_FAILED",
                retryable: false,
                message: `Entitlement ${input.costContext.entitlementId} not found`,
              },
            };
          }
          if (!orderId) orderId = entitlement.orderId;
          if (!chartId) chartId = entitlement.chartId;
        } catch (error) {
          return {
            ok: false,
            error: {
              code: "AI_COST_RECORDING_FAILED",
              retryable: true,
              message: error instanceof Error ? error.message : String(error),
            },
          };
        }
      }

      try {
        const [inserted] = await database
          .insert(aiCallAttempts)
          .values({
            callId: input.callId,
            attemptNumber: input.attemptNumber,
            idempotencyKey: input.idempotencyKey ?? null,
            purpose: input.purpose,
            providerId: input.providerId,
            requestedModelId: input.requestedModelId,
            reportId: input.costContext?.reportId ?? null,
            reportVersionId: input.costContext?.reportVersionId ?? null,
            orderId,
            entitlementId: input.costContext?.entitlementId ?? null,
            chartId,
            chartVersionId: input.costContext?.chartVersionId ?? null,
            sku: input.costContext?.sku ?? null,
            maxOutputTokens: input.maxOutputTokens,
            pricingVersion: activePricing.pricingVersion,
            inputPricePerMillion: BigInt(activePricing.inputPricePerMillion),
            outputPricePerMillion: BigInt(activePricing.outputPricePerMillion),
            cachedInputPricePerMillion: BigInt(activePricing.cachedInputPricePerMillion),
            currency: "VND",
            sourceCurrency: activePricing.sourceCurrency,
            sourceReference: activePricing.sourceReference,
            fxSource: activePricing.fxSource,
            fxRate: BigInt(activePricing.fxRate),
            fxTimestamp: activePricing.fxTimestamp,
            pricingSource: activePricing.source,
          })
          .returning();

        if (!inserted) {
          return {
            ok: false,
            error: {
              code: "AI_COST_RECORDING_FAILED",
              retryable: true,
              message: "Failed to insert attempt row",
            },
          };
        }

        return {
          ok: true,
          value: {
            attemptId: inserted.id,
            pricing: activePricing,
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "AI_COST_RECORDING_FAILED",
            retryable: true,
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    async completeAttempt(input) {
      let attemptRow;
      try {
        const [row] = await database
          .select()
          .from(aiCallAttempts)
          .where(eq(aiCallAttempts.id, input.attemptId))
          .limit(1);
        attemptRow = row;
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "AI_COST_RECORDING_FAILED",
            retryable: true,
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }

      if (!attemptRow) {
        return {
          ok: false,
          error: {
            code: "AI_COST_RECORDING_FAILED",
            retryable: false,
            message: `Attempt ${input.attemptId} not found`,
          },
        };
      }

      const isUnknown =
        input.tokensUnknown === true ||
        input.inputTokens === undefined ||
        input.outputTokens === undefined;

      const costStatus: "resolved" | "unknown" = isUnknown ? "unknown" : "resolved";

      let inputTokens: number | null = null;
      let outputTokens: number | null = null;
      let cachedTokens: number | null = null;
      let totalTokens: number | null = null;
      let costMicroBigInt: bigint | null = null;
      let costVnd: number | null = null;

      if (!isUnknown) {
        inputTokens = input.inputTokens!;
        outputTokens = input.outputTokens!;
        cachedTokens = Math.min(input.cachedTokens ?? 0, inputTokens);
        totalTokens = Math.max(
          input.totalTokens ?? inputTokens + outputTokens,
          inputTokens,
          outputTokens,
        );
        costMicroBigInt = calculateTokenCostMicroVnd({
          inputTokens,
          outputTokens,
          cachedTokens,
          inputPricePerMillion: attemptRow.inputPricePerMillion,
          outputPricePerMillion: attemptRow.outputPricePerMillion,
          cachedInputPricePerMillion: attemptRow.cachedInputPricePerMillion,
        });
        costVnd =
          costMicroBigInt === 0n
            ? 0
            : toSafeInteger((costMicroBigInt + 999_999n) / 1_000_000n, "costVnd");
      }

      try {
        const [inserted] = await database
          .insert(aiUsageOutcomes)
          .values({
            attemptId: input.attemptId,
            responseModelId: input.responseModelId ?? null,
            httpStatus: input.httpStatus ?? null,
            errorCode: input.errorCode ?? null,
            inputTokens,
            outputTokens,
            cachedTokens,
            totalTokens,
            tokensUnknown: isUnknown,
            costMicroVnd: costMicroBigInt,
            costVnd,
            costStatus,
          })
          .returning();

        if (!inserted) {
          return {
            ok: false,
            error: {
              code: "AI_COST_RECORDING_FAILED",
              retryable: true,
              message: "Failed to insert outcome row",
            },
          };
        }

        return {
          ok: true,
          value: {
            outcomeId: inserted.id,
            costMicroVnd: costMicroBigInt !== null ? costMicroBigInt.toString() : undefined,
            costVnd: costVnd ?? undefined,
            costStatus,
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "AI_COST_RECORDING_FAILED",
            retryable: true,
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };

  async function getAiCogsSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<AiCogsSummary> {
    const conditions = [ne(aiCallAttempts.purpose, "synthetic_probe")];
    if (filters?.startDate) conditions.push(gte(aiCallAttempts.startedAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(aiCallAttempts.startedAt, filters.endDate));

    const rows = await database
      .select({
        attempt: aiCallAttempts,
        outcome: aiUsageOutcomes,
      })
      .from(aiCallAttempts)
      .leftJoin(aiUsageOutcomes, eq(aiCallAttempts.id, aiUsageOutcomes.attemptId))
      .where(and(...conditions));

    let tier1Micro = 0n;
    let tier2Micro = 0n;
    let previewMicro = 0n;
    let otherMicro = 0n;
    let totalMicro = 0n;
    let totalBillableTokens = 0;
    let resolvedCount = 0;
    let unknownCount = 0;

    for (const { attempt, outcome } of rows) {
      if (
        outcome &&
        outcome.costStatus === "resolved" &&
        outcome.costMicroVnd !== null &&
        !outcome.tokensUnknown
      ) {
        resolvedCount += 1;
        const micro = outcome.costMicroVnd;
        totalMicro += micro;
        totalBillableTokens += outcome.totalTokens ?? 0;

        if (attempt.purpose === "free_preview") {
          previewMicro += micro;
        } else if (attempt.sku === "ZIWEI-NATAL-EXCERPT-P0") {
          tier1Micro += micro;
        } else if (attempt.sku === "ZIWEI-IDENTITY-P0") {
          tier2Micro += micro;
        } else {
          otherMicro += micro;
        }
      } else {
        unknownCount += 1;
      }
    }

    const roundMicroToVnd = (m: bigint, label: string) =>
      m === 0n ? 0 : toSafeInteger((m + 999_999n) / 1_000_000n, label);

    return {
      tier1ReportCogsVnd: roundMicroToVnd(tier1Micro, "tier1ReportCogsVnd"),
      tier2ReportCogsVnd: roundMicroToVnd(tier2Micro, "tier2ReportCogsVnd"),
      freePreviewCogsVnd: roundMicroToVnd(previewMicro, "freePreviewCogsVnd"),
      otherCogsVnd: roundMicroToVnd(otherMicro, "otherCogsVnd"),
      totalCogsVnd: roundMicroToVnd(totalMicro, "totalCogsVnd"),
      totalCogsMicroVnd: totalMicro.toString(),
      totalBillableTokens,
      totalAttempts: rows.length,
      resolvedAttemptCount: resolvedCount,
      unknownAttemptCount: unknownCount,
      hasIncompleteAttempts: unknownCount > 0,
    };
  }

  async function getAiCogsPerReport(reportId: string) {
    const rows = await database
      .select({
        attempt: aiCallAttempts,
        outcome: aiUsageOutcomes,
      })
      .from(aiCallAttempts)
      .leftJoin(aiUsageOutcomes, eq(aiCallAttempts.id, aiUsageOutcomes.attemptId))
      .where(
        and(
          eq(aiCallAttempts.reportId, reportId),
          ne(aiCallAttempts.purpose, "synthetic_probe"),
        ),
      );

    let totalMicro = 0n;
    let totalBillableTokens = 0;
    let unknownCount = 0;
    const records: AiUsageRecord[] = [];

    for (const { attempt, outcome } of rows) {
      if (
        outcome &&
        outcome.costStatus === "resolved" &&
        outcome.costMicroVnd !== null &&
        !outcome.tokensUnknown
      ) {
        totalMicro += outcome.costMicroVnd;
        totalBillableTokens += outcome.totalTokens ?? 0;
      } else {
        unknownCount += 1;
      }

      records.push({
        id: outcome?.id ?? attempt.id,
        callId: attempt.callId,
        idempotencyKey: attempt.idempotencyKey,
        attemptNumber: attempt.attemptNumber,
        purpose: attempt.purpose as AiRequestPurpose,
        providerId: attempt.providerId,
        modelId: attempt.requestedModelId,
        responseModelId: outcome?.responseModelId,
        reportId: attempt.reportId,
        reportVersionId: attempt.reportVersionId,
        orderId: attempt.orderId,
        entitlementId: attempt.entitlementId,
        chartId: attempt.chartId,
        chartVersionId: attempt.chartVersionId,
        sku: attempt.sku,
        inputTokens: outcome?.inputTokens,
        outputTokens: outcome?.outputTokens,
        cachedTokens: outcome?.cachedTokens,
        totalTokens: outcome?.totalTokens,
        tokensUnknown: outcome?.tokensUnknown ?? true,
        httpStatus: outcome?.httpStatus,
        errorCode: outcome?.errorCode,
        pricingVersion: attempt.pricingVersion,
        inputPricePerMillion: toSafeInteger(attempt.inputPricePerMillion, "inputPricePerMillion"),
        outputPricePerMillion: toSafeInteger(attempt.outputPricePerMillion, "outputPricePerMillion"),
        cachedInputPricePerMillion: toSafeInteger(attempt.cachedInputPricePerMillion, "cachedInputPricePerMillion"),
        currency: "VND",
        costMicroVnd:
          outcome?.costMicroVnd !== null && outcome?.costMicroVnd !== undefined
            ? outcome.costMicroVnd.toString()
            : undefined,
        costVnd: outcome?.costVnd ?? undefined,
        costStatus: (outcome?.costStatus as "resolved" | "unknown") ?? "unknown",
        startedAt: attempt.startedAt,
        completedAt: outcome?.completedAt ?? null,
      });
    }

    const totalCostVnd =
      totalMicro === 0n ? 0 : toSafeInteger((totalMicro + 999_999n) / 1_000_000n, "totalCostVnd");
    return {
      totalCostVnd,
      totalCostMicroVnd: totalMicro.toString(),
      totalBillableTokens,
      hasIncompleteAttempts: unknownCount > 0,
      unknownAttemptCount: unknownCount,
      records,
    };
  }

  async function getAiCogsPerChart(chartId: string) {
    const rows = await database
      .select({
        attempt: aiCallAttempts,
        outcome: aiUsageOutcomes,
      })
      .from(aiCallAttempts)
      .leftJoin(aiUsageOutcomes, eq(aiCallAttempts.id, aiUsageOutcomes.attemptId))
      .where(
        and(
          eq(aiCallAttempts.chartId, chartId),
          ne(aiCallAttempts.purpose, "synthetic_probe"),
        ),
      );

    let totalMicro = 0n;
    let freePreviewMicro = 0n;
    let reportMicro = 0n;
    let totalBillableTokens = 0;
    let unknownCount = 0;
    const records: AiUsageRecord[] = [];

    for (const { attempt, outcome } of rows) {
      if (
        outcome &&
        outcome.costStatus === "resolved" &&
        outcome.costMicroVnd !== null &&
        !outcome.tokensUnknown
      ) {
        const micro = outcome.costMicroVnd;
        totalMicro += micro;
        totalBillableTokens += outcome.totalTokens ?? 0;
        if (attempt.purpose === "free_preview") {
          freePreviewMicro += micro;
        } else {
          reportMicro += micro;
        }
      } else {
        unknownCount += 1;
      }

      records.push({
        id: outcome?.id ?? attempt.id,
        callId: attempt.callId,
        idempotencyKey: attempt.idempotencyKey,
        attemptNumber: attempt.attemptNumber,
        purpose: attempt.purpose as AiRequestPurpose,
        providerId: attempt.providerId,
        modelId: attempt.requestedModelId,
        responseModelId: outcome?.responseModelId,
        reportId: attempt.reportId,
        reportVersionId: attempt.reportVersionId,
        orderId: attempt.orderId,
        entitlementId: attempt.entitlementId,
        chartId: attempt.chartId,
        chartVersionId: attempt.chartVersionId,
        sku: attempt.sku,
        inputTokens: outcome?.inputTokens,
        outputTokens: outcome?.outputTokens,
        cachedTokens: outcome?.cachedTokens,
        totalTokens: outcome?.totalTokens,
        tokensUnknown: outcome?.tokensUnknown ?? true,
        httpStatus: outcome?.httpStatus,
        errorCode: outcome?.errorCode,
        pricingVersion: attempt.pricingVersion,
        inputPricePerMillion: toSafeInteger(attempt.inputPricePerMillion, "inputPricePerMillion"),
        outputPricePerMillion: toSafeInteger(attempt.outputPricePerMillion, "outputPricePerMillion"),
        cachedInputPricePerMillion: toSafeInteger(attempt.cachedInputPricePerMillion, "cachedInputPricePerMillion"),
        currency: "VND",
        costMicroVnd:
          outcome?.costMicroVnd !== null && outcome?.costMicroVnd !== undefined
            ? outcome.costMicroVnd.toString()
            : undefined,
        costVnd: outcome?.costVnd ?? undefined,
        costStatus: (outcome?.costStatus as "resolved" | "unknown") ?? "unknown",
        startedAt: attempt.startedAt,
        completedAt: outcome?.completedAt ?? null,
      });
    }

    const roundMicro = (m: bigint, label: string) =>
      m === 0n ? 0 : toSafeInteger((m + 999_999n) / 1_000_000n, label);

    return {
      totalCostVnd: roundMicro(totalMicro, "totalCostVnd"),
      totalCostMicroVnd: totalMicro.toString(),
      freePreviewCostVnd: roundMicro(freePreviewMicro, "freePreviewCostVnd"),
      reportCostVnd: roundMicro(reportMicro, "reportCostVnd"),
      totalBillableTokens,
      hasIncompleteAttempts: unknownCount > 0,
      unknownAttemptCount: unknownCount,
      records,
    };
  }

  async function getContributionMarginReport(
    input?: ContributionMarginCohortInput,
  ): Promise<ContributionMarginResult> {
    const periodEnd = input?.asOfDate ?? input?.endDate ?? new Date();
    const periodStart =
      input?.startDate ?? new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cogsSummary = await getAiCogsSummary({
      startDate: periodStart,
      endDate: periodEnd,
    });
    return {
      status: "unavailable",
      reason: "LA_LEDGER_SOURCE_MISSING",
      message: "Recognized revenue from purchased Lá spend is unavailable until WP-10A ledger source exists",
      periodStart,
      periodEnd,
      cogs: cogsSummary,
    };
  }

  return {
    recorder,
    getEffectivePricing,
    savePricing,
    getAiCogsSummary,
    getAiCogsPerReport,
    getAiCogsPerChart,
    getContributionMarginReport,
  };
}

export function createInMemoryAiCostService(): InMemoryAiCostService {
  const pricingList: AiModelPricing[] = [];
  const attemptList: Array<
    BeginAttemptInput & {
      id: string;
      pricing: AiModelPricing;
      startedAt: Date;
      orderId?: string | null;
      chartId?: string | null;
    }
  > = [];
  const outcomeList: Array<
    CompleteAttemptInput & {
      id: string;
      costMicroVnd?: string;
      costVnd?: number;
      costStatus: "resolved" | "unknown";
      completedAt: Date;
    }
  > = [];
  const entitlementList: Array<{ id: string; orderId: string; chartId: string }> = [];

  async function getEffectivePricing(
    providerId: string,
    modelId: string,
    effectiveAt?: Date,
  ): Promise<AiModelPricing | null> {
    const at = effectiveAt ?? new Date();
    const matches = pricingList
      .filter(
        (p) =>
          p.providerId === providerId &&
          p.modelId === modelId &&
          p.status === "active" &&
          p.currency === "VND" &&
          p.effectiveFrom <= at,
      )
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
    return matches[0] ?? null;
  }

  return {
    async getEffectivePricing(providerId, modelId, effectiveAt) {
      return getEffectivePricing(providerId, modelId, effectiveAt);
    },

    async savePricing(pricing) {
      const record: AiModelPricing = {
        ...pricing,
        id: randomUUID(),
        currency: "VND",
        createdAt: new Date(),
      };
      pricingList.push(record);
      return record;
    },

    recorder: {
      async beginAttempt(input) {
        const now = new Date();
        const pricing = await getEffectivePricing(input.providerId, input.requestedModelId, now);
        if (!pricing && input.purpose !== "synthetic_probe") {
          return {
            ok: false,
            error: {
              code: "AI_PROVIDER_NOT_APPROVED",
              retryable: false,
              message: `No approved VND pricing configured for ${input.providerId}:${input.requestedModelId}`,
            },
          };
        }

        const activePricing: AiModelPricing = pricing ?? {
          pricingVersion: "synthetic-probe",
          providerId: input.providerId,
          modelId: input.requestedModelId,
          currency: "VND",
          inputPricePerMillion: 0,
          outputPricePerMillion: 0,
          cachedInputPricePerMillion: 0,
          effectiveFrom: now,
          source: "synthetic_probe_harness",
          sourceCurrency: "VND",
          sourceReference: "synthetic_probe_harness",
          fxSource: "identity",
          fxRate: 1,
          fxTimestamp: now,
          referenceMetadata: {},
          status: "active",
        };

        let orderId = input.costContext?.orderId ?? null;
        let chartId = input.costContext?.chartId ?? null;

        if (input.costContext?.entitlementId && (!orderId || !chartId)) {
          const match = entitlementList.find((e) => e.id === input.costContext?.entitlementId);
          if (!match) {
            return {
              ok: false,
              error: {
                code: "AI_COST_RECORDING_FAILED",
                retryable: false,
                message: `Entitlement ${input.costContext.entitlementId} not found`,
              },
            };
          }
          if (!orderId) orderId = match.orderId;
          if (!chartId) chartId = match.chartId;
        }

        const attemptId = randomUUID();
        attemptList.push({
          ...input,
          id: attemptId,
          pricing: activePricing,
          startedAt: now,
          orderId,
          chartId,
        });

        return {
          ok: true,
          value: {
            attemptId,
            pricing: activePricing,
          },
        };
      },

      async completeAttempt(input) {
        const attempt = attemptList.find((a) => a.id === input.attemptId);
        if (!attempt) {
          return {
            ok: false,
            error: {
              code: "AI_COST_RECORDING_FAILED",
              retryable: false,
              message: `Attempt ${input.attemptId} not found`,
            },
          };
        }

        const isUnknown =
          input.tokensUnknown === true ||
          input.inputTokens === undefined ||
          input.outputTokens === undefined;

        const costStatus: "resolved" | "unknown" = isUnknown ? "unknown" : "resolved";

        let costMicroBigInt: bigint | null = null;
        let costVnd: number | null = null;

        if (!isUnknown) {
          const inputTokens = input.inputTokens!;
          const outputTokens = input.outputTokens!;
          const cachedTokens = Math.min(input.cachedTokens ?? 0, inputTokens);
          costMicroBigInt = calculateTokenCostMicroVnd({
            inputTokens,
            outputTokens,
            cachedTokens,
            inputPricePerMillion: attempt.pricing.inputPricePerMillion,
            outputPricePerMillion: attempt.pricing.outputPricePerMillion,
            cachedInputPricePerMillion: attempt.pricing.cachedInputPricePerMillion,
          });
          costVnd =
            costMicroBigInt === 0n
              ? 0
              : toSafeInteger((costMicroBigInt + 999_999n) / 1_000_000n, "costVnd");
        }

        const outcomeId = randomUUID();
        outcomeList.push({
          ...input,
          id: outcomeId,
          costMicroVnd: costMicroBigInt !== null ? costMicroBigInt.toString() : undefined,
          costVnd: costVnd ?? undefined,
          costStatus,
          completedAt: new Date(),
        });

        return {
          ok: true,
          value: {
            outcomeId,
            costMicroVnd: costMicroBigInt !== null ? costMicroBigInt.toString() : undefined,
            costVnd: costVnd ?? undefined,
            costStatus,
          },
        };
      },
    },

    async getAiCogsSummary(filters) {
      let tier1Micro = 0n;
      let tier2Micro = 0n;
      let previewMicro = 0n;
      let otherMicro = 0n;
      let totalMicro = 0n;
      let totalBillableTokens = 0;
      let resolvedCount = 0;
      let unknownCount = 0;

      const attempts = attemptList.filter((a) => {
        if (a.purpose === "synthetic_probe") return false;
        if (filters?.startDate && a.startedAt < filters.startDate) return false;
        if (filters?.endDate && a.startedAt > filters.endDate) return false;
        return true;
      });

      for (const attempt of attempts) {
        const outcome = outcomeList.find((o) => o.attemptId === attempt.id);
        if (
          outcome &&
          outcome.costStatus === "resolved" &&
          outcome.costMicroVnd !== undefined &&
          !outcome.tokensUnknown
        ) {
          resolvedCount += 1;
          const micro = BigInt(outcome.costMicroVnd);
          totalMicro += micro;
          totalBillableTokens += outcome.totalTokens ?? 0;

          if (attempt.purpose === "free_preview") {
            previewMicro += micro;
          } else if (attempt.costContext?.sku === "ZIWEI-NATAL-EXCERPT-P0") {
            tier1Micro += micro;
          } else if (attempt.costContext?.sku === "ZIWEI-IDENTITY-P0") {
            tier2Micro += micro;
          } else {
            otherMicro += micro;
          }
        } else {
          unknownCount += 1;
        }
      }

      const roundMicro = (m: bigint, label: string) =>
        m === 0n ? 0 : toSafeInteger((m + 999_999n) / 1_000_000n, label);

      return {
        tier1ReportCogsVnd: roundMicro(tier1Micro, "tier1ReportCogsVnd"),
        tier2ReportCogsVnd: roundMicro(tier2Micro, "tier2ReportCogsVnd"),
        freePreviewCogsVnd: roundMicro(previewMicro, "freePreviewCogsVnd"),
        otherCogsVnd: roundMicro(otherMicro, "otherCogsVnd"),
        totalCogsVnd: roundMicro(totalMicro, "totalCogsVnd"),
        totalCogsMicroVnd: totalMicro.toString(),
        totalBillableTokens,
        totalAttempts: attempts.length,
        resolvedAttemptCount: resolvedCount,
        unknownAttemptCount: unknownCount,
        hasIncompleteAttempts: unknownCount > 0,
      };
    },

    async getAiCogsPerReport(reportId) {
      const attempts = attemptList.filter(
        (a) => a.costContext?.reportId === reportId && a.purpose !== "synthetic_probe",
      );
      let totalMicro = 0n;
      let totalBillableTokens = 0;
      let unknownCount = 0;
      const records: AiUsageRecord[] = [];

      for (const a of attempts) {
        const outcome = outcomeList.find((o) => o.attemptId === a.id);
        if (outcome && outcome.costStatus === "resolved" && outcome.costMicroVnd !== undefined) {
          totalMicro += BigInt(outcome.costMicroVnd);
          totalBillableTokens += outcome.totalTokens ?? 0;
        } else {
          unknownCount += 1;
        }

        records.push({
          id: outcome?.id ?? a.id,
          callId: a.callId,
          idempotencyKey: a.idempotencyKey,
          attemptNumber: a.attemptNumber,
          purpose: a.purpose,
          providerId: a.providerId,
          modelId: a.requestedModelId,
          responseModelId: outcome?.responseModelId,
          reportId: a.costContext?.reportId,
          reportVersionId: a.costContext?.reportVersionId,
          orderId: a.orderId,
          entitlementId: a.costContext?.entitlementId,
          chartId: a.chartId,
          chartVersionId: a.costContext?.chartVersionId,
          sku: a.costContext?.sku,
          inputTokens: outcome?.inputTokens,
          outputTokens: outcome?.outputTokens,
          cachedTokens: outcome?.cachedTokens,
          totalTokens: outcome?.totalTokens,
          tokensUnknown: outcome?.tokensUnknown ?? true,
          httpStatus: outcome?.httpStatus,
          errorCode: outcome?.errorCode,
          pricingVersion: a.pricing.pricingVersion,
          inputPricePerMillion: toSafeInteger(a.pricing.inputPricePerMillion, "inputPricePerMillion"),
          outputPricePerMillion: toSafeInteger(a.pricing.outputPricePerMillion, "outputPricePerMillion"),
          cachedInputPricePerMillion: toSafeInteger(a.pricing.cachedInputPricePerMillion, "cachedInputPricePerMillion"),
          currency: "VND",
          costMicroVnd: outcome?.costMicroVnd,
          costVnd: outcome?.costVnd,
          costStatus: outcome?.costStatus ?? "unknown",
          startedAt: a.startedAt,
          completedAt: outcome?.completedAt ?? null,
        });
      }

      const totalCostVnd =
        totalMicro === 0n ? 0 : toSafeInteger((totalMicro + 999_999n) / 1_000_000n, "totalCostVnd");
      return {
        totalCostVnd,
        totalCostMicroVnd: totalMicro.toString(),
        totalBillableTokens,
        hasIncompleteAttempts: unknownCount > 0,
        unknownAttemptCount: unknownCount,
        records,
      };
    },

    async getAiCogsPerChart(chartId) {
      const attempts = attemptList.filter(
        (a) => a.chartId === chartId && a.purpose !== "synthetic_probe",
      );
      let totalMicro = 0n;
      let freePreviewMicro = 0n;
      let reportMicro = 0n;
      let totalBillableTokens = 0;
      let unknownCount = 0;
      const records: AiUsageRecord[] = [];

      for (const a of attempts) {
        const outcome = outcomeList.find((o) => o.attemptId === a.id);
        if (outcome && outcome.costStatus === "resolved" && outcome.costMicroVnd !== undefined) {
          const micro = BigInt(outcome.costMicroVnd);
          totalMicro += micro;
          totalBillableTokens += outcome.totalTokens ?? 0;
          if (a.purpose === "free_preview") {
            freePreviewMicro += micro;
          } else {
            reportMicro += micro;
          }
        } else {
          unknownCount += 1;
        }

        records.push({
          id: outcome?.id ?? a.id,
          callId: a.callId,
          idempotencyKey: a.idempotencyKey,
          attemptNumber: a.attemptNumber,
          purpose: a.purpose,
          providerId: a.providerId,
          modelId: a.requestedModelId,
          responseModelId: outcome?.responseModelId,
          reportId: a.costContext?.reportId,
          reportVersionId: a.costContext?.reportVersionId,
          orderId: a.orderId,
          entitlementId: a.costContext?.entitlementId,
          chartId: a.chartId,
          chartVersionId: a.costContext?.chartVersionId,
          sku: a.costContext?.sku,
          inputTokens: outcome?.inputTokens,
          outputTokens: outcome?.outputTokens,
          cachedTokens: outcome?.cachedTokens,
          totalTokens: outcome?.totalTokens,
          tokensUnknown: outcome?.tokensUnknown ?? true,
          httpStatus: outcome?.httpStatus,
          errorCode: outcome?.errorCode,
          pricingVersion: a.pricing.pricingVersion,
          inputPricePerMillion: toSafeInteger(a.pricing.inputPricePerMillion, "inputPricePerMillion"),
          outputPricePerMillion: toSafeInteger(a.pricing.outputPricePerMillion, "outputPricePerMillion"),
          cachedInputPricePerMillion: toSafeInteger(a.pricing.cachedInputPricePerMillion, "cachedInputPricePerMillion"),
          currency: "VND",
          costMicroVnd: outcome?.costMicroVnd,
          costVnd: outcome?.costVnd,
          costStatus: outcome?.costStatus ?? "unknown",
          startedAt: a.startedAt,
          completedAt: outcome?.completedAt ?? null,
        });
      }

      const roundMicro = (m: bigint, label: string) =>
        m === 0n ? 0 : toSafeInteger((m + 999_999n) / 1_000_000n, label);

      return {
        totalCostVnd: roundMicro(totalMicro, "totalCostVnd"),
        totalCostMicroVnd: totalMicro.toString(),
        freePreviewCostVnd: roundMicro(freePreviewMicro, "freePreviewCostVnd"),
        reportCostVnd: roundMicro(reportMicro, "reportCostVnd"),
        totalBillableTokens,
        hasIncompleteAttempts: unknownCount > 0,
        unknownAttemptCount: unknownCount,
        records,
      };
    },

    async getContributionMarginReport(input) {
      const periodEnd = input?.asOfDate ?? input?.endDate ?? new Date();
      const periodStart =
        input?.startDate ?? new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
      const cogsSummary = await this.getAiCogsSummary({
        startDate: periodStart,
        endDate: periodEnd,
      });
      return {
        status: "unavailable",
        reason: "LA_LEDGER_SOURCE_MISSING",
        message: "Recognized revenue from purchased Lá spend is unavailable until WP-10A ledger source exists",
        periodStart,
        periodEnd,
        cogs: cogsSummary,
      };
    },

    seedEntitlement(entitlement) {
      entitlementList.push(entitlement);
    },
  };
}

export function calculateContributionMargin(
  revenue: AuthoritativeRevenueSnapshot,
  cogs: AiCogsSummary,
  paymentFeesVnd = 0,
): ContributionMarginResult {
  if (cogs.hasIncompleteAttempts) {
    return {
      status: "unavailable",
      reason: "AI_COGS_INCOMPLETE",
      message: `AI COGS has ${cogs.unknownAttemptCount} incomplete attempts in cohort window`,
      periodStart: revenue.periodStart,
      periodEnd: revenue.periodEnd,
      cogs,
    };
  }

  const recognizedRevenueVnd = revenue.recognizedRevenueVnd;
  const aiCogsVnd = cogs.totalCogsVnd;
  const marginVnd = recognizedRevenueVnd - paymentFeesVnd - aiCogsVnd;
  const ratio =
    recognizedRevenueVnd > 0 ? Number((marginVnd / recognizedRevenueVnd).toFixed(4)) : 0;

  return {
    status: "complete",
    periodStart: revenue.periodStart,
    periodEnd: revenue.periodEnd,
    recognizedRevenueVnd,
    aiCogsVnd,
    tier1AiCogsVnd: cogs.tier1ReportCogsVnd,
    tier2AiCogsVnd: cogs.tier2ReportCogsVnd,
    freePreviewAiCogsVnd: cogs.freePreviewCogsVnd,
    otherAiCogsVnd: cogs.otherCogsVnd,
    paymentFeesVnd,
    infrastructureCostVnd: 0,
    supportCostMetricLabel: "contribution margin before support cost",
    contributionMarginBeforeSupportCostVnd: marginVnd,
    contributionMarginRatio: ratio,
    hasIncompleteAttempts: false,
    unknownAttemptCount: 0,
  };
}
