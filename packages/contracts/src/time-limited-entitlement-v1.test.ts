import { describe, expect, it } from "vitest";

import {
  calculateBonusExpiry,
  evaluateDailyReadingAccess,
  getTimeLimitedEntitlementRemainingMs,
  isTimeLimitedEntitlementActive,
  TimeLimitedEntitlementV1Schema,
  type TimeLimitedEntitlementV1,
} from "./time-limited-entitlement-v1.js";

describe("time-limited-entitlement-v1", () => {
  const grantedAtStr = "2026-09-22T08:00:00.000Z";
  const validFromStr = "2026-09-22T08:00:00.000Z";
  // 7 days later: 2026-09-29T08:00:00.000Z
  const expiresAtStr = "2026-09-29T08:00:00.000Z";

  const sampleEntitlement: TimeLimitedEntitlementV1 = {
    id: "ent-bonus-123",
    ownerId: "usr-456",
    chartId: "chart-789",
    scope: "daily_reading",
    grantedAt: grantedAtStr,
    validFrom: validFromStr,
    expiresAt: expiresAtStr,
    source: "lifetime_reading_bonus",
  };

  it("validates compliant schema", () => {
    const result = TimeLimitedEntitlementV1Schema.safeParse(sampleEntitlement);
    expect(result.success).toBe(true);
  });

  describe("calculateBonusExpiry", () => {
    it("accurately calculates 7 full days from grant timestamp", () => {
      const expiry = calculateBonusExpiry(grantedAtStr, 7);
      expect(expiry.toISOString()).toBe("2026-09-29T08:00:00.000Z");
    });

    it("throws on invalid timestamp", () => {
      expect(() => calculateBonusExpiry("invalid-date")).toThrow();
    });
  });

  describe("isTimeLimitedEntitlementActive with frozen clock", () => {
    it("is active on Day 1 (right after grant)", () => {
      const now = new Date("2026-09-22T09:00:00.000Z");
      expect(isTimeLimitedEntitlementActive(sampleEntitlement, now)).toBe(true);
    });

    it("is active on Day 4 (midway)", () => {
      const now = new Date("2026-09-25T12:00:00.000Z");
      expect(isTimeLimitedEntitlementActive(sampleEntitlement, now)).toBe(true);
    });

    it("is active on Day 7 (1 second before expiry)", () => {
      const now = new Date("2026-09-29T07:59:59.000Z");
      expect(isTimeLimitedEntitlementActive(sampleEntitlement, now)).toBe(true);
    });

    it("expires on Day 8 (exact expiry mark)", () => {
      const now = new Date("2026-09-29T08:00:00.000Z");
      expect(isTimeLimitedEntitlementActive(sampleEntitlement, now)).toBe(false);
    });

    it("is expired on Day 8 (after expiry mark)", () => {
      const now = new Date("2026-09-29T09:00:00.000Z");
      expect(isTimeLimitedEntitlementActive(sampleEntitlement, now)).toBe(false);
    });

    it("is expired on Day 10", () => {
      const now = new Date("2026-10-02T08:00:00.000Z");
      expect(isTimeLimitedEntitlementActive(sampleEntitlement, now)).toBe(false);
    });

    it("is not active before validFrom", () => {
      const now = new Date("2026-09-22T07:00:00.000Z");
      expect(isTimeLimitedEntitlementActive(sampleEntitlement, now)).toBe(false);
    });
  });

  describe("getTimeLimitedEntitlementRemainingMs", () => {
    it("calculates remaining time while active", () => {
      const now = new Date("2026-09-29T07:00:00.000Z");
      expect(getTimeLimitedEntitlementRemainingMs(sampleEntitlement, now)).toBe(
        3600 * 1000,
      );
    });

    it("returns 0 once expired", () => {
      const now = new Date("2026-09-29T09:00:00.000Z");
      expect(getTimeLimitedEntitlementRemainingMs(sampleEntitlement, now)).toBe(0);
    });
  });

  describe("evaluateDailyReadingAccess (adapter/blocker without catalog coupling)", () => {
    it("returns active evaluation during the 7-day bonus period", () => {
      const now = new Date("2026-09-24T10:00:00.000Z");
      const evalResult = evaluateDailyReadingAccess({
        entitlement: sampleEntitlement,
        now,
      });
      expect(evalResult.hasAccess).toBe(true);
      expect(evalResult.status).toBe("active");
      expect(evalResult.expiresAt).toBe(expiresAtStr);
      expect(evalResult.remainingMs).toBeGreaterThan(0);
    });

    it("returns expired evaluation on Day 8", () => {
      const now = new Date("2026-09-29T08:00:00.000Z");
      const evalResult = evaluateDailyReadingAccess({
        entitlement: sampleEntitlement,
        now,
      });
      expect(evalResult.hasAccess).toBe(false);
      expect(evalResult.status).toBe("expired");
      expect(evalResult.remainingMs).toBe(0);
    });

    it("reports precise catalog blocker when no entitlement exists without inventing SKU activation", () => {
      const evalResult = evaluateDailyReadingAccess({
        entitlement: null,
      });
      expect(evalResult.hasAccess).toBe(false);
      expect(evalResult.status).toBe("catalog_blocked");
      expect(evalResult.blockerMessage).toContain(
        "Paid daily reading SKU activation is pending catalog package 1.3",
      );
    });
  });
});
