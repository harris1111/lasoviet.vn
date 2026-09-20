import { describe, expect, it, vi } from "vitest";
import { ZIWEI_PALACE_IDS, ZIWEI_THEMATIC_SYNTHESIS_IDS } from "@lasoviet/contracts";
import {
  ziweiComprehensiveReportQualityV1,
  ziweiComprehensiveReportQualityV2Sensitivity,
} from "@lasoviet/config";

import {
  writeComprehensiveReportSectionV4,
} from "./comprehensive-report-section-writer-v4.js";
import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  COMPREHENSIVE_REPORT_SECTION_KEYS,
  COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1,
} from "./comprehensive-report-section-v4.js";
import {
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_0_1,
  REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
} from "./identity-report-config.js";

const palaceIds = [...ZIWEI_PALACE_IDS];
const branches = [
  "ziwei.branch.tiger", "ziwei.branch.rabbit", "ziwei.branch.dragon", "ziwei.branch.snake",
  "ziwei.branch.horse", "ziwei.branch.goat", "ziwei.branch.monkey", "ziwei.branch.rooster",
  "ziwei.branch.dog", "ziwei.branch.pig", "ziwei.branch.rat", "ziwei.branch.ox",
] as const;

function facts() {
  const rawEvidenceKeys = [
    ...palaceIds, ...palaceIds.map((_, index) => `branch-${index}`),
    ...palaceIds.map((_, index) => `star-${index}`),
    "ziwei.brightness.prosperous", "transform-life", "pattern-life",
  ];
  return {
    natal: {
      palaces: palaceIds.map((palaceId, index) => ({
        palaceId,
        earthlyBranchId: `branch-${index}`,
        isLifePalace: palaceId === "ziwei.palace.life",
        isBodyPalace: palaceId === "ziwei.palace.career",
        stars: [{ id: `star-${index}`, brightness: "ziwei.brightness.prosperous" }],
        triadPalaceIds: [],
        oppositePalaceId: palaceId,
        flankingPalaceIds: [palaceId, palaceId],
      })),
      transformations: [{ id: "transform-life", starId: "star-0" }],
      patterns: [{ id: "pattern-life", palaceIds: ["ziwei.palace.life"], starIds: ["star-0"] }],
      evidenceKeys: [],
    },
    timing: {
      decadal: {
        state: "active", index: 2, ageRange: [22, 31], yearRange: [2022, 2031],
        palaceId: "ziwei.palace.fortune", heavenlyStemId: "stem", earthlyBranchId: "branch",
        palaces: [],
      },
      annual: {
        targetYear: 2026, palaceId: "ziwei.palace.career", heavenlyStemId: "stem",
        earthlyBranchId: "branch", palaces: [],
      },
    },
    sourceSnapshot: { asOfDate: "2026-09-12" },
    evidence: {
      items: rawEvidenceKeys.map((sourceKey) => ({
        key: `natal.${sourceKey}`,
        dimension: "natal",
        sourceKeys: [sourceKey],
      })),
    },
    evidenceKeys: rawEvidenceKeys.map((sourceKey) => `natal.${sourceKey}`),
    birthDate: "1990-01-01",
    birthTime: "08:30",
    location: "Hanoi",
  } as any;
}

