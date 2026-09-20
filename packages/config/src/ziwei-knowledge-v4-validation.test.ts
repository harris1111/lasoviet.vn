import { describe, expect, it } from "vitest";

import {
  validateZiweiKnowledgeV4ValidationConfig,
  ziweiKnowledgeV4ValidationV1,
} from "./ziwei-knowledge-v4-validation.js";

function source() {
  return structuredClone(ziweiKnowledgeV4ValidationV1);
}

describe("Zi Wei knowledge V4 validation config", () => {
  it("loads a closed corpus-only policy", () => {
    expect(ziweiKnowledgeV4ValidationV1.version).toBe("ziwei.knowledge.validation.v4.5");
    expect(ziweiKnowledgeV4ValidationV1.prohibitedProcessTerms).toEqual([
      "AI",
      "hệ thống",
      "dữ liệu",
      "cách tính",
      "tính toán",
      "identifier",
      "key",
      "provenance",
      "prose",
      "metadata",
      "mapping",
      "output",
      "V4",
      "đầu ra",
      "kết quả trung gian",
      "công cụ truy xuất",
      "cấu trúc dữ liệu",
      "quy trình biên tập",
      "template",
      "ma trận",
      "biên tập",
      "đầu vào",
      "phép tính",
      "tái tạo nguồn",
      "cấu hình kỹ thuật",
      "bản mới",
    ]);
    expect(ziweiKnowledgeV4ValidationV1.prohibitedEnglishProseTerms).toEqual([
      "Glossary",
      "bright",
      "exalted",
      "prosperous",
      "favorable",
      "neutral",
      "unfavorable",
      "weak",
    ]);
    expect(ziweiKnowledgeV4ValidationV1.usefulChunk.maximumCharacters).toBe(1200);
    expect(ziweiKnowledgeV4ValidationV1).not.toHaveProperty("retrievalMaxPassages");
    expect(ziweiKnowledgeV4ValidationV1).not.toHaveProperty("reportConfigVersion");
    expect(Object.isFrozen(ziweiKnowledgeV4ValidationV1)).toBe(true);
  });

  it("keeps new process variants normalized, unique, and closed", () => {
    const processVariants = [
      "biên tập",
      "đầu vào",
      "phép tính",
      "tái tạo nguồn",
      "cấu hình kỹ thuật",
      "bản mới",
    ];
    for (const term of processVariants) {
      expect(ziweiKnowledgeV4ValidationV1.prohibitedProcessTerms).toContain(term);
      const duplicate = source();
      duplicate.prohibitedProcessTerms = [...duplicate.prohibitedProcessTerms, term.toUpperCase()];
      expect(() => validateZiweiKnowledgeV4ValidationConfig(duplicate))
        .toThrow("ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID");
    }
  });

  it("rejects malformed, unknown, duplicate-normalized, and invalid regex configuration", () => {
    expect(() => validateZiweiKnowledgeV4ValidationConfig({ ...source(), unexpected: true }))
      .toThrow("ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID");

    const duplicate = source();
    duplicate.deathTerms = [...duplicate.deathTerms, duplicate.deathTerms[0]!.toUpperCase()];
    expect(() => validateZiweiKnowledgeV4ValidationConfig(duplicate))
      .toThrow("ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID");

    const duplicateProcessTerm = source();
    duplicateProcessTerm.prohibitedProcessTerms = [
      ...duplicateProcessTerm.prohibitedProcessTerms,
      "v4",
    ];
    expect(() => validateZiweiKnowledgeV4ValidationConfig(duplicateProcessTerm))
      .toThrow("ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID");

    const invalidRegex = source();
    invalidRegex.adverseDatePatterns = ["["];
    expect(() => validateZiweiKnowledgeV4ValidationConfig(invalidRegex))
      .toThrow("ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID");

    const invalidThresholds = source();
    invalidThresholds.usefulChunk.targetMinimumSentences = 5;
    expect(() => validateZiweiKnowledgeV4ValidationConfig(invalidThresholds))
      .toThrow("ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID");
  });
});
