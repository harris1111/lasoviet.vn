import type { AppError, Result } from "@lasoviet/contracts";
import {
  AiEnvironmentSchema,
  AppEnvironmentSchema,
  CloudS3EnvironmentSchema,
  NodeEnvironmentSchema,
  SmtpEnvironmentSchema,
  SePayEnvironmentSchema,
  type AiEnvironment,
  type AppEnvironment,
  type CloudS3Environment,
  type NodeEnvironment,
  type SmtpEnvironment,
  type SePayEnvironment,
} from "./environment-schema.js";

export type EnvironmentErrorCode =
  | "MISSING_REQUIRED_ENV"
  | "INVALID_ENV"
  | "PARTIAL_OPTIONAL_GROUP";

export type EnvironmentLoadResult = Result<
  AppEnvironment,
  EnvironmentErrorCode
>;

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError<EnvironmentErrorCode> };

type OptionalGroup = "ai" | "smtp" | "cloudS3" | "google";

const AI_VARIABLES = [
  "AI_BASE_URL",
  "AI_API_KEY",
  "AI_MODEL",
  "AI_TIMEOUT",
  "AI_MAX_RETRIES",
  "AI_FEATURE_JSON_SCHEMA",
  "AI_FEATURE_TOOL_CALLING",
] as const;

const SMTP_VARIABLES = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USERNAME",
  "SMTP_PASSWORD",
  "SMTP_FROM_ADDRESS",
  "SMTP_USE_SSL",
] as const;

const CLOUD_S3_VARIABLES = [
  "CLOUD_S3_ENDPOINT",
  "CLOUD_S3_REGION",
  "CLOUD_S3_BUCKET",
  "CLOUD_S3_ACCESS_KEY_ID",
  "CLOUD_S3_SECRET_ACCESS_KEY",
] as const;

const GOOGLE_VARIABLES = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] as const;

const NORMALIZED_FIELD_VARIABLES: Record<string, string> = {
  internalActorSecret: "INTERNAL_ACTOR_SECRET",
  databaseUrl: "DATABASE_URL",
  redisUrl: "REDIS_URL",
  betterAuthSecret: "BETTER_AUTH_SECRET",
  betterAuthUrl: "BETTER_AUTH_URL",
  privateApiUrl: "PRIVATE_API_URL",
  "google.clientId": "GOOGLE_CLIENT_ID",
  "google.clientSecret": "GOOGLE_CLIENT_SECRET",
  "ai.baseUrl": "AI_BASE_URL",
  "ai.apiKey": "AI_API_KEY",
  "ai.model": "AI_MODEL",
  "ai.timeoutMs": "AI_TIMEOUT",
  "ai.maxRetries": "AI_MAX_RETRIES",
  "ai.featureJsonSchema": "AI_FEATURE_JSON_SCHEMA",
  "ai.featureToolCalling": "AI_FEATURE_TOOL_CALLING",
  "smtp.host": "SMTP_HOST",
  "smtp.port": "SMTP_PORT",
  "smtp.username": "SMTP_USERNAME",
  "smtp.password": "SMTP_PASSWORD",
  "smtp.fromAddress": "SMTP_FROM_ADDRESS",
  "smtp.tlsRequired": "SMTP_USE_SSL",
  "cloudS3.endpoint": "CLOUD_S3_ENDPOINT",
  "cloudS3.region": "CLOUD_S3_REGION",
  "cloudS3.bucket": "CLOUD_S3_BUCKET",
  "cloudS3.accessKeyId": "CLOUD_S3_ACCESS_KEY_ID",
  "cloudS3.secretAccessKey": "CLOUD_S3_SECRET_ACCESS_KEY",
  "sepay.environment": "SEPAY_ENV",
  "sepay.merchantId": "SEPAY_MERCHANT_ID",
  "sepay.secretKey": "SEPAY_SECRET_KEY",
};

function missingRequired(variable: string): ParseResult<never> {
  return {
    ok: false,
    error: {
      code: "MISSING_REQUIRED_ENV",
      messageKey: "environment.missingRequired",
      retryable: false,
      field: variable,
      details: { variable },
    },
  };
}

