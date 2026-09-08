import { describe, expect, it } from "vitest";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import {
  buildFreeInsights,
  getDetailedEvidenceExplanation,
} from "./ziwei-free-insights";

const sampleChart: NormalizedZiweiChartV1 = {
  version: 1,
  systemId: "ziwei",
  palaces: [
    {
      id: "ziwei.palace.life",
      earthlyBranchId: "ziwei.branch.tiger",
      stars: [
        { id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted", category: "major" },
        { id: "ziwei.star.tianfu", brightness: "ziwei.brightness.prosperous", category: "major" },
        { id: "ziwei.star.zuofu", brightness: "ziwei.brightness.favorable", category: "minor" },
      ],
    },
    {
      id: "ziwei.palace.career",
      earthlyBranchId: "ziwei.branch.horse",
      stars: [
        { id: "ziwei.star.wuqu", brightness: "ziwei.brightness.favorable", category: "major" },
      ],
    },
    {
      id: "ziwei.palace.wealth",
      earthlyBranchId: "ziwei.branch.dog",
      stars: [
        { id: "ziwei.star.lianzhen", brightness: "ziwei.brightness.favorable", category: "major" },
      ],
    },
    {
      id: "ziwei.palace.travel",
      earthlyBranchId: "ziwei.branch.monkey",
      stars: [
        { id: "ziwei.star.qisha", brightness: "ziwei.brightness.exalted", category: "major" },
      ],
    },
    ...[
      "siblings", "spouse", "children", "health",
      "friends", "property", "fortune", "parents",
    ].map((name, index) => ({
      id: `ziwei.palace.${name}` as NormalizedZiweiChartV1["palaces"][number]["id"],
      earthlyBranchId: [
        "ziwei.branch.rat", "ziwei.branch.ox", "ziwei.branch.rabbit",
        "ziwei.branch.dragon", "ziwei.branch.snake", "ziwei.branch.goat",
        "ziwei.branch.rooster", "ziwei.branch.pig",
      ][index] as NormalizedZiweiChartV1["palaces"][number]["earthlyBranchId"],
      stars: [],
    })),
  ],
  transformations: [
    { starId: "ziwei.star.wuqu", id: "ziwei.transformation.prosperity" },
    { starId: "ziwei.star.taiyang", id: "ziwei.transformation.power" },
    { starId: "ziwei.star.wenchang", id: "ziwei.transformation.fame" },
    { starId: "ziwei.star.lianzhen", id: "ziwei.transformation.obstacle" },
  ],
  soulPalaceId: "ziwei.palace.life",
  bodyPalaceId: "ziwei.palace.career",
  horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }],
  warnings: [],
  provenance: {
    version: 1,
    engineId: "ziwei.iztro",
    engineVersion: "2.6.0",
    adapterId: "ziwei.iztro-adapter",
    adapterVersion: "1",
    schemaId: "ziwei.chart.v1",
    ruleSetId: "ziwei.default",
    inputHash: "a".repeat(64),
    configHash: "b".repeat(64),
    rawSnapshotHash: "c".repeat(64),
    calculatedAt: "2026-09-02T00:00:00+00:00",
    limitations: [],
  },
};

// Chart where Life Palace has NO major stars (Cung Mệnh vô chính diệu)
const noMajorStarChart: NormalizedZiweiChartV1 = {
  ...sampleChart,
  palaces: sampleChart.palaces.map((p) => {
    if (p.id === "ziwei.palace.life") {
      return {
        ...p,
        stars: [
          { id: "ziwei.star.zuofu", brightness: "ziwei.brightness.favorable", category: "minor" },
          { id: "ziwei.star.wenchang", brightness: "ziwei.brightness.prosperous", category: "minor" },
        ],
      };
    }
    return p;
  }),
};

