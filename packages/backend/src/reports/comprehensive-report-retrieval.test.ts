
import { describe, expect, it, vi } from "vitest";
import type { NormalizedZiweiChartV1, ZiweiPalaceId } from "@lasoviet/contracts";
import {
  buildComprehensiveKnowledgePacks,
  type ZiweiReportKnowledgePack,
} from "./comprehensive-report-retrieval.js";
import {
  createKnowledgeRetrievalService,
  type KnowledgePassageV1,
  type ZiweiKnowledgeQueryV3,
} from "../knowledge/knowledge-retrieval.service.js";
import {
  buildComprehensiveZiweiFacts,
} from "./comprehensive-ziwei-facts.js";

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
              {
                id: "ziwei.star.tianfu",
                brightness: "ziwei.brightness.prosperous",
                category: "major",
              },
            ]
          : id === "ziwei.palace.career"
            ? [
                {
                  id: "ziwei.star.wuqu",
                  brightness: "ziwei.brightness.exalted",
                  category: "major",
                },
              ]
            : [],
    })),
    transformations: [
      {
        starId: "ziwei.star.ziwei",
        id: "ziwei.transformation.power",
      },
      {
        starId: "ziwei.star.tianfu",
        id: "ziwei.transformation.prosperity",
      },
    ],
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

