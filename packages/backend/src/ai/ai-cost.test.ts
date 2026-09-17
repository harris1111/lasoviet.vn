import { describe, expect, it } from "vitest";
import {
  calculateContributionMargin,
  calculateTokenCostMicroVnd,
  calculateTokenCostVnd,
  createInMemoryAiCostService,
  toSafeInteger,
} from "./ai-cost.js";
import { AiModelPricingSchema } from "@lasoviet/contracts";

describe("ai-cost service and calculations", () => {
  describe("safe financial conversion and integer arithmetic", () => {
    it("uses deterministic integer arithmetic with ceiling for VND cost without float drift", () => {
      const cost = calculateTokenCostVnd({
        inputTokens: 10_000,
        outputTokens: 500,
        cachedTokens: 0,
        inputPricePerMillion: 15_000,
        outputPricePerMillion: 60_000,
      });
      expect(cost).toBe(180);
      expect(Number.isInteger(cost)).toBe(true);
    });

    it("discounts cached input tokens according to cachedInputPricePerMillion", () => {
      const cost = calculateTokenCostVnd({
        inputTokens: 10_000,
        outputTokens: 1_000,
        cachedTokens: 8_000,
        inputPricePerMillion: 15_000,
        cachedInputPricePerMillion: 3_750,
        outputPricePerMillion: 60_000,
      });
      expect(cost).toBe(120);
    });

    it("calculates exact integer micro-VND to prevent per-call rounding errors", () => {
      const microVnd = calculateTokenCostMicroVnd({
        inputTokens: 10,
        outputTokens: 0,
        inputPricePerMillion: 15_000,
        outputPricePerMillion: 60_000,
      });
      expect(microVnd).toBe(150_000n);

      expect(
        calculateTokenCostMicroVnd({
          inputTokens: 0,
          outputTokens: 0,
          inputPricePerMillion: 15_000,
          outputPricePerMillion: 60_000,
        }),
      ).toBe(0n);
    });

    it("throws RangeError on integer overflow beyond Number.MAX_SAFE_INTEGER to prevent silent precision loss", () => {
      expect(toSafeInteger(100n, "testField")).toBe(100);
      expect(toSafeInteger(BigInt(Number.MAX_SAFE_INTEGER), "testField")).toBe(Number.MAX_SAFE_INTEGER);

      const overflowBigInt = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
      expect(() => toSafeInteger(overflowBigInt, "overflowField")).toThrow(RangeError);

      // calculateTokenCostVnd with astronomical token count throws RangeError
      expect(() =>
        calculateTokenCostVnd({
          inputTokens: 1_000_000_000_000_000,
          outputTokens: 1_000_000_000_000_000,
          inputPricePerMillion: 100_000_000_000,
          outputPricePerMillion: 100_000_000_000,
        }),
      ).toThrow(RangeError);
    });
  });

  describe("explicit pricing and FX evidence", () => {
    it("rejects pricing lacking explicit source currency, reference, or FX evidence", () => {
      const basePricing = {
        pricingVersion: "v1",
        providerId: "9router-an",
        modelId: "qwen-2.5-72b-instruct",
        currency: "VND",
        inputPricePerMillion: 15_000,
        outputPricePerMillion: 60_000,
        cachedInputPricePerMillion: 3_750,
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
        source: "approved_doc",
        sourceCurrency: "VND",
        sourceReference: "kaneo_decision",
        fxSource: "direct_vnd",
        fxRate: 1,
        fxTimestamp: new Date("2026-09-01T00:00:00Z"),
      };

      expect(AiModelPricingSchema.parse(basePricing)).toBeDefined();

      // Missing sourceCurrency
      expect(() => AiModelPricingSchema.parse({ ...basePricing, sourceCurrency: undefined })).toThrow();
      // Missing sourceReference
      expect(() => AiModelPricingSchema.parse({ ...basePricing, sourceReference: undefined })).toThrow();
      // Missing fxSource
      expect(() => AiModelPricingSchema.parse({ ...basePricing, fxSource: undefined })).toThrow();
      // Missing fxRate
      expect(() => AiModelPricingSchema.parse({ ...basePricing, fxRate: undefined })).toThrow();
      // Non-VND currency
      expect(() => AiModelPricingSchema.parse({ ...basePricing, currency: "USD" })).toThrow();
    });
  });

  describe("immutable attempt snapshot authority and regression tests", () => {
    it("aggregates sub-VND calls accurately in micro-VND rather than rounding each call to 1 VND", async () => {
      const costService = createInMemoryAiCostService();

      await costService.savePricing({
        pricingVersion: "v1",
        providerId: "9router-an",
        modelId: "qwen-2.5-72b-instruct",
        currency: "VND",
        inputPricePerMillion: 15_000,
        outputPricePerMillion: 60_000,
        cachedInputPricePerMillion: 3_750,
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
        source: "initial_approved_pricing",
        sourceCurrency: "VND",
        sourceReference: "kaneo_decision",
        fxSource: "direct_vnd",
        fxRate: 1,
        fxTimestamp: new Date("2026-09-01T00:00:00Z"),
        referenceMetadata: {},
        status: "active",
      });

      // Call 1: 10 tokens = 150,000 micro-VND (0.15 VND)
      const begin1 = await costService.recorder.beginAttempt({
        callId: "call-001",
        attemptNumber: 0,
        purpose: "report",
        providerId: "9router-an",
        requestedModelId: "qwen-2.5-72b-instruct",
        maxOutputTokens: 1000,
      });
      expect(begin1.ok).toBe(true);
      if (!begin1.ok) return;

      const comp1 = await costService.recorder.completeAttempt({
        attemptId: begin1.value.attemptId,
        inputTokens: 10,
        outputTokens: 0,
      });
      expect(comp1.ok).toBe(true);
      if (comp1.ok) {
        expect(comp1.value.costMicroVnd).toBe("150000");
        expect(comp1.value.costVnd).toBe(1);
      }

      // Call 2: 10 tokens = 150,000 micro-VND (0.15 VND)
      const begin2 = await costService.recorder.beginAttempt({
        callId: "call-002",
        attemptNumber: 0,
        purpose: "report",
        providerId: "9router-an",
        requestedModelId: "qwen-2.5-72b-instruct",
        maxOutputTokens: 1000,
      });
      expect(begin2.ok).toBe(true);
      if (!begin2.ok) return;

      const comp2 = await costService.recorder.completeAttempt({
        attemptId: begin2.value.attemptId,
        inputTokens: 10,
        outputTokens: 0,
      });
      expect(comp2.ok).toBe(true);

      // Total micro-VND = 300,000 (0.30 VND), total whole VND = 1 (ceil(0.30) = 1, NOT 1 + 1 = 2)
      const summary = await costService.getAiCogsSummary();
      expect(summary.totalCogsMicroVnd).toBe("300000");
      expect(summary.totalCogsVnd).toBe(1);
    });

    it("proves caller cannot alter post-begin pricing and response model alias does not affect billed pricing", async () => {
      const costService = createInMemoryAiCostService();

      // Configure base pricing for qwen-2.5-72b-instruct: 15,000 VND / 1M input, 60,000 output
      await costService.savePricing({
        pricingVersion: "v1-baseline",
        providerId: "9router-an",
        modelId: "qwen-2.5-72b-instruct",
        currency: "VND",
        inputPricePerMillion: 15_000,
        outputPricePerMillion: 60_000,
        cachedInputPricePerMillion: 3_750,
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
        source: "initial_pricing",
        sourceCurrency: "VND",
        sourceReference: "kaneo_decision",
        fxSource: "direct_vnd",
        fxRate: 1,
        fxTimestamp: new Date("2026-09-01T00:00:00Z"),
        referenceMetadata: {},
        status: "active",
      });

      // Configure a different, 10x expensive model
      await costService.savePricing({
        pricingVersion: "v1-expensive",
        providerId: "9router-an",
        modelId: "expensive-model-999",
        currency: "VND",
        inputPricePerMillion: 150_000,
        outputPricePerMillion: 600_000,
        cachedInputPricePerMillion: 37_500,
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
        source: "expensive_pricing",
        sourceCurrency: "VND",
        sourceReference: "kaneo_decision",
        fxSource: "direct_vnd",
        fxRate: 1,
        fxTimestamp: new Date("2026-09-01T00:00:00Z"),
        referenceMetadata: {},
        status: "active",
      });

      const begin = await costService.recorder.beginAttempt({
        callId: "call-authority-check",
        attemptNumber: 0,
        purpose: "report",
        providerId: "9router-an",
        requestedModelId: "qwen-2.5-72b-instruct",
        maxOutputTokens: 2000,
      });
      expect(begin.ok).toBe(true);
      if (!begin.ok) return;

      // Caller passes responseModelId alias matching the expensive model
      // completeAttempt does NOT accept pricing and must load from attempt snapshot
      const comp = await costService.recorder.completeAttempt({
        attemptId: begin.value.attemptId,
        responseModelId: "expensive-model-999",
        inputTokens: 10_000,
        outputTokens: 1_000,
      });
      expect(comp.ok).toBe(true);
      if (comp.ok) {
        // Billed cost must strictly match requestedModel rates (15,000 input + 60,000 output = 210 VND)
        // NOT the 10x expensive model rates (which would be 2,100 VND)
        expect(comp.value.costVnd).toBe(210);
      }
    });

    it("strictly isolates cost records and never stores prompt or response text", async () => {
      const costService = createInMemoryAiCostService();
      await costService.savePricing({
        pricingVersion: "v1",
        providerId: "9router-an",
        modelId: "qwen-2.5-72b-instruct",
        currency: "VND",
        inputPricePerMillion: 15_000,
        outputPricePerMillion: 60_000,
        cachedInputPricePerMillion: 3_750,
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
        source: "baseline",
        sourceCurrency: "VND",
        sourceReference: "kaneo_decision",
        fxSource: "direct_vnd",
        fxRate: 1,
        fxTimestamp: new Date("2026-09-01T00:00:00Z"),
        referenceMetadata: {},
        status: "active",
      });

      const begin = await costService.recorder.beginAttempt({
        callId: "call-privacy-check",
        attemptNumber: 0,
        purpose: "report",
        providerId: "9router-an",
        requestedModelId: "qwen-2.5-72b-instruct",
        maxOutputTokens: 1000,
        costContext: {
          reportId: "a0000000-0000-4000-8000-000000000001",
        },
      });
      expect(begin.ok).toBe(true);
      if (!begin.ok) return;

      await costService.recorder.completeAttempt({
        attemptId: begin.value.attemptId,
        inputTokens: 500,
        outputTokens: 200,
      });

      const report = await costService.getAiCogsPerReport("a0000000-0000-4000-8000-000000000001");
      expect(report.records).toHaveLength(1);
      const record = report.records[0] as Record<string, unknown>;

      expect(record).not.toHaveProperty("prompt");
      expect(record).not.toHaveProperty("response");
      expect(record).not.toHaveProperty("content");
      expect(record).not.toHaveProperty("text");
      expect(record).not.toHaveProperty("system");
      expect(record).not.toHaveProperty("user");
    });

    it("records bounded invalid-output diagnostics and rejects invalid diagnostic relations", async () => {
      const costService = createInMemoryAiCostService();
      await costService.savePricing({
        pricingVersion: "v1-invalid-output-diagnostic",
        providerId: "9router-an",
        modelId: "synthetic-model",
        currency: "VND",
        inputPricePerMillion: 15_000,
        outputPricePerMillion: 60_000,
        cachedInputPricePerMillion: 3_750,
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
        source: "test",
        sourceCurrency: "VND",
        sourceReference: "test",
        fxSource: "direct_vnd",
        fxRate: 1,
        fxTimestamp: new Date("2026-09-01T00:00:00Z"),
        referenceMetadata: {},
        status: "active",
      });
      const begin = await costService.recorder.beginAttempt({
        callId: "call-invalid-output-diagnostic",
        attemptNumber: 0,
        purpose: "report",
        providerId: "9router-an",
        requestedModelId: "synthetic-model",
        maxOutputTokens: 100,
        costContext: {
          reportId: "a0000000-0000-4000-8000-000000000002",
        },
      });
      expect(begin.ok).toBe(true);
      if (!begin.ok) return;

      await expect(
        costService.recorder.completeAttempt({
          attemptId: begin.value.attemptId,
          errorCode: "AI_OUTPUT_INVALID",
          invalidOutputReason: "json_object_malformed",
          tokensUnknown: true,
        }),
      ).resolves.toMatchObject({ ok: true });
      const report = await costService.getAiCogsPerReport(
        "a0000000-0000-4000-8000-000000000002",
      );
      expect(report.records).toHaveLength(1);
      expect(report.records[0]).toMatchObject({
        errorCode: "AI_OUTPUT_INVALID",
      });

      const invalidReason = await costService.recorder.completeAttempt({
        attemptId: begin.value.attemptId,
        errorCode: "AI_TIMEOUT",
        invalidOutputReason: "json_object_malformed",
        tokensUnknown: true,
      });
      expect(invalidReason).toMatchObject({
        ok: false,
        error: { code: "AI_COST_RECORDING_FAILED", retryable: false },
      });

      const missingReason = await costService.recorder.completeAttempt({
        attemptId: begin.value.attemptId,
        errorCode: "AI_OUTPUT_INVALID",
        tokensUnknown: true,
      });
      expect(missingReason).toMatchObject({
        ok: false,
        error: { code: "AI_COST_RECORDING_FAILED", retryable: false },
      });

      const serialized = JSON.stringify(report.records);
      expect(serialized).not.toContain("prompt");
      expect(serialized).not.toContain("response");
      expect(serialized).not.toContain("content");
    });

    it("fails closed on beginAttempt when pricing is missing for production requests", async () => {
      const costService = createInMemoryAiCostService();
      const res = await costService.recorder.beginAttempt({
        callId: "call-no-pricing",
        attemptNumber: 0,
        purpose: "report",
        providerId: "unknown-provider",
        requestedModelId: "unapproved-model",
        maxOutputTokens: 1000,
      });
      expect(res).toMatchObject({
        ok: false,
        error: { code: "AI_PROVIDER_NOT_APPROVED", retryable: false },
      });
    });

    it("resolves orderId and chartId from entitlement when entitlementId is provided and chartId omitted", async () => {
      const costService = createInMemoryAiCostService();
      costService.seedEntitlement({
        id: "ent-1",
        orderId: "order-123",
        chartId: "chart-xyz",
      });
      await costService.savePricing({
        pricingVersion: "v1",
        providerId: "9router-an",
        modelId: "qwen-2.5-72b-instruct",
        currency: "VND",
        inputPricePerMillion: 15_000,
        outputPricePerMillion: 60_000,
        cachedInputPricePerMillion: 3_750,
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
        source: "test",
        sourceCurrency: "VND",
        sourceReference: "kaneo_decision",
        fxSource: "direct_vnd",
        fxRate: 1,
        fxTimestamp: new Date("2026-09-01T00:00:00Z"),
        referenceMetadata: {},
        status: "active",
      });

      const begin = await costService.recorder.beginAttempt({
        callId: "call-linkage-1",
        attemptNumber: 0,
        purpose: "report",
        providerId: "9router-an",
        requestedModelId: "qwen-2.5-72b-instruct",
        maxOutputTokens: 1000,
        costContext: {
          entitlementId: "ent-1",
          chartVersionId: "chart-v1",
        },
      });
      expect(begin.ok).toBe(true);
      if (!begin.ok) return;

      await costService.recorder.completeAttempt({
        attemptId: begin.value.attemptId,
        inputTokens: 1000,
        outputTokens: 500,
      });

      const report = await costService.getAiCogsPerChart("chart-xyz");
      expect(report.records).toHaveLength(1);
      expect(report.records[0].orderId).toBe("order-123");
      expect(report.records[0].chartId).toBe("chart-xyz");
      expect(report.records[0].chartVersionId).toBe("chart-v1");
    });
  });

  describe("contribution margin and incompleteness handling", () => {
    it("returns explicit unavailable status with LA_LEDGER_SOURCE_MISSING from database service", async () => {
      const costService = createInMemoryAiCostService();
      const now = new Date("2026-09-14T12:00:00Z");

      const report = await costService.getContributionMarginReport({ asOfDate: now });

      expect(report).toMatchObject({
        status: "unavailable",
        reason: "LA_LEDGER_SOURCE_MISSING",
      });
    });

    it("pure calculateContributionMargin combines authoritative revenue snapshot and complete cogs summary", () => {
      const revenueSnapshot = {
        periodStart: new Date("2026-08-15T00:00:00Z"),
        periodEnd: new Date("2026-09-14T00:00:00Z"),
        recognizedRevenueVnd: 5_000_000,
        grossPurchasedLaSpendVnd: 5_500_000,
        refundedPurchasedLaVnd: 500_000,
        excludedPromotionalBonusLaVnd: 800_000,
        excludedDisabledAutopayVnd: 300_000,
        source: "WP-10A authoritative ledger",
      };

      const cogsSummary = {
        tier1ReportCogsVnd: 100_000,
        tier2ReportCogsVnd: 400_000,
        freePreviewCogsVnd: 50_000,
        otherCogsVnd: 0,
        totalCogsVnd: 550_000,
        totalCogsMicroVnd: "550000000000",
        totalBillableTokens: 50_000,
        totalAttempts: 10,
        resolvedAttemptCount: 10,
        unknownAttemptCount: 0,
        hasIncompleteAttempts: false,
      };

      const report = calculateContributionMargin(revenueSnapshot, cogsSummary, 0);
      expect(report).toMatchObject({
        status: "complete",
        recognizedRevenueVnd: 5_000_000,
        aiCogsVnd: 550_000,
        paymentFeesVnd: 0,
        infrastructureCostVnd: 0,
        supportCostMetricLabel: "contribution margin before support cost",
        contributionMarginBeforeSupportCostVnd: 4_450_000,
        contributionMarginRatio: 0.89,
        hasIncompleteAttempts: false,
      });
    });

    it("pure calculateContributionMargin returns AI_COGS_INCOMPLETE when COGS has incomplete attempts", () => {
      const revenueSnapshot = {
        periodStart: new Date("2026-08-15T00:00:00Z"),
        periodEnd: new Date("2026-09-14T00:00:00Z"),
        recognizedRevenueVnd: 5_000_000,
        grossPurchasedLaSpendVnd: 5_500_000,
        refundedPurchasedLaVnd: 500_000,
        excludedPromotionalBonusLaVnd: 800_000,
        excludedDisabledAutopayVnd: 300_000,
        source: "WP-10A authoritative ledger",
      };

      const incompleteCogs = {
        tier1ReportCogsVnd: 100_000,
        tier2ReportCogsVnd: 400_000,
        freePreviewCogsVnd: 50_000,
        otherCogsVnd: 0,
        totalCogsVnd: 550_000,
        totalCogsMicroVnd: "550000000000",
        totalBillableTokens: 50_000,
        totalAttempts: 12,
        resolvedAttemptCount: 10,
        unknownAttemptCount: 2,
        hasIncompleteAttempts: true,
      };

      const report = calculateContributionMargin(revenueSnapshot, incompleteCogs, 0);
      expect(report).toMatchObject({
        status: "unavailable",
        reason: "AI_COGS_INCOMPLETE",
      });
    });
  });
});
