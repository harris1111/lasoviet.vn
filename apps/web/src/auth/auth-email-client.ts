import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { SignJWT } from "jose";

import { loadEnvironment } from "@lasoviet/config/load-environment";
import {
  AUTH_EMAIL_BODY_BINDING_PREFIX,
  AUTH_EMAIL_SERVICE_AUDIENCE,
  AUTH_EMAIL_SERVICE_COMMAND,
  AUTH_EMAIL_SERVICE_ISSUER,
  AUTH_EMAIL_SERVICE_SUBJECT,
  AuthEmailRequestSchema,
  canonicalizeAuthEmailRequest,
  type AuthEmailKind,
  type AuthEmailRequest,
} from "@lasoviet/contracts";

import { requireSentAuthEmailDelivery } from "./auth-email-delivery-outcome";

function environment() {
  const result = loadEnvironment(process.env);
  if (!result.ok) {
    throw new Error("AUTH_EMAIL_CONFIG_INVALID");
  }
  const {
    internalActorSecret,
    privateApiUrl,
    ...configuration
  } = result.value;
  if (
    internalActorSecret === undefined ||
    privateApiUrl === undefined
  ) {
    throw new Error("AUTH_EMAIL_CONFIG_INVALID");
  }
  return { ...configuration, internalActorSecret, privateApiUrl };
}

function localeFromRequest(request: Request | undefined): "vi" | "en" {
  return request?.headers.get("accept-language")?.toLowerCase().startsWith("en")
    ? "en"
    : "vi";
}

function idempotencyKey(
  kind: AuthEmailKind,
  token: string,
  secret: string,
): string {
  const digest = createHmac("sha256", secret).update(token).digest("hex");
  return `auth-email:${kind}:${digest}`;
}

function binding(request: AuthEmailRequest, secret: string): string {
  return createHmac("sha256", secret)
    .update(AUTH_EMAIL_BODY_BINDING_PREFIX)
    .update(canonicalizeAuthEmailRequest(request))
    .digest("hex");
}

export async function sendAuthEmail(
  kind: AuthEmailKind,
  recipient: string,
  actionUrl: string,
  token: string,
  request?: Request,
): Promise<void> {
  const config = environment();
  const requestBody = AuthEmailRequestSchema.parse({
    version: 1,
    kind,
    idempotencyKey: idempotencyKey(
      kind,
      token,
      config.internalActorSecret,
    ),
    recipient,
    locale: localeFromRequest(request),
    actionUrl,
    requestId: request?.headers.get("x-request-id") ?? randomUUID(),
  });
  const secret = new TextEncoder().encode(config.internalActorSecret);
  const serviceToken = await new SignJWT({
    command: AUTH_EMAIL_SERVICE_COMMAND,
    requestId: requestBody.requestId,
    bodyBinding: binding(requestBody, config.internalActorSecret),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(AUTH_EMAIL_SERVICE_ISSUER)
    .setAudience(AUTH_EMAIL_SERVICE_AUDIENCE)
    .setSubject(AUTH_EMAIL_SERVICE_SUBJECT)
    .setJti(requestBody.idempotencyKey)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);

  const response = await fetch(
    `${config.privateApiUrl}/internal/auth-email/send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${serviceToken}`,
        "content-type": "application/json",
        "x-request-id": requestBody.requestId,
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error("AUTH_EMAIL_DELIVERY_FAILED");
  }
  requireSentAuthEmailDelivery(await response.json());
}
