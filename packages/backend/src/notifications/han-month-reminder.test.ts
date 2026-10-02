import { describe, expect, it } from "vitest";

import type { NormalizedBirthProfileV1, ZiweiHoroscopeResultV1 } from "@lasoviet/contracts";
import {
  computeEngineHanMonths,
} from "./han-month-reminder.js";

const mockBirthProfile: NormalizedBirthProfileV1 = {
  version: 1,
  birthTimeUtc: "1990-05-15T08:30:00Z",
  timePrecision: "exact_minute",
  gender: "female",
  solarDate: "1990-05-15",
  solarTime: "08:30",
  lunarDate: "1990-04-21",
  lunarLeapMonth: false,
  timezoneProvenance: {
    rule: "Asia/Ho_Chi_Minh",
    offsetMinutes: 420,
    historicalContext: "fixed_gmt7",
  },
  normalizedCalendar: {
    kind: "solar",
    date: "1990-05-15",
    time: "08:30",
  },
};

function createMockHoroscopeResult(
  warnMonths: Array<{ monthIndex: number; primaryFocus: string; preparationText: string }>,
): ZiweiHoroscopeResultV1 {
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    const warn = warnMonths.find((w) => w.monthIndex === monthIndex);
    if (warn) {
      return {
        monthIndex,
        marker: "warn" as const,
        isLocked: false,
        monthNumberDisplay: `Tháng ${monthIndex}`,
        label: `Tháng ${monthIndex}`,
        primaryFocus: warn.primaryFocus,
        preparationText: warn.preparationText,
        palaceId: "ziwei.palace.wealth" as const,
        palaceName: "Tài Bạch",
        evidenceKeys: [`annual.month.${monthIndex}.marker.warn`],
      };
    }
    return {
      monthIndex,
      marker: "neutral" as const,
      isLocked: false,
      monthNumberDisplay: `Tháng ${monthIndex}`,
      label: `Tháng ${monthIndex}`,
      palaceId: "ziwei.palace.life" as const,
      palaceName: "Mệnh",
      evidenceKeys: [`annual.month.${monthIndex}.marker.neutral`],
    };
  });

  return {
    version: 1,
    chartId: "chart-1",
    chartVersionId: "ver-1",
    asOfDate: "2026-07-01",
    isUnlocked: true,
    yearly: {
      targetYear: 2026,
      lunarYear: "Bính Ngọ",
      lunarAge: 37,
      annualPalaceId: "ziwei.palace.career",
      annualPalaceName: "Quan Lộc",
      annualBranch: "ziwei.branch.horse",
      annualStem: "ziwei.stem.bing",
      hanMonthCount: warnMonths.length,
      favorableMonthCount: 2,
      neutralMonthCount: 12 - warnMonths.length - 2,
      focusAreas: ["tiền bạc"],
      summary: "Tổng quan năm 2026",
      months,
      evidenceKeys: [],
    },
    daily: {
      solarDate: "2026-07-01",
      solarDateFormatted: "01/07/2026",
      lunarDateFormatted: "18/05/2026",
      dayStemBranch: "Giáp Tý",
      solarTerm: "Tiểu Thử",
      touchedPalaceId: "ziwei.palace.wealth",
      touchedPalaceName: "Tài Bạch",
      headline: "Khởi đầu thuận lợi",
      evidenceKeys: [],
    },
  };
}

describe("han-month-reminder engine marker foundation", () => {
  it("extracts engine-computed warn months without inventing astrological data", () => {
    const mockHoroscope = () =>
      createMockHoroscopeResult([
        {
          monthIndex: 6,
          primaryFocus: "tiền bạc",
          preparationText: "Tháng cần đặc biệt chú ý chi tiêu và bảo toàn tài chính.",
        },
      ]);

    const warnMonths = computeEngineHanMonths(mockBirthProfile, 2026, mockHoroscope);
    expect(warnMonths).toHaveLength(1);
    expect(warnMonths[0]).toEqual({
      monthIndex: 6,
      primaryFocus: "tiền bạc",
      prepText: "Tháng cần đặc biệt chú ý chi tiêu và bảo toàn tài chính.",
      marker: "warn",
      palaceId: "ziwei.palace.wealth",
      palaceName: "Tài Bạch",
    });
  });

  it("returns empty when engine calculates zero warn months (never manufactures fake warnings)", () => {
    const mockHoroscope = () => createMockHoroscopeResult([]);
    const warnMonths = computeEngineHanMonths(mockBirthProfile, 2026, mockHoroscope);
    expect(warnMonths).toEqual([]);
  });

});
