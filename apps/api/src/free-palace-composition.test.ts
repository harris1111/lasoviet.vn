import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadEnvironment } from "@lasoviet/config";
import type { Database } from "@lasoviet/database";
import * as backend from "@lasoviet/backend";

vi.mock("@lasoviet/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lasoviet/backend")>();
  return {
    ...actual,
    createFreePalaceRequestService: vi.fn(() => ({ request: vi.fn(async () => ({ kind: "skipped", reason: "unproven_bound" })) })),
    createFreePalaceReadService: vi.fn(actual.createFreePalaceReadService),
    createFreePalaceWriter: vi.fn(actual.createFreePalaceWriter),
    createFreePalaceRunner: vi.fn(actual.createFreePalaceRunner),
    createOpenAiCompatibleAdapter: vi.fn(actual.createOpenAiCompatibleAdapter),
    createFreeAiDispatchService: vi.fn(actual.createFreeAiDispatchService),
  };
});
import { NO_REVIEWED_TOKEN_BOUND_PROOF, composeFreePalaceForApi } from "./free-palace-composition.js";

const ai = {
  AI_BASE_URL: "https://ai.synthetic.test/v1", AI_API_KEY: "not-a-real-secret", AI_MODEL: "gift-model", AI_ALLOWED_RESOLVED_MODELS: "gift-model",
  AI_TIMEOUT: "3000", AI_MAX_RETRIES: "2", AI_FEATURE_JSON_SCHEMA: "true", AI_FEATURE_TOOL_CALLING: "false", AI_PRODUCTION_ENABLED: "true",
};
const database = {} as Database;
function environment(extra: Record<string, string> = {}) {
  const loaded = loadEnvironment({ NODE_ENV: "test", SEPAY_ENV: "disabled", DATABASE_URL: "postgres://u:p@127.0.0.1:1/none", ...extra });
  if (!loaded.ok) throw new Error(`fixture environment invalid: ${JSON.stringify(loaded.error)}`);
  return loaded.value;
}
const never = () => {
  for (const spy of [backend.createFreePalaceWriter, backend.createFreePalaceRunner, backend.createOpenAiCompatibleAdapter, backend.createFreeAiDispatchService]) expect(spy).not.toHaveBeenCalled();
};

describe("free palace API composition (fail closed)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flag off: no request hook at all, but the cache reader stays available", () => {
    const composition = composeFreePalaceForApi(environment(ai), database);
    expect(composition.onChartReady).toBeUndefined();
    expect(composition.onChartReadyError).toBeUndefined();
    expect(composition.reader).toBeDefined();
    expect(backend.createFreePalaceRequestService).not.toHaveBeenCalled();
    never();
  });

  it("no database or an explicit false flag builds nothing that can request", () => {
    expect(composeFreePalaceForApi(environment({ ...ai, FREE_PALACE_GENERATION_ENABLED: "true" }), undefined)).toEqual({});
    expect(composeFreePalaceForApi(environment({ ...ai, FREE_PALACE_GENERATION_ENABLED: "false" }), database).onChartReady).toBeUndefined();
    expect(backend.createFreePalaceRequestService).not.toHaveBeenCalled();
  });

  it("flag on without approved production AI is rejected by the validated environment and never composes a hook", () => {
    expect(loadEnvironment({ NODE_ENV: "test", SEPAY_ENV: "disabled", FREE_PALACE_GENERATION_ENABLED: "true" }).ok).toBe(false);
    expect(loadEnvironment({ NODE_ENV: "test", SEPAY_ENV: "disabled", FREE_PALACE_GENERATION_ENABLED: "true", ...ai, AI_PRODUCTION_ENABLED: "false" }).ok).toBe(false);
    expect(loadEnvironment({ NODE_ENV: "test", SEPAY_ENV: "disabled", FREE_PALACE_GENERATION_ENABLED: "banana", ...ai }).ok).toBe(false);
  });

  it("flag on with approved AI reaches the shared request path, supplies no token-bound proof, and builds no writer or provider", async () => {
    const composition = composeFreePalaceForApi(environment({ ...ai, FREE_PALACE_GENERATION_ENABLED: "true" }), database);
    expect(composition.onChartReady).toBeDefined();
    const options = vi.mocked(backend.createFreePalaceRequestService).mock.calls[0]![0];
    expect(options.flagEnabled()).toBe(true);
    expect(options.model).toBe("gift-model");
    expect(options.boundProofFor({ serializedRequest: "x", maxOutputTokens: 1 })).toBeNull();
    expect(options.boundProofFor).toBe(NO_REVIEWED_TOKEN_BOUND_PROOF);
    expect(options.isTrustedGuest).toBeUndefined();
    const actor = { kind: "account", userId: "u", sessionId: "s", requestId: "r", emailVerified: true } as const;
    await composition.onChartReady!(actor, { chartId: "chart-1" });
    const request = vi.mocked(backend.createFreePalaceRequestService).mock.results[0]!.value.request;
    expect(request).toHaveBeenCalledWith(actor, "chart-1");
    never();
  });

  it("the reader's current lineage key follows the configured provider and model, and is unknown without them", () => {
    const withAi = composeFreePalaceForApi(environment(ai), database);
    expect(withAi.reader).toBeDefined();
    const readerOptions = vi.mocked(backend.createFreePalaceReadService).mock.calls[0]![0];
    const slot = { chartVersionId: "cv", palaceId: "ziwei.palace.life", locale: "vi" as const };
    expect(readerOptions.currentLineageHash(slot)).toBe(backend.currentFreePalaceLineageHash("9router-an", "gift-model")(slot));
    vi.clearAllMocks();
    composeFreePalaceForApi(environment({}), database);
    expect(vi.mocked(backend.createFreePalaceReadService).mock.calls[0]![0].currentLineageHash(slot)).toBeNull();
  });

  it("the hook error reporter logs a name only, never a message or payload", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const composition = composeFreePalaceForApi(environment({ ...ai, FREE_PALACE_GENERATION_ENABLED: "true" }), database);
    composition.onChartReadyError!(new Error("BIRTH-DATA-1990 secret message"));
    expect(spy).toHaveBeenCalledWith("FREE_PALACE_REQUEST_FAILED", "Error");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("BIRTH-DATA");
    spy.mockRestore();
  });
});
