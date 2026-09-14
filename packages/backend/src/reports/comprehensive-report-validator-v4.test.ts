import { describe, expect, it } from "vitest";
import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  type NormalizedZiweiChartV1,
  type ZiweiPalaceId,
} from "@lasoviet/contracts";

import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import { validateComprehensiveZiweiReportV4 } from "./comprehensive-report-validator-v4.js";

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

const palaceNarratives: Record<string, string> = {
  "ziwei.palace.life": "Cung Mệnh định hình nhân sinh quan độc lập, phong thái đĩnh đạc và bản lĩnh tự thân lập nghiệp.",
  "ziwei.palace.siblings": "Mối quan hệ anh chị em giữ được sự hòa thuận cơ bản, có sự trợ lực khi đối diện hoàn cảnh ngặt nghèo.",
  "ziwei.palace.spouse": "Hôn phối có trình độ chuyên môn tốt, là hậu phương vững chắc dù đôi khi có bất đồng quan điểm.",
  "ziwei.palace.children": "Hậu duệ thông minh, có xu hướng phát triển cá tính riêng từ sớm và cần phương pháp giáo dục kiên nhẫn.",
  "ziwei.palace.wealth": "Nguồn tài chính hình thành từ tích lũy chuyên môn bền bỉ, dòng tiền ổn định hơn là đầu cơ mạo hiểm.",
  "ziwei.palace.health": "Thể trạng tương đối tốt nhưng cần lưu ý hệ tiêu hóa và duy trì nhịp độ sinh hoạt điều độ.",
  "ziwei.palace.travel": "Không gian bên ngoài mở ra nhiều cơ hội hợp tác giá trị, đi xa được nhiều quý nhân tương trợ.",
  "ziwei.palace.friends": "Mạng lưới bạn bè và đồng nghiệp đáng tin cậy, hỗ trợ đắc lực trong những thời điểm then chốt.",
  "ziwei.palace.career": "Đường quan lộ hanh thông nhờ năng lực chuyên môn sâu và tác phong làm việc bài bản, chỉn chu.",
  "ziwei.palace.property": "Cơ ngơi điền sản gia tăng theo thời gian, có duyên gìn giữ đất đai hoặc bất động sản ổn định.",
  "ziwei.palace.fortune": "Đời sống tinh thần an định, có chiều sâu tâm tưởng và khả năng tự cân bằng trước nghịch cảnh.",
  "ziwei.palace.parents": "Song thân là tấm gương lớn về đạo đức, tạo nền tảng giáo dưỡng gia đình chu đáo từ thuở ấu thơ.",
};

const thematicNarratives: Record<string, string> = {
  career_wealth: "Sự kết hợp giữa tài năng điều hành và kiểm soát tài chính mang lại lợi thế cạnh tranh dài hạn.",
  relationships_family: "Nền tảng gia đình vững chắc tạo bệ phóng tinh thần cho mọi nỗ lực ngoài xã hội.",
  social_environment: "Môi trường làm việc mở rộng giúp tiếp cận các nguồn lực tri thức và đối tác uy tín.",
  wellbeing_inner_resources: "Nội lực bền bỉ giúp hóa giải áp lực bên ngoài, duy trì sức khỏe thể chất và tâm lý an nhiên.",
};

