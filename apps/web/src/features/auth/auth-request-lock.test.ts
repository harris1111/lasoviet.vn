import { describe, expect, it } from "vitest";

import { withAuthRequestLock } from "./auth-request-lock";

describe("withAuthRequestLock", () => {
  it("synchronously blocks a second call while the first call is pending", async () => {
    const lock = { current: false };
    let resolveFirst: (value: string) => void = () => {};
    const firstPromise = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });

    const call1Promise = withAuthRequestLock(lock, () => firstPromise);
    expect(lock.current).toBe(true);

    const call2Result = await withAuthRequestLock(lock, async () => "second");
    expect(call2Result).toEqual({ status: "blocked" });

    resolveFirst("first-done");
    const call1Result = await call1Promise;
    expect(call1Result).toEqual({ status: "fulfilled", value: "first-done" });
    expect(lock.current).toBe(false);
  });

  it("catches promise rejection, returns rejected status without throwing, and releases the lock", async () => {
    const lock = { current: false };
    const networkError = new Error("network error");

    const result = await withAuthRequestLock(lock, async () => {
      throw networkError;
    });

    expect(result).toEqual({ status: "rejected", error: networkError });
    expect(lock.current).toBe(false);
  });

  it("permits a subsequent retry after a rejected first call", async () => {
    const lock = { current: false };

    const firstResult = await withAuthRequestLock(lock, async () => {
      throw new Error("first attempt failed");
    });
    expect(firstResult.status).toBe("rejected");
    expect(lock.current).toBe(false);

    const retryResult = await withAuthRequestLock(lock, async () => "retry-success");
    expect(retryResult).toEqual({ status: "fulfilled", value: "retry-success" });
    expect(lock.current).toBe(false);
  });
});
