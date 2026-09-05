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
