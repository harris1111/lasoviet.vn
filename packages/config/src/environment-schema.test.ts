import { describe, expect, it } from "vitest";
import { AppEnvironmentSchema, loadEnvironment } from "./index.js";

const productionBase = {
  NODE_ENV: "production",
  INTERNAL_ACTOR_SECRET: "synthetic-actor-secret-never-serialize",
  DATABASE_URL: "https://synthetic-database-url-never-serialize.test/db",
  REDIS_URL: "https://synthetic-redis-url-never-serialize.test",
} as const;

const completeAi = {
  AI_BASE_URL: "https://synthetic-ai-url-never-serialize.test",
  AI_API_KEY: "synthetic-ai-key-never-serialize",
  AI_MODEL: "synthetic-model",
  AI_TIMEOUT: "2500",
  AI_MAX_RETRIES: "2",
  AI_FEATURE_JSON_SCHEMA: "true",
  AI_FEATURE_TOOL_CALLING: "false",
} as const;

const completeSmtp = {
  SMTP_HOST: "synthetic-smtp-host",
  SMTP_PORT: "587",
  SMTP_USERNAME: "synthetic-smtp-user",
  SMTP_PASSWORD: "synthetic-smtp-password-never-serialize",
  SMTP_FROM_DOMAIN: "synthetic-mail.test",
  SMTP_FROM_ADDRESS: "noreply@synthetic-mail.test",
} as const;

const completeS3 = {
  CLOUD_S3_ENDPOINT: "https://synthetic-s3-url-never-serialize.test",
  CLOUD_S3_REGION: "synthetic-region",
  CLOUD_S3_BUCKET: "synthetic-bucket",
  CLOUD_S3_ACCESS_KEY_ID: "synthetic-access-key",
  CLOUD_S3_SECRET_ACCESS_KEY: "synthetic-s3-secret-never-serialize",
} as const;

const validNormalizedProduction = {
  nodeEnv: "production",
  internalActorSecret: "synthetic-actor-secret-never-serialize",
  databaseUrl: "https://synthetic-database-url-never-serialize.test/db",
  redisUrl: "https://synthetic-redis-url-never-serialize.test",
  ai: {
    enabled: true,
    baseUrl: "https://synthetic-ai-url-never-serialize.test",
    apiKey: "synthetic-ai-key-never-serialize",
    model: "synthetic-model",
    timeoutMs: 2500,
    maxRetries: 2,
    featureJsonSchema: true,
    featureToolCalling: false,
  },
  smtp: {
    enabled: true,
    host: "synthetic-smtp-host",
    port: 587,
    username: "synthetic-smtp-user",
    password: "synthetic-smtp-password-never-serialize",
    fromDomain: "synthetic-mail.test",
    fromAddress: "noreply@synthetic-mail.test",
  },
  cloudS3: {
    enabled: true,
    endpoint: "https://synthetic-s3-url-never-serialize.test",
    region: "synthetic-region",
    bucket: "synthetic-bucket",
    accessKeyId: "synthetic-access-key",
    secretAccessKey: "synthetic-s3-secret-never-serialize",
  },
} as const;

function expectInvalid(source: NodeJS.ProcessEnv, variable: string) {
  expect(loadEnvironment(source)).toEqual({
    ok: false,
    error: {
      code: "INVALID_ENV",
      messageKey: "environment.invalid",
      retryable: false,
      field: variable,
      details: { variable },
    },
  });
}

function expectPartial(
  source: NodeJS.ProcessEnv,
  group: "ai" | "smtp" | "cloudS3",
  variable: string,
) {
  expect(loadEnvironment(source)).toEqual({
    ok: false,
    error: {
      code: "PARTIAL_OPTIONAL_GROUP",
      messageKey: "environment.partialOptionalGroup",
      retryable: false,
      field: variable,
      details: { variable, group },
    },
  });
}

