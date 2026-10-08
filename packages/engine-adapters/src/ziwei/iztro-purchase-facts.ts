import { LunarYear, Solar } from "lunar-typescript";
import { ZiweiPurchaseFactsV1Schema, type ZiweiPurchaseFactsV1,
  type ZiweiDecadalCycleV1, type ZiweiPalaceId } from "@lasoviet/contracts";

export const DEFAULT_NEAR_YEAR_END_MONTH_THRESHOLD = 3;

/** Read-only offer context uses the evaluation calendar, independent of selected report year. */
export function buildZiweiPurchaseFacts(input: {
  asOfDate: string; provisional: boolean; cycles: readonly ZiweiDecadalCycleV1[];
  annualPalace: (year: number) => ZiweiPalaceId; nearYearEndThreshold?: number;
}): ZiweiPurchaseFactsV1 {
  const [year, month, day] = input.asOfDate.split("-").map(Number) as [number, number, number];
  const solar = Solar.fromYmd(year, month, day);
  if (solar.toYmd() !== input.asOfDate) throw new Error("PURCHASE_CONTEXT_DATE_INVALID");
  const lunar = solar.getLunar(), lunarYear = lunar.getYear();
  const months = LunarYear.fromYear(lunarYear).getMonthsInYear();
  const index = months.findIndex(item => item.getMonth() === lunar.getMonth());
  if (index < 0 || months.length < 12 || months.length > 13) throw new Error("PURCHASE_CONTEXT_CALENDAR_INVALID");
  const remainingLunarMonths = months.length - index - 1;
  const threshold = input.nearYearEndThreshold ?? DEFAULT_NEAR_YEAR_END_MONTH_THRESHOLD;
  const sorted = [...input.cycles].sort((a, b) => a.ordinal - b.ordinal);
  const current = sorted.find(cycle => cycle.startYear <= lunarYear && cycle.endYear >= lunarYear);
  const next = sorted.find(cycle => cycle.startYear > lunarYear);
  const span = (cycle: ZiweiDecadalCycleV1) => ({ ordinal: cycle.ordinal, palaceId: cycle.palaceId,
    startAge: cycle.startAge, endAge: cycle.endAge, startYear: cycle.startYear, endYear: cycle.endYear });
  return ZiweiPurchaseFactsV1Schema.parse({ version: 1, lunarYear,
    lunarMonth: { number: Math.abs(lunar.getMonth()), isLeap: lunar.getMonth() < 0 },
    remainingLunarMonths, nearYearEndThreshold: threshold, nearYearEnd: remainingLunarMonths <= threshold,
    provisional: input.provisional,
    currentDecade: current ? { span: span(current), yearInCycle: lunarYear - current.startYear + 1,
      remainingYears: current.endYear - lunarYear } : null,
    nextDecade: next ? span(next) : null,
    annualPalaces: [lunarYear, lunarYear + 1].map(year => ({ year, palaceId: input.annualPalace(year) })),
  });
}