function productionFacts() {
  const timingPalaces = palaceIds.map((palaceId, index) => ({
    palaceId,
    heavenlyStemId: "ziwei.stem.jia",
    earthlyBranchId: branches[index]!,
    isOriginalPalace: index === 0,
    cycleStateId: "ziwei.cycle.born",
    stars: [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.prosperous", category: "major" }],
    transformations: [{ id: "ziwei.transformation.power", starId: "ziwei.star.ziwei" }],
  }));
  const chart = {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id,
      earthlyBranchId: branches[index]!,
      heavenlyStemId: "ziwei.stem.jia",
      isBodyPalace: id === "ziwei.palace.career",
      isOriginalPalace: index === 0,
      cycleStateId: "ziwei.cycle.born",
      stars: id === "ziwei.palace.life"
        ? [
            { id: "ziwei.star.ziwei", brightness: "ziwei.brightness.prosperous", category: "major" },
            { id: "ziwei.star.tianfu", brightness: "ziwei.brightness.prosperous", category: "major" },
          ]
        : [],
    })),
    transformations: [
      { id: "ziwei.transformation.power", starId: "ziwei.star.ziwei" },
      { id: "ziwei.transformation.prosperity", starId: "ziwei.star.tianfu" },
    ],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [
      { id: "ziwei.horoscope.decadal", supported: true },
      { id: "ziwei.horoscope.annual", supported: true },
    ],
    warnings: [],
    provenance: {
      version: 1, engineId: "ziwei.iztro", engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter", adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart-v1", ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64), configHash: "b".repeat(64), rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00", limitations: [],
    },
  };
  const snapshot = {
    version: 1, reportId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", chartVersionId: "chart-v1",
    asOfDate: "2026-09-12", targetYear: 2026, timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1", snapshotHash: "c".repeat(64),
    snapshot: {
      version: 1, chartVersionId: "chart-v1", asOfDate: "2026-09-12", timezone: "Asia/Ho_Chi_Minh",
      timingRuleVersion: "ziwei.timing.v1", sensitivityRuleVersion: "ziwei.sensitivity.v1",
      timing: {
        decadal: {
          state: "active", index: 2, ageRange: [22, 31], yearRange: [2022, 2031],
          palaceId: "ziwei.palace.fortune", heavenlyStemId: "ziwei.stem.yi",
          earthlyBranchId: "ziwei.branch.rabbit", palaces: timingPalaces,
        },
        annual: {
          targetYear: 2026, palaceId: "ziwei.palace.career", heavenlyStemId: "ziwei.stem.bing",
          earthlyBranchId: "ziwei.branch.horse", palaces: timingPalaces,
        },
        provenance: {
          engineId: "ziwei.iztro", engineVersion: "2.6.0", adapterId: "ziwei.iztro-adapter",
          adapterVersion: "1.0.0", ruleSetId: "ziwei.default",
          config: { yearDivide: "normal", horoscopeDivide: "normal", ageDivide: "normal", dayDivide: "current" },
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
        chartVersionId: "chart-v1", timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1", snapshotHash: "c".repeat(64),
      },
    },
  };
  return buildComprehensiveZiweiFactsV4(chart as never, snapshot as never);
}

function outputFor(key: string): unknown {
  const narrative = { title: "Tiêu đề", narrative: "Nội dung có căn cứ.", evidenceKeys: ["natal.ziwei.palace.life"] };
  if (key.startsWith("palace:")) return { key, value: { ...narrative, palaceId: key.slice(7) } };
  if (key.startsWith("thematic:")) return { key, value: { ...narrative, id: key.slice(9) } };
  if (key === "keyConfigurations") return { key, value: [narrative] };
  if (key === "currentDecadal") return { key, value: { ...narrative, state: "active", index: 2, ageRange: [22, 31], yearRange: [2022, 2031] } };
  if (key === "annualSnapshot") return { key, value: { ...narrative, targetYear: 2026, asOfDate: "2026-09-12" } };
  if (key === "birthTimeSensitivity") return {
    key,
    value: {
      title: "Độ nhạy thời điểm sinh",
      stableFactors: { ...narrative, title: "Yếu tố ổn định", evidenceKeys: ["sensitivity.stable.ziwei.fact.soul-palace"] },
      sensitiveFactors: { ...narrative, title: "Yếu tố cần đối chiếu", evidenceKeys: ["sensitivity.sensitive.ziwei.fact.body-palace"] },
    },
  };
  if (key === "practicalDirection") return {
    key,
    value: Array.from({ length: 3 }, () => ({
      recommendation: "Khuyến nghị", rationale: "Lý do", avoid: "Điều tránh", evidenceKeys: ["natal.ziwei.palace.life"],
    })),
  };
  return { key, value: narrative };
}

function expectedKind(key: string): keyof typeof ziweiComprehensiveReportQualityV1.sections {
  if (key.startsWith("palace:")) return "palace";
  if (key.startsWith("thematic:")) return "thematic";
  if (key === "practicalDirection") return "practicalAction";
  return key as keyof typeof ziweiComprehensiveReportQualityV1.sections;
}

