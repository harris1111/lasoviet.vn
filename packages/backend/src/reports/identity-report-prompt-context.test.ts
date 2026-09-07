import { describe, expect, it } from "vitest";
import {
  boundedKnowledge,
  buildLocalizedPromptFacts,
  buildSectionRetrievalQuery,
} from "./identity-report-prompt-context.js";

describe("identity report prompt context", () => {
  const sampleFacts: Record<string, unknown> = {
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    "palaces.ziwei.palace.life.earthlyBranchId": "ziwei.earthly-branch.yin",
    transformations: [
      { starId: "ziwei.star.wuqu", id: "ziwei.transformation.prosperity" },
      { starId: "ziwei.star.taiyang", id: "ziwei.transformation.power" },
      { starId: "ziwei.star.wenchang", id: "ziwei.transformation.fame" },
      { starId: "ziwei.star.wenqu", id: "ziwei.transformation.obstacle" },
    ],
    "provenance.ruleSetId": "ziwei.ruleset.default",
  };

  it("builds localized prompt facts without personal profile or private data", () => {
    const viFacts = buildLocalizedPromptFacts(sampleFacts, "vi");
    expect(viFacts).toMatchObject({
      soulPalace: expect.stringMatching(/Cung Mệnh/i),
      bodyPalace: expect.stringMatching(/Cung Quan Lộc/i),
      lifeBranch: expect.stringMatching(/Dần/i),
    });
    expect(JSON.stringify(viFacts)).toContain("Vũ Khúc");
    expect(JSON.stringify(viFacts)).toContain("Hóa Lộc");

    const enFacts = buildLocalizedPromptFacts(sampleFacts, "en");
    expect(enFacts).toMatchObject({
      soulPalace: expect.stringMatching(/Life Palace/i),
      bodyPalace: expect.stringMatching(/Career Palace/i),
      lifeBranch: expect.stringMatching(/Tiger/i),
    });
    expect(JSON.stringify(enFacts)).toContain("Wu Qu");
    expect(JSON.stringify(enFacts)).toContain("Prosperity");

    const rawString = JSON.stringify({ viFacts, enFacts });
    expect(rawString).not.toMatch(/birth|calendar|coordinate|latitude|longitude|email|userId|actorId/i);
  });

  it("builds section retrieval query combining section purpose and localized facts bounded to 512 chars", () => {
    const viQuery = buildSectionRetrievalQuery("personal_summary", "vi", sampleFacts);
    expect(viQuery).toContain("tóm tắt bản sắc cá nhân");
    expect(viQuery).toContain("Cung Mệnh");
    expect(viQuery.length).toBeLessThanOrEqual(512);

    const enQuery = buildSectionRetrievalQuery("primary_evidence", "en", sampleFacts);
    expect(enQuery).toContain("primary evidence");
    expect(enQuery).toContain("Life Palace");
    expect(enQuery.length).toBeLessThanOrEqual(512);

    expect(viQuery).not.toMatch(/birth|calendar|latitude|longitude|email/i);
  });

  it("bounds knowledge to at most 11 passages, 900 chars each, 9600 chars total in deterministic order while preserving metadata", () => {
    const passages = Array.from({ length: 15 }, (_, i) => ({
      id: `knowledge-${15 - i}`,
      passageId: `passage-${15 - i}`,
      content: `Passage content ${15 - i} `.repeat(60), // > 900 chars
      reportSections: ["personal_summary" as const],
      sourceAttribution: "Lá Số Việt Method Editorial Board",
    }));

    const bounded = boundedKnowledge(passages);

    expect(bounded.length).toBeLessThanOrEqual(11);
    expect(bounded[0].id).toBe("knowledge-1"); // deterministic sorted order
    expect(bounded[1].id).toBe("knowledge-2");

    let totalChars = 0;
    for (const p of bounded) {
      expect(p.content.length).toBeLessThanOrEqual(900);
      expect(p.reportSections).toEqual(["personal_summary"]);
      expect(p.sourceAttribution).toBe("Lá Số Việt Method Editorial Board");
      totalChars += p.content.length;
    }
    expect(totalChars).toBeLessThanOrEqual(9600);
  });
});
