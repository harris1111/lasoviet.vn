import { describe, expect, it } from "vitest";
import type {
  NormalizedZiweiChartV1,
  ReportSourceSnapshotV1,
  ZiweiPalaceId,
  ZiweiTopicDeepDiveContentV1,
} from "@lasoviet/contracts";

import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  validateZiweiTopicDeepDiveQualityV4,
} from "./topic-deep-dive-quality-v4.js";

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

function buildFactsFixture() {
  const chart: NormalizedZiweiChartV1 = {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id,
      earthlyBranchId: branches[index]!,
      heavenlyStemId: "ziwei.stem.jia",
      isBodyPalace: id === "ziwei.palace.career",
      isOriginalPalace: index === 0,
      cycleStateId: "ziwei.cycle.born",
      stars: (
        id === "ziwei.palace.spouse"
          ? [
              { id: "ziwei.star.tianfu", category: "major" },
              { id: "ziwei.star.wenchang", category: "minor" },
            ]
          : id === "ziwei.palace.career"
            ? [
                { id: "ziwei.star.ziwei", category: "major" },
                { id: "ziwei.star.tianxiang", category: "major" },
              ]
            : id === "ziwei.palace.wealth"
              ? [
                  { id: "ziwei.star.wuqu", category: "major" },
                  { id: "ziwei.star.taiyin", category: "major" },
                ]
              : id === "ziwei.palace.life"
                ? [
                    { id: "ziwei.star.taiyang", category: "major" },
                    { id: "ziwei.star.tianliang", category: "major" },
                  ]
                : [{ id: "ziwei.star.wenqu", category: "minor" }]
      ).map((star) => ({
        ...star,
        brightness: "ziwei.brightness.prosperous",
      })) as NormalizedZiweiChartV1["palaces"][number]["stars"],
    })),
    transformations: [{ starId: "ziwei.star.tianfu", id: "ziwei.transformation.power" }],
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

  const snapshot: ReportSourceSnapshotV1 = {
    version: 1,
    reportId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    chartVersionId: "chart-v1",
    asOfDate: "2026-09-12",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    snapshotHash: "c".repeat(64),
    snapshot: {
      version: 1,
      chartVersionId: "chart-v1",
      asOfDate: "2026-09-12",
      timezone: "Asia/Ho_Chi_Minh",
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      timing: {
        decadal: {
          state: "active",
          index: 2,
          ageRange: [24, 33],
          yearRange: [2024, 2033],
          palaceId: "ziwei.palace.fortune",
          heavenlyStemId: "ziwei.stem.yi",
          earthlyBranchId: "ziwei.branch.rabbit",
          palaces: chart.palaces.map((palace) => ({
            palaceId: palace.id,
            heavenlyStemId: "ziwei.stem.jia",
            earthlyBranchId: palace.earthlyBranchId,
            isOriginalPalace: palace.isOriginalPalace,
            cycleStateId: "ziwei.cycle.born",
            stars: palace.stars,
            transformations: [],
          })),
        },
        annual: {
          targetYear: 2026,
          palaceId: "ziwei.palace.career",
          heavenlyStemId: "ziwei.stem.bing",
          earthlyBranchId: "ziwei.branch.horse",
          palaces: chart.palaces.map((palace) => ({
            palaceId: palace.id,
            heavenlyStemId: "ziwei.stem.jia",
            earthlyBranchId: palace.earthlyBranchId,
            isOriginalPalace: palace.isOriginalPalace,
            cycleStateId: "ziwei.cycle.born",
            stars: palace.stars,
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
        selectedFrame: { position: "selected", vendorTimeIndex: 6, civilDateOffset: 0, frameId: "ziwei.time-frame.horse" },
        previousFrame: { position: "previous", vendorTimeIndex: 5, civilDateOffset: 0, frameId: "ziwei.time-frame.snake" },
        nextFrame: { position: "next", vendorTimeIndex: 7, civilDateOffset: 0, frameId: "ziwei.time-frame.goat" },
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

  return buildComprehensiveZiweiFactsV4(chart, snapshot);
}

function makeValidRelationshipReport(facts: ReturnType<typeof buildFactsFixture>): ZiweiTopicDeepDiveContentV1 {
  const pSpouseKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.palace.spouse"))?.key ?? facts.evidenceKeys[0]!;
  const pLifeKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.palace.life"))?.key ?? facts.evidenceKeys[1]!;
  const sTianfuKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.tianfu"))?.key ?? facts.evidenceKeys[0]!;
  const sTaiyangKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.taiyang"))?.key ?? facts.evidenceKeys[1]!;
  const sWenchangKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.wenchang"))?.key ?? facts.evidenceKeys[0]!;
  const decadalKey = facts.evidence.items.find((item) => item.dimension === "decadal")?.key ?? facts.evidenceKeys[0]!;

  return {
    topicId: "relationship_marriage",
    title: "Luận giải chuyên sâu Tình duyên & Hôn nhân",
    overview: {
      title: "Tổng quan bình diện tình cảm và duyên phối",
      narrative: `Trong cấu trúc lá số tổng thể, cung Mệnh và cung Phu Thê tạo lập trục tương tác nền tảng cho đời sống lứa đôi. Sự hiện diện của sao Thái Dương và sao Thiên Phủ mang lại xu hướng xây dựng mối quan hệ trên nền tảng tôn trọng và bình đẳng. Đương số coi trọng sự chân thành, tìm kiếm người bạn đời có cùng chí hướng phát triển và có khả năng sẻ chia sâu sắc trong mọi hoàn cảnh thực tế. Đây là nền tảng cốt lõi giúp tạo dựng đời sống hôn nhân vững vàng dài lâu. Khi đương số biết dung hòa cái tôi cá nhân, mối liên kết tình cảm sẽ càng trở nên thấu hiểu và gắn bó bền chặt hơn qua từng giai đoạn thời gian.`,
      evidenceKeys: [pSpouseKey, pLifeKey, sTaiyangKey, sTianfuKey],
    },
    palaceAnchors: [
      {
        palaceId: "ziwei.palace.spouse",
        title: "Cung Phu Thê: Khảo sát cấu trúc phối ngẫu",
        narrative: `Tại cung Phu Thê, tọa thủ của sao Thiên Phủ hội cùng sao Văn Xương tạo nên một kết cấu hài hòa và chỉn chu. Người bạn đời có thiên hướng đĩnh đạc, chu toàn, có tư duy quản lý tài chính và gia đạo mực thước. Sự hỗ trợ từ Văn Xương mang lại nét mềm mại trong ứng xử và năng lực giao tiếp tinh tế. Hai bên biết lắng nghe, tôn trọng không gian riêng và luôn đồng lòng trong các kế hoạch chung của cuộc sống gia đình dài hạn. Đây là vị trí cung mang lại sự an tâm và chở che lẫn nhau qua những thăng trầm của đời sống thường nhật.`,
        evidenceKeys: [pSpouseKey, sTianfuKey, sWenchangKey],
      },
    ],
    thematicDimensions: [
      {
        key: "emotional_needs",
        title: "Nhu cầu cảm xúc và phong cách gắn kết",
        narrative: `Bản chất của đương số khi bước vào quan hệ gắn bó là sự tín nhiệm và thẳng thắn. Ảnh hưởng từ sao Thái Dương chiếu cùng sao Thiên Phủ về trục phối ngẫu thôi thúc nhu cầu được ghi nhận và đồng hành. Trong đời sống thường nhật, đương số không đòi hỏi sự lãng mạn phô trương mà trân trọng những hành động quan tâm thực chất, sự chu đáo và minh bạch trong mọi suy nghĩ. Khi sự an tâm được thiết lập, đương số sẵn sàng cống hiến hết mình vì sự bình yên của mái ấm gia đình.`,
        evidenceKeys: [pLifeKey, sTaiyangKey, sTianfuKey],
      },
      {
        key: "relational_tensions",
        title: "Điểm nhạy cảm và cơ chế hóa giải bất đồng",
        narrative: `Điểm cần lưu tâm trong quan hệ lứa đôi là sự khác biệt về quan điểm thực tế và cái tôi cá nhân. Khi gặp áp lực công việc bên ngoài, đương số đôi khi có xu hướng tự giải quyết thay vì chia sẻ sớm, dễ tạo ra khoảng cách giao tiếp vô hình. Nhận diện rõ đặc tính này và thiết lập nguyên tắc trò chuyện cởi mở sẽ giúp loại bỏ mọi mầm mống hiểu lầm, biến thử thách thành cơ hội gắn kết sâu sắc hơn. Cung Mệnh có Thái Dương luôn hướng tới sự minh bạch.`,
        evidenceKeys: [pSpouseKey, pLifeKey, sTaiyangKey],
      },
    ],
    decadalTiming: {
      title: "Nhịp vận 10 năm hiện hành đối với hôn nhân",
      state: "active",
      index: 2,
      ageRange: [24, 33],
      yearRange: [2024, 2033],
      palaceId: "ziwei.palace.fortune",
      narrative: `Đại vận 24-33 tuổi tương ứng giai đoạn 2024-2033 tại cung Phúc Đức là thời kỳ trọng yếu cho việc kiện toàn đời sống nội tâm và các quyết định hôn nhân. Năng lượng đại vận hướng đương số đến sự chín chắn, thấu hiểu quy luật gắn kết và biết trân trọng giá trị gia đình. Mọi chuyển biến tình cảm trong chặng đường 10 năm này đều mang tính bản lề, đòi hỏi sự kiên nhẫn và cam kết trách nhiệm vững vàng từ cả hai phía.`,
      evidenceKeys: [decadalKey, pSpouseKey, sTianfuKey],
    },
    actions: [
      {
        recommendation: "Xây dựng thói quen đối thoại định kỳ hàng tuần một cách cởi mở và chân thành.",
        rationale: "Giúp giải tỏa kịp thời những áp lực vô hình và củng cố sự đồng điệu giữa hai bên.",
        avoid: "Tránh im lặng hoặc dồn nén cảm xúc tiêu cực kéo dài khi có bất đồng nảy sinh.",
        evidenceKeys: [pSpouseKey, sTianfuKey],
      },
      {
        recommendation: "Thống nhất rõ ràng các nguyên tắc quản lý tài chính và trách nhiệm gia đình.",
        rationale: "Sao Thiên Phủ chuộng sự minh bạch và có trật tự trong đời sống vật chất chung.",
        avoid: "Tránh các quyết định chi tiêu lớn bất ngờ mà chưa có sự đồng thuận từ bạn đời.",
        evidenceKeys: [pSpouseKey, sTianfuKey],
      },
      {
        recommendation: "Dành thời gian nuôi dưỡng sở thích chung và các hoạt động thư giãn cùng nhau.",
        rationale: "Tạo không gian tái tạo năng lượng tích cực cho mối quan hệ dài hạn.",
        avoid: "Tránh để guồng quay công việc lấn át toàn bộ thời gian chất lượng dành cho gia đình.",
        evidenceKeys: [pLifeKey, sTaiyangKey],
      },
    ],
  };
}

describe("validateZiweiTopicDeepDiveQualityV4", () => {
  const facts = buildFactsFixture();

  it("passes cleanly on compliant relationship deep dive", () => {
    const report = makeValidRelationshipReport(facts);
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 50,
      minPalaceAnchorSyllables: 50,
      minThematicDimensionSyllables: 50,
      minDecadalTimingSyllables: 50,
      minActionItemSyllables: 20,
      minTotalSyllables: 200,
    });
    expect(result.ok).toBe(true);
  });

  it("flags DEATH_TERM when prohibited death terms are present", () => {
    const report = makeValidRelationshipReport(facts);
    report.overview.narrative += " Số mệnh khắc chết bạn đời.";
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10,
      minPalaceAnchorSyllables: 10,
      minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10,
      minActionItemSyllables: 10,
      minTotalSyllables: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "DEATH_TERM")).toBe(true);
  });

  it("retains discouraged jargon as advisory without rejecting factual content", () => {
    const report = makeValidRelationshipReport(facts);
    report.actions[0]!.recommendation += " Gặp phải sát tinh chiếu mệnh.";
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10,
      minPalaceAnchorSyllables: 10,
      minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10,
      minActionItemSyllables: 10,
      minTotalSyllables: 50,
    });
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.advisory?.some((f) => f.code === "DISCOURAGED_TERM")).toBe(true);
  });

  it.each(["Nên mua bùa để giải hạn.", "Hãy cúng giải hạn.", "Số xổ số phù hợp là 12.", "Giải hạn bằng cách mua lễ dâng sao.", "Hóa giải vận hạn bằng lễ dâng sao.", "Hãy mua vòng phong thủy để cải vận.", "Hãy hóa giải vận hạn.", "Không nên lo lắng, hãy mua bùa chú."])("keeps FD089 advice hard alongside editorial findings: %s", text => {
    const report = makeValidRelationshipReport(facts);
    report.actions[0]!.recommendation += ` Bản mệnh. ${text}`;
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10, minPalaceAnchorSyllables: 10, minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10, minActionItemSyllables: 10, minTotalSyllables: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some(f => f.code === "CONTENT_LINE_VIOLATION")).toBe(true);
    expect(result.advisory?.some(f => f.code === "DISCOURAGED_TERM")).toBe(true);
  });

  it("flags CERTAINTY when pseudo-scientific certainty phrases are used", () => {
    const report = makeValidRelationshipReport(facts);
    report.overview.narrative += " Điều này chắc chắn sẽ xảy ra trong đời.";
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10,
      minPalaceAnchorSyllables: 10,
      minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10,
      minActionItemSyllables: 10,
      minTotalSyllables: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "CERTAINTY")).toBe(true);
  });

  it("keeps wrong evidence hard alongside editorial advice", () => {
    const report = makeValidRelationshipReport(facts);
    report.overview.narrative += " Bản mệnh cân nhắc.";
    report.overview.evidenceKeys = ["foreign-evidence"];
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10, minPalaceAnchorSyllables: 10, minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10, minActionItemSyllables: 10, minTotalSyllables: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some(f => f.code === "EVIDENCE_ANCHORS")).toBe(true);
    expect(result.advisory?.some(f => f.code === "DISCOURAGED_TERM")).toBe(true);
  });

  it("flags LOCALE_HAN when Han ideographs are detected", () => {
    const report = makeValidRelationshipReport(facts);
    report.overview.narrative += " 天府星 chiếu mệnh.";
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10,
      minPalaceAnchorSyllables: 10,
      minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10,
      minActionItemSyllables: 10,
      minTotalSyllables: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "LOCALE_HAN")).toBe(true);
  });

  it("flags ENGLISH_BRIGHTNESS when English brightness terms appear", () => {
    const report = makeValidRelationshipReport(facts);
    report.overview.narrative += " Sao ở trạng thái prosperous rực rỡ.";
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10,
      minPalaceAnchorSyllables: 10,
      minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10,
      minActionItemSyllables: 10,
      minTotalSyllables: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "ENGLISH_BRIGHTNESS")).toBe(true);
  });

  it("flags ADVERSE_DATE when uncomputed calendar dates are in misfortune context", () => {
    const report = makeValidRelationshipReport(facts);
    report.overview.narrative += " Cần đề phòng tai nạn vào ngày 15/8.";
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10,
      minPalaceAnchorSyllables: 10,
      minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10,
      minActionItemSyllables: 10,
      minTotalSyllables: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "ADVERSE_DATE")).toBe(true);
  });

  it("flags DECADAL_TIMING_MISMATCH when timing contradicts engine facts", () => {
    const report = makeValidRelationshipReport(facts);
    if (report.decadalTiming.state === "active") {
      report.decadalTiming.ageRange = [34, 43]; // engine is [24, 33]
      report.decadalTiming.yearRange = [2034, 2043];
    }
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10,
      minPalaceAnchorSyllables: 10,
      minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10,
      minActionItemSyllables: 10,
      minTotalSyllables: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "DECADAL_TIMING_MISMATCH")).toBe(true);
  });

  it("flags EVIDENCE_ANCHORS when unknown evidence keys are supplied", () => {
    const report = makeValidRelationshipReport(facts);
    report.overview.evidenceKeys.push("fake.evidence.key");
    const result = validateZiweiTopicDeepDiveQualityV4(report, facts, {
      minOverviewSyllables: 10,
      minPalaceAnchorSyllables: 10,
      minThematicDimensionSyllables: 10,
      minDecadalTimingSyllables: 10,
      minActionItemSyllables: 10,
      minTotalSyllables: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "EVIDENCE_ANCHORS")).toBe(true);
  });

  it("flags THEMATIC_OVERLAP when substantive copy is copied from thematicSynthesis", () => {
    const report = makeValidRelationshipReport(facts);
    const thematicText = "Trong cấu trúc lá số tổng thể, cung Mệnh và cung Phu Thê tạo lập trục tương tác nền tảng cho đời sống lứa đôi. Sự hiện diện của sao Thái Dương và sao Thiên Phủ mang lại xu hướng xây dựng mối quan hệ trên nền tảng tôn trọng và bình đẳng.";
    const result = validateZiweiTopicDeepDiveQualityV4(
      report,
      facts,
      {
        minOverviewSyllables: 10,
        minPalaceAnchorSyllables: 10,
        minThematicDimensionSyllables: 10,
        minDecadalTimingSyllables: 10,
        minActionItemSyllables: 10,
        minTotalSyllables: 50,
      },
      thematicText,
    );
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "THEMATIC_OVERLAP")).toBe(true);
  });
});
