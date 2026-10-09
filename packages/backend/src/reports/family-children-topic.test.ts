import { expect, it, vi } from "vitest";
import { findLaProduct, resolveEntitlementScopeForSku, ZiweiTopicDeepDiveContentV1Schema,
  TOPIC_PALACE_SCOPES, ZIWEI_TOPIC_SKU_MAP } from "@lasoviet/contracts";
import { topicIdForSku } from "./topic-report-config.js";
import { buildFactsFixture, makeFamilyChildrenContentFixture, makeValidCareerContent } from "./topic-report.test-fixture.js";
import { writeZiweiTopicDeepDiveV4 } from "./topic-deep-dive-writer-v4.js";
import { validateZiweiTopicDeepDiveQualityV4 } from "./topic-deep-dive-quality-v4.js";
import { renderTopicReportHtml } from "./topic-report-html.js";
import { freezePurchaseCommercialTerms } from "../commerce/purchase-commercial-terms.js";
import type { AiProvider } from "../ai/ai-provider.js";
import { normalizeChunkMetadata } from "../knowledge/knowledge-ingestion.service.js";

// Mechanical synthetic draft thresholds do not certify default depth/manual sale acceptance.
const config = { minOverviewSyllables: 50, minPalaceAnchorSyllables: 50,
  minThematicDimensionSyllables: 50, minDecadalTimingSyllables: 50,
  minActionItemSyllables: 20, minTotalSyllables: 200 };
const facts = buildFactsFixture();
const content = () => makeFamilyChildrenContentFixture(facts);
const providerFor = (value: unknown): AiProvider => ({ generateStructured: vi.fn().mockResolvedValue({ok: true,
  value: {value, providerId: "synthetic", modelId: "synthetic"}}) });

it("keeps the closed family children SKU reserved480/vi with a real topic scope", () => {
  expect(ZIWEI_TOPIC_SKU_MAP.family_children).toBe("ZIWEI-FAMILY-CHILDREN-P0");
  expect(topicIdForSku("ZIWEI-FAMILY-CHILDREN-P0")).toBe("family_children");
  expect(topicIdForSku("ZIWEI-FAMILY-CHILDREN-UNTRUSTED")).toBeNull();
  expect(findLaProduct("ZIWEI-FAMILY-CHILDREN-P0")).toMatchObject({priceLa: 480, availability: "reserved", locales: ["vi"], qualifiesForRollover: false,
    name: {vi: "Gia đạo và con cái", en: "Family and children"}});
  expect(resolveEntitlementScopeForSku("ZIWEI-FAMILY-CHILDREN-P0")).toEqual({sections: ["topicDeepDive"]});
  expect(TOPIC_PALACE_SCOPES.family_children.primaryPalaces).toEqual(["ziwei.palace.children", "ziwei.palace.property"]);
  expect(TOPIC_PALACE_SCOPES.family_children.supportingPalaces).toEqual(["ziwei.palace.parents", "ziwei.palace.siblings", "ziwei.palace.fortune"]);
});

it("requires both family primary anchors and rejects unrelated or repeated anchors", () => {
  expect(ZiweiTopicDeepDiveContentV1Schema.safeParse(content()).success).toBe(true);
  for (const anchors of [content().palaceAnchors.slice(0, 1), [...content().palaceAnchors, {...content().palaceAnchors[0]!, palaceId: "ziwei.palace.spouse"}],
    [...content().palaceAnchors, content().palaceAnchors[0]!]]) {
    expect(ZiweiTopicDeepDiveContentV1Schema.safeParse({...content(), palaceAnchors: anchors}).success).toBe(false);
  }
});

it("freezes the new family children promise without inventing a pre-policy purchase", () => {
  const input = {ownerId: "owner", chartId: "chart", chartVersionId: "version", sku: "ZIWEI-FAMILY-CHILDREN-P0",
    locale: "vi" as const, periodKey: "lifetime", priceLa: 480, createdAt: new Date("2026-10-08T00:00:00Z")};
  expect(freezePurchaseCommercialTerms(input)).toMatchObject({version: 2, policy: "fd119", basePriceLa: 480, chargedLa: 480, guarantee: "full"});
  expect(() => freezePurchaseCommercialTerms(input, undefined, "pre-fd119")).toThrow();
});

it("uses the actual scoped writer and produces safe HTML without evidence identifiers", async () => {
  const provider = providerFor(content());
  const result = await writeZiweiTopicDeepDiveV4({topicId: "family_children", facts, knowledgePacks: [], provider, qualityConfig: config});
  expect(result.ok).toBe(true); if (!result.ok) throw new Error("synthetic family children draft rejected");
  expect(result.value.quality).toEqual({ok: true, findings: []});
  expect(provider.generateStructured).toHaveBeenCalledTimes(1);
  const request = vi.mocked(provider.generateStructured).mock.calls[0]![0];
  expect(request.schemaName).toBe("ziwei_topic_deep_dive_family_children");
  const payload = JSON.parse(request.user);
  expect(payload.familyScope.focus).toContain("Household cooperation");
  expect(payload.familyScope.forbidden).toContain("child count or sex");
  expect(payload.scopedFacts.natalPalaces.map((p: {palaceId: string}) => p.palaceId)).toEqual(expect.arrayContaining(["ziwei.palace.children", "ziwei.palace.property"]));
  expect(payload.scopedFacts.natalPalaces.some((p: {palaceId: string}) => p.palaceId === "ziwei.palace.spouse")).toBe(false);
  const html = renderTopicReportHtml(result.value.content);
  expect(html).toContain("Gia đạo và con cái"); expect(html).not.toContain("evidenceKeys");
  for (const key of result.value.content.overview.evidenceKeys) expect(html).not.toContain(key);
});

