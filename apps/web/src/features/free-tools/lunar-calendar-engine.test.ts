import { describe, expect, it } from "vitest";
import { getMonthLunarDays, getGoodDaysForActivity } from "./lunar-calendar-engine";

describe("lunar-calendar-engine", () => {
  it("calculates September 2026 accurately matching traditional reference", () => {
    const res = getMonthLunarDays(2026, 9, "vi");

    expect(res.year).toBe(2026);
    expect(res.month).toBe(9);
    expect(res.days.length).toBe(30);
    expect(res.lunarYearName).toBe("Bính Ngọ");

    // Day 1: 1/9/2026 is 20/7 Bính Ngọ, Mậu Dần, Hắc Đạo (Thiên Hình)
    const day1 = res.days[0]!;
    expect(day1.dayOfMonth).toBe(1);
    expect(day1.lunarDay).toBe(20);
    expect(day1.lunarMonth).toBe(7);
    expect(day1.lunarDayName).toBe("Mậu Dần");
    expect(day1.isHoangDao).toBe(false);
    expect(day1.starName).toBe("Thiên Hình");

    // Day 23: 23/9/2026 is 13/8 Bính Ngọ, Canh Tý, Hoàng Đạo (Tư Mệnh), Thu Phân
    const day23 = res.days[22]!;
    expect(day23.dayOfMonth).toBe(23);
    expect(day23.lunarDay).toBe(13);
    expect(day23.lunarMonth).toBe(8);
    expect(day23.lunarDayName).toBe("Canh Tý");
    expect(day23.isHoangDao).toBe(true);
    expect(day23.starName).toBe("Tư Mệnh");
    expect(day23.solarTerm).toBe("Thu Phân");
    expect(day23.goodHours).toEqual(["Tý", "Sửu", "Mão", "Ngọ", "Thân", "Dậu"]);
  });

  it("filters good days for activities without composite score", () => {
    const weddingDays = getGoodDaysForActivity(2026, 9, "wedding", "vi");
    expect(weddingDays.length).toBeGreaterThan(0);
    for (const d of weddingDays) {
      expect(d.isHoangDao).toBe(true);
      expect(d.reasons.length).toBeGreaterThan(0);
      expect(d.goodHours.length).toBeGreaterThan(0);
    }

    const openingDays = getGoodDaysForActivity(2026, 9, "opening", "vi");
    expect(openingDays.length).toBeGreaterThan(0);
    for (const d of openingDays) {
      expect(d.isHoangDao).toBe(true);
    }
  });
});
