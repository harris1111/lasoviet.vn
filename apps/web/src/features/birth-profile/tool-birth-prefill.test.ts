import { describe, expect, it } from "vitest";

import { hasToolBirthPrefill, parseToolBirthPrefill } from "./tool-birth-prefill";

describe("parseToolBirthPrefill", () => {
  it("reads name and a full birth date from a numerology link", () => {
    expect(parseToolBirthPrefill({
      name: "  Nguyễn   Minh An ",
      birthDay: "5",
      birthMonth: "9",
      birthYear: "1994",
    }, 2026)).toEqual({ displayName: "Nguyễn Minh An", day: "05", month: "09", year: "1994" });
  });

  it("keeps only the birth year from a love-compatibility link", () => {
    expect(parseToolBirthPrefill({ name: "Lan", birthYear: "1990" }, 2026))
      .toEqual({ displayName: "Lan", year: "1990" });
  });

  it("drops out-of-range and malformed values one by one", () => {
    expect(parseToolBirthPrefill({
      birthDay: "32",
      birthMonth: "0",
      birthYear: "2031",
    }, 2026)).toEqual({});
    expect(parseToolBirthPrefill({ birthDay: "1e1", birthMonth: "-3", birthYear: "1899" }, 2026)).toEqual({});
  });

  it("rejects an empty or overlong name", () => {
    expect(parseToolBirthPrefill({ name: "   " }, 2026)).toEqual({});
    expect(parseToolBirthPrefill({ name: "a".repeat(61) }, 2026)).toEqual({});
  });

  it("takes the first value when a parameter repeats", () => {
    expect(parseToolBirthPrefill({ birthYear: ["1988", "1999"] }, 2026)).toEqual({ year: "1988" });
  });

  it("reports whether anything usable was found", () => {
    expect(hasToolBirthPrefill(parseToolBirthPrefill(undefined, 2026))).toBe(false);
    expect(hasToolBirthPrefill(parseToolBirthPrefill({ birthYear: "2000" }, 2026))).toBe(true);
  });
});
