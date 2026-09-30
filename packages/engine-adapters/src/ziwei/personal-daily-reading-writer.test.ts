import { describe, expect, it } from "vitest";

import type { NormalizedBirthProfileV1 } from "@lasoviet/contracts";

import { calculateZiweiHoroscope } from "./iztro-horoscope.js";
import {
  validatePersonalDailyReadingQuality,
  writePersonalDailyReading,
} from "./personal-daily-reading-writer.js";

describe("personal-daily-reading-writer", () => {
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

  it("generates a rich, deterministic personal daily reading grounded in the chart", () => {
    const reading = writePersonalDailyReading(testProfile, {
      asOfDate: "2026-09-22",
      chartId: "chart-test-001",
      chartVersionId: "ver-test-001",
    });

    expect(reading.version).toBe(1);
    expect(reading.chartId).toBe("chart-test-001");
    expect(reading.chartVersionId).toBe("ver-test-001");
    expect(reading.asOfDate).toBe("2026-09-22");

    // Calendar
    expect(reading.calendar.solarDate).toBe("2026-09-22");
    expect(reading.calendar.solarDateFormatted).toContain("Thứ Ba, 22/9/2026");
    expect(reading.calendar.lunarDateFormatted).toBe("12/8 Bính Ngọ");
    expect(reading.calendar.dayStemBranch).toBe("Kỷ Hợi");
    expect(reading.calendar.solarTerm).toBe("Bạch Lộ");

    // Chart Grounding (Deeper than con giáp)
    expect(reading.chartGrounding.touchedPalaceId).toBeDefined();
    expect(reading.chartGrounding.touchedPalaceName).toBeDefined();
    expect(reading.chartGrounding.majorStars).toBeInstanceOf(Array);
    expect(reading.chartGrounding.dailyMutagens.length).toBeGreaterThan(0);

    // Reading sections
    expect(reading.reading.headline).toContain("Ngày Kỷ Hợi chạm cung");
    expect(reading.reading.overview).toContain("năng lượng nhật lưu hội tụ");
    expect(reading.reading.aspects).toHaveLength(4);

    const aspectKeys = reading.reading.aspects.map((a) => a.key);
    expect(aspectKeys).toEqual(["work", "finances", "relationships", "wellbeing"]);

    for (const aspect of reading.reading.aspects) {
      expect(aspect.title.length).toBeGreaterThan(3);
      expect(aspect.guidance.length).toBeGreaterThan(20);
      expect(aspect.evidenceKeys.length).toBeGreaterThan(0);
    }

    // Action plan
    expect(reading.reading.actionPlan.recommendations.length).toBeGreaterThanOrEqual(2);
    expect(reading.reading.actionPlan.cautions.length).toBeGreaterThanOrEqual(2);

    // Evidence keys
    expect(reading.evidenceKeys).toContain("daily.date.2026-09-22");
    expect(
      reading.evidenceKeys.some((k) => k.startsWith("daily.palace.")),
    ).toBe(true);

    // Quality gate
    expect(reading.qualityGate.passed).toBe(true);
    expect(reading.qualityGate.rulesChecked).toContain("FD089_NO_DEATH_LIFESPAN");
    expect(reading.qualityGate.rulesChecked).toContain("FD089_NO_RITUALS_AMULETS");
  });

  describe("FD-089 quality gates", () => {
    it("rejects content containing death / lifespan terms", () => {
      const reading = writePersonalDailyReading(testProfile, {
        asOfDate: "2026-09-22",
      });
      const horoscope = calculateZiweiHoroscope(testProfile, {
        asOfDate: "2026-09-22",
      });

      const corrupted = {
        ...reading,
        reading: {
          ...reading.reading,
          overview: "Hôm nay dự báo bạn sẽ bị đoản thọ hoặc tử vong.",
        },
      };

      const result = validatePersonalDailyReadingQuality(corrupted, horoscope);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("death, lifespan"))).toBe(true);
    });

    it("rejects content containing ritual, 'giải hạn', or amulet suggestions", () => {
      const reading = writePersonalDailyReading(testProfile, {
        asOfDate: "2026-09-22",
      });
      const horoscope = calculateZiweiHoroscope(testProfile, {
        asOfDate: "2026-09-22",
      });

      const corrupted = {
        ...reading,
        reading: {
          ...reading.reading,
          overview: "Bạn nên thỉnh bùa và cúng sao giải hạn để tránh xui xẻo.",
        },
      };

      const result = validatePersonalDailyReadingQuality(corrupted, horoscope);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("rituals, amulets"))).toBe(true);
    });

    it("rejects content containing lottery / gambling numbers", () => {
      const reading = writePersonalDailyReading(testProfile, {
        asOfDate: "2026-09-22",
      });
      const horoscope = calculateZiweiHoroscope(testProfile, {
        asOfDate: "2026-09-22",
      });

      const corrupted = {
        ...reading,
        reading: {
          ...reading.reading,
          overview: "Hôm nay đánh đề hoặc chơi lô đề số 68 sẽ trúng lớn.",
        },
      };

      const result = validatePersonalDailyReadingQuality(corrupted, horoscope);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("lottery or gambling"))).toBe(true);
    });

    it("rejects content with ungrounded palace mismatch", () => {
      const reading = writePersonalDailyReading(testProfile, {
        asOfDate: "2026-09-22",
      });
      const horoscope = calculateZiweiHoroscope(testProfile, {
        asOfDate: "2026-09-22",
      });

      const corrupted = {
        ...reading,
        chartGrounding: {
          ...reading.chartGrounding,
          touchedPalaceId: "ziwei.palace.parents" as const, // Intentional mismatch
        },
      };

      const result = validatePersonalDailyReadingQuality(corrupted, horoscope);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("Evidence Mismatch"))).toBe(true);
    });
  });
});