function invalidEnvironment(variable: string): ParseResult<never> {
  return {
    ok: false,
    error: {
      code: "INVALID_ENV",
      messageKey: "environment.invalid",
      retryable: false,
      field: variable,
      details: { variable },
    },
  };
}

function partialOptionalGroup(
  group: OptionalGroup,
  variable: string,
): ParseResult<never> {
  return {
    ok: false,
    error: {
      code: "PARTIAL_OPTIONAL_GROUP",
      messageKey: "environment.partialOptionalGroup",
      retryable: false,
      field: variable,
      details: { variable, group },
    },
  };
}

function invalidFromSchema(
  error: { issues: ReadonlyArray<{ path: PropertyKey[] }> },
  fallback: string,
  groupPrefix?: OptionalGroup,
): ParseResult<never> {
  const localPath = error.issues[0]?.path.join(".") ?? "";
  const normalizedPath =
    groupPrefix === undefined || localPath === ""
      ? localPath
      : `${groupPrefix}.${localPath}`;

  return invalidEnvironment(
    NORMALIZED_FIELD_VARIABLES[normalizedPath] ?? fallback,
  );
}

function optionalGroupState(
  source: NodeJS.ProcessEnv,
  variables: readonly string[],
): { state: "disabled" } | { state: "partial"; missing: string } | { state: "complete" } {
  const hasSuppliedValue = variables.some(
    (variable) => source[variable] !== undefined,
  );
  if (!hasSuppliedValue) {
    return { state: "disabled" };
  }

  const missing = variables.find(
    (variable) => source[variable] === undefined,
  );
  return missing === undefined
    ? { state: "complete" }
    : { state: "partial", missing };
}

