import { describe, expect, it } from "vitest";

import { DAILY_READING_CATALOG_BLOCKER_MESSAGE } from "@lasoviet/contracts";

import { TimeLimitedEntitlementService } from "./time-limited-entitlement.service.js";

describe("TimeLimitedEntitlementService", () => {
  const t0 = new Date("2026-09-22T08:00:00.000Z");

  it("creates a 7-day bonus entitlement with exact timestamps", () => {
    let clockTime = new Date(t0);
    const service = new TimeLimitedEntitlementService(() => clockTime);

    const entitlement = service.createLifetimeBonusEntitlement({
      ownerId: "user-1",
      chartId: "chart-1",
    });

    expect(entitlement.ownerId).toBe("user-1");
    expect(entitlement.chartId).toBe("chart-1");
    expect(entitlement.scope).toBe("daily_reading");
    expect(entitlement.source).toBe("lifetime_reading_bonus");
    expect(entitlement.validFrom).toBe("2026-09-22T08:00:00.000Z");
    expect(entitlement.expiresAt).toBe("2026-09-29T08:00:00.000Z");
  });

  describe("frozen / injected clock lifecycle & day-8 expiry tests", () => {
    it("day 1 (grant + 1 hour): active and evaluates with remaining time", () => {
      let currentClock = new Date("2026-09-22T09:00:00.000Z");
      const service = new TimeLimitedEntitlementService(() => currentClock);

      const entitlement = service.createLifetimeBonusEntitlement({
        ownerId: "user-1",
        chartId: "chart-1",
        grantedAt: t0,
      });

      expect(service.isActive(entitlement)).toBe(true);

      const access = service.evaluateAccess(entitlement);
      expect(access.hasAccess).toBe(true);
      expect(access.status).toBe("active");
      expect(access.remainingMs).toBe((7 * 24 - 1) * 3600 * 1000);
    });

    it("day 3 (midway): active", () => {
      let currentClock = new Date("2026-09-25T08:00:00.000Z");
      const service = new TimeLimitedEntitlementService(() => currentClock);

      const entitlement = service.createLifetimeBonusEntitlement({
        ownerId: "user-1",
        chartId: "chart-1",
        grantedAt: t0,
      });

      expect(service.isActive(entitlement)).toBe(true);

      const access = service.evaluateAccess(entitlement);
      expect(access.hasAccess).toBe(true);
      expect(access.status).toBe("active");
    });

    it("day 7 (1 millisecond before expiry): active", () => {
      let currentClock = new Date("2026-09-29T07:59:59.999Z");
      const service = new TimeLimitedEntitlementService(() => currentClock);

      const entitlement = service.createLifetimeBonusEntitlement({
        ownerId: "user-1",
        chartId: "chart-1",
        grantedAt: t0,
      });

      expect(service.isActive(entitlement)).toBe(true);

      const access = service.evaluateAccess(entitlement);
      expect(access.hasAccess).toBe(true);
      expect(access.status).toBe("active");
      expect(access.remainingMs).toBe(1);
    });

    it("day 8 (exact expiry boundary): EXPIRED", () => {
      let currentClock = new Date("2026-09-29T08:00:00.000Z"); // Day 8 start
      const service = new TimeLimitedEntitlementService(() => currentClock);

      const entitlement = service.createLifetimeBonusEntitlement({
        ownerId: "user-1",
        chartId: "chart-1",
        grantedAt: t0,
      });

      expect(service.isActive(entitlement)).toBe(false);

      const access = service.evaluateAccess(entitlement);
      expect(access.hasAccess).toBe(false);
      expect(access.status).toBe("expired");
      expect(access.remainingMs).toBe(0);
    });

    it("day 8 (hours after boundary): EXPIRED", () => {
      let currentClock = new Date("2026-09-29T14:30:00.000Z");
      const service = new TimeLimitedEntitlementService(() => currentClock);

      const entitlement = service.createLifetimeBonusEntitlement({
        ownerId: "user-1",
        chartId: "chart-1",
        grantedAt: t0,
      });

      expect(service.isActive(entitlement)).toBe(false);

      const assertion = service.assertAccess(entitlement);
      expect(assertion.ok).toBe(false);
      if (!assertion.ok) {
        expect(assertion.error.code).toBe("ENTITLEMENT_EXPIRED");
      }
    });

    it("day 14: EXPIRED", () => {
      let currentClock = new Date("2026-10-06T08:00:00.000Z");
      const service = new TimeLimitedEntitlementService(() => currentClock);

      const entitlement = service.createLifetimeBonusEntitlement({
        ownerId: "user-1",
        chartId: "chart-1",
        grantedAt: t0,
      });

      expect(service.isActive(entitlement)).toBe(false);
    });
  });

  describe("precise adapter / blocker without catalog coupling", () => {
    it("reports catalog blocker when no entitlement is found, without inventing SKU activation", () => {
      const service = new TimeLimitedEntitlementService(() => new Date());

      const evaluation = service.evaluateAccess(null);
      expect(evaluation.hasAccess).toBe(false);
      expect(evaluation.status).toBe("catalog_blocked");
      expect(evaluation.blockerMessage).toBe(
        DAILY_READING_CATALOG_BLOCKER_MESSAGE,
      );

      const assertion = service.assertAccess(null);
      expect(assertion.ok).toBe(false);
      if (!assertion.ok) {
        expect(assertion.error.code).toBe("CATALOG_SKU_BLOCKED");
        expect(assertion.error.blockerMessage).toBe(
          DAILY_READING_CATALOG_BLOCKER_MESSAGE,
        );
      }
    });
  });
});
