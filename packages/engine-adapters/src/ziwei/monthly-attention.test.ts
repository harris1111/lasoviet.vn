import { describe, expect, it } from "vitest";
import { computedMonthlyAttention } from "./monthly-attention.js";
import { calculateZiweiHoroscope } from "./iztro-horoscope.js";
import { calculatePeriodReadingFacts } from "./period-reading-facts.js";
import type { NormalizedBirthProfileV1 } from "@lasoviet/contracts";

const profile: NormalizedBirthProfileV1 = { version: 1,
  originalInput: { gender: "male", birthDate: "1992-06-15", birthTime: "08:30" },
  normalizedCalendar: { kind: "solar", date: "1992-06-15" }, normalizedTime: { precision: "exact_minute", localTime: "08:30" },
  timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };

describe("shared computed monthly attention", () => {
  it("retains zero when neither Hua Ji matches, even with natal malefics", () => {
    expect(computedMonthlyAttention({ stars: [{ name: "driven" }, { name: "spark" }],
      monthlyMutagen: ["", "", "", "sun"], annualMutagen: ["", "", "", "moon"] }).warn).toBe(false);
  });
  it("distinguishes annual and monthly matches, including minor Hua Ji stars", () => {
    const result = computedMonthlyAttention({ stars: [{ name: "scholar" }, { name: "moon" }],
      monthlyMutagen: ["", "", "", "scholar"], annualMutagen: ["", "", "", "moon"] });
    expect(result.reasons).toEqual([{ scope: "monthly", starId: "ziwei.star.wenchang" }, { scope: "annual", starId: "ziwei.star.taiyin" }]);
  });
  it.each([2025, 2026, 2027, 2028])("agrees with paid regular periods and preserves lunar month numbers in %i", year => {
    const options = { asOfDate: "2026-09-22", targetYear: year };
    const free = calculateZiweiHoroscope(profile, options);
    const paid = calculatePeriodReadingFacts({ birthProfile: profile, chartId: "synthetic", chartVersionId: "synthetic", kind: "annual", ...options });
    expect(free.yearly.months.map(month => month.monthIndex)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    for (const month of free.yearly.months) {
      const regular = paid.periods.find(period => period.month === month.monthIndex && !period.isLeapMonth)!;
      expect(month.marker === "warn").toBe(regular.obstacleStarIds.length > 0);
      expect(month.palaceId).toBe(regular.palaceId);
    }
    expect(calculateZiweiHoroscope(profile, options)).toEqual(free);
    const beforeTet = calculateZiweiHoroscope(profile, { ...options, asOfDate: "2027-01-15" });
    expect(beforeTet.yearly).toEqual(free.yearly);
    expect(beforeTet.daily.solarDate).toBe("2027-01-15");
  });
});
