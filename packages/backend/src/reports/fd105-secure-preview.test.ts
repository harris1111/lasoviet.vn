import { describe, expect, it } from "vitest";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import {
  buildGuardedFreeIdentityPreview,
  CANONICAL_PALACE_PREVIEWS,
} from "./free-identity-preview.js";

const canonicalEvidence = [
  {
    id: "ziwei.identity.life-palace",
    factReferences: ["fact.ziwei.identity.life-palace"],
    confidence: "high" as const,
    interpretationBoundCodes: ["reflective_identity_only" as const],
    interpretationBounds: ["identity-only"],
    limitations: ["birth-time-dependent"],
    riskTags: ["identity" as const],
    allowedActionCategories: ["reflect" as const],
  },
  {
    id: "ziwei.identity.body-palace",
    factReferences: ["fact.ziwei.identity.body-palace"],
    confidence: "high" as const,
    interpretationBoundCodes: ["reflective_identity_only" as const],
    interpretationBounds: ["identity-only"],
    limitations: ["birth-time-dependent"],
    riskTags: ["identity" as const],
    allowedActionCategories: ["reflect" as const],
  },
  {
    id: "ziwei.identity.transformations",
    factReferences: ["fact.ziwei.identity.transformations"],
    confidence: "high" as const,
    interpretationBoundCodes: ["reflective_identity_only" as const],
    interpretationBounds: ["identity-only"],
    limitations: ["birth-time-dependent"],
    riskTags: ["identity" as const],
    allowedActionCategories: ["reflect" as const],
  },
];

const mockChart: NormalizedZiweiChartV1 = {
  version: 1,
  systemId: "ziwei",
  palaces: [
    {
      id: "ziwei.palace.life",
      earthlyBranchId: "ziwei.branch.yin",
      heavenlyStemId: "ziwei.stem.jia",
      cycleStateId: "ziwei.cycle.prosperous",
      stars: [
        { id: "ziwei.star.ziwei", category: "major", brightness: "bright" },
        { id: "ziwei.star.tianfu", category: "major", brightness: "bright" },
      ],
    },
    {
      id: "ziwei.palace.career",
      earthlyBranchId: "ziwei.branch.wu",
      heavenlyStemId: "ziwei.stem.bing",
      cycleStateId: "ziwei.cycle.birth",
      stars: [{ id: "ziwei.star.wuqu", category: "major", brightness: "bright" }],
    },
    {
      id: "ziwei.palace.wealth",
      earthlyBranchId: "ziwei.branch.chen",
      heavenlyStemId: "ziwei.stem.wu",
      cycleStateId: "ziwei.cycle.prosperous",
      stars: [{ id: "ziwei.star.taiyin", category: "major", brightness: "bright" }],
    },
    {
      id: "ziwei.palace.spouse",
      earthlyBranchId: "ziwei.branch.zi",
      heavenlyStemId: "ziwei.stem.geng",
      cycleStateId: "ziwei.cycle.bath",
      stars: [{ id: "ziwei.star.tanlang", category: "major", brightness: "trapped" }],
    },
    {
      id: "ziwei.palace.body",
      earthlyBranchId: "ziwei.branch.shen",
      heavenlyStemId: "ziwei.stem.ren",
      cycleStateId: "ziwei.cycle.tomb",
      stars: [{ id: "ziwei.star.tianji", category: "major", brightness: "bright" }],
    },
    {
      id: "ziwei.palace.siblings",
      earthlyBranchId: "ziwei.branch.chou",
      heavenlyStemId: "ziwei.stem.yi",
      cycleStateId: "ziwei.cycle.nourish",
      stars: [],
    },
    {
      id: "ziwei.palace.children",
      earthlyBranchId: "ziwei.branch.hai",
      heavenlyStemId: "ziwei.stem.ding",
      cycleStateId: "ziwei.cycle.weak",
      stars: [],
    },
    {
      id: "ziwei.palace.health",
      earthlyBranchId: "ziwei.branch.you",
      heavenlyStemId: "ziwei.stem.ji",
      cycleStateId: "ziwei.cycle.sickness",
      stars: [],
    },
    {
      id: "ziwei.palace.travel",
      earthlyBranchId: "ziwei.branch.wei",
      heavenlyStemId: "ziwei.stem.xin",
      cycleStateId: "ziwei.cycle.death",
      stars: [],
    },
    {
      id: "ziwei.palace.friends",
      earthlyBranchId: "ziwei.branch.si",
      heavenlyStemId: "ziwei.stem.gui",
      cycleStateId: "ziwei.cycle.extinction",
      stars: [],
    },
    {
      id: "ziwei.palace.property",
      earthlyBranchId: "ziwei.branch.mao",
      heavenlyStemId: "ziwei.stem.yi",
      cycleStateId: "ziwei.cycle.womb",
      stars: [],
    },
    {
      id: "ziwei.palace.fortune",
      earthlyBranchId: "ziwei.branch.xu",
      heavenlyStemId: "ziwei.stem.jia",
      cycleStateId: "ziwei.cycle.nourish",
      stars: [],
    },
    {
      id: "ziwei.palace.parents",
      earthlyBranchId: "ziwei.branch.chen",
      heavenlyStemId: "ziwei.stem.bing",
      cycleStateId: "ziwei.cycle.birth",
      stars: [],
    },
  ],
  soulPalaceId: "ziwei.palace.life",
  bodyPalaceId: "ziwei.palace.body",
  transformations: [
    { id: "ziwei.transformation.prosperity", starId: "ziwei.star.lianzhen" },
    { id: "ziwei.transformation.power", starId: "ziwei.star.pojun" },
    { id: "ziwei.transformation.fame", starId: "ziwei.star.wuqu" },
    { id: "ziwei.transformation.obstacle", starId: "ziwei.star.taiyang" },
  ],
};

