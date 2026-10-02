import { describe, expect, it } from "vitest";

import {
  evaluateReturnVisit,
  SESSION_ACTIVE_KEY,
  LAST_VISIT_KEY,
  RETURN_COUNT_KEY,
} from "./return-visit-tracker";

function createMockStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
    clear: () => map.clear(),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe("return-visit-tracker", () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const t0 = new Date("2026-09-01T12:00:00Z").getTime();

  it("returns null on missing storage", () => {
    expect(evaluateReturnVisit(undefined, undefined, t0)).toBeNull();
  });

  it("initializes storage on first visit without emitting an event", () => {
    const local = createMockStorage();
    const session = createMockStorage();

    const result = evaluateReturnVisit(local, session, t0);
    expect(result).toBeNull();
    expect(local.getItem(LAST_VISIT_KEY)).toBe(String(t0));
    expect(local.getItem(RETURN_COUNT_KEY)).toBe("0");
    expect(session.getItem(SESSION_ACTIVE_KEY)).toBe("true");
  });

  it("does not emit return_visit on subsequent calls within the same active session", () => {
    const local = createMockStorage();
    const session = createMockStorage();

    // First visit
    evaluateReturnVisit(local, session, t0);

    // Same session, 5 minutes later
    const result = evaluateReturnVisit(local, session, t0 + 5 * 60 * 1000);
    expect(result).toBeNull();
  });

  it("emits return_visit in a new session with days elapsed and incremented return count", () => {
    const local = createMockStorage();
    let session = createMockStorage();

    // First visit at t0
    evaluateReturnVisit(local, session, t0);

    // New session 3 days later
    session = createMockStorage();
    const t1 = t0 + 3 * ONE_DAY_MS;
    const result1 = evaluateReturnVisit(local, session, t1);

    expect(result1).toEqual({
      days_since_last_visit: 3,
      return_count: 1,
    });
    expect(local.getItem(LAST_VISIT_KEY)).toBe(String(t1));
    expect(local.getItem(RETURN_COUNT_KEY)).toBe("1");

    // Third visit, new session 7 days after second visit
    session = createMockStorage();
    const t2 = t1 + 7 * ONE_DAY_MS;
    const result2 = evaluateReturnVisit(local, session, t2);

    expect(result2).toEqual({
      days_since_last_visit: 7,
      return_count: 2,
    });
    expect(local.getItem(LAST_VISIT_KEY)).toBe(String(t2));
    expect(local.getItem(RETURN_COUNT_KEY)).toBe("2");
  });

  it("handles same-day return in a new session (days = 0)", () => {
    const local = createMockStorage();
    let session = createMockStorage();

    // First visit
    evaluateReturnVisit(local, session, t0);

    // New session 2 hours later
    session = createMockStorage();
    const result = evaluateReturnVisit(local, session, t0 + 2 * 60 * 60 * 1000);

    expect(result).toEqual({
      days_since_last_visit: 0,
      return_count: 1,
    });
  });

  it("handles storage exceptions gracefully", () => {
    const brokenLocal: Storage = {
      ...createMockStorage(),
      getItem: () => {
        throw new Error("QuotaExceeded or SecurityError");
      },
    };
    const session = createMockStorage();
    expect(evaluateReturnVisit(brokenLocal, session, t0)).toBeNull();
  });
});
