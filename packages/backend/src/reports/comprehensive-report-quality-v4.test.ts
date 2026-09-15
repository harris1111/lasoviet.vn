import { describe, expect, it } from "vitest";
import {
  type NormalizedZiweiChartV1,
  type ReportSourceSnapshotV1,
  type ZiweiPalaceId,
} from "@lasoviet/contracts";

import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  COMPREHENSIVE_REPORT_QUALITY_FINDING_CODES_V4,
  countVietnameseSyllables,
  validateComprehensiveReportSectionQualityV4,
} from "./comprehensive-report-quality-v4.js";

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

function buildFacts(
  starsByPalace: Partial<Record<ZiweiPalaceId, Array<{ id: string; category?: string }>>> = {},
) {
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
      stars: (starsByPalace[id] ?? (
        id === "ziwei.palace.life"
          ? [
              { id: "ziwei.star.ziwei", category: "major" },
              { id: "ziwei.star.tianfu", category: "major" },
            ]
          : []
      )).map((star) => ({
        ...star,
        brightness: "ziwei.brightness.prosperous",
      })) as NormalizedZiweiChartV1["palaces"][number]["stars"],
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
          ageRange: [22, 31],
          yearRange: [2022, 2031],
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

const facts = buildFacts();

function evidenceKeyFor(factId: string): string {
  return facts.evidence.items.find((item) => item.sourceKeys.includes(factId))!.key;
}

function prose(words: number, suffix = "cung Mệnh sao Tử Vi sao Thiên Phủ"): string {
  return `${Array.from({ length: words }, () => "nội dung").join(" ")} ${suffix}`;
}

function gate(overrides: Record<string, unknown> = {}, customFacts = facts) {
  return validateComprehensiveReportSectionQualityV4({
    key: "overview",
    kind: "overview",
    text: prose(610),
    evidenceKeys: [evidenceKeyFor("ziwei.star.ziwei"), evidenceKeyFor("ziwei.star.tianfu")],
    ...overrides,
  } as never, customFacts);
}

function expectFinding(result: ReturnType<typeof gate>, code: string): void {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.findings.some((item) => item.code === code)).toBe(true);
}

