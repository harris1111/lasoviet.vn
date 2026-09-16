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
    expect(ziweiKnowledgeV4ValidationV1.version).toBe("ziwei.knowledge.validation.v4.1");
    expect(ziweiKnowledgeV4ValidationV1.usefulChunk.maximumCharacters).toBe(1200);
    expect(ziweiKnowledgeV4ValidationV1).not.toHaveProperty("retrievalMaxPassages");
    expect(ziweiKnowledgeV4ValidationV1).not.toHaveProperty("reportConfigVersion");
    expect(Object.isFrozen(ziweiKnowledgeV4ValidationV1)).toBe(true);
  });

  it("rejects malformed, unknown, duplicate-normalized, and invalid regex configuration", () => {
    expect(() => validateZiweiKnowledgeV4ValidationConfig({ ...source(), unexpected: true }))
      .toThrow("ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID");

    const duplicate = source();
    duplicate.deathTerms = [...duplicate.deathTerms, duplicate.deathTerms[0]!.toUpperCase()];
    expect(() => validateZiweiKnowledgeV4ValidationConfig(duplicate))
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
