import { describe, expect, it } from "vitest";

import { buildBirthProfile } from "./birth-profile-input";

describe("birth profile form payload", () => {
  it("builds the exact-time happy-path payload with consent version and local timezone", () => {
    expect(
      buildBirthProfile({
        date: "1990-01-01",
        hour: "09",
        minute: "30",
        timeUnknown: false,
        gender: "male",
        locale: "vi",
      }),
    ).toEqual({
      version: 1,
      calendar: { kind: "solar", date: "1990-01-01" },
      time: { precision: "exact_minute", localTime: "09:30" },
      timezone: { offsetMinutes: 420 },
      gender: "male",
      consentVersion: "2026-09-01",
      locale: "vi",
    });
  });

  it("builds an honest unknown-time payload rather than inventing a time", () => {
    expect(
      buildBirthProfile({
        date: "1990-01-01",
        hour: "",
        minute: "",
        timeUnknown: true,
        gender: "female",
        locale: "en",
      }),
    ).toMatchObject({
      time: { precision: "unknown" },
      locale: "en",
    });
  });
});
