import { describe, expect, it, vi } from "vitest";
import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  type NormalizedZiweiChartV1,
  type ZiweiPalaceId,
} from "@lasoviet/contracts";

import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  writeComprehensiveZiweiReportV4,
} from "./comprehensive-report-writer-v4.js";
import {
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
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
            transformations: [{ starId: "ziwei.star.ziwei", id: "ziwei.transformation.power" }],
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
            transformations: [{ starId: "ziwei.star.ziwei", id: "ziwei.transformation.power" }],
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

function createSampleV2GeneratedReport() {
  return {
    overview: {
      title: "Tổng quan lá số",
      narrative: "Tổng quan cuộc đời vững chắc.",
      evidenceKeys: ["natal.ziwei.palace.life"],
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Trục Mệnh Thân kiên định.",
      evidenceKeys: ["natal.ziwei.palace.life"],
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Vi",
        narrative: "Tử Vi tọa thủ vững vàng.",
        evidenceKeys: ["natal.ziwei.palace.life"],
      },
    ],
    palaceReadings: palaceIds.map((palaceId) => ({
      palaceId,
      title: `Luận giải ${palaceId}`,
      narrative: `Nội dung luận giải ${palaceId}.`,
      evidenceKeys: [`natal.${palaceId}`],
    })),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: `Tổng hợp ${id}`,
      narrative: `Nội dung tổng hợp ${id}.`,
      evidenceKeys: ["natal.ziwei.palace.life"],
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh và điểm vướng",
      narrative: "Điểm mạnh phát huy tối đa.",
      evidenceKeys: ["natal.ziwei.palace.life"],
    },
    currentDecadal: {
      title: "Đại vận hiện hành",
      state: "active" as const,
      index: 2,
      ageRange: [22, 31] as [number, number],
      yearRange: [2022, 2031] as [number, number],
      narrative: "Giai đoạn 10 năm chuyển biến thuận lợi.",
      evidenceKeys: ["decadal.state.active"],
    },
    annualSnapshot: {
      title: "Lưu niên năm 2026",
      targetYear: 2026,
      asOfDate: "2026-09-12",
      narrative: "Năm 2026 có nhiều cơ hội.",
      evidenceKeys: ["annual.target-year.2026"],
    },
    practicalDirection: [
      {
        recommendation: "Tập trung nâng cao chuyên môn.",
        rationale: "Mệnh vững vàng cần kiến thức sâu.",
        avoid: "Tránh quyết định vội vàng.",
        evidenceKeys: ["natal.ziwei.palace.life"],
      },
      {
        recommendation: "Xây dựng mối quan hệ tin cậy.",
        rationale: "Hỗ trợ đồng nghiệp đem lại lợi ích lâu dài.",
        avoid: "Tránh đơn độc hành động.",
        evidenceKeys: ["natal.ziwei.palace.life"],
      },
      {
        recommendation: "Giữ vững kỷ luật tài chính.",
        rationale: "Tích lũy tài sản cho chu kỳ tới.",
        avoid: "Tránh đầu tư rủi ro cao.",
        evidenceKeys: ["natal.ziwei.palace.life"],
      },
    ],
  };
}