describe("environment loading", () => {
  it("loads production with disabled optional groups", () => {
    const result = loadEnvironment(productionBase);
    expect(result).toMatchObject({ ok: true, value: { nodeEnv: "production" } });
    if (result.ok) {
      expect(result.value.ai).toEqual({ enabled: false });
      expect(result.value.smtp).toEqual({ enabled: false });
      expect(result.value.cloudS3).toEqual({ enabled: false });
    }
  });

  it.each(["INTERNAL_ACTOR_SECRET", "DATABASE_URL", "REDIS_URL"])(
    "rejects production without %s",
    (variable) => {
      const source = { ...productionBase };
      delete source[variable as keyof typeof source];
      expect(loadEnvironment(source)).toMatchObject({
        ok: false,
        error: {
          code: "MISSING_REQUIRED_ENV",
          messageKey: "environment.missingRequired",
          retryable: false,
          field: variable,
          details: { variable },
        },
      });
    },
  );

  it("uses the explicit production database URL missing vector", () => {
    const { DATABASE_URL: _databaseUrl, ...productionWithoutDatabaseUrl } =
      productionBase;
    expect(loadEnvironment(productionWithoutDatabaseUrl)).toMatchObject({
      ok: false,
      error: {
        code: "MISSING_REQUIRED_ENV",
        field: "DATABASE_URL",
        messageKey: "environment.missingRequired",
        retryable: false,
      },
    });
  });

  it.each([
    ["NODE_ENV", { ...productionBase, NODE_ENV: "preview" }, "NODE_ENV"],
    ["DATABASE_URL", { ...productionBase, DATABASE_URL: "not-a-url" }, "DATABASE_URL"],
    ["INTERNAL_ACTOR_SECRET", { ...productionBase, INTERNAL_ACTOR_SECRET: "  " }, "INTERNAL_ACTOR_SECRET"],
  ] as const)(
    "rejects invalid base environment value %s",
    (_name, source, variable) => {
      expectInvalid(source, variable);
    },
  );

  it.each([
    ["AI_BASE_URL", { ...productionBase, ...completeAi, AI_BASE_URL: "/relative" }, "AI_BASE_URL"],
    ["AI_API_KEY", { ...productionBase, ...completeAi, AI_API_KEY: " " }, "AI_API_KEY"],
    ["AI_MODEL", { ...productionBase, ...completeAi, AI_MODEL: " " }, "AI_MODEL"],
    ["AI_TIMEOUT", { ...productionBase, ...completeAi, AI_TIMEOUT: "2.5" }, "AI_TIMEOUT"],
    ["AI_MAX_RETRIES", { ...productionBase, ...completeAi, AI_MAX_RETRIES: "-1" }, "AI_MAX_RETRIES"],
    [
      "AI_FEATURE_JSON_SCHEMA",
      { ...productionBase, ...completeAi, AI_FEATURE_JSON_SCHEMA: "yes" },
      "AI_FEATURE_JSON_SCHEMA",
    ],
    [
      "AI_FEATURE_TOOL_CALLING",
      { ...productionBase, ...completeAi, AI_FEATURE_TOOL_CALLING: "yes" },
      "AI_FEATURE_TOOL_CALLING",
    ],

    ["SMTP_HOST", { ...productionBase, ...completeSmtp, SMTP_HOST: " " }, "SMTP_HOST"],
    ["SMTP_PORT", { ...productionBase, ...completeSmtp, SMTP_PORT: "0" }, "SMTP_PORT"],
    ["SMTP_USERNAME", { ...productionBase, ...completeSmtp, SMTP_USERNAME: " " }, "SMTP_USERNAME"],
    ["SMTP_PASSWORD", { ...productionBase, ...completeSmtp, SMTP_PASSWORD: " " }, "SMTP_PASSWORD"],
    [
      "SMTP_FROM_DOMAIN",
      { ...productionBase, ...completeSmtp, SMTP_FROM_DOMAIN: " " },
      "SMTP_FROM_DOMAIN",
    ],
    [
      "SMTP_FROM_ADDRESS",
      { ...productionBase, ...completeSmtp, SMTP_FROM_ADDRESS: "invalid" },
      "SMTP_FROM_ADDRESS",
    ],

    [
      "CLOUD_S3_ENDPOINT",
      { ...productionBase, ...completeS3, CLOUD_S3_ENDPOINT: "/relative" },
      "CLOUD_S3_ENDPOINT",
    ],
    [
      "CLOUD_S3_REGION",
      { ...productionBase, ...completeS3, CLOUD_S3_REGION: " " },
      "CLOUD_S3_REGION",
    ],
    [
      "CLOUD_S3_BUCKET",
      { ...productionBase, ...completeS3, CLOUD_S3_BUCKET: " " },
      "CLOUD_S3_BUCKET",
    ],
    [
      "CLOUD_S3_ACCESS_KEY_ID",
      { ...productionBase, ...completeS3, CLOUD_S3_ACCESS_KEY_ID: " " },
      "CLOUD_S3_ACCESS_KEY_ID",
    ],
    [
      "CLOUD_S3_SECRET_ACCESS_KEY",
      { ...productionBase, ...completeS3, CLOUD_S3_SECRET_ACCESS_KEY: " " },
      "CLOUD_S3_SECRET_ACCESS_KEY",
    ],
  ] as const)(
    "maps invalid provider field %s to its raw variable",
    (_name, source, variable) => {
      expectInvalid(source, variable);
    },
  );

  it("rejects partial optional groups in declared order", () => {
    expectPartial({ ...productionBase, AI_BASE_URL: completeAi.AI_BASE_URL }, "ai", "AI_API_KEY");
    expectPartial({ ...productionBase, SMTP_HOST: completeSmtp.SMTP_HOST }, "smtp", "SMTP_PORT");
    expectPartial({ ...productionBase, CLOUD_S3_ENDPOINT: completeS3.CLOUD_S3_ENDPOINT }, "cloudS3", "CLOUD_S3_REGION");
  });

  it("normalizes each complete optional group to its enabled typed shape", () => {
    const result = loadEnvironment({
      ...productionBase,
      ...completeAi,
      ...completeSmtp,
      ...completeS3,
    });
    expect(result).toEqual({ ok: true, value: validNormalizedProduction });
  });

  it("redacts all supplied concrete values from validation errors", () => {
    const result = loadEnvironment({
      ...productionBase,
      ...completeAi,
      ...completeSmtp,
      ...completeS3,
      AI_TIMEOUT: "not-an-integer",
    });
    const serialized = JSON.stringify(result);
    expect(result).toMatchObject({
      ok: false,
      error: { field: "AI_TIMEOUT", details: { variable: "AI_TIMEOUT" } },
    });
    for (const value of [
      productionBase.INTERNAL_ACTOR_SECRET,
      productionBase.DATABASE_URL,
      productionBase.REDIS_URL,
      completeAi.AI_BASE_URL,
      completeAi.AI_API_KEY,
      completeSmtp.SMTP_PASSWORD,
      completeS3.CLOUD_S3_ENDPOINT,
      completeS3.CLOUD_S3_SECRET_ACCESS_KEY,
    ]) {
      expect(serialized).not.toContain(value);
    }
    expect(serialized).toContain("AI_TIMEOUT");
  });

});

describe("normalized environment schema", () => {
  it("accepts a complete normalized production object", () => {
    expect(AppEnvironmentSchema.parse(validNormalizedProduction)).toEqual(
      validNormalizedProduction,
    );
  });

  it.each([
    ["unknown property", { ...validNormalizedProduction, extra: true }],
    [
      "incomplete enabled provider",
      {
        ...validNormalizedProduction,
        ai: { ...validNormalizedProduction.ai, model: undefined },
      },
    ],
    [
      "missing production base field",
      (() => {
        const { databaseUrl: _databaseUrl, ...value } = validNormalizedProduction;
        return value;
      })(),
    ],
  ])("rejects %s", (_name, value) => {
    expect(() => AppEnvironmentSchema.parse(value)).toThrow();
  });
});
