import { expect, it, vi } from "vitest";
import { findLaProduct, resolveEntitlementScopeForSku, ZiweiTopicDeepDiveContentV1Schema,
  TOPIC_PALACE_SCOPES, ZIWEI_TOPIC_SKU_MAP } from "@lasoviet/contracts";
import { topicIdForSku } from "./topic-report-config.js";
import { buildFactsFixture, makeBusinessContentFixture, makeValidCareerContent } from "./topic-report.test-fixture.js";
import { writeZiweiTopicDeepDiveV4 } from "./topic-deep-dive-writer-v4.js";
import { validateZiweiTopicDeepDiveQualityV4 } from "./topic-deep-dive-quality-v4.js";
import { renderTopicReportHtml } from "./topic-report-html.js";
import { freezePurchaseCommercialTerms } from "../commerce/purchase-commercial-terms.js";
import type { AiProvider } from "../ai/ai-provider.js";

// Mechanical synthetic draft thresholds do not certify default depth/manual sale acceptance.
const config = { minOverviewSyllables: 50, minPalaceAnchorSyllables: 50,
  minThematicDimensionSyllables: 50, minDecadalTimingSyllables: 50,
  minActionItemSyllables: 20, minTotalSyllables: 200 };
const facts = buildFactsFixture();
const content = () => makeBusinessContentFixture(facts);
const providerFor = (value: unknown): AiProvider => ({ generateStructured: vi.fn().mockResolvedValue({ok: true,
  value: {value, providerId: "synthetic", modelId: "synthetic"}}) });

it("keeps the closed business SKU reserved480/vi with a real topic scope", () => {
  expect(ZIWEI_TOPIC_SKU_MAP.business_enterprise).toBe("ZIWEI-BUSINESS-P0");
  expect(topicIdForSku("ZIWEI-BUSINESS-P0")).toBe("business_enterprise");
  expect(topicIdForSku("ZIWEI-BUSINESS-UNTRUSTED")).toBeNull();
  expect(findLaProduct("ZIWEI-BUSINESS-P0")).toMatchObject({priceLa: 480, availability: "reserved", locales: ["vi"], qualifiesForRollover: false,
    name: {vi: "Kinh doanh và làm ăn", en: "Business and enterprise"}});
  expect(resolveEntitlementScopeForSku("ZIWEI-BUSINESS-P0")).toEqual({sections: ["topicDeepDive"]});
  expect(TOPIC_PALACE_SCOPES.business_enterprise.primaryPalaces).toEqual(["ziwei.palace.wealth", "ziwei.palace.career"]);
});

it("requires both business primary anchors and rejects unrelated or repeated anchors", () => {
  expect(ZiweiTopicDeepDiveContentV1Schema.safeParse(content()).success).toBe(true);
  for (const anchors of [content().palaceAnchors.slice(0, 1), [...content().palaceAnchors, {...content().palaceAnchors[0]!, palaceId: "ziwei.palace.spouse"}],
    [...content().palaceAnchors, content().palaceAnchors[0]!]]) {
    expect(ZiweiTopicDeepDiveContentV1Schema.safeParse({...content(), palaceAnchors: anchors}).success).toBe(false);
  }
});

it("freezes the new business promise without inventing a pre-policy purchase", () => {
  const input = {ownerId: "owner", chartId: "chart", chartVersionId: "version", sku: "ZIWEI-BUSINESS-P0",
    locale: "vi" as const, periodKey: "lifetime", priceLa: 480, createdAt: new Date("2026-10-08T00:00:00Z")};
  expect(freezePurchaseCommercialTerms(input)).toMatchObject({version: 2, policy: "fd119", basePriceLa: 480, chargedLa: 480, guarantee: "full"});
  expect(() => freezePurchaseCommercialTerms(input, undefined, "pre-fd119")).toThrow();
});

it("uses the actual scoped writer and produces safe HTML without evidence identifiers", async () => {
  const provider = providerFor(content());
  const result = await writeZiweiTopicDeepDiveV4({topicId: "business_enterprise", facts, knowledgePacks: [], provider, qualityConfig: config});
  expect(result.ok).toBe(true); if (!result.ok) throw new Error("synthetic business draft rejected");
  expect(result.value.quality).toEqual({ok: true, findings: []});
  expect(provider.generateStructured).toHaveBeenCalledTimes(1);
  const request = vi.mocked(provider.generateStructured).mock.calls[0]![0];
  expect(request.schemaName).toBe("ziwei_topic_deep_dive_business_enterprise");
  const payload = JSON.parse(request.user);
  expect(payload.businessScope.focus).toContain("independent enterprise");
  expect(payload.scopedFacts.natalPalaces.map((p: {palaceId: string}) => p.palaceId)).toEqual(expect.arrayContaining(["ziwei.palace.wealth", "ziwei.palace.career"]));
  expect(payload.scopedFacts.natalPalaces.some((p: {palaceId: string}) => p.palaceId === "ziwei.palace.spouse")).toBe(false);
  const html = renderTopicReportHtml(result.value.content);
  expect(html).toContain("Kinh doanh và làm ăn"); expect(html).not.toContain("evidenceKeys");
  for (const key of result.value.content.overview.evidenceKeys) expect(html).not.toContain(key);
});

it("rejects a career body returned for the business request", async () => {
  const provider = providerFor(makeValidCareerContent(facts));
  expect(await writeZiweiTopicDeepDiveV4({topicId: "business_enterprise", facts, knowledgePacks: [], provider, qualityConfig: config}))
    .toMatchObject({ok: false, error: {code: "AI_OUTPUT_INVALID"}});
  expect(provider.generateStructured).toHaveBeenCalledTimes(1);
});

it("rejects excluded evidence even when it exists in the full chart", async () => {
  const value = content();
  const excluded = facts.evidence.items.find(item => item.dimension === "natal" && item.sourceKeys.includes("ziwei.palace.spouse"))!;
  value.overview.evidenceKeys.push(excluded.key);
  expect(await writeZiweiTopicDeepDiveV4({topicId: "business_enterprise", facts, knowledgePacks: [], provider: providerFor(value), qualityConfig: config}))
    .toMatchObject({ok: false, error: {code: "AI_OUTPUT_INVALID"}});
});

it.each(["Thu nhập 50 triệu mỗi tháng.", "Lợi nhuận 25%.", "Doanh thu 100000000 VND.", "Thu nhập USD 1000 mỗi tháng.", "Doanh thu VND 100000000.", "Lợi nhuận $500.", "Doanh thu đạt 100000000."])("rejects uncomputed business metrics: %s", text => {
  const value = content(); value.overview.narrative += " " + text;
  expect(validateZiweiTopicDeepDiveQualityV4(value, facts, config)).toMatchObject({ok: false,
    findings: expect.arrayContaining([expect.objectContaining({code: "UNSUPPORTED_FINANCIAL_METRIC"})])});
});

it("retains actual decade/content gates and does not certify the short mechanics fixture at default depth", () => {
  const value = content(); if (value.decadalTiming.state !== "active") throw new Error("active fixture required");
  value.decadalTiming.yearRange = [2060, 2069];
  expect(validateZiweiTopicDeepDiveQualityV4(value, facts, config)).toMatchObject({ok: false,
    findings: expect.arrayContaining([expect.objectContaining({code: "DECADAL_TIMING_MISMATCH"})])});
  expect(validateZiweiTopicDeepDiveQualityV4(content(), facts).ok).toBe(false);
});
