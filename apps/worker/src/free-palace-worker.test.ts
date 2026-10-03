import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreePalaceGiftMaintenanceRunner,
  createFreePalaceGiftRunner,
} from "./worker.module.js";
import { executeWorkerPollingCycle } from "./health/worker-heartbeat.js";
import * as backend from "@lasoviet/backend";

vi.mock("@lasoviet/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lasoviet/backend")>();
  return {
    ...actual,
    createFreePalaceRunner: vi.fn(actual.createFreePalaceRunner),
    createFreePalaceWriter: vi.fn(actual.createFreePalaceWriter),
    createFreeAiDispatchService: vi.fn(actual.createFreeAiDispatchService),
    createOpenAiCompatibleAdapter: vi.fn(actual.createOpenAiCompatibleAdapter),
  };
});

const ai = {
  AI_BASE_URL: "https://synthetic-ai.test", AI_API_KEY: "test-key-never-leak", AI_MODEL: "test-model", AI_ALLOWED_RESOLVED_MODELS: "test-model",
  AI_TIMEOUT: "3000", AI_MAX_RETRIES: "2", AI_FEATURE_JSON_SCHEMA: "true", AI_FEATURE_TOOL_CALLING: "false", AI_PRODUCTION_ENABLED: "true",
};

describe("free palace worker composition (fail closed)", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { NODE_ENV: "test", SEPAY_ENV: "disabled", DATABASE_URL: "postgres://user:pass@127.0.0.1:1/none" };
    vi.clearAllMocks();
  });
  afterEach(() => { process.env = originalEnv; });
  const nothingConstructed = () => {
    expect(backend.createFreePalaceRunner).not.toHaveBeenCalled();
    expect(backend.createFreePalaceWriter).not.toHaveBeenCalled();
    expect(backend.createFreeAiDispatchService).not.toHaveBeenCalled();
    expect(backend.createOpenAiCompatibleAdapter).not.toHaveBeenCalled();
  };

  it("row 40: default-off startup constructs nothing that can dispatch", async () => {
    Object.assign(process.env, ai);
    expect(await createFreePalaceGiftRunner().runOnce()).toEqual({ processed: 0 });
    expect(await createFreePalaceGiftMaintenanceRunner().runOnce()).toEqual({ settled: 0, closed: 0, purged: 0 });
    nothingConstructed();
  });

  it("an explicit false flag is the same as absent", async () => {
    Object.assign(process.env, ai, { FREE_PALACE_GENERATION_ENABLED: "false" });
    expect(await createFreePalaceGiftRunner().runOnce()).toEqual({ processed: 0 });
    nothingConstructed();
  });

  it("row 41: flag on without approved production AI or config fails closed", async () => {
    for (const env of [{}, { ...ai, AI_PRODUCTION_ENABLED: "false" }, { ...ai, AI_FEATURE_JSON_SCHEMA: "false" }]) {
      process.env = { NODE_ENV: "test", SEPAY_ENV: "disabled", DATABASE_URL: "postgres://user:pass@127.0.0.1:1/none", FREE_PALACE_GENERATION_ENABLED: "true", ...env };
      expect(await createFreePalaceGiftRunner().runOnce()).toEqual({ processed: 0 });
    }
    nothingConstructed();
  });

  it("a malformed flag value never enables generation", async () => {
    Object.assign(process.env, ai, { FREE_PALACE_GENERATION_ENABLED: "maybe" });
    expect(await createFreePalaceGiftRunner().runOnce()).toEqual({ processed: 0 });
    nothingConstructed();
  });

  it("flag on with complete config builds the gift adapter with zero retries, never the paid retry count", () => {
    Object.assign(process.env, ai, { FREE_PALACE_GENERATION_ENABLED: "true" });
    createFreePalaceGiftRunner();
    expect(backend.createFreePalaceRunner).toHaveBeenCalledTimes(1);
    // the writer builds its provider lazily per call; inspect the factory it was given
    const writerDeps = vi.mocked(backend.createFreePalaceWriter).mock.calls[0]![0];
    expect(writerDeps.expected).toEqual({ provider: expect.any(String), model: "test-model" });
    writerDeps.createProvider({ beginAttempt: vi.fn(), completeAttempt: vi.fn() } as never);
    const adapterOptions = vi.mocked(backend.createOpenAiCompatibleAdapter).mock.calls[0]![0];
    expect(adapterOptions.retryCount).toBe(0);
    expect(process.env.AI_MAX_RETRIES).toBe("2");
  });

  it("row 42: the polling cycle runs the gift runner alongside the paid ones and keeps the heartbeat rule", async () => {
    const calls: string[] = [];
    const base = {
      runOutbox: async () => { calls.push("outbox"); }, runReport: async () => { calls.push("report"); }, runPdf: async () => { calls.push("pdf"); },
      writeHeartbeat: vi.fn(async () => undefined),
    };
    expect(await executeWorkerPollingCycle({ ...base, runGift: async () => { calls.push("gift"); } })).toBe(true);
    expect(calls.sort()).toEqual(["gift", "outbox", "pdf", "report"]);
    expect(base.writeHeartbeat).toHaveBeenCalledTimes(1);
    // omitting the gift runner keeps existing callers valid
    expect(await executeWorkerPollingCycle(base)).toBe(true);
    const onGiftError = vi.fn();
    expect(await executeWorkerPollingCycle({ ...base, runGift: async () => { throw new Error("boom"); }, onGiftError })).toBe(false);
    expect(onGiftError).toHaveBeenCalledTimes(1);
    expect(base.writeHeartbeat).toHaveBeenCalledTimes(2);
  });
});
