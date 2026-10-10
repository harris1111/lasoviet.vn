import { describe, expect, it, vi } from "vitest";
import { findLaProduct, resolveEntitlementScopeForSku, ZiweiTopicDeepDiveContentV1Schema,
  TOPIC_PALACE_SCOPES, ZIWEI_TOPIC_SKU_MAP } from "@lasoviet/contracts";
import { topicIdForSku } from "./topic-report-config.js";
import { buildFactsFixture, makeStudyHousingContentFixture, makeValidCareerContent } from "./topic-report.test-fixture.js";
import { writeZiweiTopicDeepDiveV4 } from "./topic-deep-dive-writer-v4.js";
import { validateZiweiTopicDeepDiveQualityV4 } from "./topic-deep-dive-quality-v4.js";
import { renderTopicReportHtml } from "./topic-report-html.js";
import { freezePurchaseCommercialTerms } from "../commerce/purchase-commercial-terms.js";
import type { AiProvider } from "../ai/ai-provider.js";
import { normalizeChunkMetadata } from "../knowledge/knowledge-ingestion.service.js";
// Mechanical fixtures do not certify default depth or semantic/manual acceptance.
const config = { minOverviewSyllables: 50, minPalaceAnchorSyllables: 50,
  minThematicDimensionSyllables: 50, minDecadalTimingSyllables: 50,
  minActionItemSyllables: 20, minTotalSyllables: 200 };
const facts = buildFactsFixture();
const providerFor = (value: unknown): AiProvider => ({ generateStructured: vi.fn().mockResolvedValue({ok: true,
  value: {value, providerId: "synthetic", modelId: "synthetic"}}) });
