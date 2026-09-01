import { z } from "zod";

export type NodeEnvironment = "development" | "test" | "production";

export type AiEnvironment =
  | { enabled: false }
  | {
      enabled: true;
      baseUrl: string;
      apiKey: string;
      model: string;
      timeoutMs: number;
      maxRetries: number;
      featureJsonSchema: boolean;
      featureToolCalling: boolean;
    };

export type SmtpEnvironment =
  | { enabled: false }
  | {
      enabled: true;
      host: string;
      port: number;
      username: string;
      password: string;
      fromDomain: string;
      fromAddress: string;
    };

export type CloudS3Environment =
  | { enabled: false }
  | {
      enabled: true;
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    };

export type AppEnvironment = {
  nodeEnv: NodeEnvironment;
  internalActorSecret?: string;
  databaseUrl?: string;
  redisUrl?: string;
  ai: AiEnvironment;
  smtp: SmtpEnvironment;
  cloudS3: CloudS3Environment;
};

const trimmedNonEmpty = z.string().trim().min(1);
const absoluteUrl = z.string().trim().pipe(z.url());
const emailAddress = z.string().trim().pipe(z.email());

export const NodeEnvironmentSchema: z.ZodType<NodeEnvironment> = z.enum([
  "development",
  "test",
  "production",
]);

const disabledAi = z.object({ enabled: z.literal(false) }).strict();
const enabledAi = z
  .object({
    enabled: z.literal(true),
    baseUrl: absoluteUrl,
    apiKey: trimmedNonEmpty,
    model: trimmedNonEmpty,
    timeoutMs: z.number().int().positive(),
    maxRetries: z.number().int().nonnegative(),
    featureJsonSchema: z.boolean(),
    featureToolCalling: z.boolean(),
  })
  .strict();

export const AiEnvironmentSchema: z.ZodType<AiEnvironment> =
  z.discriminatedUnion("enabled", [disabledAi, enabledAi]);

const disabledSmtp = z.object({ enabled: z.literal(false) }).strict();
const enabledSmtp = z
  .object({
    enabled: z.literal(true),
    host: trimmedNonEmpty,
    port: z.number().int().min(1).max(65535),
    username: trimmedNonEmpty,
    password: trimmedNonEmpty,
    fromDomain: trimmedNonEmpty,
    fromAddress: emailAddress,
  })
  .strict();

export const SmtpEnvironmentSchema: z.ZodType<SmtpEnvironment> =
  z.discriminatedUnion("enabled", [disabledSmtp, enabledSmtp]);

const disabledCloudS3 = z.object({ enabled: z.literal(false) }).strict();
const enabledCloudS3 = z
  .object({
    enabled: z.literal(true),
    endpoint: absoluteUrl,
    region: trimmedNonEmpty,
    bucket: trimmedNonEmpty,
    accessKeyId: trimmedNonEmpty,
    secretAccessKey: trimmedNonEmpty,
  })
  .strict();

export const CloudS3EnvironmentSchema: z.ZodType<CloudS3Environment> =
  z.discriminatedUnion("enabled", [disabledCloudS3, enabledCloudS3]);

export const AppEnvironmentSchema: z.ZodType<AppEnvironment> = z
  .object({
    nodeEnv: NodeEnvironmentSchema,
    internalActorSecret: trimmedNonEmpty.optional(),
    databaseUrl: absoluteUrl.optional(),
    redisUrl: absoluteUrl.optional(),
    ai: AiEnvironmentSchema,
    smtp: SmtpEnvironmentSchema,
    cloudS3: CloudS3EnvironmentSchema,
  })
  .strict()
  .superRefine((environment, context) => {
    if (environment.nodeEnv !== "production") {
      return;
    }

    for (const [field, variable] of [
      ["internalActorSecret", "INTERNAL_ACTOR_SECRET"],
      ["databaseUrl", "DATABASE_URL"],
      ["redisUrl", "REDIS_URL"],
    ] as const) {
      if (environment[field] === undefined) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${variable} is required in production`,
        });
      }
    }
  });