function createValidReport(facts: ReturnType<typeof buildComprehensiveZiweiFactsV4>) {
  const lifeKey = facts.evidenceKeys.find((k) => k.includes("life")) || facts.evidenceKeys[0]!;
  const decadalKey = facts.evidenceKeys.find((k) => k.includes("decadal")) || facts.evidenceKeys[0]!;
  const annualKey = facts.evidenceKeys.find((k) => k.includes("annual")) || facts.evidenceKeys[0]!;

  return {
    overview: {
      title: "Tổng quan lá số",
      narrative: "Tổng quan cuộc đời vững chắc.",
      evidenceKeys: [lifeKey],
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Trục Mệnh Thân kiên định và tự chủ.",
      evidenceKeys: [lifeKey],
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Vi",
        narrative: "Tử Vi tọa thủ đem lại vị thế lãnh đạo.",
        evidenceKeys: [lifeKey],
      },
    ],
    palaceReadings: palaceIds.map((palaceId) => {
      const matchKey = facts.evidenceKeys.find((k) => k.includes(palaceId)) || lifeKey;
      return {
        palaceId,
        title: "Luận giải cung",
        narrative: palaceNarratives[palaceId] || "Nội dung cung riêng biệt.",
        evidenceKeys: [matchKey],
      };
    }),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: "Tổng hợp chuyên đề",
      narrative: thematicNarratives[id] || "Nội dung tổng hợp sâu sắc.",
      evidenceKeys: [lifeKey],
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Điểm mạnh phát huy tối đa, chú ý khắc phục vướng mắc.",
      evidenceKeys: [lifeKey],
    },
    currentDecadal: {
      title: "Đại vận hiện hành",
      state: "active" as const,
      index: 2,
      ageRange: [22, 31] as [number, number],
      yearRange: [2022, 2031] as [number, number],
      narrative: "Giai đoạn 10 năm chuyển biến thuận lợi.",
      evidenceKeys: [decadalKey],
    },
    annualSnapshot: {
      title: "Lưu niên năm 2026",
      targetYear: 2026,
      asOfDate: "2026-09-12",
      narrative: "Năm 2026 có nhiều cơ hội để củng cố vị thế.",
      evidenceKeys: [annualKey],
    },
    practicalDirection: [
      {
        recommendation: "Tập trung phát triển năng lực chuyên môn cốt lõi.",
        rationale: "Mệnh vững vàng cần kiến thức chuyên sâu để bứt phá.",
        avoid: "Tránh các quyết định vội vàng khi thiếu thông tin.",
        evidenceKeys: [lifeKey],
      },
      {
        recommendation: "Xây dựng mối quan hệ cộng sự minh bạch.",
        rationale: "Hỗ trợ đồng nghiệp đem lại lợi ích bền vững.",
        avoid: "Tránh hành động đơn độc trong dự án lớn.",
        evidenceKeys: [lifeKey],
      },
      {
        recommendation: "Giữ vững kỷ luật quản lý tài chính cá nhân.",
        rationale: "Tích lũy tài sản cho chu kỳ phát triển kế tiếp.",
        avoid: "Tránh các khoản đầu cơ mạo hiểm ngắn hạn.",
        evidenceKeys: [lifeKey],
      },
    ],
  };
}

