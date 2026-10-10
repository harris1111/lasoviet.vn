import { astro } from "iztro";
import { describe, expect, it, vi } from "vitest";

import { ZiweiHoroscopeResultV1Schema, type NormalizedBirthProfileV1 } from "@lasoviet/contracts";

import { calculateZiweiHoroscope } from "./iztro-horoscope.js";

// Make the vendor namespace spyable while retaining the exact installed implementation.
vi.mock("iztro", async importOriginal => {
  const actual = await importOriginal<typeof import("iztro")>();
  return {...actual, astro:{...actual.astro, withOptions:vi.fn(actual.astro.withOptions)}};
});

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

  it.each(["missing", "unmapped"])("rejects %s annual palace instead of claiming a default palace", (kind) => {
    const original = vi.mocked(astro.withOptions).getMockImplementation()!;
    const spy = vi.spyOn(astro, "withOptions").mockImplementation(options => {
      const astrolabe = original(options);
      const compute = astrolabe.horoscope.bind(astrolabe);
      astrolabe.horoscope = (...args) => {
        const result = compute(...args);
        if (kind === "missing") result.yearly.index = -1;
        else astrolabe.palaces[result.yearly.index]!.name = "unmapped-vendor-palace" as never;
        return result;
      };
      return astrolabe;
    });
    try { expect(() => calculateZiweiHoroscope(testProfile, {asOfDate:"2026-09-22", targetYear:2026})).toThrow("HOROSCOPE_ANNUAL_MAPPING_INVALID"); }
    finally { spy.mockRestore(); }
  });

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
    expect(result.daily.headline).not.toContain("Hội viên");
    expect(result.daily.evidenceKeys.length).toBeGreaterThan(0);
  });
  it.each([2026, 2027])("keeps genuine minor limit distinct and bound to selected year %s", targetYear => {
    const options = { asOfDate: "2025-08-22", targetYear };
    const result = calculateZiweiHoroscope(testProfile, options);
    expect(result.minorLimit).toMatchObject({ version: 1, calculationVersion: "iztro-age-normal-v1",
      targetYear, lunarAge: targetYear - 1992 + 1, provisional: false });
    expect(result.minorLimit!.palaceId).not.toBe(result.yearly.annualPalaceId);
    expect(result.daily.solarDate).toBe(options.asOfDate);
    const vendor = astro.withOptions({ type: "solar", dateStr: "1992-06-15", timeIndex: 4, gender: "male",
      language: "en-US", config: { algorithm: "default", yearDivide: "normal", horoscopeDivide: "normal", ageDivide: "normal", dayDivide: "current" } });
    const age = vendor.horoscope(`${targetYear}-07-01`, 4).age;
    expect(vendor.palaces[age.index]!.ages).toContain(result.minorLimit!.lunarAge);
    expect(result.minorLimit!.palaceId).toBe(targetYear === 2026 ? "ziwei.palace.travel" : "ziwei.palace.health");
    expect(result).toEqual(calculateZiweiHoroscope(testProfile, options));
  });

  it.each(["missing", "unmatched", "fractional", "wrong-age"])("withholds %s vendor minor limit instead of substituting annual palace", kind => {
    const original = vi.mocked(astro.withOptions).getMockImplementation()!;
    const spy = vi.spyOn(astro, "withOptions").mockImplementation(options => {
      const astrolabe = original(options);
      const compute = astrolabe.horoscope.bind(astrolabe);
      astrolabe.horoscope = (...args) => {
        const result = compute(...args);
        if (kind === "missing") result.age = undefined as never;
        else if (kind === "wrong-age") result.age.nominalAge++;
        else result.age.index = kind === "fractional" ? 0.5 : -1;
        return result;
      };
      return astrolabe;
    });
    try {
      const result = calculateZiweiHoroscope(testProfile, { asOfDate: "2026-09-22" });
      expect(result.minorLimit).toBeUndefined();
      expect(result.yearly.annualPalaceId).toBeDefined();
    } finally { spy.mockRestore(); }
  });

  it("retains provisional minor-limit uncertainty for unknown birth time", () => {
    const result = calculateZiweiHoroscope({ ...testProfile, normalizedTime: { precision: "unknown" } },
      { asOfDate: "2026-09-22", targetYear: 2027 });
    expect(result.minorLimit).toMatchObject({ targetYear: 2027, lunarAge: 36, provisional: true });
    expect(result.purchaseFacts?.provisional).toBe(true);
    expect(ZiweiHoroscopeResultV1Schema.safeParse({ ...result, minorLimit: { ...result.minorLimit!, provisional: false } }).success).toBe(false);
  });

  it("withholds a selected year before birth instead of clamping minor-limit age", () => {
    expect(calculateZiweiHoroscope(testProfile, { asOfDate: "2026-09-22", targetYear: 1991 }).minorLimit).toBeUndefined();
  });

});
