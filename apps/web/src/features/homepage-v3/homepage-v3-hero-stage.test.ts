import { describe, expect, it } from "vitest";

import { deriveHeroStage, hourToBranchIndex } from "./homepage-v3-hero-stage";
import type { HomepageV3BirthValues } from "./homepage-v3-birth-profile";

const NOW = new Date("2026-09-25T10:00:00+07:00");

const EMPTY: HomepageV3BirthValues = {
  displayName: "",
  gender: null,
  calendarType: "solar",
  isLeapMonth: false,
  day: "",
  month: "",
  year: "",
  timeMode: "exact_minute",
  hour: "",
  minute: "",
  branch: "",
  timeUnknown: false,
  topConcern: null,
};

const withDate = (over: Partial<HomepageV3BirthValues> = {}): HomepageV3BirthValues => ({
  ...EMPTY,
  day: "12",
  month: "04",
  year: "1994",
  ...over,
});

describe("hourToBranchIndex", () => {
  it.each([
    [23, 0],
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [11, 6],
    [12, 6],
    [22, 11],
  ])("maps hour %i to branch %i", (hour, index) => {
    expect(hourToBranchIndex(hour)).toBe(index);
  });
});

describe("deriveHeroStage: date", () => {
  it("is stage 0 for an empty form", () => {
    const result = deriveHeroStage(EMPTY, NOW);
    expect(result.stage).toBe(0);
    expect(result.logoStage).toBe("rest");
    expect(result.date).toBeNull();
  });

  it("rejects 31/02 and a missing year", () => {
    expect(deriveHeroStage(withDate({ day: "31", month: "02" }), NOW).stage).toBe(0);
    expect(deriveHeroStage(withDate({ year: "" }), NOW).stage).toBe(0);
    expect(deriveHeroStage(withDate({ year: "94" }), NOW).stage).toBe(0);
  });

  it("rejects a future date", () => {
    expect(deriveHeroStage(withDate({ year: "2027" }), NOW).stage).toBe(0);
  });

  it("opens stage 1 and the logo date stage for a valid date", () => {
    const result = deriveHeroStage(withDate(), NOW);
    expect(result.stage).toBe(1);
    expect(result.logoStage).toBe("date");
    expect(result.date).toEqual({ day: "12", month: "04", year: "1994", calendarType: "solar", isLeapMonth: false });
  });

  it("keeps the leap flag only for the lunar calendar", () => {
    const lunar = deriveHeroStage(withDate({ calendarType: "lunar", isLeapMonth: true }), NOW);
    expect(lunar.date?.isLeapMonth).toBe(true);
    const solar = deriveHeroStage(withDate({ calendarType: "solar", isLeapMonth: true }), NOW);
    expect(solar.date?.isLeapMonth).toBe(false);
  });
});

describe("deriveHeroStage: time", () => {
  it("does not open the time stage without a valid date", () => {
    const result = deriveHeroStage({ ...EMPTY, hour: "07", minute: "05" }, NOW);
    expect(result.stage).toBe(0);
    expect(result.branchIndex).toBeNull();
  });

  it.each([
    ["00", "00", 0],
    ["23", "59", 0],
    ["07", "05", 4],
  ])("accepts %s:%s", (hour, minute, branch) => {
    const result = deriveHeroStage(withDate({ hour, minute }), NOW);
    expect(result.stage).toBe(2);
    expect(result.timeValid).toBe(true);
    expect(result.branchIndex).toBe(branch);
    expect(result.time).toEqual({ kind: "exact", hour, minute });
  });

  it.each([
    ["24", "00"],
    ["23", "60"],
    ["", "30"],
    ["07", ""],
  ])("rejects %s:%s and stays on the date stage", (hour, minute) => {
    const result = deriveHeroStage(withDate({ hour, minute }), NOW);
    expect(result.stage).toBe(1);
    expect(result.timeValid).toBe(false);
    expect(result.logoStage).toBe("date");
  });

  it("branch mode needs a chosen branch", () => {
    expect(deriveHeroStage(withDate({ timeMode: "branch_only" }), NOW).stage).toBe(1);
    const chosen = deriveHeroStage(withDate({ timeMode: "branch_only", branch: "wu" }), NOW);
    expect(chosen.stage).toBe(2);
    expect(chosen.branchIndex).toBe(6);
    expect(chosen.time).toEqual({ kind: "branch", index: 6 });
  });

  it("ignores stale hour/minute after switching to branch mode", () => {
    const result = deriveHeroStage(withDate({ timeMode: "branch_only", hour: "07", minute: "05" }), NOW);
    expect(result.timeValid).toBe(false);
    expect(result.stage).toBe(1);
  });

  it("an explicit unknown time advances the stage without highlighting a branch", () => {
    const result = deriveHeroStage(withDate({ timeUnknown: true }), NOW);
    expect(result.stage).toBe(2);
    expect(result.timeValid).toBe(true);
    expect(result.branchIndex).toBeNull();
    expect(result.time).toEqual({ kind: "unknown" });
  });
});

describe("deriveHeroStage: gender, name and reversal", () => {
  const ready = withDate({ hour: "07", minute: "05" });

  it("completes the logo with gender and never needs a name", () => {
    const noGender = deriveHeroStage(ready, NOW);
    expect(noGender.logoStage).toBe("time");
    const complete = deriveHeroStage({ ...ready, gender: "female" }, NOW);
    expect(complete.logoStage).toBe("complete");
    expect(complete.stage).toBe(2);
  });

  it("opens the name stage only with a non-blank name", () => {
    expect(deriveHeroStage({ ...ready, displayName: "   " }, NOW).stage).toBe(2);
    const named = deriveHeroStage({ ...ready, displayName: "  Minh An " }, NOW);
    expect(named.stage).toBe(3);
    expect(named.name).toBe("Minh An");
  });

  it("does not show a name before the date is valid", () => {
    expect(deriveHeroStage({ ...EMPTY, displayName: "Minh An" }, NOW).stage).toBe(0);
  });

  it("steps back when a value is removed", () => {
    const full = { ...ready, gender: "male" as const, displayName: "Minh An" };
    expect(deriveHeroStage(full, NOW).stage).toBe(3);
    expect(deriveHeroStage({ ...full, hour: "" }, NOW).stage).toBe(1);
    expect(deriveHeroStage({ ...full, hour: "", day: "" }, NOW).stage).toBe(0);
    expect(deriveHeroStage({ ...full, gender: null }, NOW).logoStage).toBe("time");
  });
});
