import { describe, expect, it } from "vitest";

import type { HomepageV3BirthValues } from "./homepage-v3-birth-profile";
import { reconcileHomepageV3Errors, validateHomepageV3BirthValues } from "./homepage-v3-form-validation";

const NOW = new Date("2026-10-01T00:00:00Z");
const message = (key: string) => `msg:${key}`;

const BASE: HomepageV3BirthValues = {
  displayName: "",
  gender: "male",
  calendarType: "solar",
  isLeapMonth: false,
  day: "15",
  month: "6",
  year: "1990",
  timeMode: "exact_minute",
  hour: "9",
  minute: "30",
  branch: "",
  timeUnknown: false,
  topConcern: null,
};

describe("validateHomepageV3BirthValues", () => {
  it("accepts a fully valid solar entry", () => {
    expect(validateHomepageV3BirthValues(BASE, NOW, message)).toEqual({});
  });

  it("rejects 31 February", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, day: "31", month: "2" }, NOW, message);
    expect(result.date).toBe("msg:dateImpossible");
  });

  it("accepts 29 February on a leap year", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, day: "29", month: "2", year: "2024" }, NOW, message);
    expect(result.date).toBeUndefined();
  });

  it("rejects a future solar date", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, day: "1", month: "1", year: "2027" }, NOW, message);
    expect(result.date).toBe("msg:dateFuture");
  });

  it("rejects hour 24", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, hour: "24", minute: "0" }, NOW, message);
    expect(result.time).toBe("msg:time");
  });

  it("rejects minute 60", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, hour: "9", minute: "60" }, NOW, message);
    expect(result.time).toBe("msg:time");
  });

  it("removes the time error when time is marked unknown, even with empty hour/minute", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, hour: "", minute: "", timeUnknown: true }, NOW, message);
    expect(result.time).toBeUndefined();
  });

  it("rejects branch-only mode with no branch selected", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, timeMode: "branch_only", branch: "" }, NOW, message);
    expect(result.time).toBe("msg:branch");
  });

  it("accepts branch-only mode once a branch is selected", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, timeMode: "branch_only", branch: "zi" }, NOW, message);
    expect(result.time).toBeUndefined();
  });

  it("rejects a missing gender", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, gender: null }, NOW, message);
    expect(result.gender).toBe("msg:gender");
  });

  it("rejects an out-of-range year", () => {
    const result = validateHomepageV3BirthValues({ ...BASE, year: "1900" }, NOW, message);
    expect(result.date).toBe("msg:dateRange");
  });
});

describe("reconcileHomepageV3Errors", () => {
  const ALL_ERRORS = { date: "bad date", time: "bad time", gender: "bad gender", storage: "bad storage" };

  it("replaces only the touched group, leaving unrelated errors intact", () => {
    const next = reconcileHomepageV3Errors(ALL_ERRORS, { date: undefined, time: "bad time", gender: "bad gender" }, { day: "1" });
    expect(next).toEqual({ time: "bad time", gender: "bad gender", storage: "bad storage" });
  });

  it("clears a group's error once that group revalidates clean", () => {
    const next = reconcileHomepageV3Errors(ALL_ERRORS, {}, { hour: "10" });
    expect(next.time).toBeUndefined();
    expect(next.date).toBe("bad date");
    expect(next.gender).toBe("bad gender");
  });

  it("leaves every error untouched when the edit is outside all groups (name/concern)", () => {
    const next = reconcileHomepageV3Errors(ALL_ERRORS, {}, { displayName: "An" });
    expect(next).toEqual(ALL_ERRORS);
  });

  it("never clears the storage error on its own — only a submit retry does that", () => {
    const next = reconcileHomepageV3Errors({ storage: "bad storage" }, {}, { day: "1" });
    expect(next.storage).toBe("bad storage");
  });

  it("touching one field in the date group still revalidates the whole group", () => {
    const next = reconcileHomepageV3Errors({ date: "bad date" }, { date: undefined }, { calendarType: "lunar" });
    expect(next.date).toBeUndefined();
  });
});