describe("validateComprehensiveZiweiReportV4", () => {
  it("validates a compliant V4 report successfully", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);
    const report = createValidReport(facts);

    const result = validateComprehensiveZiweiReportV4(report, facts);
    expect(result.ok).toBe(true);
  });

  it("strictly rejects if birthTimeSensitivity is present", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);
    const report = {
      ...createValidReport(facts),
      birthTimeSensitivity: {
        title: "Độ nhạy",
        stableFactors: { title: "Ổn định", narrative: "Ổn định", evidenceKeys: [facts.evidenceKeys[0]!] },
        sensitiveFactors: { title: "Nhạy cảm", narrative: "Nhạy cảm", evidenceKeys: [facts.evidenceKeys[0]!] },
      },
    };

    const result = validateComprehensiveZiweiReportV4(report, facts);
    expect(result.ok).toBe(false);
    expect(result.errors?.[0]).toContain("birthTimeSensitivity");
  });

  it("rejects unknown evidence keys not in facts", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);
    const report = createValidReport(facts);
    report.overview.evidenceKeys.push("fabricated.key.not.in.facts");

    const result = validateComprehensiveZiweiReportV4(report, facts);
    expect(result.ok).toBe(false);
    expect(result.errors?.some((e) => e.includes("fabricated.key.not.in.facts"))).toBe(true);
  });

  it("rejects frozen timing discrepancies", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    // Target year mismatch
    const badAnnual = createValidReport(facts);
    badAnnual.annualSnapshot.targetYear = 2027;
    badAnnual.annualSnapshot.asOfDate = "2027-09-12";
    const result1 = validateComprehensiveZiweiReportV4(badAnnual, facts);
    expect(result1.ok).toBe(false);
    expect(result1.errors?.some((e) => e.includes("targetYear mismatch"))).toBe(true);

    // AsOfDate mismatch
    const badDate = createValidReport(facts);
    badDate.annualSnapshot.asOfDate = "2026-01-01";
    const result2 = validateComprehensiveZiweiReportV4(badDate, facts);
    expect(result2.ok).toBe(false);
    expect(result2.errors?.some((e) => e.includes("asOfDate mismatch"))).toBe(true);

    // Decadal index mismatch
    const badDecadal = createValidReport(facts);
    badDecadal.currentDecadal.index = 3;
    const result3 = validateComprehensiveZiweiReportV4(badDecadal, facts);
    expect(result3.ok).toBe(false);
    expect(result3.errors?.some((e) => e.includes("currentDecadal index mismatch"))).toBe(true);
  });

  it("rejects prohibited phrases (AI persona, disclaimer, English brightness)", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    // AI persona
    const aiReport = createValidReport(facts);
    aiReport.overview.narrative = "Tôi là AI sẽ phân tích lá số cho bạn.";
    expect(validateComprehensiveZiweiReportV4(aiReport, facts).ok).toBe(false);

    // Disclaimer
    const disclaimerReport = createValidReport(facts);
    disclaimerReport.overview.narrative = "Đây là tuyên bố miễn trừ trách nhiệm y tế.";
    expect(validateComprehensiveZiweiReportV4(disclaimerReport, facts).ok).toBe(false);

    // English brightness
    const englishReport = createValidReport(facts);
    englishReport.overview.narrative = "Sao Tử Vi đang ở trạng thái prosperous rực rỡ.";
    expect(validateComprehensiveZiweiReportV4(englishReport, facts).ok).toBe(false);
  });

  it("enforces 3-5 action items in practicalDirection", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot();
    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const report2 = createValidReport(facts);
    report2.practicalDirection.pop(); // now 2
    expect(validateComprehensiveZiweiReportV4(report2, facts).ok).toBe(false);
  });

  describe("Kaneo LSV-29 regression cases & safety boundary", () => {
    it("case 1: passes fatalistic false positive when bad outcome is framed as risk/possibility/prevention target", () => {
      const chart = createSampleChart();
      const snapshot = createSampleSnapshot();
      const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

      const approvedPassCases = [
        "Trong các kế hoạch quan trọng, bạn nên chắc chắn đọc kỹ hợp đồng và kiểm tra hồ sơ, vì sự chủ quan dễ dẫn tới nguy cơ phá sản.",
        "Bạn cần chắc chắn hỏi ý kiến bác sĩ trước khi đầu tư để tránh nguy cơ phá sản.",
        "Bạn nên chắc chắn tham khảo ý kiến luật sư trước khi ký hợp đồng lớn để tránh nguy cơ phá sản.",
        "Bạn nên chắc chắn kiểm tra để tránh phá sản.",
        "Bạn cần chắc chắn chuẩn bị kỹ càng để hạn chế rủi ro phá sản.",
      ];

      for (const text of approvedPassCases) {
        const report = createValidReport(facts);
        report.overview.narrative = text;
        const result = validateComprehensiveZiweiReportV4(report, facts);
        expect(result.ok).toBe(true);
      }
    });

    it('case 1-override: explicit "không tránh khỏi" overrides prevention wording and remains rejected', () => {
      const chart = createSampleChart();
      const snapshot = createSampleSnapshot();
      const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

      const overrideFailCases = [
        "Bạn chắc chắn không tránh khỏi phá sản.",
        "Bạn chắc chắn không tránh khỏi nguy cơ phá sản.",
        "Dù đã cố gắng, bạn chắc chắn không tránh khỏi rủi ro phá sản.",
      ];

      for (const text of overrideFailCases) {
        const report = createValidReport(facts);
        report.overview.narrative = text;
        const result = validateComprehensiveZiweiReportV4(report, facts);
        expect(result.ok).toBe(false);
        expect(result.errors?.some((e) => e.includes("fatalistic"))).toBe(true);
      }
    });

    it("case 1b: strictly rejects all 4 Terra-specified fatalistic certainty variants occurring in the same sentence", () => {
      const chart = createSampleChart();
      const snapshot = createSampleSnapshot();
      const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

      const requiredFailCases = [
        "Bạn chắc chắn sẽ gặp một tai nạn nghiêm trọng.",
        "Chắc chắn rồi bạn sẽ phá sản.",
        "Bạn chắc chắn rằng sẽ phá sản.",
        "Bạn chắc chắn không tránh khỏi phá sản.",
      ];

      for (const text of requiredFailCases) {
        const report = createValidReport(facts);
        report.overview.narrative = text;
        const result = validateComprehensiveZiweiReportV4(report, facts);
        expect(result.ok).toBe(false);
        expect(result.errors?.some((e) => e.includes("fatalistic"))).toBe(true);
      }
    });

    it("case 2: sanitizes leaked raw ziwei technical identifiers including ziwei.trans.hua_lu and unknown tokens without failing", () => {
      const chart = createSampleChart();
      const snapshot = createSampleSnapshot();
      const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);
      const report = createValidReport(facts);
      report.overview.narrative =
        "Sao Tử Vi (ziwei.star.ziwei) tọa thủ tại ziwei.palace.life, đắc lực nhờ ziwei.trans.hua_lu và được bổ trợ bởi ziwei.custom_ns.unknown_token.";

      const result = validateComprehensiveZiweiReportV4(report, facts);
      expect(result.ok).toBe(true);
      expect(report.overview.narrative).not.toContain("ziwei.star.ziwei");
      expect(report.overview.narrative).not.toContain("ziwei.palace.life");
      expect(report.overview.narrative).not.toContain("ziwei.trans.hua_lu");
      expect(report.overview.narrative).not.toContain("ziwei.custom_ns.unknown_token");

      expect(report.overview.narrative).toContain("sao Tử Vi");
      expect(report.overview.narrative).toContain("cung Mệnh");
      expect(report.overview.narrative).toContain("Hóa Lộc");
      expect(report.overview.narrative).toContain("yếu tố Tử Vi");

      // Evidence keys must remain untouched
      expect(report.overview.evidenceKeys).toEqual([facts.evidenceKeys[0]!]);
    });

    it("case 3: passes short practical-action near-duplicates across items", () => {
      const chart = createSampleChart();
      const snapshot = createSampleSnapshot();
      const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);
      const report = createValidReport(facts);
      report.practicalDirection[0]!.avoid =
        "Tránh đưa ra quyết định tài chính lớn khi chưa cân nhắc kỹ càng.";
      report.practicalDirection[1]!.avoid =
        "Tránh đưa ra quyết định đầu tư lớn khi chưa cân nhắc kỹ càng.";

      const result = validateComprehensiveZiweiReportV4(report, facts);
      expect(result.ok).toBe(true);
    });

    it("case 4: passes similarly structured no-major-star palace texts across distinct palaces but rejects exact duplicate", () => {
      const chart = createSampleChart();
      const snapshot = createSampleSnapshot();
      const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);
      const report = createValidReport(facts);

      const healthPalace = report.palaceReadings.find((p) => p.palaceId === "ziwei.palace.health")!;
      const friendsPalace = report.palaceReadings.find((p) => p.palaceId === "ziwei.palace.friends")!;

      healthPalace.narrative =
        "Cung Tật Ách không có chính tinh tọa thủ, cần mượn lực từ cung đối diện là Phụ Mẫu để bồi đắp sức khỏe tự nhiên và duy trì thể trạng an định lâu dài.";
      friendsPalace.narrative =
        "Cung Nô Bộc không có chính tinh tọa thủ, cần mượn lực từ cung đối diện là Huynh Đệ để bồi đắp mạng lưới bạn bè và duy trì quan hệ xã hội bền lâu.";

      const result = validateComprehensiveZiweiReportV4(report, facts);
      expect(result.ok).toBe(true);

      // Exact duplicate substantive narratives must still fail
      friendsPalace.narrative = healthPalace.narrative;
      const dupResult = validateComprehensiveZiweiReportV4(report, facts);
      expect(dupResult.ok).toBe(false);
      expect(dupResult.errors?.some((e) => e.includes("Duplicate narrative paragraph"))).toBe(true);
    });

    it("case 5: rejects methodology disclosure labels", () => {
      const chart = createSampleChart();
      const snapshot = createSampleSnapshot();
      const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);
      const report = createValidReport(facts);
      report.overview.narrative =
        "Theo phương pháp luận Tử Vi truyền thống, chúng tôi phân tích các dữ kiện dựa trên dữ liệu đầu vào.";

      const result = validateComprehensiveZiweiReportV4(report, facts);
      expect(result.ok).toBe(false);
      expect(result.errors?.some((e) => e.includes("methodology or process disclosure"))).toBe(true);
    });

    it("case 6: passes in-context doctor and lawyer advice", () => {
      const chart = createSampleChart();
      const snapshot = createSampleSnapshot();
      const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);
      const report = createValidReport(facts);
      report.overview.narrative =
        "Khi đối mặt với các vấn đề thể chất hoặc thủ tục giấy tờ lớn, bạn hãy hỏi ý kiến bác sĩ hoặc luật sư chuyên trách, điều này không thay thế tư vấn pháp lý chuyên nghiệp.";

      const result = validateComprehensiveZiweiReportV4(report, facts);
      expect(result.ok).toBe(true);
    });

    it("case 7: rejects standalone disclaimer labels", () => {
      const chart = createSampleChart();
      const snapshot = createSampleSnapshot();
      const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

      const viReport = createValidReport(facts);
      viReport.overview.narrative = "Tuyên bố miễn trừ trách nhiệm: Tài liệu chỉ có tính chất tham khảo cá nhân.";
      const viResult = validateComprehensiveZiweiReportV4(viReport, facts);
      expect(viResult.ok).toBe(false);
      expect(viResult.errors?.some((e) => e.includes("disclaimer"))).toBe(true);

      const enReport = createValidReport(facts);
      enReport.overview.narrative = "Disclaimer: This reading is for self-reflection purposes only.";
      const enResult = validateComprehensiveZiweiReportV4(enReport, facts);
      expect(enResult.ok).toBe(false);
      expect(enResult.errors?.some((e) => e.includes("disclaimer"))).toBe(true);
    });
  });

});
