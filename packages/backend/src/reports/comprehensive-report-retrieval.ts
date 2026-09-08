import type {
  KnowledgeChunkMetadataV1,
} from "../knowledge/knowledge-ingestion.service.js";
import {
  normalizeChunkMetadata,
} from "../knowledge/knowledge-ingestion.service.js";
import type {
  KnowledgePassageV1,
  ZiweiKnowledgeQueryV3,
} from "../knowledge/knowledge-retrieval.service.js";
import type {
  ComprehensiveZiweiFacts,
  ComprehensiveZiweiPalaceFact,
} from "./comprehensive-ziwei-facts.js";

export type ZiweiReportKnowledgePack = {
  id: string;
  evidenceKeys: string[];
  passages: Array<{
    passageId: string;
    content: string;
    metadata: KnowledgeChunkMetadataV1;
  }>;
};

type PackDefinition = {
  id: string;
  isPalacePack: boolean;
  candidateEvidenceKeys: string[];
  query: ZiweiKnowledgeQueryV3;
};

const THEMATIC_PALACES = {
  career_wealth: [
    "ziwei.palace.career",
    "ziwei.palace.wealth",
    "ziwei.palace.property",
    "ziwei.palace.life",
  ],
  relationships_family: [
    "ziwei.palace.spouse",
    "ziwei.palace.children",
    "ziwei.palace.parents",
    "ziwei.palace.siblings",
  ],
  social_environment: [
    "ziwei.palace.travel",
    "ziwei.palace.friends",
  ],
  wellbeing_inner_resources: [
    "ziwei.palace.health",
    "ziwei.palace.fortune",
    "ziwei.palace.life",
  ],
} as const;

function collectPalaceKeys(
  palace: ComprehensiveZiweiPalaceFact,
  transformations: ComprehensiveZiweiFacts["transformations"],
  patterns: ComprehensiveZiweiFacts["patterns"],
): string[] {
  const keys: string[] = [
    palace.palaceId,
    palace.earthlyBranchId,
    ...(palace.heavenlyStemId ? [palace.heavenlyStemId] : []),
    ...palace.stars.map((s) => s.id),
    ...palace.stars.map((s) => s.brightness).filter((b): b is NonNullable<typeof b> => Boolean(b)),
    ...palace.triadPalaceIds,
    palace.oppositePalaceId,
    ...palace.flankingPalaceIds,
    "ziwei.relation.triad",
    "ziwei.relation.opposition",
    "ziwei.relation.flanking",
  ];

  for (const t of transformations) {
    if (palace.stars.some((s) => s.id === t.starId)) {
      keys.push(t.id);
      keys.push(t.starId);
    }
  }

  for (const pattern of patterns) {
    if (pattern.palaceIds.includes(palace.palaceId)) {
      keys.push(pattern.id);
    }
  }

  return keys;
}

