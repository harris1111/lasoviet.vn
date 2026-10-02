import { describe, expect, it } from "vitest";
import { buildFreeResultTopics } from "./free-result-topic-catalog";

describe("free-result life-question topics", () => {
  it("separates supported multiculng topics from the twelve-palace map", () => {
    const topics = buildFreeResultTopics("vi");
    expect(topics.map((item) => item.id)).toEqual(["career_wealth", "relationship_marriage"]);
    expect(topics[0]?.primaryPalaces).toEqual(["ziwei.palace.career", "ziwei.palace.wealth"]);
    expect(topics[0]?.supportingPalaces).toContain("ziwei.palace.property");
    expect(topics[1]?.primaryPalaces).toEqual(["ziwei.palace.spouse"]);
    expect(topics[1]?.supportingPalaces).toContain("ziwei.palace.parents");
    expect(topics.map((item) => item.sku)).toEqual(["ZIWEI-CAREER-P0", "ZIWEI-RELATIONSHIP-P0"]);
    expect(topics.every((item) => item.state === "locked" && item.sourceKind === "structural")).toBe(true);
  });
  it("prioritizes the supported relationship topic for love without inventing content", () => {
    const topics = buildFreeResultTopics("en", "love");
    expect(topics[0]?.id).toBe("relationship_marriage");
    expect(topics[0]?.title).toContain("Relationships");
    expect(topics[0]?.question).toContain("?");
    expect(JSON.stringify(topics)).not.toContain("price");
  });
});