describe("FD-105 package 1.4: secure preview and reveal boundary", () => {
  describe("Guest (layer 0) security boundary", () => {
    it("returns ONLY insight 1 + palace title lines, keeping insight 2 and Bản mệnh opening strictly redacted", async () => {
      const result = await buildGuardedFreeIdentityPreview({
        chartId: "chart-guest-1",
        chartVersionId: "ver-1",
        evidence: canonicalEvidence,
        actorKind: "guest",
        chart: mockChart,
        locale: "vi",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const preview = result.value;
      expect(preview.audience).toBe("guest");
      expect(preview.magnetOffer?.title).toContain("2 điều lá số nói riêng về bạn");

      // Exactly 2 insight items in magnet preview
      expect(preview.insightDetails).toBeDefined();
      expect(preview.insightDetails).toHaveLength(2);

      const [insight1, insight2] = preview.insightDetails!;

      // Insight 1 is UNLOCKED
      expect(insight1!.isLocked).toBe(false);
      expect(insight1!.description).toBeDefined();
      expect(insight1!.description!.length).toBeGreaterThan(10);
      expect(insight1!.lockedPreview).toBeUndefined();

      // Insight 2 is LOCKED
      expect(insight2!.isLocked).toBe(true);
      // CRITICAL: description must be strictly undefined
      expect(insight2!.description).toBeUndefined();
      expect(insight2!.lockedPreview).toBeDefined();
      expect(insight2!.lockedPreview?.isLocked).toBe(true);
      expect(insight2!.lockedPreview?.clippedSentences).toHaveLength(1);
      expect(insight2!.lockedPreview?.lengthHint).toBe(4);

      // Exactly 12 palace title lines
      expect(preview.palaceTitleLines).toBeDefined();
      expect(preview.palaceTitleLines).toHaveLength(12);

      const lifePalaceLine = preview.palaceTitleLines!.find((p) => p.palaceId === "ziwei.palace.life");
      expect(lifePalaceLine?.state).toBe("read");
      expect(lifePalaceLine?.title).toBe(CANONICAL_PALACE_PREVIEWS["ziwei.palace.life"]!.vi.title);

      // Other 11 palaces are unopened for guest
      const unopenedPalaces = preview.palaceTitleLines!.filter((p) => p.state === "unopened");
      expect(unopenedPalaces).toHaveLength(11);

      // Bản Mệnh is LOCKED and opening is strictly undefined for guest
      expect(preview.banMenhPreview).toBeDefined();
      expect(preview.banMenhPreview?.isLocked).toBe(true);
      expect(preview.banMenhPreview?.opening).toBeUndefined();
      expect(preview.banMenhPreview?.priceLa).toBe(240);

      // Serialization boundary check: JSON payload MUST NOT contain locked text
      const serialized = JSON.stringify(preview);
      expect(serialized).not.toContain('"description":"Tọa thủ tại Cung Thân');
      expect(serialized).not.toContain("Bản mệnh của bạn định hình từ trục Cung Mệnh");
    });
  });

  describe("Verified Signed-In (layer 1) access boundary", () => {
    it("returns insight 1 + insight 2 (by top concern) + Bản mệnh opening (1-2 clipped safe sentences)", async () => {
      const result = await buildGuardedFreeIdentityPreview({
        chartId: "chart-verified-1",
        chartVersionId: "ver-1",
        evidence: canonicalEvidence,
        actorKind: "verified",
        topConcern: "career",
        chart: mockChart,
        locale: "vi",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const preview = result.value;
      expect(preview.audience).toBe("verified");
      expect(preview.topConcern).toBe("career");

      const [insight1, insight2] = preview.insightDetails!;

      // Insight 1 is UNLOCKED
      expect(insight1!.isLocked).toBe(false);
      expect(insight1!.description).toBeDefined();

      // Insight 2 is UNLOCKED and tailored to career (Cung Quan Lộc)
      expect(insight2!.isLocked).toBe(false);
      expect(insight2!.tagline).toBe("Cung Quan Lộc");
      expect(insight2!.description).toBeDefined();
      expect(insight2!.description).toContain("Cung Quan Lộc");

      // 12 palace title lines: Mệnh is read, career is preview, other 10 are unopened
      const lifeLine = preview.palaceTitleLines!.find((p) => p.palaceId === "ziwei.palace.life");
      const careerLine = preview.palaceTitleLines!.find((p) => p.palaceId === "ziwei.palace.career");
      expect(lifeLine?.state).toBe("read");
      expect(careerLine?.state).toBe("preview");

      const unopenedLines = preview.palaceTitleLines!.filter((p) => p.state === "unopened");
      expect(unopenedLines).toHaveLength(10);

      // Bản Mệnh opening is provided with 1-2 clipped safe sentences cut mid-thought
      expect(preview.banMenhPreview).toBeDefined();
      expect(preview.banMenhPreview?.isLocked).toBe(true);
      expect(preview.banMenhPreview?.opening).toBeDefined();
      expect(preview.banMenhPreview?.opening).toContain("…");
      expect(preview.banMenhPreview?.lengthHint).toBe(4);
      expect(preview.banMenhPreview?.priceLa).toBe(240);
    });
  });
});
