import type { TopConcernV1 } from "@lasoviet/contracts";

export const DAILY_HOROSCOPE_FROM_SLUG = "tu-vi-hom-nay" as const;
export const DAILY_HOROSCOPE_SUGGESTED_CONCERN: TopConcernV1 = "self_understanding";

export type DailyHoroscopeBridgeOptions = {
  locale?: "vi" | "en";
  zodiac?: string;
  asOfDate?: string;
};

export type DailyHoroscopeBridgeMetadata = {
  from: typeof DAILY_HOROSCOPE_FROM_SLUG;
  suggestedConcern: TopConcernV1;
  zodiac?: string;
  asOfDate?: string;
  entryPoint: string;
};

/**
 * Returns typed bridge metadata for linking /tu-vi-hom-nay into the Zi Wei birth profile wizard.
 */
export function getDailyHoroscopeBridgeMetadata(
  options?: DailyHoroscopeBridgeOptions,
): DailyHoroscopeBridgeMetadata {
  return {
    from: DAILY_HOROSCOPE_FROM_SLUG,
    suggestedConcern: DAILY_HOROSCOPE_SUGGESTED_CONCERN,
    zodiac: options?.zodiac,
    asOfDate: options?.asOfDate,
    entryPoint: `tool_${DAILY_HOROSCOPE_FROM_SLUG}`,
  };
}

/**
 * Builds the canonical wizard href with bridge query metadata from /tu-vi-hom-nay.
 */
export function buildDailyHoroscopeWizardHref(
  options?: DailyHoroscopeBridgeOptions,
): string {
  const isEn = options?.locale === "en";
  const basePath = isEn ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi";
  const params = new URLSearchParams();
  params.set("from", DAILY_HOROSCOPE_FROM_SLUG);

  if (options?.zodiac && options.zodiac.trim().length > 0) {
    params.set("zodiac", options.zodiac.trim());
  }

  if (options?.asOfDate && options.asOfDate.trim().length > 0) {
    params.set("asOfDate", options.asOfDate.trim());
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
