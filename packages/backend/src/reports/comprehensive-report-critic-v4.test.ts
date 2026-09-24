import { describe, expect, it, vi } from "vitest";
import type { NormalizedZiweiChartV1, ZiweiPalaceId } from "@lasoviet/contracts";

import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  critiqueComprehensiveZiweiReportSectionedV4,
  critiqueComprehensiveZiweiReportV4,
} from "./comprehensive-report-critic-v4.js";
import {
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
} from "./identity-report-config.js";

const palaceIds: ZiweiPalaceId[] = [
  "ziwei.palace.life",
  "ziwei.palace.siblings",
  "ziwei.palace.spouse",
  "ziwei.palace.children",
  "ziwei.palace.wealth",
  "ziwei.palace.health",
  "ziwei.palace.travel",
  "ziwei.palace.friends",
  "ziwei.palace.career",
  "ziwei.palace.property",
  "ziwei.palace.fortune",
  "ziwei.palace.parents",
];

const branches = [
  "ziwei.branch.tiger",
  "ziwei.branch.rabbit",
  "ziwei.branch.dragon",
  "ziwei.branch.snake",
  "ziwei.branch.horse",
  "ziwei.branch.goat",
  "ziwei.branch.monkey",
  "ziwei.branch.rooster",
  "ziwei.branch.dog",
  "ziwei.branch.pig",
  "ziwei.branch.rat",
  "ziwei.branch.ox",
] as const;

function createSampleChart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id,
      earthlyBranchId: branches[index]!,
      heavenlyStemId: "ziwei.stem.jia",
      isBodyPalace: id === "ziwei.palace.career",
      isOriginalPalace: index === 0,
      cycleStateId: "ziwei.cycle.born",
      stars:
        id === "ziwei.palace.life"
          ? [
              {
                id: "ziwei.star.ziwei",
                brightness: "ziwei.brightness.prosperous",
                category: "major",
              },
            ]
          : [],
    })),
    transformations: [{ starId: "ziwei.star.ziwei", id: "ziwei.transformation.power" }],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [
      { id: "ziwei.horoscope.decadal", supported: true },
      { id: "ziwei.horoscope.annual", supported: true },
    ],
    warnings: [],
    provenance: {
      version: 1,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart-v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: [],
    },
  };
}