describe("comprehensive V4 section quality", () => {
  it("counts normalized whitespace-separated syllables", () => {
    expect(countVietnameseSyllables("một   hai\nba 紫微")).toBe(3);
  });

  it("rejects text below the syllable threshold", () => {
    const text = prose(295);
    expect(countVietnameseSyllables(text)).toBeLessThan(600);
    expectFinding(gate({ text }), "MINIMUM_SYLLABLES");
  });

  it.each([
    ["discouraged terms", `${prose(610)} cát tinh`, "DISCOURAGED_TERM"],
    ["death terms", `${prose(610)} tử vong`, "DEATH_TERM"],
    ["English brightness", `${prose(610)} prosperous`, "ENGLISH_BRIGHTNESS"],
    ["adverse date", `${prose(610)} tai nạn ngày 12 tháng 3, quỹ dự phòng và đọc kỹ hợp đồng`, "ADVERSE_DATE"],
    ["missing warning preparation", `${prose(610)} tai nạn và quỹ dự phòng`, "PREPARATION_FRAMING"],
  ])("rejects %s per section", (_name, text, code) => {
    expectFinding(gate({ text }), code);
  });

  it("detects Han ideographs from raw text even though normalized syllables exclude them", () => {
    const normalizedText = prose(610);
    const text = `${normalizedText} 紫微`;
    expect(countVietnameseSyllables(text)).toBe(countVietnameseSyllables(normalizedText));
    expectFinding(gate({ text }), "LOCALE_HAN");
  });

  it.each([
    "chắc chắn",
    "chắc chắn sẽ",
    "chac chan",
    "chac chan se",
    "không tránh khỏi",
    "khong tranh khoi",
    "không thể tránh",
    "khong the tranh",
    "định sẵn",
    "dinh san",
    "đại hoạ",
    "đại họa",
    "dai hoa",
    "đổi vận",
    "doi van",
    "chính xác 99%",
    "chinh xac 99%",
  ])("rejects required certainty form %s", (term) => {
    expectFinding(gate({ text: `${prose(610)} ${term}` }), "CERTAINTY");
  });

  it("permits Phu Thê and Tử Tức only as immediate palace proper names", () => {
    expect(gate({ text: `${prose(610)} cung Phu Thê và cung Tử Tức` }).ok).toBe(true);
    expectFinding(gate({ text: `${prose(610)} Phu Thê` }), "DISCOURAGED_TERM");
    expectFinding(gate({ text: `${prose(610)} Tử Tức` }), "DISCOURAGED_TERM");
  });

  it("enforces proper-name density and allows qualified preparation framing", () => {
    expectFinding(
      gate({ text: Array.from({ length: 610 }, () => "Tử Vi").join(" ") }),
      "PROPER_NAME_DENSITY",
    );
    expect(gate({
      text: `${prose(610)} tai nạn có thể xảy ra; hãy giữ quỹ dự phòng và đọc kỹ hợp đồng trước việc lớn.`,
    }).ok).toBe(true);
  });

  it.each([
    ["ziwei.star.zuofu", "Tả Phù"],
    ["ziwei.star.wenchang", "Văn Xương"],
  ])("counts the actual minor star %s in proper-name density", (starId, label) => {
    const factsWithMinor = buildFacts({
      "ziwei.palace.life": [
        { id: "ziwei.star.ziwei", category: "major" },
        { id: "ziwei.star.tianfu", category: "major" },
        { id: starId, category: "minor" },
      ],
    });
    const minorStarMentions = 100;
    const text = `${prose(300)} ${Array.from({ length: minorStarMentions }, () => label).join(" ")}`;
    const syllables = countVietnameseSyllables(text);
    const minorStarDensity = minorStarMentions / syllables * 100;
    expect(syllables).toBeGreaterThanOrEqual(600);
    expect(minorStarDensity).toBeGreaterThan(8);
    expectFinding(gate({ text }, factsWithMinor), "PROPER_NAME_DENSITY");
    expect(gate({ text }).ok).toBe(true);
  });

  it("anchors non-palace prose to distinct source-backed facts from referenced evidence items", () => {
    expect(gate({
      evidenceKeys: [
        evidenceKeyFor("ziwei.star.ziwei"),
        evidenceKeyFor("ziwei.star.tianfu"),
        "natal.ziwei.palace.life",
      ],
      text: prose(610, "sao Tử Vi sao Thiên Phủ"),
    }).ok).toBe(true);

    expectFinding(gate({
      evidenceKeys: [evidenceKeyFor("ziwei.star.ziwei"), evidenceKeyFor("ziwei.star.ziwei")],
      text: prose(610, "sao Tử Vi"),
    }), "EVIDENCE_ANCHORS");
  });

  it("enforces palace star anchors once per distinct actual star and proves no-major safely", () => {
    const duplicateStarFacts = buildFacts({
      "ziwei.palace.life": [
        { id: "ziwei.star.ziwei", category: "major" },
        { id: "ziwei.star.ziwei", category: "major" },
      ],
    });
    expectFinding(gate({
      key: "palace:life",
      kind: "palace",
      palaceId: "ziwei.palace.life",
      text: prose(460, "cung Mệnh sao Tử Vi"),
    }, duplicateStarFacts), "PALACE_ANCHORS");

    const missingCategoryFacts = buildFacts({
      "ziwei.palace.health": [{ id: "ziwei.star.ziwei" }],
    });
    expectFinding(gate({
      key: "palace:health",
      kind: "palace",
      palaceId: "ziwei.palace.health",
      text: prose(460, "cung Tật Ách không có chính tinh"),
    }, missingCategoryFacts), "PALACE_ANCHORS");

    expect(gate({
      key: "palace:health",
      kind: "palace",
      palaceId: "ziwei.palace.health",
      text: prose(460, "cung Tật Ách không có chính tinh"),
    }).ok).toBe(true);
  });

  it("uses a closed finding-code union and bounds section key, note, and count", () => {
    const result = gate({
      key: "x".repeat(400),
      text: `${prose(1)} cát tinh tử vong chắc chắn 紫微 prosperous tai nạn ngày 12 tháng 3`,
      evidenceKeys: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.findings.length).toBeLessThanOrEqual(12);
      expect(result.findings.every((item) => (
        COMPREHENSIVE_REPORT_QUALITY_FINDING_CODES_V4.includes(item.code) &&
        item.sectionKey.length <= 96 &&
        item.note.length <= 240
      ))).toBe(true);
    }
  });
});
