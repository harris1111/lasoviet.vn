import { describe, expect, it } from "vitest";

import {
  ZiweiHoroscopeResultV1Schema,
  ZiweiMonthlyHanV1Schema,
  ZiweiYearlyHanV1Schema,
  ZiweiDailyHoroscopeV1Schema,
  type ZiweiHoroscopeResultV1,
} from "./ziwei-horoscope-v1.js";

describe("ZiweiHoroscopeResultV1Schema", () => {
  const sampleMonths = Array.from({ length: 12 }, (_, i) => {
    const isWarn = i === 2 || i === 6;
    const isGood = i === 0 || i === 4 || i === 8;
    return {
      monthIndex: i + 1,
      marker: isWarn ? ("warn" as const) : isGood ? ("good" as const) : ("neutral" as const),
      isLocked: isWarn,
      monthNumberDisplay: isWarn ? "?" : String(i + 1),
      label: isWarn ? "Tháng hạn, mở để xem" : `Tháng ${i + 1}`,
      evidenceKeys: [`annual.month.${i + 1}`],
    };
  });

  const validResult: ZiweiHoroscopeResultV1 = {
    version: 1,
    chartId: "chart-123",
    chartVersionId: "cv-456",
    asOfDate: "2026-09-22",
    isUnlocked: false,
    yearly: {
      targetYear: 2026,
      lunarYear: "Bính Ngọ",
      lunarAge: 35,
      annualPalaceId: "ziwei.palace.career",
      annualPalaceName: "Quan Lộc",
      annualBranch: "Ngọ",
      annualStem: "Bính",
      hanMonthCount: 2,
      favorableMonthCount: 3,
      neutralMonthCount: 7,
      focusAreas: ["tiền bạc", "giấy tờ"],
      summary: "Năm nay có 2 tháng cần chú ý và 3 tháng thuận. Tháng hạn rơi vào chuyện tiền bạc và giấy tờ.",
      months: sampleMonths,
      evidenceKeys: ["annual.year.2026.palace.career"],
    },
    daily: {
      solarDate: "2026-09-22",
      solarDateFormatted: "Thứ Ba, 22/9/2026",
      lunarDateFormatted: "12/8 Bính Ngọ",
      dayStemBranch: "Kỷ Hợi",
      solarTerm: "Bạch Lộ",
      touchedPalaceId: "ziwei.palace.children",
      touchedPalaceName: "Tử Tức",
      headline: "Ngày Kỷ Hợi chạm cung Tử Tức của bạn. Mở mỗi sáng trong gói Hội viên.",
      evidenceKeys: ["daily.branch.pig", "daily.palace.children"],
    },
  };

  it("validates a complete valid horoscope result", () => {
    const parsed = ZiweiHoroscopeResultV1Schema.safeParse(validResult);
    expect(parsed.success).toBe(true);
  });

  it("rejects when months array has less than 12 months", () => {
    const invalid = {
      ...validResult,
      yearly: {
        ...validResult.yearly,
        months: validResult.yearly.months.slice(0, 11),
      },
    };
    const parsed = ZiweiHoroscopeResultV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const invalid = {
      ...validResult,
      asOfDate: "22/09/2026",
    };
    const parsed = ZiweiHoroscopeResultV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("validates unlocked month with full preparation text", () => {
    const unlockedMonth = {
      monthIndex: 3,
      marker: "warn" as const,
      isLocked: false,
      monthNumberDisplay: "3",
      label: "Tháng 3",
      palaceId: "ziwei.palace.travel" as const,
      palaceName: "Thiên Di",
      earthlyBranch: "Thân",
      heavenlyStem: "Nhâm",
      primaryFocus: "tiền bạc",
      preparationText: "Cần chú ý chi tiêu và hạn chế cho vay mượn.",
      evidenceKeys: ["annual.month.3.han", "annual.month.3.palace.travel"],
    };
    const parsed = ZiweiMonthlyHanV1Schema.safeParse(unlockedMonth);
    expect(parsed.success).toBe(true);
  });
});
