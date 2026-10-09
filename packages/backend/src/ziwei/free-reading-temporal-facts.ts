import { FreeReadingTemporalV2Schema, ZiweiHoroscopeResultV1Schema,
  type FreePalaceGiftFactV1, type FreeReadingTemporalV2, type ZiweiHoroscopeResultV1 } from "@lasoviet/contracts";
import { freePalaceLabel } from "./free-palace-labels.js";

export type BoundFreeReadingHoroscope = {
  horoscope: ZiweiHoroscopeResultV1;
  chartId: string;
  chartVersionId: string;
  asOfDate: string;
  chartVersionInputHash: string;
};

/** Project only a server-authorized matching evaluation; identifiers never leave this boundary. */
export function buildFreeReadingTemporalFacts(input: BoundFreeReadingHoroscope, locale: "vi" | "en"):
  { timing: FreeReadingTemporalV2; facts: FreePalaceGiftFactV1[] } {
  const source = ZiweiHoroscopeResultV1Schema.parse(input.horoscope);
  if (!input.chartId || !input.chartVersionId || !/^[a-f0-9]{64}$/u.test(input.chartVersionInputHash) || source.chartId !== input.chartId ||
      source.chartVersionId !== input.chartVersionId || source.asOfDate !== input.asOfDate ||
      source.daily.solarDate !== input.asOfDate || !source.decadalCycles) {
    throw new Error("FREE_READING_TIMING_SOURCE_MISMATCH");
  }
  const timing = FreeReadingTemporalV2Schema.parse({ targetYear: source.yearly.targetYear,
    lunarAge: source.yearly.lunarAge, annualPalaceId: source.yearly.annualPalaceId,
    cycles: [...source.decadalCycles].sort((a, b) => a.ordinal - b.ordinal).map(cycle => ({
      ordinal: cycle.ordinal, palaceId: cycle.palaceId, startAge: cycle.startAge, endAge: cycle.endAge,
      startYear: cycle.startYear, endYear: cycle.endYear,
    })) });
  const vi = locale === "vi";
  const label = (id: string) => {
    const value = freePalaceLabel(locale, id);
    if (!value) throw new Error("FREE_READING_TIMING_LABEL_UNAVAILABLE");
    return value;
  };
  const facts: FreePalaceGiftFactV1[] = [
    { key: "timing:year", label: vi ? "Năm âm lịch được chọn" : "Selected lunar year", value: String(timing.targetYear) },
    { key: "timing:age", label: vi ? "Tuổi âm trong năm được chọn" : "Lunar age in selected year", value: String(timing.lunarAge) },
    { key: "timing:annual-palace", label: vi ? "Cung lưu niên" : "Annual palace", value: label(timing.annualPalaceId) },
    ...timing.cycles.map(cycle => ({ key: `timing:cycle:${cycle.ordinal}`, label: vi ? "Chặng đại vận" : "Decadal span",
      value: `${label(cycle.palaceId)} · ${vi ? "Tuổi" : "Ages"} ${cycle.startAge}–${cycle.endAge} · ${vi ? "Năm" : "Years"} ${cycle.startYear}–${cycle.endYear}` })),
  ];
  return { timing, facts };
}
