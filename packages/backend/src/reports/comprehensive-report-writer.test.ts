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
import { validateComprehensiveZiweiReport } from "./comprehensive-report-validator.js";
import {
  BRIGHTNESS_LABELS_VI,
  COMPREHENSIVE_REPORT_JSON_CONTRACT_INSTRUCTION,
  COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE,
  VIETNAMESE_COMPREHENSIVE_REPORT_SYSTEM_PROMPT,
  brightnessLabelsVi,
  normalizeComprehensiveReportModelProse,
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
    expect(userPayload.allowedEvidenceKeys).toEqual(mockFacts.evidenceKeys);
    expect(userPayload.brightnessLabelsVi).toEqual(BRIGHTNESS_LABELS_VI);
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
    expect(userPayload.allowedEvidenceKeys).toEqual(mockFacts.evidenceKeys);
    expect(userPayload.requiredPalaceOrder).toEqual(ZIWEI_PALACE_IDS);
    expect(userPayload.requiredThematicOrder).toEqual(ZIWEI_THEMATIC_SYNTHESIS_IDS);
  });

  it("enforces terminal completion gate at the end of system prompt naming all seven root fields in exact order, requiring completion through practicalDirection, and marking missing fields invalid", async () => {
    // Assert that the completion gate is strictly terminal in the system prompt
    expect(
      VIETNAMESE_COMPREHENSIVE_REPORT_SYSTEM_PROMPT.trimEnd().endsWith(
        COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE,
      ),
    ).toBe(true);

    // Assert all seven root fields are specified in exact sequential order in the terminal completion gate
    const expectedRootFields = [
      "overview",
      "coreAxis",
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
      "strengthsAndTensions",
      "practicalDirection",
    ];

    let lastIndex = -1;
    for (const field of expectedRootFields) {
      const idx = COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE.indexOf(`"${field}"`);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }

    // Assert continuing through practicalDirection and invalidating incomplete responses
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("practicalDirection");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain(
      'cho đến hết trường cuối cùng là "practicalDirection"',
    );
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("không hợp lệ");

    // Assert generateStructured passes system prompt ending with terminal completion gate
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
    expect(req.system.trimEnd().endsWith(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE)).toBe(true);
  });

  it("passes allowedEvidenceKeys with exact payload equality and enforces copy-verbatim evidence rule in terminal completion gate", async () => {
    // Assert copy-verbatim prompt rule in the terminal completion gate
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("allowedEvidenceKeys");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("copied verbatim");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("abbreviated");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("translated");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("inferred");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("reconstructed");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("newly created");

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
    const userPayload = JSON.parse(req.user);

    // Exact payload equality for allowedEvidenceKeys
    expect(userPayload.allowedEvidenceKeys).toEqual(mockFacts.evidenceKeys);
    expect(userPayload.allowedEvidenceKeys).toEqual(userPayload.facts.evidenceKeys);
    expect(userPayload.allowedEvidenceKeys).toHaveLength(mockFacts.evidenceKeys.length);

    // Terminal completion gate is present in system prompt
    expect(req.system).toContain(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE);
  });

  it("passes exact brightnessLabelsVi map and enforces natural Vietnamese, supplied VI brightness labels, no Han ideographs, and no English brightness descriptors case-insensitively in prompt", async () => {
    // Check local immutable map
    expect(brightnessLabelsVi).toEqual(BRIGHTNESS_LABELS_VI);
    expect(BRIGHTNESS_LABELS_VI).toEqual({
      "ziwei.brightness.exalted": "Miếu",
      "ziwei.brightness.prosperous": "Vượng",
      "ziwei.brightness.favorable": "Đắc",
      "ziwei.brightness.neutral": "Bình",
      "ziwei.brightness.unfavorable": "Hãm",
      "ziwei.brightness.weak": "Nhược",
    });

    // Check prompt constraints in terminal completion gate
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("tiếng Việt tự nhiên");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("natural Vietnamese");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("brightnessLabelsVi");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("Miếu");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("Vượng");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("Đắc");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("Bình");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("Hãm");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("Nhược");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("no Han ideographs");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("chữ Hán");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("no English brightness descriptors");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("exalted");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("prosperous");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("favorable");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("neutral");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("unfavorable");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("weak");
    expect(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE).toContain("case-insensitively");

    // Check generateStructured call payload and single-call invariant
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
    const userPayload = JSON.parse(req.user);
    expect(userPayload.brightnessLabelsVi).toEqual(BRIGHTNESS_LABELS_VI);
    expect(req.system).toContain(COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE);
  });
  it("normalizes model-owned Vietnamese display text by stripping Han ideographs and empty wrappers while preserving surrounding text, canonical structure, and calling provider once", async () => {
    const testEvidenceKeys = [...ZIWEI_PALACE_IDS, "ziwei.star.ziwei"];
    const testFacts: ComprehensiveZiweiFacts = {
      ...mockFacts,
      evidenceKeys: testEvidenceKeys,
    };

    const palaceProseMap: Record<string, string> = {
      "ziwei.palace.life": "Cung Mệnh có sao Tử Vi (紫微) hội chiếu quyền tinh.",
      "ziwei.palace.siblings": "Anh chị em giữ hòa khí và có sự hỗ trợ lẫn nhau khi cần thiết.",
      "ziwei.palace.spouse": "Hôn phối có chuyên môn tốt và đồng hành xây dựng cuộc sống chung.",
      "ziwei.palace.children": "Con cái thông minh và có xu hướng tự lập từ sớm.",
      "ziwei.palace.wealth": "Nguồn tài chính hình thành từ tích lũy chuyên môn bền bỉ.",
      "ziwei.palace.health": "Sức khỏe tương đối bình ổn nhưng cần duy trì sinh hoạt điều độ.",
      "ziwei.palace.travel": "Không gian bên ngoài mở ra nhiều cơ hội tương tác thuận lợi.",
      "ziwei.palace.friends": "Mạng lưới bạn bè và đồng nghiệp đáng tin cậy hỗ trợ tốt.",
      "ziwei.palace.career": "Đường quan lộ hanh thông nhờ năng lực chuyên môn và kỷ luật.",
      "ziwei.palace.property": "Cơ ngơi điền sản ổn định và tích lũy dần theo thời gian.",
      "ziwei.palace.fortune": "Đời sống tinh thần an định và có khả năng cân bằng nội tại.",
      "ziwei.palace.parents": "Song thân tạo nền tảng giáo dưỡng chu đáo từ thuở ấu thơ.",
    };

    const themeProseMap: Record<string, string> = {
      career_wealth: "Phân tích chuyên đề sự nghiệp với Thất Sát (七殺) chỉ huy vững chắc.",
      relationships_family: "Quan hệ gia đình là điểm tựa tinh thần quan trọng cho bản mệnh.",
      social_environment: "Môi trường đối ngoại giúp mở rộng các mối quan hệ hợp tác giá trị.",
      wellbeing_inner_resources: "Nội lực bền bỉ giúp hóa giải áp lực và duy trì tâm thế an nhiên.",
    };

    const rawReportWithHan = {
      overview: {
        title: "Model custom overview",
        narrative: "Tổng quan cuộc đời với sao Tử Vi (紫微) tại cung Mệnh vững vàng.",
        evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
      },
      coreAxis: {
        title: "Model custom coreAxis",
        narrative: "Trục Mệnh Thân (命身) có định hướng rõ rệt và tự chủ.",
        evidenceKeys: ["ziwei.palace.life"],
      },
      keyConfigurations: [
        {
          title: "Cấu trúc Đế Tinh (帝星)",
          narrative: "Tử Vi tọa thủ cung Dần mang năng lượng khai phá 紫 hội tụ cùng cát tinh.",
          evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
        },
      ],
      palaceReadings: [...ZIWEI_PALACE_IDS].reverse().map((palaceId) => ({
        palaceId,
        title: `Model title for ${palaceId}`,
        narrative: palaceProseMap[palaceId]!,
        evidenceKeys: [palaceId],
      })),
      thematicSynthesis: [...ZIWEI_THEMATIC_SYNTHESIS_IDS].reverse().map((id) => ({
        id,
        title: `Model title for ${id}`,
        narrative: themeProseMap[id]!,
        evidenceKeys: ["ziwei.palace.life"],
      })),
      strengthsAndTensions: {
        title: "Model custom strengths",
        narrative: "Thế mạnh lãnh đạo 【領導】 nhưng cần chú ý tính độc đoán.",
        evidenceKeys: ["ziwei.palace.life"],
      },
      practicalDirection: [
        "Phát huy vai trò dẫn dắt tổ chức với uy tín (威信) lâu dài.",
        "Hành động 実行 quyết đoán và kịp thời.",
      ],
    };

    const generateStructuredSpy = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        value: rawReportWithHan,
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

    // Provider must be called exactly once
    expect(generateStructuredSpy).toHaveBeenCalledTimes(1);

    const report = result.value.report;

    // Boundary regex covering Han ideographs
    const hanPattern = /(?:[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]|\p{Script=Han})/u;

    // Assert NO Han ideographs exist anywhere in customer-visible text
    expect(hanPattern.test(report.overview.narrative)).toBe(false);
    expect(hanPattern.test(report.coreAxis.narrative)).toBe(false);
    for (const keyConfig of report.keyConfigurations) {
      expect(hanPattern.test(keyConfig.title)).toBe(false);
      expect(hanPattern.test(keyConfig.narrative)).toBe(false);
    }
    for (const reading of report.palaceReadings) {
      expect(hanPattern.test(reading.narrative)).toBe(false);
    }
    for (const theme of report.thematicSynthesis) {
      expect(hanPattern.test(theme.narrative)).toBe(false);
    }
    expect(hanPattern.test(report.strengthsAndTensions.narrative)).toBe(false);
    for (const direction of report.practicalDirection) {
      expect(hanPattern.test(direction)).toBe(false);
    }

    // Assert surrounding Vietnamese text is preserved
    expect(report.overview.narrative).toBe(
      "Tổng quan cuộc đời với sao Tử Vi tại cung Mệnh vững vàng.",
    );
    expect(report.coreAxis.narrative).toBe(
      "Trục Mệnh Thân có định hướng rõ rệt và tự chủ.",
    );
    expect(report.keyConfigurations[0]!.title).toBe("Cấu trúc Đế Tinh");
    expect(report.keyConfigurations[0]!.narrative).toBe(
      "Tử Vi tọa thủ cung Dần mang năng lượng khai phá hội tụ cùng cát tinh.",
    );
    expect(report.palaceReadings[0]!.narrative).toBe(
      "Cung Mệnh có sao Tử Vi hội chiếu quyền tinh.",
    );
    expect(report.thematicSynthesis[0]!.narrative).toBe(
      "Phân tích chuyên đề sự nghiệp với Thất Sát chỉ huy vững chắc.",
    );
    expect(report.strengthsAndTensions.narrative).toBe(
      "Thế mạnh lãnh đạo nhưng cần chú ý tính độc đoán.",
    );
    expect(report.practicalDirection[0]).toBe(
      "Phát huy vai trò dẫn dắt tổ chức với uy tín lâu dài.",
    );
    expect(report.practicalDirection[1]).toBe("Hành động quyết đoán và kịp thời.");

    // Assert empty wrappers were cleanly removed without empty parentheses leftover
    expect(report.overview.narrative).not.toContain("()");
    expect(report.coreAxis.narrative).not.toContain("()");
    expect(report.keyConfigurations[0]!.title).not.toContain("()");
    expect(report.strengthsAndTensions.narrative).not.toContain("【】");
    expect(report.practicalDirection[0]).not.toContain("()");

    // Assert canonical titles, evidenceKeys, and ordering are strictly preserved
    expect(report.overview.title).toBe(CANONICAL_COMPREHENSIVE_SECTION_TITLES.overview);
    expect(report.coreAxis.title).toBe(CANONICAL_COMPREHENSIVE_SECTION_TITLES.coreAxis);
    expect(report.strengthsAndTensions.title).toBe(
      CANONICAL_COMPREHENSIVE_SECTION_TITLES.strengthsAndTensions,
    );
    expect(report.overview.evidenceKeys).toEqual(["ziwei.palace.life", "ziwei.star.ziwei"]);
    expect(report.keyConfigurations[0]!.evidenceKeys).toEqual([
      "ziwei.palace.life",
      "ziwei.star.ziwei",
    ]);

    expect(report.palaceReadings).toHaveLength(12);
    for (let i = 0; i < 12; i++) {
      expect(report.palaceReadings[i]!.palaceId).toBe(ZIWEI_PALACE_IDS[i]);
      expect(report.palaceReadings[i]!.title).toBe(CANONICAL_PALACE_TITLES_VI[ZIWEI_PALACE_IDS[i]!]);
    }

    expect(report.thematicSynthesis).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(report.thematicSynthesis[i]!.id).toBe(ZIWEI_THEMATIC_SYNTHESIS_IDS[i]);
      expect(report.thematicSynthesis[i]!.title).toBe(
        CANONICAL_THEMATIC_TITLES_VI[ZIWEI_THEMATIC_SYNTHESIS_IDS[i]!],
      );
    }

    // Passes deterministic validator
    const validationResult = validateComprehensiveZiweiReport(report, testFacts);
    expect(validationResult.ok).toBe(true);
  });

  it("normalizes Han-only prose to empty string without fabricating replacement wording and rejects at downstream validation", async () => {
    // Direct helper assertions
    expect(normalizeComprehensiveReportModelProse("紫微")).toBe("");
    expect(normalizeComprehensiveReportModelProse("(紫微)")).toBe("");
    expect(normalizeComprehensiveReportModelProse("【紫微】")).toBe("");
    expect(normalizeComprehensiveReportModelProse("   紫微   ")).toBe("");
    expect(normalizeComprehensiveReportModelProse("   ( 紫微 )   ")).toBe("");

    // Writer output level assertion
    const rawReportHanOnly = createRawModelReport();
    rawReportHanOnly.overview.narrative = "紫微";

    const generateStructuredSpy = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        value: rawReportHanOnly,
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

    // Must be empty string - no fabricated replacement wording
    expect(result.value.report.overview.narrative).toBe("");

    // Downstream deterministic validator rejects empty required narrative fail-closed
    const validationResult = validateComprehensiveZiweiReport(result.value.report, mockFacts);
    expect(validationResult.ok).toBe(false);
    expect(validationResult.errors?.some((e) => e.includes("overview.narrative"))).toBe(true);
  });
});
