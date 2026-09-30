import { z } from "zod";

export const AUTH_EMAIL_SERVICE_ISSUER = "lasoviet-web" as const;
export const AUTH_EMAIL_SERVICE_AUDIENCE = "lasoviet-api:auth-email" as const;
export const AUTH_EMAIL_SERVICE_SUBJECT = "service:web-auth" as const;
export const AUTH_EMAIL_SERVICE_COMMAND = "auth-email.send.v1" as const;
export const AUTH_EMAIL_BODY_BINDING_PREFIX =
  "lasoviet:auth-email:body:v1\0" as const;

const nonEmpty = z.string().trim().min(1);

export const AuthEmailKindSchema = z.enum([
  "email_verification",
  "password_reset",
]);
export type AuthEmailKind = z.infer<typeof AuthEmailKindSchema>;

export const AuthEmailRequestSchema = z
  .object({
    version: z.literal(1),
    kind: AuthEmailKindSchema,
    idempotencyKey: nonEmpty,
    recipient: z.email().transform((value) => value.trim().toLowerCase()),
    locale: z.enum(["vi", "en"]),
    actionUrl: z.url(),
    requestId: nonEmpty,
  })
  .strict();
export type AuthEmailRequest = z.infer<typeof AuthEmailRequestSchema>;

export const ReportReadyEmailRequestSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("report_ready"),
    idempotencyKey: nonEmpty,
    recipient: z.email().transform((value) => value.trim().toLowerCase()),
    locale: z.enum(["vi", "en"]),
    actionUrl: z.url(),
    requestId: nonEmpty,
  })
  .strict();
export type ReportReadyEmailRequest = z.infer<typeof ReportReadyEmailRequestSchema>;

export const ReportFailedEmailRequestV1Schema = z
  .object({
    version: z.literal(1),
    kind: z.literal("report_failed"),
    idempotencyKey: nonEmpty,
    recipient: z.email().transform((value) => value.trim().toLowerCase()),
    locale: z.enum(["vi", "en"]),
    actionUrl: z.url(),
    requestId: nonEmpty,
    reportId: nonEmpty,
    reportVersionId: nonEmpty,
    failureStage: z.enum(["pdf", "garage"]),
    supportCaseId: nonEmpty,
  })
  .strict();
export type ReportFailedEmailRequestV1 = z.infer<typeof ReportFailedEmailRequestV1Schema>;


export const NurtureVerifiedSignInEmailRequestSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("nurture_verified_signin"),
    idempotencyKey: nonEmpty,
    recipient: z.email().transform((value) => value.trim().toLowerCase()),
    locale: z.enum(["vi", "en"]),
    actionUrl: z.url(),
    unsubscribeUrl: z.url(),
    requestId: nonEmpty,
    userId: nonEmpty,
    chartId: nonEmpty,
    palaceId: nonEmpty,
    palaceTitle: nonEmpty,
  })
  .strict();
export type NurtureVerifiedSignInEmailRequest = z.infer<
  typeof NurtureVerifiedSignInEmailRequestSchema
>;

export const HanMonthReminderEmailRequestSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("han_month_reminder"),
    idempotencyKey: nonEmpty,
    recipient: z.email().transform((value) => value.trim().toLowerCase()),
    locale: z.enum(["vi", "en"]),
    actionUrl: z.url(),
    unsubscribeUrl: z.url(),
    requestId: nonEmpty,
    userId: nonEmpty,
    chartId: nonEmpty,
    targetYear: z.number().int(),
    monthIndex: z.number().int().min(1).max(12),
    primaryFocus: nonEmpty,
    prepText: nonEmpty,
    marker: z.literal("warn"),
  })
  .strict();
export type HanMonthReminderEmailRequest = z.infer<
  typeof HanMonthReminderEmailRequestSchema
>;

export const DelayedUnlockCompletedEmailRequestSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("delayed_unlock_completed"),
    idempotencyKey: nonEmpty,
    recipient: z.email().transform((value) => value.trim().toLowerCase()),
    locale: z.enum(["vi", "en"]),
    actionUrl: z.url(),
    requestId: nonEmpty,
    userId: nonEmpty,
    orderId: nonEmpty,
    sku: nonEmpty,
    itemName: nonEmpty,
  })
  .strict();
export type DelayedUnlockCompletedEmailRequest = z.infer<
  typeof DelayedUnlockCompletedEmailRequestSchema
>;

