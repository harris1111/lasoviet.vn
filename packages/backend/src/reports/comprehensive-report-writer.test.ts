import { describe, expect, it, vi } from "vitest";
import { ZIWEI_PALACE_IDS, ZIWEI_THEMATIC_SYNTHESIS_IDS } from "@lasoviet/contracts";
import type { AiProvider } from "../ai/ai-provider.js";
import type { ComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";
import type { ZiweiReportKnowledgePack } from "./comprehensive-report-retrieval.js";
import {
  CANONICAL_COMPREHENSIVE_SECTION_TITLES,
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
} from "./identity-report-config.js";
import {
  COMPREHENSIVE_REPORT_JSON_CONTRACT_INSTRUCTION,
  writeComprehensiveZiweiReport,
} from "./comprehensive-report-writer.js";

const mockFacts: ComprehensiveZiweiFacts = {
  palaces: [
    {
      palaceId: "ziwei.palace.life",
      earthlyBranchId: "ziwei.branch.tiger",
      isLifePalace: true,
      isBodyPalace: false,
      stars: [{ id: "ziwei.star.ziwei", type: "principal", brightness: "ziwei.brightness.temple" }],
      triadPalaceIds: ["ziwei.palace.career", "ziwei.palace.wealth"],
      oppositePalaceId: "ziwei.palace.travel",
      flankingPalaceIds: ["ziwei.palace.parents", "ziwei.palace.siblings"],
    },
  ],
  transformations: [],
  patterns: [],
  evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
};

const mockKnowledgePacks: ZiweiReportKnowledgePack[] = [
  {
    id: "core_temperament",
    isPalacePack: false,
    evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    passages: [],
  },
];

function createRawModelReport() {
  return {
    overview: {
      title: "Model custom overview",
      narrative: "Tổng quan cuộc đời với Tử Vi tại Mệnh.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    coreAxis: {
      title: "Model custom coreAxis",
      narrative: "Trục Mệnh Thân vững chắc.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    keyConfigurations: [
      {
        title: "Cấu trúc Đế Tinh",
        narrative: "Tử Vi tọa thủ cung Dần mang năng lượng khai phá.",
        evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
      },
    ],
    // Intentionally reversed order to verify assembler sorting
    palaceReadings: [...ZIWEI_PALACE_IDS].reverse().map((palaceId) => ({
      palaceId,
      title: `Model title for ${palaceId}`,
      narrative: `Luận giải cho ${palaceId}.`,
      evidenceKeys: [palaceId],
    })),
    thematicSynthesis: [...ZIWEI_THEMATIC_SYNTHESIS_IDS].reverse().map((id) => ({
      id,
      title: `Model title for ${id}`,
      narrative: `Phân tích chuyên đề ${id}.`,
      evidenceKeys: ["ziwei.palace.life"],
    })),
    strengthsAndTensions: {
      title: "Model custom strengths",
      narrative: "Thế mạnh lãnh đạo nhưng cần chú ý tính độc đoán.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    practicalDirection: ["Phát huy vai trò dẫn dắt tổ chức.", "Lắng nghe cộng sự."],
  };
}

describe("writeComprehensiveZiweiReport", () => {
  it("calls provider.generateStructured once with required parameters and applies assembler-owned canonical titles", async () => {
    const generateStructuredSpy = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        value: createRawModelReport(),
        providerId: "test-provider",
        modelId: "test-model",
      },
    });

    const provider: AiProvider = {
      generateStructured: generateStructuredSpy,
    };

    const result = await writeComprehensiveZiweiReport({
      facts: mockFacts,
      knowledgePacks: mockKnowledgePacks,
      provider,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");

    expect(generateStructuredSpy).toHaveBeenCalledTimes(1);
    const req = generateStructuredSpy.mock.calls[0]![0];
    expect(req.schemaName).toBe("ziwei_comprehensive_report_content_v1");
    expect(req.use).toBe("production_report_generation");
    expect(req.maxOutputTokens).toBe(9_000);

    const userPayload = JSON.parse(req.user);
    expect(userPayload.requiredPalaceOrder).toEqual(ZIWEI_PALACE_IDS);
    expect(userPayload.requiredThematicOrder).toEqual(ZIWEI_THEMATIC_SYNTHESIS_IDS);

    // Verify assembler-owned canonical titles
    const report = result.value.report;
    expect(report.overview.title).toBe(CANONICAL_COMPREHENSIVE_SECTION_TITLES.overview);
    expect(report.coreAxis.title).toBe(CANONICAL_COMPREHENSIVE_SECTION_TITLES.coreAxis);
    expect(report.strengthsAndTensions.title).toBe(
      CANONICAL_COMPREHENSIVE_SECTION_TITLES.strengthsAndTensions,
    );

    // Palace order must be canonical 12 palaces in exact canonical sequence
    expect(report.palaceReadings).toHaveLength(12);
    for (let i = 0; i < 12; i++) {
      const expectedId = ZIWEI_PALACE_IDS[i]!;
      expect(report.palaceReadings[i]!.palaceId).toBe(expectedId);
      expect(report.palaceReadings[i]!.title).toBe(CANONICAL_PALACE_TITLES_VI[expectedId]);
    }

    // Thematic synthesis order and titles
    expect(report.thematicSynthesis).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      const expectedThemeId = ZIWEI_THEMATIC_SYNTHESIS_IDS[i]!;
      expect(report.thematicSynthesis[i]!.id).toBe(expectedThemeId);
      expect(report.thematicSynthesis[i]!.title).toBe(CANONICAL_THEMATIC_TITLES_VI[expectedThemeId]);
    }
  });

  it("propagates provider failure without performing a second call", async () => {
    const provider: AiProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "AI_TIMEOUT", retryable: true },
      }),
    };

    const result = await writeComprehensiveZiweiReport({
      facts: mockFacts,
      knowledgePacks: mockKnowledgePacks,
      provider,
    });
    expect(result.ok).toBe(false);
  });

  it("explicitly specifies V3 JSON contract, top-level keys, canonical palace and thematic sequence, and prohibits legacy keys in prompt", async () => {
    const generateStructuredSpy = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        value: createRawModelReport(),
        providerId: "test-provider",
        modelId: "test-model",
      },
    });

    const provider: AiProvider = {
      generateStructured: generateStructuredSpy,
    };

    const result = await writeComprehensiveZiweiReport({
      facts: mockFacts,
      knowledgePacks: mockKnowledgePacks,
      provider,
    });

    expect(result.ok).toBe(true);
    expect(generateStructuredSpy).toHaveBeenCalledTimes(1);

    const req = generateStructuredSpy.mock.calls[0]![0];

    // Assert that system prompt contains the explicit JSON contract instruction
    expect(req.system).toContain(COMPREHENSIVE_REPORT_JSON_CONTRACT_INSTRUCTION);

    // Assert top-level keys specification
    const expectedTopLevelKeys = [
      "overview",
      "coreAxis",
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
      "strengthsAndTensions",
      "practicalDirection",
    ];
    for (const key of expectedTopLevelKeys) {
      expect(req.system).toContain(`"${key}"`);
    }

    // Assert all 12 canonical palace IDs are in the prompt
    for (const palaceId of ZIWEI_PALACE_IDS) {
      expect(req.system).toContain(palaceId);
    }

    // Assert all 4 canonical thematic synthesis IDs are in the prompt
    for (const themeId of ZIWEI_THEMATIC_SYNTHESIS_IDS) {
      expect(req.system).toContain(themeId);
    }

    // Assert evidenceKeys constraints
    expect(req.system).toContain("facts.evidenceKeys");
    expect(req.system).toContain("ít nhất 1");

    // Assert legacy key prohibitions
    expect(req.system).toContain('CẤM trường "title" ở cấp cao nhất');
    expect(req.system).toContain('CẤM trường "overview" là một chuỗi string');
    expect(req.system).toContain('CẤM trường "palaceInterpretations"');
    expect(req.system).toContain('CẤM trường "thematicSynthesis" là Object');
    expect(req.system).toContain('CẤM trường "actionPriorities"');

    // Assert user payload structure
    const userPayload = JSON.parse(req.user);
    expect(userPayload.requiredPalaceOrder).toEqual(ZIWEI_PALACE_IDS);
    expect(userPayload.requiredThematicOrder).toEqual(ZIWEI_THEMATIC_SYNTHESIS_IDS);
  });
});