describe("Zi Wei free insights presenter", () => {
  it("builds 3 deterministic preview insights in Vietnamese and English", () => {
    const vi = buildFreeInsights(sampleChart, "vi", "Minh An");
    const en = buildFreeInsights(sampleChart, "en", "Minh An");

    expect(vi.items).toHaveLength(3);
    expect(en.items).toHaveLength(3);

    // Identity item personalizes with user name
    expect(vi.items[0]?.description).toContain("Minh An");
    expect(en.items[0]?.description).toContain("Minh An");

    // All items have non-empty fields
    for (const item of vi.items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.starsSummary.length).toBeGreaterThan(0);
      expect(item.locationSummary.length).toBeGreaterThan(0);
    }

    // Signals are present
    expect(vi.overallStrength.title).toContain("Thế mạnh");
    expect(vi.areaWorthObserving.title).toContain("quan sát");
    expect(vi.overallStrength.description.length).toBeGreaterThan(0);
    expect(vi.areaWorthObserving.description.length).toBeGreaterThan(0);
    expect(vi.overallStrength.description).toContain("căn cứ để quan sát");
    expect(vi.overallStrength.description).not.toContain("cấu trúc ổn định");
    expect(vi.overallStrength.description).not.toContain("thế mạnh chuyên môn");
    expect(vi.overallStrength.description).not.toContain("ưu thế nổi bật");

    // Asserts calm language with zero fear/urgency tokens
    const fullText = JSON.stringify(vi);
    expect(fullText).not.toContain("tai nạn");
    expect(fullText).not.toContain("chết");
    expect(fullText).not.toContain("phá sản");
    expect(fullText).not.toContain("thảm họa");

    // Asserts corrected terminology
    expect(fullText).not.toContain("đắc Hóa Kỵ");
    expect(fullText).not.toContain("Tại sao");
    expect(vi.items[2]?.description).toContain("Sao Liêm Trinh Hóa Kỵ");
    expect(vi.areaWorthObserving.description).toContain("sao Liêm Trinh Hóa Kỵ");
  });

  it("handles Cung Mệnh vô chính diệu without falling back to fake Zi Wei star", () => {
    const vi = buildFreeInsights(noMajorStarChart, "vi", "Lan Huong");
    const en = buildFreeInsights(noMajorStarChart, "en", "Lan Huong");

    // MUST NOT contain fake Zi Wei star interpretation
    expect(vi.items[0]?.description).not.toContain("Tử Vi");
    expect(en.items[0]?.description).not.toContain("Zi Wei");

    // MUST contain explicit vô chính diệu wording
    expect(vi.items[0]?.description).toContain("vô chính diệu");
    expect(en.items[0]?.description).toContain("vô chính diệu");
    expect(vi.overallStrength.description).toContain("vô chính diệu");
    expect(vi.overallStrength.description).toContain("căn cứ để đối chiếu");
    expect(vi.overallStrength.description).not.toContain("ưu thế nổi bật");

    // Explanation must also indicate vô chính diệu
    const expVi = getDetailedEvidenceExplanation("ziwei.identity.life-palace", noMajorStarChart, "vi");
    expect(expVi.sections.plainMeaning.value).toContain("vô chính diệu");
    expect(expVi.sections.plainMeaning.value).not.toContain("Tử Vi");
  });

  it("produces human-readable evidence explanations without raw technical IDs", () => {
    const evidenceIds = [
      "ziwei.identity.life-palace",
      "ziwei.identity.body-palace",
      "ziwei.identity.transformations",
    ];

    for (const id of evidenceIds) {
      const expVi = getDetailedEvidenceExplanation(id, sampleChart, "vi");
      const expEn = getDetailedEvidenceExplanation(id, sampleChart, "en");

      for (const section of Object.values(expVi.sections)) {
        expect(section.label.length).toBeGreaterThan(0);
        expect(section.value.length).toBeGreaterThan(0);
        expect(section.value).not.toContain("ziwei.palace");
        expect(section.value).not.toContain("ziwei.star");
        expect(section.value).not.toContain("ziwei.transformation");
      }

      for (const section of Object.values(expEn.sections)) {
        expect(section.label.length).toBeGreaterThan(0);
        expect(section.value.length).toBeGreaterThan(0);
        expect(section.value).not.toContain("ziwei.palace");
        expect(section.value).not.toContain("ziwei.star");
        expect(section.value).not.toContain("ziwei.transformation");
      }
    }
  });
});
