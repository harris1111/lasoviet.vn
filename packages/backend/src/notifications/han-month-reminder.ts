import type {
  NormalizedBirthProfileV1,
  ZiweiHoroscopeResultV1,
} from "@lasoviet/contracts";

export type HoroscopeCalculator = (
  birthProfile: NormalizedBirthProfileV1,
  options?: {
    chartId?: string;
    chartVersionId?: string;
    asOfDate?: string;
    targetYear?: number;
    isUnlocked?: boolean;
  },
) => ZiweiHoroscopeResultV1;

export type ComputedHanMonth = {
  monthIndex: number;
  primaryFocus: string;
  prepText: string;
  marker: "warn";
  palaceId?: string;
  palaceName?: string;
};

/**
 * Computes warn-marked monthly han periods strictly from engine calculations.
 * Does NOT invent birth or chart data. If no month is marked "warn" by the engine,
 * an empty list is returned.
 */
export function computeEngineHanMonths(
  birthProfile: NormalizedBirthProfileV1,
  targetYear: number,
  calculateHoroscope: HoroscopeCalculator,
  asOfDate?: string,
): ComputedHanMonth[] {
  const result = calculateHoroscope(birthProfile, {
    targetYear,
    asOfDate,
    isUnlocked: true,
  });

  const warnMonths: ComputedHanMonth[] = [];
  for (const m of result.yearly.months) {
    if (m.marker === "warn" && m.primaryFocus?.trim() && m.preparationText?.trim()) {
      warnMonths.push({
        monthIndex: m.monthIndex,
        primaryFocus: m.primaryFocus,
        prepText: m.preparationText,
        marker: "warn",
        palaceId: m.palaceId,
        palaceName: m.palaceName,
      });
    }
  }

  return warnMonths;
}
