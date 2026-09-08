import { describe, expect, it } from "vitest";

import {
  BirthProfileV1Schema,
} from "./birth-profile-v1.js";
import {
  ZiweiBirthSummaryV1Schema,
} from "./ziwei-view-v1.js";

describe("BirthProfileV1Schema displayName", () => {
  const baseProfile = {
    version: 1 as const,
    calendar: { kind: "solar" as const, date: "1995-08-20" },
    time: { precision: "exact_minute" as const, localTime: "08:15" },
    timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
    consentVersion: "2026-09-01",
    gender: "female",
  };

  it("accepts a profile without displayName for backward compatibility", () => {
    const result = BirthProfileV1Schema.safeParse(baseProfile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBeUndefined();
    }
  });

  it("accepts and trims a valid displayName within 1 to 80 characters", () => {
    const result = BirthProfileV1Schema.safeParse({
      ...baseProfile,
      displayName: "  Nguyen Van A  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Nguyen Van A");
    }
  });

  it("rejects an empty or whitespace-only displayName", () => {
    const result = BirthProfileV1Schema.safeParse({
      ...baseProfile,
      displayName: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a displayName longer than 80 characters", () => {
    const result = BirthProfileV1Schema.safeParse({
      ...baseProfile,
      displayName: "A".repeat(81),
    });
    expect(result.success).toBe(false);
  });
});

describe("ZiweiBirthSummaryV1Schema displayName", () => {
  const baseSummary = {
    normalizedCalendar: { kind: "solar" as const, date: "1995-08-20" },
    normalizedTime: { precision: "exact_minute" as const, localTime: "08:15" },
    timezoneProvenance: { source: "offset" as const, offsetMinutes: 420 },
    gender: "female",
  };

  it("accepts a summary without displayName for backward compatibility", () => {
    const result = ZiweiBirthSummaryV1Schema.safeParse(baseSummary);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBeUndefined();
    }
  });

  it("accepts and trims a valid displayName", () => {
    const result = ZiweiBirthSummaryV1Schema.safeParse({
      ...baseSummary,
      displayName: "  Tran Thi B  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Tran Thi B");
    }
  });

  it("rejects an empty displayName in birth summary", () => {
    const result = ZiweiBirthSummaryV1Schema.safeParse({
      ...baseSummary,
      displayName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a displayName longer than 80 characters in birth summary", () => {
    const result = ZiweiBirthSummaryV1Schema.safeParse({
      ...baseSummary,
      displayName: "B".repeat(81),
    });
    expect(result.success).toBe(false);
  });
});
