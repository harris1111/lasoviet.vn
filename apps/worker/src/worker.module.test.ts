import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReportGenerateRunner } from "./worker.module.js";
import { createAiProductionGate } from "@lasoviet/backend";

describe("createReportGenerateRunner", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      NODE_ENV: "test",
      SEPAY_ENV: "disabled",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns no-op runner when WORKER_QUEUES does not include report.generate", async () => {
    process.env.WORKER_QUEUES = "maintenance,outbox";
    const runner = createReportGenerateRunner();
    const result = await runner.runOnce();
    expect(result).toEqual({ processed: 0 });
  });

  it("returns no-op runner when queue is present but AI is disabled in environment", async () => {
    process.env.WORKER_QUEUES = "report.generate";
    // AI variables omitted -> AI disabled
    const runner = createReportGenerateRunner();
    const result = await runner.runOnce();
    expect(result).toEqual({ processed: 0 });
  });

  it("returns no-op runner when queue is present and AI variables are omitted even if SEPAY_ENV is missing", async () => {
    process.env.WORKER_QUEUES = "report.generate";
    delete process.env.SEPAY_ENV;
    const runner = createReportGenerateRunner();
    const result = await runner.runOnce();
    expect(result).toEqual({ processed: 0 });
  });

  it("returns no-op runner when queue is present and AI is configured but AI_PRODUCTION_ENABLED is false", async () => {
    process.env.WORKER_QUEUES = "report.generate";
    process.env.AI_BASE_URL = "https://synthetic-ai.test";
    process.env.AI_API_KEY = "test-key-never-leak";
    process.env.AI_MODEL = "test-model";
    process.env.AI_TIMEOUT = "3000";
    process.env.AI_MAX_RETRIES = "2";
    process.env.AI_FEATURE_JSON_SCHEMA = "true";
    process.env.AI_FEATURE_TOOL_CALLING = "false";
    process.env.AI_PRODUCTION_ENABLED = "false";

    const runner = createReportGenerateRunner();
    const result = await runner.runOnce();
    expect(result).toEqual({ processed: 0 });
  });

  it("returns no-op runner when injected gate denies production report generation", async () => {
    process.env.WORKER_QUEUES = "report.generate";
    process.env.AI_BASE_URL = "https://synthetic-ai.test";
    process.env.AI_API_KEY = "test-key-never-leak";
    process.env.AI_MODEL = "test-model";
    process.env.AI_TIMEOUT = "3000";
    process.env.AI_MAX_RETRIES = "2";
    process.env.AI_FEATURE_JSON_SCHEMA = "true";
    process.env.AI_FEATURE_TOOL_CALLING = "false";
    process.env.AI_PRODUCTION_ENABLED = "true";

    const deniedGate = createAiProductionGate("pending");
    const runner = createReportGenerateRunner({ gate: deniedGate });
    const result = await runner.runOnce();
    expect(result).toEqual({ processed: 0 });
  });

  it("throws WORKER_CONFIG_INVALID when AI_PRODUCTION_ENABLED is true but AI_FEATURE_JSON_SCHEMA is false", () => {
    process.env.WORKER_QUEUES = "report.generate";
    process.env.AI_BASE_URL = "https://synthetic-ai.test";
    process.env.AI_API_KEY = "test-key-never-leak";
    process.env.AI_MODEL = "test-model";
    process.env.AI_TIMEOUT = "3000";
    process.env.AI_MAX_RETRIES = "2";
    process.env.AI_FEATURE_JSON_SCHEMA = "false";
    process.env.AI_FEATURE_TOOL_CALLING = "false";
    process.env.AI_PRODUCTION_ENABLED = "true";

    expect(() => createReportGenerateRunner()).toThrow("WORKER_CONFIG_INVALID");
  });

  it("throws WORKER_CONFIG_INVALID when approved but DATABASE_URL is missing", () => {
    process.env.WORKER_QUEUES = "report.generate";
    process.env.AI_BASE_URL = "https://synthetic-ai.test";
    process.env.AI_API_KEY = "test-key-never-leak";
    process.env.AI_MODEL = "test-model";
    process.env.AI_TIMEOUT = "3000";
    process.env.AI_MAX_RETRIES = "2";
    process.env.AI_FEATURE_JSON_SCHEMA = "true";
    process.env.AI_FEATURE_TOOL_CALLING = "false";
    process.env.AI_PRODUCTION_ENABLED = "true";
    delete process.env.DATABASE_URL;

    expect(() => createReportGenerateRunner()).toThrow("WORKER_CONFIG_INVALID");
  });

  it("redacts secret and config values from errors", () => {
    process.env.WORKER_QUEUES = "report.generate";
    const secretKey = "super-secret-key-that-must-not-appear";
    process.env.AI_BASE_URL = "https://synthetic-ai.test";
    process.env.AI_API_KEY = secretKey;
    process.env.AI_MODEL = "test-model";
    process.env.AI_TIMEOUT = "invalid-timeout";
    process.env.AI_MAX_RETRIES = "2";
    process.env.AI_FEATURE_JSON_SCHEMA = "true";
    process.env.AI_FEATURE_TOOL_CALLING = "false";
    process.env.AI_PRODUCTION_ENABLED = "true";

    let errorThrown: unknown;
    try {
      createReportGenerateRunner();
    } catch (error) {
      errorThrown = error;
    }
    expect(errorThrown).toBeInstanceOf(Error);
    const message = (errorThrown as Error).message;
    expect(message).toBe("WORKER_CONFIG_INVALID");
    expect(message).not.toContain(secretKey);
  });
  it("initializes runner with approved gate and injected provider when AI is enabled and active", () => {
    process.env.WORKER_QUEUES = "report.generate";
    process.env.AI_BASE_URL = "https://synthetic-ai.test";
    process.env.AI_API_KEY = "test-key-never-leak";
    process.env.AI_MODEL = "test-model";
    process.env.AI_TIMEOUT = "3000";
    process.env.AI_MAX_RETRIES = "2";
    process.env.AI_FEATURE_JSON_SCHEMA = "true";
    process.env.AI_FEATURE_TOOL_CALLING = "false";
    process.env.AI_PRODUCTION_ENABLED = "true";
    process.env.DATABASE_URL = "https://synthetic-db.test/db";

    const mockProvider = {
      generateStructured: vi.fn(),
    };
    const runner = createReportGenerateRunner({ provider: mockProvider });
    expect(runner).toBeDefined();
    expect(typeof runner.runOnce).toBe("function");
  });

  it("initializes default runner wiring with openAi adapter when AI is enabled and active without options", () => {
    process.env.WORKER_QUEUES = "report.generate";
    process.env.AI_BASE_URL = "https://synthetic-ai.test";
    process.env.AI_API_KEY = "test-key-never-leak";
    process.env.AI_MODEL = "test-model";
    process.env.AI_TIMEOUT = "3000";
    process.env.AI_MAX_RETRIES = "2";
    process.env.AI_FEATURE_JSON_SCHEMA = "true";
    process.env.AI_FEATURE_TOOL_CALLING = "false";
    process.env.AI_PRODUCTION_ENABLED = "true";
    process.env.DATABASE_URL = "https://synthetic-db.test/db";

    const runner = createReportGenerateRunner();
    expect(runner).toBeDefined();
    expect(typeof runner.runOnce).toBe("function");
  });
});