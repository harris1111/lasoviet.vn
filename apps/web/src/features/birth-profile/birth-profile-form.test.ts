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

  it("builds branch_only payload with canonical branch (si) without synthesizing minute or HH:00", () => {
    const profile = buildBirthProfile({
      date: "1994-04-12",
      time: { precision: "branch_only", branch: "si" },
      gender: "female",
      locale: "vi",
    });

    expect(profile).toEqual({
      version: 1,
      calendar: { kind: "solar", date: "1994-04-12" },
      time: { precision: "branch_only", branch: "si" },
      timezone: { offsetMinutes: 420 },
      gender: "female",
      consentVersion: "2026-09-01",
      locale: "vi",
    });
    expect((profile.time as { localTime?: string }).localTime).toBeUndefined();
  });

  it("supports discriminated precision state for exact_minute, branch_only, and unknown", () => {
    expect(
      buildBirthProfile({
        date: "1988-08-08",
        time: { precision: "exact_minute", hour: "14", minute: "15" },
        gender: "male",
        locale: "en",
      }),
    ).toMatchObject({
      time: { precision: "exact_minute", localTime: "14:15" },
    });

    expect(
      buildBirthProfile({
        date: "1988-08-08",
        time: { precision: "unknown" },
        gender: "male",
        locale: "en",
      }),
    ).toMatchObject({
      time: { precision: "unknown" },
    });
  });
});
