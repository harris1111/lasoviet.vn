import "server-only";

import { createHmac } from "node:crypto";
import { SignJWT } from "jose";

import {
  ANALYTICS_BODY_BINDING_PREFIX,
  ANALYTICS_SERVICE_AUDIENCE,
  ANALYTICS_SERVICE_COMMAND,
  ANALYTICS_SERVICE_ISSUER,
  ANALYTICS_SERVICE_SUBJECT,
  canonicalizeAnalyticsIngestRequest,
  type PrivateAnalyticsIngestRequestV1,
} from "@lasoviet/contracts";

export function computeAnalyticsBodyBinding(
  request: PrivateAnalyticsIngestRequestV1,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(ANALYTICS_BODY_BINDING_PREFIX)
    .update(canonicalizeAnalyticsIngestRequest(request))
    .digest("hex");
}

export async function createAnalyticsServiceToken(
  request: PrivateAnalyticsIngestRequestV1,
  secret: string,
): Promise<string> {
  const rawSecret = new TextEncoder().encode(secret);
  const bodyBinding = computeAnalyticsBodyBinding(request, secret);

  return new SignJWT({
    command: ANALYTICS_SERVICE_COMMAND,
    requestId: request.requestId,
    bodyBinding,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ANALYTICS_SERVICE_ISSUER)
    .setAudience(ANALYTICS_SERVICE_AUDIENCE)
    .setSubject(ANALYTICS_SERVICE_SUBJECT)
    .setJti(request.idempotencyKey)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(rawSecret);
}
