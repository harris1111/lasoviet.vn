import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NormalizedBirthProfileV1Schema, ZiweiDecadalReadingContentV1Schema,
  type ZiweiDecadalReadingSourceV1, type ZiweiDecadalReadingContentV1 } from "@lasoviet/contracts";
import { IztroAdapter, iztroDefaultConfig } from "@lasoviet/engine-adapters";
import { buildDecadalReadingSource } from "./decadal-reading-source.js";
import { validateDecadalReading, writeDecadalReading } from "./decadal-reading-writer.js";

// Owner-approved seven synthetic profile dates; all facts come from the actual pinned engine.
const profiles = [["1990-03-15", "male"], ["1990-03-15", "female"], ["1985-07-20", "male"],
  ["1998-11-02", "female"], ["1975-01-09", "male"], ["2002-05-30", "female"], ["1960-09-09", "male"]] as const;
const prose = (count: number) => "Bạn nên cân nhắc ưu tiên thực tế và trao đổi rõ với người đồng hành. ".repeat(count);
function content(source: ZiweiDecadalReadingSourceV1): ZiweiDecadalReadingContentV1 {
  const c = source.cycle;
  return {version: 1, contentVersion: "ziwei.decadal-reading.v1", locale: "vi", calendar: "lunar",
    sourceHash: source.sourceHash, ordinal: c.ordinal, startAge: c.startAge, endAge: c.endAge,
    startYear: c.startYear, endYear: c.endYear, title: `Chặng ${c.startAge}–${c.endAge} tuổi`,
    overview: {narrative: prose(12), evidenceKeys: [`decadal.ordinal.${c.ordinal}`, `decadal.palace.${c.palaceId}`]},
    years: c.annualPalaces.map(row => ({year: row.year, age: row.age, palaceId: row.palaceId,
      title: `Năm ${row.year}, tuổi ${row.age}`, narrative: prose(10),
      recommendations: ["Lập kế hoạch thực tế.", "Trao đổi các ưu tiên."], cautions: ["Tránh nhận quá nhiều việc."],
      evidenceKeys: [`annual.year.${row.year}.palace.${row.palaceId}`]}))};
}
describe("private decadal writer and hard factual/content gates", () => {
  const sources: ZiweiDecadalReadingSourceV1[] = [];
  beforeAll(async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T08:00:00Z"));
    for (const [date, gender] of profiles) {
      const time = {precision: "exact_minute", localTime: "08:30"}, calendar = {kind: "solar", date};
      const birthProfile = NormalizedBirthProfileV1Schema.parse({version: 1,
        originalInput: {version: 1, calendar, time, gender, timezone: {offsetMinutes: 420},
          displayName: "PRIVATE_SYNTHETIC", consentVersion: "PRIVATE_CONSENT"},
        normalizedCalendar: calendar, normalizedTime: time, timezoneProvenance: {source: "offset", offsetMinutes: 420},
        normalizationWarnings: [], limitations: []});
      const natal = await new IztroAdapter().calculate({birthProfile}, iztroDefaultConfig);
      if (!natal.ok) throw new Error("Synthetic natal calculation failed");
      for (const selection of ["current", "next"] as const) sources.push(await buildDecadalReadingSource({
        chartId: `PRIVATE_CHART_${sources.length}`, chartVersionId: `PRIVATE_VERSION_${sources.length}`,
        birthProfile, storedChart: natal.output, selection, asOfDate: "2026-10-09"}));
    }
  }, 30000);
  afterAll(() => vi.useRealTimers());
  it("validates all seven actual synthetic profiles for current and next cycles", async () => {
    expect(sources).toHaveLength(14);
    for (const source of sources) {
      const value = content(source);
      expect(ZiweiDecadalReadingContentV1Schema.parse(value)).toEqual(value);
      expect(validateDecadalReading(value, source)).toEqual({ok: true, findings: [], advisory: []});
      const generateStructured = vi.fn().mockResolvedValue({ok: true, value: {value, providerId: "fixture", modelId: "fixture"}});
      expect(await writeDecadalReading({source, provider: {generateStructured}})).toMatchObject({ok: true, value: {content: value}});
      expect(generateStructured).toHaveBeenCalledTimes(1);
      const prompt = generateStructured.mock.calls[0]![0];
      for (const secret of ["PRIVATE_SYNTHETIC", "PRIVATE_CONSENT", "08:30", "originalInput"]) expect(prompt.user).not.toContain(secret);
    }
  });
  it("rejects foreign source lineage, omitted/duplicate rows and transplanted actual yearly facts", () => {
    const source = sources[0]!;
    let value = content(source); value.sourceHash = "a".repeat(64);
    expect(validateDecadalReading(value, source).findings).toContain("DECADAL_LINEAGE_MISMATCH");
    value = content(source); value.years[1] = {...value.years[0]!};
    expect(validateDecadalReading(value, source).findings).toContain("YEAR_COVERAGE_MISMATCH");
    value = content(source); value.years[0]!.age = value.years[1]!.age;
    expect(validateDecadalReading(value, source).findings).toContain("YEAR_FACT_MISMATCH");
    value = content(source); value.years[0]!.palaceId = value.years[1]!.palaceId;
    expect(validateDecadalReading(value, source).findings).toContain("YEAR_FACT_MISMATCH");
    value = content(source); value.years.pop();
    expect(ZiweiDecadalReadingContentV1Schema.safeParse(value).success).toBe(false);
  });
  it("requires each year's own actual evidence and a decade overview anchor", () => {
    const source = sources[0]!, value = content(source);
    value.years[0]!.evidenceKeys = value.years[1]!.evidenceKeys;
    expect(validateDecadalReading(value, source).findings).toEqual(expect.arrayContaining(["EVIDENCE_MISMATCH", "YEAR_ANCHOR_MISSING"]));
    value.overview.evidenceKeys = source.evidenceKeys.filter(key => key.startsWith("annual.year."));
    expect(validateDecadalReading(value, source).findings).toContain("DECADAL_ANCHOR_MISSING");
  });
  it.each([
    ["Năm 2099 cần chuẩn bị.", "UNCOMPUTED_YEAR"], ["Tuổi 125 cần chú ý.", "UNCOMPUTED_AGE"],
    ["Năm2099 cần chuẩn bị.", "UNCOMPUTED_YEAR"], ["Tuổi125 cần chú ý.", "UNCOMPUTED_AGE"],
    ["125tuổi cần chú ý.", "UNCOMPUTED_AGE"],
    ["Tuổi là 125.", "UNCOMPUTED_AGE"], ["Tuổi âm lịch hiện tại là 125.", "UNCOMPUTED_AGE"],
    ["Chặng 1–2 tuổi.", "UNCOMPUTED_AGE"], ["Tháng mười một cần chú ý.", "UNCOMPUTED_DAY_OR_MONTH"],
    ["Ngày 12 có việc mới.", "UNCOMPUTED_DAY_OR_MONTH"], ["Ngày 12/3.", "UNCOMPUTED_DAY_OR_MONTH"],
    ["Điểm năm là 90 điểm.", "UNCOMPUTED_SCORE"], ["Khả năng hợp là 90%.", "UNCOMPUTED_SCORE"],
    ["Điểm của năm là 90/100.", "UNCOMPUTED_SCORE"], ["Điểm của năm là 90.", "UNCOMPUTED_SCORE"],
    ["Bạn sẽ chết sớm.", "CONTENT_LINE_VIOLATION"], ["Tuổi thọ kéo dài.", "CONTENT_LINE_VIOLATION"],
    ["Bạn bị ung thư.", "NAMED_DISEASE_DIAGNOSIS"], ["Mua bùa để giải hạn.", "CONTENT_LINE_VIOLATION"],
    ["Đánh đề số 12.", "CONTENT_LINE_VIOLATION"], ["Dữ kiện ziwei.palace.life.", "PRIVATE_IDENTIFIER_IN_PROSE"],
  ])("rejects unsupported factual/content prose: %s", (text, finding) => {
    const source = sources[0]!, value = content(source); value.years[0]!.narrative += text;
    expect(validateDecadalReading(value, source).findings).toContain(finding);
    value.years[0]!.narrative = prose(10) + text.normalize("NFD");
    expect(validateDecadalReading(value, source).findings).toContain(finding);
  });
  it("does not transfer even an in-decade year or age into a different yearly section", () => {
    const source = sources[0]!, value = content(source);
    value.years[0]!.narrative += `Năm ${value.years[1]!.year}, tuổi ${value.years[1]!.age}.`;
    expect(validateDecadalReading(value, source).findings).toEqual(expect.arrayContaining(["UNCOMPUTED_YEAR", "UNCOMPUTED_AGE"]));
  });
  it("checks both endpoints in verbal age ranges", () => {
    const source = sources[0]!, value = content(source);
    value.overview.narrative += `Từ 1 đến ${source.cycle.endAge} tuổi.`;
    expect(validateDecadalReading(value, source).findings).toContain("UNCOMPUTED_AGE");
  });
  it("retains the actual lunar age in copula prose", () => {
    const source = sources[0]!, value = content(source);
    value.years[0]!.narrative += `Tuổi âm lịch hiện tại là ${value.years[0]!.age}.`;
    expect(validateDecadalReading(value, source).ok).toBe(true);
  });
  it("allows grounded traditional warnings and keeps expert wording advisory", () => {
    const source = sources[0]!, value = content(source);
    value.overview.narrative += "Chặng này có thể hao tài, bạn cần nhìn lại kế hoạch.";
    expect(validateDecadalReading(value, source).ok).toBe(true);
  });
  it("refuses a changed source before any provider call", async () => {
    const source = structuredClone(sources[0]!); source.metadata.lifeMasterStarId = "ziwei.star.ziWei";
    source.evidenceKeys.push("invented-key");
    const generateStructured = vi.fn();
    await expect(writeDecadalReading({source, provider: {generateStructured}})).rejects.toThrow("HASH_MISMATCH");
    expect(generateStructured).not.toHaveBeenCalled();
  });
  it("bounds corrective rewrites and passes distinct cost purpose/attempt identities", async () => {
    const source = sources[0]!, wrong = content(source); wrong.years[0]!.narrative = "Ngắn.";
    const generateStructured = vi.fn().mockResolvedValue({ok: true, value: {value: wrong, providerId: "fixture", modelId: "fixture",
      usage: {tokensUnknown: false, costStatus: "resolved", costMicroVnd: "0"}}});
    const result = await writeDecadalReading({source, provider: {generateStructured}, costContext: {idempotencyKey: "decade-test"}});
    expect(result).toMatchObject({ok: false, error: {code: "DECADAL_QUALITY_REJECTED"}, findings: ["MINIMUM_DEPTH"]});
    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(generateStructured.mock.calls.map(call => call[0].costContext)).toEqual([
      {idempotencyKey: "decade-test:report", purpose: "report"}, {idempotencyKey: "decade-test:rewrite", purpose: "rewrite"}]);
    const correction = JSON.parse(generateStructured.mock.calls[1]![0].user);
    expect(correction.rewrite).toEqual({prior: wrong, findings: ["MINIMUM_DEPTH"]});
  });
  it("accepts a passing single correction and never adds a third call", async () => {
    const source = sources[0]!, wrong = content(source); wrong.years[0]!.narrative = "Ngắn.";
    const generateStructured = vi.fn().mockResolvedValueOnce({ok: true, value: {value: wrong, providerId: "fixture", modelId: "fixture"}})
      .mockResolvedValueOnce({ok: true, value: {value: content(source), providerId: "fixture", modelId: "fixture"}});
    expect(await writeDecadalReading({source, provider: {generateStructured}})).toMatchObject({ok: true});
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
  it.each(["cost", "tokens", "missing-cost", "provider", "schema"])("stops immediately without a rewrite on %s failure", async mode => {
    const source = sources[0]!, value = content(source);
    const result = mode === "provider" ? {ok: false, error: {code: "AI_TIMEOUT", retryable: true}}
      : {ok: true, value: {value: mode === "schema" ? {...value, compatibilityScore: 90} : value,
        providerId: "fixture", modelId: "fixture", ...(mode === "cost" || mode === "tokens" ? {
          usage: {tokensUnknown: mode === "tokens", costStatus: mode === "cost" ? "unknown" : "resolved"}} : {})}};
    const generateStructured = vi.fn().mockResolvedValue(result);
    expect(await writeDecadalReading({source, provider: {generateStructured},
      ...(mode === "missing-cost" ? {costContext: {idempotencyKey: "requires-cost"}} : {})})).toMatchObject({ok: false});
    expect(generateStructured).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, "-1", "0.5", "NaN", "1e6"])("requires a recorded nonnegative micro amount for costed generation: %s", async amount => {
    const source = sources[0]!, wrong = content(source); wrong.years[0]!.narrative = "Ngắn.";
    const generateStructured = vi.fn().mockResolvedValue({ok: true, value: {value: wrong, providerId: "fixture", modelId: "fixture",
      usage: {tokensUnknown: false, costStatus: "resolved", costMicroVnd: amount}}});
    expect(await writeDecadalReading({source, provider: {generateStructured}, costContext: {idempotencyKey: "missing-proof"}}))
      .toMatchObject({ok: false, error: {code: "DECADAL_COST_UNKNOWN"}});
    expect(generateStructured).toHaveBeenCalledTimes(1);
  });
});
