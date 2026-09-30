import { describe, expect, it, vi } from "vitest";
import type {
  ZiweiTopicDeepDiveContentV1,
} from "@lasoviet/contracts";

import type { AiProvider } from "../ai/ai-provider.js";
import {
  generateZiweiTopicDeepDiveWithQualityLoopV4,
  writeZiweiTopicDeepDiveV4,
} from "./topic-deep-dive-writer-v4.js";

import { buildFactsFixture, makeValidRelationshipContent, makeValidCareerContent } from "./topic-report.test-fixture.js";

describe("ZiweiTopicDeepDiveWriterV4", () => {
  const facts = buildFactsFixture();

  it("successfully generates relationship deep dive with mocked provider", async () => {
    const validContent = makeValidRelationshipContent(facts);
    let capturedRequest: any = null;

    const mockProvider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        capturedRequest = req;
        return {
          ok: true,
          value: {
            value: validContent,
            providerId: "mock-provider",
            modelId: "mock-model",
          },
        };
      }),
    };

    const result = await writeZiweiTopicDeepDiveV4({
      topicId: "relationship_marriage",
      facts,
      knowledgePacks: [],
      provider: mockProvider,
      qualityConfig: {
        minOverviewSyllables: 50,
        minPalaceAnchorSyllables: 50,
        minThematicDimensionSyllables: 50,
        minDecadalTimingSyllables: 50,
        minActionItemSyllables: 20,
        minTotalSyllables: 200,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.content.topicId).toBe("relationship_marriage");
    expect(result.value.quality.ok).toBe(true);
    expect(capturedRequest.schemaName).toBe("ziwei_topic_deep_dive_relationship_marriage");

    const parsedUser = JSON.parse(capturedRequest.user);
    expect(parsedUser.topicId).toBe("relationship_marriage");
    expect(parsedUser.allowedEvidenceKeys.length).toBeGreaterThan(0);
    expect(parsedUser.scopedFacts.natalPalaces.some((p: any) => p.palaceId === "ziwei.palace.spouse")).toBe(true);
  });

  it("successfully generates career & wealth deep dive with mocked provider", async () => {
    const validContent = makeValidCareerContent(facts);
    const mockProvider: AiProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: validContent,
          providerId: "mock-provider",
          modelId: "mock-model",
        },
      }),
    };

    const result = await writeZiweiTopicDeepDiveV4({
      topicId: "career_wealth",
      facts,
      knowledgePacks: [],
      provider: mockProvider,
      qualityConfig: {
        minOverviewSyllables: 50,
        minPalaceAnchorSyllables: 50,
        minThematicDimensionSyllables: 50,
        minDecadalTimingSyllables: 50,
        minActionItemSyllables: 20,
        minTotalSyllables: 200,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.content.topicId).toBe("career_wealth");
    expect(result.value.quality.ok).toBe(true);
  });

  it("carries readingContext into user payload", async () => {
    let capturedUser: any = null;
    const mockProvider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        capturedUser = JSON.parse(req.user);
        return {
          ok: true,
          value: {
            value: makeValidRelationshipContent(facts),
            providerId: "mock-provider",
            modelId: "mock-model",
          },
        };
      }),
    };

    await writeZiweiTopicDeepDiveV4({
      topicId: "relationship_marriage",
      facts,
      knowledgePacks: [],
      provider: mockProvider,
      readingContext: {
        version: 1,
        lifeStage: "early_career",
        topConcern: "love",
      },
    });

    expect(capturedUser.readingContext).toEqual({
      version: 1,
      lifeStage: "early_career",
      topConcern: "love",
    });
  });

  it("executes quality rewrite loop when initial generation has quality findings", async () => {
    const initialContentWithFinding = makeValidRelationshipContent(facts);
    initialContentWithFinding.overview.narrative += " Điều này chắc chắn sẽ thành.";

    const correctedContent = makeValidRelationshipContent(facts);

    let callCount = 0;
    const mockProvider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            value: {
              value: initialContentWithFinding,
              providerId: "mock-provider",
              modelId: "mock-model",
            },
          };
        }
        return {
          ok: true,
          value: {
            value: correctedContent,
            providerId: "mock-provider",
            modelId: "mock-model",
          },
        };
      }),
    };

    const result = await generateZiweiTopicDeepDiveWithQualityLoopV4({
      topicId: "relationship_marriage",
      facts,
      knowledgePacks: [],
      provider: mockProvider,
      maxRewriteAttempts: 1,
      qualityConfig: {
        minOverviewSyllables: 50,
        minPalaceAnchorSyllables: 50,
        minThematicDimensionSyllables: 50,
        minDecadalTimingSyllables: 50,
        minActionItemSyllables: 20,
        minTotalSyllables: 200,
      },
    });

    expect(callCount).toBe(2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.quality.ok).toBe(true);
  });

  it("handles provider failure gracefully", async () => {
    const mockProvider: AiProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "AI_TIMEOUT", retryable: true },
      }),
    };

    const result = await writeZiweiTopicDeepDiveV4({
      topicId: "relationship_marriage",
      facts,
      knowledgePacks: [],
      provider: mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_TIMEOUT");
    }
  });
});