function decimalInteger(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function booleanValue(value: string | undefined): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

function loadAi(source: NodeJS.ProcessEnv): ParseResult<AiEnvironment> {
  const state = optionalGroupState(source, AI_VARIABLES);
  if (state.state === "disabled") {
    return { ok: true, value: { enabled: false } };
  }
  if (state.state === "partial") {
    return partialOptionalGroup("ai", state.missing);
  }

  const parsed = AiEnvironmentSchema.safeParse({
    enabled: true,
    baseUrl: source.AI_BASE_URL,
    apiKey: source.AI_API_KEY,
    model: source.AI_MODEL,
    timeoutMs: decimalInteger(source.AI_TIMEOUT),
    maxRetries: decimalInteger(source.AI_MAX_RETRIES),
    featureJsonSchema: booleanValue(source.AI_FEATURE_JSON_SCHEMA),
    featureToolCalling: booleanValue(source.AI_FEATURE_TOOL_CALLING),
  });
  return parsed.success
    ? { ok: true, value: parsed.data }
    : invalidFromSchema(parsed.error, "AI_BASE_URL", "ai");
}

function loadSmtp(source: NodeJS.ProcessEnv): ParseResult<SmtpEnvironment> {
  const state = optionalGroupState(source, SMTP_VARIABLES);
  if (state.state === "disabled") {
    return { ok: true, value: { enabled: false } };
  }
  if (state.state === "partial") {
    return partialOptionalGroup("smtp", state.missing);
  }

  const parsed = SmtpEnvironmentSchema.safeParse({
    enabled: true,
    host: source.SMTP_HOST,
    port: decimalInteger(source.SMTP_PORT),
    username: source.SMTP_USERNAME,
    password: source.SMTP_PASSWORD,
    fromAddress: source.SMTP_FROM_ADDRESS,
    tlsRequired: source.SMTP_USE_SSL === "1",
  });
  return parsed.success
    ? { ok: true, value: parsed.data }
    : invalidFromSchema(parsed.error, "SMTP_HOST", "smtp");
}

function loadCloudS3(
  source: NodeJS.ProcessEnv,
): ParseResult<CloudS3Environment> {
  const state = optionalGroupState(source, CLOUD_S3_VARIABLES);
  if (state.state === "disabled") {
    return { ok: true, value: { enabled: false } };
  }
  if (state.state === "partial") {
    return partialOptionalGroup("cloudS3", state.missing);
  }

  const parsed = CloudS3EnvironmentSchema.safeParse({
    enabled: true,
    endpoint: source.CLOUD_S3_ENDPOINT,
    region: source.CLOUD_S3_REGION,
    bucket: source.CLOUD_S3_BUCKET,
    accessKeyId: source.CLOUD_S3_ACCESS_KEY_ID,
    secretAccessKey: source.CLOUD_S3_SECRET_ACCESS_KEY,
  });
  return parsed.success
    ? { ok: true, value: parsed.data }
    : invalidFromSchema(parsed.error, "CLOUD_S3_ENDPOINT", "cloudS3");
}

function loadSePay(source: NodeJS.ProcessEnv): ParseResult<SePayEnvironment> {
  for (const variable of ["SEPAY_ENV", "SEPAY_MERCHANT_ID", "SEPAY_SECRET_KEY"]) {
    if (source[variable] === undefined) return missingRequired(variable);
  }
  const parsed = SePayEnvironmentSchema.safeParse({
    environment: source.SEPAY_ENV,
    merchantId: source.SEPAY_MERCHANT_ID,
    secretKey: source.SEPAY_SECRET_KEY,
  });
  return parsed.success
    ? { ok: true, value: parsed.data }
    : invalidFromSchema(parsed.error, "SEPAY_ENV", "sepay" as OptionalGroup);
}

export function loadEnvironment(
  source: NodeJS.ProcessEnv,
): EnvironmentLoadResult {
  const nodeEnv = source.NODE_ENV ?? "development";
  const parsedNodeEnv = NodeEnvironmentSchema.safeParse(nodeEnv);
  if (!parsedNodeEnv.success) {
    return invalidEnvironment("NODE_ENV");
  }

  if (nodeEnv === "production") {
    for (const variable of [
      "INTERNAL_ACTOR_SECRET",
      "DATABASE_URL",
      "REDIS_URL",
    ]) {
      if (source[variable] === undefined) {
        return missingRequired(variable);
      }
    }
  }

  const ai = loadAi(source);
  if (!ai.ok) {
    return ai;
  }
  const smtp = loadSmtp(source);
  if (!smtp.ok) {
    return smtp;
  }
  const cloudS3 = loadCloudS3(source);
  if (!cloudS3.ok) {
    return cloudS3;
  }
  const sepay = loadSePay(source);
  if (!sepay.ok) return sepay;

  const googleState = optionalGroupState(source, GOOGLE_VARIABLES);
  if (googleState.state === "partial") {
    return partialOptionalGroup("google", googleState.missing);
  }

  const normalized: AppEnvironment = {
    nodeEnv: parsedNodeEnv.data as NodeEnvironment,
    ai: ai.value,
    smtp: smtp.value,
    cloudS3: cloudS3.value,
    sepay: sepay.value,
  };
  if (source.INTERNAL_ACTOR_SECRET !== undefined) {
    normalized.internalActorSecret = source.INTERNAL_ACTOR_SECRET;
  }
  if (source.DATABASE_URL !== undefined) {
    normalized.databaseUrl = source.DATABASE_URL;
  }
  if (source.REDIS_URL !== undefined) {
    normalized.redisUrl = source.REDIS_URL;
  }
  if (source.BETTER_AUTH_SECRET !== undefined) {
    normalized.betterAuthSecret = source.BETTER_AUTH_SECRET;
  }
  if (source.BETTER_AUTH_URL !== undefined) {
    normalized.betterAuthUrl = source.BETTER_AUTH_URL;
  }
  if (source.PRIVATE_API_URL !== undefined) {
    normalized.privateApiUrl = source.PRIVATE_API_URL;
  }
  if (googleState.state === "complete") {
    normalized.google = {
      clientId: source.GOOGLE_CLIENT_ID as string,
      clientSecret: source.GOOGLE_CLIENT_SECRET as string,
    };
  }

  const parsedEnvironment = AppEnvironmentSchema.safeParse(normalized);
  return parsedEnvironment.success
    ? { ok: true, value: parsedEnvironment.data }
    : invalidFromSchema(parsedEnvironment.error, "NODE_ENV");
}
