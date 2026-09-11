import { describe, expect, it } from "vitest";
import {
  BirthCalendarInputSchema,
  BirthProfileV1Schema,
} from "./birth-profile-v1";

describe("BirthCalendarInputSchema contract validation", () => {
  it("accepts valid solar ISO date and rejects impossible solar date", () => {
    const validSolar = BirthCalendarInputSchema.safeParse({
      kind: "solar",
      date: "2024-02-29",
    });
    expect(validSolar.success).toBe(true);

    const impossibleSolar = BirthCalendarInputSchema.safeParse({
      kind: "solar",
      date: "2024-02-30",
    });
    expect(impossibleSolar.success).toBe(false);
  });

  it("solar calendar rejects extra properties such as isLeapMonth (strict)", () => {
    const invalidSolar = BirthCalendarInputSchema.safeParse({
      kind: "solar",
      date: "2024-02-29",
      isLeapMonth: false,
    });
    expect(invalidSolar.success).toBe(false);
  });

  it("accepts valid lunar date with day 30, even in month 2", () => {
    const lunarDay30 = BirthCalendarInputSchema.safeParse({
      kind: "lunar",
      date: "2024-02-30",
      isLeapMonth: false,
    });
    expect(lunarDay30.success).toBe(true);

    const lunarLeapDay30 = BirthCalendarInputSchema.safeParse({
      kind: "lunar",
      date: "2024-02-30",
      isLeapMonth: true,
    });
    expect(lunarLeapDay30.success).toBe(true);
  });

  it("accepts lunar date boundaries (day 1..30, month 1..12, year 1000..9999)", () => {
    expect(
      BirthCalendarInputSchema.safeParse({
        kind: "lunar",
        date: "1000-01-01",
        isLeapMonth: false,
      }).success,
    ).toBe(true);

    expect(
      BirthCalendarInputSchema.safeParse({
        kind: "lunar",
        date: "9999-12-30",
        isLeapMonth: true,
      }).success,
    ).toBe(true);
  });

  it("rejects lunar day 31 and day 00", () => {
    const day31 = BirthCalendarInputSchema.safeParse({
      kind: "lunar",
      date: "2024-01-31",
      isLeapMonth: false,
    });
    expect(day31.success).toBe(false);

    const day00 = BirthCalendarInputSchema.safeParse({
      kind: "lunar",
      date: "2024-01-00",
      isLeapMonth: false,
    });
    expect(day00.success).toBe(false);
  });

  it("rejects invalid lunar month (00 or 13)", () => {
    expect(
      BirthCalendarInputSchema.safeParse({
        kind: "lunar",
        date: "2024-00-15",
        isLeapMonth: false,
      }).success,
    ).toBe(false);

    expect(
      BirthCalendarInputSchema.safeParse({
        kind: "lunar",
        date: "2024-13-15",
        isLeapMonth: false,
      }).success,
    ).toBe(false);
  });

  it("rejects lunar year < 1000", () => {
    expect(
      BirthCalendarInputSchema.safeParse({
        kind: "lunar",
        date: "0999-05-15",
        isLeapMonth: false,
      }).success,
    ).toBe(false);
  });

  it("requires isLeapMonth boolean on lunar calendar", () => {
    expect(
      BirthCalendarInputSchema.safeParse({
        kind: "lunar",
        date: "2024-05-15",
      }).success,
    ).toBe(false);

    expect(
      BirthCalendarInputSchema.safeParse({
        kind: "lunar",
        date: "2024-05-15",
        isLeapMonth: "yes",
      }).success,
    ).toBe(false);
  });

  it("validates full BirthProfileV1Schema with lunar calendar", () => {
    const profile = {
      version: 1,
      calendar: {
        kind: "lunar",
        date: "2024-02-30",
        isLeapMonth: true,
      },
      time: {
        precision: "exact_minute",
        localTime: "08:30",
      },
      timezone: {
        ianaZone: "Asia/Ho_Chi_Minh",
      },
      gender: "female",
      consentVersion: "2026-09-01",
      locale: "vi",
    };

    const parsed = BirthProfileV1Schema.safeParse(profile);
    expect(parsed.success).toBe(true);
  });
});
