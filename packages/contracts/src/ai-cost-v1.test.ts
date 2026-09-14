import { describe, expect, it } from "vitest";

import {
  AiCostRequestContextSchema,
  AiModelPricingSchema,
  AiRequestPurposeSchema,
  ContributionMarginReportSchema,
  ContributionMarginResultSchema,
  PREVIEW_COST_GUARD_CONSTANTS,
  PreviewPreflightReservationSchema,
} from "./ai-cost-v1.js";

describe("ai-cost-v1 contracts", () => {
  it("validates allowed AI request purposes and rejects invalid", () => {
    expect(AiRequestPurposeSchema.parse("report")).toBe("report");
    expect(AiRequestPurposeSchema.parse("critic")).toBe("critic");
    expect(AiRequestPurposeSchema.parse("rewrite")).toBe("rewrite");
    expect(AiRequestPurposeSchema.parse("free_preview")).toBe("free_preview");
    expect(AiRequestPurposeSchema.parse("synthetic_probe")).toBe("synthetic_probe");

    expect(() => AiRequestPurposeSchema.parse("marketing")).toThrow();
    expect(() => AiRequestPurposeSchema.parse("chat")).toThrow();
  });

  it("holds founder-approved preview cost guard constants", () => {
    expect(PREVIEW_COST_GUARD_CONSTANTS.maxGeneratedSectionsPerChart).toBe(3);
    expect(PREVIEW_COST_GUARD_CONSTANTS.maxBillableTokensPerChart).toBe(24_000);
    expect(PREVIEW_COST_GUARD_CONSTANTS.maxCostVndPerChart).toBe(3_000);
    expect(PREVIEW_COST_GUARD_CONSTANTS.maxRewritesPerSection).toBe(1);
  });

  it("validates request cost context without allowing prompt/response fields", () => {
    const validContext = {
      idempotencyKey: "idem-123",
      reportId: "a0000000-0000-4000-8000-000000000001",
      chartId: "chart-456",
      purpose: "report" as const,
      attemptNumber: 0,
    };
    expect(AiCostRequestContextSchema.parse(validContext)).toEqual(validContext);

    expect(() =>
      AiCostRequestContextSchema.parse({
        ...validContext,
        prompt: "secret prompt",
      }),
    ).toThrow();
  });

  it("validates versioned model pricing schema with required explicit FX and source evidence", () => {
    const validPricing = {
      pricingVersion: "v1-20260914",
      providerId: "9router-an",
      modelId: "qwen-2.5-72b-instruct",
      currency: "VND" as const,
      inputPricePerMillion: 15_000,
      outputPricePerMillion: 60_000,
      cachedInputPricePerMillion: 3_750,
      effectiveFrom: new Date("2026-09-14T00:00:00Z"),
      source: "founder_approved_20260914",
      sourceCurrency: "VND",
      sourceReference: "kaneo_decision_20260914",
      fxSource: "direct_vnd",
      fxRate: 1,
      fxTimestamp: new Date("2026-09-14T00:00:00Z"),
      referenceMetadata: { note: "founder approval" },
    };
    const parsed = AiModelPricingSchema.parse(validPricing);
    expect(parsed.inputPricePerMillion).toBe(15_000);
    expect(parsed.source).toBe("founder_approved_20260914");
    expect(parsed.sourceCurrency).toBe("VND");
    expect(parsed.fxRate).toBe(1);
  });

  it("validates preview preflight reservation distinguishing generation from rewrite", () => {
    // Valid generation reservation: projectedSections > 0
    expect(
      PreviewPreflightReservationSchema.parse({
        projectedSections: 1,
        projectedTokens: 1000,
        projectedCostVnd: 100,
      }),
    ).toBeDefined();

    // Generation with projectedSections === 0 must throw
    expect(() =>
      PreviewPreflightReservationSchema.parse({
        projectedSections: 0,
        projectedTokens: 1000,
        projectedCostVnd: 100,
      }),
    ).toThrow();

    // Valid rewrite reservation: projectedSections === 0, sectionId provided
    expect(
      PreviewPreflightReservationSchema.parse({
        projectedSections: 0,
        projectedTokens: 1000,
        projectedCostVnd: 100,
        sectionId: "overview",
        isRewrite: true,
      }),
    ).toBeDefined();

    // Rewrite with projectedSections > 0 must throw
    expect(() =>
      PreviewPreflightReservationSchema.parse({
        projectedSections: 1,
        projectedTokens: 1000,
        projectedCostVnd: 100,
        sectionId: "overview",
        isRewrite: true,
      }),
    ).toThrow();

    // Rewrite without sectionId must throw
    expect(() =>
      PreviewPreflightReservationSchema.parse({
        projectedSections: 0,
        projectedTokens: 1000,
        projectedCostVnd: 100,
        isRewrite: true,
      }),
    ).toThrow();
  });

  it("validates contribution margin report schema with fixed support cost metric label", () => {
    const report = {
      status: "complete" as const,
      periodStart: new Date("2026-08-15T00:00:00Z"),
      periodEnd: new Date("2026-09-14T00:00:00Z"),
      recognizedRevenueVnd: 9_500_000,
      aiCogsVnd: 1_500_000,
      tier1AiCogsVnd: 300_000,
      tier2AiCogsVnd: 1_000_000,
      freePreviewAiCogsVnd: 200_000,
      otherAiCogsVnd: 0,
      paymentFeesVnd: 0,
      infrastructureCostVnd: 0 as const,
      supportCostMetricLabel: "contribution margin before support cost" as const,
      contributionMarginBeforeSupportCostVnd: 8_000_000,
      contributionMarginRatio: 0.8421,
      hasIncompleteAttempts: false as const,
      unknownAttemptCount: 0 as const,
    };

    const parsed = ContributionMarginReportSchema.parse(report);
    expect(parsed.supportCostMetricLabel).toBe(
      "contribution margin before support cost",
    );
    expect(parsed.infrastructureCostVnd).toBe(0);
  });

  it("validates contribution margin unavailable schema with LA_LEDGER_SOURCE_MISSING reason", () => {
    const unavail = {
      status: "unavailable" as const,
      reason: "LA_LEDGER_SOURCE_MISSING" as const,
      message: "Lá ledger not implemented yet",
      periodStart: new Date("2026-08-15T00:00:00Z"),
      periodEnd: new Date("2026-09-14T00:00:00Z"),
      cogs: {
        tier1ReportCogsVnd: 300_000,
        tier2ReportCogsVnd: 1_000_000,
        freePreviewCogsVnd: 200_000,
        otherCogsVnd: 0,
        totalCogsVnd: 1_500_000,
        totalCogsMicroVnd: "1500000000000",
        totalBillableTokens: 25_000,
        totalAttempts: 10,
        resolvedAttemptCount: 10,
        unknownAttemptCount: 0,
        hasIncompleteAttempts: false,
      },
    };
    const parsed = ContributionMarginResultSchema.parse(unavail);
    expect(parsed.status).toBe("unavailable");
  });
});