export async function buildComprehensiveKnowledgePacks(
  facts: ComprehensiveZiweiFacts,
  retrieve: (query: ZiweiKnowledgeQueryV3) => Promise<KnowledgePassageV1[]>,
): Promise<ZiweiReportKnowledgePack[]> {
  const lifePalace = facts.palaces.find((p) => p.isLifePalace) ?? facts.palaces[0]!;
  const bodyPalace = facts.palaces.find((p) => p.isBodyPalace) ?? lifePalace;

  const packDefinitions: PackDefinition[] = [];

  // 1. Core Mệnh/Thân pack
  const coreEvidenceKeys = [
    ...collectPalaceKeys(lifePalace, facts.transformations, facts.patterns),
    ...collectPalaceKeys(bodyPalace, facts.transformations, facts.patterns),
  ];
  packDefinitions.push({
    id: "core_temperament",
    isPalacePack: false,
    candidateEvidenceKeys: coreEvidenceKeys,
    query: {
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      palaceIds: [lifePalace.palaceId, bodyPalace.palaceId],
      starIds: [
        ...lifePalace.stars.map((s) => s.id),
        ...bodyPalace.stars.map((s) => s.id),
      ],
      topics: ["central_temperament", "overview"],
      text: "mệnh thân khí chất định hướng cốt lõi",
      maxPassages: 2,
      maxTotalChars: 1800,
    },
  });

  // 2 - 13. Twelve Palace packs
  for (const palace of facts.palaces) {
    const matchingTransformations = facts.transformations.filter((t) =>
      palace.stars.some((s) => s.id === t.starId),
    );
    const candidateKeys = collectPalaceKeys(palace, facts.transformations, facts.patterns);

    packDefinitions.push({
      id: "palace_" + palace.palaceId,
      isPalacePack: true,
      candidateEvidenceKeys: candidateKeys,
      query: {
        locale: "vi",
        knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        palaceIds: [palace.palaceId],
        starIds: palace.stars.map((s) => s.id),
        brightnessIds: palace.stars
          .map((s) => s.brightness)
          .filter((b): b is NonNullable<typeof b> => Boolean(b)),
        transformationIds: matchingTransformations.map((t) => t.id),
        relationIds: [
          "ziwei.relation.triad",
          "ziwei.relation.opposition",
          "ziwei.relation.flanking",
        ],
        text: "cung " + palace.palaceId + " sao " + palace.stars.map((s) => s.id).join(" "),
        maxPassages: 2,
        maxTotalChars: 1800,
      },
    });
  }

  // 14. Pattern & Tứ Hóa pack
  const patternKeys = [
    ...facts.patterns.map((p) => p.id),
    ...facts.transformations.map((t) => t.id),
    ...facts.transformations.map((t) => t.starId),
  ];
  packDefinitions.push({
    id: "patterns_transformations",
    isPalacePack: false,
    candidateEvidenceKeys: patternKeys,
    query: {
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      patternIds: facts.patterns.map((p) => p.id),
      transformationIds: facts.transformations.map((t) => t.id),
      starIds: facts.transformations.map((t) => t.starId),
      topics: ["pattern", "transformation"],
      text: "cách cục tứ hóa hóa lộc hóa quyền hóa khoa hóa kỵ",
      maxPassages: 2,
      maxTotalChars: 1800,
    },
  });

  // 15. Thematic: Career and wealth
  const careerWealthPalaces = facts.palaces.filter((p) =>
    THEMATIC_PALACES.career_wealth.includes(p.palaceId as any),
  );
  const careerWealthKeys = careerWealthPalaces.flatMap((p) =>
    collectPalaceKeys(p, facts.transformations, facts.patterns),
  );
  packDefinitions.push({
    id: "thematic_career_wealth",
    isPalacePack: false,
    candidateEvidenceKeys: careerWealthKeys,
    query: {
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      palaceIds: ["ziwei.palace.career", "ziwei.palace.wealth"],
      starIds: careerWealthPalaces.flatMap((p) => p.stars.map((s) => s.id)),
      topics: ["career", "wealth", "finance"],
      text: "sự nghiệp công danh tài lộc tài bạch quan lộc",
      maxPassages: 2,
      maxTotalChars: 1800,
    },
  });

  // 16. Thematic: Relationships and family
  const relPalaces = facts.palaces.filter((p) =>
    THEMATIC_PALACES.relationships_family.includes(p.palaceId as any),
  );
  const relKeys = relPalaces.flatMap((p) =>
    collectPalaceKeys(p, facts.transformations, facts.patterns),
  );
  packDefinitions.push({
    id: "thematic_relationships_family",
    isPalacePack: false,
    candidateEvidenceKeys: relKeys,
    query: {
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      palaceIds: [
        "ziwei.palace.spouse",
        "ziwei.palace.children",
        "ziwei.palace.parents",
        "ziwei.palace.siblings",
      ],
      starIds: relPalaces.flatMap((p) => p.stars.map((s) => s.id)),
      topics: ["relationship", "family", "marriage"],
      text: "phu thê tình duyên gia đạo phụ mẫu tử tức huynh đệ",
      maxPassages: 2,
      maxTotalChars: 1800,
    },
  });

  // 17. Thematic: Social environment
  const socialPalaces = facts.palaces.filter((p) =>
    THEMATIC_PALACES.social_environment.includes(p.palaceId as any),
  );
  const socialKeys = socialPalaces.flatMap((p) =>
    collectPalaceKeys(p, facts.transformations, facts.patterns),
  );
  packDefinitions.push({
    id: "thematic_social_environment",
    isPalacePack: false,
    candidateEvidenceKeys: socialKeys,
    query: {
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      palaceIds: ["ziwei.palace.travel", "ziwei.palace.friends"],
      starIds: socialPalaces.flatMap((p) => p.stars.map((s) => s.id)),
      topics: ["social", "environment", "travel"],
      text: "thiên di nô bộc môi trường giao tế quan hệ xã hội",
      maxPassages: 2,
      maxTotalChars: 1800,
    },
  });

  // 18. Thematic: Wellbeing and inner resources
  const wellbeingPalaces = facts.palaces.filter((p) =>
    THEMATIC_PALACES.wellbeing_inner_resources.includes(p.palaceId as any),
  );
  const wellbeingKeys = wellbeingPalaces.flatMap((p) =>
    collectPalaceKeys(p, facts.transformations, facts.patterns),
  );
  packDefinitions.push({
    id: "thematic_wellbeing_inner_resources",
    isPalacePack: false,
    candidateEvidenceKeys: wellbeingKeys,
    query: {
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      palaceIds: ["ziwei.palace.health", "ziwei.palace.fortune"],
      starIds: wellbeingPalaces.flatMap((p) => p.stars.map((s) => s.id)),
      topics: ["health", "wellbeing", "mind", "karma"],
      text: "tật ách phúc đức sức khỏe nội tâm tinh thần",
      maxPassages: 2,
      maxTotalChars: 1800,
    },
  });

  // 19. Final synthesis pack
  const synthesisKeys = [
    lifePalace.palaceId,
    bodyPalace.palaceId,
    ...facts.patterns.map((p) => p.id),
    ...facts.transformations.map((t) => t.id),
    ...lifePalace.stars.map((s) => s.id),
    ...bodyPalace.stars.map((s) => s.id),
  ];
  packDefinitions.push({
    id: "final_synthesis",
    isPalacePack: false,
    candidateEvidenceKeys: synthesisKeys,
    query: {
      locale: "vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      patternIds: facts.patterns.map((p) => p.id),
      transformationIds: facts.transformations.map((t) => t.id),
      topics: ["synthesis", "overview"],
      text: "tổng hợp thuận nghịch điểm tựa xung đột ưu tiên thực tế",
      maxPassages: 2,
      maxTotalChars: 1800,
    },
  });

  const factKeySet = new Set(facts.evidenceKeys);
  const packs: ZiweiReportKnowledgePack[] = [];
  let totalCollectionChars = 0;
  const MAX_TOTAL_COLLECTION_CHARS = 32_000;
  const MAX_PACK_CHARS = 1800;

  for (const def of packDefinitions) {
    const passages = await retrieve(def.query);
    const boundedPassages: Array<{
      passageId: string;
      content: string;
      metadata: KnowledgeChunkMetadataV1;
    }> = [];
    let packChars = 0;

    for (const p of passages) {
      if (boundedPassages.length >= 2 && def.isPalacePack) break;
      if (packChars + p.content.length > MAX_PACK_CHARS) continue;
      if (totalCollectionChars + p.content.length > MAX_TOTAL_COLLECTION_CHARS) continue;

      const normalizedMeta = p.metadata
        ? normalizeChunkMetadata(p.metadata, "vi")
        : normalizeChunkMetadata(undefined, "vi");

      boundedPassages.push({
        passageId: p.passageId,
        content: p.content,
        metadata: normalizedMeta,
      });
      packChars += p.content.length;
      totalCollectionChars += p.content.length;
    }

    const groundedEvidenceKeys = Array.from(
      new Set(def.candidateEvidenceKeys.filter((k) => factKeySet.has(k))),
    );

    packs.push({
      id: def.id,
      evidenceKeys:
        groundedEvidenceKeys.length > 0
          ? groundedEvidenceKeys
          : [facts.palaces[0]!.palaceId],
      passages: boundedPassages,
    });
  }

  return packs;
}
