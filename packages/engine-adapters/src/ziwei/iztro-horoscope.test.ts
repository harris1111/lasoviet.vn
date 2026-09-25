import { describe, expect, it } from "vitest";

import type { NormalizedBirthProfileV1 } from "@lasoviet/contracts";

import { calculateZiweiHoroscope } from "./iztro-horoscope.js";

describe("calculateZiweiHoroscope", () => {
  // Test profile from la-so-ket-qua.html: 15/06/1992 08:30 (Giờ Thìn), Nam
  const testProfile: NormalizedBirthProfileV1 = {
    version: 1,
    originalInput: {
      name: "Nguyễn Văn A",
      gender: "Nam",
      birthDate: "1992-06-15",
      birthTime: "08:30",
    },
    normalizedCalendar: {
      kind: "solar",
      date: "1992-06-15",
    },
    normalizedTime: {
      precision: "exact_minute",
      localTime: "08:30",
    },
    timezoneProvenance: {
      source: "iana",
      ianaZone: "Asia/Ho_Chi_Minh",
      runtime: "Intl",
    },
    normalizationWarnings: [],
    limitations: [],
  };

  it("calculates deterministic yearly and monthly hạn for 2026", () => {
    const result = calculateZiweiHoroscope(testProfile, {
      asOfDate: "2026-09-22",
      targetYear: 2026,
      isUnlocked: false,
    });

    expect(result.yearly.targetYear).toBe(2026);
    expect(result.yearly.lunarYear).toBe("Bính Ngọ");
    expect(result.yearly.lunarAge).toBe(35);
    expect(result.yearly.annualBranch).toBe("Ngọ");
    expect(result.yearly.annualStem).toBe("Bính");
    expect(result.yearly.annualPalaceName).toBe("Quan Lộc");
    expect(result.yearly.annualPalaceId).toBe("ziwei.palace.career");

    expect(result.yearly.months).toHaveLength(12);
    expect(result.yearly.hanMonthCount).toBeGreaterThan(0);
    expect(result.yearly.favorableMonthCount).toBeGreaterThan(0);
    expect(result.yearly.hanMonthCount + result.yearly.favorableMonthCount + result.yearly.neutralMonthCount).toBe(12);

    expect(result.yearly.summary).toContain("tháng cần chú ý");
    expect(result.yearly.summary).toContain("tháng thuận");
    expect(result.yearly.focusAreas.length).toBeGreaterThan(0);
  });

  it("enforces FD-059 security: masks month numbers and omits preparationText in free tier", () => {
    const freeResult = calculateZiweiHoroscope(testProfile, {
      asOfDate: "2026-09-22",
      targetYear: 2026,
      isUnlocked: false,
    });

    const warnMonths = freeResult.yearly.months.filter((m) => m.marker === "warn");
    expect(warnMonths.length).toBeGreaterThan(0);

    for (const wm of warnMonths) {
      expect(wm.isLocked).toBe(true);
      expect(wm.monthNumberDisplay).toBe("?");
      expect(wm.label).toBe("Tháng hạn, mở để xem");
      expect(wm.preparationText).toBeUndefined();
    }
  });

  it("reveals full month numbers and preparation guidance when unlocked", () => {
    const unlockedResult = calculateZiweiHoroscope(testProfile, {
      asOfDate: "2026-09-22",
      targetYear: 2026,
      isUnlocked: true,
    });

    for (const m of unlockedResult.yearly.months) {
      expect(m.isLocked).toBe(false);
      expect(m.monthNumberDisplay).toBe(String(m.monthIndex));
      expect(m.label).toBe(`Tháng ${m.monthIndex}`);
      expect(typeof m.preparationText).toBe("string");
      expect(m.preparationText!.length).toBeGreaterThan(10);
    }
  });

  it("calculates real daily layer for 'Hôm nay của bạn' on 2026-09-22", () => {
    const result = calculateZiweiHoroscope(testProfile, {
      asOfDate: "2026-09-22",
      targetYear: 2026,
    });

    expect(result.daily.solarDate).toBe("2026-09-22");
    expect(result.daily.solarDateFormatted).toContain("Thứ Ba, 22/9/2026");
    expect(result.daily.lunarDateFormatted).toBe("12/8 Bính Ngọ");
    expect(result.daily.dayStemBranch).toBe("Kỷ Hợi");
    expect(result.daily.solarTerm).toBe("Bạch Lộ");
    expect(result.daily.headline).toContain("Ngày Kỷ Hợi chạm cung");
    expect(result.daily.headline).toContain("Mở mỗi sáng trong gói Hội viên");
    expect(result.daily.evidenceKeys.length).toBeGreaterThan(0);
  });
});