it("rejects a career body returned for the family children request", async () => {
  const provider = providerFor(makeValidCareerContent(facts));
  expect(await writeZiweiTopicDeepDiveV4({topicId: "family_children", facts, knowledgePacks: [], provider, qualityConfig: config}))
    .toMatchObject({ok: false, error: {code: "AI_OUTPUT_INVALID"}});
  expect(provider.generateStructured).toHaveBeenCalledTimes(1);
});

it("selects family and scoped palace knowledge instead of unrelated career or spouse packs", async () => {
  const ids = ["thematic_career_wealth", "palace_ziwei.palace.spouse", "thematic_relationships_family",
    "palace_ziwei.palace.children", "palace_ziwei.palace.property", "palace_ziwei.palace.parents"];
  const provider = providerFor(content());
  const knowledgePacks = ids.map(id => ({id, evidenceKeys: [], passages: [{passageId: `passage:${id}`,
    content: `SYNTHETIC_${id}`, metadata: normalizeChunkMetadata(undefined, "vi") }]}));
  const result = await writeZiweiTopicDeepDiveV4({topicId: "family_children", facts, knowledgePacks, provider, qualityConfig: config});
  expect(result.ok).toBe(true);
  const payload = JSON.parse(vi.mocked(provider.generateStructured).mock.calls[0]![0].user);
  expect(payload.knowledgePacks.map((pack: {id: string}) => pack.id)).toEqual(ids.slice(2));
  expect(JSON.stringify(payload.knowledgePacks)).not.toContain("thematic_career_wealth");
  expect(JSON.stringify(payload.knowledgePacks)).not.toContain("palace_ziwei.palace.spouse");
});

it("rejects excluded evidence even when it exists in the full chart", async () => {
  const value = content();
  const excluded = facts.evidence.items.find(item => item.dimension === "natal" && item.sourceKeys.includes("ziwei.palace.spouse"))!;
  value.overview.evidenceKeys.push(excluded.key);
  expect(await writeZiweiTopicDeepDiveV4({topicId: "family_children", facts, knowledgePacks: [], provider: providerFor(value), qualityConfig: config}))
    .toMatchObject({ok: false, error: {code: "AI_OUTPUT_INVALID"}});
});

it.each(["Thu nhập 50 triệu mỗi tháng.", "Lợi nhuận 25%.", "Doanh thu 100000000 VND.", "Thu nhập USD 1000 mỗi tháng.", "Doanh thu VND 100000000.", "Lợi nhuận $500.", "Doanh thu đạt 100000000."])("rejects uncomputed family children metrics: %s", text => {
  const value = content(); value.overview.narrative += " " + text;
  expect(validateZiweiTopicDeepDiveQualityV4(value, facts, config)).toMatchObject({ok: false,
    findings: expect.arrayContaining([expect.objectContaining({code: "UNSUPPORTED_FINANCIAL_METRIC"})])});
});

it.each(["Bạn sẽ có con.", "Bạn đang mang thai.", "Bạn sẽ sinh hai con.", "Bạn sẽ sinh 2 con gái.",
  "Con đầu lòng là trai.", "Con đầu lòng là con trai.", "Con đầu lòng là bé gái.", "Sinh con vào năm 2027.", "Bạn đã kết hôn.", "Bạn sẽ ly hôn.",
  "Bạn mắc chứng vô sinh.", "Bạn cần được chẩn đoán hiếm muộn."])("rejects unsupported family claim: %s", text => {
  const value = content(); value.overview.narrative += ` ${text}`;
  expect(validateZiweiTopicDeepDiveQualityV4(value, facts, config)).toMatchObject({ok: false,
    findings: expect.arrayContaining([expect.objectContaining({code: "UNSUPPORTED_FAMILY_CLAIM"})])});
});

it("retains actual decade/content gates and does not certify the short mechanics fixture at default depth", () => {
  const value = content(); if (value.decadalTiming.state !== "active") throw new Error("active fixture required");
  value.decadalTiming.yearRange = [2060, 2069];
  expect(validateZiweiTopicDeepDiveQualityV4(value, facts, config)).toMatchObject({ok: false,
    findings: expect.arrayContaining([expect.objectContaining({code: "DECADAL_TIMING_MISMATCH"})])});
  expect(validateZiweiTopicDeepDiveQualityV4(content(), facts).ok).toBe(false);
});