describe("writeComprehensiveZiweiReportV4", () => {
  it("requests ziwei-comprehensive.v2, produces 3-5 structured actions, enforces frozen timing, and omits birthTimeSensitivity", async () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const generatedReport = createSampleV2GeneratedReport();
    const mockProvider = {
      id: "mock-ai",
      modelId: "mock-model",
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: generatedReport,
          providerId: "mock-ai",
          modelId: "mock-model",
        },
      }),
    };

    const result = await writeComprehensiveZiweiReportV4({
      facts,
      knowledgePacks: [],
      provider: mockProvider as never,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const report = result.value.report;

    // No birthTimeSensitivity on customer report
    expect("birthTimeSensitivity" in report).toBe(false);

    // Canonical palace and theme titles
    for (const palace of report.palaceReadings) {
      expect(palace.title).toBe(CANONICAL_PALACE_TITLES_VI[palace.palaceId]);
    }
    for (const theme of report.thematicSynthesis) {
      expect(theme.title).toBe(CANONICAL_THEMATIC_TITLES_VI[theme.id]);
    }

    // Frozen timing
    expect(report.currentDecadal.state).toBe("active");
    if (report.currentDecadal.state === "active") {
      expect(report.currentDecadal.index).toBe(2);
      expect(report.currentDecadal.ageRange).toEqual([22, 31]);
      expect(report.currentDecadal.yearRange).toEqual([2022, 2031]);
    }
    expect(report.annualSnapshot.targetYear).toBe(2026);
    expect(report.annualSnapshot.asOfDate).toBe("2026-09-12");

    // 3-5 structured actions
    expect(report.practicalDirection).toHaveLength(3);
    for (const action of report.practicalDirection) {
      expect(action.recommendation).toBeDefined();
      expect(action.rationale).toBeDefined();
      expect(action.avoid).toBeDefined();
      expect(action.evidenceKeys.length).toBeGreaterThan(0);
    }

    // Verify provider was invoked with schema ziwei_comprehensive_report_content_v2
    expect(mockProvider.generateStructured).toHaveBeenCalledTimes(1);
    const callArgs = mockProvider.generateStructured.mock.calls[0][0];
    expect(callArgs.schemaName).toBe("ziwei_comprehensive_report_content_v2");

    // Verify safe facts payload has zero raw birth date/time/location PII
    const userPayload = JSON.parse(callArgs.user);
    expect(userPayload.facts.natal).toBeDefined();
    expect(userPayload.facts.timing).toBeDefined();
    const serialized = JSON.stringify(userPayload);
    expect(serialized).not.toContain("1995-10-24");
    expect(serialized).not.toContain("10:30");
  });

  it("converts leaked customer-visible canonical identifiers into Vietnamese prose without leaking raw keys", async () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const generatedReport = createSampleV2GeneratedReport();
    generatedReport.overview.narrative = "Người này có ziwei.star.ziwei tọa thủ tại ziwei.palace.life mang lại uy danh, được ziwei.trans.hua_lu chiếu rọi và hỗ trợ bởi ziwei.custom_ns.unknown_token.";
    generatedReport.keyConfigurations[0]!.title = "Cách cục ziwei.star.ziwei";
    generatedReport.keyConfigurations[0]!.narrative = "Được ziwei.transformation.power nâng đỡ.";
    generatedReport.practicalDirection[0]!.recommendation = "Nên phát huy năng lực lãnh đạo của ziwei.star.ziwei.";

    const mockProvider = {
      id: "mock-ai",
      modelId: "mock-model",
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: generatedReport,
          providerId: "mock-ai",
          modelId: "mock-model",
        },
      }),
    };

    const result = await writeComprehensiveZiweiReportV4({
      facts,
      knowledgePacks: [],
      provider: mockProvider as never,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const report = result.value.report;
    expect(report.overview.narrative).not.toContain("ziwei.star.ziwei");
    expect(report.overview.narrative).not.toContain("ziwei.palace.life");
    expect(report.overview.narrative).not.toContain("ziwei.trans.hua_lu");
    expect(report.overview.narrative).not.toContain("ziwei.custom_ns.unknown_token");
    expect(report.overview.narrative).toContain("sao Tử Vi");
    expect(report.overview.narrative).toContain("cung Mệnh");
    expect(report.overview.narrative).toContain("Hóa Lộc");
    expect(report.overview.narrative).toContain("yếu tố Tử Vi");

    expect(report.keyConfigurations[0]!.title).toContain("sao Tử Vi");
    expect(report.keyConfigurations[0]!.narrative).toContain("Hóa Quyền");
    expect(report.practicalDirection[0]!.recommendation).toContain("sao Tử Vi");

    // Structural evidenceKeys must remain intact
    expect(report.overview.evidenceKeys).toEqual(["natal.ziwei.palace.life"]);
  });

  it("passes bounded revision input into the writer call without raw PII", async () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);
    const priorReport = createSampleV2GeneratedReport();

    const mockProvider = {
      id: "mock-ai",
      modelId: "mock-model",
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: createSampleV2GeneratedReport(),
          providerId: "mock-ai",
          modelId: "mock-model",
        },
      }),
    };

    const longIssue = "Lỗi độ dài: " + "a".repeat(400);
    const manyIssues = [
      "Issue 1", "Issue 2", "Issue 3", "Issue 4",
      "Issue 5", "Issue 6", "Issue 7", "Issue 8",
      "Issue 9 - should be truncated",
    ];

    const result = await writeComprehensiveZiweiReportV4({
      facts,
      knowledgePacks: [],
      provider: mockProvider as never,
      revision: {
        priorContent: priorReport,
        issues: [...manyIssues, longIssue],
      },
    });

    expect(result.ok).toBe(true);
    expect(mockProvider.generateStructured).toHaveBeenCalledTimes(1);

    const callArgs = mockProvider.generateStructured.mock.calls[0][0];
    expect(callArgs.system).toContain("YÊU CẦU HIỆU CHỈNH / VIẾT LẠI");
    expect(callArgs.system).toContain("lasoviet.net");

    const userPayload = JSON.parse(callArgs.user);
    expect(userPayload.revision).toBeDefined();
    expect(userPayload.revision.priorReport).toBeDefined();
    // Bounded to max 8 issues
    expect(userPayload.revision.issues.length).toBeLessThanOrEqual(8);
    // Bounded to max 300 chars per issue
    for (const issue of userPayload.revision.issues) {
      expect(issue.length).toBeLessThanOrEqual(300);
    }

    // Zero raw PII
    const serialized = JSON.stringify(userPayload);
    expect(serialized).not.toContain("1995-10-24");
    expect(serialized).not.toContain("10:30");
  });

  it("enforces updated system prompt: lasoviet.net domain, in-context referral encouraged, standalone disclaimer prohibited", async () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const mockProvider = {
      id: "mock-ai",
      modelId: "mock-model",
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: createSampleV2GeneratedReport(),
          providerId: "mock-ai",
          modelId: "mock-model",
        },
      }),
    };

    await writeComprehensiveZiweiReportV4({
      facts,
      knowledgePacks: [],
      provider: mockProvider as never,
    });

    const callArgs = mockProvider.generateStructured.mock.calls[0][0];
    expect(callArgs.system).toContain("lasoviet.net");
    expect(callArgs.system).not.toContain("lasoviet.vn");
    // Encourages in-context professional advice
    expect(callArgs.system).toContain("bác sĩ, luật sư hoặc chuyên gia");
    // Prohibits standalone disclaimer blocks
    expect(callArgs.system).toContain("KHÔNG đưa vào các khối văn bản hoặc nhãn tuyên bố miễn trừ trách nhiệm đứng riêng");
  });

});
