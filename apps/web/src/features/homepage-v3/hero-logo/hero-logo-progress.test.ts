import { describe, expect, it } from "vitest";

import { getHeroLogoStage } from "./hero-logo-progress";

describe("getHeroLogoStage", () => {
  it("a date controls the first reveal and an optional name has no role", () => {
    expect(getHeroLogoStage({ dateValid: false, timeValid: true, genderSelected: true })).toBe("rest");
    expect(getHeroLogoStage({ dateValid: true, timeValid: false, genderSelected: true })).toBe("date");
  });

  it("time and required gender complete the original logomark", () => {
    expect(getHeroLogoStage({ dateValid: true, timeValid: true, genderSelected: false })).toBe("time");
    expect(getHeroLogoStage({ dateValid: true, timeValid: true, genderSelected: true })).toBe("complete");
  });

  it("removing previously valid input reverses the visual stage", () => {
    const values = { dateValid: true, timeValid: true, genderSelected: true };
    expect(getHeroLogoStage(values)).toBe("complete");
    values.timeValid = false;
    expect(getHeroLogoStage(values)).toBe("date");
    values.dateValid = false;
    expect(getHeroLogoStage(values)).toBe("rest");
  });
});
