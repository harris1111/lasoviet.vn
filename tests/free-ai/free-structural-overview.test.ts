import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateZiweiHoroscope } from "../../packages/engine-adapters/src/ziwei/iztro-horoscope.js";
import { buildFreeResultModel } from "../../apps/web/src/features/ziwei/ziwei-free-result-model.js";
import { IztroAdapter } from "../../packages/engine-adapters/src/ziwei/iztro-adapter.js";
import type { NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { compileFreeStructuralOverview, compileFreeStructuralPalace } from "../../packages/backend/src/ziwei/free-structural-overview.js";
import { createFreeOverviewCache, readFreeOverviewDocuments } from "../../packages/backend/src/ziwei/free-structural-overview-cache.js";
const profiles = [
    ["1992-06-15", "08:30", "male"], ["1990-01-01", "12:00", "female"], ["2000-12-31", "23:30", "male"], ["1975-02-04", "04:00", "female"], ["1982-06-15", "02:30", "male"],
] as const;
function chartFor([date, time, gender]: typeof profiles[number]) {
    const profile: NormalizedBirthProfileV1 = { version: 1, originalInput: { version: 1, calendar: { kind: "solar", date }, time: { precision: "exact_minute", localTime: time }, timezone: { offsetMinutes: 420 }, gender, consentVersion: "2026-10-07" }, normalizedCalendar: { kind: "solar", date }, normalizedTime: { precision: "exact_minute", localTime: time }, timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
    return new IztroAdapter().calculateWithPrivateSnapshot({ birthProfile: profile }).then(result => ({...result, profile}));
}
describe("grounded structural overview", () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-07T00:00:00Z")); });
    afterEach(() => vi.useRealTimers());
    it.each(profiles)("compiles diverse real engine charts %s %s %s", async (date, time, gender) => {
        const { result, profile } = await chartFor([date, time, gender]);
        if (!result.ok)
            throw new Error(JSON.stringify(result.error));
        const chart = result.output;
        for (const locale of ["vi", "en"] as const) {
            const doc = compileFreeStructuralOverview(chart, locale);
            const words = doc.sections.flatMap(s => s.paragraphs).join(" ").split(/\s+/u).length;
            expect(words).toBeGreaterThanOrEqual(900);
            expect(words).toBeLessThanOrEqual(1800);
            expect(doc.sections.map(s => s.id)).toContain("body");
            for (const palace of chart.palaces) {
                expect(compileFreeStructuralPalace(chart, palace.id, locale).palaceId).toBe(palace.id);
            }
        }
        const palace = compileFreeStructuralPalace(chart, "ziwei.palace.career", "vi");
        expect(palace.conclusion).toMatch(/(Thất Sát|Thái Dương|Cự Môn|Thiên Tướng|Tử Vi|Thiên Cơ|Vũ Khúc|Tham Lang|Thiên Phủ|Thiên Đồng|Liêm Trinh|Thái Âm|Thiên Lương|Phá Quân)/u);
        expect(palace.do[1]).toMatch(/^Từ nét của /u);
        expect(palace.avoid[1]).toMatch(/^Từ nét của /u);
        const temporary = compileFreeStructuralPalace({ ...chart, provisional: true }, "ziwei.palace.career", "vi");
        expect(temporary.conclusion).toContain("Giờ sinh chưa chắc chắn");
        expect(temporary.paragraphs.join(" ")).toContain("tạm tính");
        const empty = chart.palaces.find(p => !p.stars.some(s => s.category === "major"));
        if (empty) {
            const reading = compileFreeStructuralPalace(chart, empty.id, "en");
            expect(reading.paragraphs[0]).toContain("related-palace influences, not resident stars");
            expect(reading.conclusion).toContain("in related");
        }
        if (!chart.palaces.find(p => p.id === chart.bodyPalaceId)!.stars.some(s => s.category === "major")) {
            const body = compileFreeStructuralOverview(chart, "en").sections.find(s => s.id === "body")!;
            expect(body.paragraphs.join(" ")).toContain("related influences, not resident stars");
            expect(body.paragraphs.join(" ")).toContain("in related");
        }
        const unknown = { ...chart, palaces: chart.palaces.map(p => ({ ...p, stars: p.stars.map(star => star.category === "major" ? { ...star, id: "ziwei.star.unverified" } : star) })) };
        const unknownDoc = compileFreeStructuralPalace(unknown, "ziwei.palace.career", "en");
        expect(unknownDoc.conclusion).toContain("No verified principal-star meaning");
        expect(unknownDoc.paragraphs.join(" ")).not.toContain("suggests");
        expect(unknownDoc.do[1]).toContain("data limitations");
        const horoscope=calculateZiweiHoroscope(profile,{asOfDate:"2026-10-07",targetYear:2026,isUnlocked:false});
        const privateHoroscope={...horoscope,yearly:{...horoscope.yearly,summary:"PRIVATE_PAID_SENTINEL",months:horoscope.yearly.months.map(month=>({...month,preparationText:"PRIVATE_PAID_SENTINEL"}))},daily:{...horoscope.daily,headline:"PRIVATE_PAID_SENTINEL"}};
        for(const locale of ["vi","en"] as const){
            const model=buildFreeResultModel({chart,preview:{},horoscope:privateHoroscope,isGuest:true,locale});
            expect(model.periodTeaser?.sku).toBe("ZIWEI-IDENTITY-P0");
            expect(model.periodTeaser?.sentences.at(-1)).toMatch(/…$/u);
            expect(JSON.stringify(model)).not.toContain("PRIVATE_PAID_SENTINEL");
            expect(buildFreeResultModel({chart:{...chart,provisional:true},preview:{},horoscope:privateHoroscope,isGuest:true,locale}).periodTeaser).toBeNull();
            expect(buildFreeResultModel({chart,preview:{},horoscope:{...privateHoroscope,asOfDate:"2027-01-01"},isGuest:true,locale}).periodTeaser).toBeNull();
        }
        const cache = createFreeOverviewCache(chart);
        expect(readFreeOverviewDocuments(chart, cache)).toEqual(cache.documents);
        const corrupt = { ...cache, contentHash: "0".repeat(64) };
        expect(readFreeOverviewDocuments(chart, corrupt)).toEqual(cache.documents);
        expect(readFreeOverviewDocuments(chart, { ...cache, rendererVersion: "stale" })).toEqual(cache.documents);
        expect(readFreeOverviewDocuments(chart, null)).toEqual(cache.documents);
        const changed = { ...chart, bodyPalaceId: chart.bodyPalaceId === "ziwei.palace.career" ? "ziwei.palace.wealth" : "ziwei.palace.career" } as typeof chart;
        expect(readFreeOverviewDocuments(changed, cache)).toEqual(createFreeOverviewCache(changed).documents);
        expect(readFreeOverviewDocuments(changed, cache)).not.toEqual(cache.documents);
    });
});
