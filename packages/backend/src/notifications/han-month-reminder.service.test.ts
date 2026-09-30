import { describe, expect, it } from "vitest";
import { dueComputedHanPeriod } from "./han-month-reminder.service.js";
import { facts } from "../reports/period-report.test-fixture.js";
import { lunarReminderDay } from "../../../engine-adapters/src/ziwei/period-purchase-key.js";

describe("computed lunar reminder selection", () => {
  const first = { ...facts.periods[0]!, year: 2025, month: 6, isLeapMonth: true, part: "first" as const, dayRange: [1, 15] as [number, number], starIds: ["ziwei.star.lianzhen"], obstacleStarIds: ["ziwei.star.lianzhen"] };
  const second = { ...first, part: "second" as const, dayRange: [16, 30] as [number, number] };
  const annual = { ...facts, kind: "annual" as const, targetYear: 2025, periods: [first, second] };
  it("keeps both leap halves distinct and requires real computed obstacle stars", () => {
    expect(dueComputedHanPeriod(annual, { year: 2025, month: 6, isLeapMonth: true, day: 15 })).toEqual(first);
    expect(dueComputedHanPeriod(annual, { year: 2025, month: 6, isLeapMonth: true, day: 16 })).toEqual(second);
    expect(dueComputedHanPeriod(annual, { year: 2025, month: 6, isLeapMonth: false, day: 16 })).toBeNull();
    expect(dueComputedHanPeriod(annual, { year: 2026, month: 6, isLeapMonth: true, day: 16 })).toBeNull();
    expect(dueComputedHanPeriod({ ...annual, periods: [{ ...first, obstacleStarIds: [] }] }, { year: 2025, month: 6, isLeapMonth: true, day: 1 })).toBeNull();
    expect(dueComputedHanPeriod({ ...annual, periods: [{ ...first, starIds: [] }] }, { year: 2025, month: 6, isLeapMonth: true, day: 1 })).toBeNull();
  });
  it("uses the same lunar calendar for early January and leap-month boundaries", () => {
    expect(lunarReminderDay("2026-01-01")).toMatchObject({ year: 2025, month: 11, isLeapMonth: false });
    expect(lunarReminderDay("2025-07-25")).toEqual({ year: 2025, month: 6, isLeapMonth: true, day: 1 });
  });
});
