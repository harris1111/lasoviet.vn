import { z } from "zod";

import {
  CanonicalAnalyticsEventNameSchema,
  AnalyticsPropertyValueSchema,
} from "./analytics-event-v1.js";

export const ANALYTICS_SERVICE_ISSUER = "lasoviet-web" as const;
export const ANALYTICS_SERVICE_AUDIENCE = "lasoviet-api:analytics" as const;
export const ANALYTICS_SERVICE_SUBJECT = "service:web-analytics" as const;
export const ANALYTICS_SERVICE_COMMAND = "analytics.ingest.v1" as const;
export const ANALYTICS_BODY_BINDING_PREFIX =
  "lasoviet:analytics:body:v1\0" as const;

export const DeviceClassSchema = z.enum([
  "mobile",
  "tablet",
  "desktop",
  "bot",
  "unknown",
]);
export type DeviceClass = z.infer<typeof DeviceClassSchema>;

export const BrowserAnalyticsEventRequestV1Schema = z
  .object({
    version: z.literal(1),
    idempotencyKey: z.string().trim().min(1).max(128),
    occurredAt: z.string().datetime(),
    event: z
      .object({
        name: CanonicalAnalyticsEventNameSchema,
        properties: z.record(z.string().max(64), AnalyticsPropertyValueSchema),
      })
      .strict(),
  })
  .strict();
export type BrowserAnalyticsEventRequestV1 = z.infer<
  typeof BrowserAnalyticsEventRequestV1Schema
>;

export const PrivateAnalyticsIngestRequestV1Schema = z
  .object({
    version: z.literal(1),
    idempotencyKey: z.string().trim().min(1).max(128),
    occurredAt: z.string().datetime(),
    event: z
      .object({
        name: CanonicalAnalyticsEventNameSchema,
        properties: z.record(z.string().max(64), AnalyticsPropertyValueSchema),
      })
      .strict(),
    visitorId: z.string().uuid(),
    userId: z.string().trim().min(1).max(128).nullable().optional(),
    requestId: z.string().trim().min(1).max(128),
    ip: z.string().max(64).nullable().optional(),
    userAgent: z.string().max(512).nullable().optional(),
    referrer: z.string().max(2048).nullable().optional(),
    utmSource: z.string().max(128).nullable().optional(),
    utmMedium: z.string().max(128).nullable().optional(),
    utmCampaign: z.string().max(128).nullable().optional(),
    utmContent: z.string().max(128).nullable().optional(),
    utmTerm: z.string().max(128).nullable().optional(),
    deviceClass: DeviceClassSchema.nullable().optional(),
    locale: z.enum(["vi", "en"]).nullable().optional(),
    pathname: z.string().max(512).nullable().optional(),
  })
  .strict();
export type PrivateAnalyticsIngestRequestV1 = z.infer<
  typeof PrivateAnalyticsIngestRequestV1Schema
>;

function sortObjectKeys(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

export function canonicalizeAnalyticsIngestRequest(
  request: PrivateAnalyticsIngestRequestV1,
): string {
  return JSON.stringify({
    version: request.version,
    idempotencyKey: request.idempotencyKey.trim(),
    occurredAt: request.occurredAt,
    event: {
      name: request.event.name,
      properties: sortObjectKeys(request.event.properties),
    },
    visitorId: request.visitorId.trim().toLowerCase(),
    userId: request.userId ? request.userId.trim() : null,
    requestId: request.requestId.trim(),
    ip: request.ip ?? null,
    userAgent: request.userAgent ?? null,
    referrer: request.referrer ?? null,
    utmSource: request.utmSource ?? null,
    utmMedium: request.utmMedium ?? null,
    utmCampaign: request.utmCampaign ?? null,
    utmContent: request.utmContent ?? null,
    utmTerm: request.utmTerm ?? null,
    deviceClass: request.deviceClass ?? null,
    locale: request.locale ?? null,
    pathname: request.pathname ?? null,
  });
}

export const AnalyticsServiceClaimsSchema = z
  .object({
    iss: z.literal(ANALYTICS_SERVICE_ISSUER),
    aud: z.literal(ANALYTICS_SERVICE_AUDIENCE),
    sub: z.literal(ANALYTICS_SERVICE_SUBJECT),
    command: z.literal(ANALYTICS_SERVICE_COMMAND),
    exp: z.number().int().positive(),
    iat: z.number().int().positive(),
    jti: z.string().trim().min(1),
    requestId: z.string().trim().min(1),
    bodyBinding: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type AnalyticsServiceClaims = z.infer<
  typeof AnalyticsServiceClaimsSchema
>;

export const AnalyticsIngestSuccessV1Schema = z
  .object({
    ok: z.literal(true),
    value: z
      .object({
        replayed: z.boolean(),
      })
      .strict(),
  })
  .strict();
export type AnalyticsIngestSuccessV1 = z.infer<
  typeof AnalyticsIngestSuccessV1Schema
>;

export const AnalyticsIngestErrorCodeSchema = z.enum([
  "ANALYTICS_REQUEST_INVALID",
  "ANALYTICS_TOKEN_INVALID",
  "ANALYTICS_TOKEN_EXPIRED",
  "ANALYTICS_TOKEN_AUDIENCE",
  "ANALYTICS_BODY_MISMATCH",
  "ANALYTICS_EVENT_INVALID",
  "IDEMPOTENCY_KEY_CONFLICT",
  "VISITOR_ACCOUNT_CONFLICT",
  "PROFILE_NOT_FOUND",
  "PROFILE_FORBIDDEN",
  "ANALYTICS_DELIVERY_FAILED",
]);
export type AnalyticsIngestErrorCode = z.infer<
  typeof AnalyticsIngestErrorCodeSchema
>;

export const AnalyticsIngestErrorV1Schema = z
  .object({
    ok: z.literal(false),
    error: z
      .object({
        code: AnalyticsIngestErrorCodeSchema,
        messageKey: z.string().optional(),
        retryable: z.boolean().optional(),
      })
      .strict(),
  })
  .strict();
export type AnalyticsIngestErrorV1 = z.infer<
  typeof AnalyticsIngestErrorV1Schema
>;

export const AnalyticsIngestResponseV1Schema = z.union([
  AnalyticsIngestSuccessV1Schema,
  AnalyticsIngestErrorV1Schema,
]);
export type AnalyticsIngestResponseV1 = z.infer<
  typeof AnalyticsIngestResponseV1Schema
>;
