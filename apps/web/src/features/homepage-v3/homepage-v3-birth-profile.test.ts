import { describe, expect, it } from "vitest";

import {
  toHomepageV3Draft,
  toHomepageV3Prefill,
  type HomepageV3BirthValues,
} from "./homepage-v3-birth-profile";

const base: HomepageV3BirthValues = {
  displayName: "  Minh An  ",
  gender: "female",
  calendarType: "solar",
  isLeapMonth: false,
  day: "12",
  month: "4",
  year: "1994",
  timeMode: "exact_minute",
  hour: "7",
  minute: "05",
  branch: "",
  timeUnknown: false,
};

describe("homepage v3 birth profile adapter", () => {
  it("carries exact HH:MM across the CTA as exact_minute in draft and prefill", () => {
    const draft = toHomepageV3Draft(base);
    expect(draft?.timeState).toEqual({ precision: "exact_minute", hour: "07", minute: "05" });
    expect(draft?.displayName).toBe("Minh An");
    expect(toHomepageV3Prefill(base)).toEqual({
      date: "1994-04-12",
      time: { precision: "exact_minute", hour: "07", minute: "05" },
      gender: "female",
      displayName: "Minh An",
    });
  });

  it("lets unknown win over stale exact time", () => {
    expect(toHomepageV3Draft({ ...base, timeUnknown: true })?.timeState).toEqual({
      precision: "unknown",
    });
  });

  it("does not leak stale hours in branch mode and keeps the lunar leap month", () => {
    const values: HomepageV3BirthValues = {
      ...base,
      calendarType: "lunar",
      isLeapMonth: true,
      timeMode: "branch_only",
      branch: "zi",
    };
    const draft = toHomepageV3Draft(values);
    expect(draft?.timeState).toEqual({ precision: "branch_only", branch: "zi" });
    expect(draft?.isLeapMonth).toBe(true);
    expect(toHomepageV3Prefill(values)).toBeNull();
  });

  it("accepts 00:00 and 23:59 and rejects missing or out-of-range time", () => {
    expect(toHomepageV3Draft({ ...base, hour: "0", minute: "0" })?.timeState).toEqual({
      precision: "exact_minute",
      hour: "00",
      minute: "00",
    });
    expect(toHomepageV3Draft({ ...base, hour: "23", minute: "59" })?.timeState).toEqual({
      precision: "exact_minute",
      hour: "23",
      minute: "59",
    });
    const invalid = [
      { hour: "24", minute: "00" },
      { hour: "12", minute: "60" },
      { hour: "", minute: "10" },
      { hour: "10", minute: "" },
      { hour: "-1", minute: "00" },
    ];
    for (const time of invalid) {
      expect(toHomepageV3Draft({ ...base, ...time })).toBeNull();
    }
  });

  it("rejects a missing branch or missing gender", () => {
    expect(toHomepageV3Draft({ ...base, timeMode: "branch_only", branch: "" })).toBeNull();
    expect(toHomepageV3Draft({ ...base, gender: null })).toBeNull();
  });

  it("keeps the date as entered and never converts lunar to solar", () => {
    const draft = toHomepageV3Draft({
      ...base,
      calendarType: "lunar",
      isLeapMonth: true,
      day: "30",
      month: "8",
    });
    expect([draft?.day, draft?.month, draft?.year, draft?.calendarType, draft?.isLeapMonth]).toEqual(
      ["30", "8", "1994", "lunar", true],
    );
  });

  it("rejects empty, impossible, future and pre-1920 birth dates", () => {
    expect(toHomepageV3Draft({ ...base, day: "" })).toBeNull();
    expect(toHomepageV3Draft({ ...base, day: "31", month: "2" })).toBeNull();
    expect(toHomepageV3Draft({ ...base, calendarType: "lunar", day: "31" })).toBeNull();
    expect(toHomepageV3Draft({ ...base, year: "1919" })).toBeNull();
    expect(toHomepageV3Draft({ ...base, year: "1920" })).not.toBeNull();
    expect(toHomepageV3Draft(base, new Date(1990, 0, 1))).toBeNull();
  });
});
