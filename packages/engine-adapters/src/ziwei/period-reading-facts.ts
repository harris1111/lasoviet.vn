import { astro } from "iztro";
import { Solar } from "lunar-typescript";
import { ZiweiPeriodReadingFactsV1Schema, type NormalizedBirthProfileV1, type ZiweiPeriodReadingFactsV1 } from "@lasoviet/contracts";
import { iztroGender, iztroTimeIndex } from "./iztro-adapter.js";
import { palaceIds, starIds } from "./iztro-mapping.js";

/** Frozen, computed lunar periods, including both halves of a leap month. */
export function calculatePeriodReadingFacts(input: {
  birthProfile: NormalizedBirthProfileV1; chartId: string; chartVersionId: string;
  asOfDate: string; kind: "monthly" | "annual"; targetYear?: number;
}): ZiweiPeriodReadingFactsV1 {
  const { birthProfile: profile } = input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.asOfDate)) throw new Error("PERIOD_DATE_INVALID");
  const [year, month, day] = input.asOfDate.split("-").map(Number) as [number, number, number];
  const solar = Solar.fromYmd(year, month, day);
  if (solar.toYmd() !== input.asOfDate) throw new Error("PERIOD_DATE_INVALID");
  const lunar = solar.getLunar();
  const targetYear = input.kind === "monthly" ? lunar.getYear() : (input.targetYear ?? lunar.getYear());
  if (targetYear < 1900 || targetYear > 2100) throw new Error("PERIOD_YEAR_INVALID");
  const gender = iztroGender(profile), timeIndex = iztroTimeIndex(profile);
  if (!gender || timeIndex === undefined) throw new Error("PERIOD_PROFILE_INVALID");
  const chart = astro.withOptions({ type: profile.normalizedCalendar.kind, dateStr: profile.normalizedCalendar.date,
    timeIndex, gender, isLeapMonth: profile.normalizedCalendar.kind === "lunar" ? profile.normalizedCalendar.isLeapMonth : undefined,
    language: "en-US", config: { algorithm: "default", yearDivide: "normal", horoscopeDivide: "normal", ageDivide: "normal", dayDivide: "current" } });
  const all = chart.monthlyList(targetYear, true);
  const selected = input.kind === "annual" ? all : all.filter(period =>
    period.month === Math.abs(lunar.getMonth()) && period.isLeapMonth === (lunar.getMonth() < 0));
  if (!selected.length || (input.kind === "annual" && new Set(all.map(period => period.month)).size !== 12)) throw new Error("PERIOD_ENGINE_INCOMPLETE");
  const annualIndex = chart.horoscope(`${targetYear}-07-01`, timeIndex).yearly.index;
  const annualPalace = chart.palaces[annualIndex];
  const annualPalaceId = annualPalace && palaceIds[annualPalace.name];
  if (!annualPalaceId) throw new Error("PERIOD_ENGINE_UNMAPPED");
  const periods = selected.map(period => {
    const palace = chart.palaces[period.index];
    const palaceId = palace && palaceIds[palace.name];
    if (!palaceId) throw new Error("PERIOD_ENGINE_UNMAPPED");
    const id = `${targetYear}-${String(period.month).padStart(2, "0")}-${period.isLeapMonth ? "leap" : "regular"}-${period.part}`;
    const mappedStars = [...palace.majorStars, ...palace.minorStars].map(star => {
      const id = starIds[star.name];
      if (!id) throw new Error("PERIOD_ENGINE_UNMAPPED");
      return { id, isObstacle: star.name === period.mutagen[3] };
    });
    const obstacleStarIds = mappedStars.filter(star => star.isObstacle).map(star => star.id);
    return { id, year: targetYear, month: period.month, isLeapMonth: period.isLeapMonth, part: period.part, dayRange: period.dayRange,
      palaceId, starIds: mappedStars.map(star => star.id), obstacleStarIds,
      evidenceKeys: [`period.${id}.palace.${palaceId}`, ...mappedStars.map(star => `period.${id}.star.${star.id}`), ...obstacleStarIds.map(star => `period.${id}.obstacle.${star}`)] };
  });
  return ZiweiPeriodReadingFactsV1Schema.parse({ version: 1, chartId: input.chartId, chartVersionId: input.chartVersionId,
    kind: input.kind, targetYear, calendar: "lunar", asOfDate: input.asOfDate,
    periodKey: input.kind === "annual" ? `${targetYear}` : `${targetYear}-${String(Math.abs(lunar.getMonth())).padStart(2, "0")}-${lunar.getMonth() < 0 ? "leap" : "regular"}`,
    annualPalaceId, periods, evidenceKeys: [`annual.${targetYear}.palace.${annualPalaceId}`, ...periods.flatMap(period => period.evidenceKeys)] });
}
