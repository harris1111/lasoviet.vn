import { describe, expect, it, vi } from "vitest";
import { createFreePalaceRunner, type FreePalaceRunnerDependencies } from "./free-palace-runner.js";

function fakes(over: { claim?: () => Promise<unknown>; dispatch?: () => Promise<unknown>; flag?: () => boolean } = {}) {
  const store = {
    claim: vi.fn(over.claim ?? (async () => ({ id: "o1", eventId: "e1", traceId: "t", requestId: "r1" }))),
    markProcessed: vi.fn(async () => undefined), fail: vi.fn(async () => undefined), defer: vi.fn(async () => undefined),
  };
  const dispatch = { fence: vi.fn(), dispatch: vi.fn(over.dispatch ?? (async () => ({ kind: "already_fenced", status: "dispatching" }))) };
  const writer = { run: vi.fn() };
  const artifacts = { publish: vi.fn(), closeStalePublications: vi.fn(), purgeExpiredPayloads: vi.fn() };
  const deps = {
    store, dispatch, writer, artifacts, flagEnabled: over.flag ?? (() => true), isSourceAvailable: async () => true, activePricingSnapshotId: async () => "p", limit: 1,
  } as unknown as FreePalaceRunnerDependencies;
  return { deps, store, dispatch, writer, artifacts };
}

describe("free palace runner", () => {
  it("claims nothing while the flag is off", async () => {
    const f = fakes({ flag: () => false });
    expect(await createFreePalaceRunner(f.deps).runOnce()).toEqual({ processed: 0 });
    expect(f.store.claim).not.toHaveBeenCalled();
  });
  it("parks a malformed event and never dispatches it", async () => {
    const f = fakes({ claim: async () => ({ id: "o1", eventId: "e", traceId: "t", requestId: null }) });
    await createFreePalaceRunner(f.deps).runOnce();
    expect(f.store.fail).toHaveBeenCalledWith("o1", "FREE_PALACE_EVENT_INVALID");
    expect(f.dispatch.dispatch).not.toHaveBeenCalled();
  });
  it("treats an already-fenced request as done and never calls the writer", async () => {
    const f = fakes();
    await createFreePalaceRunner(f.deps).runOnce();
    expect(f.store.markProcessed).toHaveBeenCalledWith("o1");
    expect(f.writer.run).not.toHaveBeenCalled();
  });
  it("defers when dispatch is halted and when the runner itself errors", async () => {
    const halted = fakes({ dispatch: async () => ({ kind: "dispatch_halted" }) });
    await createFreePalaceRunner(halted.deps).runOnce();
    expect(halted.store.defer).toHaveBeenCalledWith("o1", "FREE_PALACE_DISPATCH_HALTED", expect.any(Number));
    const broken = fakes({ dispatch: async () => { throw new Error("db down"); } });
    await createFreePalaceRunner(broken.deps).runOnce();
    expect(broken.store.defer).toHaveBeenCalledWith("o1", "FREE_PALACE_RUNNER_ERROR", expect.any(Number));
    expect(broken.store.markProcessed).not.toHaveBeenCalled();
  });
  it("coalesces overlapping runs into one", async () => {
    const f = fakes();
    const runner = createFreePalaceRunner(f.deps);
    const [a, b] = await Promise.all([runner.runOnce(), runner.runOnce()]);
    expect(a).toBe(b);
    expect(f.store.claim).toHaveBeenCalledTimes(1);
  });
});