describe("retrieveZiweiKnowledge ranking and filtering", () => {
  it("ranks exact (palace + star) > palace-only > generic topic regardless of passage ID ordering", async () => {
    const genericPassage = {
      id: "row-gen",
      passage_id: "vi-chunk-aaa-generic",
      document_id: "doc-v3",
      discipline: "ziwei" as const,
      locale: "vi" as const,
      report_sections: ["identity_analysis"],
      knowledge_version: "ziwei.comprehensive.knowledge.v3",
      content: "Tổng quan các nguyên lý luận giải cơ bản.",
      content_hash: "hash-gen-001",
      source_attribution: "Lá Số Việt",
      permitted_use: "reference_rewrite" as const,
      metadata: {
        topics: ["overview"],
        palaces: [],
        stars: [],
        brightness: [],
        transformations: [],
        relations: [],
        patterns: [],
        sourceType: "modern" as const,
        languageOrigin: "vi" as const,
        priority: 1 as const,
      },
      rank: 0.1,
    };

    const palaceOnlyPassage = {
      id: "row-palace",
      passage_id: "vi-chunk-mmm-palace",
      document_id: "doc-v3",
      discipline: "ziwei" as const,
      locale: "vi" as const,
      report_sections: ["identity_analysis"],
      knowledge_version: "ziwei.comprehensive.knowledge.v3",
      content: "Cung Mệnh tại Dần là vị trí đắc địa của nhiều bộ sao.",
      content_hash: "hash-palace-002",
      source_attribution: "Lá Số Việt",
      permitted_use: "reference_rewrite" as const,
      metadata: {
        topics: ["personality"],
        palaces: ["ziwei.palace.life"],
        stars: [],
        brightness: [],
        transformations: [],
        relations: [],
        patterns: [],
        sourceType: "modern" as const,
        languageOrigin: "vi" as const,
        priority: 1 as const,
      },
      rank: 0.1,
    };

    const exactPassage = {
      id: "row-exact",
      passage_id: "vi-chunk-zzz-exact",
      document_id: "doc-v3",
      discipline: "ziwei" as const,
      locale: "vi" as const,
      report_sections: ["identity_analysis"],
      knowledge_version: "ziwei.comprehensive.knowledge.v3",
      content: "Tử Vi Thiên Phủ đồng cung tại Mệnh tọa Dần Thân.",
      content_hash: "hash-exact-003",
      source_attribution: "Lá Số Việt",
      permitted_use: "reference_rewrite" as const,
      metadata: {
        topics: ["personality"],
        palaces: ["ziwei.palace.life"],
        stars: ["ziwei.star.ziwei", "ziwei.star.tianfu"],
        brightness: ["ziwei.brightness.prosperous"],
        transformations: [],
        relations: [],
        patterns: [],
        sourceType: "classical" as const,
        languageOrigin: "vi" as const,
        priority: 2 as const,
      },
      rank: 0.1,
    };

    const mockDb = {
      execute: vi.fn().mockResolvedValue([
        genericPassage,
        palaceOnlyPassage,
        exactPassage,
      ]),
    } as any;

    const service = createKnowledgeRetrievalService({ database: mockDb });
    const query: ZiweiKnowledgeQueryV3 = {
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      palaceIds: ["ziwei.palace.life"],
      starIds: ["ziwei.star.ziwei"],
      topics: ["overview"],
      text: "menh tu vi thien phu",
      maxPassages: 5,
      maxTotalChars: 5000,
    };

    const passages = await service.retrieveZiweiKnowledge(query);

    expect(passages).toHaveLength(3);
    expect(passages[0]!.passageId).toBe("vi-chunk-zzz-exact");
    expect(passages[1]!.passageId).toBe("vi-chunk-mmm-palace");
    expect(passages[2]!.passageId).toBe("vi-chunk-aaa-generic");
  });

  it("deduplicates passages by contentHash then passageId", async () => {
    const p1 = {
      id: "row-1",
      passage_id: "chunk-01",
      document_id: "doc-v3",
      discipline: "ziwei" as const,
      locale: "vi" as const,
      report_sections: ["identity_analysis"],
      knowledge_version: "ziwei.comprehensive.knowledge.v3",
      content: "Nội dung trùng lặp A",
      content_hash: "same-content-hash",
      source_attribution: "Lá Số Việt",
      permitted_use: "reference_rewrite" as const,
      metadata: {
        topics: ["overview"],
        palaces: ["ziwei.palace.life"],
        stars: ["ziwei.star.ziwei"],
        brightness: [],
        transformations: [],
        relations: [],
        patterns: [],
        sourceType: "modern" as const,
        languageOrigin: "vi" as const,
        priority: 2 as const,
      },
      rank: 0.5,
    };

    const p2DuplicateHash = {
      ...p1,
      id: "row-2",
      passage_id: "chunk-02",
      content_hash: "same-content-hash",
      rank: 0.4,
    };

    const p3DuplicatePassageId = {
      ...p1,
      id: "row-3",
      passage_id: "chunk-01",
      content_hash: "different-hash",
      content: "Nội dung khác nhưng trùng passage_id",
      rank: 0.3,
    };

    const p4Unique = {
      id: "row-4",
      passage_id: "chunk-04",
      document_id: "doc-v3",
      discipline: "ziwei" as const,
      locale: "vi" as const,
      report_sections: ["identity_analysis"],
      knowledge_version: "ziwei.comprehensive.knowledge.v3",
      content: "Nội dung độc nhất",
      content_hash: "unique-hash-04",
      source_attribution: "Lá Số Việt",
      permitted_use: "reference_rewrite" as const,
      metadata: {
        topics: ["overview"],
        palaces: ["ziwei.palace.life"],
        stars: [],
        brightness: [],
        transformations: [],
        relations: [],
        patterns: [],
        sourceType: "modern" as const,
        languageOrigin: "vi" as const,
        priority: 1 as const,
      },
      rank: 0.2,
    };

    const mockDb = {
      execute: vi.fn().mockResolvedValue([p1, p2DuplicateHash, p3DuplicatePassageId, p4Unique]),
    } as any;

    const service = createKnowledgeRetrievalService({ database: mockDb });
    const passages = await service.retrieveZiweiKnowledge({
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      palaceIds: ["ziwei.palace.life"],
      text: "test",
      maxPassages: 10,
      maxTotalChars: 5000,
    });

    expect(passages).toHaveLength(2);
    expect(passages[0]!.passageId).toBe("chunk-01");
    expect(passages[1]!.passageId).toBe("chunk-04");
  });

  it("retrieval candidates 1200, 700, 600 with maxPassages 2 and maxTotalChars 1800 returns 1200 and 600", async () => {
    const c1 = {
      id: "row-c1",
      passage_id: "chunk-1200",
      document_id: "doc-v3",
      discipline: "ziwei" as const,
      locale: "vi" as const,
      report_sections: ["identity_analysis"],
      knowledge_version: "ziwei.comprehensive.knowledge.v3",
      content: "A".repeat(1200),
      content_hash: "hash-1200",
      source_attribution: "Lá Số Việt",
      permitted_use: "reference_rewrite" as const,
      metadata: {
        topics: ["overview"],
        palaces: ["ziwei.palace.life"],
        stars: ["ziwei.star.ziwei"],
        brightness: [],
        transformations: [],
        relations: [],
        patterns: [],
        sourceType: "modern" as const,
        languageOrigin: "vi" as const,
        priority: 3 as const,
      },
      rank: 0.9,
    };

    const c2 = {
      ...c1,
      id: "row-c2",
      passage_id: "chunk-700",
      content: "B".repeat(700),
      content_hash: "hash-700",
      metadata: {
        ...c1.metadata,
        priority: 2 as const,
      },
      rank: 0.8,
    };

    const c3 = {
      ...c1,
      id: "row-c3",
      passage_id: "chunk-600",
      content: "C".repeat(600),
      content_hash: "hash-600",
      metadata: {
        ...c1.metadata,
        priority: 1 as const,
      },
      rank: 0.7,
    };

    const mockDb = {
      execute: vi.fn().mockResolvedValue([c1, c2, c3]),
    } as any;

    const service = createKnowledgeRetrievalService({ database: mockDb });
    const passages = await service.retrieveZiweiKnowledge({
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      palaceIds: ["ziwei.palace.life"],
      starIds: ["ziwei.star.ziwei"],
      text: "test budget scanning",
      maxPassages: 2,
      maxTotalChars: 1800,
    });

    expect(passages).toHaveLength(2);
    expect(passages[0]!.passageId).toBe("chunk-1200");
    expect(passages[0]!.content.length).toBe(1200);
    expect(passages[1]!.passageId).toBe("chunk-600");
    expect(passages[1]!.content.length).toBe(600);
    expect(passages[0]!.content.length + passages[1]!.content.length).toBe(1800);
  });
});