describe("writeComprehensiveReportSectionV4", () => {
  it("selects a strict schema and exact quality token budget for all 23 canonical section keys", async () => {
    const provider = {
      generateStructured: vi.fn().mockImplementation(async (request) => {
        const key = JSON.parse(request.user).sectionKey;
        return { ok: true, value: { value: outputFor(key), providerId: "mock", modelId: "model" } };
      }),
    };
    for (const sectionKey of COMPREHENSIVE_REPORT_SECTION_KEYS) {
      const result = await writeComprehensiveReportSectionV4({
        sectionKey, facts: facts(), knowledgePacks: [], provider: provider as never,
        promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
      });
      expect(result.ok).toBe(true);
    }
    expect(provider.generateStructured).toHaveBeenCalledTimes(23);
    for (const request of provider.generateStructured.mock.calls.map((call) => call[0])) {
      const key = JSON.parse(request.user).sectionKey;
      const output = outputFor(key) as { key: string; value: unknown };
      expect(request.maxOutputTokens).toBe(ziweiComprehensiveReportQualityV1.sections[expectedKind(key)].maxOutputTokens);
      expect(request.schema.safeParse(output).success).toBe(true);
      expect(request.schema.safeParse({ ...output, key: "overview" }).success).toBe(key === "overview");
    }
  });

  it("uses 3500 only for all four V4.1.1 thematic sections and preserves old budgets", async () => {
    const reportFacts = facts();
    reportFacts.sensitivity = {
      stableFactKeys: [],
      sensitiveFacts: [],
    };
    const provider = {
      generateStructured: vi.fn().mockImplementation(async (request) => {
        const key = JSON.parse(request.user).sectionKey;
        return { ok: true, value: { value: outputFor(key), providerId: "mock", modelId: "model" } };
      }),
    };
    for (const reportConfigVersion of [
      REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
      REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    ] as const) {
      for (const sectionKey of COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1) {
        await writeComprehensiveReportSectionV4({
          sectionKey,
          facts: reportFacts,
          knowledgePacks: [],
          provider: provider as never,
          promptVersion: REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
          reportConfigVersion,
        });
      }
    }
    const requests = provider.generateStructured.mock.calls.map((call) => call[0]);
    const oldRequests = requests.slice(0, COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.length);
    const newRequests = requests.slice(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.length);
    for (const [index, key] of COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.entries()) {
      if (key.startsWith("thematic:")) {
        expect(oldRequests[index].maxOutputTokens).toBe(2500);
        expect(newRequests[index].maxOutputTokens).toBe(3500);
      } else {
        expect(newRequests[index].maxOutputTokens).toBe(oldRequests[index].maxOutputTokens);
      }
    }
    expect(oldRequests.find((request) =>
      JSON.parse(request.user).sectionKey === "birthTimeSensitivity"
    ).maxOutputTokens).toBe(
      ziweiComprehensiveReportQualityV2Sensitivity.sections.birthTimeSensitivity.maxOutputTokens,
    );
  });

  it("rejects mismatched key-specific IDs and does not invent fallback content", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: {
            key: "palace:ziwei.palace.life",
            value: {
              title: "Sai cung", narrative: "Nội dung", evidenceKeys: ["natal.ziwei.palace.life"],
              palaceId: "ziwei.palace.career",
            },
          },
          providerId: "mock", modelId: "model",
        },
      }),
    };
    const result = await writeComprehensiveReportSectionV4({
      sectionKey: "palace:ziwei.palace.life", facts: facts(), knowledgePacks: [],
      provider: provider as never, promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
    });
    expect(result).toEqual({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
  });

  it("keeps payload section-scoped, PII-free, and passes unchanged cost context with rewrite purpose", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: { value: outputFor("palace:ziwei.palace.life"), providerId: "mock", modelId: "model" },
      }),
    };
    const costContext = { idempotencyKey: "stable-key", reportId: "report-id", purpose: "report" as const };
    await writeComprehensiveReportSectionV4({
      sectionKey: "palace:ziwei.palace.life",
      facts: facts(),
      knowledgePacks: [
        { id: "palace_ziwei.palace.life", evidenceKeys: ["ziwei.palace.life"], passages: [{ passageId: "life", content: "Life context", metadata: {} as any }] },
        { id: "palace_ziwei.palace.career", evidenceKeys: ["ziwei.palace.career"], passages: [{ passageId: "career", content: "UNRELATED_SECRET", metadata: {} as any }] },
      ],
      rewrite: {
        priorSection: outputFor("palace:ziwei.palace.life") as any,
        findings: Array.from({ length: 10 }, (_, index) => `finding-${index}-${"x".repeat(400)}`),
      },
      provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
      costContext,
    });
    const request = provider.generateStructured.mock.calls[0][0];
    const payload = request.user;
    expect(payload).not.toContain("1990-01-01");
    expect(payload).not.toContain("08:30");
    expect(payload).not.toContain("Hanoi");
    expect(payload).not.toContain("UNRELATED_SECRET");
    expect(payload).toContain("Life context");
    expect(request.purpose).toBe("rewrite");
    expect(request.costContext).toBe(costContext);
    const rewrite = JSON.parse(payload).rewrite;
    expect(rewrite.findings).toHaveLength(8);
    expect(rewrite.findings.every((finding: string) => finding.length <= 300)).toBe(true);
  });

  it("sends key-configuration facts and bounded evidence without unrelated palace payloads", async () => {
    const reportFacts = facts();
    reportFacts.natal.transformations = [
      { id: "transform-life", starId: "star-0" },
      { id: "transform-career", starId: "star-1" },
    ];
    reportFacts.natal.patterns = [
      { id: "pattern-life", palaceIds: ["ziwei.palace.life"], starIds: ["star-0"] },
      { id: "pattern-career", palaceIds: ["ziwei.palace.career"], starIds: ["star-1"] },
    ];
    for (const sourceKey of ["transform-career", "pattern-career"]) {
      reportFacts.evidence.items.push({ key: `natal.${sourceKey}`, dimension: "natal", sourceKeys: [sourceKey] });
      reportFacts.evidenceKeys.push(`natal.${sourceKey}`);
    }
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: { value: outputFor("keyConfigurations"), providerId: "mock", modelId: "model" },
      }),
    };
    const configurationPack = {
      id: "patterns_transformations",
      evidenceKeys: ["pattern-life", "pattern-career", "not-an-evidence-key"],
      passages: [{ passageId: "configuration", content: "Configuration context", metadata: {} as any }],
    };

    await writeComprehensiveReportSectionV4({
      sectionKey: "keyConfigurations",
      facts: reportFacts,
      knowledgePacks: [
        configurationPack,
        { id: "palace_ziwei.palace.career", evidenceKeys: ["ziwei.palace.career"], passages: [{ passageId: "career", content: "UNRELATED_PALACE", metadata: {} as any }] },
      ],
      provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
    });

    const payload = JSON.parse(provider.generateStructured.mock.calls[0][0].user);
    expect(payload.facts.natal.palaces).toEqual([]);
    expect(payload.facts.natal.transformations).toEqual(reportFacts.natal.transformations);
    expect(payload.facts.natal.patterns).toEqual(reportFacts.natal.patterns);
    expect(payload.knowledgePacks).toEqual([{
      id: "patterns_transformations",
      evidenceKeys: ["natal.pattern-career", "natal.pattern-life"],
      passages: [{ passageId: "configuration", content: "Configuration context", metadata: {} }],
    }]);
    expect(payload.allowedEvidenceKeys).toEqual([
      "natal.pattern-career",
      "natal.pattern-life",
      "natal.star-0",
      "natal.star-1",
      "natal.transform-career",
      "natal.transform-life",
      "natal.ziwei.palace.career",
      "natal.ziwei.palace.life",
    ]);
    expect(payload.allowedEvidenceKeys.every((key: string) => reportFacts.evidenceKeys.includes(key))).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("UNRELATED_PALACE");
  });

  it("adds config-derived per-item requirements and structured rewrite findings only for the new prompt", async () => {
    const priorSection = {
      key: "keyConfigurations" as const,
      value: Array.from({ length: 5 }, (_, index) => ({
        title: `Configuration ${index}`,
        narrative: "Short candidate.",
        evidenceKeys: [`evidence-${index}`],
      })),
    };
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: { value: outputFor("keyConfigurations"), providerId: "mock", modelId: "model" },
      }),
    };
    const shared = {
      sectionKey: "keyConfigurations" as const,
      facts: facts(),
      knowledgePacks: [],
      provider: provider as never,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    };
    await writeComprehensiveReportSectionV4({
      ...shared,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
    });
    await writeComprehensiveReportSectionV4({
      ...shared,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
      rewrite: {
        priorSection,
        findings: Array.from({ length: 5 }, (_, index) => ({
          itemKey: `keyConfigurations[${index}]`,
          code: "MINIMUM_SYLLABLES",
          note: `Expand item ${index}.`,
        })),
      },
    });
    await writeComprehensiveReportSectionV4({
      ...shared,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
    });

    const [initialRequest, rewriteRequest, oldRequest] =
      provider.generateStructured.mock.calls.map(([request]) => request);
    const initialPayload = JSON.parse(initialRequest.user);
    const rewritePayload = JSON.parse(rewriteRequest.user);
    const oldPayload = JSON.parse(oldRequest.user);
    expect(initialPayload.keyConfigurationRequirements).toEqual({
      perItem: true,
      minimumSyllables: 250,
      targetMinimumSyllables: 300,
      targetMaximumSyllables: 400,
    });
    expect(rewritePayload.keyConfigurationRequirements).toEqual(
      initialPayload.keyConfigurationRequirements,
    );
    expect(rewritePayload.rewrite).toMatchObject({
      priorSection,
      findings: Array.from({ length: 5 }, (_, index) => ({
        itemKey: `keyConfigurations[${index}]`,
        code: "MINIMUM_SYLLABLES",
        note: `Expand item ${index}.`,
      })),
      itemKeys: Array.from({ length: 5 }, (_, index) => `keyConfigurations[${index}]`),
      preserveItemCount: true,
      preserveItemOrder: true,
      preserveEvidenceKeys: true,
    });
    expect(initialRequest.system).toContain("tối thiểu 250 âm tiết");
    expect(initialRequest.system).toContain("mục tiêu 300-400 âm tiết");
    expect(rewriteRequest.system).toContain("sửa đầy đủ mọi finding theo đúng itemKey");
    expect(oldPayload).not.toHaveProperty("keyConfigurationRequirements");
    expect(oldRequest.system).not.toContain("tối thiểu 250 âm tiết");
  });

  it("sends the shared V4.1.2 acceptance contract for generic generation and item-addressed rewrites", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: { value: outputFor("coreAxis"), providerId: "mock", modelId: "model" },
      }),
    };
    const priorSection = outputFor("coreAxis") as any;
    await writeComprehensiveReportSectionV4({
      sectionKey: "coreAxis",
      facts: facts(),
      knowledgePacks: [],
      provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    });
    await writeComprehensiveReportSectionV4({
      sectionKey: "coreAxis",
      facts: facts(),
      knowledgePacks: [],
      provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
      rewrite: {
        priorSection,
        findings: [
          { itemKey: "coreAxis", code: "DISCOURAGED_TERM", note: "Replace khí chất." },
          { itemKey: "coreAxis", code: "EVIDENCE_ANCHORS", note: "Add chart anchors." },
        ],
      },
    });
    const [initial, rewrite] = provider.generateStructured.mock.calls.map(([request]) => ({
      request,
      payload: JSON.parse(request.user),
    }));
    expect(initial.payload.acceptanceContract).toMatchObject({
      scope: "section-and-item-addressed",
      suppliedFindings: expect.stringContaining("every supplied finding"),
      sectionLength: {
        appliesPerItem: false,
        minimumSyllables: 600,
        targetMinimumSyllables: 700,
        targetMaximumSyllables: 900,
      },
      forbiddenTerms: {
        discouraged: expect.arrayContaining(["khí chất", "an nhàn"]),
        contextualPalaceNameExceptions: {
          terms: ["Phu Thê", "Tử Tức"],
          rule: expect.stringContaining("explicit palace-name references"),
        },
        death: expect.arrayContaining(["tử vong", "sát phu"]),
        certainty: expect.arrayContaining(["chắc chắn", "không tránh khỏi"]),
      },
      localeIntegrity: {
        language: "vi",
        noHanIdeographs: true,
        noNomIdeographs: true,
        noEnglishBrightnessDescriptors: true,
        allowedBrightnessLabels: ["Miếu", "Vượng", "Đắc", "Bình", "Hãm", "Nhược"],
      },
      properNameDensity: {
        configuredProperNames: expect.arrayContaining(["Mệnh", "Tử Vi"]),
        maximumPer100Syllables: 8,
      },
      evidence: {
        preserveEvidenceBackedChartFacts: true,
        preserveRequiredEvidenceKeys: true,
      },
      noNewQualityViolations: true,
    });
    expect(rewrite.payload.rewrite.findings).toEqual([
      { itemKey: "coreAxis", code: "DISCOURAGED_TERM", note: "Replace khí chất." },
      { itemKey: "coreAxis", code: "EVIDENCE_ANCHORS", note: "Add chart anchors." },
    ]);
    expect(rewrite.request.system).toContain("configured per-section or per-item syllable range");
    expect(rewrite.request.system).toContain(
      "except Phu Thê and Tử Tức when they are explicit palace-name references in chart-structure context",
    );
    expect(rewrite.request.system).toContain("Tên cung như Phu Thê và Tử Tức");
    expect(rewrite.request.system).toContain("no Han/Nom ideograph");
    expect(rewrite.request.system).toContain("every supplied finding");
  });

  it("gives V4.1.2 overview generation and rewrite an explicit numeric length contract", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: { value: outputFor("overview"), providerId: "mock", modelId: "model" },
      }),
    };
    const shared = {
      sectionKey: "overview" as const,
      facts: facts(),
      knowledgePacks: [],
      provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    };
    await writeComprehensiveReportSectionV4(shared);
    await writeComprehensiveReportSectionV4({
      ...shared,
      rewrite: {
        priorSection: {
          key: "overview",
          value: {
            title: "Một",
            narrative: "hai   \nba",
            evidenceKeys: ["natal.ziwei.palace.life"],
          },
        },
        findings: [{ itemKey: "overview", code: "MINIMUM_SYLLABLES", note: "Expand." }],
      },
    });

    const [generation, rewrite] = provider.generateStructured.mock.calls.map(([request]) => request);
    expect(generation.system).toContain(
      "hệ thống đếm mỗi đơn vị đã chuẩn hóa và được ngăn cách bởi whitespace là 1 âm tiết.",
    );
    expect(generation.system).toContain(
      "Tối thiểu 600 âm tiết; mục tiêu 700-900 âm tiết. Không kết thúc khi chưa đạt tối thiểu 700 âm tiết.",
    );
    expect(generation.system).toContain(
      "Kế hoạch triển khai: viết 5 đoạn văn thực chất, mỗi đoạn ít nhất 140 đơn vị",
    );
    expect(rewrite.system).toContain(
      "Độ dài prior section theo cách đếm trên: overview: hiện 3 âm tiết, cần bổ sung ít nhất 697 âm tiết.",
    );
    expect(rewrite.system).toContain(
      "Có finding MINIMUM_SYLLABLES: giữ nguyên mọi nội dung hợp lệ, không tóm tắt hoặc nén nội dung",
    );
    expect(rewrite.system).toContain("đạt ít nhất 700 âm tiết cho phần này.");
  });

  it("gives V4.1.2 item-addressed sections deterministic per-item length plans", async () => {
    const provider = {
      generateStructured: vi.fn().mockImplementation(async (request) => {
        const key = JSON.parse(request.user).sectionKey;
        return { ok: true, value: { value: outputFor(key), providerId: "mock", modelId: "model" } };
      }),
    };
    const shared = {
      knowledgePacks: [],
      provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    };
    await writeComprehensiveReportSectionV4({
      ...shared,
      sectionKey: "keyConfigurations",
      facts: facts(),
    });
    await writeComprehensiveReportSectionV4({
      ...shared,
      sectionKey: "practicalDirection",
      facts: facts(),
      rewrite: {
        priorSection: {
          key: "practicalDirection",
          value: Array.from({ length: 3 }, () => ({
            recommendation: "một",
            rationale: "hai   ",
            avoid: "\nba",
            evidenceKeys: ["natal.ziwei.palace.life"],
          })),
        },
        findings: [{ itemKey: "practicalDirection[0]", code: "MINIMUM_SYLLABLES", note: "Expand." }],
      },
    });
    await writeComprehensiveReportSectionV4({
      ...shared,
      sectionKey: "birthTimeSensitivity",
      facts: productionFacts(),
    });

    const [keyConfigurations, practicalDirection, birthTimeSensitivity] =
      provider.generateStructured.mock.calls.map(([request]) => request);
    expect(keyConfigurations.system).toContain("Mỗi phần tử được kiểm tra riêng.");
    expect(keyConfigurations.system).toContain(
      "với TỪNG keyConfigurations[i], viết 3 đoạn thực chất trong narrative, mỗi đoạn ít nhất 100 đơn vị",
    );
    expect(practicalDirection.system).toContain(
      "với TỪNG practicalDirection[i], phân bổ nội dung thực chất cho recommendation, rationale và avoid; mỗi trường ít nhất 50 đơn vị",
    );
    expect(practicalDirection.system).toContain(
      "practicalDirection[0]: hiện 3 âm tiết, cần bổ sung ít nhất 147 âm tiết",
    );
    expect(practicalDirection.system).toContain(
      "practicalDirection[1]: hiện 3 âm tiết, cần bổ sung ít nhất 147 âm tiết",
    );
    expect(practicalDirection.system).toContain("đạt ít nhất 150 âm tiết cho từng item.");
    expect(birthTimeSensitivity.system).toContain(
      "với TỪNG mục stableFactors và sensitiveFactors, viết 4 đoạn thực chất trong narrative, mỗi đoạn ít nhất 100 đơn vị",
    );
    expect(birthTimeSensitivity.system).toContain(
      "Tối thiểu 300 âm tiết; mục tiêu 400-600 âm tiết. Không kết thúc khi chưa đạt tối thiểu 400 âm tiết.",
    );
  });

  it("keeps V4.1.2 keyConfigurations title, order, and evidenceKeys identity contract", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: { value: outputFor("keyConfigurations"), providerId: "mock", modelId: "model" },
      }),
    };
    const priorSection = {
      key: "keyConfigurations" as const,
      value: [
        { title: "First", narrative: "Candidate", evidenceKeys: ["e1"] },
        { title: "Second", narrative: "Candidate", evidenceKeys: ["e2"] },
      ],
    };
    await writeComprehensiveReportSectionV4({
      sectionKey: "keyConfigurations",
      facts: facts(),
      knowledgePacks: [],
      provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
      rewrite: {
        priorSection,
        findings: [{ itemKey: "keyConfigurations[1]", code: "EVIDENCE_ANCHORS", note: "Correct item." }],
      },
    });
    const payload = JSON.parse(provider.generateStructured.mock.calls[0][0].user);
    expect(payload.acceptanceContract.keyConfigurations).toEqual({
      preserveExactTitleOrderEvidenceKeysIdentity: true,
    });
    expect(payload.rewrite).toMatchObject({
      itemKeys: ["keyConfigurations[0]", "keyConfigurations[1]"],
      preserveItemCount: true,
      preserveItemOrder: true,
      preserveEvidenceKeys: true,
    });
  });

  it("maps production V4 evidence items by source key without leaking raw, unrelated, or mismatched timing keys", async () => {
    const reportFacts = productionFacts();
    const provider = {
      generateStructured: vi.fn().mockImplementation(async (request) => {
        const key = JSON.parse(request.user).sectionKey;
        return { ok: true, value: { value: outputFor(key), providerId: "mock", modelId: "model" } };
      }),
    };
    const configurationPack = {
      id: "patterns_transformations",
      evidenceKeys: [
        "zi-fu-tong-gong",
        "ziwei.transformation.power",
        "ziwei.transformation.prosperity",
        "not-mapped",
      ],
      passages: [{ passageId: "configuration", content: "Production configuration context", metadata: {} as any }],
    };

    await writeComprehensiveReportSectionV4({
      sectionKey: "keyConfigurations", facts: reportFacts, knowledgePacks: [configurationPack],
      provider: provider as never, promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
    });
    await writeComprehensiveReportSectionV4({
      sectionKey: "palace:ziwei.palace.life", facts: reportFacts, knowledgePacks: [],
      provider: provider as never, promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
    });
    await writeComprehensiveReportSectionV4({
      sectionKey: "currentDecadal", facts: reportFacts, knowledgePacks: [],
      provider: provider as never, promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
    });
    await writeComprehensiveReportSectionV4({
      sectionKey: "annualSnapshot", facts: reportFacts, knowledgePacks: [],
      provider: provider as never, promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
    });

    const [configuration, palace, decadal, annual] = provider.generateStructured.mock.calls
      .map(([request]) => JSON.parse(request.user));
    expect(configuration.facts.natal.palaces).toEqual([]);
    expect(configuration.facts.natal.transformations).toEqual(reportFacts.natal.transformations);
    expect(configuration.facts.natal.patterns).toEqual(reportFacts.natal.patterns);
    expect(configuration.allowedEvidenceKeys).toContain("natal.zi-fu-tong-gong");
    expect(configuration.allowedEvidenceKeys).toContain("natal.ziwei.transformation.power");
    expect(configuration.allowedEvidenceKeys).not.toContain("zi-fu-tong-gong");
    expect(configuration.allowedEvidenceKeys).not.toContain("ziwei.transformation.power");
    expect(configuration.allowedEvidenceKeys.every((key: string) => key.startsWith("natal."))).toBe(true);
    expect(configuration.knowledgePacks[0].evidenceKeys).toEqual([
      "natal.zi-fu-tong-gong",
      "natal.ziwei.transformation.power",
      "natal.ziwei.transformation.prosperity",
    ]);

    expect(palace.allowedEvidenceKeys).toContain("natal.ziwei.palace.life");
    expect(palace.allowedEvidenceKeys).not.toContain("natal.ziwei.palace.career");
    expect(palace.allowedEvidenceKeys.every((key: string) => key.startsWith("natal."))).toBe(true);

    expect(decadal.allowedEvidenceKeys).toContain("decadal.state.active");
    expect(decadal.allowedEvidenceKeys.every((key: string) => key.startsWith("natal.") || key.startsWith("decadal."))).toBe(true);
    expect(decadal.allowedEvidenceKeys.some((key: string) => key.startsWith("annual."))).toBe(false);
    expect(annual.allowedEvidenceKeys).toContain("annual.target-year.2026");
    expect(annual.allowedEvidenceKeys.every((key: string) => key.startsWith("natal.") || key.startsWith("annual."))).toBe(true);
    expect(annual.allowedEvidenceKeys.some((key: string) => key.startsWith("decadal."))).toBe(false);
  });

  it("keeps FD-072 restoration constraints and rejects unsupported prompt versions", async () => {
    const provider = { generateStructured: vi.fn() };
    await expect(() => writeComprehensiveReportSectionV4({
      sectionKey: "overview", facts: facts(), knowledgePacks: [], provider: provider as never,
      promptVersion: "ziwei.comprehensive.prompt.v4" as any,
    })).rejects.toThrow("COMPREHENSIVE_REPORT_SECTION_PROMPT_UNSUPPORTED");
  });

  it("adds enum-only contextual guidance without changing facts or evidence", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: { value: outputFor("practicalDirection"), providerId: "mock", modelId: "model" },
      }),
    };
    const sharedFacts = facts();
    const baseline = await writeComprehensiveReportSectionV4({
      sectionKey: "practicalDirection", facts: sharedFacts, knowledgePacks: [], provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
    });
    const personalized = await writeComprehensiveReportSectionV4({
      sectionKey: "practicalDirection", facts: sharedFacts, knowledgePacks: [], provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
      readingContext: { version: 1, lifeStage: "early_career", topConcern: "career" },
    });
    expect(baseline.ok).toBe(true);
    expect(personalized.ok).toBe(true);
    const [neutral, contextual] = provider.generateStructured.mock.calls.map(([request]) => JSON.parse(request.user));
    expect(neutral.readingContext).toBeNull();
    expect(contextual.readingContext).toEqual({ lifeStage: "early_career", topConcern: "career" });
    expect(contextual.personalizationGuidance).toEqual({ useTopConcernForPracticalDirection: true });
    expect(neutral.facts).toEqual(contextual.facts);
    expect(neutral.allowedEvidenceKeys).toEqual(contextual.allowedEvidenceKeys);
    expect(JSON.stringify(contextual)).not.toContain("1990-01-01");
    expect(JSON.stringify(contextual)).not.toContain("08:30");
    expect(JSON.stringify(contextual)).not.toContain("Hanoi");
  });

  it("serializes V4.1 sensitivity from frozen normalized comparisons without raw birth PII", async () => {
    const reportFacts = facts();
    reportFacts.sensitivity = {
      stableFactKeys: ["ziwei.fact.soul-palace"],
      sensitiveFacts: [{
        factKey: "ziwei.fact.body-palace",
        variants: [
          { position: "previous", valueIds: ["ziwei.palace.life"], evidenceKeys: [] },
          { position: "selected", valueIds: ["ziwei.palace.career"], evidenceKeys: [] },
          { position: "next", valueIds: ["ziwei.palace.wealth"], evidenceKeys: [] },
        ],
      }],
    };
    reportFacts.evidence.items.push(
      { key: "sensitivity.stable.ziwei.fact.soul-palace", dimension: "sensitivity", sourceKeys: ["ziwei.fact.soul-palace"] },
      { key: "sensitivity.sensitive.ziwei.fact.body-palace", dimension: "sensitivity", sourceKeys: ["ziwei.fact.body-palace"] },
    );
    reportFacts.evidenceKeys.push(
      "sensitivity.stable.ziwei.fact.soul-palace",
      "sensitivity.sensitive.ziwei.fact.body-palace",
    );
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: { value: outputFor("birthTimeSensitivity"), providerId: "mock", modelId: "model" },
      }),
    };
    const result = await writeComprehensiveReportSectionV4({
      sectionKey: "birthTimeSensitivity",
      facts: reportFacts,
      knowledgePacks: [],
      provider: provider as never,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
    });
    expect(result.ok).toBe(true);
    const payload = JSON.parse(provider.generateStructured.mock.calls[0][0].user);
    expect(payload.allowedEvidenceKeys).toEqual([
      "sensitivity.sensitive.ziwei.fact.body-palace",
      "sensitivity.stable.ziwei.fact.soul-palace",
    ]);
    expect(payload.facts.sensitivity).not.toHaveProperty("selectedFrame");
    expect(JSON.stringify(payload)).not.toContain("1990-01-01");
    expect(JSON.stringify(payload)).not.toContain("08:30");
    expect(JSON.stringify(payload)).not.toContain("Hanoi");
  });
});
