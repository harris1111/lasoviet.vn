import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMaintenanceRunner,
  createPdfRenderRunner,
  createReportGenerateRunner,
} from "./worker.module.js";
import {
  createAiProductionGate,
  createReportGenerationService,
} from "@lasoviet/backend";

vi.mock("@lasoviet/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lasoviet/backend")>();
  return {
    ...actual,
    createReportGenerationService: vi.fn(actual.createReportGenerationService),
  };
});

const mockedCreateReportGenerationService = vi.mocked(createReportGenerationService);

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
    process.env.BETTER_AUTH_URL = "https://lasoviet.net";
    process.env.INTERNAL_ACTOR_SECRET = "test-internal-secret";
    delete process.env.DATABASE_URL;

    expect(() => createReportGenerateRunner()).toThrow("WORKER_CONFIG_INVALID");
  });

  it.each([
    ["BETTER_AUTH_URL", "INTERNAL_ACTOR_SECRET"],
    ["INTERNAL_ACTOR_SECRET", "BETTER_AUTH_URL"],
  ])("throws WORKER_CONFIG_INVALID when approved but %s is missing", (missing, present) => {
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
    process.env[present] =
      present === "BETTER_AUTH_URL"
        ? "https://lasoviet.net"
        : "test-internal-secret";
    delete process.env[missing];

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
    process.env.BETTER_AUTH_URL = "https://lasoviet.net";
    process.env.INTERNAL_ACTOR_SECRET = "test-internal-secret";

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
    process.env.BETTER_AUTH_URL = "https://lasoviet.net";
    process.env.INTERNAL_ACTOR_SECRET = "test-internal-secret";

    const runner = createReportGenerateRunner();
    expect(runner).toBeDefined();
    expect(typeof runner.runOnce).toBe("function");
  });

  it("supplies a database section checkpoint repository to default active generation wiring", () => {
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
    process.env.BETTER_AUTH_URL = "https://lasoviet.net";
    process.env.INTERNAL_ACTOR_SECRET = "test-internal-secret";

    mockedCreateReportGenerationService.mockClear();
    createReportGenerateRunner();

    expect(mockedCreateReportGenerationService).toHaveBeenCalledTimes(1);
    const [{ sectionCheckpointRepository }] =
      mockedCreateReportGenerationService.mock.calls[0]!;
    expect(sectionCheckpointRepository).toEqual(expect.objectContaining({
      get: expect.any(Function),
      listPassed: expect.any(Function),
      claim: expect.any(Function),
      markPassed: expect.any(Function),
    }));
  });
  it("initializes runner with injected alertDispatcher and telegramAlert options", () => {
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
    process.env.BETTER_AUTH_URL = "https://lasoviet.net";
    process.env.INTERNAL_ACTOR_SECRET = "test-internal-secret";

    const mockDispatcher = {
      dispatchPendingAlerts: vi.fn().mockResolvedValue({ delivered: 1, failed: 0, unconfigured: false }),
    };
    const mockTelegram = {
      isConfigured: () => true,
      sendStalePaymentAlert: vi.fn(),
      sendCircuitOpenAlert: vi.fn(),
      sendReportTerminalFailureAlert: vi.fn(),
    };

    const runner = createReportGenerateRunner({
      alertDispatcher: mockDispatcher,
      telegramAlert: mockTelegram,
    });
    expect(runner).toBeDefined();
    expect(typeof runner.runOnce).toBe("function");
  });

  it("initializes runner with custom costRecorder option", () => {
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
    process.env.BETTER_AUTH_URL = "https://lasoviet.net";
    process.env.INTERNAL_ACTOR_SECRET = "test-internal-secret";

    const mockRecorder = {
      beginAttempt: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          attemptId: "1",
          pricing: {
            pricingVersion: "v1",
            providerId: "9router-an",
            modelId: "test-model",
            currency: "VND" as const,
            inputPricePerMillion: 15000,
            outputPricePerMillion: 60000,
            cachedInputPricePerMillion: 3750,
            effectiveFrom: new Date(),
            source: "test",
            sourceCurrency: "VND",
            sourceReference: "test",
            fxSource: "direct_vnd",
            fxRate: 1,
            fxTimestamp: new Date(),
            referenceMetadata: {},
            status: "active" as const,
          },
        },
      }),
      completeAttempt: vi.fn().mockResolvedValue({
        ok: true,
        value: { outcomeId: "1", costVnd: 0, costStatus: "resolved" as const },
      }),
    };

    const runner = createReportGenerateRunner({
      costRecorder: mockRecorder,
    });
    expect(runner).toBeDefined();
    expect(typeof runner.runOnce).toBe("function");
  });
});

describe("createMaintenanceRunner", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      NODE_ENV: "test",
      SEPAY_ENV: "disabled",
      DATABASE_URL: "postgresql://lasoviet:lasoviet@localhost:5432/lasoviet_test",
      BETTER_AUTH_URL: "https://lasoviet.net",
      INTERNAL_ACTOR_SECRET: "test-internal-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws WORKER_CONFIG_INVALID when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => createMaintenanceRunner()).toThrow("WORKER_CONFIG_INVALID");
  });

  it("initializes runner successfully with analytics retention wired", () => {
    const runner = createMaintenanceRunner();
    expect(runner).toBeDefined();
    expect(typeof runner.runOnce).toBe("function");
  });
});

describe("createPdfRenderRunner", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      NODE_ENV: "test",
      SEPAY_ENV: "disabled",
      WORKER_QUEUES: "pdf.render",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("is fail-closed when the isolated PDF queue is not configured", async () => {
    process.env.WORKER_QUEUES = "report.generate";
    await expect(createPdfRenderRunner().runOnce()).resolves.toEqual({ processed: 0 });
  });

  it("is fail-closed when Garage is disabled", async () => {
    await expect(createPdfRenderRunner().runOnce()).resolves.toEqual({ processed: 0 });
  });

  it("wires a real Garage adapter by default when the PDF queue is enabled", () => {
    process.env.GARAGE_PDF_ENABLED = "true";
    process.env.GARAGE_ENDPOINT = "http://garage:3900";
    process.env.GARAGE_REGION = "lasoviet-private";
    process.env.GARAGE_BUCKET = "lasoviet-report-assets";
    process.env.GARAGE_ACCESS_KEY_ID = "test-access-key";
    process.env.GARAGE_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.GARAGE_RPC_SECRET = "a".repeat(64);
    process.env.DATABASE_URL = "postgresql://lasoviet:lasoviet@localhost:5432/lasoviet_test";
    process.env.BETTER_AUTH_URL = "https://lasoviet.net";
    process.env.INTERNAL_ACTOR_SECRET = "test-internal-secret";

    const runner = createPdfRenderRunner();
    expect(typeof runner.runOnce).toBe("function");
  });
});
