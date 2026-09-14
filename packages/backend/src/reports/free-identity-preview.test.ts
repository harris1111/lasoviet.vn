import { describe, expect, it, vi } from "vitest";

import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import { buildZiweiIdentityEvidence } from "../evidence/ziwei-identity-rules.js";
import {
  buildFreeIdentityPreview,
  buildGuardedFreeIdentityPreview,
  checkPreviewBudgetPreflight,
  PREVIEW_GUARD_LIMITS,
} from "./free-identity-preview.js";

const item = (id: string) => ({
  id,
  factReferences: [`fact.${id}`],
  confidence: "high" as const,
  interpretationBounds: ["identity-only"],
  interpretationBoundCodes: ["reflective_identity_only"],
  limitations: ["birth-time-dependent"],
  riskTags: ["identity" as const],
  allowedActionCategories: ["reflect" as const],
});

describe("free identity preview builder", () => {
  it("builds three evidence-linked insights, linked strength/tension, and 12 percent paid coverage", () => {
    const result = buildFreeIdentityPreview({
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      evidence: [
        item("ziwei.identity.life-palace"),
        item("ziwei.identity.body-palace"),
        item("ziwei.identity.transformations"),
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        insights: { length: 3 },
        strengthSignal: { evidence: { evidenceId: "ziwei.identity.life-palace" } },
        tensionSignal: { evidence: { length: 2 } },
        paidPreview: { coveragePercent: 12, sku: "ZIWEI-IDENTITY-P0" },
      },
    });
    if (result.ok) {
      expect(result.value.insights.map((insight) => insight.evidence.evidenceId)).toEqual([
        "ziwei.identity.life-palace",
        "ziwei.identity.body-palace",
        "ziwei.identity.transformations",
      ]);
    }
  });

  it.each([
    [[item("ziwei.identity.life-palace"), item("ziwei.identity.body-palace")]],
    [[item("ziwei.identity.life-palace"), item("ziwei.identity.body-palace"), item("ziwei.identity.body-palace")]],
  ])("returns insufficient evidence for missing or duplicate canonical items", (evidence) => {
    expect(buildFreeIdentityPreview({
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      evidence,
    })).toMatchObject({ ok: false, error: { code: "INSUFFICIENT_EVIDENCE" } });
  });

  it("maps persisted Zi Wei evidence into stable insight categories", () => {
    const chart: NormalizedZiweiChartV1 = {
      version: 1,
      systemId: "ziwei",
      palaces: [
        "life", "siblings", "spouse", "children", "wealth", "health",
        "travel", "friends", "career", "property", "fortune", "parents",
      ].map((id) => ({
        id: `ziwei.palace.${id}` as NormalizedZiweiChartV1["palaces"][number]["id"],
        earthlyBranchId: "ziwei.branch.tiger",
        stars: [],
      })),
      transformations: [{
        starId: "ziwei.star.wuqu",
        id: "ziwei.transformation.prosperity",
      }],
      soulPalaceId: "ziwei.palace.life",
      bodyPalaceId: "ziwei.palace.career",
      horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }],
      warnings: [],
      provenance: {
        version: 1, engineId: "ziwei.iztro", engineVersion: "2.6.0",
        adapterId: "ziwei.iztro-adapter", adapterVersion: "1",
        schemaId: "ziwei.chart.v1", ruleSetId: "ziwei.default",
        inputHash: "a".repeat(64), configHash: "b".repeat(64),
        rawSnapshotHash: "c".repeat(64),
        calculatedAt: "2026-09-02T00:00:00+00:00",
        limitations: ["IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION"],
      },
    };
    const evidence = buildZiweiIdentityEvidence(chart, "chart-version-1");
    expect(evidence).toMatchObject({ ok: true });
    if (!evidence.ok) return;

    const preview = buildFreeIdentityPreview({
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      evidence: evidence.value.items,
    });

    expect(preview).toMatchObject({
      ok: true,
      value: {
        insights: [
          { id: "life-palace", evidence: { evidenceId: "ziwei.identity.life-palace" } },
          { id: "body-palace", evidence: { evidenceId: "ziwei.identity.body-palace" } },
          { id: "transformations", evidence: { evidenceId: "ziwei.identity.transformations" } },
        ],
      },
    });
  });

  describe("preview guard and structural fallback", () => {
    const validEvidence = [
      item("ziwei.identity.life-palace"),
      item("ziwei.identity.body-palace"),
      item("ziwei.identity.transformations"),
    ];

    it("enforces founder constants for max sections, tokens, cost, and rewrites", () => {
      expect(PREVIEW_GUARD_LIMITS.maxGeneratedSectionsPerChart).toBe(3);
      expect(PREVIEW_GUARD_LIMITS.maxBillableTokensPerChart).toBe(24_000);
      expect(PREVIEW_GUARD_LIMITS.maxCostVndPerChart).toBe(3_000);
      expect(PREVIEW_GUARD_LIMITS.maxRewritesPerSection).toBe(1);
    });

    it("requires a conservative positive reservation before generator invocation", async () => {
      const generator = vi.fn();
      // Missing reservation refuses generator call
      const resMissing = await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: { generatedSections: 0, billableTokens: 0, costVnd: 0 },
        reservation: undefined as any,
        generator,
      });
      expect(generator).not.toHaveBeenCalled();
      expect(resMissing).toMatchObject({ ok: true, value: { summaryVersion: "ziwei.identity.free.v1" } });

      // Non-positive reservation refuses generator call
      const resZero = await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: { generatedSections: 0, billableTokens: 0, costVnd: 0 },
        reservation: { projectedSections: 0, projectedTokens: 0, projectedCostVnd: 0 },
        generator,
      });
      expect(generator).not.toHaveBeenCalled();
      expect(resZero).toMatchObject({ ok: true, value: { summaryVersion: "ziwei.identity.free.v1" } });
    });

    it("refuses generator call via preflight when unknown usage or projected overage occurs", async () => {
      const generator = vi.fn();

      // Case 1: Unknown usage refuses before invoking generator
      const resUnknown = await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: {
          generatedSections: 0,
          billableTokens: 0,
          costVnd: 0,
          hasUnknownCost: true,
        },
        reservation: { projectedSections: 1, projectedTokens: 1000, projectedCostVnd: 100 },
        generator,
      });
      expect(generator).not.toHaveBeenCalled();
      expect(resUnknown).toMatchObject({ ok: true, value: { summaryVersion: "ziwei.identity.free.v1" } });

      // Case 2: Projected reservation exceeds token cap
      const resProjected = await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: {
          generatedSections: 1,
          billableTokens: 20_000,
          costVnd: 2_000,
        },
        reservation: {
          projectedSections: 1,
          projectedTokens: 5_000, // 20_000 + 5_000 = 25_000 > 24_000
          projectedCostVnd: 500,
        },
        generator,
      });
      expect(generator).not.toHaveBeenCalled();
      expect(resProjected).toMatchObject({ ok: true, value: { summaryVersion: "ziwei.identity.free.v1" } });
    });

    it("rejects generation and flags reason when caps are reached", () => {
      expect(
        checkPreviewBudgetPreflight(
          { generatedSections: 0, billableTokens: 0, costVnd: 0, hasUnknownCost: true },
          { projectedSections: 1, projectedTokens: 1000, projectedCostVnd: 100 },
        ),
      ).toEqual({ allowed: false, reason: "USAGE_UNKNOWN" });

      expect(
        checkPreviewBudgetPreflight(
          { generatedSections: 2, billableTokens: 10_000, costVnd: 1_000 },
          { projectedSections: 2, projectedTokens: 1000, projectedCostVnd: 100 }, // 2 + 2 = 4 > 3
        ),
      ).toEqual({ allowed: false, reason: "MAX_SECTIONS_EXCEEDED" });

      expect(
        checkPreviewBudgetPreflight(
          { generatedSections: 3, billableTokens: 5_000, costVnd: 500 },
          { projectedSections: 1, projectedTokens: 1000, projectedCostVnd: 100 },
        ),
      ).toEqual({ allowed: false, reason: "MAX_SECTIONS_EXCEEDED" });

      expect(
        checkPreviewBudgetPreflight(
          { generatedSections: 1, billableTokens: 24_000, costVnd: 500 },
          { projectedSections: 1, projectedTokens: 1000, projectedCostVnd: 100 },
        ),
      ).toEqual({ allowed: false, reason: "MAX_TOKENS_EXCEEDED" });

      expect(
        checkPreviewBudgetPreflight(
          { generatedSections: 1, billableTokens: 5_000, costVnd: 3_000 },
          { projectedSections: 1, projectedTokens: 1000, projectedCostVnd: 100 },
        ),
      ).toEqual({ allowed: false, reason: "MAX_COST_EXCEEDED" });

      expect(
        checkPreviewBudgetPreflight(
          { generatedSections: 1, billableTokens: 5_000, costVnd: 500, rewritesBySection: { sectionA: 1 } },
          { projectedSections: 0, projectedTokens: 1000, projectedCostVnd: 100, sectionId: "sectionA", isRewrite: true },
        ),
      ).toEqual({ allowed: false, reason: "MAX_REWRITES_EXCEEDED" });
    });

    it("allows 3 generated sections to perform first rewrite of existing section if budget permits, but rejects second rewrite", async () => {
      const generator = vi.fn().mockResolvedValue({
        ok: true,
        preview: {
          version: 1,
          chartId: "chart-1",
          chartVersionId: "chart-version-1",
          capabilityId: "ziwei.identity.p0",
          summaryVersion: "ziwei.identity.free.v1",
          insights: [
            { id: "life-palace", evidence: { evidenceId: "ziwei.identity.life-palace", factReferences: ["fact.ziwei.identity.life-palace"], confidence: "high", interpretationBoundCodes: ["reflective_identity_only"], interpretationBounds: ["identity-only"], limitations: ["birth-time-dependent"] } },
            { id: "body-palace", evidence: { evidenceId: "ziwei.identity.body-palace", factReferences: ["fact.ziwei.identity.body-palace"], confidence: "high", interpretationBoundCodes: ["reflective_identity_only"], interpretationBounds: ["identity-only"], limitations: ["birth-time-dependent"] } },
            { id: "transformations", evidence: { evidenceId: "ziwei.identity.transformations", factReferences: ["fact.ziwei.identity.transformations"], confidence: "high", interpretationBoundCodes: ["reflective_identity_only"], interpretationBounds: ["identity-only"], limitations: ["birth-time-dependent"] } },
          ],
          strengthSignal: { id: "life-palace-strength", evidence: { evidenceId: "ziwei.identity.life-palace", factReferences: ["fact.ziwei.identity.life-palace"], confidence: "high", interpretationBoundCodes: ["reflective_identity_only"], interpretationBounds: ["identity-only"], limitations: ["birth-time-dependent"] } },
          tensionSignal: { id: "body-palace-transformations-tension", evidence: [{ evidenceId: "ziwei.identity.body-palace", factReferences: ["fact.ziwei.identity.body-palace"], confidence: "high", interpretationBoundCodes: ["reflective_identity_only"], interpretationBounds: ["identity-only"], limitations: ["birth-time-dependent"] }, { evidenceId: "ziwei.identity.transformations", factReferences: ["fact.ziwei.identity.transformations"], confidence: "high", interpretationBoundCodes: ["reflective_identity_only"], interpretationBounds: ["identity-only"], limitations: ["birth-time-dependent"] }] },
          paidPreview: { sku: "ZIWEI-IDENTITY-P0", sectionId: "personal_summary", coveragePercent: 12, evidence: [{ evidenceId: "ziwei.identity.life-palace", factReferences: ["fact.ziwei.identity.life-palace"], confidence: "high", interpretationBoundCodes: ["reflective_identity_only"], interpretationBounds: ["identity-only"], limitations: ["birth-time-dependent"] }] },
        },
      });

      // First rewrite of sectionA when generatedSections is 3 (projectedSections is 0)
      const resFirst = await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: {
          generatedSections: 3,
          billableTokens: 15_000,
          costVnd: 1_500,
          rewritesBySection: { sectionA: 0 },
        },
        reservation: {
          projectedSections: 0,
          projectedTokens: 2_000,
          projectedCostVnd: 200,
          sectionId: "sectionA",
          isRewrite: true,
        },
        generator,
      });
      expect(generator).toHaveBeenCalledTimes(1);
      expect(resFirst.ok).toBe(true);

      // Second rewrite of sectionA: rewritesBySection is now 1 -> rejected!
      const generator2 = vi.fn();
      const resSecond = await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: {
          generatedSections: 3,
          billableTokens: 17_000,
          costVnd: 1_700,
          rewritesBySection: { sectionA: 1 },
        },
        reservation: {
          projectedSections: 0,
          projectedTokens: 2_000,
          projectedCostVnd: 200,
          sectionId: "sectionA",
          isRewrite: true,
        },
        generator: generator2,
      });
      expect(generator2).not.toHaveBeenCalled();
      expect(resSecond).toMatchObject({ ok: true, value: { summaryVersion: "ziwei.identity.free.v1" } });
    });

    it("never calls generator for invalid rewrite reservations", async () => {
      const generator = vi.fn();
      // Rewrite with non-zero projectedSections
      await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: { generatedSections: 1, billableTokens: 1_000, costVnd: 100 },
        reservation: { projectedSections: 1, projectedTokens: 500, projectedCostVnd: 50, sectionId: "sec-1", isRewrite: true },
        generator,
      });
      expect(generator).not.toHaveBeenCalled();

      // Rewrite without sectionId
      await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: { generatedSections: 1, billableTokens: 1_000, costVnd: 100 },
        reservation: { projectedSections: 0, projectedTokens: 500, projectedCostVnd: 50, isRewrite: true },
        generator,
      });
      expect(generator).not.toHaveBeenCalled();
    });

    it("falls back to deterministic structural preview when cap is already reached", async () => {
      const generator = vi.fn();
      const result = await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: {
          generatedSections: 3,
          billableTokens: 10_000,
          costVnd: 1_000,
        },
        reservation: { projectedSections: 1, projectedTokens: 1000, projectedCostVnd: 100 },
        generator,
      });

      expect(generator).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        ok: true,
        value: {
          summaryVersion: "ziwei.identity.free.v1",
          insights: { length: 3 },
        },
      });
    });

    it("falls back to structural preview when generator throws or fails rather than fake generated success", async () => {
      const failingGenerator = vi.fn().mockRejectedValue(new Error("AI generation timeout"));
      const result = await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: {
          generatedSections: 1,
          billableTokens: 5_000,
          costVnd: 500,
        },
        reservation: { projectedSections: 1, projectedTokens: 1000, projectedCostVnd: 100 },
        generator: failingGenerator,
      });

      expect(failingGenerator).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        ok: true,
        value: {
          summaryVersion: "ziwei.identity.free.v1",
          insights: { length: 3 },
        },
      });

      const nonOkGenerator = vi.fn().mockResolvedValue({ ok: false });
      const nonOkResult = await buildGuardedFreeIdentityPreview({
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        evidence: validEvidence,
        usageState: { generatedSections: 1, billableTokens: 5_000, costVnd: 500 },
        reservation: { projectedSections: 1, projectedTokens: 1000, projectedCostVnd: 100 },
        generator: nonOkGenerator,
      });
      expect(nonOkResult).toMatchObject({ ok: true, value: { summaryVersion: "ziwei.identity.free.v1" } });
    });
  });
});
