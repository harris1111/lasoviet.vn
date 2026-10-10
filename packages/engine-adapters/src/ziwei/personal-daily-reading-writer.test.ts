import { readFileSync } from "node:fs";
import { DAILY_MUTAGEN_RULES, DAILY_STAR_RULES } from "./daily-reading-grounding.js";
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
      version: 1, displayName: "Nguyễn Văn A", gender: "Nam",
      calendar: {kind: "solar", date: "1992-06-15"}, time: {precision: "exact_minute", localTime: "08:30"},
      timezone: {ianaZone: "Asia/Ho_Chi_Minh"}, consentVersion: "synthetic-qa-v1",
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
    expect(reading.reading.headline).toContain("Ngày Kỷ Hợi:");
    expect(reading.reading.overview).toContain("phần nói về");
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

  it("keeps daily prose plain and explains the actual palace even without major stars", () => {
    const now = () => new Date("2026-09-30T03:00:00Z");
    let emptyMajorStars = 0;
    const palaces = new Set<string>();
    for (let day = 11; day <= 30; day++) {
      const reading = writePersonalDailyReading(testProfile, {asOfDate: `2026-09-${day}`, now});
      const text = JSON.stringify(reading.reading);
      expect(text).not.toMatch(/vận trình|thân tâm|nhật lưu|tọa thủ|cung vị|thị phi|bạn\. ngày/iu);
      expect(reading.reading.overview).toContain(`cung ${reading.chartGrounding.touchedPalaceName}, phần nói về`);
      palaces.add(reading.chartGrounding.touchedPalaceId);
      if (!reading.chartGrounding.majorStars.length) emptyMajorStars++;
      expect(reading).toEqual(writePersonalDailyReading(testProfile, {asOfDate: `2026-09-${day}`, now}));
    }
    expect(palaces.size).toBe(12);
    expect(emptyMajorStars).toBeGreaterThan(0);
  }, 30_000);

  it("pins all interpretation rules to approved V4 passages", () => {
    const source = JSON.parse(readFileSync("content/knowledge/vi/ziwei/comprehensive-report.v4.json", "utf8"));
    expect(source.approval).toMatchObject({status: "approved", approver: "founder"});
    for (const rule of [...Object.values(DAILY_STAR_RULES), ...Object.values(DAILY_MUTAGEN_RULES)]) {
      expect(source.chunks.find((item: {passageId: string}) => item.passageId === rule.passageId)).toMatchObject({contentHash: rule.contentHash});
    }
  });
  it("explains different computed configurations in both prose and actions for the same palace", () => {
    const fixture = JSON.parse(readFileSync("plan/evidence/2026-10-05-personal-daily-editorial-qa.json", "utf8"));
    const examples: Array<ReturnType<typeof writePersonalDailyReading>> = fixture.samples.map((sample: {sample: number; syntheticInput: {birthDate: string; localTime: string; gender: string}}) => {
      const profile: NormalizedBirthProfileV1 = {...testProfile, originalInput: {...testProfile.originalInput, gender: sample.syntheticInput.gender, calendar: {kind: "solar", date: sample.syntheticInput.birthDate}, time: {precision: "exact_minute", localTime: sample.syntheticInput.localTime}},
        normalizedCalendar: {kind: "solar", date: sample.syntheticInput.birthDate}, normalizedTime: {precision: "exact_minute", localTime: sample.syntheticInput.localTime}};
      return writePersonalDailyReading(profile, {asOfDate: "2026-09-30", chartId: `synthetic-daily-${sample.sample}`, chartVersionId: `synthetic-version-${sample.sample}`, now: () => new Date("2026-09-30T03:00:00Z")});
    });
    const pair = examples.flatMap(first => examples.filter(second => first.chartGrounding.touchedPalaceId === second.chartGrounding.touchedPalaceId &&
      JSON.stringify(first.chartGrounding.majorStars) !== JSON.stringify(second.chartGrounding.majorStars)).map(second => [first, second] as const))[0];
    expect(pair).toBeDefined(); expect(pair![0].reading.overview).not.toBe(pair![1].reading.overview);
    expect(pair![0].reading.actionPlan.recommendations).not.toEqual(pair![1].reading.actionPlan.recommendations);
    for (const reading of examples) {
      expect(reading.reading.overview).toContain("Vì sao hôm nay là chủ đề này");
      for (const star of reading.chartGrounding.majorStars) expect(reading.evidenceKeys).toContain(`daily.star.${star}`);
      expect(reading.reading.overview).not.toMatch(/buổi (chiều|sáng|tối)|Thuận lợi cho|Thích hợp để/iu);
      for (const key of reading.reading.actionPlan.evidenceKeys) expect(reading.evidenceKeys).toContain(key);
    }
  }, 30_000);
  it.each(["buổi chiều thuận lợi để ký hợp đồng", "lúc 14 giờ bạn sẽ nhận tiền", "bạn chắc chắn thành công", "bạn sẽ gặp tai nạn"])("rejects an unsupported daily event/time: %s", text => {
    const now = () => new Date("2026-09-30T03:00:00Z");
    const reading = writePersonalDailyReading(testProfile, {asOfDate: "2026-09-30", now});
    const corrupted = {...reading, reading: {...reading.reading, overview: text}};
    expect(validatePersonalDailyReadingQuality(corrupted, calculateZiweiHoroscope(testProfile, {asOfDate: "2026-09-30"})).ok).toBe(false);
  });
  it("rejects changed star facts against independently computed grounding", () => {
    const reading = writePersonalDailyReading(testProfile, {asOfDate: "2026-09-30", now: () => new Date("2026-09-30T03:00:00Z")});
    const corrupted = {...reading, chartGrounding: {...reading.chartGrounding, majorStars: ["Invented star"]}};
    expect(validatePersonalDailyReadingQuality(corrupted, calculateZiweiHoroscope(testProfile, {asOfDate: "2026-09-30"}), reading.chartGrounding).ok).toBe(false);
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
  it.each([
    ["2027-02-05", "29/12 Bính Ngọ"],
    ["2027-02-06", "1/1 Đinh Mùi"],
    ["2025-08-22", "29/6 nhuận Ất Tỵ"],
    ["2025-08-23", "1/7 Ất Tỵ"],
  ])("uses the actual daily calendar and grounding at %s", (asOfDate, expectedLunarDate) => {
    const now = () => new Date(`${asOfDate}T03:00:00Z`);
    const reading = writePersonalDailyReading(testProfile, { asOfDate, now });
    const horoscope = calculateZiweiHoroscope(testProfile, { asOfDate });
    expect(reading.calendar.solarDate).toBe(asOfDate);
    expect(reading.calendar.lunarDateFormatted).toBe(expectedLunarDate);
    expect(reading.calendar.lunarDateFormatted).not.toMatch(/\/-\d/);
    expect(reading.chartGrounding.touchedPalaceId).toBe(horoscope.daily.touchedPalaceId);
    expect(reading.evidenceKeys).toContain(`daily.date.${asOfDate}`);
    expect(reading.qualityGate.passed).toBe(true);
    expect(reading).toEqual(writePersonalDailyReading(testProfile, { asOfDate, now }));
  });

});