describe("buildComprehensiveKnowledgePacks", () => {
  it("builds exactly 19 bounded packs with grounded evidenceKeys", async () => {
    const chart = createSampleChart();
    const facts = buildComprehensiveZiweiFacts(chart);

    const dummyPassage: KnowledgePassageV1 = {
      id: "id-1",
      passageId: "passage-test-01",
      documentId: "doc-1",
      discipline: "ziwei",
      locale: "vi",
      reportSections: ["identity_analysis"],
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      content: "Đoạn kiến thức mẫu thử nghiệm luận giải.",
      contentHash: "hash-01",
      sourceAttribution: "Lá Số Việt",
      permittedUse: "reference_rewrite",
      metadata: {
        topics: ["overview"],
        palaces: ["ziwei.palace.life"],
        stars: ["ziwei.star.ziwei"],
        brightness: ["ziwei.brightness.prosperous"],
        transformations: [],
        relations: [],
        patterns: [],
        sourceType: "classical",
        languageOrigin: "vi",
        priority: 2,
      },
    };

    const mockRetrieve = vi.fn().mockResolvedValue([dummyPassage]);

    const packs = await buildComprehensiveKnowledgePacks(facts, mockRetrieve);

    expect(packs).toHaveLength(19);

    const packIds = packs.map((p) => p.id);
    expect(packIds).toContain("core_temperament");
    for (const palace of facts.palaces) {
      expect(packIds).toContain("palace_" + palace.palaceId);
    }
    expect(packIds).toContain("patterns_transformations");
    expect(packIds).toContain("thematic_career_wealth");
    expect(packIds).toContain("thematic_relationships_family");
    expect(packIds).toContain("thematic_social_environment");
    expect(packIds).toContain("thematic_wellbeing_inner_resources");
    expect(packIds).toContain("final_synthesis");

    const factKeySet = new Set(facts.evidenceKeys);
    for (const pack of packs) {
      expect(pack.evidenceKeys.length).toBeGreaterThan(0);
      for (const key of pack.evidenceKeys) {
        expect(factKeySet.has(key)).toBe(true);
      }
    }

    for (const palace of facts.palaces) {
      const palacePack = packs.find((p) => p.id === "palace_" + palace.palaceId)!;
      expect(palacePack.passages.length).toBeLessThanOrEqual(2);
    }

    const totalChars = packs.reduce(
      (acc, pack) => acc + pack.passages.reduce((pAcc, p) => pAcc + p.content.length, 0),
      0,
    );
    expect(totalChars).toBeLessThanOrEqual(32_000);
  });

  it("enforces max 2 passages and 1,800 chars per palace pack and caps total collection at 32,000 chars", async () => {
    const chart = createSampleChart();
    const facts = buildComprehensiveZiweiFacts(chart);

    const longContent = "A".repeat(1_000);
    const mockRetrieve = vi.fn().mockResolvedValue([
      {
        id: "id-p1",
        passageId: "p1",
        content: longContent,
        contentHash: "h1",
        metadata: {
          topics: [],
          palaces: ["ziwei.palace.life"],
          stars: [],
          brightness: [],
          transformations: [],
          relations: [],
          patterns: [],
          sourceType: "modern" as const,
          languageOrigin: "vi" as const,
          priority: 1 as const,
        },
      },
      {
        id: "id-p2",
        passageId: "p2",
        content: longContent,
        contentHash: "h2",
        metadata: {
          topics: [],
          palaces: ["ziwei.palace.life"],
          stars: [],
          brightness: [],
          transformations: [],
          relations: [],
          patterns: [],
          sourceType: "modern" as const,
          languageOrigin: "vi" as const,
          priority: 1 as const,
        },
      },
      {
        id: "id-p3",
        passageId: "p3",
        content: longContent,
        contentHash: "h3",
        metadata: {
          topics: [],
          palaces: ["ziwei.palace.life"],
          stars: [],
          brightness: [],
          transformations: [],
          relations: [],
          patterns: [],
          sourceType: "modern" as const,
          languageOrigin: "vi" as const,
          priority: 1 as const,
        },
      },
    ]);

    const packs = await buildComprehensiveKnowledgePacks(facts, mockRetrieve);
    const lifePack = packs.find((p) => p.id === "palace_ziwei.palace.life")!;

    expect(lifePack.passages.length).toBeLessThanOrEqual(2);
    const lifeChars = lifePack.passages.reduce((acc, p) => acc + p.content.length, 0);
    expect(lifeChars).toBeLessThanOrEqual(1800);
  });

  it("near-total pack budget with first candidate 200 and second 100 under only 140 remaining includes 100 and remains <= 32000", async () => {
    const chart = createSampleChart();
    const facts = buildComprehensiveZiweiFacts(chart);

    let callCount = 0;
    const mockRetrieve = vi.fn().mockImplementation(async () => {
      callCount++;
      // First 18 packs: return 1 passage of 1,770 chars (18 * 1770 = 31,860 chars)
      if (callCount <= 18) {
        return [
          {
            id: "p-" + callCount,
            passageId: "passage-early-" + callCount,
            content: "X".repeat(1770),
            contentHash: "hash-early-" + callCount,
            metadata: {
              topics: [],
              palaces: [],
              stars: [],
              brightness: [],
              transformations: [],
              relations: [],
              patterns: [],
              sourceType: "modern" as const,
              languageOrigin: "vi" as const,
              priority: 1 as const,
            },
          },
        ];
      }
      // 19th pack (final_synthesis): candidate 1 is 200 chars, candidate 2 is 100 chars
      return [
        {
          id: "final-1",
          passageId: "final-passage-200",
          content: "Y".repeat(200),
          contentHash: "hash-final-200",
          metadata: {
            topics: ["synthesis"],
            palaces: [],
            stars: [],
            brightness: [],
            transformations: [],
            relations: [],
            patterns: [],
            sourceType: "modern" as const,
            languageOrigin: "vi" as const,
            priority: 2 as const,
          },
        },
        {
          id: "final-2",
          passageId: "final-passage-100",
          content: "Z".repeat(100),
          contentHash: "hash-final-100",
          metadata: {
            topics: ["synthesis"],
            palaces: [],
            stars: [],
            brightness: [],
            transformations: [],
            relations: [],
            patterns: [],
            sourceType: "modern" as const,
            languageOrigin: "vi" as const,
            priority: 1 as const,
          },
        },
      ];
    });

    const packs = await buildComprehensiveKnowledgePacks(facts, mockRetrieve);
    expect(packs).toHaveLength(19);

    const finalPack = packs.find((p) => p.id === "final_synthesis")!;
    expect(finalPack).toBeDefined();
    // Candidate 1 (200 chars) skipped because 31,860 + 200 > 32,000 (140 remaining).
    // Candidate 2 (100 chars) fits and is included because 31,860 + 100 <= 32,000.
    expect(finalPack.passages).toHaveLength(1);
    expect(finalPack.passages[0]!.passageId).toBe("final-passage-100");
    expect(finalPack.passages[0]!.content.length).toBe(100);

    const totalChars = packs.reduce(
      (acc, pack) => acc + pack.passages.reduce((pAcc, p) => pAcc + p.content.length, 0),
      0,
    );
    expect(totalChars).toBe(31960);
    expect(totalChars).toBeLessThanOrEqual(32000);
  });
});