function createSampleSnapshot() {
  return {
    version: 1 as const,
    reportId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    chartVersionId: "chart-v1",
    asOfDate: "2026-09-12",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    snapshotHash: "c".repeat(64),
    snapshot: {
      version: 1 as const,
      chartVersionId: "chart-v1",
      asOfDate: "2026-09-12",
      timezone: "Asia/Ho_Chi_Minh",
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      timing: {
        decadal: {
          state: "active" as const,
          index: 2,
          ageRange: [22, 31] as [number, number],
          yearRange: [2022, 2031] as [number, number],
          palaceId: "ziwei.palace.fortune" as const,
          heavenlyStemId: "ziwei.stem.yi",
          earthlyBranchId: "ziwei.branch.rabbit" as const,
          palaces: palaceIds.map((id, index) => ({
            palaceId: id,
            heavenlyStemId: "ziwei.stem.jia",
            earthlyBranchId: branches[index]!,
            isOriginalPalace: index === 0,
            cycleStateId: "ziwei.cycle.born",
            stars: [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.prosperous", category: "major" as const }],
            transformations: [],
          })),
        },
        annual: {
          targetYear: 2026,
          palaceId: "ziwei.palace.career" as const,
          heavenlyStemId: "ziwei.stem.bing",
          earthlyBranchId: "ziwei.branch.horse" as const,
          palaces: palaceIds.map((id, index) => ({
            palaceId: id,
            heavenlyStemId: "ziwei.stem.jia",
            earthlyBranchId: branches[index]!,
            isOriginalPalace: index === 0,
            cycleStateId: "ziwei.cycle.born",
            stars: [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.prosperous", category: "major" as const }],
            transformations: [],
          })),
        },
        provenance: {
          engineId: "ziwei.iztro",
          engineVersion: "2.6.0",
          adapterId: "ziwei.iztro-adapter",
          adapterVersion: "1.0.0",
          ruleSetId: "ziwei.default",
          config: {
            yearDivide: "normal",
            horoscopeDivide: "normal",
            ageDivide: "normal",
            dayDivide: "current",
          },
        },
      },
      sensitivity: {
        selectedFrame: { position: "selected" as const, vendorTimeIndex: 6, civilDateOffset: 0 as const, frameId: "ziwei.time-frame.horse" },
        previousFrame: { position: "previous" as const, vendorTimeIndex: 5, civilDateOffset: 0 as const, frameId: "ziwei.time-frame.snake" },
        nextFrame: { position: "next" as const, vendorTimeIndex: 7, civilDateOffset: 0 as const, frameId: "ziwei.time-frame.goat" },
        stableFactKeys: ["ziwei.fact.soul-palace"],
        sensitiveFacts: [],
      },
      provenance: {
        chartVersionId: "chart-v1",
        timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
        snapshotHash: "c".repeat(64),
      },
    },
  };
}

describe("critiqueComprehensiveZiweiReportV4", () => {
  const dummyReport = {
    overview: { title: "Tổng quan", narrative: "Nội dung", evidenceKeys: ["k1"] },
    coreAxis: { title: "Mệnh Thân", narrative: "Nội dung", evidenceKeys: ["k1"] },
    keyConfigurations: [{ title: "Cách cục", narrative: "Nội dung", evidenceKeys: ["k1"] }],
    palaceReadings: palaceIds.map((palaceId) => ({ palaceId, title: "Cung", narrative: "Nội dung", evidenceKeys: ["k1"] })),
    thematicSynthesis: ["career_wealth", "relationships_family", "social_environment", "wellbeing_inner_resources"].map((id) => ({ id: id as any, title: "Chuyên đề", narrative: "Nội dung", evidenceKeys: ["k1"] })),
    strengthsAndTensions: { title: "Điểm mạnh", narrative: "Nội dung", evidenceKeys: ["k1"] },
    currentDecadal: { title: "Đại vận", state: "active" as const, index: 2, ageRange: [22, 31] as [number, number], yearRange: [2022, 2031] as [number, number], narrative: "Nội dung", evidenceKeys: ["k1"] },
    annualSnapshot: { title: "Lưu niên", targetYear: 2026, asOfDate: "2026-09-12", narrative: "Nội dung", evidenceKeys: ["k1"] },
    practicalDirection: [
      { recommendation: "Khuyến nghị 1", rationale: "Lý do 1", avoid: "Tránh 1", evidenceKeys: ["k1"] },
      { recommendation: "Khuyến nghị 2", rationale: "Lý do 2", avoid: "Tránh 2", evidenceKeys: ["k1"] },
      { recommendation: "Khuyến nghị 3", rationale: "Lý do 3", avoid: "Tránh 3", evidenceKeys: ["k1"] },
    ],
  };

  it("passes when all critic scores are >= 4", async () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 5,
            evidenceCoverage: 4,
            specificity: 5,
            languageClarity: 5,
            consistency: 4,
            actionability: 5,
            safety: 5,
            repetitionControl: 4,
            notes: ["Báo cáo chuẩn xác."],
          },
          providerId: "mock-ai",
          modelId: "mock-model",
        },
      }),
    };

    const result = await critiqueComprehensiveZiweiReportV4(dummyReport as any, facts, mockProvider as never);
    expect(result.ok).toBe(true);
    expect(mockProvider.generateStructured).toHaveBeenCalledTimes(1);
  });

  it("returns REPORT_SAFETY_REJECTED when safety or correctness is < 4", async () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 3,
            evidenceCoverage: 5,
            specificity: 5,
            languageClarity: 5,
            consistency: 5,
            actionability: 5,
            safety: 5,
            repetitionControl: 5,
            notes: ["Thiếu chuẩn xác."],
          },
        },
      }),
    };

    const result = await critiqueComprehensiveZiweiReportV4(dummyReport as any, facts, mockProvider as never);
    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_SAFETY_REJECTED",
        retryable: false,
        notes: ["Thiếu chuẩn xác."],
      },
    });
  });

  it("returns AI_OUTPUT_INVALID when quality metrics are < 4", async () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 4,
            evidenceCoverage: 3,
            specificity: 4,
            languageClarity: 4,
            consistency: 4,
            actionability: 4,
            safety: 5,
            repetitionControl: 4,
            notes: ["Chưa bao quát đủ evidence keys."],
          },
        },
      }),
    };

    const result = await critiqueComprehensiveZiweiReportV4(dummyReport as any, facts, mockProvider as never);
    expect(result).toEqual({
      ok: false,
      error: {
        code: "AI_OUTPUT_INVALID",
        retryable: false,
        notes: ["Chưa bao quát đủ evidence keys."],
      },
    });
  });

  it("fails closed on AI provider failure without retry", async () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "AI_TIMEOUT", retryable: true },
      }),
    };

    const result = await critiqueComprehensiveZiweiReportV4(dummyReport as any, facts, mockProvider as never);
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_TIMEOUT", retryable: true },
    });
    expect(mockProvider.generateStructured).toHaveBeenCalledTimes(1);
  });

  it("enforces critic prompt constraints: lasoviet.net domain, does not penalize professional referrals, rejects certainty/fabrication", async () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 5,
            evidenceCoverage: 5,
            specificity: 5,
            languageClarity: 5,
            consistency: 5,
            actionability: 5,
            safety: 5,
            repetitionControl: 5,
            notes: [],
          },
        },
      }),
    };

    await critiqueComprehensiveZiweiReportV4(dummyReport as any, facts, mockProvider as never);
    expect(mockProvider.generateStructured).toHaveBeenCalledTimes(1);

    const callArgs = mockProvider.generateStructured.mock.calls[0][0];
    expect(callArgs.system).toContain("lasoviet.net");
    expect(callArgs.system).not.toContain("lasoviet.vn");
    expect(callArgs.system).toContain("KHÔNG trừ điểm đối với các lời khuyên tham vấn bác sĩ, luật sư hoặc chuyên gia");
    expect(callArgs.system).toContain('đề cập đến cái chết, tuổi thọ hay "khắc chết"');
    expect(callArgs.system).toContain("bịa đặt sự kiện hoặc mốc thời gian hạn không có trong facts");
  });

  it("makes one PII-free whole-report call and passes with empty findings", async () => {
    const facts = buildComprehensiveZiweiFactsV4(createSampleChart(), createSampleSnapshot());
    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5,
            consistency: 5, actionability: 5, safety: 5, repetitionControl: 5,
            notes: [],
            findings: [],
          },
          providerId: "mock-ai", modelId: "mock-model",
        },
      }),
    };
    const costContext = { idempotencyKey: "critic-key", purpose: "generation" as const };
    const result = await critiqueComprehensiveZiweiReportSectionedV4(
      dummyReport as any,
      facts,
      mockProvider as never,
      { costContext },
    );
    expect(result.ok).toBe(true);
    expect(mockProvider.generateStructured).toHaveBeenCalledTimes(1);
    const request = mockProvider.generateStructured.mock.calls[0][0];
    expect(request.purpose).toBe("critic");
    expect(request.costContext).toBe(costContext);
    expect(request.maxOutputTokens).toBe(900);
    const payload = JSON.parse(request.user);
    expect(payload.report).toEqual(dummyReport);
    expect(request.user).not.toContain("birthDate");
    expect(request.user).not.toContain("birthTime");
    expect(request.user).not.toContain("birthLocation");
  });

  it("returns advisory warnings without scores when warning-only review is requested", async () => {
    const facts = buildComprehensiveZiweiFactsV4(createSampleChart(), createSampleSnapshot());
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            warnings: [{ key: "overview", category: "clarity", note: "Rút gọn câu mở đầu." }],
          },
        },
      }),
    };
    const result = await critiqueComprehensiveZiweiReportSectionedV4(
      dummyReport as any,
      facts,
      provider as never,
      { warningOnly: true },
    );
    expect(result).toEqual({
      ok: true,
      value: { warnings: [{ key: "overview", category: "clarity", note: "Rút gọn câu mở đầu." }] },
    });
    const request = provider.generateStructured.mock.calls[0][0];
    expect(request.schema.safeParse({ warnings: [] }).success).toBe(true);
    expect(request.schema.safeParse({ correctness: 5, warnings: [] }).success).toBe(false);
    expect(request.system).toContain("không chấm điểm, không approve/reject");
  });

  it.each([
    REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
    REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  ])("accepts sensitivity critic config %s and rejects unknown config", async (reportConfigVersion) => {
    const facts = buildComprehensiveZiweiFactsV4(createSampleChart(), createSampleSnapshot());
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5,
            consistency: 5, actionability: 5, safety: 5, repetitionControl: 5,
            notes: [], findings: [],
          },
        },
      }),
    };
    await expect(critiqueComprehensiveZiweiReportSectionedV4(
      dummyReport as any,
      facts,
      provider as never,
      { reportConfigVersion },
    )).resolves.toMatchObject({ ok: true });
    await expect(critiqueComprehensiveZiweiReportSectionedV4(
      dummyReport as any,
      facts,
      provider as never,
      { reportConfigVersion: "unknown" as never },
    )).resolves.toEqual({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
  });

  it("returns closed named findings only for addressable low quality", async () => {
    const facts = buildComprehensiveZiweiFactsV4(createSampleChart(), createSampleSnapshot());
    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5,
            consistency: 5, actionability: 5, safety: 5, repetitionControl: 5,
            notes: ["Thiếu căn cứ."],
            findings: [{ key: "overview", note: "Bổ sung căn cứ trực tiếp." }],
          },
        },
      }),
    };
    const result = await critiqueComprehensiveZiweiReportSectionedV4(
      dummyReport as any, facts, mockProvider as never,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: "AI_OUTPUT_INVALID",
        retryable: false,
        notes: ["Thiếu căn cứ."],
        findings: [{ key: "overview", note: "Bổ sung căn cứ trực tiếp." }],
      },
    });
  });

  it("keeps an unaddressable low-quality report terminal without rewrite findings", async () => {
    const facts = buildComprehensiveZiweiFactsV4(createSampleChart(), createSampleSnapshot());
    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5,
            consistency: 5, actionability: 5, safety: 5, repetitionControl: 5,
            notes: ["Thiếu căn cứ."], findings: [],
          },
        },
      }),
    };
    const result = await critiqueComprehensiveZiweiReportSectionedV4(
      dummyReport as any, facts, mockProvider as never,
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_OUTPUT_INVALID", retryable: false, notes: ["Thiếu căn cứ."] },
    });
  });

  it("does not expose rewrite findings for safety rejection", async () => {
    const facts = buildComprehensiveZiweiFactsV4(createSampleChart(), createSampleSnapshot());
    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5,
            consistency: 5, actionability: 5, safety: 3, repetitionControl: 5,
            notes: ["Khẳng định không phù hợp."],
            findings: [{ key: "overview", note: "Không được trả ra." }],
          },
        },
      }),
    };
    const result = await critiqueComprehensiveZiweiReportSectionedV4(
      dummyReport as any, facts, mockProvider as never,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_SAFETY_REJECTED",
        retryable: false,
        notes: ["Khẳng định không phù hợp."],
      },
    });
  });

  it.each([
    ["unknown finding key", [{ key: "unknown", note: "Sai key." }]],
    ["excess findings", Array.from({ length: 9 }, () => ({ key: "overview", note: "Quá nhiều." }))],
    ["malformed finding", [{ key: "overview", note: "" }]],
  ])("fails closed on %s", async (_label, findings) => {
    const facts = buildComprehensiveZiweiFactsV4(createSampleChart(), createSampleSnapshot());
    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5,
            consistency: 5, actionability: 5, safety: 5, repetitionControl: 5,
            notes: [], findings,
          },
        },
      }),
    };
    await expect(critiqueComprehensiveZiweiReportSectionedV4(
      dummyReport as any, facts, mockProvider as never,
    )).resolves.toEqual({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
  });

  it("fails closed when passing scores include findings", async () => {
    const facts = buildComprehensiveZiweiFactsV4(createSampleChart(), createSampleSnapshot());
    const mockProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5,
            consistency: 5, actionability: 5, safety: 5, repetitionControl: 5,
            notes: [], findings: [{ key: "overview", note: "Mâu thuẫn với điểm." }],
          },
        },
      }),
    };
    await expect(critiqueComprehensiveZiweiReportSectionedV4(
      dummyReport as any, facts, mockProvider as never,
    )).resolves.toEqual({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false, notes: [] } });
  });

  it("sends normalized enum-only context to both critics", async () => {
    const facts = buildComprehensiveZiweiFactsV4(createSampleChart(), createSampleSnapshot());
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: { value: {
          correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5,
          consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [],
        } },
      }),
    };
    const context = { version: 1, lifeStage: "early_career", topConcern: "career" } as const;
    await critiqueComprehensiveZiweiReportV4(dummyReport as any, facts, provider as never, { readingContext: context });
    await critiqueComprehensiveZiweiReportSectionedV4(dummyReport as any, facts, provider as never, { readingContext: context });
    for (const [request] of provider.generateStructured.mock.calls) {
      const payload = JSON.parse(request.user);
      expect(payload.readingContext).toEqual({ lifeStage: "early_career", topConcern: "career" });
      expect(JSON.stringify(payload)).not.toContain("birthDate");
      expect(request.system).toContain("không được nói hoặc ngụ ý lá số tiết lộ context");
    }
  });

});
