import { describe, expect, it } from "vitest";
import {
  getVietnamCalendarDayBounds,
  parseTransferredAtLocal,
} from "./payment-claim-time.js";

describe("payment-claim-time", () => {
  it("converts a known Vietnam local minute to the correct UTC instant and exposes inclusive plus/minus 15-minute bounds", () => {
    // 2026-09-05 14:30 in Vietnam (+07:00) is 2026-09-05 07:30 UTC
    const parsed = parseTransferredAtLocal("2026-09-05T14:30");
    expect(parsed.utcInstant.toISOString()).toBe("2026-09-05T07:30:00.000Z");
    expect(parsed.windowStart.toISOString()).toBe("2026-09-05T07:15:00.000Z");
    expect(parsed.windowEnd.toISOString()).toBe("2026-09-05T07:45:00.000Z");

    // Exactly 15 minutes before and after
    expect(parsed.windowStart.getTime()).toBe(parsed.utcInstant.getTime() - 15 * 60 * 1000);
    expect(parsed.windowEnd.getTime()).toBe(parsed.utcInstant.getTime() + 15 * 60 * 1000);
  });

  it("handles day transitions when UTC instant falls on the previous calendar day", () => {
    // 2026-09-05 03:00 in Vietnam (+07:00) is 2026-09-04 20:00 UTC
    const parsed = parseTransferredAtLocal("2026-09-05T03:00");
    expect(parsed.utcInstant.toISOString()).toBe("2026-09-04T20:00:00.000Z");
    expect(parsed.windowStart.toISOString()).toBe("2026-09-04T19:45:00.000Z");
    expect(parsed.windowEnd.toISOString()).toBe("2026-09-04T20:15:00.000Z");
  });

  it("rejects invalid formats including seconds and timezone offsets", () => {
    expect(() => parseTransferredAtLocal("2026-09-05T14:30:00")).toThrow();
    expect(() => parseTransferredAtLocal("2026-09-05T14:30Z")).toThrow();
    expect(() => parseTransferredAtLocal("2026-09-05T14:30+07:00")).toThrow();
    expect(() => parseTransferredAtLocal("2026/09/05 14:30")).toThrow();
    expect(() => parseTransferredAtLocal("not-a-date")).toThrow();
  });

  it("rejects impossible or normalized-over dates", () => {
    // February 30
    expect(() => parseTransferredAtLocal("2026-02-30T10:00")).toThrow();
    // Non-leap year February 29
    expect(() => parseTransferredAtLocal("2025-02-29T10:00")).toThrow();
    // Valid leap year February 29 succeeds
    expect(parseTransferredAtLocal("2024-02-29T10:00").utcInstant.toISOString()).toBe("2024-02-29T03:00:00.000Z");
    // April 31
    expect(() => parseTransferredAtLocal("2026-04-31T10:00")).toThrow();
    // Month 13
    expect(() => parseTransferredAtLocal("2026-13-01T10:00")).toThrow();
    // Hour 24
    expect(() => parseTransferredAtLocal("2026-09-05T24:00")).toThrow();
    // Minute 60
    expect(() => parseTransferredAtLocal("2026-09-05T14:60")).toThrow();
  });

  it("computes Vietnam calendar-day bounds correctly across UTC midnight boundaries", () => {
    // Case 1: 18:00 UTC on 2026-09-05 is 01:00 on 2026-09-06 in Vietnam
    const t1 = new Date("2026-09-05T18:00:00.000Z");
    const bounds1 = getVietnamCalendarDayBounds(t1);
    expect(bounds1.localDateKey).toBe("2026-09-06");
    expect(bounds1.startUtc.toISOString()).toBe("2026-09-05T17:00:00.000Z");
    expect(bounds1.nextDayStartUtc.toISOString()).toBe("2026-09-06T17:00:00.000Z");
    expect(bounds1.endUtc.toISOString()).toBe("2026-09-06T16:59:59.999Z");

    // Case 2: 02:00 UTC on 2026-09-05 is 09:00 on 2026-09-05 in Vietnam
    const t2 = new Date("2026-09-05T02:00:00.000Z");
    const bounds2 = getVietnamCalendarDayBounds(t2);
    expect(bounds2.localDateKey).toBe("2026-09-05");
    expect(bounds2.startUtc.toISOString()).toBe("2026-09-04T17:00:00.000Z");
    expect(bounds2.nextDayStartUtc.toISOString()).toBe("2026-09-05T17:00:00.000Z");
    expect(bounds2.endUtc.toISOString()).toBe("2026-09-05T16:59:59.999Z");
  });
});