export const NotificationPreferencesV1Schema = z
  .object({
    nurtureEmailsAllowed: z.boolean(),
    hanRemindersAllowed: z.boolean(),
    unsubscribedAll: z.boolean(),
  })
  .strict();
export type NotificationPreferencesV1 = z.infer<
  typeof NotificationPreferencesV1Schema
>;

export const UnsubscribeTokenClaimsSchema = z
  .object({
    userId: nonEmpty,
    email: z.email().transform((value) => value.trim().toLowerCase()),
    timestamp: z.number().int().positive(),
  })
  .strict();
export type UnsubscribeTokenClaims = z.infer<
  typeof UnsubscribeTokenClaimsSchema
>;

export const PersistedEmailDeliveryRequestSchema = z.discriminatedUnion("kind", [
  NurtureVerifiedSignInEmailRequestSchema,
  HanMonthReminderEmailRequestSchema,
  DelayedUnlockCompletedEmailRequestSchema,
  AuthEmailRequestSchema.extend({ kind: z.literal("email_verification") }),
  AuthEmailRequestSchema.extend({ kind: z.literal("password_reset") }),
  ReportReadyEmailRequestSchema,
  ReportFailedEmailRequestV1Schema,
]);
export type PersistedEmailDeliveryRequest = z.infer<
  typeof PersistedEmailDeliveryRequestSchema
>;

export function canonicalizeEmailDeliveryRequest(
  request: PersistedEmailDeliveryRequest,
): string {
  const base = {
    version: request.version,
    kind: request.kind,
    idempotencyKey: request.idempotencyKey.trim(),
    recipient: request.recipient.trim().toLowerCase(),
    locale: request.locale,
    actionUrl: request.actionUrl,
    requestId: request.requestId.trim(),
  };

  if (request.kind === "report_failed") {
    return JSON.stringify({
      ...base,
      reportId: request.reportId.trim(),
      reportVersionId: request.reportVersionId.trim(),
      failureStage: request.failureStage,
      supportCaseId: request.supportCaseId.trim(),
    });
  }

  if (request.kind === "nurture_verified_signin") {
    return JSON.stringify({
      ...base,
      unsubscribeUrl: request.unsubscribeUrl,
      userId: request.userId.trim(),
      chartId: request.chartId.trim(),
      palaceId: request.palaceId.trim(),
      palaceTitle: request.palaceTitle.trim(),
    });
  }

  if (request.kind === "han_month_reminder") {
    return JSON.stringify({
      ...base,
      unsubscribeUrl: request.unsubscribeUrl,
      userId: request.userId.trim(),
      chartId: request.chartId.trim(),
      targetYear: request.targetYear,
      monthIndex: request.monthIndex,
      primaryFocus: request.primaryFocus.trim(),
      prepText: request.prepText.trim(),
      marker: request.marker,
    });
  }

  if (request.kind === "delayed_unlock_completed") {
    return JSON.stringify({
      ...base,
      userId: request.userId.trim(),
      orderId: request.orderId.trim(),
      sku: request.sku.trim(),
      itemName: request.itemName.trim(),
    });
  }

  return JSON.stringify(base);
}

export const AuthEmailDeliveryOutcomeSchema = z
  .object({
    status: z.literal("sent"),
    attemptCount: z.number().int().positive(),
    providerMessageId: z.string().nullable(),
    errorCode: z.null(),
  })
  .strict();
export type AuthEmailDeliveryOutcome = z.infer<
  typeof AuthEmailDeliveryOutcomeSchema
>;

export const AuthEmailServiceClaimsSchema = z
  .object({
    iss: z.literal(AUTH_EMAIL_SERVICE_ISSUER),
    aud: z.literal(AUTH_EMAIL_SERVICE_AUDIENCE),
    sub: z.literal(AUTH_EMAIL_SERVICE_SUBJECT),
    command: z.literal(AUTH_EMAIL_SERVICE_COMMAND),
    exp: z.number().int().positive(),
    iat: z.number().int().positive(),
    jti: nonEmpty,
    requestId: nonEmpty,
    bodyBinding: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type AuthEmailServiceClaims = z.infer<
  typeof AuthEmailServiceClaimsSchema
>;

export function canonicalizeAuthEmailRequest(
  request: AuthEmailRequest,
): string {
  return JSON.stringify({
    version: request.version,
    kind: request.kind,
    idempotencyKey: request.idempotencyKey.trim(),
    recipient: request.recipient.trim().toLowerCase(),
    locale: request.locale,
    actionUrl: request.actionUrl,
    requestId: request.requestId.trim(),
  });
}