const cases = [
  {topicId: "education_career", sku: "ZIWEI-EDUCATION-CAREER-P0", name: "Học hành và con đường nghề", primary: ["ziwei.palace.career", "ziwei.palace.parents"], supporting: ["ziwei.palace.life", "ziwei.palace.fortune", "ziwei.palace.siblings"], scope: "educationScope", code: "UNSUPPORTED_EDUCATION_CLAIM",
    unsupported: ["Bạn sẽ đỗ đại học.", "Điểm thi đạt 28 điểm.", "GPA 3.8.", "Bạn đã tốt nghiệp.", "Bạn đang là sinh viên.", "Bạn chắc chắn được tuyển dụng.", "Tốt nghiệp vào năm 2027."]},
  {topicId: "property_home", sku: "ZIWEI-PROPERTY-HOME-P0", name: "Nhà đất và an cư", primary: ["ziwei.palace.property"], supporting: ["ziwei.palace.wealth", "ziwei.palace.parents", "ziwei.palace.travel"], scope: "propertyScope", code: "UNSUPPORTED_PROPERTY_CLAIM",
    unsupported: ["Bạn đang sở hữu nhà.", "Bạn sẽ mua đất.", "Chuyển nhà vào năm 2027.", "Diện tích là 80 m².", "Nhà rộng 120 mét vuông.", "Hướng nhà nên chọn đông nam.", "Bạn hợp nhà hướng bắc."]},
] as const;
describe.each(cases)("$topicId preparation", item => {
  const content = () => makeStudyHousingContentFixture(facts, item.topicId);
  it("keeps the own closed SKU reserved480/vi and requires every primary anchor", () => {
    expect(ZIWEI_TOPIC_SKU_MAP[item.topicId]).toBe(item.sku);
    expect(topicIdForSku(item.sku)).toBe(item.topicId);
    expect(topicIdForSku(`${item.sku}-UNTRUSTED`)).toBeNull();
    expect(findLaProduct(item.sku)).toMatchObject({priceLa: 480, availability: "reserved", locales: ["vi"], qualifiesForRollover: false, name: {vi: item.name}});
    expect(resolveEntitlementScopeForSku(item.sku)).toEqual({sections: ["topicDeepDive"]});
    expect(TOPIC_PALACE_SCOPES[item.topicId]).toEqual({primaryPalaces: item.primary, supportingPalaces: item.supporting});
    expect(ZiweiTopicDeepDiveContentV1Schema.safeParse(content()).success).toBe(true);
    for (const anchors of [content().palaceAnchors.slice(1), [...content().palaceAnchors, content().palaceAnchors[0]!], [...content().palaceAnchors, {...content().palaceAnchors[0]!, palaceId: "ziwei.palace.spouse"}]]) {
      expect(ZiweiTopicDeepDiveContentV1Schema.safeParse({...content(), palaceAnchors: anchors}).success).toBe(false);
    }
  });
  it("freezes actual FD119480La/full promise and rejects invented historical terms", () => {
    const input = {ownerId: "owner", chartId: "chart", chartVersionId: "version", sku: item.sku,
      locale: "vi" as const, periodKey: "lifetime", priceLa: 480, createdAt: new Date("2026-10-08T00:00:00Z")};
    expect(freezePurchaseCommercialTerms(input)).toMatchObject({version: 2, policy: "fd119", basePriceLa: 480, chargedLa: 480, guarantee: "full"});
    expect(() => freezePurchaseCommercialTerms(input, undefined, "pre-fd119")).toThrow();
  });
  it("uses actual scoped writer/prompt and redacts identifiers in rendered HTML", async () => {
    const provider = providerFor(content());
    const result = await writeZiweiTopicDeepDiveV4({topicId: item.topicId, facts, knowledgePacks: [], provider, qualityConfig: config});
    expect(result.ok).toBe(true); if (!result.ok) throw new Error("Synthetic study/housing draft rejected");
    expect(result.value.quality).toEqual({ok: true, findings: []});
    expect(provider.generateStructured).toHaveBeenCalledTimes(1);
    const request = vi.mocked(provider.generateStructured).mock.calls[0]![0];
    expect(request.schemaName).toBe(`ziwei_topic_deep_dive_${item.topicId}`);
    const payload = JSON.parse(request.user);
    expect(payload[item.scope].forbidden).toBeTruthy();
    const ids = payload.scopedFacts.natalPalaces.map((p: {palaceId: string}) => p.palaceId);
    expect(new Set(ids)).toEqual(new Set([...item.primary, ...item.supporting]));
    const html = renderTopicReportHtml(result.value.content);
    expect(html).toContain(item.name); expect(html).not.toContain("evidenceKeys");
    for (const key of result.value.content.overview.evidenceKeys) expect(html).not.toContain(key);
  });
  it("rejects wrong-topic content and excluded full-chart evidence", async () => {
    expect(await writeZiweiTopicDeepDiveV4({topicId: item.topicId, facts, knowledgePacks: [], provider: providerFor(makeValidCareerContent(facts)), qualityConfig: config})).toMatchObject({ok: false, error: {code: "AI_OUTPUT_INVALID"}});
    const value = content();
    const excluded = facts.evidence.items.find(e => e.dimension === "natal" && e.sourceKeys.includes("ziwei.palace.spouse"))!;
    value.overview.evidenceKeys.push(excluded.key);
    expect(await writeZiweiTopicDeepDiveV4({topicId: item.topicId, facts, knowledgePacks: [], provider: providerFor(value), qualityConfig: config})).toMatchObject({ok: false, error: {code: "AI_OUTPUT_INVALID"}});
  });
  it("filters nonempty knowledge to actual scoped palace packs", async () => {
    const ids = ["thematic_career_wealth", "thematic_relationships_family", "palace_ziwei.palace.spouse", `palace_${item.primary[0]}`, `palace_${item.supporting[0]}`];
    const provider = providerFor(content());
    const knowledgePacks = ids.map(id => ({id, evidenceKeys: [], passages: [{passageId: `passage:${id}`, content: `SYNTHETIC_${id}`, metadata: normalizeChunkMetadata(undefined, "vi")}]}));
    expect((await writeZiweiTopicDeepDiveV4({topicId: item.topicId, facts, knowledgePacks, provider, qualityConfig: config})).ok).toBe(true);
    expect(JSON.parse(vi.mocked(provider.generateStructured).mock.calls[0]![0].user).knowledgePacks.map((p: {id: string}) => p.id)).toEqual(ids.slice(3));
  });
  it.each(item.unsupported)("rejects source-unsupported assertion: %s", text => {
    const value = content(); value.overview.narrative += ` ${text}`;
    expect(validateZiweiTopicDeepDiveQualityV4(value, facts, config)).toMatchObject({ok: false, findings: expect.arrayContaining([expect.objectContaining({code: item.code})])});
  });
  it("rejects uncomputed financial metrics and wrong decadal binding; retains default depth", () => {
    const value = content(); value.overview.narrative += " Lợi nhuận 25%.";
    expect(validateZiweiTopicDeepDiveQualityV4(value, facts, config)).toMatchObject({ok: false, findings: expect.arrayContaining([expect.objectContaining({code: "UNSUPPORTED_FINANCIAL_METRIC"})])});
    const wrong = content(); if (wrong.decadalTiming.state !== "active") throw new Error("Active fixture required"); wrong.decadalTiming.yearRange = [2060, 2069];
    expect(validateZiweiTopicDeepDiveQualityV4(wrong, facts, config)).toMatchObject({ok: false, findings: expect.arrayContaining([expect.objectContaining({code: "DECADAL_TIMING_MISMATCH"})])});
    expect(validateZiweiTopicDeepDiveQualityV4(content(), facts).ok).toBe(false);
  });
});
